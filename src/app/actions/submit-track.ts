"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { trackSubmissionSchema, PLATFORMS } from "@/lib/validations";
import { z } from "zod";

import { headers } from "next/headers";
import { submissionLimiter } from "@/lib/rate-limit";
import { isSubscriber, isVip, isModerator } from "@/lib/twitch-api";
import { createServerAction } from "@/lib/safe-action";

export const submitTrack = createServerAction(
  trackSubmissionSchema.extend({
    isPriority: z.boolean().default(false),
  }),
  async (data, userId) => {
    // Rate Limiting
    const h = await headers();
    const ip = h.get("x-forwarded-for") || "unknown";
    
    const isAllowed = await submissionLimiter.check(ip, 5); // 5 tracks per min
    if (!isAllowed) {
      throw new Error("Rate limit exceeded. Please wait a minute before submitting again.");
    }

    const { title, url, filePath, trackType, description, lyrics, sessionId, bpm, key, isPriority } = data;

    // 2. Fetch the stream session with its specific limits
    const streamSession = await prisma.streamSession.findUnique({
      where: { id: sessionId as string },
      include: { _count: { select: { tracks: true } } }
    });

    if (!streamSession) throw new Error("Session not found");
    if (streamSession.status !== "ACTIVE") throw new Error("Session is not active");

    // 2.5 Sub-Only Check
    const broadcasterId = streamSession.streamerId;
    const isPriorityUser = await isVip(broadcasterId, userId) || await isModerator(broadcasterId, userId);
    const isSub = await isSubscriber(broadcasterId, userId);

    if (streamSession.subOnly && !isSub && !isPriorityUser) {
      throw new Error("This session is Subscriber-Only. Subscribe to this streamer to participate!");
    }

    // 2.7 Paid-Only Check
    if (streamSession.paidOnly && !isPriority) {
      throw new Error("This streamer only accepts songs for donations. Please use the 'Priority Bump' option.");
    }

    // 3. Enforce per-user track limit
    const userTrackCount = await prisma.track.count({
      where: {
        sessionId: sessionId as string,
        submitterId: userId
      }
    });

    if (userTrackCount >= streamSession.maxTracksPerUser) {
      throw new Error(`Limit reached: Maximum ${streamSession.maxTracksPerUser} tracks per user allowed for this session.`);
    }

    // 3.5 Check "Line in the sand" (Track Limit)
    const isBacklog = streamSession.trackLimit !== null && streamSession._count.tracks >= streamSession.trackLimit;

    // 4. Validation based on track type
    if (trackType === "LINK") {
      if (!url) throw new Error("Streaming link is required for link submission.");
      
      const isAllowed = streamSession.allowedPlatforms.some(platformId => {
        const platform = PLATFORMS.find(p => p.id === platformId);
        return platform ? platform.pattern.test(url) : false;
      });

      if (!isAllowed) {
        throw new Error("This streaming platform is not allowed by the streamer for this session.");
      }
    } else {
      if (!streamSession.allowDirectUploads) {
        throw new Error("Direct audio uploads are disabled for this session.");
      }
      if (!filePath) {
        throw new Error("Audio file path is missing.");
      }
    }

    // 5 & 6. Transactional creation to prevent race conditions on 'order'
    const track = await prisma.$transaction(async (tx) => {
      const lastTrack = await tx.track.aggregate({
        where: { sessionId: sessionId as string },
        _max: { order: true }
      });

      const nextOrder = (lastTrack._max.order || 0) + 1;

      return await tx.track.create({
        data: {
          title,
          url: trackType === "LINK" ? url : null,
          filePath: trackType === "FILE" ? filePath : null,
          trackType,
          sessionId: sessionId as string,
          submitterId: userId,
          description,
          lyrics,
          status: isPriority ? "PENDING" : "QUEUED",
          order: nextOrder,
          bpm: bpm || 0,
          key: key || "",
          isVip: isPriorityUser
        },
      });
    });

    if (isPriority) {
      const { createYookassaPayment } = await import("./payment-actions");
      const returnPath = `/stream/${streamSession.slug}`;
      const paymentAmount = streamSession.minDonation || 50;
      const payment = await createYookassaPayment(paymentAmount, track.id, streamSession.streamerId, returnPath);
      
      if (!payment.success) {
        throw new Error(payment.error || "Payment creation failed.");
      }
      
      return { track, paymentUrl: payment.url };
    }

    revalidatePath(`/stream/${streamSession.slug}`);
    return { track, isBacklog };
  }
);

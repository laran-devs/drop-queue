"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isValidIdentifier } from "@/lib/url-utils";
import { sessionConfigSchema } from "@/lib/validations";

export async function createSession(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const rawData = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    maxTracksPerUser: Number(formData.get("maxTracksPerUser")),
    maxAudioFileSize: Number(formData.get("maxAudioFileSize")),
    allowedPlatforms: JSON.parse(formData.get("allowedPlatforms") as string),
    allowDirectUploads: formData.get("allowDirectUploads") === "true",
    overlayTheme: formData.get("overlayTheme") as string,
    enableHighScoreSound: formData.get("enableHighScoreSound") === "true",
    criteria: JSON.parse(formData.get("criteria") as string || '["Оценка"]'),
  };

  const validated = sessionConfigSchema.parse(rawData);
  const slug = nanoid(6);

  console.log(`[SessionAction] Creating session with slug: ${slug}`);

  // END any existing active/paused sessions for this streamer to avoid conflicts
  await prisma.streamSession.updateMany({
    where: { 
      streamerId: session.user.id,
      status: { in: ["ACTIVE", "PAUSED"] }
    },
    data: { 
      status: "ENDED",
      endedAt: new Date()
    }
  });

  const { criteria: criteriaNames, ...sessionData } = validated;

  const newSession = await prisma.streamSession.create({
    data: {
      ...sessionData,
      slug,
      overlayToken: nanoid(12),
      streamerId: session.user.id,
      status: "ACTIVE",
      criteria: {
        create: criteriaNames.map(name => ({
          name,
          streamerId: session.user.id!
        }))
      }
    },
  });

  if (!isValidIdentifier(newSession.slug)) {
    console.error("[SessionAction] Critical Error: Session created but slug is invalid!", newSession);
    throw new Error("Failed to create session correctly.");
  }

  console.log(`[SessionAction] Redirecting to: /dashboard/${newSession.slug}`);
  revalidatePath("/");
  redirect(`/dashboard/${newSession.slug}`);
}

export async function getActiveSessions() {
  return await prisma.streamSession.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED"] } },
    include: {
      streamer: {
        select: {
          name: true,
          image: true,
          accentColor: true,
        }
      },
      _count: {
        select: { tracks: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getSessionBySlug(slug: string) {
  return await prisma.streamSession.findUnique({
    where: { slug },
    include: {
      streamer: true,
      tracks: {
        orderBy: { submittedAt: "asc" }
      },
      criteria: true,
    }
  });
}
export async function updateOverlaySettings(slug: string, settings: Record<string, boolean>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.streamSession.update({
    where: { slug, streamerId: session.user.id },
    data: { settings },
  });

  revalidatePath(`/overlay/${slug}`);
  return { success: true };
}
export async function updateSessionStatus(slug: string, status: "ACTIVE" | "PAUSED") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.streamSession.update({
    where: { slug, streamerId: session.user.id },
    data: { status },
  });

  revalidatePath("/");
  revalidatePath(`/dashboard/${slug}`);
  return { success: true };
}

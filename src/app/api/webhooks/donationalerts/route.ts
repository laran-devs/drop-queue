import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * DonationAlerts Webhook Handler
 * 
 * To test this:
 * curl -X POST http://localhost:3000/api/webhooks/donationalerts \
 *   -H "Content-Type: application/json" \
 *   -d '{"username": "test_user", "amount": 5.0, "message": "Bump my track!"}'
 */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing verification token" }, { status: 401 });
    }

    const body = await req.json();
    const { username, amount, message, currency } = body;

    console.log(`[DonationAlerts] Received donation: ${amount} from ${username}`);

    if (!username) {
      return NextResponse.json({ error: "No username provided" }, { status: 400 });
    }

    // 1. Find the streamer who owns this token
    const streamer = await prisma.user.findFirst({
      where: { daSecret: token }
    });

    if (!streamer) {
      return NextResponse.json({ error: "Invalid verification token" }, { status: 401 });
    }

    // 2. Find the SUBMITTER (the person who donated) by Twitch login
    const submitter = await prisma.user.findFirst({
      where: { 
        OR: [
          { twitchLogin: username.toLowerCase() },
          { name: username }
        ]
      }
    });

    if (!submitter) {
      console.warn(`[DonationAlerts] No such user found for donation from ${username}`);
      return NextResponse.json({ message: "Submitter not found in DropQueue" }, { status: 200 });
    }

    // 3. Find their most recent track in THIS streamer's active session
    const track = await prisma.track.findFirst({
      where: {
        submitterId: submitter.id,
        session: { streamerId: streamer.id, status: { in: ["ACTIVE", "PAUSED"] } },
        status: "QUEUED",
        isPaid: false
      },
      orderBy: { submittedAt: "desc" },
      include: { session: true }
    });

    if (!track) {
       console.warn(`[DonationAlerts] User ${username} has no queued tracks to bump.`);
       return NextResponse.json({ message: "No track to bump" }, { status: 200 });
    }

    // 3. Bump it!
    const targetCurrency = streamer.donationCurrency || "RUB";
    if (currency && currency !== targetCurrency) {
       console.log(`[DonationAlerts] Currency mismatch: received ${currency}, expected ${targetCurrency}. Skipping bump.`);
       return NextResponse.json({ message: `Currency mismatch: expected ${targetCurrency}` }, { status: 200 });
    }

    if (amount < (streamer.minDonationAmount || 0)) {
       console.log(`[DonationAlerts] Amount ${amount} is less than min ${streamer.minDonationAmount}. Skipping bump.`);
       return NextResponse.json({ message: `Amount ${amount} ${targetCurrency} is less than required ${streamer.minDonationAmount}` }, { status: 200 });
    }

    await prisma.$transaction([
      prisma.track.update({
        where: { id: track.id },
        data: { isPaid: true }
      }),
      prisma.donationLog.create({
        data: {
          amount: Number(amount),
          currency: currency || targetCurrency,
          username: username,
          message: message || "",
          trackTitle: track.title,
          streamerId: streamer.id
        }
      })
    ]);

    // Notify Dashboard via Socket.io
    const io = (global as any).io;
    if (io) {
      console.log(`[DonationAlerts] Emitting DONATION_BUMP to session ${track.session.slug}`);
      io.to(`${track.session.slug}:streamer`).emit("NOTIFICATION", {
         type: "DONATION_BUMP",
         username,
         amount,
         currency: currency || targetCurrency,
         trackTitle: track.title,
         message: `🔥 DONATION BUMP! ${username} sent ${amount} ${currency || targetCurrency} and bumped "${track.title}"!`
      });
    }

    revalidatePath(`/dashboard/${track.session.slug}`);

    return NextResponse.json({ 
      success: true, 
      trackTitle: track.title,
      user: username
    });

  } catch (error) {
    console.error("[DonationAlerts Webhook] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

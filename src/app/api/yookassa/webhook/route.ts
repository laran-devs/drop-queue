import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { pubClient } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.event === "payment.succeeded" && body.object.status === "succeeded") {
      const paymentId = body.object.id;
      const amount = parseFloat(body.object.amount.value);
      const streamerId = body.object.metadata?.streamerId;
      const trackId = body.object.metadata?.trackId;

      if (!streamerId) {
        return NextResponse.json({ error: "Missing streamerId" }, { status: 400 });
      }

      // 1. Record Transaction
      await prisma.platformTransaction.upsert({
        where: { paymentId },
        update: { status: "SUCCEEDED" },
        create: {
          paymentId,
          amount,
          streamerId,
          status: "SUCCEEDED",
          metadata: body.object.metadata
        }
      });

      // 2. Increment Wallet balance
      await prisma.wallet.upsert({
        where: { userId: streamerId },
        update: { balance: { increment: amount } },
        create: { userId: streamerId, balance: amount }
      });

      // 3. Process the action (Bump track)
      if (trackId && body.object.metadata?.action === "BUMP_TRACK") {
        const track = await prisma.track.update({
          where: { id: trackId },
          data: { isPaid: true } 
        });

        const session = await prisma.streamSession.findFirst({
          where: { id: track.sessionId }
        });

        if (session) {
          await pubClient.publish("socket:broadcast", JSON.stringify({
             room: session.slug,
             event: "NOTIFICATION",
             data: {
               type: "DONATION_BUMP",
               message: `🔥 💳 Track "${track.title}" was priority bumped for ${amount} RUB!`
             }
          }));

          // Notify overlay
          await pubClient.publish("socket:broadcast", JSON.stringify({
            room: session.slug,
            event: "queue_updated",
            data: { tracks: await prisma.track.findMany({ where: { sessionId: session.id }, select: { title: true, status: true, isPaid: true }, orderBy: { submittedAt: 'asc' }}) }
          }));
        }
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Yookassa Webhook Error:", err);
    return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
  }
}

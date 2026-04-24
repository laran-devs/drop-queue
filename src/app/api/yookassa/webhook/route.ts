import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { pubClient } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.event === "payment.succeeded" && body.object?.id) {
      const paymentId = body.object.id;

      // VERIFICATION: Check with YooKassa API to ensure this isn't a spoofed webhook
      const shopId = process.env.YOOKASSA_SHOP_ID;
      const secretKey = process.env.YOOKASSA_SECRET_KEY;
      
      if (!shopId || !secretKey) {
        console.error("YooKassa credentials not configured during webhook processing");
        return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
      }

      const token = Buffer.from(`${shopId}:${secretKey}`).toString("base64");
      const checkRes = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
        method: "GET",
        headers: { "Authorization": `Basic ${token}` }
      });

      if (!checkRes.ok) {
        console.error(`Failed to verify YooKassa payment ${paymentId}`);
        return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
      }

      const paymentData = await checkRes.json();
      if (paymentData.status !== "succeeded") {
        console.error(`YooKassa payment ${paymentId} is not actually succeeded. Satus: ${paymentData.status}`);
        return NextResponse.json({ error: "Payment not succeeded" }, { status: 400 });
      }

      const amount = parseFloat(paymentData.amount.value);
      const streamerId = paymentData.metadata?.streamerId;
      const trackId = paymentData.metadata?.trackId;

      if (!streamerId) {
        return NextResponse.json({ error: "Missing streamerId in metadata" }, { status: 400 });
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
          data: { 
            isPaid: true,
            status: "QUEUED" 
          } 
        });

        // Update transaction record with trackId
        await prisma.platformTransaction.update({
          where: { paymentId },
          data: { trackId }
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

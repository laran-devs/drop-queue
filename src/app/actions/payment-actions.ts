"use server";

import prisma from "@/lib/prisma";

export async function createYookassaPayment(amount: number, trackId: string, streamerId: string) {
  // Integration point for YooKassa API: `https://api.yookassa.ru/v3/payments`
  // We mock the successful return URL for demonstration purposes.
  const paymentId = `mock-${Date.now()}`;
  const mockPaymentUrl = `https://yoomoney.ru/checkout/payments/v2/contract?orderId=${paymentId}`;
  
  await prisma.platformTransaction.create({
    data: {
      streamerId,
      amount,
      paymentId,
      status: "PENDING",
      metadata: { trackId, action: "BUMP_TRACK", streamerId }
    }
  });

  return { success: true, url: mockPaymentUrl };
}

export async function simulateWebhook(paymentId: string) {
  // This simulates YooKassa sending a webhook when payment completes
  const tx = await prisma.platformTransaction.findUnique({ where: { paymentId } });
  if (!tx) return { success: false };

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  await fetch(`${baseUrl}/api/yookassa/webhook`, {
    method: "POST",
    body: JSON.stringify({
      type: "notification",
      event: "payment.succeeded",
      object: {
        id: paymentId,
        status: "succeeded",
        amount: { value: tx.amount.toString(), currency: "RUB" },
        metadata: tx.metadata
      }
    }),
    headers: { "Content-Type": "application/json" }
  });

  return { success: true };
}

export async function getWalletBalance(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  return wallet?.balance || 0;
}

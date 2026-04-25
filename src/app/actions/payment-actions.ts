"use server";

import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function createYookassaPayment(amount: number, trackId: string, streamerId: string, returnPath: string = "/dashboard") {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (!shopId || !secretKey) {
    throw new Error("YooKassa credentials are not configured");
  }

  const idempotenceKey = crypto.randomUUID();
  const token = Buffer.from(`${shopId}:${secretKey}`).toString("base64");

  const response = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotence-Key": idempotenceKey,
      "Authorization": `Basic ${token}`
    },
    body: JSON.stringify({
      amount: {
        value: amount.toString(),
        currency: "RUB"
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: `${baseUrl}${returnPath}`
      },
      description: `Priority track bump`,
      metadata: { trackId, action: "BUMP_TRACK", streamerId }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("YooKassa Error:", data);
    return { success: false, error: data.description || "Failed to create payment" };
  }

  const paymentId = data.id;
  const paymentUrl = data.confirmation?.confirmation_url;

  if (!paymentId || !paymentUrl) {
    return { success: false, error: "Invalid response from YooKassa" };
  }
  
  await prisma.platformTransaction.create({
    data: {
      streamerId,
      amount,
      paymentId,
      status: "PENDING",
      metadata: { trackId, action: "BUMP_TRACK", streamerId }
    }
  });

  return { success: true, url: paymentUrl };
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

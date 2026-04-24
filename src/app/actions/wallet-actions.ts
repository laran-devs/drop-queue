"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getWalletData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const wallet = await prisma.wallet.findUnique({
    where: { userId: session.user.id }
  });

  const transactions = await prisma.platformTransaction.findMany({
    where: { streamerId: session.user.id, status: "SUCCEEDED" },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  const withdrawalRequests = await prisma.withdrawalRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" }
  });

  return {
    balance: wallet?.balance || 0,
    currency: wallet?.currency || "RUB",
    transactions,
    withdrawalRequests
  };
}

export async function requestWithdrawal(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const amount = parseFloat(formData.get("amount") as string);
  const payoutMethod = formData.get("payoutMethod") as string;
  const payoutDetails = formData.get("payoutDetails") as string;

  if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");

  const wallet = await prisma.wallet.findUnique({
    where: { userId: session.user.id }
  });

  if (!wallet || wallet.balance < amount) {
    throw new Error("Insufficient funds");
  }

  // Transaction: decrease balance and create request
  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { userId: session.user.id },
      data: { balance: { decrement: amount } }
    });

    await tx.withdrawalRequest.create({
      data: {
        userId: session.user.id,
        amount,
        payoutMethod,
        payoutDetails,
        status: "PENDING"
      }
    });
  });

  revalidatePath("/dashboard/wallet");
  return { success: true };
}

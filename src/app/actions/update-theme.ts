"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateAccentColor(color: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { accentColor: color },
  });

  revalidatePath("/dashboard");
  revalidatePath("/overlay/[streamerId]"); // Note: revalidatePath might not work perfectly with [dynamic] but it's a good practice
  
  return { success: true };
}

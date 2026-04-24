"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function updateSessionSettings(
  sessionId: string, 
  data: { 
    showBpmOnOverlay?: boolean; 
    showKeyOnOverlay?: boolean;
    allowedPlatforms?: string[];
    enableNormalization?: boolean;
    autoAdvance?: boolean;
    trackLimit?: number | null;
    subOnly?: boolean;
  }
) {
  try {
    const updated = await prisma.streamSession.update({
      where: { id: sessionId },
      data
    });
    return { success: true, session: updated };
  } catch (error) {
    console.error("Failed to update session settings:", error);
    return { success: false, error: "Failed to update settings" };
  }
}

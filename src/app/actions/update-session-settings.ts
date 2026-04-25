"use server";

import prisma from "@/lib/prisma";
import { createServerAction } from "@/lib/safe-action";
import { z } from "zod";

const updateSettingsSchema = z.object({
  sessionId: z.string(),
  data: z.object({
    showBpmOnOverlay: z.boolean().optional(),
    showKeyOnOverlay: z.boolean().optional(),
    allowedPlatforms: z.array(z.string()).optional(),
    enableNormalization: z.boolean().optional(),
    autoAdvance: z.boolean().optional(),
    trackLimit: z.number().nullable().optional(),
    subOnly: z.boolean().optional(),
    paidOnly: z.boolean().optional(),
    minDonation: z.number().optional(),
    overlayTheme: z.string().optional(),
  }),
});

export const updateSessionSettings = createServerAction(
  updateSettingsSchema,
  async ({ sessionId, data }, userId) => {
    // 1. Verify Ownership (IDOR Protection)
    const session = await prisma.streamSession.findFirst({
      where: { 
        id: sessionId,
        streamerId: userId // Ensure the requester is the owner
      }
    });

    if (!session) {
      throw new Error("Session not found or you don't have permission to modify it.");
    }

    // 2. Perform Update
    const updated = await prisma.streamSession.update({
      where: { id: sessionId },
      data
    });

    return updated;
  }
);

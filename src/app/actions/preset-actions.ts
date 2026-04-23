"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Saves current session criteria as a reusable template.
 */
export async function saveCriteriaPreset(name: string, sessionId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const streamSession = await prisma.streamSession.findUnique({
    where: { id: sessionId },
    include: { criteria: true }
  });

  if (!streamSession || streamSession.streamerId !== session.user.id) {
    throw new Error("Session not found or access denied");
  }

  const preset = await prisma.criteriaTemplate.create({
    data: {
      name,
      userId: session.user.id,
      config: streamSession.criteria.map(c => ({ name: c.name })),
    },
  });

  revalidatePath("/dashboard");
  return { success: true, preset };
}

/**
 * Loads a criteria template into a session.
 */
export async function loadCriteriaPreset(templateId: string, sessionId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const template = await prisma.criteriaTemplate.findUnique({
    where: { id: templateId }
  });

  if (!template || template.userId !== session.user.id) {
    throw new Error("Template not found or access denied");
  }

  const streamSession = await prisma.streamSession.findUnique({
    where: { id: sessionId }
  });

  if (!streamSession || streamSession.streamerId !== session.user.id) {
    throw new Error("Session not found or access denied");
  }

  const criteriaConfig = template.config as { name: string }[];

  // Delete existing criteria and create new ones from template
  await prisma.$transaction([
    prisma.criteria.deleteMany({ where: { sessionId } }),
    prisma.criteria.createMany({
      data: criteriaConfig.map(c => ({
        name: c.name,
        streamerId: session.user.id,
        sessionId,
      })),
    }),
  ]);

  revalidatePath(`/dashboard/${streamSession.slug}`);
  return { success: true };
}

/**
 * Gets all presets for the current user.
 */
export async function getUserPresets() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  return await prisma.criteriaTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" }
  });
}

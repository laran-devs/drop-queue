"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { deleteUploadedFile } from "@/lib/storage";


/**
 * Adds a new rating criterion for a specific session.
 */
export async function addCriterion(name: string, sessionId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    console.log(`[EvaluationActions] Adding criterion "${name}" to session ${sessionId} for user ${session.user.id}`);

    // Verify that the session exists and belongs to the user
    const targetSession = await prisma.streamSession.findUnique({
      where: { id: sessionId },
      select: { streamerId: true, slug: true }
    });

    if (!targetSession || targetSession.streamerId !== session.user.id) {
      console.warn(`[EvaluationActions] Access denied for user ${session.user.id} on session ${sessionId}`);
      throw new Error("Access denied: You do not own this session.");
    }

    const criterion = await prisma.criteria.create({
      data: {
        name,
        streamerId: session.user.id,
        sessionId,
      },
    });

    console.log(`[EvaluationActions] Criterion created with ID: ${criterion.id}`);

    revalidatePath(`/dashboard/${targetSession.slug}`);
    revalidatePath("/dashboard");
    return { success: true, criterion };
  } catch (error: any) {
    console.error("[EvaluationActions] Error adding criterion:", error);
    return { success: false, error: error.message || "Failed to add criterion" };
  }
}


/**
 * Removes a rating criterion.
 */
export async function removeCriterion(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    console.log(`[EvaluationActions] Removing criterion ${id} for user ${session.user.id}`);

    const criterion = await prisma.criteria.findUnique({
      where: { id },
      include: { session: { select: { slug: true } } }
    });

    if (!criterion || criterion.streamerId !== session.user.id) {
      throw new Error("Access denied or criterion not found.");
    }

    await prisma.criteria.delete({ where: { id } });

    console.log(`[EvaluationActions] Criterion ${id} deleted successfully.`);

    if (criterion.session) {
      revalidatePath(`/dashboard/${criterion.session.slug}`);
    }
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("[EvaluationActions] Error removing criterion:", error);
    return { success: false, error: error.message || "Failed to remove criterion" };
  }
}

/**
 * Submits evaluations for a track.
 */
export async function submitEvaluation(trackId: string, scores: Record<string, number>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: { session: true }
  });

  if (!track || track.session.streamerId !== session.user.id) {
    throw new Error("Track not found or access denied");
  }

  // Idempotency: Don't evaluate already evaluated tracks
  if (track.status === "EVALUATED") {
    throw new Error("This track has already been evaluated.");
  }

  // Verify that all criteria IDs belong to this session
  const validCriteriaIds = track.session.id ? await prisma.criteria.findMany({
    where: { sessionId: track.session.id },
    select: { id: true }
  }) : [];

  const validIds = new Set(validCriteriaIds.map(c => c.id));

  const evaluations = Object.entries(scores).map(([criteriaId, score]) => {
    // 1. Check if criteria is valid for this session
    if (!validIds.has(criteriaId)) {
      throw new Error(`Invalid criteria ID: ${criteriaId}`);
    }
    // 2. Validate score range
    if (typeof score !== 'number' || score < 1 || score > 10) {
      throw new Error("Invalid score: Must be between 1 and 10.");
    }
    return {
      trackId,
      criteriaId,
      score,
    };
  });

  await prisma.$transaction([
    prisma.evaluation.createMany({ data: evaluations }),
    prisma.track.update({
      where: { id: trackId },
      data: { status: "EVALUATED" },
    }),
  ]);

  // Clean up uploaded file if it exists
  if (track.filePath) {
    await deleteUploadedFile(track.filePath);
  }



  revalidatePath(`/dashboard/${track.session.slug}`);
  return { success: true };
}

/**
 * Ends a session and archives results.
 */
export async function endSession(sessionId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const streamSession = await prisma.streamSession.findUnique({
    where: { id: sessionId },
    include: { 
      tracks: { include: { evaluations: true, submitter: true } } 
    }
  });

  if (!streamSession || streamSession.streamerId !== session.user.id) {
    throw new Error("Session not found");
  }

  const trackAverages = streamSession.tracks
    .filter(t => t.evaluations.length > 0)
    .map(t => {
      const avg = t.evaluations.reduce((acc, e) => acc + e.score, 0) / t.evaluations.length;
      return {
        title: t.title,
        submitterName: t.submitter?.name || "Anonymous",
        averageScore: avg,
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 3);

  await prisma.$transaction([
    prisma.historicalTopTrack.createMany({
      data: trackAverages.map((t, index) => ({
        sessionId,
        title: t.title,
        submitterName: t.submitterName,
        averageScore: t.averageScore,
        rank: index + 1,
      })),
    }),
    prisma.streamSession.update({
      where: { id: sessionId },
      data: { status: "ARCHIVED", endedAt: new Date() },
    }),
  ]);

  // Clean up all remaining uploaded files in this session (PARALLEL)
  const tracksWithFiles = streamSession.tracks.filter(t => t.filePath);
  await Promise.all(tracksWithFiles.map(track => deleteUploadedFile(track.filePath!)));


  revalidatePath("/dashboard");
  revalidatePath("/");
  return { success: true };
}

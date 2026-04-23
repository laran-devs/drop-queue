"use server";

import prisma from "@/lib/prisma";

export async function getUserProfileStats(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        submissions: {
          where: { status: "EVALUATED" },
          include: {
            evaluations: true,
            session: {
              select: { title: true, endedAt: true }
            }
          },
          orderBy: { submittedAt: "desc" }
        }
      }
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (!user.preferences?.isPublic) {
      return { success: false, error: "Private profile", isPrivate: true };
    }

    const totalSubmissions = user.submissions.length;
    
    // Calculate average score across all submissions
    let totalScoreSum = 0;
    let totalCriteriaCount = 0;
    let bangerCount = 0;

    const trackHistory = user.submissions.map(track => {
      const trackScores = track.evaluations.map(e => e.score);
      const avg = trackScores.length > 0 
        ? trackScores.reduce((a, b) => a + b, 0) / trackScores.length 
        : 0;
      
      totalScoreSum += trackScores.length > 0 ? trackScores.reduce((a, b) => a + b, 0) : 0;
      totalCriteriaCount += trackScores.length;
      
      if (avg >= 9.0) bangerCount++;

      return {
        id: track.id,
        title: track.title,
        averageScore: avg,
        submittedAt: track.submittedAt,
        sessionTitle: track.session.title
      };
    });

    const globalAverage = totalCriteriaCount > 0 ? totalScoreSum / totalCriteriaCount : 0;

    return {
      success: true,
      profile: {
        id: user.id,
        name: user.name,
        image: user.image,
        totalSubmissions,
        globalAverage,
        bangerCount,
        trackHistory: trackHistory.slice(0, 10) // Show last 10 tracks
      }
    };
  } catch (error) {
    console.error("Failed to fetch profile stats:", error);
    return { success: false, error: "Database error" };
  }
}

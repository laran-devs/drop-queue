"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getHallOfFameData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch sessions with top tracks from last 30 days
    const sessionsWithTops = await prisma.streamSession.findMany({
      where: {
        streamerId: session.user.id,
        topTracks: { some: {} },
        endedAt: { gte: thirtyDaysAgo }
      },
      include: {
        topTracks: {
          orderBy: { rank: "asc" }
        }
      },
      orderBy: { endedAt: "desc" },
      take: 10 
    });

    // Calculate Top Submitters (Last 30 Days)
    const submitterStats = new Map();
    
    sessionsWithTops.forEach(s => {
      s.topTracks.forEach(t => {
         const stats = submitterStats.get(t.submitterName) || { totalScore: 0, count: 0 };
         stats.totalScore += t.averageScore;
         stats.count += 1;
         submitterStats.set(t.submitterName, stats);
      });
    });

    const topSubmitters = Array.from(submitterStats.entries())
      .map(([name, stats]) => ({
         name,
         avg: stats.totalScore / stats.count,
         count: stats.count
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10); // Top 10

    return { 
      success: true, 
      sessions: sessionsWithTops,
      topSubmitters 
    };
  } catch (error) {
    console.error("Failed to fetch Hall of Fame data:", error);
    return { success: false, error: "Internal error" };
  }
}

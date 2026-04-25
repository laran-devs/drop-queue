"use server";

import prisma from "@/lib/prisma";
import { readdir, unlink, stat } from "fs/promises";
import { join } from "path";

/**
 * Automatically archives sessions that have been ACTIVE but inactive for more than 24 hours.
 */
export async function archiveStaleSessions() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find potentially stale sessions
  const staleSessions = await prisma.streamSession.findMany({
    where: {
      status: "ACTIVE",
      createdAt: { lt: oneDayAgo }
    },
    include: {
      tracks: {
        where: { submittedAt: { gt: oneDayAgo } },
        take: 1
      }
    }
  });

  const sessionsToArchive = staleSessions.filter(session => session.tracks.length === 0);

  if (sessionsToArchive.length > 0) {
    const ids = sessionsToArchive.map(s => s.id);
    await prisma.streamSession.updateMany({
      where: { id: { in: ids } },
      data: { status: "ARCHIVED", endedAt: new Date() }
    });
    
    console.log(`Auto-archived ${ids.length} stale sessions: ${ids.join(", ")}`);
    return { success: true, count: ids.length };
  }

  return { success: true, count: 0 };
}

/**
 * Proactive maintenance: Deletes files in public/uploads that are no longer referenced in the database.
 */
export async function cleanupOrphanedFiles() {
  try {
    const uploadDir = join(process.cwd(), "public", "uploads");
    const files = await readdir(uploadDir);
    
    // Get all file paths currently in the Track table
    const tracks = await prisma.track.findMany({
      where: { filePath: { not: null } },
      select: { filePath: true }
    });
    
    const dbFileNames = new Set(tracks.map(t => t.filePath?.replace("/uploads/", "")));
    
    let deletedCount = 0;
    for (const file of files) {
      if (!dbFileNames.has(file)) {
        const fullPath = join(uploadDir, file);
        try {
          const fileStat = await stat(fullPath);
          const ageInMs = Date.now() - fileStat.mtimeMs;
          const twoHoursInMs = 2 * 60 * 60 * 1000;

          if (ageInMs > twoHoursInMs) {
            console.log(`[Maintenance] Deleting orphaned file: ${file} (Age: ${Math.round(ageInMs / 3600000)}h)`);
            await unlink(fullPath);
            deletedCount++;
          }
        } catch (err) {
          console.error(`[Maintenance] Failed to stat/delete ${file}:`, err);
        }
      }
    }
    
    return { success: true, deletedCount };
  } catch (error) {
    console.error("[Maintenance] Cleanup failed:", error);
    return { success: false, error: "Cleanup failed" };
  }
}

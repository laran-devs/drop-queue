import prisma from "./prisma";
import { readdir, unlink, stat } from "fs/promises";
import { join } from "path";

/**
 * Automatically archives sessions that have been ACTIVE but inactive for more than 24 hours.
 */
export async function archiveStaleSessions() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

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
    
    console.log(`[Auto-Maintenance] Archived ${ids.length} stale sessions.`);
    return ids.length;
  }
  return 0;
}

/**
 * Deletes files in public/uploads that are no longer referenced in the database.
 * Safety window: 2 hours.
 */
export async function cleanupOrphanedFiles() {
  try {
    const uploadDir = join(process.cwd(), "public", "uploads");
    const files = await readdir(uploadDir);
    
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
          if (Date.now() - fileStat.mtimeMs > 2 * 60 * 60 * 1000) {
            await unlink(fullPath);
            deletedCount++;
          }
        } catch (e) {}
      }
    }
    
    if (deletedCount > 0) console.log(`[Auto-Maintenance] Cleaned up ${deletedCount} orphaned files.`);
    return deletedCount;
  } catch (error) {
    console.error("[Auto-Maintenance] Cleanup error:", error);
    return 0;
  }
}

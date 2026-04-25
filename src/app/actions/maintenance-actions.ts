"use server";

import * as logic from "@/lib/maintenance";

export async function archiveStaleSessions() {
  const count = await logic.archiveStaleSessions();
  return { success: true, count };
}

export async function cleanupOrphanedFiles() {
  try {
    const deletedCount = await logic.cleanupOrphanedFiles();
    return { success: true, deletedCount };
  } catch (error) {
    return { success: false, error: "Cleanup failed" };
  }
}

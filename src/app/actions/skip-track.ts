"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { deleteUploadedFile } from "@/lib/storage";


export async function skipTrack(trackId: string, reason: string) {

  // Validation: The skip cannot be processed without a manual comment.
  if (!reason || reason.trim().length === 0) {
    return {
      success: false,
      error: "A manual 'Reason for skipping' is strictly required to process a skip.",
    };
  }

  if (!trackId) {
    return {
      success: false,
      error: "Track ID is missing.",
    };
  }

  try {
    // Update the database: Mark track as SKIPPED and store the reason.
    const updatedTrack = await prisma.track.update({
      where: { 
        id: trackId,
        status: "PLAYING" // Optional: Ensure we only skip the currently playing track
      },
      data: {
        status: "SKIPPED",
        skipReason: reason,
      },
    });

    // Cleanup file if it was an upload
    if (updatedTrack.filePath) {
      await deleteUploadedFile(updatedTrack.filePath);
    }


    // Requirement: Reactive notifications.
    // In a full implementation, the client receiving this 'success' would emit 
    // a 'track_skipped' event via Socket.io to trigger the next track for all viewers.
    
    // Refresh the UI for anyone viewing the dashboard
    revalidatePath("/streamer/dashboard");
    revalidatePath("/queue");

    return {
      success: true,
      data: {
        id: updatedTrack.id,
        title: updatedTrack.title,
        reason: updatedTrack.skipReason
      }
    };
  } catch (error) {
    console.error("Skip Track Error:", error);
    
    if (typeof error === "object" && error !== null && "code" in error && error.code === 'P2025') {
      return {
        success: false,
        error: "Track not found or is not currently playing.",
      };
    }

    return {
      success: false,
      error: "An internal error occurred while skipping the track.",
    };
  }
}

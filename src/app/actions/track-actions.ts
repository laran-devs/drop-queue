"use server";

import prisma from "@/lib/prisma";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getTracksForSession(sessionId: string) {
  try {
    const tracks = await prisma.track.findMany({
      where: { sessionId },
      include: {
        submitter: {
          select: { name: true }
        }
      },
      orderBy: { submittedAt: "asc" }
    });
    return { success: true, tracks };
  } catch (error) {
    console.error("Failed to fetch tracks:", error);
    return { success: false, error: "Failed to fetch tracks" };
  }
}

export async function startTrack(trackId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { session: { select: { slug: true, streamerId: true } } }
    });

    if (!track) throw new Error("Track not found");
    if (track.session.streamerId !== session.user.id) throw new Error("Access denied");

    await prisma.track.update({
      where: { id: trackId },
      data: { status: "PLAYING" }
    });

    revalidatePath(`/dashboard/${track.session.slug}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to start track:", error);
    return { success: false, error: "Failed to start track" };
  }
}

export async function bumpTrack(trackId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { session: { select: { slug: true, streamerId: true } } }
    });

    if (!track) throw new Error("Track not found");
    if (track.session.streamerId !== session.user.id) throw new Error("Access denied");

    await prisma.track.update({
      where: { id: trackId },
      data: { isPaid: true }
    });

    revalidatePath(`/dashboard/${track.session.slug}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to bump track:", error);
    return { success: false, error: "Failed to bump track" };
  }
}

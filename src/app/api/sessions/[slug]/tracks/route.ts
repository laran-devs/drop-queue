import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const session = await prisma.streamSession.findUnique({
    where: { slug },
    include: {
      tracks: {
        include: {
          evaluations: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const tracksWithScores = session.tracks.map(track => {
    if (track.status === "EVALUATED" && track.evaluations.length > 0) {
      const avg = track.evaluations.reduce((acc, e) => acc + e.score, 0) / track.evaluations.length;
      return { ...track, averageScore: avg };
    }
    return track;
  });

  return NextResponse.json(tracksWithScores);
}

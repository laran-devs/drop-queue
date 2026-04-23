import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StreamerTrackSubmission } from "@/components/StreamerTrackSubmission";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface StreamSubmissionPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function StreamSubmissionPage({ params }: StreamSubmissionPageProps) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  
  const streamSession = await prisma.streamSession.findUnique({
    where: { slug },
    include: {
      streamer: {
        select: {
          name: true,
          image: true,
          accentColor: true,
        }
      }
    }
  });

  if (!streamSession) {
    notFound();
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-xl mx-auto">
        <StreamerTrackSubmission 
          session={streamSession} 
          user={session?.user || null} 
        />
      </div>
    </div>
  );
}

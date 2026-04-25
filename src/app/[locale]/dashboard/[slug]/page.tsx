import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { DashboardContent } from "@/components/DashboardContent";
// Re-syncing Prisma fields

interface DashboardPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const streamSession = await prisma.streamSession.findUnique({
    where: { slug },
    include: {
      tracks: {
        orderBy: { submittedAt: "asc" },
        include: { submitter: { select: { id: true, name: true } } }
      },
      criteria: true,
      streamer: { select: { image: true, name: true } },
      donations: { orderBy: { createdAt: "desc" } }
    },
  });

  if (!streamSession) {
    notFound();
  }

  // Ensure the streamer owns this session
  if (streamSession.streamerId !== session.user.id) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-16">
      <DashboardContent 
        session={streamSession} 
        userId={session.user.id} 
      />
    </div>
  );
}

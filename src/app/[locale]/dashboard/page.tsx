import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect as nextRedirect } from "next/navigation";
import { Link } from "@/navigation";
import prisma from "@/lib/prisma";
import { SetupWizard } from "@/components/SetupWizard";
import { isValidIdentifier } from "@/lib/url-utils";
import { getTranslations } from "next-intl/server";
import { StreamerStats } from "@/components/StreamerStats";
import { DashboardExplorer } from "@/components/DashboardExplorer";
import { archiveStaleSessions } from "@/app/actions/maintenance-actions";

export default async function DashboardHub() {
  const session = await getServerSession(authOptions);
  if (!session?.user) nextRedirect("/api/auth/signin");

  // Lazy maintenance: Archive staleness
  await archiveStaleSessions();

  // Fetch only the most recent sessions for the history list (Pagination)
  const mySessions = await prisma.streamSession.findMany({
    where: { streamerId: session.user.id },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      createdAt: true,
      overlayTheme: true,
      settings: true,
      showBpmOnOverlay: true,
      showKeyOnOverlay: true,
      _count: { select: { tracks: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 20, // Only show recent ones to keep page fast
  });

  // NATIVE AGGREGATIONS (Scalable Statistics)
  // 1. Total Tracks count
  const totalTracks = await prisma.track.count({
    where: { session: { streamerId: session.user.id } }
  });

  // 2. Average Score across all tracks
  const scoreAggregation = await prisma.evaluation.aggregate({
    where: { track: { session: { streamerId: session.user.id } } },
    _avg: { score: true },
    _count: { _all: true }
  });
  const avgScore = scoreAggregation._avg.score || 0;

  // 3. Acceptance Rate (Evaluated / (Evaluated + Skipped))
  const [evaluatedCount, skippedCount] = await Promise.all([
    prisma.track.count({ where: { session: { streamerId: session.user.id }, status: "EVALUATED" } }),
    prisma.track.count({ where: { session: { streamerId: session.user.id }, status: "SKIPPED" } })
  ]);

  const acceptanceRate = (evaluatedCount + skippedCount) > 0 
    ? (evaluatedCount / (evaluatedCount + skippedCount)) * 100 
    : 0;

  const activeSession = mySessions.find(s => s.status === "ACTIVE");
  const t = await getTranslations("Hub");

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-16">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-12">
        <div className="max-w-2xl space-y-6">
          <div className="flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Control Center</span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter leading-tight">
            {t("title")}
          </h1>
          <p className="text-xl text-zinc-500 max-w-xl leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {!activeSession && (
          <div className="w-full lg:max-w-xl">
            <SetupWizard />
          </div>
        )}

        {activeSession && (
          <Link 
            href={isValidIdentifier(activeSession.slug) ? `/dashboard/${activeSession.slug}` : "/dashboard"} 
            className="w-full lg:max-w-md glass p-10 rounded-[3rem] border border-green-500/20 shadow-2xl group hover:border-green-500/50 transition-all flex flex-col gap-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8">
               <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </div>
            
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500">{t("recordingNow")}</p>
            <h2 className="text-4xl font-black tracking-tighter uppercase">{activeSession.title}</h2>
            
            <div className="flex items-center gap-4 pt-6 border-t border-zinc-100 dark:border-zinc-900 mt-4">
              <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center font-bold text-xs">
                {activeSession._count.tracks}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tracks in queue</span>
              <div className="ml-auto h-12 w-12 rounded-full bg-green-500 text-white flex items-center justify-center group-hover:scale-110 transition-all">
                &rarr;
              </div>
            </div>
          </Link>
        )}
      </div>

      <section className="space-y-10">
        <div className="flex items-end justify-between border-b border-zinc-100 dark:border-zinc-900 pb-6">
           <h2 className="text-3xl font-black uppercase tracking-tighter">Your Statistics</h2>
           <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Real-time Performance</span>
        </div>
        <StreamerStats 
          totalTracks={totalTracks} 
          totalSessions={mySessions.length} 
          avgScore={avgScore}
          acceptanceRate={acceptanceRate}
        />
      </section>

      <DashboardExplorer 
        sessions={mySessions as any} 
        streamer={{ accentColor: session.user.accentColor as string }}
      />
    </div>
  );
}

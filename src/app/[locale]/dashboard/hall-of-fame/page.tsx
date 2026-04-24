import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Link } from "@/navigation";
import { redirect } from "next/navigation";
import { Trophy, Music, Calendar } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function DashboardHallOfFamePage({ 
  params,
  searchParams
}: { 
  params: Promise<{ locale: string }>,
  searchParams: Promise<{ period?: string }>
}) {
  await params;
  const { period } = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
    return null; // Satisfy TS compiler
  }

  // Period filter logic
  const now = new Date();
  const startDate = period === "month" 
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(0);

  // Fetch sessions with top tracks
  const sessionsWithTops = await prisma.streamSession.findMany({
    where: {
      streamerId: session.user.id,
      topTracks: { some: {} },
      endedAt: { gte: startDate }
    },
    include: {
      topTracks: {
        orderBy: { rank: "asc" }
      }
    },
    orderBy: { endedAt: "desc" },
    take: 50
  });

  // Calculate Top Submitters (Overall/Seasonal)
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
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-16">
      <div className="flex flex-col md:flex-row items-center gap-8 justify-between border-b border-zinc-100 dark:border-zinc-800 pb-12">
        <div className="space-y-4 text-center md:text-left">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 text-[10px] font-black uppercase tracking-widest">
             <Trophy size={12} />
             Historical Records
           </div>
           <h1 className="text-4xl font-black tracking-tight">Your <span className="text-purple-600">Hall of Fame</span></h1>
           <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl w-fit mx-auto md:mx-0">
              <Link 
                href="/dashboard/hall-of-fame"
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!period ? "bg-white dark:bg-zinc-800 shadow-sm text-purple-600" : "text-zinc-500 opacity-50"}`}
              >
                All Time
              </Link>
              <Link 
                href="/dashboard/hall-of-fame?period=month"
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${period === "month" ? "bg-white dark:bg-zinc-800 shadow-sm text-purple-600" : "text-zinc-500 opacity-50"}`}
              >
                Season {now.toLocaleString('default', { month: 'short' })}
              </Link>
           </div>
        </div>
        
        <div className="hidden lg:grid grid-cols-2 gap-4 relative">
            <div className="glass p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                <Music size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tracks</p>
                <p className="text-lg font-black">{sessionsWithTops.reduce((acc, s) => acc + s.topTracks.length, 0)}</p>
              </div>
            </div>
            
            <div className="glass p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                <Trophy size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-600">Bangers</p>
                <p className="text-lg font-black">{sessionsWithTops.filter(s => s.topTracks.some(t => t.averageScore >= 9)).length}</p>
              </div>
            </div>
        </div>
      </div>

      {/* Seasonal Leaders Section */}
      {topSubmitters.length > 0 && (
        <div className="space-y-8">
           <div className="space-y-2">
             <h2 className="text-xl font-black uppercase tracking-tighter">Season {period === "month" ? "MVP's" : "Legends"}</h2>
             <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Users with highest impact on your stream</p>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
             {topSubmitters.map((s, i) => (
               <div key={s.name} className="glass p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center gap-3 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-purple-600 opacity-20" />
                  <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-xl font-black text-zinc-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                    #{i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-black truncate w-full px-2">{s.name}</p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-xl font-black text-purple-600">{s.avg.toFixed(1)}</span>
                      <span className="text-[10px] font-bold text-zinc-400">{s.count} hits</span>
                    </div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      <div className="space-y-20">
        {sessionsWithTops.length > 0 ? (
          sessionsWithTops.map((streamSession) => (
            <div key={streamSession.id} className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                   <Calendar size={18} />
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-xl font-black tracking-tight">{streamSession.title}</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {streamSession.endedAt?.toLocaleDateString()} &bull; Session #{streamSession.slug}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {streamSession.topTracks.map((track) => (
                  <div key={track.id} className="glass p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 relative group hover:scale-[1.02] transition-all">
                    <div className={`absolute top-0 right-0 p-6 text-4xl font-black opacity-10 group-hover:opacity-20 transition-opacity ${
                      track.rank === 1 ? 'text-yellow-500' :
                      track.rank === 2 ? 'text-zinc-400' :
                      'text-orange-500'
                    }`}>
                      #{track.rank}
                    </div>
                    
                    <div className="space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                        {track.rank === 1 ? '🏆' : track.rank === 2 ? '🥈' : '🥉'}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold truncate pr-8">{track.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Dropped by</span>
                           <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">{track.submitterName}</span>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-baseline">
                         <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Avg Score</span>
                         <span className="text-2xl font-black text-purple-600">{track.averageScore.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 flex justify-center">
            <EmptyState 
              icon={<Trophy size={40} strokeWidth={1.5} />}
              title="Empty Trophy Case"
              description="End an active session with some rated tracks to start building your Hall of Fame legacy."
              action={
                <Link href="/dashboard" className="px-8 py-3 rounded-2xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest inline-block transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/20">
                  Return to Dashboard
                </Link>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

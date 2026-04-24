import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Trophy } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";

export default async function LeaderboardPage({ 
  params 
}: { 
  params: Promise<{ locale: string; twitchLogin: string }> 
}) {
  const session = await getServerSession(authOptions);
  const { twitchLogin } = await params;

  // Requirement: Hall of Fame visible only after registration
  if (!session) {
    redirect("/");
  }

  // Find the streamer by twitchLogin
  const streamer = await prisma.user.findFirst({
    where: { twitchLogin: twitchLogin.toLowerCase() },
    select: {
      id: true,
      name: true,
      image: true,
      accentColor: true,
      twitchLogin: true
    }
  });

  if (!streamer) {
    notFound();
  }

  // Fetch only this streamer's sessions
  const sessionsWithTops = await prisma.streamSession.findMany({
    where: {
      streamerId: streamer.id,
      topTracks: { some: {} }
    },
    include: {
      topTracks: {
        orderBy: { rank: "asc" }
      }
    },
    orderBy: { endedAt: "desc" },
    take: 50
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-16 sm:space-y-20">
      <div className="text-center mb-16 space-y-4">
        <div className="flex flex-col items-center gap-4">
           {streamer.image && (
             <Image 
               src={streamer.image} 
               alt="" 
               width={80} 
               height={80} 
               className="h-20 w-20 rounded-[2rem] border-4 border-white shadow-2xl dark:border-zinc-900" 
             />
           )}
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Streamer Trophy Case</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl">
          {streamer.name || streamer.twitchLogin}{" "}<span className="text-purple-600">Hall of Fame</span>
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          The legendary tracks of {streamer.name || streamer.twitchLogin}&apos;s broadcasts, preserved forever.
        </p>
      </div>

      <div className="space-y-16">
        {sessionsWithTops.length > 0 ? (
          sessionsWithTops.map((session) => (
            <div key={session.id} className="space-y-10 border-b border-zinc-100 dark:border-zinc-900 pb-16 last:border-0">
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">Broadcast Results</span>
                  <h2 className="text-2xl font-black tracking-tight">{session.title}</h2>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-mono text-zinc-400">{session.endedAt?.toLocaleDateString()}</p>
                   <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Session #{session.slug}</p>
                </div>
              </div>

              {/* Integration of Analytics for each session */}
              <AnalyticsDashboard 
                data={session.topTracks.map(t => ({
                  title: t.title,
                  score: t.averageScore,
                  submitter: t.submitterName
                }))}
                accentColor={streamer.accentColor || "#9146ff"}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {session.topTracks.map((track) => (
                  <div key={track.id} className="glass p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 relative group hover:scale-[1.02] transition-all">
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
                        <p className="text-xs text-zinc-500">{track.submitterName}</p>
                      </div>
                      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-baseline">
                         <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Score</span>
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
              title="No records yet"
              description="This streamer hasn't archived any sessions yet. Check back soon!"
            />
          </div>
        )}
      </div>
    </div>
  );
}

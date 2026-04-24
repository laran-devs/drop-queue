import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Music, BarChart3, Trophy, Clock, Search, Activity } from "lucide-react";
import { ProfileAnalytics } from "@/components/ProfileAnalytics";
import Link from "next/link";


export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
    return null; // Satisfy TS compiler
  }

  // Fetch user's submission history with evaluations
  const submissions = await prisma.track.findMany({
    where: { submitterId: session.user.id },
    include: {
      session: {
        include: { streamer: true }
      },
      evaluations: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  // Calculate statistics
  const totalSubmissions = submissions.length;
  const evaluatedTracks = submissions.filter(t => t.status === "EVALUATED");
  
  const totalScore = evaluatedTracks.reduce((sum, track) => {
    const avg = track.evaluations.length > 0
      ? track.evaluations.reduce((s, e) => s + e.score, 0) / track.evaluations.length
      : 0;
    return sum + avg;
  }, 0);

  const averageScore = evaluatedTracks.length > 0 ? (totalScore / evaluatedTracks.length).toFixed(1) : "0.0";
  
  const bestScore = evaluatedTracks.reduce((max, track) => {
    const avg = track.evaluations.length > 0
      ? track.evaluations.reduce((s, e) => s + e.score, 0) / track.evaluations.length
      : 0;
    return Math.max(max, avg);
  }, 0).toFixed(1);

  // Advanced Analytics Calculations
  const bangers = evaluatedTracks.filter(t => {
    const avg = t.evaluations.reduce((s, e) => s + e.score, 0) / t.evaluations.length;
    return avg >= 8.0;
  }).length;
  
  const bangerRate = totalSubmissions > 0 ? (bangers / totalSubmissions) * 100 : 0;

  const platformGroups = submissions.reduce((acc, t) => {
    const type = t.trackType === "FILE" ? "Direct Upload" : (t.url?.includes("spotify") ? "Spotify" : t.url?.includes("youtube") ? "YouTube" : t.url?.includes("soundcloud") ? "SoundCloud" : "Other");
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const platformData = Object.entries(platformGroups).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

  const chartData = evaluatedTracks.map(t => ({
    title: t.title,
    score: t.evaluations.reduce((s, e) => s + e.score, 0) / t.evaluations.length,
    date: new Date(t.submittedAt).toLocaleDateString(),
    streamer: t.session.streamer.name || "Unknown"
  }));


  return (
    <div className="relative min-h-screen py-12 sm:py-20 overflow-x-hidden">
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* USER INFO & STATS */}
          <aside className="w-full lg:w-80 space-y-8">
            <div className="glass p-8 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 text-center space-y-6 shadow-2xl">
              <div className="relative inline-block">
                {session.user.image && (
                  <Image 
                    src={session.user.image} 
                    alt={session.user.name || "User"} 
                    width={100} 
                    height={100} 
                    className="rounded-[2.5rem] border-4 border-white dark:border-zinc-900 shadow-xl"
                  />
                )}
                <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-zinc-900">
                  <Trophy size={14} />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">{session.user.name}</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-1">Community Member</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              {[
                { label: "Total Track Drops", value: totalSubmissions, icon: Music, color: "text-purple-600" },
                { label: "Lifetime Average", value: averageScore, icon: BarChart3, color: "text-blue-600" },
                { label: "Personal Best", value: bestScore, icon: Trophy, color: "text-yellow-600" }
              ].map((stat, i) => (
                <div key={i} className="glass p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className={stat.color}><stat.icon size={20} /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{stat.label}</p>
                    <p className="text-2xl font-black tracking-tight">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* SUBMISSION HISTORY */}
          <main className="flex-1 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-3xl font-black tracking-tight leading-none flex items-center gap-4">
                <Activity className="text-zinc-400" />
                Your <span className="text-purple-600">Analytics</span>
              </h3>
            </div>

            <ProfileAnalytics 
              data={chartData} 
              platformData={platformData}
              bangerRate={bangerRate}
              accentColor="#9146ff"
            />

            <div className="flex items-center justify-between pt-12">
              <h3 className="text-3xl font-black tracking-tight leading-none flex items-center gap-4">
                <Clock className="text-zinc-400" />
                Drop <span className="text-purple-600">History</span>
              </h3>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <Search size={14} />
                {totalSubmissions} Total Entries
              </div>
            </div>


            <div className="space-y-4">
              {submissions.length > 0 ? (
                submissions.map((track) => {
                  const avgScore = track.evaluations.length > 0
                    ? track.evaluations.reduce((s, e) => s + e.score, 0) / track.evaluations.length
                    : null;

                  return (
                    <div 
                      key={track.id} 
                      className="glass p-6 sm:p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 group hover:border-purple-500/30 transition-all shadow-xl hover:shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-6"
                    >
                      <div className="h-16 w-16 shrink-0 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-purple-600 transition-colors">
                        <Music size={28} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Dropped In</p>
                          <div className="flex items-center gap-2">
                             {track.session.streamer.image && (
                               <Image src={track.session.streamer.image} alt="" width={16} height={16} className="rounded-full" />
                             )}
                             <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 italic">{track.session.streamer.name}</span>
                          </div>
                        </div>
                        <h4 className="text-xl font-black tracking-tight truncate leading-none mb-2">
                          {track.title}
                        </h4>
                        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
                          {new Date(track.submittedAt).toLocaleDateString()} &bull; {track.session.title}
                        </p>
                      </div>

                      <div className="w-full sm:w-auto flex items-center justify-end gap-6 sm:pl-8 sm:border-l border-zinc-200 dark:border-zinc-800">
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Result</p>
                          {track.status === "EVALUATED" ? (
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-purple-600">{avgScore?.toFixed(1)}</span>
                              <span className="text-[10px] font-bold opacity-30">/ 10</span>
                            </div>
                          ) : (
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                              track.status === "SKIPPED" ? "border-red-500/30 text-red-500 bg-red-500/10" : "border-zinc-500/30 text-zinc-500 bg-zinc-500/10"
                            }`}>
                              {track.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="glass p-20 rounded-[3rem] border border-dashed border-zinc-300 dark:border-zinc-700 text-center space-y-4">
                  <div className="h-20 w-20 bg-zinc-100 dark:bg-zinc-900 rounded-[2rem] flex items-center justify-center mx-auto text-zinc-400">
                    <Music size={40} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight">No tracks dropped yet.</h3>
                  <p className="text-sm text-zinc-500 max-w-xs mx-auto">Find an active stream and share your music to start building your history!</p>
                </div>
              )}
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}

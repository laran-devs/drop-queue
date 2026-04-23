import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Music, Trophy, Star, History, Calendar, BarChart2 } from "lucide-react";
import { format } from "date-fns";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  return {
    title: `${user?.name || "Viewer"}'s Profile | DropQueue`,
    description: `Submission stats and track history for ${user?.name || "this viewer"}.`,
  };
}

export default async function ViewerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      submissions: {
        include: {
          evaluations: true,
          session: { select: { title: true, slug: true } }
        },
        orderBy: { submittedAt: "desc" }
      }
    }
  });

  if (!user) {
    notFound();
  }

  const totalSubmissions = user.submissions.length;
  const tracksWithScores = user.submissions.filter(s => s.evaluations.length > 0);
  
  const totalScore = tracksWithScores.reduce((acc, track) => {
    const avg = track.evaluations.reduce((sum, e) => sum + e.score, 0) / track.evaluations.length;
    return acc + avg;
  }, 0);

  const avgScore = tracksWithScores.length > 0 ? (totalScore / tracksWithScores.length).toFixed(1) : "0.0";
  
  const bangers = user.submissions.filter(track => {
    if (track.evaluations.length === 0) return false;
    const avg = track.evaluations.reduce((sum, e) => sum + e.score, 0) / track.evaluations.length;
    return avg >= 9.0;
  });

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl blur-[120px] opacity-20 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600 rounded-full" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600 rounded-full" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="h-32 w-32 rounded-[2.5rem] bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-5xl shadow-2xl">
              {user.name?.[0].toUpperCase() || "V"}
            </div>
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10 text-white/40">
                  Community Member
                </span>
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">#{user.id.slice(-6)}</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-4">
                {user.name}
              </h1>
              <p className="text-lg text-white/50 font-medium max-w-xl">
                Exploring the pulse of the stream, one track at a time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="container mx-auto px-6 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Total Submissions", value: totalSubmissions, icon: Music, color: "text-purple-500" },
            { label: "Level of Vibe", value: avgScore, suffix: "/10", icon: BarChart2, color: "text-blue-500" },
            { label: "Bangers Produced", value: bangers.length, icon: Trophy, color: "text-amber-500" },
          ].map((stat, i) => (
            <div key={i} className="glass p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2">{stat.label}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">{stat.value}</span>
                    {stat.suffix && <span className="text-sm font-bold text-white/30">{stat.suffix}</span>}
                  </div>
                </div>
                <div className={`p-4 rounded-2xl bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Content Tabs/Sections */}
      <section className="container mx-auto px-6 mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* History (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center gap-4 mb-4">
              <History className="text-purple-500" />
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Track Journey</h2>
            </div>

            <div className="space-y-4">
              {user.submissions.length > 0 ? (
                user.submissions.map((track) => {
                  const score = track.evaluations.length > 0 
                    ? (track.evaluations.reduce((s, e) => s + e.score, 0) / track.evaluations.length).toFixed(1)
                    : null;
                  
                  return (
                    <div key={track.id} className="glass p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all group">
                      <div className="flex justify-between items-center gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                              {track.session?.title || "Archived Session"}
                            </span>
                          </div>
                          <h4 className="text-xl font-black text-white truncate group-hover:text-purple-400 transition-colors">
                            {track.title}
                          </h4>
                          <div className="flex items-center gap-4 mt-2">
                             <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40">
                               <Calendar size={12} />
                               {format(new Date(track.submittedAt), "MMM d, yyyy")}
                             </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          {score ? (
                            <div className="text-right">
                              <span className={`text-2xl font-black ${parseFloat(score) >= 9 ? "text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]" : "text-white"}`}>
                                {score}
                                <span className="text-[10px] opacity-30 ml-1">/ 10</span>
                              </span>
                            </div>
                          ) : (
                            <span className="px-3 py-1 rounded-lg bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/20">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                  <p className="text-white/20 font-bold italic">No tracks submitted yet. Join a stream to start the journey!</p>
                </div>
              )}
            </div>
          </div>

          {/* Highlights (4 cols) */}
          <div className="lg:col-span-4 space-y-8">
            <div className="flex items-center gap-4 mb-4">
              <Star className="text-amber-500" />
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Highlights</h2>
            </div>

            <div className="glass p-8 rounded-[2.5rem] border border-white/5 bg-gradient-to-b from-white/5 to-transparent space-y-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Most Viral Tracks (Bangers)</p>
              
              {bangers.length > 0 ? (
                <div className="space-y-6">
                  {bangers.slice(0, 5).map((track, i) => (
                    <div key={track.id} className="flex gap-4 items-center">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-black">
                        #{i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white truncate">{track.title}</p>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Score: 9+</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/20 italic font-medium">Banger status awaits...</p>
              )}

              <div className="pt-6 border-t border-white/5">
                 <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                    <p className="text-[9px] font-black uppercase tracking-widest text-purple-400 mb-1">Coming Soon</p>
                    <p className="text-[10px] font-bold text-white/50 leading-relaxed">Personalized badges and specialized vibe analytics based on your track variety.</p>
                 </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

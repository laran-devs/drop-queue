import { getUserProfileStats } from "@/app/actions/profile-actions";
import { getTranslations } from "next-intl/server";
import { Music, Trophy, BarChart3, Clock, Lock, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { Link } from "@/navigation";
import { notFound } from "next/navigation";

interface PublicProfilePageProps {
  params: Promise<{
    locale: string;
    userId: string;
  }>;
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { userId } = await params;
  const t = await getTranslations("Profile");
  
  const result = await getUserProfileStats(userId);

  if (!result.success && !result.isPrivate) {
    notFound();
  }

  if (result.isPrivate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass p-12 rounded-[3.5rem] border border-zinc-200 dark:border-zinc-800 text-center space-y-6 max-w-md shadow-2xl">
          <div className="h-20 w-20 bg-amber-500/10 rounded-[2rem] flex items-center justify-center mx-auto text-amber-500">
            <Lock size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight">{t("private")}</h1>
            <p className="text-sm text-zinc-500 font-medium leading-relaxed">
              {t("privateDesc")}
            </p>
          </div>
          <Link 
            href="/" 
            className="inline-block px-8 py-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { profile } = result;

  return (
    <div className="relative min-h-screen pt-32 pb-20 overflow-x-hidden">
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-[-10%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* USER INFO & STATS */}
          <aside className="w-full lg:w-80 space-y-8">
            <div className="glass p-8 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 text-center space-y-6 shadow-2xl">
              <div className="relative inline-block">
                {profile?.image && (
                  <Image 
                    src={profile.image} 
                    alt={profile.name || "User"} 
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
                <h2 className="text-2xl font-black tracking-tight">{profile?.name}</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-1">
                    {t("title")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              {[
                { label: t("submissions"), value: profile?.totalSubmissions, icon: Music, color: "text-purple-600" },
                { label: t("avgScore"), value: profile?.globalAverage?.toFixed(1), icon: BarChart3, color: "text-blue-600" },
                { label: t("bangers"), value: profile?.bangerCount, icon: Trophy, color: "text-yellow-600" }
              ].map((stat, i) => (
                <div key={i} className="glass p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 space-y-4 transition-all hover:scale-[1.02]">
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
                <Clock className="text-zinc-400" />
                {t("history")}
              </h3>
            </div>

            <div className="space-y-4">
              {profile?.trackHistory && profile.trackHistory.length > 0 ? (
                profile.trackHistory.map((track) => (
                  <div 
                    key={track.id} 
                    className="glass p-6 sm:p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 group hover:border-purple-500/30 transition-all shadow-xl hover:shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-6"
                  >
                    <div className="h-16 w-16 shrink-0 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-purple-600 transition-colors">
                      <Music size={28} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{t("submissions")} in</p>
                      <h4 className="text-xl font-black tracking-tight truncate leading-none mb-2">
                        {track.title}
                      </h4>
                      <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
                        {new Date(track.submittedAt).toLocaleDateString()} &bull; {track.sessionTitle}
                      </p>
                    </div>

                    <div className="w-full sm:w-auto flex items-center justify-end gap-6 sm:pl-8 sm:border-l border-zinc-200 dark:border-zinc-800">
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Result</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-purple-600">{track.averageScore.toFixed(1)}</span>
                          <span className="text-[10px] font-bold opacity-30">/ 10</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass p-20 rounded-[3rem] border border-dashed border-zinc-300 dark:border-zinc-700 text-center space-y-4">
                  <div className="h-20 w-20 bg-zinc-100 dark:bg-zinc-900 rounded-[2rem] flex items-center justify-center mx-auto text-zinc-400">
                    <Music size={40} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight">{t("noHistory")}</h3>
                </div>
              )}
            </div>
            
            <div className="pt-12 text-center">
                <Link 
                  href="/" 
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 hover:text-purple-600 transition-all"
                >
                  <ChevronLeft size={14} />
                  Back to Hub
                </Link>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}

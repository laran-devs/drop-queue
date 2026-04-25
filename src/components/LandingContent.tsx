"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { isValidIdentifier } from "@/lib/url-utils";
import { SignInButton } from "@/components/SignInButton";
import Image from "next/image";
import { Music, PlayCircle, Sparkles, Zap, Globe, Heart, LayoutDashboard } from "lucide-react";
import HeroSection from "@/components/HeroSection";

interface LandingContentProps {
  sessions: any[];
  session: any;
}

export default function LandingContent({ sessions, session }: LandingContentProps) {
  const t = useTranslations("Landing");

  return (
    <div className="relative min-h-screen bg-white dark:bg-black overflow-x-hidden">
      {/* BACKGROUND DECORATION */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-500/10 blur-[100px] rounded-full animate-pulse delay-700" />
      </div>

      {/* HERO SECTION */}
      <HeroSection />

      {/* GOAL / PURPOSE SECTION */}
      <section className="relative z-10 py-24 px-4">
        <div className="mx-auto max-w-4xl glass p-10 sm:p-16 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles size={120} className="text-purple-600" />
          </div>
          
          <div className="space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-widest">
              <Zap size={14} />
              {t("ourMission")}
            </div>
            <h2 
              className="text-3xl sm:text-5xl font-black tracking-tight leading-tight"
              dangerouslySetInnerHTML={{ __html: t.raw("goalTitle") }}
            />
            <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
              {t("missionDesc")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
              {[
                { icon: Globe, title: t("globalReach"), desc: t("globalReachDesc") },
                { icon: Music, title: t("pureAudio"), desc: t("pureAudioDesc") },
                { icon: Sparkles, title: t("vibeControl"), desc: t("vibeControlDesc") }
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="text-purple-600"><item.icon size={20} /></div>
                  <h4 className="font-bold text-sm tracking-tight">{item.title}</h4>
                  <p className="text-[10px] text-zinc-500 leading-tight">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DISCOVER ACTIVE QUEUES */}
      <section id="discover" className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 space-y-16">
        <div className="flex flex-col items-center text-center space-y-4">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">{t("liveExplorer")}</span>
          <h3 
            className="text-4xl font-black tracking-tighter sm:text-5xl"
            dangerouslySetInnerHTML={{ __html: t.raw("activeBroadcasts") }}
          />
          <div className="h-1.5 w-24 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full" />
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={isValidIdentifier(session.slug) ? `/stream/${session.slug}` : "/"}
              className="glass p-8 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 hover:scale-[1.02] transition-all group shadow-xl hover:shadow-2xl hover:border-purple-500/30"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  {session.streamer.image && (
                    <Image
                      src={session.streamer.image}
                      alt={session.streamer.name || ""}
                      width={48}
                      height={48}
                      className="rounded-2xl border-2 border-white dark:border-zinc-900 shadow-lg group-hover:rotate-6 transition-transform"
                    />
                  )}
                  <div>
                    <h3 className="text-sm font-black tracking-tight">{session.streamer.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${session.status === "ACTIVE" ? "bg-green-500 animate-pulse" : "bg-zinc-400"}`} />
                      <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                        {session.status === "ACTIVE" ? t("onAir") : t("paused")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shadow-inner">
                  <PlayCircle size={24} />
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-2xl font-black tracking-tighter leading-tight group-hover:text-purple-600 transition-colors">
                  {session.title}
                </h4>
                
                <div className="flex items-center gap-3">
                  <div className="px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-zinc-500 border border-zinc-200 dark:border-zinc-800">
                    {session._count.tracks} {t("tracksInQueueSuffix")}
                  </div>
                  {session.allowDirectUploads && (
                    <div className="h-2 w-2 rounded-full bg-blue-500" title="File Uploads Enabled" />
                  )}
                </div>
              </div>
            </Link>
          ))}

          {/* CALL TO ACTION CARD */}
          <div className="glass p-2 rounded-[3.5rem] border border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center min-h-[350px] text-center space-y-8 group hover:border-purple-500/50 transition-all">
             <div className="h-20 w-20 rounded-[2rem] bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:bg-purple-600/10 group-hover:text-purple-600 transition-all duration-500">
               <Music size={40} className="group-hover:scale-110 transition-transform" />
             </div>
             <div className="space-y-3 px-8">
               <h3 className="text-xl font-black tracking-tight">{t("readyToLead")}</h3>
               <p className="text-xs text-zinc-500">{t("readyToLeadDesc")}</p>
             </div>
              {session ? (
                <Link 
                  href="/dashboard"
                  className="px-10 py-4 rounded-3xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <LayoutDashboard size={16} />
                  {t("goDashboard")}
                </Link>
              ) : (
                <SignInButton />
              )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-zinc-100 dark:border-zinc-900 py-16">
        <div className="mx-auto max-w-7xl px-4 flex flex-col items-center space-y-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <span className="font-black tracking-tight text-zinc-900 dark:text-zinc-100">DropQueue</span>
          </div>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
            {t("handcraftedBy")} <Heart size={10} className="text-red-500 animate-bounce" /> by <span className="text-zinc-900 dark:text-zinc-100">laran-devs</span>
          </p>
          <div className="text-[8px] text-zinc-400 font-mono">
            &copy; {new Date().getFullYear()} DropQueue. {t("allRights")}
          </div>
        </div>
      </footer>
    </div>
  );
}

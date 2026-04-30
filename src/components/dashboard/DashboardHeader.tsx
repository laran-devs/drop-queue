"use client";

import { motion } from "framer-motion";
import { 
  Send, 
  Monitor, 
  Trophy, 
  Copy, 
  Share2, 
  HelpCircle, 
  BarChart2, 
  Settings as SettingsIcon,
  Play,
  Pause,
  ArrowRight,
  Wallet,
  User,
  Shield
} from "lucide-react";
import { Link } from "@/navigation";
import { toast } from "sonner";
import { StreamCarousel } from "@/components/StreamCarousel";
import { useTranslations } from "next-intl";

interface DashboardHeaderProps {
  session: {
    id: string;
    slug: string;
    title: string;
    createdAt: Date;
    overlayToken?: string | null;
    streamer?: {
      name: string | null;
      image: string | null;
    }
  };
  tracks: any[];
  playingTrackId: string | null;
  accentColor: string;
  isStreamPaused: boolean;
  togglePause: () => void;
  endSession: (id: string) => Promise<any>;
  sessionTime: number;
  locale: string;
  onToggleAnalytics: () => void;
  onToggleSettings: () => void;
  onToggleGuide: () => void;
  onToggleWallet: () => void;
  showAnalytics: boolean;
  showSettings: boolean;
  showGuide: boolean;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  togglePlay: () => void;
  onSeek: (time: number) => void;
}

export function DashboardHeader({
  session,
  tracks,
  playingTrackId,
  accentColor,
  isStreamPaused,
  togglePause,
  endSession,
  sessionTime,
  locale,
  isPrivacyMode,
  onTogglePrivacy,
  onToggleAnalytics,
  onToggleSettings,
  onToggleGuide,
  onToggleWallet,
  showAnalytics,
  showSettings,
  showGuide,
  currentTime,
  duration,
  isPlaying,
  togglePlay,
  onSeek
}: DashboardHeaderProps) {
  const t = useTranslations("Dashboard");
  const h = useTranslations("Header");
  
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} ${t("copyLink")}!`, {
      description: t("obsInfo"),
      icon: "📋"
    });
  };

  return (
    <div className="space-y-12">
      {/* Session Hero & Carousel */}
      <section className="relative glass p-10 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden bg-white/5">
        <div className="absolute -top-40 -right-40 h-96 w-96 blur-[120px] rounded-full opacity-20" style={{ backgroundColor: accentColor }} />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${isStreamPaused ? "bg-amber-500" : "bg-red-500 animate-pulse"}`} />
                {isStreamPaused ? t("streamPaused") : t("streamActive")}
              </span>
              <span className="text-zinc-400 font-mono text-[10px] tabular-nums">{formatTime(sessionTime)}</span>
              <span className={`text-zinc-500 font-mono text-xs opacity-30 transition-all ${isPrivacyMode ? "blur-md select-none" : ""}`}>#{session.slug}</span>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative h-16 w-16 shrink-0">
                {session.streamer?.image ? (
                  <img 
                    src={session.streamer.image} 
                    alt={session.streamer.name || "Streamer"} 
                    referrerPolicy="no-referrer"
                    className="h-full w-full rounded-2xl border-2 border-white dark:border-zinc-800 shadow-xl object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        const fallback = parent.querySelector('.avatar-fallback');
                        if (fallback) (fallback as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div 
                  className="avatar-fallback h-full w-full rounded-2xl border-2 border-white dark:border-zinc-800 shadow-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400"
                  style={{ display: session.streamer?.image ? 'none' : 'flex' }}
                >
                  <User size={24} />
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-lg bg-green-500 border-2 border-white dark:border-zinc-800 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                </div>
              </div>
              <h1 className="text-5xl font-black tracking-tighter">{session.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={onTogglePrivacy}
              className={`p-3 rounded-2xl border transition-all ${isPrivacyMode ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20" : "glass border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"}`}
              title={t("privacyMode")}
            >
              <Shield size={20} fill={isPrivacyMode ? "currentColor" : "none"} />
            </button>

            <button 
              onClick={togglePause} 
              className={`group px-6 py-3 glass border ${isStreamPaused ? "border-green-500/50 text-green-500" : "border-amber-500/50 text-amber-500"} text-xs font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2`}
            >
              {isStreamPaused ? <Play size={14} /> : <Pause size={14} />}
              {isStreamPaused ? t("resumeStream") : t("pauseStream")}
            </button>
            <button 
              onClick={() => endSession(session.id)} 
              className="px-6 py-3 glass border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-red-500/10 transition-all active:scale-95"
            >
              {t("endSession")}
            </button>
          </div>
        </div>

        <StreamCarousel 
          tracks={tracks} 
          playingTrackId={playingTrackId} 
          accentColor={accentColor}
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          onSeek={onSeek}
        />
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-6 glass p-4 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-lg bg-zinc-50/50 dark:bg-zinc-100/5">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-1.5 p-1.5 bg-white/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                {[
                  { type: 'button', icon: Send, label: t("submitPage"), color: "hover:text-purple-500", onClick: () => copyToClipboard(`${window.location.origin}/${locale}/stream/${session.slug}`, t("submissionLink")) },
                  { type: 'button', icon: Monitor, label: t("obsSource"), color: "hover:text-blue-500", onClick: () => {
                    const url = `${window.location.origin}/${locale}/overlay/${session.slug}${session.overlayToken ? `?token=${session.overlayToken}` : ""}`;
                    copyToClipboard(url, t("obsOverlay"));
                  }},
                  { type: 'button', icon: Share2, label: t("shareStream"), color: "hover:text-amber-500", onClick: () => {
                    const text = t("inviteText", { url: `${window.location.origin}/${locale}/stream/${session.slug}` });
                    copyToClipboard(text, t("inviteMessage"));
                  }},
                  { type: 'link', icon: Trophy, label: `${h("hallOfFame")} 🏆`, color: "hover:text-purple-600", href: "/dashboard/hall-of-fame" }
                ].map((item: any, i) => {
                  const content = (
                    <>
                      <item.icon size={16} className="text-zinc-400 group-hover:scale-110 transition-transform" />
                      <span className={`text-[10px] font-black uppercase tracking-widest hidden sm:block ${isPrivacyMode && item.type === 'button' ? "blur-sm" : ""}`}>{item.label}</span>
                    </>
                  );

                  if (item.type === 'link') {
                    return (
                      <Link 
                        key={i}
                        href={item.href}
                        className={`p-2.5 rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition-all group flex items-center gap-2 ${item.color}`}
                      >
                        {content}
                      </Link>
                    )
                  }

                  return (
                    <button 
                      key={i}
                      onClick={item.onClick}
                      className={`p-2.5 rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition-all group flex items-center gap-2 ${item.color}`}
                      title={item.label}
                    >
                      {content}
                    </button>
                  );
                })}
             </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white/50 dark:bg-zinc-900/50 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              {[
                { icon: Wallet, active: false, toggle: onToggleWallet, color: "text-purple-500", label: h("wallet") },
                { icon: BarChart2, active: showAnalytics, toggle: onToggleAnalytics, color: "text-blue-500", label: t("analytics") },
                { icon: SettingsIcon, active: showSettings, toggle: onToggleSettings, color: "text-zinc-500", label: t("settings") },
                { icon: HelpCircle, active: showGuide, toggle: onToggleGuide, color: "text-amber-500", label: t("guide") },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={item.toggle}
                  className={`p-2.5 rounded-xl transition-all flex items-center gap-2 group ${item.active ? "bg-white dark:bg-zinc-800 shadow-sm" : "hover:bg-white/50 dark:hover:bg-zinc-800/50 opacity-60 hover:opacity-100"}`}
                  title={item.label}
                >
                  <item.icon size={16} className={item.active ? item.color : "text-zinc-500 group-hover:scale-110 transition-transform"} />
                  {item.active && <span className="text-[10px] font-black uppercase tracking-widest lg:block hidden">{item.label}</span>}
                </button>
              ))}
            </div>
            
          </div>
        </div>
      </section>
    </div>
  );
}

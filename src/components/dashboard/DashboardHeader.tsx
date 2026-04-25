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
  User
} from "lucide-react";
import { Link } from "@/navigation";
import { toast } from "sonner";
import { StreamCarousel } from "@/components/StreamCarousel";

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
  onToggleAnalytics,
  onToggleSettings,
  onToggleGuide,
  onToggleWallet,
  showAnalytics,
  showSettings,
  showGuide
}: DashboardHeaderProps) {
  
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`, {
      description: "Ready to paste in OBS or Chat",
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
                {isStreamPaused ? "Stream Paused" : "Live Stream"}
              </span>
              <span className="text-zinc-400 font-mono text-[10px] tabular-nums">{formatTime(sessionTime)}</span>
              <span className="text-zinc-500 font-mono text-xs opacity-30">#{session.slug}</span>
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
              onClick={togglePause} 
              className={`group px-6 py-3 glass border ${isStreamPaused ? "border-green-500/50 text-green-500" : "border-amber-500/50 text-amber-500"} text-xs font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2`}
            >
              {isStreamPaused ? <Play size={14} /> : <Pause size={14} />}
              {isStreamPaused ? "Resume Stream" : "Pause Stream"}
            </button>
            <button 
              onClick={() => endSession(session.id)} 
              className="px-6 py-3 glass border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-red-500/10 transition-all active:scale-95"
            >
              End Session
            </button>
          </div>
        </div>

        <StreamCarousel tracks={tracks} playingTrackId={playingTrackId} accentColor={accentColor} />
      </section>

      {/* STREAMER TOOLKIT (5.1) */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-6 glass p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-lg bg-zinc-50/50 dark:bg-zinc-950/50">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Streamer Toolkit</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => copyToClipboard(`${window.location.origin}/${locale}/stream/${session.slug}`, "Submission Link")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-purple-500 transition-all group"
                >
                  <Send size={14} className="text-zinc-500 group-hover:text-purple-600" />
                  <span className="text-xs font-bold">Submit Page</span>
                  <Copy size={10} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                </button>
                
                <button 
                  onClick={() => {
                    const url = `${window.location.origin}/${locale}/overlay/${session.slug}${session.overlayToken ? `?token=${session.overlayToken}` : ""}`;
                    copyToClipboard(url, "OBS Overlay");
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 transition-all group"
                >
                  <Monitor size={14} className="text-zinc-500 group-hover:text-blue-600" />
                  <span className="text-xs font-bold">OBS Source</span>
                  <Copy size={10} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                </button>

                <Link 
                  href="/dashboard/hall-of-fame"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all group"
                >
                  <Trophy size={14} className="text-purple-600" />
                  <span className="text-xs font-bold text-purple-700">Records</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const text = `Join my stream and drop your tracks at: ${window.location.origin}/${locale}/stream/${session.slug} 🎵 #DropQueue`;
                copyToClipboard(text, "Invite message");
              }}
              className="px-6 py-2.5 rounded-xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-purple-500/20 hover:scale-[1.03] active:scale-95 transition-all"
            >
              <Share2 size={14} />
              Share Stream
            </button>
            
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

            <div className="flex items-center gap-2">
              {[
                { icon: Wallet, active: false, toggle: onToggleWallet, color: "text-purple-500" },
                { icon: BarChart2, active: showAnalytics, toggle: onToggleAnalytics, color: "text-blue-500" },
                { icon: SettingsIcon, active: showSettings, toggle: onToggleSettings, color: "text-zinc-500" },
                { icon: HelpCircle, active: showGuide, toggle: onToggleGuide, color: "text-amber-500" }
              ].map((tool, idx) => (
                <button 
                  key={idx}
                  onClick={tool.toggle}
                  className={`p-2.5 rounded-xl border transition-all ${tool.active ? "bg-zinc-900 text-white border-zinc-800" : "glass border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"}`}
                >
                  <tool.icon size={18} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

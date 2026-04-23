"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/navigation";
import { History, Trophy, Music, Calendar, ChevronRight, Palette, Layout, User as UserIcon, Hash, Search, AlertTriangle, Database, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { OverlayPreview } from "./OverlayPreview";
import { updateAccentColor } from "@/app/actions/update-theme";
import { updateOverlaySettings } from "@/app/actions/session-actions";
import { TwitterPicker } from "react-color";
import { isValidIdentifier, safePath } from "@/lib/url-utils";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { cleanupOrphanedFiles } from "@/app/actions/maintenance-actions";
import { updateSessionSettings } from "@/app/actions/update-session-settings";
import { toast } from "sonner";

interface Track {
  id: string;
  title: string;
  rank: number;
  averageScore: number;
  submitterName: string;
}

interface Session {
  id: string;
  slug: string;
  title: string;
  status: string;
  createdAt: Date;
  _count: { tracks: number };
  topTracks: Track[];
  settings: Record<string, boolean>;
  overlayTheme: string;
  showBpmOnOverlay: boolean;
  showKeyOnOverlay: boolean;
}

interface Streamer {
  accentColor: string;
}

interface DashboardExplorerProps {
  sessions: Session[];
  streamer: Streamer;
}

function EmptyState({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="text-center space-y-4">
      <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto text-zinc-400">
        <Icon size={32} />
      </div>
      <div>
        <h3 className="text-xl font-black">{title}</h3>
        <p className="text-sm text-zinc-500 max-w-xs mx-auto">{description}</p>
      </div>
    </div>
  );
}

export function DashboardExplorer({ sessions, streamer }: DashboardExplorerProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"history" | "hof" | "design">(
    searchParams.get("tab") === "hof" ? "hof" : 
    searchParams.get("tab") === "design" ? "design" : "history"
  );
  const [searchQuery, setSearchQuery] = useState("");

  const activeSession = sessions.find(s => s.status === "ACTIVE");
  
  // Design State
  const [accentColor, setAccentColor] = useState(streamer.accentColor);
  const [overlaySettings, setOverlaySettings] = useState(activeSession?.settings || {
    showUpNext: true,
    showSubmitter: true,
    showTrackNumber: true
  });
  const [isCleaning, setIsCleaning] = useState(false);
  const [showBpm, setShowBpm] = useState(activeSession?.showBpmOnOverlay ?? true);
  const [showKey, setShowKey] = useState(activeSession?.showKeyOnOverlay ?? true);

  const sessionsWithTops = sessions.filter(s => s.topTracks?.length > 0);

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateSettings = async (newSettings: Record<string, boolean>) => {
    if (!activeSession) return;
    setOverlaySettings(newSettings);
    await updateOverlaySettings(activeSession.slug, newSettings);
  };

  const handleUpdateColor = async (color: string) => {
    setAccentColor(color);
    await updateAccentColor(color);
  };


  return (
    <div className="space-y-12">
      {/* Tab Switcher */}
      <div className="flex items-center gap-4 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-3xl w-fit">
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-3 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === "history" 
              ? "bg-white dark:bg-zinc-800 shadow-xl text-purple-600 scale-105" 
              : "text-zinc-500 opacity-50 hover:opacity-100"
          }`}
        >
          <History size={14} />
          Recent Activity
        </button>
        <button
          onClick={() => setActiveTab("hof")}
          className={`flex items-center gap-3 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === "hof" 
              ? "bg-white dark:bg-zinc-800 shadow-xl text-purple-600 scale-105" 
              : "text-zinc-500 opacity-50 hover:opacity-100"
          }`}
        >
          <Trophy size={14} />
          Hall of Fame
        </button>
        {activeSession && (
          <button
            onClick={() => setActiveTab("design")}
            className={`flex items-center gap-3 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "design" 
                ? "bg-white dark:bg-zinc-800 shadow-xl text-purple-600 scale-105" 
                : "text-zinc-500 opacity-50 hover:opacity-100"
            }`}
          >
            <Palette size={14} />
            Overlay Design
          </button>
        )}
      </div>

      <ErrorBoundary>
        <AnimatePresence mode="wait">
        {activeTab === "history" ? (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-10"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-100 dark:border-zinc-900 pb-6 gap-6">
               <div className="space-y-1">
                 <h2 className="text-3xl font-black uppercase tracking-tighter">Session History</h2>
                 <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{sessions.length} Total Recordings</span>
               </div>
               
               <div className="relative w-full md:w-80">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                 <input 
                   type="text"
                   placeholder="Search sessions..."
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                 />
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredSessions.map((s) => (
                <Link 
                  key={s.id} 
                  href={isValidIdentifier(s.slug) ? `/dashboard/${s.slug}` : "/dashboard"} 
                  className={`group glass p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 transition-all ${s.status === "ACTIVE" ? "ring-2 ring-purple-500/20" : "opacity-60 hover:opacity-100 shadow-sm hover:shadow-xl"}`}
                >
                  <div className="flex justify-between items-start mb-8">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${s.status === "ACTIVE" ? "bg-green-500/10 text-green-500" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400"}`}>
                      {s.status}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-2xl font-black mb-4 truncate uppercase group-hover:text-purple-600 transition-colors">{s.title}</h3>
                  <div className="flex items-center justify-between pt-6 border-t border-zinc-100 dark:border-zinc-900">
                    <div className="flex items-center gap-3">
                       <div className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{s._count.tracks} Tracks</span>
                    </div>
                    <ChevronRight size={14} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
            {sessions.length === 0 && (
              <div className="py-12 flex justify-center">
                <EmptyState 
                  icon={History}
                  title="Silence in the logs"
                  description="Your recent recording history is empty. Start a new session to begin your journey."
                />
              </div>
            )}
          </motion.div>
        ) : activeTab === "hof" ? (
          <motion.div
            key="hof"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-16"
          >
            <div className="flex items-end justify-between border-b border-zinc-100 dark:border-zinc-900 pb-6">
               <h2 className="text-3xl font-black uppercase tracking-tighter">Your Hall of Fame</h2>
               <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Archived Top Rated</span>
            </div>

            {sessionsWithTops.length > 0 ? (
              <div className="space-y-20">
                {sessionsWithTops.map((s) => (
                  <div key={s.id} className="space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                         <Calendar size={18} />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-xl font-black tracking-tight">{s.title}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          {new Date(s.createdAt).toLocaleDateString()} &bull; Session #{s.slug}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {s.topTracks.map((track) => (
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
                              <h4 className="text-lg font-bold truncate pr-8">{track.title}</h4>
                              <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">
                                {track.submitterName}
                              </p>
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
                ))}
              </div>
            ) : (
              <div className="py-12 flex justify-center">
                <EmptyState 
                  icon={Trophy}
                  title="Empty Trophy Case"
                  description="Complete your first session with high-rated tracks to immortalize them in the Hall of Fame."
                />
              </div>
            )}
          </motion.div>
        ) : activeTab === "design" && activeSession ? (
          <motion.div
            key="design"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12"
          >
            <div className="space-y-12">
               <div className="space-y-6">
                  <div className="flex items-center gap-3 text-purple-600">
                    <Palette size={20} />
                    <h3 className="text-xl font-black uppercase tracking-tight">Visual Identity</h3>
                  </div>
                  <div className="glass p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-4">Brand Accent Color</label>
                      <div className="flex items-center gap-6">
                        <div className="h-12 w-12 rounded-2xl shadow-xl border-4 border-white dark:border-zinc-800" style={{ backgroundColor: accentColor }} />
                        <TwitterPicker 
                          color={accentColor}
                          onChangeComplete={(c) => handleUpdateColor(c.hex)}
                          triangle="hide"
                          styles={{ default: { card: { background: 'transparent', border: 'none', boxShadow: 'none' } } }}
                        />
                      </div>
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="flex items-center gap-3 text-purple-600">
                    <Layout size={20} />
                    <h3 className="text-xl font-black uppercase tracking-tight">Overlay Elements</h3>
                  </div>
                  <div className="glass p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: "showUpNext", label: "Show Up Next", icon: ChevronRight },
                      { key: "showSubmitter", label: "Show Submitter", icon: UserIcon },
                      { key: "showTrackNumber", label: "Track Counter", icon: Hash },
                    ].map((toggle) => (
                      <button
                        key={toggle.key}
                        onClick={() => handleUpdateSettings({ ...overlaySettings, [toggle.key]: !overlaySettings[toggle.key] })}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          overlaySettings[toggle.key] 
                            ? "bg-purple-500/10 border-purple-500/20 text-purple-600" 
                            : "bg-zinc-100 dark:bg-zinc-900 border-transparent text-zinc-400"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                           <toggle.icon size={16} />
                           <span className="text-[10px] font-black uppercase tracking-widest">{toggle.label}</span>
                        </div>
                        <div className={`h-2 w-2 rounded-full ${overlaySettings[toggle.key] ? "bg-purple-500" : "bg-zinc-300"}`} />
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            <div className="space-y-6">
               <div className="flex items-center gap-3 text-zinc-400">
                  <Music size={20} />
                  <h3 className="text-xl font-black uppercase tracking-tight">Live Context Preview</h3>
               </div>
               <OverlayPreview 
                 theme={activeSession.overlayTheme} 
                 accentColor={accentColor} 
                 settings={overlaySettings} 
               />
               <p className="text-[10px] text-center text-zinc-400 font-medium leading-relaxed px-12">
                 Changes saved automatically. Your OBS overlay will update in real-time as you toggle preferences here.
               </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
     </ErrorBoundary>
    </div>
  );
}

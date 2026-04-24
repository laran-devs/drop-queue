"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/navigation";
import { History, Trophy, Music, Calendar, ChevronRight, Layout, User as UserIcon, Hash, Search, AlertTriangle, Database, Trash2, CheckCircle2, Loader2, Palette } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );



  return (
    <div className="space-y-12">
      <ErrorBoundary>
          <div className="space-y-10">
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
          </div>
      </ErrorBoundary>
    </div>
  );
}


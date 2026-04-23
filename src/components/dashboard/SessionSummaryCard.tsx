"use client";

import { motion } from "framer-motion";
import { Trophy, Download, Share2, Music } from "lucide-react";
import { Track } from "@prisma/client";

interface SessionSummaryCardProps {
  session: { title: string; slug: string };
  topTracks: any[];
  accentColor: string;
}

export function SessionSummaryCard({ session, topTracks, accentColor }: SessionSummaryCardProps) {
  if (topTracks.length === 0) return null;

  return (
    <div className="glass p-10 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl relative overflow-hidden bg-white/5 group">
      <div className="absolute -top-40 -left-40 h-80 w-80 blur-[120px] rounded-full opacity-20" style={{ backgroundColor: accentColor }} />
      
      <div className="relative z-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 italic font-black text-xl">DQ</div>
             <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Stream Recap</h3>
                <p className="text-xl font-black">{session.title}</p>
             </div>
          </div>
          <button className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-purple-600 transition-all active:scale-90">
             <Download size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {topTracks.map((track, idx) => (
            <motion.div 
              key={track.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center gap-4 p-5 rounded-[2rem] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800"
            >
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black ${idx === 0 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
                {idx === 0 ? <Trophy size={20} /> : `#${idx + 1}`}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black truncate uppercase tracking-tight text-sm">{track.title}</h4>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sent by {track.submitter?.name || "Anonymous"}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black tabular-nums" style={{ color: idx === 0 ? accentColor : undefined }}>
                  {(track.evaluations?.reduce((a: any, b: any) => a + b.score, 0) / track.evaluations?.length || 0).toFixed(1)}
                </div>
                <div className="text-[8px] font-black uppercase tracking-widest text-zinc-400 opacity-50">Avg Score</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
           <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-1 w-6 rounded-full bg-zinc-200 dark:bg-zinc-800" style={{ backgroundColor: i <= 3 ? accentColor : undefined }} />)}
           </div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">dropqueue.app/{session.slug}</p>
        </div>
      </div>
    </div>
  );
}

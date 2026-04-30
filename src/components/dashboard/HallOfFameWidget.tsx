"use client";

import { useEffect, useState } from "react";
import { getHallOfFameData } from "@/app/actions/hall-of-fame-actions";
import { Trophy, Users, Music, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function HallOfFameWidget() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHallOfFameData().then(res => {
      if (res.success) {
        setData(res);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="w-full h-32 glass rounded-[2rem] border border-zinc-200 dark:border-zinc-800 animate-pulse flex items-center justify-center">
      <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
    </div>
  );

  if (!data || (data.sessions.length === 0 && data.topSubmitters.length === 0)) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6"
    >
      <div className="flex items-center gap-3 px-2">
        <Trophy size={16} className="text-amber-500" />
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Hall of Fame</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Submitters */}
        <div className="glass p-6 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 bg-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-purple-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Top Submitters</span>
            </div>
          </div>
          <div className="space-y-3">
            {data.topSubmitters.map((s: any, i: number) => (
              <div key={s.name} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black w-4 ${i === 0 ? "text-amber-500" : "text-zinc-400"}`}>#{i + 1}</span>
                  <span className="text-sm font-bold group-hover:text-purple-500 transition-colors">{s.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{s.count} HITS</span>
                  <span className="text-xs font-black text-purple-600">{s.avg.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Bangers */}
        <div className="glass p-6 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 bg-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3">
            <div className="flex items-center gap-2">
              <Star size={14} className="text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Recent Bangers</span>
            </div>
          </div>
          <div className="space-y-3">
            {data.sessions[0]?.topTracks.slice(0, 3).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <Music size={12} className="text-zinc-400 shrink-0" />
                  <span className="text-sm font-bold truncate group-hover:text-purple-500 transition-colors">{t.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t.submitterName}</span>
                  <span className="text-xs font-black text-amber-500">{t.averageScore.toFixed(1)}</span>
                </div>
              </div>
            ))}
            {data.sessions.length === 0 && (
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center py-4">No records yet</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

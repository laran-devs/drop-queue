"use client";

import { motion } from "framer-motion";
import { Music, Timer, Activity, TrendingUp } from "lucide-react";

interface StreamerStatsProps {
  totalTracks: number;
  totalSessions: number;
  avgScore: number;
  acceptanceRate: number;
}

export function StreamerStats({ totalTracks, totalSessions, avgScore, acceptanceRate }: StreamerStatsProps) {
  const stats = [
    {
      label: "Total Tracks",
      value: totalTracks,
      icon: Music,
      color: "text-purple-600",
      bg: "bg-purple-500/10",
      trend: `${totalSessions} Sessions`,
    },
    {
      label: "Avg. Score",
      value: avgScore.toFixed(1),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-500/10",
      trend: "/ 10.0 scale",
    },
    {
      label: "Acceptance",
      value: `${Math.round(acceptanceRate)}%`,
      icon: Activity,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
      trend: "Evaluated vs Skipped",
    },
    {
      label: "Efficiency",
      value: totalTracks > 0 ? (totalTracks / totalSessions).toFixed(1) : "0",
      icon: Timer,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
      trend: "Tracks per session",
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="glass p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-xl hover:shadow-2xl transition-all group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 group-hover:-rotate-3`}>
              <stat.icon size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
              Live Data
            </span>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500">{stat.label}</p>
            <h3 className="text-4xl font-black tracking-tighter">{stat.value}</h3>
          </div>
          
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] font-bold text-zinc-400">{stat.trend}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

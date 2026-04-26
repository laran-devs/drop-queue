"use client";

import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { TrendingUp, Users, Music, Star, DollarSign } from "lucide-react";

interface AnalyticsDashboardProps {
  tracks: any[];
  evaluations: Record<string, number>;
  donations?: any[];
  accentColor: string;
}

export function AnalyticsDashboard({ tracks, evaluations, donations = [], accentColor, isPrivacyMode }: AnalyticsDashboardProps & { isPrivacyMode?: boolean }) {
  // 1. Prepare data for "Tracks vs Scores" chart
  const evaluatedTracks = tracks.filter(t => t.status === "EVALUATED");
  const chartData = evaluatedTracks.map((t, i) => ({
    name: t.title.substring(0, 10),
    score: evaluations[t.id] || 0,
    index: i + 1
  }));

  // 2. Score Distribution
  const dist = [0,0,0,0,0,0,0,0,0,0];
  evaluatedTracks.forEach(t => {
    const s = Math.floor(evaluations[t.id] || 0);
    if (s >= 0 && s < 10) dist[s]++;
    else if (s === 10) dist[9]++;
  });
  const distData = dist.map((count, i) => ({ range: `${i}`, count }));

  // 3. Totals
  const avgScore = evaluatedTracks.length > 0 
    ? evaluatedTracks.reduce((acc, t) => acc + (evaluations[t.id] || 0), 0) / evaluatedTracks.length 
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { icon: <Music size={14} />, label: "Total Tracks", value: tracks.length },
          { icon: <Users size={14} />, label: "Evaluated", value: evaluatedTracks.length },
          { icon: <Star size={14} />, label: "Avg. Score", value: avgScore.toFixed(1) },
          { icon: <DollarSign size={14} />, label: "Donations", value: `$${donations.reduce((acc, d) => acc + d.amount, 0)}` },
        ].map((stat, i) => (
          <div key={i} className="glass p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/5">
             <div className="flex items-center gap-2 text-zinc-500 mb-2">
                {stat.icon}
                <span className="text-[10px] font-black uppercase tracking-widest">{stat.label}</span>
             </div>
             <div className={`text-2xl font-black transition-all ${isPrivacyMode ? "blur-md select-none" : ""}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 transition-all ${isPrivacyMode ? "opacity-20 blur-xl pointer-events-none grayscale" : ""}`}>
        {/* Progress Chart */}
        <div className="glass p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 bg-white/5 space-y-6">
          <div className="flex items-center justify-between">
             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-2">
               <TrendingUp size={12} />
               Session Momentum
             </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                <XAxis dataKey="index" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} domain={[0, 10]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#18181b", border: "none", borderRadius: "12px", fontSize: "10px" }} 
                  itemStyle={{ color: accentColor }}
                />
                <Area type="monotone" dataKey="score" stroke={accentColor} fillOpacity={1} fill="url(#colorScore)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="glass p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 bg-white/5 space-y-6">
          <div className="flex items-center justify-between">
             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-2">
               <Star size={12} />
               Score Distribution
             </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                <XAxis dataKey="range" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#88888810' }}
                  contentStyle={{ backgroundColor: "#18181b", border: "none", borderRadius: "12px", fontSize: "10px" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={accentColor} fillOpacity={0.4 + (index/15)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

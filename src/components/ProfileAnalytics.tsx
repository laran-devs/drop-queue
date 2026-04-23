"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie
} from "recharts";
import { Music, Trophy, Star, Activity } from "lucide-react";

import { EmptyState } from "./ui/EmptyState";

interface ProfileStat {
  title: string;
  score: number;
  date: string;
  streamer: string;
}

interface ProfileAnalyticsProps {
  data: ProfileStat[];
  platformData: { name: string; value: number }[];
  bangerRate: number;
  accentColor: string;
}

export function ProfileAnalytics({ data, platformData, bangerRate, accentColor }: ProfileAnalyticsProps) {
  if (data.length === 0) {
    return (
      <div className="py-12 flex justify-center">
        <EmptyState 
          icon={<Activity size={40} strokeWidth={1.5} />}
          title="No analytics yet"
          description="Submit your first track to start tracking your performance and evolution."
        />
      </div>
    );
  }

  // 1. Score Momentum
  const trends = data.slice().reverse().map((d, i) => ({
    index: i + 1,
    score: d.score,
    name: d.title,
    date: d.date,
    streamer: d.streamer
  }));

  // 2. Score Volatility (Distribution)
  const distribution = Array.from({ length: 10 }, (_, i) => ({
    range: `${i + 1}`,
    count: data.filter((d) => Math.round(d.score) === i + 1).length,
  }));

  return (
    <div className="space-y-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-600 shadow-inner">
            <Trophy size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Banger Rate</p>
            <p className="text-3xl font-black">{bangerRate.toFixed(0)}%</p>
          </div>
        </div>
        
        <div className="glass p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
            <Activity size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Consistency</p>
            <p className="text-3xl font-black">Stable</p>
          </div>
        </div>

        <div className="glass p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
            <Star size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Active Since</p>
            <p className="text-xl font-black">{data[data.length-1]?.date}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Growth Curve */}
        <div className="glass p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
             <Activity size={120} />
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            Skill Evolution
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="index" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                />
                <YAxis 
                  domain={[0, 10]}
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "rgba(0,0,0,0.85)", 
                    border: "none", 
                    borderRadius: "16px",
                    fontSize: "12px",
                    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)"
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke={accentColor} 
                  strokeWidth={4} 
                  dot={{ fill: accentColor, r: 5, stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 8, stroke: "#fff", strokeWidth: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform DNA */}
        <div className="glass p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
            <Music size={16} />
            Platform Preference
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontStyle: "italic", fill: "rgba(255,255,255,0.6)" }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ 
                    backgroundColor: "rgba(0,0,0,0.85)", 
                    border: "none", 
                    borderRadius: "16px",
                    fontSize: "12px"
                  }} 
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                  {platformData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={accentColor} fillOpacity={0.6 + (index / platformData.length) * 0.4} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

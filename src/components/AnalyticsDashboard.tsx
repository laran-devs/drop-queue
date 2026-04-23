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
} from "recharts";

interface AnalyticsData {
  title: string;
  score: number;
  submitter: string;
}

interface AnalyticsDashboardProps {
  data: AnalyticsData[];
  accentColor: string;
}

export function AnalyticsDashboard({ data, accentColor }: AnalyticsDashboardProps) {
  if (data.length === 0) return null;

  // 1. Prepare score distribution data
  const distribution = Array.from({ length: 10 }, (_, i) => ({
    range: `${i + 1}`,
    count: data.filter((d) => Math.round(d.score) === i + 1).length,
  }));

  // 2. Prepare trend data (ordered by index as a proxy for time)
  const trends = data.map((d, i) => ({
    index: i + 1,
    score: d.score,
    name: d.title,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-12">
      {/* Score Distribution */}
      <div className="glass p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800">
        <h3 className="text-sm font-black uppercase tracking-widest mb-6 text-zinc-400">Score Distribution</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="range" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "rgba(0,0,0,0.8)", 
                  border: "none", 
                  borderRadius: "12px",
                  fontSize: "12px"
                }} 
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={accentColor} fillOpacity={0.4 + (index / 10) * 0.6} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Session Progress / Trends */}
      <div className="glass p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800">
        <h3 className="text-sm font-black uppercase tracking-widest mb-6 text-zinc-400">Session Momentum</h3>
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
                  backgroundColor: "rgba(0,0,0,0.8)", 
                  border: "none", 
                  borderRadius: "12px",
                  fontSize: "12px"
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke={accentColor} 
                strokeWidth={3} 
                dot={{ fill: accentColor, r: 4 }}
                activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

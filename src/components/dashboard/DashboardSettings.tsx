"use client";

import { motion } from "framer-motion";
import { PLATFORMS } from "@/lib/validations";
import { ToggleLeft, ToggleRight, Radio, Shield, Palette, LayoutGrid, Clock, AlertTriangle, TrendingUp, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

interface DashboardSettingsProps {
  initialSession: any;
  accentColor: string;
  onColorChange: (color: string) => void;
  enableNormalization: boolean;
  onNormalizationChange: (val: boolean) => void;
  allowedPlatforms: string[];
  onPlatformsChange: (val: string[]) => void;
  trackLimit: number | null;
  onTrackLimitChange: (val: number | null) => void;
  autoAdvance: boolean;
  onAutoAdvanceChange: (val: boolean) => void;
  onSimulateDonation?: () => void;
  daSecret?: string;
  onDASecretChange?: (val: string) => void;
  onSaveDASecret?: () => void;
}

const COLOR_PRESETS = [
  { name: "Twitch Purple", value: "#9146ff" },
  { name: "Toxic Green", value: "#00ff88" },
  { name: "Wild East Orange", value: "#ff8800" },
  { name: "Cyber Blue", value: "#0088ff" },
  { name: "Lava Red", value: "#ff4444" },
];

export function DashboardSettings({
  initialSession,
  accentColor,
  onColorChange,
  enableNormalization,
  onNormalizationChange,
  allowedPlatforms,
  onPlatformsChange,
  trackLimit,
  onTrackLimitChange,
  autoAdvance,
  onAutoAdvanceChange,
  onSimulateDonation,
  daSecret,
  onDASecretChange,
  onSaveDASecret
}: DashboardSettingsProps) {

  return (
    <div className="glass p-10 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 bg-white/5 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Management & Logic (3.1, 3.2) */}
        <div className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-2">
            <Shield size={12} />
            Session Management
          </h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-purple-500/50 transition-all">
              <div className="space-y-0.5">
                 <span className="text-xs font-bold">Auto-Advance</span>
                 <p className="text-[10px] text-zinc-500 font-medium">Next track starts as soon as you rate.</p>
              </div>
              <button 
                onClick={() => onAutoAdvanceChange(!autoAdvance)}
                className="text-purple-600"
              >
                {autoAdvance ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-zinc-500" />}
              </button>
            </label>

            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold">Line in the Sand</span>
                  <p className="text-[10px] text-zinc-500 font-medium">Limit guaranteed evaluations.</p>
                </div>
                <div className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-300 dark:border-zinc-800">
                   <button 
                     onClick={() => onTrackLimitChange(Math.max(0, (trackLimit || 0) - 1))}
                     className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-900 transition-all text-zinc-500"
                   >
                     <Minus size={12} />
                   </button>
                   {/* Decoy field to trap browser password manager */}
                   <input type="password" style={{ display: 'none' }} tabIndex={-1} autoComplete="new-password" />
                   <input 
                     type="tel"
                     name="session_limit_phone_style"
                     id="session_limit_phone_style"
                     autoComplete="off"
                     value={(trackLimit ?? "").toString()}
                     placeholder="∞"
                     onChange={(e) => {
                       const val = e.target.value.replace(/[^0-9]/g, "");
                       onTrackLimitChange(val === "" ? null : parseInt(val));
                     }}
                     className="w-24 bg-transparent border-none text-xs font-black text-center outline-none pr-2"
                   />
                   <button 
                     onClick={() => onTrackLimitChange((trackLimit || 0) + 1)}
                     className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-900 transition-all text-zinc-500"
                   >
                     <Plus size={12} />
                   </button>
                </div>
              </div>
              {trackLimit && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-600">
                  <AlertTriangle size={12} />
                  Tracks after #{trackLimit} will show backlog warning.
                </div>
              )}
            </div>

            {/* DonationAlerts Placeholder (4.1) */}
            <div className="p-5 rounded-2xl bg-orange-500/5 border border-orange-500/20 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white">
                  <TrendingUp size={14} />
                </div>
                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-widest">DonationAlerts</h4>
                   <p className="text-[8px] font-bold text-zinc-500">Enable priority bumping via donations.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input 
                  type="password"
                  placeholder="Your Secret DA Token..."
                  value={daSecret || ""}
                  onChange={(e) => onDASecretChange?.(e.target.value)}
                  className="flex-1 glass px-4 py-2 rounded-xl text-[10px] outline-none border border-transparent focus:border-orange-500/50"
                  autoComplete="new-password"
                />
                <button 
                  onClick={onSaveDASecret}
                  className="px-3 py-2 rounded-xl bg-purple-600 text-white text-[8px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                >
                  Save
                </button>
              </div>
              <button 
                onClick={onSimulateDonation}
                className="w-full py-2 rounded-xl bg-orange-500/10 text-orange-600 text-[8px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all"
              >
                Simulate Test Donation
              </button>
            </div>
          </div>
        </div>

        {/* Audio Processing */}
        <div className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-2">
            <Radio size={12} />
            Audio Processing
          </h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800 opacity-50 cursor-not-allowed">
              <div className="space-y-0.5">
                 <span className="text-xs font-bold flex items-center gap-2">
                    Loudness Normalization
                    <span className="px-1.5 py-0.5 rounded-md bg-purple-600/20 text-purple-400 text-[8px] font-black uppercase">Coming Soon</span>
                 </span>
                 <p className="text-[10px] text-zinc-500 font-medium">Equalize volume across different tracks.</p>
              </div>
              <input 
                type="checkbox" 
                checked={false} 
                className="h-5 w-5 rounded border-zinc-300 text-purple-600 focus:ring-purple-600 accent-purple-600"
                disabled
              />
            </label>
          </div>
        </div>

        {/* Platforms Settings */}
        <div className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-2">
            <LayoutGrid size={12} />
            Allowed Platforms
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map((platform) => (
              <label key={platform.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-purple-500/50 transition-all">
                <input 
                  type="checkbox" 
                  checked={allowedPlatforms.includes(platform.id)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const newPlatforms = checked 
                      ? [...allowedPlatforms, platform.id]
                      : allowedPlatforms.filter(p => p !== platform.id);
                    onPlatformsChange(newPlatforms);
                  }}
                  className="h-4 w-4 rounded border-zinc-300 text-purple-600 accent-purple-600"
                />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{platform.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Aesthetics (Real-time update) */}
        <div className="lg:col-span-3 pt-8 border-t border-zinc-100 dark:border-zinc-900 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-2">
              <Palette size={12} />
              Overlay Theme & Brand
            </h3>
            <p className="text-[10px] font-bold text-zinc-400">Updates live across all active stream overlays.</p>
          </div>
          <div className="flex p-1.5 glass bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color.value}
                onClick={() => onColorChange(color.value)}
                className={`h-10 w-10 rounded-xl transition-all ${accentColor === color.value ? "scale-110 shadow-lg ring-2 ring-white/50" : "scale-90 opacity-40 hover:opacity-100"}`}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

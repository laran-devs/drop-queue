"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PLATFORMS } from "@/lib/validations";
import { 
  ToggleLeft, 
  ToggleRight, 
  Radio, 
  Shield, 
  Palette, 
  LayoutGrid, 
  AlertTriangle, 
  TrendingUp, 
  Plus, 
  Minus,
  Activity,
  ChevronRight,
  User as UserIcon,
  Hash,
  Music,
  Layout,
  CreditCard
} from "lucide-react";
import { TwitterPicker } from "react-color";
import { OverlayPreview } from "../OverlayPreview";

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
  subOnly: boolean;
  onSubOnlyChange: (val: boolean) => void;
  showBpm: boolean;
  onShowBpmChange: (val: boolean) => void;
  showKey: boolean;
  onShowKeyChange: (val: boolean) => void;
  overlayTheme: string;
  onOverlayThemeChange: (val: string) => void;
  overlaySettings: Record<string, boolean>;
  onOverlaySettingsChange: (val: Record<string, boolean>) => void;
}

const COLOR_PRESETS = [
  { name: "Twitch Purple", value: "#9146ff" },
  { name: "Toxic Green", value: "#00ff88" },
  { name: "Wild East Orange", value: "#ff8800" },
  { name: "Cyber Blue", value: "#0088ff" },
  { name: "Lava Red", value: "#ff4444" },
];

const TABS = [
  { id: "logic", label: "Queue Logic", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "platforms", label: "Platforms", icon: LayoutGrid },
];

export function DashboardSettings({
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
  onSaveDASecret,
  subOnly,
  onSubOnlyChange,
  showBpm,
  onShowBpmChange,
  showKey,
  onShowKeyChange,
  overlayTheme,
  onOverlayThemeChange,
  overlaySettings,
  onOverlaySettingsChange
}: DashboardSettingsProps) {
  const [activeTab, setActiveTab] = useState("logic");

  return (
    <div className="glass p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 bg-white/5 space-y-10">
      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-950/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white" 
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, x: 10 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -10 }}
           transition={{ duration: 0.2 }}
           className="min-h-[300px]"
        >
          {activeTab === "logic" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex items-center justify-between p-5 rounded-3xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-purple-500/50 transition-all">
                <div className="space-y-0.5">
                   <span className="text-xs font-bold">Auto-Advance</span>
                   <p className="text-[10px] text-zinc-500 font-medium">Rating a track moves queue forward.</p>
                </div>
                <button 
                  onClick={() => onAutoAdvanceChange(!autoAdvance)}
                  className="text-purple-600"
                >
                  {autoAdvance ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-zinc-500" />}
                </button>
              </label>

              <label className="flex items-center justify-between p-5 rounded-3xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-purple-500/50 transition-all">
                <div className="space-y-0.5">
                   <span className="text-xs font-bold">Sub-Only Mode</span>
                   <p className="text-[10px] text-zinc-500 font-medium">Submission restricted to subscribers.</p>
                </div>
                <button 
                  onClick={() => onSubOnlyChange(!subOnly)}
                  className="text-purple-600"
                >
                  {subOnly ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-zinc-500" />}
                </button>
              </label>

              <div className="p-5 rounded-3xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-3 col-span-1 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold">Session Limit (Line in the Sand)</span>
                    <p className="text-[10px] text-zinc-500 font-medium">Guaranteed spots. Tracks after this show a backlog warning.</p>
                  </div>
                  <div className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-300 dark:border-zinc-800">
                    <button 
                      onClick={() => onTrackLimitChange(Math.max(0, (trackLimit || 0) - 1))}
                      className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-900 transition-all text-zinc-500"
                    >
                      <Minus size={14} />
                    </button>
                    <input 
                      type="tel"
                      value={(trackLimit ?? "").toString()}
                      placeholder="∞"
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        onTrackLimitChange(val === "" ? null : parseInt(val));
                      }}
                      className="w-20 bg-transparent border-none text-xs font-black text-center outline-none"
                    />
                    <button 
                      onClick={() => onTrackLimitChange((trackLimit || 0) + 1)}
                      className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-900 transition-all text-zinc-500"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-zinc-100/50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800 opacity-50 relative group">
                <div className="flex items-center justify-between">
                   <div className="space-y-0.5">
                      <span className="text-xs font-bold flex items-center gap-2">
                         Normalization
                         <span className="px-1.5 py-0.5 rounded-md bg-purple-600/20 text-purple-400 text-[8px] font-black uppercase">Coming Soon</span>
                      </span>
                      <p className="text-[10px] text-zinc-500 font-medium">Equalize track volume output.</p>
                   </div>
                </div>
              </div>
            </div>
          )}


          {activeTab === "appearance" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-10">
                <div className="space-y-6">
                   <div className="flex items-center gap-3 text-purple-600">
                     <Palette size={20} />
                     <h3 className="text-xl font-black tracking-tight uppercase">Visual identity</h3>
                   </div>
                   <div className="glass p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-center justify-between p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                           <span className="text-[10px] font-black uppercase">BPM</span>
                           <button onClick={() => onShowBpmChange(!showBpm)} className="text-purple-600">
                             {showBpm ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-zinc-500" />}
                           </button>
                        </label>
                        <label className="flex items-center justify-between p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                           <span className="text-[10px] font-black uppercase">Key</span>
                           <button onClick={() => onShowKeyChange(!showKey)} className="text-purple-600">
                             {showKey ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-zinc-500" />}
                           </button>
                        </label>
                     </div>

                     <div className="space-y-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Accent Color</span>
                        <div className="flex items-center gap-6">
                           <div className="h-12 w-12 rounded-2xl shadow-xl border-4 border-white dark:border-zinc-800" style={{ backgroundColor: accentColor }} />
                           <TwitterPicker 
                             color={accentColor} 
                             onChangeComplete={(c) => onColorChange(c.hex)}
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
                     <h3 className="text-xl font-black uppercase tracking-tight">Overlay elements</h3>
                   </div>
                   <div className="glass p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                     {[
                       { key: "showUpNext", label: "Show Up Next", icon: ChevronRight },
                       { key: "showSubmitter", label: "Show Submitter", icon: UserIcon },
                       { key: "showTrackNumber", label: "Track Counter", icon: Hash },
                     ].map((toggle) => (
                       <button
                         key={toggle.key}
                         onClick={() => onOverlaySettingsChange({ ...overlaySettings, [toggle.key]: !overlaySettings[toggle.key] })}
                         className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                           overlaySettings[toggle.key] 
                             ? "bg-purple-500/10 border-purple-500/20 text-purple-600 font-bold" 
                             : "bg-zinc-100 dark:bg-zinc-900 border-transparent text-zinc-400"
                         }`}
                       >
                         <div className="flex items-center gap-3">
                            <toggle.icon size={16} />
                            <span className="text-[9px] font-black uppercase tracking-widest">{toggle.label}</span>
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
                    <h3 className="text-xl font-black tracking-tight uppercase">Live Preview</h3>
                 </div>
                 <div className="bg-zinc-900 rounded-[3rem] p-4 overflow-hidden border-8 border-zinc-950 shadow-2xl">
                    <OverlayPreview 
                      theme={overlayTheme} 
                      accentColor={accentColor} 
                      settings={{ ...overlaySettings, showBpm, showKey }} 
                    />
                 </div>
                 <p className="text-[10px] text-center text-zinc-400 font-medium px-10">Changes are broadcasted in real-time to your OBS source.</p>
              </div>
            </div>
          )}

          {activeTab === "platforms" && (
            <div className="space-y-6">
              <div className="space-y-1">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-2">
                   <LayoutGrid size={12} />
                   Link Submission Sources
                 </h3>
                 <p className="text-[10px] font-bold text-zinc-400">Choose which platforms fans can submit from.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {PLATFORMS.map((platform) => (
                  <label key={platform.id} className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-purple-500/50 transition-all">
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
                      className="h-5 w-5 rounded border-zinc-300 text-purple-600 accent-purple-600"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{platform.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

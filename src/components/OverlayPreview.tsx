"use client";

import { motion } from "framer-motion";
import { Music, ArrowRight, BarChart3 } from "lucide-react";

export function OverlayPreview({ 
  theme = "DEFAULT", 
  accentColor = "#9146ff",
  settings = {} 
}: { 
  theme?: string;
  accentColor?: string;
  settings?: Record<string, boolean>;
}) {
  const { 
    showUpNext = true, 
    showSubmitter = true, 
    showTrackNumber = true 
  } = settings;

  const isCyber = theme === "CYBERPUNK";
  const isMin = theme === "MINIMALIST";
  const isRetro = theme === "RETRO";

  const widgetClasses = isMin
    ? "bg-black/40 backdrop-blur-md px-4 py-3 rounded-none border-l-4 w-full"
    : isRetro
      ? "bg-[#c0c0c0] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-zinc-500 shadow-[2px_2px_0_0_black] p-1 w-full"
      : isCyber
        ? "bg-black/90 border-2 shadow-[0_0_30px_rgba(0,255,255,0.2)] p-1 rounded-none w-full italic relative overflow-hidden"
        : "bg-[#0a0a0a]/70 backdrop-blur-[24px] saturate-[180%] p-1 rounded-[2.5rem] border border-white/10 shadow-2xl w-full h-[110px]";

  const innerClasses = isMin
    ? "flex items-center gap-4"
    : isRetro
      ? "flex flex-col border border-zinc-400"
      : isCyber
        ? "px-8 py-6 border-4 border-double flex items-center gap-8 overflow-hidden relative"
        : "h-full px-8 py-6 rounded-[2.3rem] border border-white/5 flex items-center gap-8 overflow-hidden";

  return (
    <div className="w-full bg-zinc-900/50 rounded-[2.5rem] p-12 flex items-center justify-center relative overflow-hidden border border-white/5 min-h-[300px]">
      <div className="absolute top-4 left-6 text-[10px] font-black uppercase tracking-widest text-white/20">Live Preview</div>
      
      <div className="w-full max-w-lg relative group">
        {/* DUMMY SCORE POPUP */}
        <motion.div
           className={`absolute -top-20 left-0 flex items-center gap-4 ${
            isMin ? "bg-black/60 p-4 rounded-none border-l-4" : 
            isCyber ? "bg-black p-6 border-4 border-dashed text-pink-500 shadow-[0_0_30px_rgba(255,0,255,0.5)]" : 
            "bg-[#0a0a0a]/70 backdrop-blur-[24px] saturate-[180%] px-8 py-5 rounded-3xl border border-white/20"
          }`}
          style={{ 
            borderLeftWidth: !isCyber && !isRetro ? "4px" : undefined,
            borderLeftStyle: !isCyber && !isRetro ? "solid" : undefined,
            borderLeftColor: isCyber ? "#ff00ff" : isRetro ? undefined : accentColor,
            borderColor: isCyber ? "#ff00ff" : isRetro ? "#c0c0c0" : undefined,
            backgroundColor: isRetro ? "#c0c0c0" : undefined,
            borderTopColor: isRetro ? "white" : isCyber ? "#ff00ff" : undefined,
            borderLeftColor: isRetro ? "white" : isCyber ? "#ff00ff" : accentColor,
            borderRightColor: isRetro ? "#808080" : isCyber ? "#ff00ff" : undefined,
            borderBottomColor: isRetro ? "#808080" : isCyber ? "#ff00ff" : undefined,
            boxShadow: isRetro ? "2px 2px 0 0 black" : undefined
          }}
        >
          {isRetro && (
              <div className="absolute top-0 left-0 right-0 bg-[#000080] h-4 flex items-center px-1">
                 <div className="h-2 w-2 bg-white rounded-sm" />
              </div>
          )}
          <div className={isRetro ? "mt-2" : ""}>
             <BarChart3 size={24} style={{ color: isCyber ? "#ff00ff" : isRetro ? "#000080" : accentColor }} />
          </div>
          <div className={isRetro ? "mt-2" : ""}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${isCyber ? "text-pink-300" : isRetro ? "text-zinc-600" : "text-white/40"}`}>{isRetro ? "SYSTEM_SCORE" : "Evaluation"}</p>
            <span className={`text-2xl font-black ${isCyber ? "text-pink-500" : isRetro ? "text-[#000080]" : "text-white"}`}>9.5</span>
          </div>
        </motion.div>

        {/* MAIN WIDGET */}
        <div className={widgetClasses} style={{ borderColor: isCyber ? "#00ffff" : undefined, borderLeftColor: isMin ? accentColor : undefined }}>
          {isRetro && (
             <div className="bg-[#000080] text-white px-2 py-0.5 flex items-center justify-between text-[8px] font-bold">
                <div className="flex items-center gap-2">
                   <Music size={8} />
                   <span>Track Player</span>
                </div>
                <div className="flex gap-1">
                   <div className="h-3 w-3 bg-[#c0c0c0] border border-t-white border-l-white flex items-center justify-center text-black text-[6px]">X</div>
                </div>
             </div>
          )}
          <div className={innerClasses} style={{ borderColor: isCyber ? "#00ffff" : undefined }}>
            {isCyber && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-50 pointer-events-none" />
              </div>
            )}
            
            {!isMin && (
              <div className={`shrink-0 flex items-center justify-center ${
                isCyber ? "h-16 w-16 bg-cyan-500/10 border-4 border-cyan-500" : "h-14 w-14 rounded-2xl bg-white/5"
              }`}>
                 <Music size={isCyber ? 32 : 28} style={{ color: isCyber ? "#00ffff" : accentColor }} />
              </div>
            )}

            <div className={`flex-1 min-w-0 ${isRetro ? "p-3 bg-white border-t border-l border-zinc-500 border-r-white border-b-white m-1" : ""}`}>
              <div className="flex items-center gap-2 mb-0.5">
                <p className={`text-[9px] font-black uppercase tracking-[0.4em] ${isCyber ? "text-cyan-500 animate-pulse" : isRetro ? "text-zinc-500" : "text-white/30"}`}>
                  {isRetro ? "NOW_STREAMING" : "Now Playing"}
                </p>
                {showTrackNumber && !isMin && (
                   <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                    isCyber ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : isRetro ? "bg-zinc-200 border-zinc-400 text-zinc-500" : "bg-white/5 border-white/5 text-white/40"
                  }`}>TRK-42</span>
                )}
              </div>
              <h1 className={`${isMin ? "text-lg" : isCyber ? "text-4xl" : isRetro ? "text-2xl font-bold" : "text-3xl"} ${isRetro ? "text-black" : "text-white"} font-black tracking-tighter truncate leading-none uppercase`}>
                PREVIEW_BANGER_V2
              </h1>
              {showSubmitter && !isMin && (
                 <p className={`text-[10px] font-bold mt-1 uppercase tracking-widest ${isCyber ? "text-cyan-400" : isRetro ? "text-zinc-400" : "text-white/50"}`}>
                   {isRetro ? "BY_USER_" : "Sent by "} LaranDev
                 </p>
              )}
            </div>

            {showUpNext && !isMin && (
               <div className={`flex items-center gap-4 pl-6 border-l ${isCyber ? "border-cyan-500/30" : "border-white/10"}`}>
                 <ArrowRight size={18} className={isCyber ? "text-cyan-500" : "text-white/20"} />
                 <div className="max-w-[100px]">
                   <p className="text-[10px] font-bold truncate text-white/40">Up Next...</p>
                 </div>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

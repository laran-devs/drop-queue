"use client";

import { useSocket } from "@/hooks/use-socket";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, ArrowRight, BarChart3, Radio, TrendingUp } from "lucide-react";

interface EvaluationData {
  trackId: string;
  title: string;
  score: number;
}

export function OverlayContent({ 
  slug, 
  token,
  theme = "DEFAULT", 
  enableSound = false,
  showBpm: initialShowBpm = true,
  showKey: initialShowKey = true
}: { 
  slug: string;
  token?: string;
  theme?: string;
  enableSound?: boolean;
  showBpm?: boolean;
  showKey?: boolean;
}) {
  const { on, isConnected } = useSocket(undefined, slug, token);

  const [showBpm, setShowBpm] = useState(initialShowBpm);
  const [showKey, setShowKey] = useState(initialShowKey);

  const [nowPlaying, setNowPlaying] = useState<{ 
    title: string, 
    number?: number, 
    submitterName?: string,
    bpm?: number,
    key?: string,
    isPaid?: boolean
  } | null>(null);
  const [upNext, setUpNext] = useState<{ title: string, isPaid?: boolean } | null>(null);
  const [accentColor, setAccentColor] = useState("#9146ff");
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [isBanger, setIsBanger] = useState(false);
  const [duelVotes, setDuelVotes] = useState<{ track1Percent: number, track2Percent: number, total: number, track1Votes: number, track2Votes: number } | null>(null);

  useEffect(() => {
    const cleanups: (() => void)[] = [];

    // 1. Handle Notifications (Playing Now & Evaluated)
    cleanups.push(on("NOTIFICATION", (data: { type: string; title: string; trackNumber?: number; submitterName?: string; trackId: string; score: number, bpm?: number, key?: string, isPaid?: boolean }) => {
      if (data.type === "PLAYING_NOW") {
        setNowPlaying({ 
          title: data.title, 
          number: data.trackNumber,
          submitterName: data.submitterName,
          bpm: data.bpm,
          key: data.key,
          isPaid: data.isPaid
        });
        setEvaluation(null);
      }
      
      if (data.type === "TRACK_EVALUATED") {
        setEvaluation({
          trackId: data.trackId,
          title: data.title,
          score: data.score
        });

        // 🔥 BANGER ALERT!
        if (data.score >= 9.0) {
          setIsBanger(true);
          setTimeout(() => setIsBanger(false), 8000);

          // Trigger Sound if enabled
          if (enableSound) {
            const audio = new Audio("https://www.soundjay.com/misc/sounds/success-chime-01.mp3");
            audio.volume = 0.4;
            audio.play().catch(e => console.warn("Audio autoplay blocked or failed:", e));
          }
        }
        
        setTimeout(() => setEvaluation(prev => 
          prev?.trackId === data.trackId ? null : prev
        ), 7000);
      }
    }));

    // 2. Handle Queue Updates
    cleanups.push(on("queue_updated", (data: { tracks: { title: string, status: string, isPaid?: boolean }[] }) => {
      const next = data.tracks.find(t => t.status === "QUEUED");
      setUpNext(next ? { title: next.title, isPaid: next.isPaid } : null);
    }));

    // 3. Handle Theme
    cleanups.push(on("THEME_UPDATED", (data: { accentColor: string }) => {
      setAccentColor(data.accentColor);
    }));

    // 4. Handle Visibility & Other Settings
    cleanups.push(on("SETTINGS_UPDATED", (data: { settings: Record<string, boolean>, showBpmOnOverlay?: boolean, showKeyOnOverlay?: boolean }) => {
      console.log("Overlay settings updated:", data);
      if (data.showBpmOnOverlay !== undefined) setShowBpm(data.showBpmOnOverlay);
      if (data.showKeyOnOverlay !== undefined) setShowKey(data.showKeyOnOverlay);
    }));

    // 4. Handle Pause/Resume
    cleanups.push(on("QUEUE_PAUSED", () => {
      setNowPlaying({ title: "Stream Paused" });
      setEvaluation(null);
    }));

    cleanups.push(on("QUEUE_RESUMED", () => {
      setNowPlaying(null);
    }));

    // 5. Handle Duel Updates
    cleanups.push(on("DUEL_UPDATE", (data: any) => {
      setDuelVotes(data);
    }));
    
    // Clear Duel when session mode changes
    cleanups.push(on("SESSION_MODE_CHANGED", (data: any) => {
      if (data.mode === "STANDARD") setDuelVotes(null);
    }));

    return () => {
      cleanups.forEach(cleanup => cleanup && cleanup());
    };
  }, [on, enableSound]);

  // THEME STYLING
  const isCyber = theme === "CYBERPUNK";
  const isMin = theme === "MINIMALIST";
  const isRetro = theme === "RETRO";

  const containerClasses = isMin 
    ? "h-screen w-full flex flex-col justify-end p-8 overflow-hidden bg-transparent select-none font-mono"
    : isRetro
      ? "h-screen w-full flex flex-col justify-end p-12 overflow-hidden bg-transparent select-none"
      : isCyber 
        ? "h-screen w-full flex flex-col justify-end p-16 overflow-hidden bg-transparent select-none font-mono"
        : "h-screen w-full flex flex-col justify-end p-12 overflow-hidden bg-transparent select-none font-sans";

  const widgetClasses = isMin
    ? "bg-black/40 backdrop-blur-md px-4 py-3 rounded-none border-l-4 w-[300px]"
    : isRetro
      ? "bg-[#c0c0c0] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-zinc-500 shadow-[2px_2px_0_0_black] p-1 w-[600px]"
      : isCyber
        ? "bg-black/90 border-2 shadow-[0_0_30px_rgba(0,255,255,0.2)] p-1 rounded-none w-[700px] h-auto italic overflow-hidden relative"
        : "bg-[#0a0a0a]/70 backdrop-blur-[24px] saturate-[180%] p-1 rounded-[2.5rem] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.6)] w-[640px] h-[110px]";

  const innerClasses = isMin
    ? "flex items-center gap-4"
    : isRetro
      ? "flex flex-col border border-zinc-400"
      : isCyber
        ? "px-10 py-8 border-4 border-double flex items-center gap-10 overflow-hidden relative"
        : "h-full px-8 py-6 rounded-[2.3rem] border border-white/5 flex items-center gap-8 overflow-hidden";

  return (
    <div className={containerClasses}>
      {/* BANGER PULSE EFFECT */}
      <AnimatePresence>
        {isBanger && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 pointer-events-none z-0"
            style={{ 
              background: `radial-gradient(circle at bottom left, ${accentColor}, transparent 70%)`,
              boxShadow: `inset 0 0 100px ${accentColor}20`
            }}
          />
        )}
      </AnimatePresence>

      <div className="flex items-end gap-8 relative z-10">
        
        {/* SCORE POPUP */}
        <AnimatePresence>
          {evaluation && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1,
                rotate: isCyber ? [-1, 1, -1] : (evaluation.score >= 9 ? [-1, 1, -1] : 0)
              }}
              transition={{ repeat: (isCyber || evaluation.score >= 9) ? Infinity : 0, duration: 0.5 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className={`absolute -top-24 left-0 flex items-center gap-4 ${
                isMin ? "bg-black/60 p-4 rounded-none border-l-4" : 
                isCyber ? "bg-black p-6 border-4 border-dashed animate-pulse text-pink-500 shadow-[0_0_30px_rgba(255,0,255,0.5)]" : 
                evaluation.score >= 9 ? "bg-black/80 backdrop-blur-xl px-10 py-6 rounded-[2rem] border-2 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.3)] saturate-[1.5]" :
                "bg-[#0a0a0a]/70 backdrop-blur-[24px] saturate-[180%] px-8 py-5 rounded-3xl border border-white/20 shadow-2xl"
              }`}
              style={{ 
                borderLeft: (!isCyber && evaluation.score < 9) ? `4px solid ${accentColor}` : undefined,
                borderColor: isCyber ? "#ff00ff" : (evaluation.score >= 9 ? "#f59e0b" : undefined)
              }}
            >
              <div className={`p-3 rounded-2xl ${isCyber ? "bg-pink-500/20" : evaluation.score >= 9 ? "bg-amber-500/20" : "bg-white/5"}`}>
                <BarChart3 size={24} style={{ color: isCyber ? "#ff00ff" : evaluation.score >= 9 ? "#f59e0b" : accentColor }} />
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${isCyber ? "text-pink-300" : evaluation.score >= 9 ? "text-amber-400" : "text-white/40"}`}>
                  {isCyber ? "CRITICAL VIBE" : evaluation.score >= 9 ? "🔥 BANGER ALERT" : "Evaluation"}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-black ${isCyber ? "text-pink-500" : evaluation.score >= 9 ? "text-amber-500" : "text-white"}`}>{evaluation.score.toFixed(1)}</span>
                  {!isMin && <span className={`text-xs font-bold ${evaluation.score >= 9 ? "text-amber-500/40" : "text-white/40"}`}>/ 10.0</span>}
                </div>
              </div>
              {evaluation.score >= 9 && (
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="ml-4 shrink-0"
                >
                  <TrendingUp size={32} className="text-amber-500" />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN WIDGET OR DUEL BAR */}
        {duelVotes ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="w-[700px] h-[100px] rounded-[2rem] bg-black/80 backdrop-blur-3xl overflow-hidden border border-white/10 flex flex-col relative shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
          >
             <div className="absolute top-0 left-0 h-3 bg-blue-500 transition-all duration-500 rounded-r-xl" style={{ width: `${duelVotes.track1Percent}%` }} />
             <div className="absolute top-0 right-0 h-3 bg-red-500 transition-all duration-500 rounded-l-xl" style={{ width: `${duelVotes.track2Percent}%` }} />
             <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-1.5 bg-white shadow-[0_0_15px_white] z-10" />

             <div className="flex justify-between items-center h-full px-8 pt-3">
               <div className="text-blue-500 font-black text-4xl drop-shadow-lg flex items-center gap-4">
                 <div className="text-xs bg-blue-500/20 px-3 py-1.5 rounded-full uppercase tracking-widest text-blue-300 border border-blue-500/30">!1</div>
                 {duelVotes.track1Percent}%
               </div>
               
               <div className="flex flex-col items-center">
                  <span className="text-xl font-black italic text-zinc-400 uppercase tracking-[0.2em]">Versus</span>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase mt-1">{duelVotes.total} Votes</span>
               </div>

               <div className="text-red-500 font-black text-4xl drop-shadow-lg flex items-center gap-4">
                 {duelVotes.track2Percent}%
                 <div className="text-xs bg-red-500/20 px-3 py-1.5 rounded-full uppercase tracking-widest text-red-300 border border-red-500/30">!2</div>
               </div>
             </div>
          </motion.div>
        ) : (
        <div className={widgetClasses} style={{ borderColor: isCyber ? "#00ffff" : undefined, borderLeftColor: isMin ? accentColor : undefined }}>
          {isRetro && (
             <div className="bg-[#000080] text-white px-2 py-0.5 flex items-center justify-between text-[10px] font-bold">
                <div className="flex items-center gap-2">
                   <div className="h-4 w-4 bg-zinc-300 border border-t-white border-l-white border-b-zinc-500 border-r-zinc-500 flex items-center justify-center">
                      <Music size={10} className="text-black" />
                   </div>
                   <span>Track Player</span>
                </div>
                <div className="flex gap-1">
                   <div className="h-4 w-4 bg-[#c0c0c0] border border-t-white border-l-white flex items-center justify-center text-black">_</div>
                   <div className="h-4 w-4 bg-[#c0c0c0] border border-t-white border-l-white flex items-center justify-center text-black text-[8px]">X</div>
                </div>
             </div>
          )}
          <div className={innerClasses} style={{ borderColor: isCyber ? "#00ffff" : undefined }}>
            {isCyber && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-50 pointer-events-none" />
                 <motion.div 
                   animate={{ y: [0, 100, 0] }}
                   transition={{ duration: 0.2, repeat: Infinity }}
                   className="h-[2px] w-full bg-cyan-500/30 blur-sm top-1/2 absolute" 
                 />
              </div>
            )}
            
            {!isMin && (
              <div className={`relative shrink-0 flex items-center justify-center overflow-hidden ${
                isCyber ? "h-20 w-20 bg-cyan-500/10 border-4 border-cyan-500" : "h-14 w-14 rounded-2xl bg-white/5"
              }`}>
                 <motion.div 
                   animate={{ 
                     scale: nowPlaying?.title && nowPlaying.title !== "Awaiting Selection" ? [1, 1.1, 1] : 1,
                     rotate: isCyber ? [0, 90, 180, 270, 360] : (nowPlaying?.title && nowPlaying.title !== "Awaiting Selection" ? [0, 5, -5, 0] : 0)
                   }}
                   transition={{ duration: isCyber ? 10 : 2, repeat: Infinity, ease: "linear" }}
                   className="text-white relative z-10"
                 >
                   {nowPlaying?.title === "Stream Paused" ? <Radio size={isCyber ? 36 : 28} className="opacity-40" /> : <Music size={isCyber ? 36 : 28} style={{ color: isCyber ? "#00ffff" : accentColor }} />}
                 </motion.div>
                 
                 {nowPlaying?.title && nowPlaying.title !== "Stream Paused" && !isCyber && (
                   <motion.div 
                     animate={{ scale: [1, 2], opacity: [0.2, 0] }}
                     transition={{ duration: 2, repeat: Infinity }}
                     className="absolute inset-0 rounded-full"
                     style={{ backgroundColor: accentColor }}
                   />
                 )}
              </div>
            )}

            <div className={`flex-1 min-w-0 ${isRetro ? "p-4 bg-white border-t border-l border-zinc-500 border-r-white border-b-white m-1" : ""}`}>
              <div className="flex items-center gap-2 mb-0.5">
                {!isCyber && !isRetro && <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />}
                <div className="flex items-center gap-2">
                  <p className={`text-[9px] font-black uppercase tracking-[0.4em] ${isCyber ? "text-cyan-500 animate-pulse" : isRetro ? "text-zinc-600" : "text-white/30"}`}>
                    {isCyber ? ">> DIRECT DATA" : isRetro ? "NOW_STREAMING" : "Now Playing"}
                  </p>
                  {nowPlaying?.isPaid && (
                   <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border flex items-center gap-1 ${
                     isCyber ? "bg-amber-500/20 border-amber-500 text-amber-300" : isRetro ? "bg-amber-200 border-amber-400 text-amber-700" : "bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                   }`}>
                     <TrendingUp size={8} />
                     Priority
                   </span>
                  )}
                  {nowPlaying?.number && !isMin && (
                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                      isCyber ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : isRetro ? "bg-zinc-200 border-zinc-400 text-zinc-600" : "bg-white/5 border-white/5 text-white/40"
                    }`}>
                      TRK-{nowPlaying.number}
                    </span>
                  )}
                </div>
              </div>
              <AnimatePresence mode="wait">
                <motion.div 
                   key={nowPlaying?.title}
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={isCyber ? { opacity: 0, skewX: 20 } : { opacity: 0, x: 10 }}
                   className="flex flex-col"
                >
                  <h1 className={`${isMin ? "text-xl" : isCyber ? "text-5xl" : isRetro ? "text-3xl font-bold" : "text-4xl"} ${isRetro ? "text-black font-serif" : "text-white"} font-black tracking-tighter truncate leading-none uppercase`}>
                    {nowPlaying ? nowPlaying.title : "EMPTY_QUEUE"}
                  </h1>
                    {nowPlaying?.submitterName && !isMin && (
                      <div className="flex items-center gap-3 mt-1.5 min-w-0">
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isCyber ? "text-cyan-400" : isRetro ? "text-zinc-500" : "text-white/50"} truncate`}>
                          {isCyber ? "SOURCE_NODE_" : isRetro ? "BY_USER_" : "Sent by "} {nowPlaying.submitterName}
                        </p>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {showBpm && nowPlaying.bpm != null && (
                            <span className={`px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-black tabular-nums ${isCyber ? "text-cyan-400 border-cyan-500/30" : isRetro ? "bg-zinc-100 text-zinc-600 border-zinc-200" : "text-white/40"}`}>
                              {nowPlaying.bpm} BPM
                            </span>
                          )}
                          {showKey && nowPlaying.key != null && (
                            <span className={`px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-black ${isCyber ? "text-pink-400 border-pink-500/30" : isRetro ? "bg-zinc-100 text-zinc-600 border-zinc-200" : "text-white/40"}`}>
                              {nowPlaying.key}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* UP NEXT */}
            {!isMin && (
              <AnimatePresence>
                {upNext && (
                  <motion.div 
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className={`flex items-center gap-6 pl-6 border-l overflow-hidden ${isCyber ? "border-cyan-500/30" : "border-white/10"}`}
                  >
                    <div className={isCyber ? "text-cyan-500" : "text-white/20"}>
                      <ArrowRight size={20} />
                    </div>
                    <div className="max-w-[170px]">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${isCyber ? "text-cyan-500/40" : "text-white/20"}`}>Next Up</p>
                        {upNext.isPaid && (
                           <span className="text-[7px] font-black text-amber-500 animate-pulse">
                              <TrendingUp size={8} className="inline mr-1" />
                              PRIO
                           </span>
                        )}
                      </div>
                      <p className={`text-sm font-bold truncate ${isCyber ? "text-cyan-500/60" : "text-white/50"}`}>
                        {upNext.title}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
        )}

        {/* CONNECTION STATUS */}
        <AnimatePresence>
          {!isConnected && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -right-20 bottom-8 bg-[#0a0a0a]/70 backdrop-blur-[24px] saturate-[180%] px-4 py-2 rounded-xl border border-red-500/30 text-[8px] font-black uppercase tracking-widest text-red-500 shadow-2xl"
            >
              Offline
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

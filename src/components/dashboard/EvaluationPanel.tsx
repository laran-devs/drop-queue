"use client";

import { motion, AnimatePresence } from "framer-motion";
import dynamic from 'next/dynamic';
import { useState, useEffect } from "react";
import { RankBadge } from "@/components/RankBadge";
import { 
  Music2, 
  Languages, 
  Play, 
  Pause, 
  Volume2, 
  ExternalLink, 
  MessageSquare, 
  TrendingUp, 
  SkipForward, 
  Ban,
  PlayCircle
} from "lucide-react";
import { useTranslations } from "next-intl";
const ReactPlayer = dynamic(() => import('react-player').then(mod => mod.default), { ssr: false });

interface EvaluationPanelProps {
  playingTrack: any;
  criteria: Criteria[];
  scores: Record<string, number>;
  setScores: (scores: Record<string, number>) => void;
  activeTab: 'player' | 'lyrics';
  setActiveTab: (tab: 'player' | 'lyrics') => void;
  media: any;
  audioRef: React.RefObject<HTMLAudioElement>;
  handleTrackEnd: () => void;
  handleSubmitEvaluation: () => void;
  handleNext: () => void;
  handleSkip: () => void;
  isSubmitting: boolean;
  accentColor: string;
  chatVote?: { avg: number; total: number };
  autoAdvance?: boolean;
}

export function EvaluationPanel({
  playingTrack,
  criteria,
  scores,
  setScores,
  activeTab,
  setActiveTab,
  media,
  audioRef,
  handleTrackEnd,
  handleSubmitEvaluation,
  handleNext,
  handleSkip,
  isSubmitting,
  accentColor,
  chatVote,
  autoAdvance = true
}: EvaluationPanelProps) {
  const t = useTranslations("Dashboard");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    setCurrentTime(e.currentTarget.currentTime);
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    console.log("[Player] Metadata loaded. Duration:", e.currentTarget.duration);
    setDuration(e.currentTarget.duration);
  };

  const handlePlayStatus = (status: boolean) => {
    setIsPlaying(status);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const time = parseFloat(e.target.value);
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (!playingTrack) return null;

  return (
    <div className="glass p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl bg-white/5 backdrop-blur-3xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 mb-8 sm:mb-12">
        {/* Rating Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">{t("rateCriteria")}</h3>
          </div>

          {criteria.length > 0 ? (
            <div className="space-y-8">
              {criteria.map((c) => (
                <div key={c.id} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{c.name}</span>
                    <span className="text-lg font-black" style={{ color: accentColor }}>{scores[c.id] || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={scores[c.id] || 0}
                    onChange={(e) => setScores({ ...scores, [c.id]: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: accentColor }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 border-2 border-dashed border-zinc-100 dark:border-zinc-900 rounded-3xl text-center text-zinc-500 italic text-sm">
              {t("noCriteria")}
            </div>
          )}

          {/* Chat Vote Consensus (4.4) */}
          {chatVote && chatVote.total > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-6 rounded-[2rem] bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t("chatConsensus")}</h4>
                  <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{t("basedOn")} {chatVote.total} {t("votesCount")}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-purple-600 tabular-nums">{chatVote.avg.toFixed(1)}</span>
                <span className="text-xs font-black text-zinc-400 ml-1">/ 10</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Media & Context */}
        <div className="space-y-6 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">{t("lyrics")}</h3>
            <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
              {[
                { id: "player", icon: Music2 },
                { id: "lyrics", icon: Languages }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`p-2 rounded-lg transition-all ${activeTab === tab.id ? "bg-white dark:bg-zinc-800 shadow-sm text-purple-600" : "text-zinc-500 opacity-50 hover:opacity-100"}`}
                >
                  <tab.icon size={14} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 glass p-6 rounded-3xl border border-zinc-100 dark:border-zinc-900 min-h-[300px] flex flex-col overflow-hidden relative bg-white/5">
            <div className={`w-full h-full flex flex-col items-center justify-center gap-6 ${activeTab === "player" ? "" : "hidden"}`}>
              {media && (
                <>
                  {(media.type === 'youtube' || media.type === 'soundcloud') && (
                    <div className="w-full aspect-video rounded-2xl shadow-2xl overflow-hidden border border-zinc-800 z-10 relative">
                      <ReactPlayer 
                        url={media.originalUrl} 
                        width="100%" 
                        height="100%" 
                        playing={true} 
                        controls={true}
                        onEnded={handleTrackEnd}
                      />
                    </div>
                  )}
                  {media.type === 'spotify' && (
                    <iframe 
                      src={media.embedUrl}
                      className="w-full h-[352px] rounded-2xl grayscale hover:grayscale-0 transition-all duration-500"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  )}
                  {media.type === 'file' && (
                    <div className="flex flex-col items-center gap-8 w-full py-8 scale-in">
                      <div className="relative group cursor-pointer" onClick={togglePlay}>
                        <div className="h-24 w-24 rounded-[3rem] bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-900 dark:text-white shadow-2xl transition-all group-hover:scale-110 group-active:scale-95 border-2 border-white dark:border-zinc-800">
                          {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                        </div>
                        <div className="absolute -inset-2 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-[3.5rem] opacity-20 blur-xl group-hover:opacity-40 transition-opacity -z-10" />
                      </div>

                      <div className="w-full space-y-4 px-4">
                        <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-zinc-400">
                          <span>{formatTime(currentTime)}</span>
                          <div className="flex items-center gap-2">
                            <RankBadge score={chatVote?.avg || 0} />
                            <span className="opacity-30 uppercase tracking-tighter">{t("lossless")}</span>
                          </div>
                          <span>{formatTime(duration)}</span>
                        </div>
                        
                        <div className="relative h-2 w-full group py-4">
                          <input 
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                          />
                          <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner group-hover:h-2 transition-all duration-300">
                            <motion.div 
                              className="h-full relative"
                              style={{ backgroundColor: accentColor, width: `${(currentTime / (duration || 1)) * 100}%` }}
                              transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                            >
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity border-2" style={{ borderColor: accentColor }} />
                            </motion.div>
                          </div>
                        </div>
                      </div>

                      <audio 
                        key={media.originalUrl}
                        ref={ref => { 
                          if (ref) {
                            (audioRef as any).current = ref;
                          }
                        }}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onPlay={() => handlePlayStatus(true)}
                        onPause={() => handlePlayStatus(false)}
                        onEnded={handleTrackEnd}
                        src={media.originalUrl} 
                        autoPlay
                        className="opacity-0 absolute pointer-events-none"
                      />
                    </div>
                  )}
                  {media.type === 'link' && (
                    <div className="flex flex-col items-center justify-center gap-4 text-center py-10">
                      <ExternalLink size={32} className="text-zinc-300" />
                      <p className="text-sm font-bold opacity-50 italic">{t("notEmbeddable")}</p>
                      <a 
                        href={media.originalUrl} 
                        target="_blank" 
                        className="px-6 py-2 rounded-xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.03] transition-all"
                      >
                        {t("openTrack")}
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className={`w-full h-full whitespace-pre-wrap text-xs leading-relaxed text-zinc-500 scrollbar-thin overflow-y-auto p-4 ${activeTab === "lyrics" ? "" : "hidden"}`}>
              {playingTrack.lyrics || t("noLyrics")}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleSubmitEvaluation}
            className="flex-[3] py-5 rounded-3xl text-white font-black uppercase tracking-widest shadow-2xl transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 relative overflow-hidden group"
            style={{ backgroundColor: accentColor, boxShadow: isSubmitting ? 'none' : `0 20px 30px -10px ${accentColor}4D` }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t("processing")}
              </>
            ) : (
              <>
                {t("confirm")}
                <TrendingUp size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        
        <div className="flex flex-[1] gap-2">
          <button
            onClick={handleNext}
            className="flex-1 glass border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-black uppercase tracking-widest rounded-3xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {t("skip")}
          </button>
          <button
            onClick={handleSkip}
            className="px-6 glass border border-red-500/30 text-red-500 text-xs font-black uppercase tracking-widest rounded-3xl hover:bg-red-500/10 transition-all flex items-center justify-center group"
          >
            <Ban size={16} className="group-hover:rotate-45 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

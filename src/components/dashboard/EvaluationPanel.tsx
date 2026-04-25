"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Music2, Languages, PlayCircle, ExternalLink, MessageSquare, TrendingUp, SkipForward, Ban } from "lucide-react";
import { Track, Criteria } from "@prisma/client";
import dynamic from 'next/dynamic';
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
                    <div className="flex flex-col items-center gap-6 w-full py-10 scale-in">
                      <div className="h-20 w-20 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 animate-pulse">
                        <PlayCircle size={40} />
                      </div>
                      <audio 
                        key={media.originalUrl}
                        ref={ref => { (audioRef as any).current = ref; }}
                        controls 
                        autoPlay
                        onEnded={handleTrackEnd}
                        src={media.originalUrl} 
                        className="w-full h-12"
                      />
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Lossless Audio Quality</p>
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

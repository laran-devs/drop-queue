"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Track } from "@prisma/client";
import { Link } from "@/navigation";


import { Play, Pause } from "lucide-react";

interface StreamCarouselProps {
  tracks: (Track & { submitter?: { id?: string, name: string | null } | null })[];
  playingTrackId: string | null;
  accentColor: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  togglePlay: () => void;
  onSeek: (time: number) => void;
}

export function StreamCarousel({ 
  tracks, 
  playingTrackId, 
  accentColor,
  currentTime,
  duration,
  isPlaying,
  togglePlay,
  onSeek
}: StreamCarouselProps) {
  const currentIndex = tracks.findIndex((t) => t.id === playingTrackId);
  
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const prevTrack = currentIndex > 0 ? tracks[currentIndex - 1] : null;
  const currentTrack = currentIndex !== -1 ? tracks[currentIndex] : null;
  const nextTrack = currentIndex !== -1 && currentIndex < tracks.length - 1 ? tracks[currentIndex + 1] : null;

  return (
    <div className="relative w-full h-80 flex items-center justify-center perspective-1000 overflow-hidden">
      <AnimatePresence mode="popLayout">
        {/* Previous Track */}
        {prevTrack && (
          <motion.div
            key={`prev-${prevTrack.id}`}
            initial={{ opacity: 0, x: -100, scale: 0.8, rotateY: 25 }}
            animate={{ opacity: 0.4, x: -280, scale: 0.85, rotateY: 25 }}
            exit={{ opacity: 0, x: -200 }}
            className="absolute z-10 w-80 glass p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800"
          >
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Previously Played</span>
            <h3 className="text-xl font-bold text-zinc-400 truncate">{prevTrack.title}</h3>
          </motion.div>
        )}

        {/* Current Track */}
        {currentTrack ? (
          <motion.div
            key={`current-${currentTrack.id}`}
            layoutId="current-track"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, z: 50 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute z-30 w-[450px] glass p-10 rounded-[2.5rem] border shadow-2xl overflow-hidden"
            style={{ borderColor: `${accentColor}33`, boxShadow: `0 25px 50px -12px ${accentColor}1A` }}
          >
            <div className="absolute top-0 right-0 p-6">
              <div className="h-3 w-3 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
            </div>
            
            <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 block" style={{ color: accentColor }}>Now Playing</span>
            <h2 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 leading-tight mb-2">
              {currentTrack.title}
            </h2>
            {currentTrack.submitter?.name && (
              <Link 
                href={`/profile/${currentTrack.submitterId}`}
                className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-purple-500 transition-colors mb-6 block"
              >
                Sent by {currentTrack.submitter.name}
              </Link>
            )}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={togglePlay}
                  className="h-12 w-12 rounded-2xl bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
                  style={{ color: isPlaying ? accentColor : 'currentColor' }}
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                </button>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black tabular-nums opacity-40">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <div className="relative h-1.5 w-full group">
                    <input 
                      type="range"
                      min="0"
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => onSeek(parseFloat(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                    <div className="h-full w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full relative" 
                        style={{ backgroundColor: accentColor, width: `${(currentTime / (duration || 1)) * 100}%` }} 
                      >
                         <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-lg border-2" style={{ borderColor: accentColor }} />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="text-center text-zinc-500 font-bold italic opacity-30">
            Awaiting the next vibe...
          </div>
        )}

        {/* Next Track */}
        {nextTrack && (
          <motion.div
            key={`next-${nextTrack.id}`}
            initial={{ opacity: 0, x: 100, scale: 0.8, rotateY: -25 }}
            animate={{ opacity: 0.4, x: 280, scale: 0.85, rotateY: -25 }}
            exit={{ opacity: 0, x: 200 }}
            className="absolute z-10 w-80 glass p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800"
          >
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Up Next</span>
            <h3 className="text-xl font-bold text-zinc-400 truncate">{nextTrack.title}</h3>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

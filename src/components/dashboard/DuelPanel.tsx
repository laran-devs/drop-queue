"use client";

import { motion } from "framer-motion";
import { Swords, Trophy, Ban, PlayCircle } from "lucide-react";
import dynamic from 'next/dynamic';
const ReactPlayer = dynamic(() => import('react-player').then(mod => mod.default), { ssr: false });
import { getMediaInfo } from "@/lib/media";

interface DuelPanelProps {
  tracks: any[];
  duelVotes: { track1Percent: number, track2Percent: number, track1Votes: number, track2Votes: number };
  accentColor: string;
  onFinishDuel: (winnerId: string, loserId: string) => void;
  onCancelDuel: () => void;
  isSubmitting: boolean;
}

export function DuelPanel({
  tracks,
  duelVotes,
  accentColor,
  onFinishDuel,
  onCancelDuel,
  isSubmitting
}: DuelPanelProps) {
  
  if (!tracks || tracks.length !== 2) return null;

  const [track1, track2] = tracks;
  const media1 = getMediaInfo(track1.url, track1.filePath);
  const media2 = getMediaInfo(track2.url, track2.filePath);

  return (
    <div className="glass p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] border border-red-500/30 shadow-[0_0_50px_-12px_rgba(239,68,68,0.2)] bg-zinc-950">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-black uppercase tracking-[0.2em] text-red-500 flex items-center gap-3">
          <Swords size={24} className="animate-pulse" />
          Versus Mode
        </h3>
        <button 
          onClick={onCancelDuel}
          className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition"
        >
          Cancel Duel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
        {/* Track 1 */}
        <div className="space-y-4 relative z-10">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full">
                Chat: !1
              </span>
              <h4 className="mt-4 font-bold text-lg leading-tight truncate w-64">{track1.title}</h4>
              <p className="text-xs text-zinc-500 font-bold">{track1.submitter?.name || "Anonymous"}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-blue-500">{duelVotes.track1Percent}%</span>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">{duelVotes.track1Votes} votes</p>
            </div>
          </div>
          
          <div className="w-full aspect-video rounded-3xl overflow-hidden border-2 border-blue-500/20 bg-black/50">
             {media1.type === 'youtube' || media1.type === 'soundcloud' ? (
                <ReactPlayer url={media1.originalUrl} width="100%" height="100%" controls={true} playing={false} />
             ) : media1.type === 'spotify' ? (
                <iframe src={media1.embedUrl} className="w-full h-full" />
             ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                  <audio controls src={media1.originalUrl} className="w-full" />
                  <p className="mt-4 text-[10px] text-zinc-500 font-bold uppercase">Lossless file</p>
                </div>
             )}
          </div>
          
          <button 
            disabled={isSubmitting}
            onClick={() => onFinishDuel(track1.id, track2.id)}
            className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Trophy size={14} /> Declare P1 Winner
          </button>
        </div>

        {/* VS Divider */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-20 pointer-events-none">
          <span className="text-8xl font-black italic text-zinc-100">VS</span>
        </div>

        {/* Track 2 */}
        <div className="space-y-4 relative z-10">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-3 py-1 rounded-full">
                Chat: !2
              </span>
              <h4 className="mt-4 font-bold text-lg leading-tight truncate w-64">{track2.title}</h4>
              <p className="text-xs text-zinc-500 font-bold">{track2.submitter?.name || "Anonymous"}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-red-500">{duelVotes.track2Percent}%</span>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">{duelVotes.track2Votes} votes</p>
            </div>
          </div>
          
          <div className="w-full aspect-video rounded-3xl overflow-hidden border-2 border-red-500/20 bg-black/50">
             {media2.type === 'youtube' || media2.type === 'soundcloud' ? (
                <ReactPlayer url={media2.originalUrl} width="100%" height="100%" controls={true} playing={false} />
             ) : media2.type === 'spotify' ? (
                <iframe src={media2.embedUrl} className="w-full h-full" />
             ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                  <audio controls src={media2.originalUrl} className="w-full" />
                  <p className="mt-4 text-[10px] text-zinc-500 font-bold uppercase">Lossless file</p>
                </div>
             )}
          </div>

          <button 
            disabled={isSubmitting}
            onClick={() => onFinishDuel(track2.id, track1.id)}
            className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Trophy size={14} /> Declare P2 Winner
          </button>
        </div>
      </div>

      {/* Realtime Bar */}
      <div className="mt-10 h-6 w-full rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex relative">
         <motion.div 
           className="h-full bg-blue-500" 
           animate={{ width: `${duelVotes.track1Percent}%` }} 
           transition={{ type: "spring" }} 
         />
         <motion.div 
           className="h-full bg-red-500" 
           animate={{ width: `${duelVotes.track2Percent}%` }} 
           transition={{ type: "spring" }} 
         />
         <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-1 bg-white rounded-full shadow-[0_0_10px_white]" />
      </div>
    </div>
  );
}

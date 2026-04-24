"use client";

import { useSocket } from "@/hooks/use-socket";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Timer, Trophy, TrendingUp, Bell, Music } from "lucide-react";
import { useNotifications } from "./providers/NotificationProvider";
import { EmptyState } from "./ui/EmptyState";

interface Track {
  id: string;
  title: string;
  status: string;
  submitterId: string;
  averageScore?: number;
}

interface ViewerQueueStatusProps {
  sessionId: string;
  slug: string;
  userId?: string;
  accentColor: string;
}

export function ViewerQueueStatus({ sessionId, slug, userId, accentColor }: ViewerQueueStatusProps) {
  const { socket } = useSocket(undefined, slug);
  const { sendNotification, requestPermission, permission } = useNotifications();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial fetch of tracks for this session
    fetch(`/api/sessions/${slug}/tracks`)
      .then(res => res.json())
      .then(data => {
        setTracks(data);
        setIsLoading(false);
      });

    if (!socket) return;

    const handleUpdate = () => {
       fetch(`/api/sessions/${slug}/tracks`)
        .then(res => res.json())
        .then(data => setTracks(data));
    };

    socket.on("track_added", handleUpdate);
    socket.on("track_evaluated", handleUpdate);
    socket.on("track_skipped", handleUpdate);
    socket.on("track_started", handleUpdate);

    const onNotification = (data: any) => {
      if (data.type === "PLAYING_NOW") {
        sendNotification(`🎵 Now Playing: ${data.title}`, { body: "Your favorite banger is on air!" });
      } else if (data.type === "TRACK_EVALUATED") {
        sendNotification(`📝 Result for ${data.title}`, { body: `Score: ${data.score.toFixed(1)}/10` });
      }
    };

    socket.on("NOTIFICATION", onNotification);

    return () => {
      socket.off("track_added", handleUpdate);
      socket.off("track_evaluated", handleUpdate);
      socket.off("track_skipped", handleUpdate);
      socket.off("track_started", handleUpdate);
      socket.off("NOTIFICATION", onNotification);
    };
  }, [socket, slug]);

  const queuedTracks = tracks.filter(t => t.status === "QUEUED");
  const myTrackIndex = userId ? queuedTracks.findIndex(t => t.submitterId === userId) : -1;
  const myPosition = myTrackIndex !== -1 ? myTrackIndex + 1 : null;
  
  const evaluatedTracks = tracks
    .filter(t => t.status === "EVALUATED" && t.averageScore !== undefined)
    .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
    .slice(0, 3);

  // Estimate: 4 mins per track
  const estimatedWaitSeconds = myPosition ? (myPosition * 4 * 60) : 0;
  const waitMessage = estimatedWaitSeconds > 60 
    ? `~${Math.round(estimatedWaitSeconds / 60)} min` 
    : "Soon!";

  // Trigger background notification when track is UP NEXT
  useEffect(() => {
    if (myPosition === 1 && permission === "granted") {
      sendNotification("Your track is UP NEXT! 🎵", {
        body: "Get ready, your submission is at the top of the queue.",
        tag: "up-next"
      });
    }
  }, [myPosition, permission, sendNotification]);

  if (isLoading && tracks.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Viewer Position Card */}
      {myPosition ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-6 rounded-[2rem] border-2 flex items-center justify-between overflow-hidden relative"
          style={{ borderColor: `${accentColor}33` }}
        >
          <div className="absolute inset-0 opacity-5" style={{ backgroundColor: accentColor }} />
          <div className="flex items-center gap-4 relative z-10">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: accentColor }}>
               <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Your Position</p>
              <h3 className="text-2xl font-black italic">#{myPosition} <span className="text-sm not-italic font-bold text-zinc-500">in queue</span></h3>
            </div>
          </div>
          <div className="text-right relative z-10">
             <div className="flex items-center gap-2 justify-end text-zinc-400 mb-1">
               <Timer size={12} />
               <span className="text-[10px] font-black uppercase tracking-widest">Est. Wait</span>
             </div>
             <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">{waitMessage}</p>
          </div>
          <button 
            onClick={() => requestPermission()}
            className={`absolute top-4 right-4 p-2 rounded-xl transition-all ${permission === 'granted' ? 'text-green-500 bg-green-500/10' : 'text-zinc-400 bg-zinc-100 dark:bg-zinc-800'}`}
            title={permission === 'granted' ? "Notifications Enabled" : "Enable Background Alerts"}
          >
            <Bell size={14} className={permission === 'granted' ? "" : "animate-bounce"} />
          </button>
        </motion.div>
      ) : (
        <div className="glass p-8 rounded-[2.5rem] border border-dashed border-zinc-200 dark:border-zinc-800">
          <EmptyState 
            icon={<Music size={40} strokeWidth={1.5} />}
            title="Join the stage"
            description="Your music deserves to be heard. Submit your track using the form above to join the queue."
          />
        </div>
      )}

      {/* Session Top 3 */}
      {evaluatedTracks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Trophy size={14} className="text-yellow-500" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Session Top Scorers</h4>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {evaluatedTracks.map((track, idx) => (
              <div key={track.id} className="glass px-6 py-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                <div className="flex items-center gap-4">
                  <span className={`text-lg font-black ${idx === 0 ? "text-yellow-500" : "text-zinc-300"}`}>#{idx + 1}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{track.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <TrendingUp size={12} className="text-green-500" />
                   <span className="text-sm font-black text-purple-600">{track.averageScore?.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

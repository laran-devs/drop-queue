"use client";

import { useSocket } from "@/hooks/use-socket";
import { useState, useEffect } from "react";

interface Notification {
  type: "PLAYING_NOW" | "TRACK_EVALUATED";
  title: string;
  score?: number;
  message: string;
}

export function QueueStatus({ userId }: { userId?: string }) {
  const { on } = useSocket();
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [history, setHistory] = useState<Notification[]>([]);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);

  useEffect(() => {
    on("NOTIFICATION", (data: Notification) => {
      setCurrentNotification(data);
      if (data.type === "TRACK_EVALUATED") {
        setHistory(prev => [data, ...prev].slice(0, 5));
      }
    });

    on("queue_updated", (data: { tracks: { id: string, submitterId: string, status: string }[] }) => {
      if (userId) {
        const queuedTracks = data.tracks.filter(t => t.status === "QUEUED");
        const position = queuedTracks.findIndex(t => t.submitterId === userId);
        setQueuePosition(position !== -1 ? position + 1 : null);
      }
    });
  }, [on, userId]);

  return (
    <div className="space-y-6">
      {/* Current Activity Card */}
      <section className="glass p-6 rounded-2xl border border-purple-500/20 bg-purple-500/5 shadow-lg shadow-purple-500/10">
        <h3 className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
          Live Stream Status
        </h3>

        {currentNotification ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {currentNotification.type === "PLAYING_NOW" ? (
                <div className="space-y-1">
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">Currently playing</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{currentNotification.title}</p>
                </div>
            ) : (
                <div className="space-y-1">
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">Recently evaluated</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {currentNotification.title} <span className="text-purple-600 ml-2">{currentNotification.score?.toFixed(1)}/10</span>
                  </p>
                </div>
            )}
          </div>
        ) : (
          <p className="text-zinc-400 text-sm italic">Waiting for streamer to start playing tracks...</p>
        )}

        {queuePosition !== null && (
          <div className="mt-6 pt-6 border-t border-purple-500/10 animate-in zoom-in-95 duration-500">
            <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Your Status</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-purple-600">#{queuePosition}</span>
              <span className="text-sm text-zinc-500">in queue</span>
            </div>
            <p className="mt-1 text-[10px] text-zinc-400 italic">
              Estimated wait: ~{queuePosition * 4} min
            </p>
          </div>
        )}
      </section>

      {/* Evaluation History */}
      {history.length > 0 && (
        <section className="glass p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Recent Ratings</h3>
          <div className="space-y-4">
            {history.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between group">
                <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-600 transition-colors">{item.title}</span>
                <span className="text-sm font-bold bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded text-purple-600">
                  {item.score?.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

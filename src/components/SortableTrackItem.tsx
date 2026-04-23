"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Track } from "@prisma/client";

interface SortableTrackItemProps {
  track: Track & { submitter?: { id?: string, name: string | null } | null };
  setPlaying: (id: string) => void;
  accentColor?: string;
  isOverLimit?: boolean;
}

import { GripVertical, Play, ExternalLink, AlertTriangle, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "@/navigation";

export function SortableTrackItem({ 
  track, 
  setPlaying, 
  accentColor = "#9146ff",
  isOverLimit = false 
}: SortableTrackItemProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, "--hover-color": accentColor } as React.CSSProperties}
      className={`glass p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 transition-all group hover:shadow-xl hover:border-[var(--hover-color)] ${isDragging ? 'shadow-2xl ring-2 ring-purple-500/20' : ''}`}
    >
      <div className="flex items-center gap-4">
        {/* DRAG HANDLE */}
        <div 
          {...(isMounted ? attributes : {})}
          {...(isMounted ? listeners : {})}
          className="cursor-grab active:cursor-grabbing p-1 text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-100 transition-colors"
        >
          <GripVertical size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-sm">{track.title}</h4>
            <div className="flex items-center gap-1.5">
               <span className="text-[7px] font-black uppercase px-2 py-0.5 rounded-full border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-400">
                {track.status}
              </span>
              {track.order > 0 && (
                <span className="text-[7px] font-black text-purple-600 bg-purple-500/10 px-1.5 py-0.5 rounded-md">
                  #{ track.order }
                </span>
              )}
               {track.isPaid && (
                <div className="flex items-center gap-1 text-[7px] font-black uppercase text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <TrendingUp size={8} />
                  Priority
                </div>
              )}
              {isOverLimit && !track.isPaid && (
                <div className="flex items-center gap-1 text-[7px] font-black uppercase text-red-500 bg-red-500/5 px-2 py-0.5 rounded-full border border-red-500/20">
                  <AlertTriangle size={8} />
                  Backlog
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-[9px] text-zinc-400 font-mono uppercase tracking-widest">
              {new Date(track.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            {track.submitter?.name && (
              <Link 
                href={`/profile/${track.submitterId}`}
                className="text-[9px] font-black uppercase tracking-widest text-purple-600 hover:underline flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {track.submitter.name}
              </Link>
            )}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setPlaying(track.id);
          }}
          className="h-10 w-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 hover:bg-purple-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95 group/btn"
        >
          <Play size={16} className="fill-current" />
        </button>
      </div>
    </div>
  );
}

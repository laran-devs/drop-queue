"use client";

import { useState, useMemo } from "react";
import { Track } from "@prisma/client";
import { Search, ChevronRight, Hash, TrendingUp, AlertCircle } from "lucide-react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from "@dnd-kit/sortable";
import { SortableTrackItem } from "@/components/SortableTrackItem";
import { motion, AnimatePresence } from "framer-motion";

interface ActiveQueueProps {
  tracks: (Track & { submitter: { id: string, name: string | null } | null })[];
  setTracks: React.Dispatch<React.SetStateAction<(Track & { submitter: { id: string, name: string | null } | null })[]>>;
  setPlaying: (trackId: string) => void;
  accentColor: string;
  trackLimit?: number | null;
  onStartDuel?: () => void;
}

export function ActiveQueue({ 
  tracks, 
  setTracks, 
  setPlaying, 
  accentColor,
  trackLimit,
  onStartDuel
}: ActiveQueueProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const queuedTracks = useMemo(() => 
    tracks.filter(t => t.status === "QUEUED")
      .sort((a, b) => {
        if (a.isPaid && !b.isPaid) return -1;
        if (!a.isPaid && b.isPaid) return 1;
        return 0;
      }), 
    [tracks]
  );

  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return queuedTracks;
    const query = searchQuery.toLowerCase();
    return queuedTracks.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.submitter?.name?.toLowerCase().includes(query)
    );
  }, [queuedTracks, searchQuery]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTracks((items) => {
        const oldIndex = items.findIndex((t) => t.id === active.id);
        const newIndex = items.findIndex((t) => t.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const totalEvaluated = tracks.filter(t => t.status === "EVALUATED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-black uppercase tracking-tighter">
          Queue <span className="opacity-30">({queuedTracks.length})</span>
        </h2>
        <div className="flex gap-2">
          {onStartDuel && queuedTracks.length >= 2 && (
            <button onClick={onStartDuel} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all text-[8px] font-black uppercase tracking-widest active:scale-95">
              ⚔️ Start Duel
            </button>
          )}
          {trackLimit && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
               <TrendingUp size={10} className="text-zinc-400" />
               <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Auto-Line: {trackLimit}</span>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar (3.4) */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
        <input 
          type="text"
          placeholder="Search by title or submitter..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl text-[10px] font-bold outline-none focus:ring-2 transition-all"
          style={{ '--tw-ring-color': `${accentColor}1A` } as any}
        />
      </div>
      
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filteredTracks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 relative">
            <AnimatePresence mode="popLayout">
              {filteredTracks.map((t, index) => {
                const trackIndex = totalEvaluated + index + 1;
                const isOverLimit = trackLimit != null ? trackIndex > trackLimit : false;
                const becomesOverLimitHere = trackLimit != null ? trackIndex === trackLimit + 1 : false;

                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="relative"
                  >
                    {/* Line in the Sand Indicator (3.2) */}
                    {becomesOverLimitHere && !searchQuery && (
                      <div className="relative py-6 flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t-2 border-dashed border-red-500/20" />
                        </div>
                        <div className="relative px-4 py-1.5 rounded-full bg-red-500 text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-red-500/20 active:scale-95 transition-all">
                          <AlertCircle size={10} />
                          End of guaranteed queue
                        </div>
                      </div>
                    )}

                    <SortableTrackItem 
                      track={t} 
                      setPlaying={setPlaying} 
                      accentColor={accentColor}
                      isOverLimit={isOverLimit}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredTracks.length === 0 && (
              <div className="glass p-16 rounded-[2rem] border-2 border-dashed border-zinc-100 dark:border-zinc-900 text-center opacity-30 grayscale italic text-[10px] uppercase font-black tracking-widest">
                {searchQuery ? "No matches found" : "Queue is empty"}
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

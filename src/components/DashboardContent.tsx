"use client";

import { useSocket } from "@/hooks/use-socket";
import { Track, Criteria, StreamSession } from "@prisma/client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { skipTrack } from "@/app/actions/skip-track";
import { addCriterion, removeCriterion, submitEvaluation, endSession } from "@/app/actions/evaluation-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveCriteriaPreset, loadCriteriaPreset, getUserPresets } from "@/app/actions/preset-actions";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { ListRestart, Save, LayoutTemplate, BarChart2, Settings as SettingsIcon, Headphones, Volume2, VolumeX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { updateSessionSettings } from "@/app/actions/update-session-settings";
import { getTracksForSession, startTrack, bumpTrack } from "@/app/actions/track-actions";
import { updateAccentColor } from "@/app/actions/user-actions";
import { PLATFORMS } from "@/lib/validations";
import { useLocale } from "next-intl";
import { getMediaInfo } from "@/lib/media";

import { DashboardHeader } from "./dashboard/DashboardHeader";
import { ActiveQueue } from "./dashboard/ActiveQueue";
import { EvaluationPanel } from "./dashboard/EvaluationPanel";
import { DashboardSettings } from "./dashboard/DashboardSettings";
import { DuelPanel } from "./dashboard/DuelPanel";
import { updateSessionStatus, updateOverlaySettings } from "@/app/actions/session-actions";

interface DashboardContentProps {
  session: StreamSession & { 
    criteria: Criteria[], 
    tracks: (Track & { submitter: { id: string, name: string | null } | null })[],
    streamer: { image: string | null, name: string | null },
    donations: any[]
  };
  userId: string;
}

const COLOR_PRESETS = [
  { name: "Twitch Purple", value: "#9146ff" },
  { name: "Toxic Green", value: "#00ff88" },
  { name: "Wild East Orange", value: "#ff8800" },
  { name: "Cyber Blue", value: "#0088ff" },
  { name: "Lava Red", value: "#ff4444" },
];

export function DashboardContent({ session: initialSession, userId }: DashboardContentProps) {
  const router = useRouter();
  const locale = useLocale();
  const [tracks, setTracks] = useState<(Track & { submitter: { id: string, name: string | null } | null })[]>(initialSession.tracks);
  const [criteria, setCriteria] = useState<Criteria[]>(initialSession.criteria);
  const [accentColor, setAccentColor] = useState((initialSession.settings as { accentColor?: string })?.accentColor || "#9146ff");
  const [newCriteriaName, setNewCriteriaName] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<"player" | "lyrics">("player");
  const [isStreamPaused, setIsStreamPaused] = useState(initialSession.status === "PAUSED");
  const [showGuide, setShowGuide] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [presets, setPresets] = useState<{id: string, name: string}[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBpm, setShowBpm] = useState(initialSession.showBpmOnOverlay ?? true);
  const [showKey, setShowKey] = useState(initialSession.showKeyOnOverlay ?? true);
  const [allowedPlatforms, setAllowedPlatforms] = useState<string[]>(initialSession.allowedPlatforms ?? []);
  const [enableNormalization, setEnableNormalization] = useState(initialSession.enableNormalization ?? false);
  const [autoAdvance, setAutoAdvance] = useState(initialSession.autoAdvance ?? true);
  const [trackLimit, setTrackLimit] = useState(initialSession.trackLimit ?? null);
  const [subOnly, setSubOnly] = useState(initialSession.subOnly ?? false);
  const [paidOnly, setPaidOnly] = useState(initialSession.paidOnly ?? false);
  const [minDonation, setMinDonation] = useState(initialSession.minDonation ?? 50);
  const [chatVotes, setChatVotes] = useState<Record<string, { avg: number; total: number }>>({});
  const [evaluations, setEvaluations] = useState<Record<string, number>>({});
  const [overlaySettings, setOverlaySettings] = useState<Record<string, boolean>>(
    (initialSession.settings as Record<string, boolean>) || {
      showUpNext: true,
      showSubmitter: true,
      showTrackNumber: true
    }
  );
  const [overlayTheme, setOverlayTheme] = useState(initialSession.overlayTheme || "default");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionMode, setSessionMode] = useState<"STANDARD" | "DUEL">(initialSession.sessionMode as any);
  const [duelTracks, setDuelTracks] = useState<(Track & any)[]>([]);
  const [duelVotes, setDuelVotes] = useState({ track1Percent: 50, track2Percent: 50, track1Votes: 0, track2Votes: 0, total: 0 });
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  
  const { emit, on } = useSocket(userId, initialSession.slug);

  // Fetch presets
  useEffect(() => {
    getUserPresets().then(setPresets);
  }, []);


  // Timer logic
  useEffect(() => {
    const start = new Date(initialSession.createdAt).getTime();
    const interval = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [initialSession.createdAt]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const setPlaying = useCallback((trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      emit("track_playing", { 
        slug: initialSession.slug, 
        trackId, 
        title: track.title,
        trackNumber: track.order,
        submitterName: track.submitter?.name || "Anonymous",
        bpm: track.bpm,
        key: track.key,
        isPaid: track.isPaid
      });
      setTracks(prev => prev.map(t => ({
        ...t,
        status: t.id === trackId ? "PLAYING" : t.status === "PLAYING" ? "EVALUATED" : t.status
      })));
      setActiveTab("player");
      setScores({}); // Reset scores for new track
      startTrack(trackId); // Sync with DB
    }
  }, [emit, initialSession.slug, tracks]);

  const handleNext = useCallback(() => {
    const nextTrack = tracks.find(t => t.status === "QUEUED");
    if (nextTrack) {
      setPlaying(nextTrack.id);
    } else {
      setTracks(prev => prev.map(t => t.status === "PLAYING" ? { ...t, status: "EVALUATED" as const } : t));
      toast.info("No more tracks in queue.");
    }
  }, [tracks, setPlaying]);

  const handleTrackEnd = useCallback(() => {
    console.log("Track ended.");
    toast.info("Track playback finished.", { icon: "🏁" });
  }, []);

  // Handle Real-Time Updates (New Tracks)
  useEffect(() => {
    const cleanup = on("TRACK_ADDED", async (data: { title: string }) => {
      console.log(`Real-time update: Track added - ${data.title}`);
      toast.info(`New track submitted: ${data.title}`, {
        icon: "🎵",
        duration: 5000,
      });

      // Fetch the latest tracks
      const result = await getTracksForSession(initialSession.id);
      if (result.success && result.tracks) {
        setTracks(result.tracks as any);
      }
    });

    // 4.4 Chat Vote listener
    const cleanupVotes = on("CHAT_VOTE_UPDATE", (data: { trackId: string; avg: number; total: number }) => {
      setChatVotes(prev => ({ ...prev, [data.trackId]: { avg: data.avg, total: data.total } }));
    });

    // 3.1 Auto-Advance listener
    const cleanupAuto = on("AUTO_PREPARE_NEXT", (data: { trackId: string }) => {
      console.log("[Socket] Received AutoAdvance trigger");
      toast.info("Auto-advancing to next track...", { duration: 3000 });
      setPlaying(data.trackId);
    });

    const cleanupDuel = on("DUEL_UPDATE", (data: any) => {
      setDuelVotes(data);
    });

    return () => {
      if (cleanup) cleanup();
      if (cleanupVotes) cleanupVotes();
      if (cleanupAuto) cleanupAuto();
      if (cleanupDuel) cleanupDuel();
    };
  }, [on, initialSession.id, setPlaying]);



  useEffect(() => {
    emit("queue_updated", { slug: initialSession.slug, tracks });
  }, [tracks, emit, initialSession.slug]);

  useEffect(() => {
    const cleanup = on("NOTIFICATION", (data: { type: string; message: string }) => {
      if (data.type === "NEW_TRACK") {
        toast.message("New Track Submission!", { description: data.message, icon: "🎵" });
        router.refresh(); // Refresh server components
        // Immediate local refresh
        getTracksForSession(initialSession.id).then(res => {
          if (res.success && res.tracks) setTracks(res.tracks as any);
        });
      }

      if (data.type === "DONATION_BUMP") {
        toast.success(data.message || "New Donation Bump!", { icon: "💰", duration: 8000 });
        // Refresh tracks to show the priority status
        getTracksForSession(initialSession.id).then(res => {
          if (res.success && res.tracks) setTracks(res.tracks as any);
        });
      }
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [on, router]);

  const playingTrack = useMemo(() => tracks.find(t => t.status === "PLAYING"), [tracks]);
  const queuedTracks = useMemo(() => tracks.filter(t => t.status === "QUEUED"), [tracks]);

  const topTracks = useMemo(() => {
    return tracks
      .filter(t => t.status === "EVALUATED")
      .map(t => ({
        ...t,
        avgScore: evaluations[t.id] || 0
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3);
  }, [tracks, evaluations]);

  // Audio Normalization Setup
  useEffect(() => {
    if (!enableNormalization || !audioRef.current) {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
         // We don't necessarily want to close it, just disconnect the compressor
         compressorRef.current?.disconnect();
         sourceRef.current?.disconnect();
         sourceRef.current?.connect(audioCtxRef.current.destination);
      }
      return;
    }

    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }

    if (!sourceRef.current && audioRef.current) {
      sourceRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
    }

    if (!compressorRef.current) {
      compressorRef.current = audioCtxRef.current.createDynamicsCompressor();
      // Standard "Night Mode" / Normalization settings
      compressorRef.current.threshold.setValueAtTime(-24, audioCtxRef.current.currentTime);
      compressorRef.current.knee.setValueAtTime(30, audioCtxRef.current.currentTime);
      compressorRef.current.ratio.setValueAtTime(12, audioCtxRef.current.currentTime);
      compressorRef.current.attack.setValueAtTime(0.003, audioCtxRef.current.currentTime);
      compressorRef.current.release.setValueAtTime(0.25, audioCtxRef.current.currentTime);
    }

    if (sourceRef.current && compressorRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current.connect(compressorRef.current);
      compressorRef.current.connect(audioCtxRef.current.destination);
    }

    if (audioCtxRef.current.state === 'suspended') {
      const resume = () => audioCtxRef.current?.resume();
      window.addEventListener('click', resume, { once: true });
    }
  }, [enableNormalization, playingTrack]);

  // Derived media info for the current track
  const media = useMemo(() => {
    if (!playingTrack) return null;
    return getMediaInfo(playingTrack.url, playingTrack.filePath);
  }, [playingTrack]);

  const handleColorChange = async (color: string) => {
    setAccentColor(color);
    emit("THEME_UPDATED", { slug: initialSession.slug, accentColor: color });
    await updateAccentColor(color);
    toast.success("Theme synchronized");
  };

  const togglePause = () => {
    const newState = !isStreamPaused;
    setIsStreamPaused(newState);
    const newStatus = newState ? "PAUSED" : "ACTIVE";
    
    // Sync with DB
    updateSessionStatus(initialSession.slug, newStatus);
    
    if (newState) {
      emit("QUEUE_PAUSED", { slug: initialSession.slug });
      toast.info("Stream paused");
    } else {
      emit("QUEUE_RESUMED", { slug: initialSession.slug });
      toast.success("Stream resumed");
    }
  };

  const handleAddCriteria = async () => {
    if (!newCriteriaName.trim()) return;
    try {
      const result = await addCriterion(newCriteriaName, initialSession.id);
      if (result.success && result.criterion) {
        setCriteria(prev => [...prev, result.criterion!]);
        setNewCriteriaName("");
        toast.success("Criterion added");
      } else {
        toast.error(result.error || "Failed to add criterion");
      }
    } catch (error) {
      console.error("Criteria error:", error);
      toast.error("An unexpected error occurred while adding criterion.");
    }
  };


  const handleSavePreset = async () => {
    const name = prompt("Enter a name for this preset:");
    if (!name) return;
    const result = await saveCriteriaPreset(name, initialSession.id);
    if (result.success) {
      setPresets(prev => [...prev, { id: result.preset!.id, name: result.preset!.name }]);
      toast.success("Preset saved successfully");
    }
  };

  const handleLoadPreset = async (id: string) => {
    const result = await loadCriteriaPreset(id, initialSession.id);
    if (result.success) {
      toast.success("Preset loaded. Refreshing...");
      router.refresh();
    }
  };


  // setPlaying and handleNext moved up for correct declaration order


  const handleSubmitEvaluation = async () => {
    if (!playingTrack || isSubmitting) return;
    if (Object.keys(scores).length < criteria.length) {
      toast.error("Please rate all criteria.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitEvaluation(playingTrack.id, scores);
      if (result.success) {
        const averageScore = Object.values(scores).reduce((a, b) => a + b, 0) / criteria.length;
        emit("track_evaluated", { 
          slug: initialSession.slug,
          trackId: playingTrack.id, 
          title: playingTrack.title, 
          averageScore 
        });

        // Update state locally
        setEvaluations(prev => ({ ...prev, [playingTrack.id]: averageScore }));
        
        setTracks(prev => {
          const updated = prev.map(t => t.id === playingTrack.id ? { ...t, status: "EVALUATED" as const } : t);
          return updated;
        });
        
        toast.success(`Evaluation saved: ${averageScore.toFixed(1)}/10`);
      }
    } catch (error) {
      toast.error("Failed to save evaluation.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "Enter" && playingTrack) {
        // Only submit if all criteria are filled, otherwise it would just show the error toast
        handleSubmitEvaluation();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playingTrack, scores, criteria.length, isSubmitting, handleSubmitEvaluation]);

  const handleStartDuel = async () => {
    toast.info("Duel Mode is coming soon! Stay tuned.");
    return;
    /*
    const top2 = tracks.filter(t => t.status === "QUEUED")
      .sort((a, b) => {
        if (a.isPaid && !b.isPaid) return -1;
        if (!a.isPaid && b.isPaid) return 1;
        return 0;
      }).slice(0, 2);

    if (top2.length < 2) return toast.error("Not enough tracks for a duel.");

    setSessionMode("DUEL");
    setDuelTracks(top2);
    setDuelVotes({ track1Percent: 50, track2Percent: 50, track1Votes: 0, track2Votes: 0, total: 0 });
    emit("SESSION_MODE_CHANGED", { slug: initialSession.slug, mode: "DUEL", tracks: top2 });
    await updateSessionSettings(initialSession.id, { sessionMode: "DUEL" } as any);
    */
  };

  const handleFinishDuel = async (winnerId: string, loserId: string) => {
    setIsSubmitting(true);
    try {
       await submitEvaluation(winnerId, { "duel-win": 10 });
       await skipTrack(loserId, "Eliminated in Duel");

       setTracks(prev => prev.map(t => {
         if (t.id === winnerId) return { ...t, status: "EVALUATED" as const };
         if (t.id === loserId) return { ...t, status: "SKIPPED" as const };
         return t;
       }));
       
       setSessionMode("STANDARD");
       setDuelTracks([]);
       emit("SESSION_MODE_CHANGED", { slug: initialSession.slug, mode: "STANDARD" });
       await updateSessionSettings(initialSession.id, { sessionMode: "STANDARD" } as any);
       router.refresh();
       toast.success("Duel Finished!");
    } catch (e) {
       toast.error("Failed to finish duel");
    } finally {
       setIsSubmitting(false);
    }
  };

  const handleCancelDuel = async () => {
     setSessionMode("STANDARD");
     setDuelTracks([]);
     emit("SESSION_MODE_CHANGED", { slug: initialSession.slug, mode: "STANDARD" });
     await updateSessionSettings(initialSession.id, { sessionMode: "STANDARD" } as any);
  };

  const handleUpdatePlatforms = async (newPlatforms: string[]) => {
    setAllowedPlatforms(newPlatforms);
    await updateSessionSettings(initialSession.id, { allowedPlatforms: newPlatforms });
  };

  const handleUpdateNormalization = async (val: boolean) => {
    setEnableNormalization(val);
    await updateSessionSettings(initialSession.id, { enableNormalization: val });
    toast.success(`Normalization ${val ? "enabled" : "disabled"}`);
  };

  const handleUpdateAutoAdvance = async (val: boolean) => {
    setAutoAdvance(val);
    await updateSessionSettings(initialSession.id, { autoAdvance: val });
    toast.success(`Auto-advance ${val ? "enabled" : "disabled"}`);
  };

  const handleUpdateTrackLimit = async (val: number | null) => {
    setTrackLimit(val);
    await updateSessionSettings(initialSession.id, { trackLimit: val });
    toast.success(`Track limit set to ${val || "∞"}`);
  };

  const handleUpdateSubOnly = async (val: boolean) => {
    setSubOnly(val);
    await updateSessionSettings(initialSession.id, { subOnly: val });
    toast.success(`Sub-Only Mode ${val ? "enabled" : "disabled"}`);
  };

  const handleUpdatePaidOnly = async (val: boolean) => {
    setPaidOnly(val);
    await updateSessionSettings(initialSession.id, { paidOnly: val });
    toast.success(`Paid-Only Mode ${val ? "enabled" : "disabled"}`);
  };

  const handleUpdateMinDonation = async (val: number) => {
    setMinDonation(val);
    await updateSessionSettings(initialSession.id, { minDonation: val });
  };

  const handleUpdateShowBpm = async (val: boolean) => {
    setShowBpm(val);
    await updateSessionSettings(initialSession.id, { showBpmOnOverlay: val });
    emit("SETTINGS_UPDATED", { slug: initialSession.slug, settings: overlaySettings, showBpmOnOverlay: val });
    toast.success(`BPM Display ${val ? "enabled" : "disabled"}`);
  };

  const handleUpdateShowKey = async (val: boolean) => {
    setShowKey(val);
    await updateSessionSettings(initialSession.id, { showKeyOnOverlay: val });
    emit("SETTINGS_UPDATED", { slug: initialSession.slug, settings: overlaySettings, showKeyOnOverlay: val });
    toast.success(`Key Display ${val ? "enabled" : "disabled"}`);
  };

  const handleUpdateOverlaySettings = async (newSettings: Record<string, boolean>) => {
    setOverlaySettings(newSettings);
    await updateOverlaySettings(initialSession.slug, newSettings);
    emit("SETTINGS_UPDATED", { slug: initialSession.slug, settings: newSettings });
  };

  const handleUpdateTheme = async (theme: string) => {
    setOverlayTheme(theme);
    await updateSessionSettings(initialSession.id, { overlayTheme: theme } as any);
    emit("THEME_UPDATED", { slug: initialSession.slug, theme });
    toast.success(`Theme changed to ${theme}`);
  };

  return (
    <div className="space-y-12 pb-24">
      <DashboardHeader 
        session={initialSession}
        tracks={tracks}
        playingTrackId={playingTrack?.id || null}
        accentColor={accentColor}
        isStreamPaused={isStreamPaused}
        togglePause={togglePause}
        endSession={(id) => endSession(id).then(() => router.push("/"))}
        sessionTime={sessionTime}
        locale={locale}
        onToggleAnalytics={() => { setShowAnalytics(!showAnalytics); setShowSettings(false); }}
        onToggleSettings={() => { setShowSettings(!showSettings); setShowAnalytics(false); }}
        onToggleWallet={() => router.push(`/${locale}/settings?tab=wallet`)}
        onToggleGuide={() => setShowGuide(!showGuide)}
        showAnalytics={showAnalytics}
        showSettings={showSettings}
        showGuide={showGuide}
      />

      <AnimatePresence>
        {showAnalytics && (
           <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
             <div className="pb-10">
               <AnalyticsDashboard 
                 tracks={tracks}
                 evaluations={evaluations}
                 donations={initialSession.donations}
                 accentColor={accentColor}
               />
               
               {topTracks.length > 0 && (
                 <div className="pt-20 border-t border-zinc-100 dark:border-zinc-900 flex flex-col items-center gap-10">
                   <div className="text-center space-y-2">
                     <h2 className="text-2xl font-black uppercase tracking-tighter">Session Champions</h2>
                     <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Share this summary with your community</p>
                   </div>
                   <SessionSummaryCard 
                     session={initialSession}
                     topTracks={topTracks}
                     accentColor={accentColor}
                   />
                 </div>
               )}
             </div>
           </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
             <DashboardSettings 
               initialSession={initialSession}
               accentColor={accentColor}
               onColorChange={handleColorChange}
               enableNormalization={enableNormalization}
               onNormalizationChange={handleUpdateNormalization}
               allowedPlatforms={allowedPlatforms}
               onPlatformsChange={handleUpdatePlatforms}
               autoAdvance={autoAdvance}
               onAutoAdvanceChange={handleUpdateAutoAdvance}
               trackLimit={trackLimit}
               onTrackLimitChange={handleUpdateTrackLimit}
               subOnly={subOnly}
               onSubOnlyChange={handleUpdateSubOnly}
               showBpm={showBpm}
               onShowBpmChange={handleUpdateShowBpm}
               showKey={showKey}
               onShowKeyChange={handleUpdateShowKey}
               overlaySettings={overlaySettings}
               onOverlaySettingsChange={handleUpdateOverlaySettings}
               overlayTheme={overlayTheme}
               onOverlayThemeChange={handleUpdateTheme}
               paidOnly={paidOnly}
               onPaidOnlyChange={handleUpdatePaidOnly}
               minDonation={minDonation}
               onMinDonationChange={handleUpdateMinDonation}
             />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGuide && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-10">
            <div className="glass p-10 rounded-[2.5rem] border border-purple-500/20 bg-purple-500/5 space-y-8">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Quick Setup Guide</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { step: "01", title: "Setup OBS", desc: "Add the OBS Source URL as a Browser Source in OBS." },
                  { step: "02", title: "Invite Fans", desc: "Share your Submit Page link in your chat or bio." },
                  { step: "03", title: "Listen & Rate", desc: "Rate tracks to auto-advance and update the overlay." }
                ].map((item) => (
                  <div key={item.step} className="space-y-2">
                    <span className="text-xl font-black text-purple-600/30">{item.step}</span>
                    <h4 className="font-bold text-xs uppercase tracking-widest">{item.title}</h4>
                    <p className="text-[10px] text-zinc-500 font-bold">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          {sessionMode === "DUEL" ? (
             <DuelPanel 
               tracks={duelTracks}
               duelVotes={duelVotes}
               onFinishDuel={handleFinishDuel}
               onCancelDuel={handleCancelDuel}
               accentColor={accentColor}
               isSubmitting={isSubmitting}
             />
          ) : (
             <EvaluationPanel 
               playingTrack={playingTrack}
               criteria={criteria}
               scores={scores}
               setScores={setScores}
               activeTab={activeTab}
               setActiveTab={setActiveTab}
               media={media}
               audioRef={audioRef}
               handleTrackEnd={handleTrackEnd}
               handleSubmitEvaluation={handleSubmitEvaluation}
               handleNext={handleNext}
               handleSkip={() => {
                 const reason = prompt("Reason for skip:");
                 if (reason) skipTrack(playingTrack!.id, reason).then(() => router.refresh());
               }}
               isSubmitting={isSubmitting}
               accentColor={accentColor}
               chatVote={playingTrack ? chatVotes[playingTrack.id] : null}
               autoAdvance={autoAdvance}
             />
          )}

          <section className="glass p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-black uppercase tracking-widest mb-6">Queue <span style={{ color: accentColor }}>Focus Points</span></h2>
            <div className="flex gap-4 mb-6">
              <input type="text" value={newCriteriaName} onChange={(e) => setNewCriteriaName(e.target.value)} placeholder="New focus point..." className="flex-1 glass px-6 py-3 rounded-2xl outline-none text-sm" />
              <button onClick={handleAddCriteria} className="px-8 py-3 rounded-2xl text-white font-black text-xs uppercase" style={{ backgroundColor: accentColor }}>Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {criteria.map(c => (
                <div key={c.id} className="flex items-center gap-2 pl-4 pr-2 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold">
                  {c.name}
                  <button onClick={() => removeCriterion(c.id).then(r => r.success && setCriteria(p => p.filter(x => x.id !== c.id)))} className="ml-2 h-6 w-6 rounded-lg hover:bg-red-500 hover:text-white transition-all opacity-50 hover:opacity-100">&times;</button>
                </div>
              ))}
              {criteria.length > 0 && <button onClick={handleSavePreset} className="px-4 py-2 rounded-2xl border border-dashed border-zinc-300 text-[10px] font-black uppercase tracking-widest ml-4">Save Preset</button>}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4">
          <ActiveQueue 
            tracks={tracks}
            setTracks={setTracks}
            setPlaying={setPlaying}
            accentColor={accentColor}
            trackLimit={trackLimit}
            onStartDuel={handleStartDuel}
          />
        </div>
      </div>
    </div>
  );
}

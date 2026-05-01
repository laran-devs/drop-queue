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
import { ListRestart, Save, LayoutTemplate, BarChart2, Settings as SettingsIcon, Headphones, Volume2, VolumeX, CheckCircle, ExternalLink, Info } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { updateSessionSettings } from "@/app/actions/update-session-settings";
import { getTracksForSession, startTrack, bumpTrack } from "@/app/actions/track-actions";
import { updateAccentColor } from "@/app/actions/user-actions";
import { PLATFORMS } from "@/lib/validations";
import { useLocale, useTranslations } from "next-intl";
import { getMediaInfo } from "@/lib/media";

import { DashboardHeader } from "./dashboard/DashboardHeader";
import { ActiveQueue } from "./dashboard/ActiveQueue";
import { EvaluationPanel } from "./dashboard/EvaluationPanel";
import { DashboardSettings } from "./dashboard/DashboardSettings";
import { SessionSummaryCard } from "./dashboard/SessionSummaryCard";
import { HallOfFameWidget } from "./dashboard/HallOfFameWidget";
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
  const t = useTranslations("Dashboard");
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
  const [pendingSettings, setPendingSettings] = useState<Set<string>>(new Set());
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
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  // Sync privacy mode with localStorage
  useEffect(() => {
    const saved = localStorage.getItem("privacy_mode");
    if (saved) setIsPrivacyMode(saved === "true");
  }, []);

  const togglePrivacyMode = () => {
    const newVal = !isPrivacyMode;
    setIsPrivacyMode(newVal);
    localStorage.setItem("privacy_mode", newVal.toString());
    toast.info(newVal ? t("privacyModeEnabled") : t("privacyModeDisabled"), {
      icon: newVal ? "🛡️" : "👁️"
    });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    setCurrentTime(e.currentTarget.currentTime);
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    setDuration(e.currentTarget.duration);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name !== "AbortError") {
              console.error("Playback error:", error);
            }
          });
        }
      }
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

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
    toast.success(`${label} ${t("copied")}!`);
  };

  const [isGuideDismissed, setIsGuideDismissed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("guide_dismissed");
    if (saved) setIsGuideDismissed(saved === "true");
  }, []);

  const handleDismissGuide = () => {
    setIsGuideDismissed(true);
    localStorage.setItem("guide_dismissed", "true");
  };

  const setPlaying = useCallback((trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      emit("track_playing", { 
        slug: initialSession.slug, 
        trackId, 
        title: track.title,
        trackNumber: track.order,
        submitterName: track.submitter?.name || t("anonymous"),
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
  }, [emit, initialSession.slug, tracks, t]);

  const handleNext = useCallback(() => {
    const nextTrack = tracks.find(t => t.status === "QUEUED");
    if (nextTrack) {
      setPlaying(nextTrack.id);
    } else {
      setTracks(prev => prev.map(t => t.status === "PLAYING" ? { ...t, status: "EVALUATED" as const } : t));
      toast.info(t("noMoreTracks"));
    }
  }, [tracks, setPlaying, t]);

  const handleTrackEnd = useCallback(() => {
    toast.info(t("trackFinished"), { icon: "🏁" });
  }, [t]);

  // Handle Real-Time Updates (New Tracks)
  useEffect(() => {
    const cleanup = on("TRACK_ADDED", async (data: { title: string }) => {
      toast.info(`${t("newTrackSubmitted")}: ${data.title}`, {
        icon: "🎵",
        duration: 5000,
      });

      // Fetch the latest tracks
      const result = await getTracksForSession(initialSession.id);
      if (result.success && result.tracks) {
        setTracks(result.tracks as any);
      }
    });

    // Chat Vote listener
    const cleanupVotes = on("CHAT_VOTE_UPDATE", (data: { trackId: string; avg: number; total: number }) => {
      setChatVotes(prev => ({ ...prev, [data.trackId]: { avg: data.avg, total: data.total } }));
    });

    // Auto-Advance listener
    const cleanupAuto = on("AUTO_PREPARE_NEXT", (data: { trackId: string }) => {
      toast.info(t("autoAdvancing"), { duration: 3000 });
      setPlaying(data.trackId);
    });

    return () => {
      if (cleanup) cleanup();
      if (cleanupVotes) cleanupVotes();
      if (cleanupAuto) cleanupAuto();
    };
  }, [on, initialSession.id, setPlaying, t]);

  useEffect(() => {
    emit("queue_updated", { slug: initialSession.slug, tracks });
  }, [tracks, emit, initialSession.slug]);

  useEffect(() => {
    const cleanup = on("NOTIFICATION", (data: { type: string; message: string }) => {
      if (data.type === "NEW_TRACK") {
        toast.message(t("newTrackSubmission"), { description: data.message, icon: "🎵" });
        router.refresh(); 
        getTracksForSession(initialSession.id).then(res => {
          if (res.success && res.tracks) setTracks(res.tracks as any);
        });
      }

      if (data.type === "DONATION_BUMP") {
        toast.success(data.message || t("donationBump"), { icon: "💰", duration: 8000 });
        getTracksForSession(initialSession.id).then(res => {
          if (res.success && res.tracks) setTracks(res.tracks as any);
        });
      }
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [on, router, initialSession.id, t]);

  const playingTrack = useMemo(() => tracks.find(t => t.status === "PLAYING"), [tracks]);
  const queuedTracks = useMemo(() => tracks.filter(t => t.status === "QUEUED"), [tracks]);

  const evaluationsMemo = useMemo(() => {
     // Local evaluations state
     return evaluations;
  }, [evaluations]);

  const topTracks = useMemo(() => {
    return tracks
      .filter(t => t.status === "EVALUATED")
      .map(t => ({
        ...t,
        avgScore: evaluationsMemo[t.id] || 0
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3);
  }, [tracks, evaluationsMemo]);

  // Audio Normalization Setup
  useEffect(() => {
    if (!enableNormalization || !audioRef.current) {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
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
    updateSessionStatus(initialSession.slug, newStatus);
    if (newState) {
      emit("QUEUE_PAUSED", { slug: initialSession.slug });
      toast.info(t("streamPaused"));
    } else {
      emit("QUEUE_RESUMED", { slug: initialSession.slug });
      toast.success(t("streamResumed"));
    }
  };

  const handleAddCriteria = async () => {
    if (!newCriteriaName.trim()) return;
    try {
      const result = await addCriterion(newCriteriaName, initialSession.id);
      if (result.success && result.criterion) {
        setCriteria(prev => [...prev, result.criterion!]);
        setNewCriteriaName("");
        toast.success(t("criterionAdded"));
      } else {
        toast.error(result.error || "Failed to add criterion");
      }
    } catch (error) {
      toast.error("An unexpected error occurred while adding criterion.");
    }
  };

  const handleSavePreset = async () => {
    const name = prompt("Enter a name for this preset:");
    if (!name) return;
    const result = await saveCriteriaPreset(name, criteria.map(c => c.name));
    if (result.success) {
      setPresets(prev => [...prev, { id: result.preset!.id, name: result.preset!.name }]);
      toast.success(t("presetSaved"));
    }
  };

  const handleLoadPreset = async (id: string) => {
    const result = await loadCriteriaPreset(id, initialSession.id);
    if (result.success) {
      toast.success(t("presetLoaded"));
      router.refresh();
    }
  };

  const handleSubmitEvaluation = useCallback(async () => {
    if (!playingTrack || isSubmitting) return;
    if (Object.keys(scores).length < criteria.length) {
      toast.error(t("rateAll"));
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

        setEvaluations(prev => ({ ...prev, [playingTrack.id]: averageScore }));
        setTracks(prev => prev.map(t => t.id === playingTrack.id ? { ...t, status: "EVALUATED" as const } : t));
        toast.success(`${t("evalSaved")}: ${averageScore.toFixed(1)}/10`);
      }
    } catch (error) {
      toast.error("Failed to save evaluation.");
    } finally {
      setIsSubmitting(false);
    }
  }, [playingTrack, isSubmitting, scores, criteria, initialSession.slug, emit, t]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Enter" && playingTrack) handleSubmitEvaluation();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playingTrack, handleSubmitEvaluation]);

  const handleUpdatePlatforms = async (newPlatforms: string[]) => {
    setAllowedPlatforms(newPlatforms);
    await updateSessionSettings(initialSession.id, { allowedPlatforms: newPlatforms });
  };

  const handleUpdateNormalization = async (val: boolean) => {
    setPendingSettings(prev => new Set(prev).add("normalization"));
    setEnableNormalization(val);
    const res = await updateSessionSettings({ sessionId: initialSession.id, data: { enableNormalization: val } });
    if (!res.success) {
      setEnableNormalization(!val);
      toast.error(res.error);
    }
    setPendingSettings(prev => {
      const next = new Set(prev);
      next.delete("normalization");
      return next;
    });
  };

  const handleUpdateAutoAdvance = async (val: boolean) => {
    setPendingSettings(prev => new Set(prev).add("autoAdvance"));
    setAutoAdvance(val);
    const res = await updateSessionSettings({ sessionId: initialSession.id, data: { autoAdvance: val } });
    if (!res.success) {
      setAutoAdvance(!val);
      toast.error(res.error);
    }
    setPendingSettings(prev => {
      const next = new Set(prev);
      next.delete("autoAdvance");
      return next;
    });
  };

  const handleUpdateTrackLimit = async (val: number | null) => {
    setPendingSettings(prev => new Set(prev).add("trackLimit"));
    setTrackLimit(val);
    const res = await updateSessionSettings({ sessionId: initialSession.id, data: { trackLimit: val } });
    if (!res.success) {
      setTrackLimit(initialSession.trackLimit);
      toast.error(res.error);
    }
    setPendingSettings(prev => {
      const next = new Set(prev);
      next.delete("trackLimit");
      return next;
    });
  };

  const handleUpdateSubOnly = async (val: boolean) => {
    setPendingSettings(prev => new Set(prev).add("subOnly"));
    setSubOnly(val);
    const res = await updateSessionSettings({ sessionId: initialSession.id, data: { subOnly: val } });
    if (!res.success) {
      setSubOnly(!val);
      toast.error(res.error);
    }
    setPendingSettings(prev => {
      const next = new Set(prev);
      next.delete("subOnly");
      return next;
    });
  };

  const handleUpdatePaidOnly = async (val: boolean) => {
    setPendingSettings(prev => new Set(prev).add("paidOnly"));
    setPaidOnly(val);
    const res = await updateSessionSettings({ sessionId: initialSession.id, data: { paidOnly: val } });
    if (!res.success) {
      setPaidOnly(!val);
      toast.error(res.error);
    }
    setPendingSettings(prev => {
      const next = new Set(prev);
      next.delete("paidOnly");
      return next;
    });
  };

  const handleUpdateMinDonation = async (val: number) => {
    setPendingSettings(prev => new Set(prev).add("minDonation"));
    setMinDonation(val);
    const res = await updateSessionSettings({ sessionId: initialSession.id, data: { minDonation: val } });
    if (!res.success) {
      setMinDonation(initialSession.minDonation || 50);
      toast.error(res.error);
    }
    setPendingSettings(prev => {
      const next = new Set(prev);
      next.delete("minDonation");
      return next;
    });
  };

  const handleUpdateShowBpm = async (val: boolean) => {
    setPendingSettings(prev => new Set(prev).add("showBpm"));
    setShowBpm(val);
    const res = await updateSessionSettings({ sessionId: initialSession.id, data: { showBpmOnOverlay: val } });
    if (res.success) {
      emit("SETTINGS_UPDATED", { slug: initialSession.slug, settings: overlaySettings, showBpmOnOverlay: val });
    } else {
      setShowBpm(!val);
      toast.error(res.error);
    }
    setPendingSettings(prev => {
      const next = new Set(prev);
      next.delete("showBpm");
      return next;
    });
  };

  const handleUpdateShowKey = async (val: boolean) => {
    setPendingSettings(prev => new Set(prev).add("showKey"));
    setShowKey(val);
    const res = await updateSessionSettings({ sessionId: initialSession.id, data: { showKeyOnOverlay: val } });
    if (res.success) {
      emit("SETTINGS_UPDATED", { slug: initialSession.slug, settings: overlaySettings, showKeyOnOverlay: val });
    } else {
      setShowKey(!val);
      toast.error(res.error);
    }
    setPendingSettings(prev => {
      const next = new Set(prev);
      next.delete("showKey");
      return next;
    });
  };

  const handleUpdateOverlaySettings = async (newSettings: Record<string, boolean>) => {
    const oldSettings = overlaySettings;
    setOverlaySettings(newSettings);
    const res = await updateOverlaySettings(initialSession.slug, newSettings);
    if (res.success) {
      emit("SETTINGS_UPDATED", { slug: initialSession.slug, settings: newSettings });
    } else {
      setOverlaySettings(oldSettings);
      toast.error("Failed to update overlay settings");
    }
  };

  const handleUpdateTheme = async (theme: string) => {
    setPendingSettings(prev => new Set(prev).add("overlayTheme"));
    const oldTheme = overlayTheme;
    setOverlayTheme(theme);
    const res = await updateSessionSettings({ sessionId: initialSession.id, data: { overlayTheme: theme } });
    if (res.success) {
      emit("THEME_UPDATED", { slug: initialSession.slug, theme });
      toast.success(`Theme changed to ${theme}`);
    } else {
      setOverlayTheme(oldTheme);
      toast.error(res.error);
    }
    setPendingSettings(prev => {
      const next = new Set(prev);
      next.delete("overlayTheme");
      return next;
    });
  };

  return (
    <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-10 pb-24">
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
        isPrivacyMode={isPrivacyMode}
        onTogglePrivacy={togglePrivacyMode}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        togglePlay={togglePlay}
        onSeek={handleSeek}
        onToggleAnalytics={() => { 
          const next = !showAnalytics;
          setShowAnalytics(next); 
          if (next) {
            setShowSettings(false); 
            setShowGuide(false);
          }
        }}
        onToggleSettings={() => { 
          const next = !showSettings;
          setShowSettings(next); 
          if (next) {
            setShowAnalytics(false); 
            setShowGuide(false);
          }
        }}
        onToggleWallet={() => router.push(`/${locale}/settings?tab=wallet`)}
        onToggleGuide={() => {
          const next = !showGuide;
          setShowGuide(next);
          if (next) {
            setShowAnalytics(false);
            setShowSettings(false);
          }
        }}
        showAnalytics={showAnalytics}
        showSettings={showSettings}
        showGuide={showGuide}
      />

      <audio 
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onEnded={handleTrackEnd}
        crossOrigin="anonymous"
        src={media?.url || undefined}
      />

      <AnimatePresence>
        {showAnalytics && (
           <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
             <div className="pb-10">
               <AnalyticsDashboard 
                 tracks={tracks}
                 evaluations={evaluationsMemo}
                 donations={initialSession.donations}
                 accentColor={accentColor}
                 isPrivacyMode={isPrivacyMode}
               />
               
               {topTracks.length > 0 && (
                 <div className="pt-20 border-t border-zinc-100 dark:border-zinc-900 flex flex-col items-center gap-10">
                   <div className="text-center space-y-2">
                     <h2 className="text-2xl font-black uppercase tracking-tighter">{t("sessionChampions")}</h2>
                     <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t("shareSummary")}</p>
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
               pendingFields={pendingSettings}
             />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGuide && !isGuideDismissed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-10 group relative">
            <div className="glass p-10 rounded-[2.5rem] border border-purple-500/20 bg-purple-500/5 space-y-8">
              <div className="flex items-center justify-between">
                 <h2 className="text-2xl font-black uppercase tracking-tighter">{t("quickSetup")}</h2>
                 <button onClick={handleDismissGuide} className="h-10 px-4 rounded-xl border border-purple-500/10 hover:bg-purple-500/10 text-[10px] font-black uppercase tracking-widest transition-all">
                    {t("dismiss")}
                 </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { step: "01", title: t("setupObs"), desc: t("setupObsDesc") },
                  { step: "02", title: t("linkBot"), desc: t("linkBotDesc") },
                  { step: "03", title: t("spreadWord"), desc: t("spreadWordDesc") },
                ].map((s, i) => (
                  <div key={i} className="space-y-2">
                    <span className="text-3xl font-black text-purple-600/20">{s.step}</span>
                    <h3 className="font-bold uppercase tracking-tight">{s.title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed font-medium">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          skipTrack(playingTrack!.id, "skipped").then(() => router.refresh());
        }}
        isSubmitting={isSubmitting}
        accentColor={accentColor}
        chatVote={playingTrack ? chatVotes[playingTrack.id] : null}
        autoAdvance={autoAdvance}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        togglePlay={togglePlay}
        onSeek={handleSeek}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <HallOfFameWidget />
        <ActiveQueue 
          tracks={tracks}
          setTracks={setTracks}
          setPlaying={setPlaying}
          accentColor={accentColor}
          trackLimit={trackLimit}
        />
      </div>
    </div>
  );
}

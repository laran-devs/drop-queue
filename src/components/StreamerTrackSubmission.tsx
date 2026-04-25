"use client";

import { useSocket } from "@/hooks/use-socket";
import { submitTrack } from "@/app/actions/submit-track";
import { StreamSession } from "@prisma/client";
import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AudioUploadZone } from "./AudioUploadZone";
import { Link2, Music, CheckCircle2, Zap, User } from "lucide-react";
import { ViewerQueueStatus } from "./ViewerQueueStatus";

interface StreamerTrackSubmissionProps {
  session: StreamSession & { streamer: { name: string | null; image: string | null; accentColor: string } };
  user: { id?: string; name?: string | null; email?: string | null; image?: string | null } | null;
}

export function StreamerTrackSubmission({ session, user }: StreamerTrackSubmissionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionType, setSubmissionType] = useState<"LINK" | "FILE">("LINK");
  const [uploadedFile, setUploadedFile] = useState<{ url: string; bpm?: number; key?: string } | null>(null);
  const [isPriority, setIsPriority] = useState(false);
  const { emit } = useSocket(undefined, session.slug);
  const accentColor = session.streamer.accentColor;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to submit a track.");
      return;
    }

    if (submissionType === "FILE" && !uploadedFile) {
      toast.error("Please upload an audio file first.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.append("sessionId", session.id);
    formData.append("trackType", submissionType);
    formData.append("isPriority", isPriority.toString());
    if (uploadedFile) {
      formData.append("filePath", uploadedFile.url);
      if (uploadedFile.bpm) formData.append("bpm", String(uploadedFile.bpm));
      if (uploadedFile.key) formData.append("key", uploadedFile.key);
    }

    try {
      const result = await submitTrack(formData);
      if (result.success) {
        if (result.paymentUrl) {
          toast.success("Redirecting to payment...");
          window.location.href = result.paymentUrl;
          return;
        }

        if (result.isBacklog) {
          toast.warning("Added to Backlog!", {
            description: "Your track is beyond the streamer's energy limit and might not be evaluated this stream.",
            duration: 10000,
            icon: "⚠️"
          });
        } else {
          toast.success("Track submitted successfully!");
        }
        
        emit("new_track", { slug: session.slug, title: formData.get("title") });
        (e.target as HTMLFormElement).reset();
        setUploadedFile(null);
        setIsPriority(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit track.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-10 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl relative overflow-hidden"
    >
      <div className="absolute -top-24 -right-24 h-64 w-64 blur-[100px] rounded-full opacity-10" style={{ backgroundColor: accentColor }} />
      
      <div className="relative z-10 space-y-8">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="relative h-20 w-20 mx-auto">
              {session.streamer.image ? (
                <img 
                  src={session.streamer.image} 
                  alt={session.streamer.name || "Streamer"} 
                  referrerPolicy="no-referrer"
                  className="h-full w-full rounded-[2rem] border-4 border-white dark:border-zinc-900 shadow-2xl object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      const fallback = parent.querySelector('.avatar-fallback');
                      if (fallback) (fallback as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div 
                className="avatar-fallback h-full w-full rounded-[2rem] border-4 border-white dark:border-zinc-900 shadow-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400"
                style={{ display: session.streamer.image ? 'none' : 'flex' }}
              >
                <User size={32} />
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-lg bg-green-500 border-2 border-white dark:border-zinc-900 shadow-sm flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Stream Submission Portal</span>
            <h1 className="text-4xl font-black tracking-tight">{session.streamer.name}&apos;s Queue</h1>
            <p className="text-zinc-500 text-sm font-medium">{session.title}</p>
          </div>
        </div>

        {session.allowDirectUploads && (
          <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
            <button
              onClick={() => setSubmissionType("LINK")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${submissionType === "LINK" ? "bg-white dark:bg-zinc-800 shadow-sm" : "opacity-50 hover:opacity-100"}`}
            >
              <Link2 size={14} />
              Streaming Link
            </button>
            <button
              onClick={() => setSubmissionType("FILE")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${submissionType === "FILE" ? "bg-white dark:bg-zinc-800 shadow-sm" : "opacity-50 hover:opacity-100"}`}
            >
              <Music size={14} />
              Direct Upload
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2 mb-2 block">Track Title</label>
              <input
                name="title"
                required
                placeholder="Name of the banger..."
                className="w-full glass px-6 py-4 rounded-2xl outline-none border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 transition-all"
              />
            </div>

            <AnimatePresence mode="wait">
              {submissionType === "LINK" ? (
                <motion.div
                  key="link"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2 block">Streaming Link</label>
                    <div className="flex flex-wrap gap-2 pr-2">
                      {session.allowedPlatforms.map(p => (
                        <span key={p} className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <input
                    name="url"
                    required={submissionType === "LINK"}
                    type="url"
                    placeholder="https://..."
                    className="w-full glass px-6 py-4 rounded-2xl outline-none border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 transition-all"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="file"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-3"
                >
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2 block">Audio File</label>
                  {uploadedFile ? (
                    <div className="glass p-6 rounded-2xl border border-green-500/30 flex items-center gap-4 bg-green-500/5">
                      <div className="h-10 w-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                        <CheckCircle2 size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold truncate">File ready for submission!</p>
                        <p className="text-[10px] opacity-70 uppercase font-black">
                          {uploadedFile.bpm ? `BPM: ${uploadedFile.bpm} ` : ""}
                          {uploadedFile.key ? `| KEY: ${uploadedFile.key}` : ""}
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setUploadedFile(null)}
                        className="text-[10px] font-black uppercase text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <AudioUploadZone 
                      sessionId={session.id}
                      maxSizeMB={session.maxAudioFileSize}
                      onUploadComplete={setUploadedFile} 
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2 mb-2 block">Tell the streamer about it (Optional)</label>
              <textarea
                name="description"
                rows={2}
                placeholder="Context, vibe, or special requests..."
                className="w-full glass px-6 py-4 rounded-2xl outline-none border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 transition-all resize-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2 mb-2 block">Lyrics (Optional)</label>
              <textarea
                name="lyrics"
                rows={4}
                placeholder="Paste lyrics here for the streamer to read along..."
                className="w-full glass px-6 py-4 rounded-2xl outline-none border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 transition-all resize-none"
              />
            </div>

            {/* Priority Bump Option */}
            <div 
              onClick={() => setIsPriority(!isPriority)}
              className={`relative flex items-center p-6 rounded-3xl border-2 transition-all cursor-pointer group overflow-hidden ${
                isPriority 
                  ? "border-purple-500 bg-purple-500/5 shadow-lg shadow-purple-500/10" 
                  : "border-zinc-100 dark:border-zinc-900 hover:border-zinc-200 dark:hover:border-zinc-800"
              }`}
            >
              <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12">
                <Zap size={60} fill="currentColor" />
              </div>
              
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 group-hover:scale-110 transition-transform">
                <input
                  type="checkbox"
                  checked={isPriority}
                  onChange={(e) => setIsPriority(e.target.checked)}
                  className="h-5 w-5 rounded-lg border-zinc-300 text-purple-600 focus:ring-purple-600 cursor-pointer accent-purple-600"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="ml-5 flex-1 min-w-0">
                <label className="font-black text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-widest">
                  Priority Bump 🚀
                  <span className="inline-flex items-center rounded-lg bg-yellow-400/20 px-2 py-0.5 text-[8px] font-black text-yellow-600 uppercase">
                    + 50 RUB
                  </span>
                </label>
                <p className="text-[10px] text-zinc-500 font-bold mt-0.5">Jump to the front of the queue automatically.</p>
              </div>
              <Zap size={16} className={`transition-all ${isPriority ? "text-purple-600 scale-125" : "text-zinc-300 opacity-20"}`} />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (submissionType === "FILE" && !uploadedFile)}
            className="w-full py-5 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: accentColor, boxShadow: `0 15px 30px -10px ${accentColor}66` }}
          >
            {isSubmitting ? "Sending to Queue..." : "Drop in Queue"}
          </button>
        </form>

        <p className="text-center text-[10px] text-zinc-400 italic">
          {submissionType === "LINK" ? "Tip: Make sure the link is public!" : "Tip: High quality MP3/WAV preferred!"}
        </p>

        <div className="pt-8 border-t border-zinc-100 dark:border-zinc-900">
           <ViewerQueueStatus 
             sessionId={session.id} 
             slug={session.slug} 
             userId={user?.id}
             accentColor={accentColor} 
           />
        </div>
      </div>
    </motion.div>
  );
}

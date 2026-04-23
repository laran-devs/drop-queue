"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, FileAudio, Loader2, Zap } from "lucide-react";
import { analyzeAudio } from "@/lib/audio-analysis";

interface AudioUploadZoneProps {
  onUploadComplete: (data: { url: string; bpm?: number; key?: string }) => void;
  maxSizeMB: number;
  sessionId: string;
}

export function AudioUploadZone({ onUploadComplete, maxSizeMB, sessionId }: AudioUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [analysis, setAnalysis] = useState<{ bpm: number; key: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      toast.error("Please upload an audio file (MP3, WAV, etc.)");
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File is too large. Max size: ${maxSizeMB}MB`);
      return;
    }

    setIsUploading(true);
    
    // Perform Analysis
    let audioIntel: { bpm: number; key: string } | undefined;
    try {
      audioIntel = await analyzeAudio(file);
      setAnalysis(audioIntel);
    } catch (err) {
      console.warn("Audio analysis failed, proceeding without metadata:", err);
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("sessionId", sessionId);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      toast.success("Audio analyzed and uploaded!");
      onUploadComplete({ 
        url: data.url, 
        bpm: audioIntel?.bpm, 
        key: audioIntel?.key 
      });
    } catch (error) {
      console.error("Upload error:", error);
      const message = error instanceof Error ? error.message : "Failed to upload file";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative group cursor-pointer
          glass border-2 border-dashed rounded-[2rem] p-12
          transition-all duration-300 flex flex-col items-center justify-center gap-4
          ${dragActive ? "border-purple-600 bg-purple-500/10 scale-[1.02]" : "border-zinc-200 dark:border-zinc-800 hover:border-purple-600/50"}
          ${isUploading ? "pointer-events-none opacity-50" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />

        <div className={`
          h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-500
          ${dragActive ? "bg-purple-600 text-white rotate-12" : "bg-purple-500/10 text-purple-600 group-hover:scale-110 group-hover:-rotate-3"}
        `}>
          {isUploading ? (
            <Loader2 className="animate-spin" size={32} />
          ) : (
            <Upload size={32} />
          )}
        </div>

        <div className="text-center">
          <p className="text-sm font-bold tracking-tight mb-1">
            {isUploading ? "Uploading piece of art..." : "Drop your audio here"}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
            or click to browse files
          </p>
        </div>

        {isUploading && (
          <div className="absolute bottom-0 left-0 h-1 w-full bg-purple-600 animate-pulse rounded-full overflow-hidden" />
        )}
      </div>

      <div className="flex justify-center items-center gap-4">
        <div className="flex items-center gap-1.5">
           <FileAudio size={12} className="text-zinc-400" />
           <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            MP3, WAV, OGG up to <span className="text-zinc-900 dark:text-zinc-100">{maxSizeMB}MB</span>
           </p>
        </div>
      </div>
    </div>
  );
}

import { z } from "zod";

export const sessionConfigSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(50),
  description: z.string().max(200).optional(),
  maxTracksPerUser: z.number().min(1).max(50).default(1),
  maxAudioFileSize: z.number().min(1).max(100).default(50),
  allowedPlatforms: z.array(z.string()).min(1, "Select at least one platform"),
  allowDirectUploads: z.boolean().default(false),
  overlayTheme: z.string().default("DEFAULT"),
  enableHighScoreSound: z.boolean().default(false),
});

export type SessionConfig = z.infer<typeof sessionConfigSchema>;

export const PLATFORMS = [
  { id: "youtube", name: "YouTube", icon: "📺", pattern: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/ },
  { id: "spotify", name: "Spotify", icon: "🎵", pattern: /^(https?:\/\/)?(open\.spotify\.com)\/(track|album|playlist)\/.+$/ },
  { id: "soundcloud", name: "SoundCloud", icon: "☁️", pattern: /^(https?:\/\/)?(soundcloud\.com)\/.+$/ },
  { id: "yandex", name: "Yandex Music", icon: "💎", pattern: /^(https?:\/\/)?(music\.yandex\.(ru|com))\/.+$/ },
  { id: "vk", name: "VK Music", icon: "💙", pattern: /^(https?:\/\/)?(vk\.com)\/(audio|music)\/.+$/ },
  { id: "applemusic", name: "Apple Music", icon: "🍎", pattern: /^(https?:\/\/)?(music\.apple\.com)\/.+$/ },
  { id: "bandcamp", name: "Bandcamp", icon: "🎸", pattern: /^(https?:\/\/)?([\w-]+\.bandcamp\.com)\/(track|album)\/.+$/ },
];

export const trackSubmissionSchema = z.object({
  title: z.string().min(1, "Track title is required"),
  url: z.string().url("Invalid link format").optional(),
  filePath: z.string().optional(),
  trackType: z.enum(["LINK", "FILE"]).default("LINK"),
  description: z.string().max(300).optional(),
  lyrics: z.string().optional(),
  sessionId: z.string(),
  bpm: z.number().optional(),
  key: z.string().optional(),
}).refine(data => data.url || data.filePath, {
  message: "Either a link or an audio file must be provided.",
  path: ["url"]
});

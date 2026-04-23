import 'dotenv/config';

import { createServer } from "http";
import { parse } from "url";
// Forced restart: 2026-04-23 13:51
import next from "next";
import { Server } from "socket.io";
// Relative path to the prisma client singleton
import prisma from "./src/lib/prisma";

import tmi from "tmi.js";
import { verifySocketSession } from "./src/lib/socket-auth";
import { refreshTwitchToken } from "./src/lib/twitch-auth";


const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Twitch Bot Manager
const bots = new Map<string, tmi.Client>();
const botRetries = new Map<string, number>();
const MAX_RETRIES = 3;

async function startBot(userId: string, channel: string, accessToken: string) {
  if (bots.has(userId)) return;

  const client = new tmi.Client({
    options: { debug: true },
    connection: {
      reconnect: true,
      maxRetries: MAX_RETRIES
    },
    identity: {
      username: channel,
      password: `oauth:${accessToken}`
    },
    channels: [channel]
  });

  client.on('message', async (chan, tags, message, self) => {
    if (self) return;
    if (message.toLowerCase() === '!queue' || message.toLowerCase() === '!drop' || message.toLowerCase() === '!submit') {
      try {
        const urlRoot = process.env.NEXTAUTH_URL || `http://${hostname}:${port}`;
        const activeTrack = await prisma.track.findFirst({
          where: {
            status: 'PLAYING',
            session: {
              streamerId: userId,
              status: 'ACTIVE'
            }
          },
          include: {
            session: { select: { slug: true } }
          }
        });

        const activeSession = await prisma.streamSession.findFirst({
          where: { streamerId: userId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" }
        });

        if (activeTrack) {
          client.say(chan, `🎵 Now Playing: "${activeTrack.title}" | Drop your tracks here: ${urlRoot}/stream/${activeTrack.session.slug}`);
        } else if (activeSession) {
          const statusSuffix = activeSession.status === "PAUSED" ? " (Currently PAUSED)" : "";
          client.say(chan, `📭 Queue is ${activeSession.status.toLowerCase()}${statusSuffix}. Join the stage here: ${urlRoot}/stream/${activeSession.slug}`);
        } else {
          client.say(chan, `😴 No active session right now. Follow for notifications!`);
        }
      } catch (err) {
        console.error("Bot command error:", err);
      }
    }

    if (message.toLowerCase() === '!current') {
      try {
        const activeTrack = await prisma.track.findFirst({
          where: {
            status: 'PLAYING',
            session: { streamerId: userId, status: 'ACTIVE' }
          },
          include: { submitter: { select: { name: true } } }
        });

        if (activeTrack) {
          client.say(chan, `🎧 Current Track: "${activeTrack.title}"${activeTrack.submitter?.name ? ` sent by ${activeTrack.submitter.name}` : ''}${activeTrack.bpm ? ` | BPM: ${activeTrack.bpm}` : ''}`);
        } else {
          client.say(chan, "🎧 No track is currently playing.");
        }
      } catch (err) {
        console.error("Bot !current error:", err);
      }
    }

    if (message.toLowerCase() === '!top') {
      try {
        const topTracks = await prisma.track.findMany({
          where: {
            session: { streamerId: userId, status: 'ACTIVE' },
            status: 'EVALUATED'
          },
          include: { evaluations: true },
          take: 3
        });

        const scored = topTracks.map(t => ({
          title: t.title,
          score: t.evaluations.reduce((acc, e) => acc + e.score, 0) / t.evaluations.length
        })).sort((a, b) => b.score - a.score);

        if (scored.length > 0) {
          const list = scored.map((t, i) => `${i + 1}. ${t.title} (${t.score.toFixed(1)})`).join(' | ');
          client.say(chan, `🏆 Current Session Leaders: ${list}`);
        } else {
          client.say(chan, "🏆 No tracks rated highly enough yet!");
        }
      } catch (err) {
        console.error("Bot !top error:", err);
      }
    }

    if (message.toLowerCase() === '!position' || message.toLowerCase() === '!mypos') {
      try {
        const chatterLogin = tags.username?.toLowerCase();
        if (!chatterLogin) return;

        const activeSession = await prisma.streamSession.findFirst({
          where: { streamerId: userId, status: { in: ["ACTIVE", "PAUSED"] } },
          orderBy: { createdAt: "desc" }
        });

        if (!activeSession) {
          return client.say(chan, `@${tags.username}, there is no active session right now.`);
        }

        const userTrack = await prisma.track.findFirst({
          where: { 
            sessionId: activeSession.id,
            submitter: { twitchLogin: chatterLogin },
            status: 'QUEUED'
          }
        });

        if (!userTrack) {
          return client.say(chan, `@${tags.username}, you don't have any tracks in the current queue.`);
        }

        // Calculate exact position based on priority and submission time
        const allQueued = await prisma.track.findMany({
          where: { sessionId: activeSession.id, status: 'QUEUED' },
          select: { id: true },
          orderBy: [
            { isPaid: 'desc' },
            { submittedAt: 'asc' }
          ]
        });

        const myIndex = allQueued.findIndex(t => t.id === userTrack.id);
        client.say(chan, `@${tags.username}, your track "${userTrack.title}" is at position #${myIndex + 1} in the queue! 🎵`);
      } catch (err) {
        console.error("Bot !position error:", err);
      }
    }

    // Chat Evaluation logic (4.4)
    const ratingMatch = message.match(/^(\d+)(\/10)?$/);
    if (ratingMatch) {
      const score = parseInt(ratingMatch[1]);
      if (score >= 1 && score <= 10) {
        const slug = streamerActiveSessions.get(userId);
        const trackId = slug ? sessionActiveTrackId.get(slug) : null;
        
        if (slug && trackId) {
          const votes = sessionChatVotes.get(trackId) || [];
          
          // One vote per user per track
          if (!votes.find(v => v.user === tags.username)) {
            votes.push({ user: tags.username!, score });
            sessionChatVotes.set(trackId, votes);
            
            // Broadcast the new consensus to the dashboard
            const avg = votes.reduce((a, b) => a + b.score, 0) / votes.length;
            io.to(`${slug}:streamer`).emit("CHAT_VOTE_UPDATE", { 
              trackId, 
              avg, 
              total: votes.length 
            });
          }
        }
      }
    }
  });

  try {
    console.log(`[TwitchBot] Attempting to connect to #${channel}...`);
    await client.connect();
    bots.set(userId, client);
    botRetries.set(userId, 0); 
    console.log(`[TwitchBot] ✅ Connected to #${channel} as the streamer.`);
  } catch (err) {
    const currentRetries = botRetries.get(userId) || 0;
    const msg = err.message || err;
    console.error(`[TwitchBot] ❌ Failed to connect for #${channel}:`, msg);
    
    if (currentRetries < MAX_RETRIES) {
      botRetries.set(userId, currentRetries + 1);
      const delay = Math.pow(2, currentRetries) * 2000;
      console.log(`[TwitchBot] Retrying #${channel} in ${delay}ms...`);
      
      // AUTO-REPAIR: If it's a login failure, try to refresh the token first
      setTimeout(async () => {
        let tokenToUse = null;
        
        if (msg.includes("Login authentication failed")) {
          console.log(`[TwitchBot] 🔄 Attempting token refresh for #${channel}...`);
          tokenToUse = await refreshTwitchToken(userId);
        }

        if (!tokenToUse) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { accounts: { where: { provider: 'twitch' } } }
          });
          tokenToUse = user?.accounts[0]?.access_token;
        }

        if (tokenToUse) {
          startBot(userId, channel, tokenToUse);
        } else {
          console.error(`[TwitchBot] ❌ Could not recover token for #${channel}.`);
        }
      }, delay);
    } 
  }
}

// Map to track chat votes for the current playing track in each session
const sessionChatVotes = new Map<string, Array<{ user: string; score: number }>>();

/**
 * AUTO-RECOVERY: Automatically restart Twitch bots for all active sessions
 */
async function autoRestoreBots() {
  console.log("[TwitchBot] 🛡️ Starting auto-recovery for active sessions...");
  try {
    const activeSessions = await prisma.streamSession.findMany({
      where: { status: "ACTIVE" },
      include: { 
        streamer: { 
          include: { 
            accounts: { where: { provider: 'twitch' } } 
          } 
        } 
      }
    });

    console.log(`[TwitchBot] Found ${activeSessions.length} active sessions to restore.`);

    for (const session of activeSessions) {
      const { streamer } = session;
      if (streamer.twitchLogin && streamer.accounts[0]?.access_token) {
        // We don't await this to keep the loop moving
        startBot(streamer.id, streamer.twitchLogin, streamer.accounts[0].access_token);
      }
    }
  } catch (err) {
    console.error("[TwitchBot] ❌ Error during auto-recovery:", err);
  }
}

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => {
    if (!req.url) return;
    const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${req.headers.host}`;
    const parsedUrl = new URL(req.url, baseUrl);
    handle(req, res, {
      pathname: parsedUrl.pathname,
      query: Object.fromEntries(parsedUrl.searchParams)
    } as any);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || (dev ? true : false),
      methods: ["GET", "POST"],
      credentials: true
    },
  });

  (global as any).io = io;

  // Socket.io Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const cookieString = socket.handshake.headers.cookie;
      const user = await verifySocketSession(cookieString);
      
      if (user) {
        (socket as any).user = user;
        console.log(`[SocketAuth] User authenticated: ${user.name} (${user.userId})`);
        return next();
      }

      // Check for read-only overlay access via token
      const token = socket.handshake.query.token as string;
      if (token) {
        const session = await prisma.streamSession.findUnique({
          where: { overlayToken: token }
        });
        if (session) {
          (socket as any).isReadOnlyOverlay = true;
          (socket as any).sessionSlug = session.slug;
          console.log(`[SocketAuth] Overlay authenticated via token for session: ${session.slug}`);
          return next();
        }
      }

      // Allow unauthenticated connections (viewers) but they will be restricted
      console.log(`[SocketAuth] Unauthenticated connection: ${socket.id}`);
      next();
    } catch (error) {
      console.error("[SocketAuth] Critical error in middleware:", error);
      next(); // Ensure we don't hang the connection
    }
  });


  // Track connected streamers and their pending disconnect timeouts
  const streamerSockets = new Map<string, string>(); // userId -> socketId
  const streamerActiveSessions = new Map<string, string>(); // userId -> slug
  const sessionActiveTrackId = new Map<string, string>(); // slug -> trackId
  const pendingDisconnects = new Map<string, NodeJS.Timeout>(); // userId -> Timeout

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join a specific session room (for viewers and overlay)
    socket.on("join_session", (slug: string) => {
      // Security: If read-only overlay, ensure they only join their assigned room
      if ((socket as any).isReadOnlyOverlay) {
        if ((socket as any).sessionSlug !== slug) {
          console.warn(`[Socket] Read-only overlay ${socket.id} attempted to join unauthorized room: ${slug}`);
          return;
        }
        socket.join(`${slug}:overlay`);
        console.log(`Socket ${socket.id} (Overlay) joined room: ${slug}:overlay`);
      } else {
        socket.join(slug);
        console.log(`Socket ${socket.id} (Viewer) joined room: ${slug}`);
      }
    });

    // Streamer identifies themselves after connection
    socket.on("identify_streamer", async ({ userId, slug }: { userId: string, slug: string }) => {
      const authUser = (socket as any).user;

      // SECURITY: Verify that the authenticated user matches the self-identified userId
      if (!authUser || authUser.userId !== userId) {
        console.error(`[Socket] Security Violation: Unauthenticated or mismatched streamer identification attempt! Socket: ${socket.id}, Claimed ID: ${userId}, Authed ID: ${authUser?.userId}`);
        socket.emit("ERROR", { message: "Streamer authentication failed. Please refresh the page." });
        return;
      }

      // If there's a pending disconnect for this streamer, cancel it
      if (pendingDisconnects.has(userId)) {
        console.log(`Streamer ${userId} reconnected. Cancelling pause timeout.`);
        clearTimeout(pendingDisconnects.get(userId)!);
        pendingDisconnects.delete(userId);
      }
      
      streamerSockets.set(userId, socket.id);
      streamerActiveSessions.set(userId, slug);
      socket.join(`${slug}:streamer`);
      console.log(`Streamer ${userId} identified for session ${slug} (joined room ${slug}:streamer)`);


      // Start Twitch Bot for this streamer
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { accounts: { where: { provider: 'twitch' } } }
        });

        if (user?.twitchLogin && user.accounts[0]?.access_token) {
          await startBot(userId, user.twitchLogin, user.accounts[0].access_token);
        } else {
          console.warn(`[TwitchBot] Skipping bot start for ${userId}: Missing twitchLogin or access_token in database.`);
        }
      } catch (err) {
        console.error("[TwitchBot] Error in identify_streamer handler:", err);
      }
    });

    // Requirement: Grace Period for Disconnect Logic
    socket.on("disconnect", async () => {
      let discUserId: string | null = null;
      for (const [uId, sId] of streamerSockets.entries()) {
        if (sId === socket.id) {
          discUserId = uId;
          break;
        }
      }

      if (discUserId) {
        const slug = streamerActiveSessions.get(discUserId);
        const timeout = setTimeout(async () => {
          try {
            await prisma.streamSession.updateMany({
              where: { streamerId: discUserId!, status: "ACTIVE" },
              data: { status: "PAUSED" },
            });

            const bot = bots.get(discUserId!);
            if (bot) {
              await bot.disconnect();
              bots.delete(discUserId!);
            }

            if (slug) io.to(slug).emit("QUEUE_PAUSED", { streamerId: discUserId });
            streamerSockets.delete(discUserId!);
            streamerActiveSessions.delete(discUserId!);
            pendingDisconnects.delete(discUserId!);
          } catch (error) {
            console.error("Disconnect error:", error);
          }
        }, 45000); // 45 seconds Grace Period

        pendingDisconnects.set(discUserId, timeout);
      }
    });

    // When a track becomes "Playing Now", push a notification to the session room.
    socket.on("track_playing", async (data: { slug: string; trackId: string; title: string; submitterName?: string }) => {
      // SECURITY: Verify streamer identity
      const streamerId = streamerSockets.has((socket as any).user?.userId) ? (socket as any).user.userId : null;
      if (!streamerId || streamerActiveSessions.get(streamerId) !== data.slug) {
        console.warn(`[Socket Security] Unauthorized track_playing attempt from ${socket.id}`);
        return;
      }

      console.log(`Broadcasting 'Playing Now' in room ${data.slug}`);
      
      // Update active track for voting
      sessionActiveTrackId.set(data.slug, data.trackId);
      sessionChatVotes.set(data.trackId, []); // New track starts with 0 votes
      const track = await prisma.track.findUnique({
        where: { id: data.trackId },
        select: { bpm: true, key: true, isPaid: true }
      });

      // Notify viewers and overlays
      io.to(data.slug).to(`${data.slug}:overlay`).emit("NOTIFICATION", {
        type: "PLAYING_NOW",
        trackId: data.trackId,
        title: data.title,
        bpm: track?.bpm,
        key: track?.key,
        isPaid: track?.isPaid,
        submitterName: data.submitterName,
        message: `Currently playing: ${data.title}`
      });

      // Chat Announcement
      const bot = bots.get(streamerId);
      if (bot) {
        const channel = bot.getOptions().channels?.[0];
        if (channel) {
          bot.say(channel, `🎵 Now Playing: "${data.title}"${data.submitterName ? ` sent by ${data.submitterName}` : ''}. Add your tracks at ${process.env.NEXTAUTH_URL}/stream/${data.slug}`);
        }
      }
    });

    // When a new track is added, notify the session dashboard and update overlays
    socket.on("new_track", async (data: { slug: string; title: string }) => {
      console.log(`New track submitted for session ${data.slug}: ${data.title}`);
      
      // 1. Notify Dashboard (Streamer room)
      io.to(`${data.slug}:streamer`).emit("TRACK_ADDED", { 
        title: data.title,
        message: `New track: ${data.title}`
      });

      // 2. Notify Overlay (Update "Up Next")
      const tracks = await prisma.track.findMany({
        where: { session: { slug: data.slug } },
        select: { title: true, status: true, isPaid: true },
        orderBy: { submittedAt: "asc" }
      });
      io.to(`${data.slug}:overlay`).emit("queue_updated", { tracks });

      // 3. Notify Viewers
      io.to(data.slug).emit("NOTIFICATION", {
        type: "NEW_TRACK",
        title: data.title,
        message: `New track: ${data.title}!`
      });
    });

    // When a theme color is updated, notify session overlays
    socket.on("THEME_UPDATED", (data: { slug: string; accentColor: string }) => {
      // SECURITY: Verify streamer identity
      const streamerId = (socket as any).user?.userId;
      if (!streamerId || streamerActiveSessions.get(streamerId) !== data.slug) return;

      console.log(`Theme updated for session ${data.slug}`);
      io.to(data.slug).to(`${data.slug}:overlay`).emit("THEME_UPDATED", data);
    });

    // When a track is evaluated, notify session viewers and overlays
    socket.on("track_evaluated", async (data: { slug: string; trackId: string; title: string; averageScore: number }) => {
      // SECURITY: Verify streamer identity
      const streamerId = (socket as any).user?.userId;
      if (!streamerId || streamerActiveSessions.get(streamerId) !== data.slug) return;

      console.log(`Evaluation results in room ${data.slug}`);
      
      // Clear chat votes for this track
      sessionChatVotes.delete(data.trackId);

      io.to(data.slug).to(`${data.slug}:overlay`).emit("NOTIFICATION", {
        type: "TRACK_EVALUATED",
        trackId: data.trackId,
        title: data.title,
        score: data.averageScore,
        message: `${data.title} scored ${data.averageScore.toFixed(1)}/10`
      });

      // 🔥 Chat Announcement & BANGER ALERT!
      const bot = bots.get(streamerId);
      if (bot) {
        const channel = bot.getOptions().channels?.[0];
        if (channel) {
          if (data.averageScore >= 9.0) {
            bot.say(channel, `🔥 BANGER ALERT! "${data.title}" just scored a massive ${data.averageScore.toFixed(1)}/10! 🏆`);
          } else {
            bot.say(channel, `📝 Result: "${data.title}" scored ${data.averageScore.toFixed(1)}/10.`);
          }
        }
      }

      // Check for AUTO-ADVANCE (3.1)
      const session = await prisma.streamSession.findUnique({
        where: { slug: data.slug },
        include: { tracks: { where: { status: "QUEUED" }, orderBy: { order: "asc" }, take: 1 } }
      });

      if (session?.autoAdvance && session.tracks.length > 0) {
        const nextTrack = session.tracks[0];
        console.log(`[AutoAdvance] Advancing to next track: ${nextTrack.title}`);
        io.to(`${data.slug}:streamer`).emit("AUTO_PREPARE_NEXT", { trackId: nextTrack.id });
      }
    });

    // Handle incoming chat score from dashboard (finalized consensus)
    socket.on("SAVE_CHAT_SCORE", async (data: { trackId: string; score: number }) => {
      const streamerId = (socket as any).user?.userId;
      if (!streamerId) return;

      await prisma.track.update({
        where: { id: data.trackId },
        data: { chatScore: data.score }
      });
      console.log(`[ChatScore] Saved consensus for ${data.trackId}: ${data.score}`);
    });

    // When the queue is reordered or changed
    socket.on("queue_updated", (data: { slug: string; tracks: { id: string; title: string; order: number }[] }) => {
      // SECURITY: Verify streamer identity
      const streamerId = (socket as any).user?.userId;
      if (!streamerId || streamerActiveSessions.get(streamerId) !== data.slug) return;
      
      io.to(data.slug).to(`${data.slug}:overlay`).emit("queue_updated", data);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io server initialized and connected to Next.js`);
    
    // Run auto-recovery in the background so it doesn't block the site startup
    autoRestoreBots().catch(err => console.error("[TwitchBot] Auto-recovery background error:", err));
  });
}).catch((err) => {
  console.error("Error during server initialization:", err);
  process.exit(1);
});

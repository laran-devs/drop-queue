import 'dotenv/config';

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
// Redis adapter and clients
import { createAdapter } from "@socket.io/redis-adapter";
import { redis, pubClient, subClient } from "./src/lib/redis";

// Relative path to the prisma client singleton
import prisma from "./src/lib/prisma";
import { archiveStaleSessions, cleanupOrphanedFiles } from "./src/lib/maintenance";

import { verifySocketSession } from "./src/lib/socket-auth";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    const { pathname } = parsedUrl;

    // Handle static uploads manually to bypass Next.js production cache
    if (pathname?.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", pathname);
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        res.writeHead(200, {
          "Content-Type": "audio/mpeg",
          "Content-Length": stat.size,
        });
        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
        return;
      }
    }

    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || (dev ? true : false),
      methods: ["GET", "POST"],
      credentials: true
    },
  });

  // Attach Redis Adapter for horizontal scaling
  io.adapter(createAdapter(pubClient, subClient));
  (global as any).io = io;

  // Listen to cross-process socket events (from bot-worker)
  subClient.subscribe("socket:broadcast");
  subClient.on("message", (channel, message) => {
    if (channel === "socket:broadcast") {
      try {
        const payload = JSON.parse(message);
        io.to(payload.room).emit(payload.event, payload.data);
      } catch(e) {
        console.error("Failed to parse cross-process socket event", e);
      }
    }
  });

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

      console.log(`[SocketAuth] Unauthenticated connection: ${socket.id}`);
      next();
    } catch (error) {
      console.error("[SocketAuth] Critical error in middleware:", error);
      next(); 
    }
  });

  // Keep sockets in local memory so node knows to disconnect
  const streamerSockets = new Map<string, string>(); 
  const pendingDisconnects = new Map<string, NodeJS.Timeout>(); 

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join_session", (slug: string) => {
      if ((socket as any).isReadOnlyOverlay) {
        if ((socket as any).sessionSlug !== slug) {
          console.warn(`[Socket] Read-only overlay ${socket.id} attempted to join unauthorized room: ${slug}`);
          return;
        }
        socket.join(`${slug}:overlay`);
      } else {
        socket.join(slug);
      }
    });

    socket.on("identify_streamer", async ({ userId, slug }: { userId: string, slug: string }) => {
      const authUser = (socket as any).user;

      if (!authUser || authUser.userId !== userId) {
        socket.emit("ERROR", { message: "Streamer authentication failed. Please refresh the page." });
        return;
      }

      if (pendingDisconnects.has(userId)) {
        clearTimeout(pendingDisconnects.get(userId)!);
        pendingDisconnects.delete(userId);
      }
      
      streamerSockets.set(userId, socket.id);
      
      // Save global state in Redis instead of local Maps
      await redis.hset("active_sessions", userId, slug);
      
      socket.join(`${slug}:streamer`);
      console.log(`Streamer ${userId} identified for session ${slug} (joined room ${slug}:streamer)`);

      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { accounts: { where: { provider: 'twitch' } } }
        });

        if (user?.twitchLogin && user.accounts[0]?.access_token) {
          // Tell the Worker to start the bot
          await pubClient.publish("bot:events", JSON.stringify({
            type: "START",
            userId: userId,
            channel: user.twitchLogin,
            token: user.accounts[0].access_token
          }));
        }
      } catch (err) {
        console.error("Error in identify_streamer handler:", err);
      }
    });

    socket.on("disconnect", async () => {
      let discUserId: string | null = null;
      for (const [uId, sId] of Array.from(streamerSockets.entries())) {
        if (sId === socket.id) {
          discUserId = uId;
          break;
        }
      }

      if (discUserId) {
        const slug = await redis.hget("active_sessions", discUserId);
        const timeout = setTimeout(async () => {
          try {
            await prisma.streamSession.updateMany({
              where: { streamerId: discUserId!, status: "ACTIVE" },
              data: { status: "PAUSED" },
            });

            // Tell the worker to stop the bot
            await pubClient.publish("bot:events", JSON.stringify({ type: "STOP", userId: discUserId }));

            if (slug) io.to(slug).emit("QUEUE_PAUSED", { streamerId: discUserId });
            
            streamerSockets.delete(discUserId!);
            await redis.hdel("active_sessions", discUserId!);
            pendingDisconnects.delete(discUserId!);
          } catch (error) {
            console.error("Disconnect error:", error);
          }
        }, 45000); // 45 seconds Grace Period

        pendingDisconnects.set(discUserId, timeout);
      }
    });

    socket.on("track_playing", async (data: { 
      slug: string; 
      trackId: string; 
      title: string; 
      trackNumber?: number;
      submitterName?: string;
      bpm?: number;
      key?: string;
      isPaid?: boolean;
    }) => {
      const streamerId = streamerSockets.has((socket as any).user?.userId) ? (socket as any).user.userId : null;
      const cachedSlug = streamerId ? await redis.hget("active_sessions", streamerId) : null;
      
      if (!streamerId || cachedSlug !== data.slug) return;

      // Update active track in Redis
      await redis.hset("active_tracks", data.slug, data.trackId);
      
      const track = await prisma.track.findUnique({
        where: { id: data.trackId },
        select: { 
           bpm: true, key: true, isPaid: true, 
           submitter: { select: { submissions: { select: { evaluations: { select: { score: true } } } } } } 
        }
      });
      
      let rankBadge = null;
      if (track?.submitter) {
         const evals = track.submitter.submissions.flatMap(s => s.evaluations);
         if (evals.length > 0) {
            const avg = evals.reduce((a,e) => a + e.score, 0) / evals.length;
            if (avg >= 8.5) rankBadge = "👑 Banger Maker";
            else if (avg >= 6.0) rankBadge = "⭐ Tastemaker";
            else if (avg < 4.0) rankBadge = "🤡 Troll";
         }
      }

      await prisma.streamSession.update({
        where: { slug: data.slug },
        data: { status: "ACTIVE" },
      });

      io.to(data.slug).to(`${data.slug}:overlay`).emit("NOTIFICATION", {
        type: "PLAYING_NOW",
        title: data.title,
        trackNumber: data.trackNumber,
        submitterName: data.submitterName ? `${data.submitterName} ${rankBadge ? `[${rankBadge}]` : ""}` : undefined,
        trackId: data.trackId,
        bpm: track?.bpm,
        key: track?.key,
        isPaid: track?.isPaid,
        message: `Currently playing: ${data.title}`
      });

      // Announce in chat via bot worker
      const user = await prisma.user.findUnique({ where: { id: streamerId } });
      if (user?.twitchLogin) {
        await pubClient.publish("bot:events", JSON.stringify({
          type: "SAY",
          userId: streamerId,
          channel: user.twitchLogin,
          message: `🎵 Now Playing: "${data.title}"${data.submitterName ? ` sent by ${data.submitterName}` : ''}. Add your tracks at ${process.env.NEXTAUTH_URL}/stream/${data.slug}`
        }));
      }
    });

    socket.on("new_track", async (data: { slug: string; title: string }) => {
      io.to(`${data.slug}:streamer`).emit("TRACK_ADDED", { 
        title: data.title,
        message: `New track: ${data.title}`
      });

      const tracks = await prisma.track.findMany({
        where: { session: { slug: data.slug } },
        select: { title: true, status: true, isPaid: true },
        orderBy: { submittedAt: "asc" }
      });
      io.to(`${data.slug}:overlay`).emit("queue_updated", { tracks });

      io.to(data.slug).emit("NOTIFICATION", {
        type: "NEW_TRACK",
        title: data.title,
        message: `New track: ${data.title}!`
      });
    });

    socket.on("THEME_UPDATED", async (data: { slug: string; accentColor: string }) => {
      const streamerId = (socket as any).user?.userId;
      const cachedSlug = streamerId ? await redis.hget("active_sessions", streamerId) : null;
      if (!streamerId || cachedSlug !== data.slug) return;

      io.to(data.slug).to(`${data.slug}:overlay`).emit("THEME_UPDATED", data);
    });

    socket.on("track_evaluated", async (data: { slug: string; trackId: string; title: string; averageScore: number }) => {
      const streamerId = (socket as any).user?.userId;
      const cachedSlug = streamerId ? await redis.hget("active_sessions", streamerId) : null;
      if (!streamerId || cachedSlug !== data.slug) return;

      // Unlink voting key in Redis
      await redis.del(`track_votes:${data.trackId}`);

      io.to(data.slug).to(`${data.slug}:overlay`).emit("NOTIFICATION", {
        type: "TRACK_EVALUATED",
        trackId: data.trackId,
        title: data.title,
        score: data.averageScore,
        message: `${data.title} scored ${data.averageScore.toFixed(1)}/10`
      });

      const user = await prisma.user.findUnique({ where: { id: streamerId } });
      if (user?.twitchLogin) {
        let msg = `📝 Result: "${data.title}" scored ${data.averageScore.toFixed(1)}/10.`;
        if (data.averageScore >= 9.0) msg = `🔥 BANGER ALERT! "${data.title}" just scored a massive ${data.averageScore.toFixed(1)}/10! 🏆`;
        await pubClient.publish("bot:events", JSON.stringify({
          type: "SAY",
          userId: streamerId,
          channel: user.twitchLogin,
          message: msg
        }));
      }

      const session = await prisma.streamSession.findUnique({
        where: { slug: data.slug },
        include: { tracks: { where: { status: "QUEUED" }, orderBy: { order: "asc" }, take: 1 } }
      });

      if (session?.autoAdvance && session.tracks.length > 0) {
        const nextTrack = session.tracks[0];
        io.to(`${data.slug}:streamer`).emit("AUTO_PREPARE_NEXT", { trackId: nextTrack.id });
      }
    });

    socket.on("SAVE_CHAT_SCORE", async (data: { trackId: string; score: number }) => {
      const streamerId = (socket as any).user?.userId;
      if (!streamerId) return;

      await prisma.track.update({
        where: { id: data.trackId },
        data: { chatScore: data.score }
      });
    });

    socket.on("queue_updated", async (data: { slug: string; tracks: { id: string; title: string; order: number }[] }) => {
      const streamerId = (socket as any).user?.userId;
      const cachedSlug = streamerId ? await redis.hget("active_sessions", streamerId) : null;
      if (!streamerId || cachedSlug !== data.slug) return;
      
      io.to(data.slug).to(`${data.slug}:overlay`).emit("queue_updated", data);
    });

    socket.on("SETTINGS_UPDATED", async (data: { slug: string; settings: any; showBpmOnOverlay?: boolean; showKeyOnOverlay?: boolean }) => {
      const streamerId = (socket as any).user?.userId;
      const cachedSlug = streamerId ? await redis.hget("active_sessions", streamerId) : null;
      if (!streamerId || cachedSlug !== data.slug) return;

      io.to(data.slug).to(`${data.slug}:overlay`).emit("SETTINGS_UPDATED", data);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io server initialized with Redis adapter`);

    // Automated Maintenance (Every 6 hours)
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    setInterval(() => {
      archiveStaleSessions().catch(err => console.error("[Maintenance] Auto-archive failed:", err));
      cleanupOrphanedFiles().catch(err => console.error("[Maintenance] Auto-cleanup failed:", err));
    }, SIX_HOURS);
  });
}).catch((err) => {
  console.error("Error during server initialization:", err);
  process.exit(1);
});

import 'dotenv/config';
import tmi from "tmi.js";
import { pubClient, subClient, redis } from "./lib/redis";
import prisma from "./lib/prisma";
import { refreshTwitchToken } from "./lib/twitch-auth";

const bots = new Map<string, tmi.Client>();
const botRetries = new Map<string, number>();
const MAX_RETRIES = 3;

async function startBot(userId: string, channel: string, accessToken: string) {
  if (bots.has(userId)) return;

  const client = new tmi.Client({
    options: { debug: true },
    connection: { reconnect: true, maxReconnectAttempts: MAX_RETRIES },
    identity: { username: channel, password: `oauth:${accessToken}` },
    channels: [channel]
  });

  client.on('message', async (chan, tags, message, self) => {
    if (self) return;
    const cmd = message.toLowerCase().split(' ')[0];

    // Read streamer state from Redis
    const slug = await redis.hget("active_sessions", userId);
    const trackId = slug ? await redis.hget("active_tracks", slug) : null;
    const urlRoot = process.env.NEXTAUTH_URL || `http://localhost:3000`;

    if (cmd === '!queue' || cmd === '!drop' || cmd === '!submit' || cmd === '!tracks') {
      try {
        const activeSession = await prisma.streamSession.findFirst({
          where: { streamerId: userId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" }
        });

        if (trackId && activeSession) {
          const activeTrack = await prisma.track.findUnique({ where: { id: trackId } });
          if (activeTrack) {
            client.say(chan, `🎵 Now Playing: "${activeTrack.title}" | Drop your tracks here: ${urlRoot}/stream/${slug}${activeSession?.subOnly ? " (Sub-Only Mode!)" : ""}`);
            return;
          }
        } 
        
        if (activeSession) {
          const statusSuffix = activeSession.status === "PAUSED" ? " (Currently PAUSED)" : "";
          client.say(chan, `📭 Queue is ${activeSession.status.toLowerCase()}${statusSuffix}. Join the stage here: ${urlRoot}/stream/${slug}${activeSession.subOnly ? " (Sub-Only!)" : ""}`);
        } else {
          client.say(chan, `😴 No active session right now. Follow for notifications!`);
        }
      } catch (err) {
        console.error("Bot command error:", err);
      }
    }

    if (cmd === '!current' || cmd === '!song' || cmd === '!playing') {
      try {
        if (trackId) {
          const activeTrack = await prisma.track.findUnique({
            where: { id: trackId },
            include: { submitter: { select: { name: true } } }
          });
          if (activeTrack) {
            client.say(chan, `🎧 Current Track: "${activeTrack.title}"${activeTrack.submitter?.name ? ` sent by ${activeTrack.submitter.name}` : ''}${activeTrack.bpm ? ` | BPM: ${activeTrack.bpm}` : ''}`);
            return;
          }
        }
        client.say(chan, "🎧 No track is currently playing.");
      } catch (err) {
        console.error("Bot !current error:", err);
      }
    }

    if (cmd === '!top' || cmd === '!leaders' || cmd === '!bangers') {
      try {
        const topTracks = await prisma.track.findMany({
          where: { session: { streamerId: userId, status: 'ACTIVE' }, status: 'EVALUATED' },
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

    if (cmd === '!position' || cmd === '!mypos' || cmd === '!place') {
      try {
        const chatterLogin = tags.username?.toLowerCase();
        if (!chatterLogin) return;

        const activeSession = await prisma.streamSession.findFirst({
          where: { streamerId: userId, status: { in: ["ACTIVE", "PAUSED"] } },
          orderBy: { createdAt: "desc" }
        });

        if (!activeSession) return client.say(chan, `@${tags.username}, there is no active session right now.`);

        const userTrack = await prisma.track.findFirst({
          where: { sessionId: activeSession.id, submitter: { twitchLogin: chatterLogin }, status: 'QUEUED' }
        });

        if (!userTrack) return client.say(chan, `@${tags.username}, you don't have any tracks in the current queue.`);

        const allQueued = await prisma.track.findMany({
          where: { sessionId: activeSession.id, status: 'QUEUED' },
          select: { id: true },
          orderBy: [{ isPaid: 'desc' }, { submittedAt: 'asc' }]
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
        if (slug && trackId) {
          const voteKey = `track_votes:${trackId}`;
          // HSETNX returns 1 if new, 0 if already existed (one vote per user)
          const isNewVote = await redis.hsetnx(voteKey, tags.username!, score);
          
          if (isNewVote === 1) {
            // Set expiry for 1 hour to prevent memory leaks
            await redis.expire(voteKey, 3600);
            
            const allVotes = await redis.hgetall(voteKey);
            const votesArray = Object.values(allVotes).map(v => parseInt(v));
            const avg = votesArray.reduce((a, b) => a + b, 0) / votesArray.length;
            
            // Broadcast the new consensus via Redis PubSub
            await pubClient.publish("socket:broadcast", JSON.stringify({
              room: `${slug}:streamer`,
              event: "CHAT_VOTE_UPDATE",
              data: { trackId, avg, total: votesArray.length }
            }));
          }
        }
      }
    }
  });

  try {
    console.log(`[WorkerBot] Attempting to connect to #${channel}...`);
    await client.connect();
    bots.set(userId, client);
    botRetries.set(userId, 0); 
    console.log(`[WorkerBot] ✅ Connected to #${channel} as the streamer.`);
  } catch (err: unknown) {
    const currentRetries = botRetries.get(userId) || 0;
    const errorMsg = (err as Error).message || err;
    console.error(`[WorkerBot] ❌ Failed to connect for #${channel}:`, errorMsg);
    
    if (currentRetries < MAX_RETRIES) {
      botRetries.set(userId, currentRetries + 1);
      const delay = Math.pow(2, currentRetries) * 2000;
      console.log(`[WorkerBot] Retrying #${channel} in ${delay}ms...`);
      
      setTimeout(async () => {
        let tokenToUse = null;
        if (typeof errorMsg === 'string' && errorMsg.includes("Login authentication failed")) {
          console.log(`[WorkerBot] 🔄 Attempting token refresh for #${channel}...`);
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
          console.error(`[WorkerBot] ❌ Could not recover token for #${channel}.`);
        }
      }, delay);
    } 
  }
}

// Subscribe to commands
subClient.subscribe("bot:events", (err) => {
  if (err) console.error("Worker failed to subscribe:", err);
});

subClient.on("message", async (channel, message) => {
  if (channel === "bot:events") {
    try {
      const data = JSON.parse(message);
      if (data.type === "START") {
        await startBot(data.userId, data.channel, data.token);
      } else if (data.type === "STOP") {
        const bot = bots.get(data.userId);
        if (bot) {
          await bot.disconnect();
          bots.delete(data.userId);
          console.log(`[WorkerBot] Stopped bot for ${data.userId}`);
        }
      } else if (data.type === "SAY") {
        const bot = bots.get(data.userId);
        if (bot) bot.say(data.channel, data.message);
      }
    } catch (e) {
      console.error("Worker message parse error:", e);
    }
  }
});

// Auto Recovery logic on boot
async function autoRestoreBots() {
  console.log("[WorkerBot] 🛡️ Starting auto-recovery for active sessions...");
  try {
    const activeSessions = await prisma.streamSession.findMany({
      where: { status: "ACTIVE" },
      include: { streamer: { include: { accounts: { where: { provider: 'twitch' } } } } }
    });
    for (const session of activeSessions) {
      const { streamer } = session;
      if (streamer.twitchLogin && streamer.accounts[0]?.access_token) {
        startBot(streamer.id, streamer.twitchLogin, streamer.accounts[0].access_token);
      }
    }
  } catch (err) {
    console.error("[WorkerBot] ❌ Error during auto-recovery:", err);
  }
}

autoRestoreBots();
console.log("[WorkerBot] 🤖 Bot logic worker initialized.");

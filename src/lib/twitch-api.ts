import prisma from "./prisma";
import { refreshTwitchToken } from "./twitch-auth";

/**
 * Checks if a user is a subscriber to a broadcaster's channel.
 */
export async function isSubscriber(broadcasterId: string, userId: string): Promise<boolean> {
  // Broadcaster is always considered a sub in their own channel
  if (broadcasterId === userId) return true;

  try {
    const account = await prisma.account.findFirst({
      where: { userId: broadcasterId, provider: "twitch" }
    });

    if (!account?.access_token) return false;

    const check = async (token: string) => {
      const response = await fetch(
        `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${broadcasterId}&user_id=${userId}`,
        {
          headers: {
            "Client-ID": process.env.TWITCH_CLIENT_ID!,
            "Authorization": `Bearer ${token}`
          }
        }
      );
      return response;
    };

    let res = await check(account.access_token);

    if (res.status === 401) {
      const newToken = await refreshTwitchToken(broadcasterId);
      if (newToken) res = await check(newToken);
    }

    if (!res.ok) {
      // 404 from Twitch subscriptions endpoint means not subscribed
      if (res.status === 404) return false;
      return false;
    }

    const data = await res.json();
    return data.data && data.data.length > 0;
  } catch (error) {
    console.error("[TwitchAPI] Error checking subscription:", error);
    return false;
  }
}

/**
 * Checks if a user is a VIP in a broadcaster's channel.
 */
export async function isVip(broadcasterId: string, userId: string): Promise<boolean> {
  if (broadcasterId === userId) return true;

  try {
    const account = await prisma.account.findFirst({
      where: { userId: broadcasterId, provider: "twitch" }
    });

    if (!account?.access_token) return false;

    const check = async (token: string) => {
      const response = await fetch(
        `https://api.twitch.tv/helix/channels/vips?broadcaster_id=${broadcasterId}&user_id=${userId}`,
        {
          headers: {
            "Client-ID": process.env.TWITCH_CLIENT_ID!,
            "Authorization": `Bearer ${token}`
          }
        }
      );
      return response;
    };

    let res = await check(account.access_token);

    if (res.status === 401) {
      const newToken = await refreshTwitchToken(broadcasterId);
      if (newToken) res = await check(newToken);
    }

    if (!res.ok) return false;

    const data = await res.json();
    return data.data && data.data.length > 0;
  } catch (error) {
    console.error("[TwitchAPI] Error checking VIP status:", error);
    return false;
  }
}

/**
 * Checks if a user is a moderator in a broadcaster's channel.
 */
export async function isModerator(broadcasterId: string, userId: string): Promise<boolean> {
  if (broadcasterId === userId) return true;

  try {
    const account = await prisma.account.findFirst({
      where: { userId: broadcasterId, provider: "twitch" }
    });

    if (!account?.access_token) return false;

    const check = async (token: string) => {
      const response = await fetch(
        `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${broadcasterId}&user_id=${userId}`,
        {
          headers: {
            "Client-ID": process.env.TWITCH_CLIENT_ID!,
            "Authorization": `Bearer ${token}`
          }
        }
      );
      return response;
    };

    let res = await check(account.access_token);

    if (res.status === 401) {
      const newToken = await refreshTwitchToken(broadcasterId);
      if (newToken) res = await check(newToken);
    }

    if (!res.ok) return false;

    const data = await res.json();
    return data.data && data.data.length > 0;
  } catch (error) {
    console.error("[TwitchAPI] Error checking Moderator status:", error);
    return false;
  }
}

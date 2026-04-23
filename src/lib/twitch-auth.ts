import prisma from "./prisma";

/**
 * Refreshes a Twitch access token using the refresh_token.
 * Returns the new access token if successful.
 */
export async function refreshTwitchToken(userId: string): Promise<string | null> {
  try {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "twitch" },
    });

    if (!account?.refresh_token) {
      console.error(`[TwitchAuth] No refresh token found for user: ${userId}`);
      return null;
    }

    console.log(`[TwitchAuth] Refreshing token for user ${userId}...`);

    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID!,
        client_secret: process.env.TWITCH_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[TwitchAuth] Failed to refresh token:`, data);
      return null;
    }

    // Update the account with the new tokens
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      },
    });

    console.log(`[TwitchAuth] ✅ Token refreshed successfully for user ${userId}`);
    return data.access_token;
  } catch (error) {
    console.error(`[TwitchAuth] ❌ Error refreshing Twitch token:`, error);
    return null;
  }
}

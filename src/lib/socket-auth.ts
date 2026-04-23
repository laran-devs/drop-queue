import { parse } from "cookie";
import prisma from "./prisma";

/**
 * Verifies a Socket.io connection using the NextAuth session cookie.
 */
export async function verifySocketSession(cookieString: string | undefined) {
  if (!cookieString) {
    console.warn("[SocketAuth] No cookies found in handshake headers.");
    return null;
  }
  
  const cookies = parse(cookieString);
  const cookieKeys = Object.keys(cookies);
  
  // Debug log (non-sensitive)
  console.log(`[SocketAuth] Handshake cookies received: ${cookieKeys.join(", ") || "none"}`);

  // Support all common next-auth / authjs cookie variants
  const token = 
    cookies["next-auth.session-token"] || 
    cookies["__Secure-next-auth.session-token"] ||
    cookies["__Host-next-auth.session-token"] ||
    cookies["authjs.session-token"];
  
  if (!token) {
    console.warn("[SocketAuth] No session token found in available cookies.");
    return null;
  }
  
  try {
    // Database lookup for session token (PrismaAdapter strategy)
    const sessionWithUser = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            twitchLogin: true,
          }
        }
      }
    });

    if (!sessionWithUser) {
      console.warn(`[SocketAuth] No active session found in DB for the provided token.`);
      return null;
    }

    if (sessionWithUser.expires < new Date()) {
      console.warn(`[SocketAuth] Session has expired: ${sessionWithUser.expires}`);
      return null;
    }

    const { user } = sessionWithUser;
    console.log(`[SocketAuth] ✅ Successfully authenticated user: ${user.name}`);
    
    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      twitchLogin: user.twitchLogin,
    };
  } catch (error) {
    console.error("[SocketAuth] ❌ Error verifying session in database:", error);
    return null;
  }
}

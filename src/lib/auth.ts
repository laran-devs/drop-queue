import { NextAuthOptions } from "next-auth";
import TwitchProvider from "next-auth/providers/twitch";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    TwitchProvider({
      clientId: process.env.TWITCH_CLIENT_ID!,
      clientSecret: process.env.TWITCH_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid user:read:email chat:read chat:edit channel:read:subscriptions channel:read:vips",
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.preferred_username,
          email: profile.email,
          image: profile.picture,
          twitchLogin: profile.preferred_username?.toLowerCase(), // Important for tmi.js
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, user }: any) {
      if (session?.user) {
        session.user.id = user.id;
        session.user.twitchLogin = user.twitchLogin?.toLowerCase();
        session.user.accentColor = user.accentColor;
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // We'll handle sign-in on the landing page
  },
  secret: process.env.NEXTAUTH_SECRET,
};

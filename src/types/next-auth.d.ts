import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      twitchLogin?: string | null;
      accentColor?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    twitchLogin?: string | null;
    accentColor?: string;
  }
}

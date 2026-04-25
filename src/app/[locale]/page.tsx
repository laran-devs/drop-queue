import { getActiveSessions } from "@/app/actions/session-actions";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import LandingContent from "@/components/LandingContent";

export default async function HubPage() {
  const [sessions, session] = await Promise.all([
    getActiveSessions(),
    getServerSession(authOptions)
  ]);

  return <LandingContent sessions={sessions} session={session} />;
}

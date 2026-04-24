import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LeaderboardBasePage() {
  const session = await getServerSession(authOptions);

  // Requirement: Visible only after registration
  if (!session?.user) {
    redirect("/");
  }

  // Redirect to the dashboard sub-page
  return redirect("/dashboard/hall-of-fame");

  // Fallback if twitchLogin is somehow missing (shouldn't happen with our OAuth flow)
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Account Setup Incomplete</h1>
        <p className="text-zinc-500">Your Twitch account isn&apos;t fully linked. Please sign out and sign in again.</p>
      </div>
    </div>
  );
}

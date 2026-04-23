import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { OverlayContent } from "@/components/OverlayContent";

interface OverlayPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function OverlayPage({ params, searchParams }: OverlayPageProps) {
  const { slug } = await params;
  const { token } = await searchParams;

  const streamSession = await prisma.streamSession.findUnique({
    where: { slug },
  });

  if (!streamSession) {
    notFound();
  }

  // Security: Check if token matches
  if (!token || token !== streamSession.overlayToken) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em]">
        Access Denied: Invalid Overlay Token
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-transparent overflow-hidden">
      <OverlayContent 
        slug={streamSession.slug} 
        token={streamSession.overlayToken || ''}
        theme={streamSession.overlayTheme}
        enableSound={streamSession.enableHighScoreSound}
        showBpm={streamSession.showBpmOnOverlay}
        showKey={streamSession.showKeyOnOverlay}
      />

    </div>
  );
}

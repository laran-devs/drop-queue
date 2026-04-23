"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Link, usePathname } from "@/navigation";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { isValidIdentifier, debugUrl } from "@/lib/url-utils";
import { useEffect, useState } from "react";
import { Settings } from "lucide-react";


export function Header() {
  const pathname = usePathname();
  const locale = useLocale();
  const { data: session } = useSession();
  const t = useTranslations("Header");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    debugUrl("Header.pathname", pathname);
  }, [pathname]);

  if (!mounted) return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-100 dark:border-zinc-900 bg-white/80 dark:bg-black/80 backdrop-blur-xl">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between" />
    </header>
  );

  const isPathReady = isValidIdentifier(pathname);

  // Hide header for OBS Overlay routes
  if (pathname.includes("/overlay")) {
    return null;
  }

  return (
    <header className="border-b border-zinc-100 bg-white/80 backdrop-blur-md sticky top-0 z-50 dark:border-zinc-800 dark:bg-black/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-black dark:text-white">
              DropQueue
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            {session && (
              <Link href="/profile" className="text-sm font-medium text-zinc-600 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 transition-colors">
                My Profile
              </Link>
            )}
            {session && (
              <Link href="/dashboard" className="text-sm font-medium text-zinc-600 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 transition-colors">
                {t("hub")}
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Settings icon & Profile */}


          {session ? (
            <div className="flex items-center gap-6">
              {/* Settings Icon */}
              <Link 
                href="/settings"
                className="p-2 rounded-xl text-zinc-400 hover:text-purple-600 hover:bg-purple-500/10 transition-all"
                title="Settings"
              >
                <Settings size={20} />
              </Link>

              <div className="group flex items-center gap-3 glass pl-2 pr-6 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 hover:border-purple-500/30 transition-all cursor-pointer relative shadow-sm hover:shadow-xl hover:scale-[1.02]">

                <div className="relative h-10 w-10 shrink-0">
                  <div className="relative h-full w-full rounded-xl overflow-hidden border-2 border-white dark:border-zinc-900 shadow-inner bg-zinc-100 dark:bg-zinc-800">
                    {session.user.image && isValidIdentifier(session.user.image) ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        fill
                        className="object-cover rounded-xl"
                        sizes="40px"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black text-xs">
                        {session.user.name ? session.user.name[0]?.toUpperCase() : "U"}
                      </div>
                    )}
                  </div>
                  {/* Status Indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-lg bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  </div>
                </div>
                
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 leading-none mb-1">Streamer</span>
                  <span 
                    className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-none truncate max-w-[140px]"
                    title={session.user.name || "User"}
                  >
                    {session.user.name}
                  </span>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link 
                href="/settings"
                className="p-2 rounded-xl text-zinc-400 hover:text-purple-600 hover:bg-purple-500/10 transition-all"
                title="Settings"
              >
                <Settings size={20} />
              </Link>
              <button
                onClick={() => signIn("twitch")}
                className="flex items-center gap-2 rounded-full bg-purple-600 px-6 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-500/30 active:scale-95"
              >
                {t("signIn")}
              </button>
            </div>
          )}

        </div>
      </div>
    </header>
  );
}

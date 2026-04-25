"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/navigation";
import { signOut, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, 
  Moon, 
  Sun, 
  Monitor, 
  LogOut, 
  ChevronRight,
  Check,
  Palette,
  Bell,
  BellRing,
  TrendingUp,
  Lock, 
  Unlock, 
  Database, 
  Trash2, 
  Loader2, 
  AlertTriangle,
  User as UserIcon,
  ShieldCheck,
  Zap,
  Wallet as WalletIcon
} from "lucide-react";
import { WalletPanel } from "@/components/dashboard/WalletPanel";
import { locales } from "@/i18n/request";
import { getUserPreferences, updatePrivacyPreference, updateDonationSettings } from "@/app/actions/user-actions";
import { toast } from "sonner";
import { useNotifications } from "@/components/providers/NotificationProvider";
import { cleanupOrphanedFiles } from "@/app/actions/maintenance-actions";

const TABS = [
  { id: "general", label: "General", icon: Globe },
  { id: "privacy", label: "Privacy & Security", icon: Lock },
  { id: "wallet", label: "Wallet & Payouts", icon: WalletIcon },
  { id: "advanced", label: "Advanced", icon: Database },
  { id: "account", label: "Account", icon: UserIcon },
];

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const tHeader = useTranslations("Header");
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { sendNotification } = useNotifications();
  
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "general");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    }
    
    getUserPreferences().then(data => {
      if (data?.prefs) setIsPublic(data.prefs.isPublic);
    });
  }, []);

  const requestPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === "granted") {
        sendNotification("Notifications Enabled!", { body: "You will now receive updates about your tracks." });
      }
    }
  };

  const handleTogglePrivacy = async (val: boolean) => {
    setLoading(true);
    try {
      const result = await updatePrivacyPreference(val);
      if (result.success) {
        setIsPublic(val);
        toast.success("Privacy preferences updated");
      }
    } catch (err) {
      toast.error("Failed to update privacy");
    } finally {
      setLoading(false);
    }
  };


  const handleCleanup = async () => {
    if (!confirm("This will permanently delete all uploaded files that are not linked to any track. Proceed?")) return;
    
    setIsCleaning(true);
    try {
      const result = await cleanupOrphanedFiles();
      if (result.success) {
        toast.success(`Cleanup complete! Removed ${result.deletedCount} orphaned files.`);
      } else {
        toast.error("Failed to clean up storage.");
      }
    } catch (err) {
      toast.error("An error occurred during cleanup.");
    } finally {
      setIsCleaning(false);
    }
  };

  if (!mounted) return null;

  const languages = [
    { code: "ru", name: "Русский" },
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
    { code: "de", name: "Deutsch" },
    { code: "fr", name: "Français" },
  ];

  const themes = [
    { id: "light", name: t("light"), icon: Sun },
    { id: "dark", name: t("dark"), icon: Moon },
    { id: "system", name: t("system"), icon: Monitor },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
      <div className="flex flex-col md:flex-row gap-12">
        {/* Navigation Sidebar */}
        <div className="md:w-72 shrink-0 space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight">{t("title")}</h1>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Global Preferences</p>
          </div>

          <nav className="flex flex-col gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all relative group ${
                  activeTab === tab.id 
                    ? "text-purple-600 bg-purple-500/10" 
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-500/5"
                }`}
              >
                <tab.icon size={18} className={activeTab === tab.id ? "text-purple-600" : "text-zinc-400"} />
                <span className="text-sm font-bold">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTabGeneral"
                    className="absolute left-0 w-1 h-6 bg-purple-600 rounded-full"
                  />
                )}
              </button>
            ))}
          </nav>

          <div className="pt-8 border-t border-zinc-100 dark:border-zinc-900">
             <Link href="/" className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 hover:text-purple-600 transition-all flex items-center gap-2 group">
                <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Home
             </Link>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-12"
            >
              {activeTab === "general" && (
                <div className="space-y-12">
                  {/* Language */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                        <Globe size={18} />
                      </div>
                      <h2 className="text-lg font-bold tracking-tight">{t("language")}</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {languages.map((lang) => {
                        const isAvailable = lang.code === "en" || lang.code === "ru";
                        const isActive = locale === lang.code;
                        
                        const Content = (
                          <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all h-full ${
                            isActive 
                              ? "bg-white dark:bg-zinc-900 border-purple-500 shadow-lg shadow-purple-500/5 ring-1 ring-purple-500" 
                              : (isAvailable ? "glass border-zinc-200 dark:border-zinc-800 hover:border-purple-500/30 cursor-pointer" : "glass border-zinc-200 dark:border-zinc-800 opacity-40 cursor-not-allowed")
                          }`}>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-30">{lang.code}</span>
                              <div className="flex flex-col">
                                <span className="font-bold">{lang.name}</span>
                                {!isAvailable && <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">{t("comingSoon")}</span>}
                              </div>
                            </div>
                            {isActive ? (
                              <Check size={16} className="text-purple-500" />
                            ) : (
                              isAvailable && <ChevronRight size={16} className="text-zinc-400" />
                            )}
                          </div>
                        );

                        if (isAvailable && !isActive) {
                          return (
                            <Link key={lang.code} href={pathname} locale={lang.code}>
                              {Content}
                            </Link>
                          );
                        }

                        return (
                          <div key={lang.code}>
                            {Content}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Theme */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600">
                        <Palette size={18} />
                      </div>
                      <h2 className="text-lg font-bold tracking-tight">{t("theme")}</h2>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {themes.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setTheme(item.id)}
                          className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${
                            theme === item.id 
                              ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-zinc-50 shadow-md" 
                              : "glass border-zinc-200 dark:border-zinc-800 opacity-50 hover:opacity-100"
                          }`}
                        >
                          <item.icon size={18} />
                          <span className="text-xs font-black uppercase tracking-widest">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                  
                  {/* Notifications */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
                        <Bell size={18} />
                      </div>
                      <h2 className="text-lg font-bold tracking-tight">System Alerts</h2>
                    </div>

                    <div className="glass p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="space-y-1 text-center sm:text-left">
                        <p className="font-bold">Desktop Alerts</p>
                        <p className="text-xs text-zinc-500">Get notified when your track is playing or evaluated, even in the background.</p>
                      </div>
                      
                      {notifPermission === "granted" ? (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest">
                          <BellRing size={14} />
                          Active
                        </div>
                      ) : (
                        <button
                          onClick={requestPermission}
                          className="px-8 py-3 rounded-2xl bg-purple-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-purple-700 transition-all shadow-xl shadow-purple-500/20 active:scale-95"
                        >
                          {notifPermission === "denied" ? "Blocked" : "Enable Alerts"}
                        </button>
                      )}
                    </div>
                  </section>
                </div>
              )}


              {activeTab === "privacy" && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${isPublic ? "bg-green-500/10 text-green-600" : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"}`}>
                      {isPublic ? <Unlock size={18} /> : <Lock size={18} />}
                    </div>
                    <h2 className="text-lg font-bold tracking-tight">Privacy Preferences</h2>
                  </div>

                  <div className="glass p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="space-y-1 text-center sm:text-left">
                        <p className="font-bold">Public Profile Visibility</p>
                        <p className="text-xs text-zinc-500 max-w-md">
                          When enabled, anyone with your link can see your submission history and Hall of Fame rank.
                        </p>
                      </div>
                      
                      <button
                        disabled={loading}
                        onClick={() => handleTogglePrivacy(!isPublic)}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${
                           isPublic ? 'bg-purple-600' : 'bg-zinc-300 dark:bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            isPublic ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    {isPublic && session?.user && (
                       <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Your Sharing Link</p>
                          <div className="flex items-center gap-3 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs font-mono group cursor-pointer overflow-hidden transition-colors hover:border-purple-500/30"
                            onClick={() => {
                               if (typeof window !== "undefined") {
                                 navigator.clipboard.writeText(`${window.location.protocol}//${window.location.host}/profile/${session.user.id}`);
                                 toast.success("Link copied to clipboard!");
                               }
                            }}
                          >
                             <div className="truncate flex-1 flex items-center gap-2">
                                <span className="opacity-40">{window.location.host}/profile/</span>
                                <span className="font-bold text-purple-600">{session.user.id}</span>
                             </div>
                             <Check size={14} className="text-zinc-300 group-hover:text-purple-500 transition-colors" />
                          </div>
                          <p className="text-[9px] text-zinc-500 mt-3 italic">Click the link above to copy it.</p>
                       </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "advanced" && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 text-red-500">
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <Database size={18} />
                    </div>
                    <h2 className="text-lg font-bold tracking-tight">System Maintenance</h2>
                  </div>

                  <div className="glass p-8 rounded-[2rem] border border-red-500/10 space-y-6">
                    <div className="space-y-2">
                       <p className="font-bold">Storage Optimization</p>
                       <p className="text-xs text-zinc-500">
                         Scan and remove audio files that were uploaded but never submitted. This helps keep the server clean.
                       </p>
                    </div>
                    
                    <button
                      onClick={handleCleanup}
                      disabled={isCleaning}
                      className="w-full flex items-center justify-center gap-3 p-6 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all 
                        bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCleaning ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      {isCleaning ? "Optimizing Storage..." : "Verify & Cleanup Storage"}
                    </button>
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                       <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                       <p className="text-[10px] text-zinc-500 leading-relaxed">
                         Warning: This action will permanently delete orphaned files. Files currently in queue or history are safe.
                       </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "account" && session && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 text-red-500">
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <UserIcon size={18} />
                    </div>
                    <h2 className="text-lg font-bold tracking-tight">Account Identity</h2>
                  </div>

                  <div className="glass p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 space-y-10">
                     <div className="flex items-center gap-6">
                        <div className="relative h-20 w-20">
                          {session.user.image ? (
                            <img src={session.user.image} alt="" className="h-full w-full rounded-3xl shadow-2xl object-cover ring-4 ring-white dark:ring-zinc-900" />
                          ) : (
                            <div className="h-full w-full rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black">
                              {session.user.name?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-purple-600 rounded-xl flex items-center justify-center text-white border-4 border-white dark:border-zinc-900">
                             <Check size={14} />
                          </div>
                        </div>
                        <div>
                          <p className="text-xl font-black tracking-tight">{session.user.name}</p>
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Twitch Streamer Instance</p>
                        </div>
                     </div>

                     <div className="pt-8 border-t border-zinc-100 dark:border-zinc-900 flex flex-col gap-4">
                        <div className="flex items-center justify-between text-xs">
                           <span className="text-zinc-500 font-bold uppercase tracking-widest">Auth Provider</span>
                           <span className="font-black text-purple-600 uppercase">Twitch.tv</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                           <span className="text-zinc-500 font-bold uppercase tracking-widest">Instance ID</span>
                           <span className="font-mono opacity-50">{session.user.id}</span>
                        </div>
                     </div>
                     
                     <button
                       onClick={() => signOut()}
                       className="w-full py-5 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2"
                     >
                       <LogOut size={14} />
                       {tHeader("signOut")}
                     </button>
                  </div>
                </div>
              )}
              {activeTab === "wallet" && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 text-purple-600">
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <WalletIcon size={18} />
                    </div>
                    <h2 className="text-lg font-bold tracking-tight">Financial Dashboard</h2>
                  </div>
                  <WalletPanel onClose={() => {}} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

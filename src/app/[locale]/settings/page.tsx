"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/navigation";
import { signOut, useSession } from "next-auth/react";
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
  TrendingUp
} from "lucide-react";
import { locales } from "@/i18n/request";
import { getUserPreferences, updatePrivacyPreference, updateDonationSettings } from "@/app/actions/user-actions";
import { toast } from "sonner";
import { Lock, Unlock, Database, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useNotifications } from "@/components/providers/NotificationProvider";
import { cleanupOrphanedFiles } from "@/app/actions/maintenance-actions";

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const tHeader = useTranslations("Header");
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const pathname = usePathname();
  const { sendNotification } = useNotifications();
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [minDonation, setMinDonation] = useState<number>(50);
  const [currency, setCurrency] = useState("RUB");
  const [daSecret, setDaSecret] = useState("");

  React.useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    }
    
    // Fetch user preferences
    getUserPreferences().then(data => {
      if (data?.prefs) setIsPublic(data.prefs.isPublic);
      if (data?.user) {
        setMinDonation(data.user.minDonationAmount || 50);
        setCurrency(data.user.donationCurrency || "RUB");
        setDaSecret(data.user.daSecret || "");
      }
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

  const handleUpdateDonationSettings = async () => {
    setLoading(true);
    try {
      const result = await updateDonationSettings(minDonation, currency);
      if (result.success) {
        toast.success("Donation settings updated");
      }
    } catch (err) {
      toast.error("Failed to update settings");
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

  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-24 space-y-16 opacity-0">
        <h1 className="text-4xl font-black tracking-tight">{t("title")}</h1>
      </div>
    );
  }

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
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-24 space-y-16">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight">{t("title")}</h1>
        <p className="text-zinc-500 font-medium">Personalize your DropQueue experience and manage your account.</p>
      </div>

      <div className="space-y-12">
        {/* Localization Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Globe size={18} />
            </div>
            <h2 className="text-lg font-bold tracking-tight">{t("language")}</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {languages.map((lang) => (
              <div
                key={lang.code}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  locale === lang.code 
                    ? "bg-white dark:bg-zinc-900 border-purple-500 shadow-lg shadow-purple-500/5 ring-1 ring-purple-500" 
                    : "glass border-zinc-200 dark:border-zinc-800 opacity-40 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-30">{lang.code}</span>
                  <div className="flex flex-col">
                    <span className="font-bold">{lang.name}</span>
                    {lang.code !== "en" && <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">Coming Soon</span>}
                  </div>
                </div>
                {locale === lang.code ? (
                  <Check size={16} className="text-purple-500" />
                ) : (
                  lang.code === "en" ? (
                    <Link href={pathname} locale={lang.code} className="p-2 -m-2 opacity-100">
                      <ChevronRight size={16} className="text-zinc-400" />
                    </Link>
                  ) : null
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Theme Section */}
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
        
        {/* Notifications Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Bell size={18} />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Notifications</h2>
          </div>

          <div className="glass p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <p className="font-bold">Desktop Alerts</p>
              <p className="text-xs text-zinc-500">Get notified when your track is playing or evaluated, even in the background.</p>
            </div>
            
            {notifPermission === "granted" ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest">
                <BellRing size={14} />
                Enabled
              </div>
            ) : (
              <button
                onClick={requestPermission}
                className="px-8 py-3 rounded-2xl bg-purple-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-purple-700 transition-all shadow-xl shadow-purple-500/20 active:scale-95"
              >
                {notifPermission === "denied" ? "Blocked by Browser" : "Enable Alerts"}
              </button>
            )}
          </div>
        </section>

        {/* DonationAlerts Integration */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-600">
              <TrendingUp size={18} />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Donations & Bumps</h2>
          </div>

          <div className="glass p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <p className="font-bold">Minimum Bump Amount</p>
                <p className="text-xs text-zinc-500 mb-4">
                  The minimum donation amount required to automatically move a track to the front of the queue.
                </p>
                <div className="flex flex-col gap-4">
                   <div className="flex items-center gap-3">
                      <div className="flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 flex">
                         {["RUB", "USD", "EUR"].map((c) => (
                           <button
                             key={c}
                             onClick={() => setCurrency(c)}
                             className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${
                               currency === c 
                                 ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white" 
                                 : "text-zinc-500 opacity-50 hover:opacity-100"
                             }`}
                           >
                             {c}
                           </button>
                         ))}
                      </div>
                      <input 
                        type="number"
                        value={minDonation}
                        onChange={(e) => setMinDonation(Number(e.target.value))}
                        className="w-24 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 font-bold text-center"
                      />
                   </div>
                   <button 
                     onClick={handleUpdateDonationSettings}
                     className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:opacity-80 transition-all shadow-xl shadow-zinc-500/10"
                   >
                     Save Donation Settings
                   </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-bold">Webhook Security Token</p>
                <p className="text-xs text-zinc-500 mb-4">
                  {daSecret ? "Your security token is configured. Use it in DonationAlerts webhook URL." : "Configure your token to enable auto-bumps."}
                </p>
                <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                   <p className="text-[9px] text-blue-500/80 leading-relaxed">
                     To enable, go to DonationAlerts -{'>'} Webhooks -{'>'} Add: <br/>
                     <code className="bg-blue-500/10 px-1 rounded">{window.location.protocol}//{window.location.host}/api/webhooks/donationalerts?token=YOUR_TOKEN</code>
                   </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${isPublic ? "bg-green-500/10 text-green-600" : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"}`}>
              {isPublic ? <Unlock size={18} /> : <Lock size={18} />}
            </div>
            <h2 className="text-lg font-bold tracking-tight">Privacy</h2>
          </div>

          <div className="glass p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <p className="font-bold">Public Profile Page</p>
                <p className="text-xs text-zinc-500 max-w-md">
                  Enable this to allow viewers to see your submission history, average scores, and your rank in the Hall of Fame.
                </p>
              </div>
              
              <button
                disabled={loading}
                onClick={() => handleTogglePrivacy(!isPublic)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                   isPublic ? 'bg-purple-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {isPublic && session?.user && (
               <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Your Profile Link</p>
                  <div className="flex items-center gap-2 p-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono group cursor-pointer overflow-hidden"
                    onClick={() => {
                       navigator.clipboard.writeText(`${window.location.protocol}//${window.location.host}/profile/${session.user.id}`);
                       toast.success("Profile link copied!");
                    }}
                  >
                     <span className="truncate opacity-50">{window.location.host}/profile/</span>
                     <span className="truncate">{session.user.id}</span>
                  </div>
               </div>
            )}
          </div>
        </section>

        {/* System Maintenance Section */}
        <section className="space-y-6 pt-12 border-t border-zinc-100 dark:border-zinc-900">
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
                 Scan and remove audio files that were uploaded but never submitted or have been orphaned from deleted tracks.
               </p>
            </div>
            
            <button
              onClick={handleCleanup}
              disabled={isCleaning}
              className="w-full flex items-center justify-center gap-3 p-6 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all 
                bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCleaning ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {isCleaning ? "Scanning & Cleaning..." : "Run Storage Cleanup"}
            </button>
            <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
               <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
               <p className="text-[10px] text-zinc-500 leading-relaxed">
                 Warning: This action is irreversible. Files linked to existing tracks will not be affected.
               </p>
            </div>
          </div>
        </section>

        {/* Account Section */}
        {session && (
          <section className="space-y-6 pt-12 border-t border-zinc-100 dark:border-zinc-900">
            <div className="flex items-center gap-3 text-red-500">
              <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <LogOut size={18} />
              </div>
              <h2 className="text-lg font-bold tracking-tight">{t("account")}</h2>
            </div>

            <div className="glass p-8 rounded-[2rem] border border-red-500/10 space-y-6">
               <div className="flex items-center gap-4">
                  {session.user.image && (
                    <img src={session.user.image} alt="" className="h-12 w-12 rounded-xl shadow-lg" />
                  )}
                  <div>
                    <p className="font-bold">{session.user.name}</p>
                    <p className="text-xs text-zinc-500">Authenticated via Twitch</p>
                  </div>
               </div>
               
               <button
                 onClick={() => signOut()}
                 className="w-full py-4 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 active:scale-95"
               >
                 {tHeader("signOut")}
               </button>
            </div>
          </section>
        )}
      </div>

      <div className="pt-24 text-center">
        <Link href="/" className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 hover:text-purple-600 transition-all">
          &larr; Back to Home
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sessionConfigSchema, SessionConfig, PLATFORMS } from "@/lib/validations";
import { createSession } from "@/app/actions/session-actions";
import { useTranslations } from "next-intl";
import { Sparkles, ArrowRight, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function SetupWizard() {
  const [step, setStep] = useState(1);
  const [canSubmit, setCanSubmit] = useState(false);
  const t = useTranslations("Hub");

  // Prevent accidental double-click submission when entering the final step
  useEffect(() => {
    if (step === 4) {
      setCanSubmit(false);
      const timer = setTimeout(() => setCanSubmit(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [step]);
  
  const { register, handleSubmit, watch, setValue, trigger, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(sessionConfigSchema),
    defaultValues: {
      maxTracksPerUser: 1,
      maxAudioFileSize: 50,
      allowedPlatforms: ["youtube", "spotify", "soundcloud"],
      allowDirectUploads: true,
      overlayTheme: "DEFAULT",
      enableHighScoreSound: false,
    }
  });

  const allowedPlatforms = watch("allowedPlatforms");
  const currentTheme = watch("overlayTheme");

  const onSubmit = async (data: SessionConfig) => {
    // Final check for safety
    const isValid = await trigger();
    if (!isValid) {
      toast.error(t("fixErrors"));
      return;
    }

    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });
      await createSession(formData);
    } catch (err: any) {
      // Ignore Next.js redirect errors which are technically thrown errors
      if (err?.message?.includes("NEXT_REDIRECT") || err?.digest?.includes("NEXT_REDIRECT")) {
        return;
      }
      console.error("Failed to create session:", err);
      toast.error(t("criticalError"));
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof SessionConfig)[] = [];
    if (step === 1) fieldsToValidate = ["title"];
    if (step === 3) fieldsToValidate = ["allowedPlatforms"];
    
    if (fieldsToValidate.length > 0) {
      const result = await trigger(fieldsToValidate);
      if (!result) return;
    }
    
    setStep(s => Math.min(s + 1, 4));
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="glass p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-8 max-w-2xl w-full mx-auto overflow-hidden relative">
      {/* Background Noise/Grain could be added here via CSS */}
      <div className="flex justify-between items-center mb-10">
        <div className="space-y-1">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-purple-600">{t("setupBroadcast")}</h2>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-1 w-8 rounded-full transition-all ${step >= i ? 'bg-purple-600' : 'bg-zinc-100 dark:bg-zinc-800'}`} />
            ))}
          </div>
        </div>
        <span className="text-[10px] font-black opacity-20 uppercase tracking-widest">{t("stepOf")} {step}/4</span>
      </div>

      <form 
        onSubmit={handleSubmit(onSubmit)} 
        onKeyDown={(e) => {
          if (e.key === "Enter" && step < 4) {
            e.preventDefault();
            nextStep();
          }
        }}
        className="space-y-8"
      >
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500">{t("sessionIdentity")}</label>
              <input 
                {...register("title")}
                placeholder={t("sessionTitle")} 
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-8 py-5 rounded-[1.5rem] outline-none text-xl font-bold focus:ring-2 ring-purple-500/20 transition-all font-geist-sans" 
              />
              {errors.title && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest ml-2">{errors.title.message}</p>}
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Short Description (Optional)</label>
              <textarea 
                {...register("description")}
                placeholder="What is this session about?"
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-8 py-5 rounded-[1.5rem] outline-none text-sm min-h-[100px] resize-none focus:ring-2 ring-purple-500/20 transition-all"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-500">{t("tracksPerUser")}</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="number"
                    {...register("maxTracksPerUser", { valueAsNumber: true })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-6 py-4 rounded-2xl outline-none font-bold text-center"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-500">{t("fileSizeCap")}</label>
                <input 
                  type="number"
                  {...register("maxAudioFileSize", { valueAsNumber: true })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-6 py-4 rounded-2xl outline-none font-bold text-center"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-zinc-100 dark:bg-zinc-900 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 transition-colors pointer-events-auto">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest">{t("enableDirectUploads")}</p>
                <p className="text-[10px] text-zinc-500">{t("directUploadsDesc")}</p>
              </div>
              <input 
                type="checkbox"
                {...register("allowDirectUploads")}
                className="h-6 w-6 rounded-lg border-zinc-300 text-purple-600 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <label className="text-xs font-black uppercase tracking-widest text-zinc-500">{t("allowedPlatforms")}</label>
            <div className="space-y-2">
              {PLATFORMS.map((platform) => (
                <label
                  key={platform.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                    allowedPlatforms?.includes(platform.id)
                      ? "bg-purple-600/10 border-purple-600/30 text-purple-600"
                      : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-purple-600/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">{platform.name}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowedPlatforms?.includes(platform.id)}
                    onChange={() => {
                      const current = allowedPlatforms || [];
                      if (current.includes(platform.id)) {
                        setValue("allowedPlatforms", current.filter(p => p !== platform.id));
                      } else {
                        setValue("allowedPlatforms", [...current, platform.id]);
                      }
                    }}
                    className="h-5 w-5 rounded border-zinc-300 text-purple-600 focus:ring-purple-600"
                  />
                </label>
              ))}
            </div>
            {errors.allowedPlatforms && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest ml-2">{errors.allowedPlatforms.message}</p>}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500">{t("overlayThemeLabel")}</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: "DEFAULT", name: t("themeDefaultName"), desc: t("themeDefaultDesc") },
                  { id: "CYBERPUNK", name: t("themeCyberName"), desc: t("themeCyberDesc") },
                  { id: "MINIMALIST", name: t("themeMinimalName"), desc: t("themeMinimalDesc") }
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setValue("overlayTheme", th.id)}
                    className={`flex items-center justify-between p-6 rounded-2xl border transition-all text-left ${
                      currentTheme === th.id
                        ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/25"
                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:border-purple-600/50"
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest">{th.name}</h4>
                      <p className={`text-[10px] ${currentTheme === th.id ? "text-white/60" : "text-zinc-400"}`}>{th.desc}</p>
                    </div>
                    {currentTheme === th.id && <Sparkles size={16} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-zinc-100 dark:bg-zinc-900 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 transition-colors pointer-events-auto">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest">{t("highScoreSound")}</p>
                <p className="text-[10px] text-zinc-500">{t("highScoreSoundDesc")}</p>
              </div>
              <input 
                type="checkbox"
                {...register("enableHighScoreSound")}
                className="h-6 w-6 rounded-lg border-zinc-300 text-purple-600 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-10 border-t border-zinc-100 dark:border-zinc-900">
          {step > 1 && (
            <button 
              type="button" 
              onClick={prevStep}
              className="px-8 py-5 glass border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
            >
              {t("back")}
            </button>
          )}
          
          {step < 4 ? (
            <button 
              type="button" 
              onClick={nextStep}
              className="flex-1 px-8 py-5 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl flex items-center justify-center gap-2"
            >
              {t("nextStep")}
              <ArrowRight size={14} />
            </button>
          ) : (
            <button 
              disabled={isSubmitting || !canSubmit}
              className={`flex-1 px-8 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl flex items-center justify-center gap-2 ${
                canSubmit 
                  ? "bg-purple-600 text-white hover:scale-[1.05] shadow-purple-500/40 active:scale-95" 
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? t("generating") : (
                <>
                  <Zap size={14} className={canSubmit ? "text-yellow-400" : ""} />
                  {canSubmit ? t("goLive") : t("initializing")}
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

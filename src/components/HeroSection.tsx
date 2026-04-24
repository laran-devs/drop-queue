"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Link } from "@/navigation";

export default function HeroSection() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } },
  };

  return (
    <section className="relative pt-32 pb-20 px-4 flex flex-col items-center justify-center text-center overflow-hidden z-10">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-4xl space-y-10"
      >
        <motion.div variants={item} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <Sparkles size={14} className="text-purple-600 animate-spin-slow" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Revolutionizing stream music</span>
        </motion.div>

        <motion.h1 
          variants={item}
          className="text-6xl sm:text-8xl font-black tracking-tight leading-none text-zinc-900 dark:text-zinc-50"
        >
          Drop<span className="text-purple-600">Queue</span>
        </motion.h1>

        <motion.p 
          variants={item}
          className="text-xl sm:text-2xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-medium"
        >
          The Pulse of Your Stream. Level up your vibe. Connect with your audience through synchronized beats.
        </motion.p>

        <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-4 pt-6">
          <Link
            href="#discover"
            className="px-10 py-5 bg-purple-600 text-white rounded-[2rem] text-sm font-black uppercase tracking-widest hover:bg-purple-700 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-purple-500/20"
          >
            Explore Queues
          </Link>
          <Link
            href="/dashboard"
            className="px-10 py-5 glass border border-zinc-200 dark:border-zinc-800 rounded-[2rem] text-sm font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
          >
            Start Streaming
          </Link>
        </motion.div>
      </motion.div>

      {/* DECORATIVE ELEMENTS */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-zinc-100 dark:border-zinc-900 rounded-full opacity-50 scale-150 sm:scale-100" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-zinc-100 dark:border-zinc-900 rounded-full opacity-50 scale-150 sm:scale-100" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-zinc-200 dark:border-zinc-800 rounded-full opacity-30 scale-150 sm:scale-100" />
      </div>
    </section>
  );
}

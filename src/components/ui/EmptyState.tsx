"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-12 text-center glass rounded-[3rem] border border-zinc-200 dark:border-zinc-800 bg-white/5 backdrop-blur-xl"
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 blur-3xl rounded-full" />
        <div className="relative h-20 w-20 rounded-3xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-800 shadow-xl">
          {icon}
        </div>
      </div>
      
      <h3 className="text-2xl font-black mb-2 tracking-tight">{title}</h3>
      <p className="text-zinc-500 max-w-[280px] text-sm leading-relaxed mb-8">
        {description}
      </p>
      
      {action && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
          {action}
        </div>
      )}
    </motion.div>
  );
}

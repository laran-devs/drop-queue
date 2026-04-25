"use client";

import { motion } from "framer-motion";
import { Sparkles, Star, Trophy, Trash2 } from "lucide-react";

export type RankType = "BANGER_MAKER" | "TASTEMAKER" | "TROLL" | "NEWBIE";

interface RankBadgeProps {
  score: number;
}

export function RankBadge({ score }: RankBadgeProps) {
  let rank: RankType = "NEWBIE";
  if (score >= 8.5) rank = "BANGER_MAKER";
  else if (score >= 6.0) rank = "TASTEMAKER";
  else if (score < 4.0 && score > 0) rank = "TROLL";

  const config = {
    BANGER_MAKER: {
      label: "Banger Maker",
      icon: Trophy,
      colors: "from-amber-400 via-orange-500 to-yellow-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      glow: "shadow-amber-500/20"
    },
    TASTEMAKER: {
      label: "Tastemaker",
      icon: Star,
      colors: "from-purple-400 via-indigo-500 to-blue-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      glow: "shadow-purple-500/20"
    },
    TROLL: {
      label: "Troll",
      icon: Trash2,
      colors: "from-zinc-500 to-zinc-800",
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/20",
      glow: "shadow-zinc-500/10"
    },
    NEWBIE: {
      label: "Newcomer",
      icon: Sparkles,
      colors: "from-emerald-400 to-teal-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      glow: "shadow-emerald-500/10"
    }
  };

  const current = config[rank];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${current.bg} ${current.border} ${current.glow} shadow-lg backdrop-blur-md`}
    >
      <current.icon size={10} className={`bg-gradient-to-br ${current.colors} bg-clip-text text-transparent fill-current`} />
      <span className={`text-[8px] font-black uppercase tracking-widest bg-gradient-to-r ${current.colors} bg-clip-text text-transparent`}>
        {current.label}
      </span>
    </motion.div>
  );
}

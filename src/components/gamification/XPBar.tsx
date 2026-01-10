"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGamificationStore } from "@/stores";
import { getLevelTier, getXPForLevel } from "@/types/gamification";

interface XPBarProps {
  className?: string;
  showLevel?: boolean;
  showXPText?: boolean;
  compact?: boolean;
}

export function XPBar({
  className,
  showLevel = true,
  showXPText = true,
  compact = false,
}: XPBarProps) {
  const { userProfile, getXPProgress } = useGamificationStore();
  const progress = getXPProgress();

  if (!userProfile) return null;

  const tier = getLevelTier(userProfile.current_level);
  const currentLevelXP = getXPForLevel(userProfile.current_level);
  const nextLevelXP = getXPForLevel(userProfile.current_level + 1);
  const xpNeeded = nextLevelXP - currentLevelXP;
  // Calculate XP into current level, capped at xpNeeded to prevent overflow display
  const rawXpIntoLevel = userProfile.total_xp - currentLevelXP;
  const xpIntoLevel = Math.min(rawXpIntoLevel, xpNeeded);

  return (
    <div className={cn("w-full", className)}>
      {/* Level and XP text */}
      {(showLevel || showXPText) && !compact && (
        <div className="flex items-center justify-between mb-1.5 text-xs">
          {showLevel && (
            <div className="flex items-center gap-2">
              <span
                className="font-heading uppercase tracking-wider"
                style={{ color: tier.color }}
              >
                Lvl {userProfile.current_level}
              </span>
              <span className="text-white/40">•</span>
              <span className="text-white/60">{tier.title}</span>
            </div>
          )}
          {showXPText && (
            <span className="text-white/40">
              {xpIntoLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div
        className={cn(
          "relative w-full bg-[var(--color-dark-4)] overflow-hidden",
          compact ? "h-1 rounded-full" : "h-2"
        )}
      >
        {/* Animated progress fill */}
        <motion.div
          className="absolute inset-y-0 left-0"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            background: `linear-gradient(90deg, ${tier.color}cc, ${tier.color})`,
          }}
        />

        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ["-100%", "400%"] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: "easeInOut",
          }}
        />

        {/* Glow effect at the end */}
        <motion.div
          className="absolute inset-y-0 w-4 blur-sm"
          style={{
            background: tier.color,
            left: `calc(${progress}% - 8px)`,
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>

      {/* Compact mode level display */}
      {compact && showLevel && (
        <div className="flex items-center justify-between mt-1 text-[10px]">
          <span style={{ color: tier.color }}>{userProfile.current_level}</span>
          <span className="text-white/30">{userProfile.current_level + 1}</span>
        </div>
      )}
    </div>
  );
}


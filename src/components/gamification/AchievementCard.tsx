"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AchievementWithProgress } from "@/types/gamification";
import { RARITY_CONFIG } from "@/types/gamification";

interface AchievementCardProps {
  achievement: AchievementWithProgress;
  onClick?: () => void;
  className?: string;
}

export function AchievementCard({
  achievement,
  onClick,
  className,
}: AchievementCardProps) {
  const rarity = RARITY_CONFIG[achievement.rarity];
  const isUnlocked = achievement.is_unlocked;
  const isLocked = !isUnlocked && achievement.is_hidden;
  const progress = isUnlocked
    ? 100
    : (achievement.progress / achievement.requirement_value) * 100;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative group cursor-pointer",
        "bg-[var(--color-dark-2)] border border-[var(--color-dark-3)]",
        "p-4 transition-all duration-300",
        isUnlocked && "border-opacity-100",
        !isUnlocked && "opacity-60 grayscale-[30%]",
        className
      )}
      style={{
        borderColor: isUnlocked ? rarity.color : undefined,
        boxShadow: isUnlocked ? rarity.glow : undefined,
      }}
    >
      {/* Rarity indicator */}
      <div
        className="absolute top-0 left-0 w-full h-1"
        style={{ background: rarity.color, opacity: isUnlocked ? 1 : 0.3 }}
      />

      {/* Content */}
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 w-14 h-14 flex items-center justify-center text-3xl",
            "bg-[var(--color-dark-3)] border",
            isUnlocked ? "border-opacity-100" : "border-[var(--color-dark-4)]"
          )}
          style={{
            borderColor: isUnlocked ? rarity.color : undefined,
          }}
        >
          {isLocked ? (
            <span className="text-white/30">🔒</span>
          ) : (
            <span className={cn(!isUnlocked && "opacity-50")}>
              {achievement.icon}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={cn(
                "font-heading text-sm uppercase tracking-wider truncate",
                isUnlocked ? "text-white" : "text-white/60"
              )}
            >
              {isLocked ? "???" : achievement.name}
            </h3>
            <span
              className="text-[10px] px-1.5 py-0.5 uppercase tracking-wider"
              style={{
                background: `${rarity.color}20`,
                color: rarity.color,
              }}
            >
              {rarity.name}
            </span>
          </div>

          <p className="text-xs text-white/50 line-clamp-2 mb-2">
            {isLocked ? "Complete hidden requirements to unlock" : achievement.description}
          </p>

          {/* Progress bar */}
          {!isUnlocked && !isLocked && (
            <div className="h-1 bg-[var(--color-dark-4)] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full"
                style={{ background: rarity.color }}
              />
            </div>
          )}

          {/* XP reward */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[var(--color-main-1)]">
              +{achievement.xp_reward} XP
            </span>
            {isUnlocked && achievement.unlocked_at && (
              <span className="text-[10px] text-white/30">
                {new Date(achievement.unlocked_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Unlocked checkmark */}
      {isUnlocked && (
        <div
          className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full"
          style={{ background: rarity.color }}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Hover glow effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${rarity.color}10 0%, transparent 70%)`,
        }}
      />
    </motion.div>
  );
}


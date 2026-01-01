"use client";

import { useState } from "react";
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
  const [isExpanded, setIsExpanded] = useState(false);
  const rarity = RARITY_CONFIG[achievement.rarity];
  const isUnlocked = achievement.is_unlocked;
  const isLocked = !isUnlocked && achievement.is_hidden;
  const progress = isUnlocked
    ? 100
    : (achievement.progress / achievement.requirement_value) * 100;

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    onClick?.();
  };

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={cn(
        "relative group cursor-pointer h-full",
        "bg-[var(--color-dark-2)] border border-[var(--color-dark-3)]",
        "p-4 transition-all duration-300",
        isUnlocked && "border-opacity-100",
        !isUnlocked && "opacity-70 grayscale-[20%]",
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

      {/* Header: Icon + Rarity Badge */}
      <div className="flex items-center gap-3 mb-3">
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 flex items-center justify-center text-xl",
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

        {/* Rarity badge */}
        <span
          className="text-[9px] px-1.5 py-0.5 uppercase tracking-wider"
          style={{
            background: `${rarity.color}20`,
            color: rarity.color,
          }}
        >
          {rarity.name}
        </span>

        {/* Unlocked checkmark */}
        {isUnlocked && (
          <div
            className="ml-auto w-5 h-5 flex items-center justify-center rounded-full"
            style={{ background: rarity.color }}
          >
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Title - Full width */}
      <h3
        className={cn(
          "font-heading uppercase tracking-wide mb-2 leading-tight text-sm",
          isUnlocked ? "text-white" : "text-white/70"
        )}
        title={isLocked ? "???" : achievement.name}
      >
        {isLocked ? "???" : achievement.name}
      </h3>

      {/* Description */}
      <p 
        className={cn(
          "text-[11px] mb-3 leading-relaxed transition-all",
          isUnlocked ? "text-white/60" : "text-white/50",
          isExpanded ? "" : "line-clamp-2"
        )}
        title={isLocked ? "Complete hidden requirements to unlock" : achievement.description}
      >
        {isLocked ? "Complete hidden requirements to unlock" : achievement.description}
      </p>

      {/* Progress bar */}
      {!isUnlocked && !isLocked && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-white/40 mb-1">
            <span>Progress</span>
            <span>{achievement.progress} / {achievement.requirement_value}</span>
          </div>
          <div className="h-1.5 bg-[var(--color-dark-4)] overflow-hidden rounded-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full rounded-full"
              style={{ background: rarity.color }}
            />
          </div>
        </div>
      )}

      {/* Footer: XP reward + Date */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--color-dark-3)]">
        <span className="text-xs font-semibold text-[var(--color-main-1)]">
          +{achievement.xp_reward} XP
        </span>
        {isUnlocked && achievement.unlocked_at && (
          <span className="text-[10px] text-white/40">
            {new Date(achievement.unlocked_at).toLocaleDateString()}
          </span>
        )}
      </div>

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

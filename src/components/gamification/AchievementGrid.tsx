"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGamificationStore } from "@/stores";
import { AchievementCard } from "./AchievementCard";
import { ACHIEVEMENT_CATEGORIES, type AchievementCategory } from "@/types/gamification";

interface AchievementGridProps {
  className?: string;
  showFilters?: boolean;
}

export function AchievementGrid({ className, showFilters = true }: AchievementGridProps) {
  const { userAchievements } = useGamificationStore();
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | "all">("all");
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);

  // Filter achievements
  const filteredAchievements = userAchievements.filter((achievement) => {
    if (selectedCategory !== "all" && achievement.category !== selectedCategory) {
      return false;
    }
    if (showUnlockedOnly && !achievement.isUnlocked) {
      return false;
    }
    return true;
  });

  // Calculate stats
  const totalAchievements = userAchievements.length;
  const unlockedCount = userAchievements.filter((a) => a.isUnlocked).length;
  const completionPercent = totalAchievements > 0 
    ? Math.round((unlockedCount / totalAchievements) * 100) 
    : 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats bar */}
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-heading text-lg">Achievements</h3>
            <p className="text-sm text-white/60">
              {unlockedCount} / {totalAchievements} unlocked
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-heading text-[var(--color-main-1)]">
              {completionPercent}%
            </span>
            <p className="text-xs text-white/40">Complete</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-[var(--color-dark-4)] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-[var(--color-main-1)]"
          />
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Category filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "px-3 py-1.5 text-sm border transition-all cursor-pointer",
                selectedCategory === "all"
                  ? "border-[var(--color-main-1)] text-[var(--color-main-1)] bg-[var(--color-main-1)]/10"
                  : "border-[var(--color-dark-4)] text-white/60 hover:border-[var(--color-dark-3)]"
              )}
            >
              All
            </button>
            {ACHIEVEMENT_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "px-3 py-1.5 text-sm border transition-all flex items-center gap-1.5 cursor-pointer",
                  selectedCategory === category.id
                    ? "border-[var(--color-main-1)] text-[var(--color-main-1)] bg-[var(--color-main-1)]/10"
                    : "border-[var(--color-dark-4)] text-white/60 hover:border-[var(--color-dark-3)]"
                )}
              >
                <span>{category.icon}</span>
                <span className="hidden sm:inline">{category.name}</span>
              </button>
            ))}
          </div>

          {/* Unlocked filter */}
          <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={showUnlockedOnly}
              onChange={(e) => setShowUnlockedOnly(e.target.checked)}
              className="w-4 h-4 accent-[var(--color-main-1)] cursor-pointer"
            />
            Show unlocked only
          </label>
        </div>
      )}

      {/* Achievement grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredAchievements.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <AchievementCard achievement={achievement} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {filteredAchievements.length === 0 && (
        <div className="text-center py-12 bg-[var(--color-dark-2)] border border-[var(--color-dark-3)]">
          <span className="text-4xl mb-4 block">🎮</span>
          <p className="text-white/60">No achievements found</p>
          <p className="text-sm text-white/40 mt-1">
            {showUnlockedOnly
              ? "You haven't unlocked any achievements in this category yet"
              : "Start exploring to unlock achievements!"}
          </p>
        </div>
      )}
    </div>
  );
}


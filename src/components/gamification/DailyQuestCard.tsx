"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { DailyQuest } from "@/types/gamification";

interface DailyQuestCardProps {
  quest: DailyQuest;
  onAction?: () => void;
  className?: string;
}

export function DailyQuestCard({ quest, onAction, className }: DailyQuestCardProps) {
  const progressPercent = Math.min(100, (quest.progress / quest.requirement.count) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-4 transition-all",
        quest.completed && "border-green-500/50 bg-green-500/5",
        !quest.completed && "hover:border-[var(--color-main-1)]/50",
        className
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 w-12 h-12 flex items-center justify-center text-2xl rounded-lg",
            quest.completed ? "bg-green-500/20" : "bg-[var(--color-dark-3)]"
          )}
        >
          {quest.completed ? "✓" : quest.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4
              className={cn(
                "font-semibold truncate",
                quest.completed && "text-green-500"
              )}
            >
              {quest.title}
            </h4>
            <span
              className={cn(
                "flex-shrink-0 text-sm font-heading",
                quest.completed ? "text-green-500" : "text-[var(--color-main-1)]"
              )}
            >
              +{quest.xpReward} XP
            </span>
          </div>

          <p className="text-sm text-white/60 mb-3">{quest.description}</p>

          {/* Progress bar */}
          <div className="relative">
            <div className="w-full h-2 bg-[var(--color-dark-4)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  quest.completed
                    ? "bg-green-500"
                    : "bg-gradient-to-r from-[var(--color-main-1)] to-yellow-500"
                )}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-white/40">
                {quest.progress}/{quest.requirement.count}
              </span>
              {quest.completed && (
                <span className="text-[10px] text-green-500">Completed!</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action button for certain quest types */}
      {!quest.completed && quest.requirement.target && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAction}
          className="mt-3 w-full py-2 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] text-sm text-white/80 transition-colors cursor-pointer"
        >
          Go to {getTargetLabel(quest.requirement.target)} →
        </motion.button>
      )}
    </motion.div>
  );
}

// Helper to get human-readable target labels
function getTargetLabel(target: string): string {
  const labels: Record<string, string> = {
    "/store/mystery-boxes": "Mystery Boxes",
    "/rewards/spin": "Spin Wheel",
    "/rewards/shop": "Rewards Shop",
    "/news": "News",
  };
  return labels[target] || "Page";
}


"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGamificationStore } from "@/stores";
import { DAILY_REWARDS, getNextMilestone } from "@/types/gamification";

interface DailyRewardCalendarProps {
  className?: string;
  onClaimReward?: () => void;
}

export function DailyRewardCalendar({ className, onClaimReward }: DailyRewardCalendarProps) {
  const { userProfile } = useGamificationStore();

  if (!userProfile) return null;

  const currentStreak = userProfile.current_streak;
  const cycleDay = currentStreak > 0 ? ((currentStreak - 1) % 7) + 1 : 0;
  const today = new Date().toISOString().split("T")[0];
  const hasClaimed = userProfile.last_login_date === today;
  const nextMilestone = getNextMilestone(currentStreak);

  return (
    <div className={cn("bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading text-xl">Daily Rewards</h3>
          <p className="text-sm text-white/60">
            {currentStreak > 0
              ? `${currentStreak} day streak! 🔥`
              : "Login daily to build your streak"}
          </p>
        </div>
        {currentStreak > 0 && (
          <div className="text-center">
            <div className="text-3xl">🔥</div>
            <span className="text-xs text-white/40">Day {cycleDay}/7</span>
          </div>
        )}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {DAILY_REWARDS.map((reward, index) => {
          const dayNum = index + 1;
          const isPast = currentStreak > 0 && dayNum < cycleDay;
          const isCurrent = dayNum === cycleDay;
          const isFuture = dayNum > cycleDay || currentStreak === 0;

          // Get the appropriate icon for this reward
          const getRewardIcon = () => {
            if (isPast || (isCurrent && hasClaimed)) {
              return <span className="text-green-500">✓</span>;
            }
            if (reward.reward?.icon) {
              return reward.reward.icon;
            }
            return "⚡";
          };

          return (
            <motion.div
              key={dayNum}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 sm:p-3 border transition-all",
                isPast && "bg-[var(--color-main-1)]/20 border-[var(--color-main-1)]/50",
                isCurrent && !hasClaimed && "bg-[var(--color-main-1)]/30 border-[var(--color-main-1)] animate-pulse",
                isCurrent && hasClaimed && "bg-green-500/20 border-green-500",
                isFuture && "bg-[var(--color-dark-3)] border-[var(--color-dark-4)]"
              )}
            >
              {/* Day number */}
              <span className="text-[10px] sm:text-xs text-white/40 mb-1">Day {dayNum}</span>

              {/* Reward icon */}
              <div className="text-lg sm:text-2xl mb-1">
                {getRewardIcon()}
              </div>

              {/* XP amount */}
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-bold",
                  isFuture ? "text-white/40" : "text-[var(--color-main-1)]"
                )}
              >
                +{reward.xp}
              </span>

              {/* Bonus indicator */}
              {reward.reward && (
                <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-yellow-500 text-black text-[8px] rounded-full">
                  !
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Claim button */}
      {!hasClaimed && currentStreak >= 0 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClaimReward}
          className="w-full py-3 bg-[var(--color-main-1)] text-white font-heading uppercase tracking-wider transition-all hover:bg-[var(--color-main-1)]/80 cursor-pointer"
        >
          Claim Today&apos;s Reward
        </motion.button>
      )}

      {hasClaimed && (
        <div className="text-center py-3 bg-green-500/10 border border-green-500/30">
          <span className="text-green-500">✓ Today&apos;s reward claimed!</span>
          <p className="text-xs text-white/40 mt-1">Come back tomorrow for more</p>
        </div>
      )}

      {/* Next milestone progress */}
      {nextMilestone && currentStreak > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--color-dark-3)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/60">Next milestone: {nextMilestone.badge}</span>
            <span className="text-xs text-[var(--color-main-1)]">
              {currentStreak}/{nextMilestone.days} days
            </span>
          </div>
          <div className="w-full h-2 bg-[var(--color-dark-4)] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(currentStreak / nextMilestone.days) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-[var(--color-main-1)] to-yellow-500"
            />
          </div>
          <p className="text-[10px] text-white/40 mt-1 text-center">
            {nextMilestone.badgeIcon} +{nextMilestone.xpBonus} XP bonus at {nextMilestone.days} days
          </p>
        </div>
      )}

      {/* Reward legend */}
      <div className="mt-4 pt-4 border-t border-[var(--color-dark-3)]">
        <p className="text-xs text-white/40 text-center">
          🏷️ Discounts • 🎡 Free Spins • 🔑 Mystery Keys • ⚡ XP Boosts
        </p>
      </div>
    </div>
  );
}


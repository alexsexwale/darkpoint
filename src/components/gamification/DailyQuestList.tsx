"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { DailyQuestCard } from "./DailyQuestCard";
import { getDailyQuests, type DailyQuest } from "@/types/gamification";
import { useGamificationStore, useUIStore } from "@/stores";

interface DailyQuestListProps {
  className?: string;
  compact?: boolean;
  showLoginPrompt?: boolean;
}

export function DailyQuestList({ className, compact = false, showLoginPrompt = false }: DailyQuestListProps) {
  const { dailyQuests } = useGamificationStore();
  const { openSignIn } = useUIStore();

  // Get today's quests - either from store or generate fresh
  const quests = useMemo(() => {
    if (dailyQuests && dailyQuests.length > 0) {
      return dailyQuests;
    }
    return getDailyQuests();
  }, [dailyQuests]);

  const completedCount = quests.filter((q) => q.completed).length;
  const totalXP = quests.reduce((sum, q) => sum + (q.completed ? q.xpReward : 0), 0);
  const potentialXP = quests.reduce((sum, q) => sum + q.xpReward, 0);
  const allCompleted = completedCount === quests.length;

  const handleQuestAction = (quest: DailyQuest) => {
    if (showLoginPrompt) {
      openSignIn();
      return;
    }
    // Navigation is handled by Link wrapper for quests with targets
  };

  // Guest view - show quests but with login prompts
  if (showLoginPrompt) {
    return (
      <div className={cn("bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6", className)}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-heading text-xl">Today&apos;s Quests</h3>
            <p className="text-sm text-white/60">Complete quests to earn XP</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-heading text-[var(--color-main-1)]">
              0/{quests.length}
            </div>
            <span className="text-xs text-white/40">Completed</span>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="mb-6 p-4 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Quest Progress</span>
            <span className="text-sm text-[var(--color-main-1)]">
              0/{potentialXP} XP
            </span>
          </div>
          <div className="w-full h-3 bg-[var(--color-dark-4)] rounded-full overflow-hidden">
            <div className="h-full rounded-full w-0" />
          </div>
        </div>

        {/* Quest List (Preview) */}
        <div className={cn("space-y-4 relative", compact && "space-y-3")}>
          {quests.map((quest, index) => (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="opacity-60 pointer-events-none">
                <DailyQuestCard
                  quest={{ ...quest, progress: 0, completed: false }}
                  onAction={() => {}}
                />
              </div>
            </motion.div>
          ))}
          
          {/* Login Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute inset-0 flex items-center justify-center bg-[var(--color-dark-2)]/80 backdrop-blur-sm"
          >
            <div className="text-center p-6">
              <div className="text-4xl mb-3">🔐</div>
              <h4 className="font-heading text-lg mb-2">Sign In to Track Progress</h4>
              <p className="text-sm text-white/60 mb-4">
                Your quest progress is saved to your account
              </p>
              <Button variant="primary" size="sm" onClick={() => openSignIn()}>
                Sign In Now
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Reset Timer */}
        <div className="mt-4 text-center">
          <QuestResetTimer />
        </div>
      </div>
    );
  }

  // Authenticated user view
  return (
    <div className={cn("bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading text-xl">Today&apos;s Quests</h3>
          <p className="text-sm text-white/60">
            {allCompleted ? "All quests completed! 🎉" : "Complete quests to earn XP"}
          </p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-heading text-[var(--color-main-1)]">
            {completedCount}/{quests.length}
          </div>
          <span className="text-xs text-white/40">Completed</span>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="mb-6 p-4 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60">Quest Progress</span>
          <span className="text-sm text-[var(--color-main-1)]">
            {totalXP}/{potentialXP} XP
          </span>
        </div>
        <div className="w-full h-3 bg-[var(--color-dark-4)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / quests.length) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              allCompleted
                ? "bg-green-500"
                : "bg-gradient-to-r from-[var(--color-main-1)] to-yellow-500"
            )}
          />
        </div>
        {allCompleted && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-green-500 text-sm mt-2"
          >
            +{totalXP} XP earned today! Come back tomorrow for new quests.
          </motion.p>
        )}
      </div>

      {/* Quest List */}
      <div className={cn("space-y-4", compact && "space-y-3")}>
        {quests.map((quest, index) => (
          <motion.div
            key={quest.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {quest.requirement.target ? (
              <Link href={quest.requirement.target}>
                <DailyQuestCard
                  quest={quest}
                  onAction={() => handleQuestAction(quest)}
                />
              </Link>
            ) : (
              <DailyQuestCard
                quest={quest}
                onAction={() => handleQuestAction(quest)}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Bonus for completing all quests */}
      {!allCompleted && (
        <div className="mt-6 pt-4 border-t border-[var(--color-dark-3)]">
          <div className="flex items-center justify-center gap-2 text-sm text-white/40">
            <span>🌟</span>
            <span>Complete all quests for a bonus tomorrow!</span>
          </div>
        </div>
      )}

      {/* Reset Timer */}
      <div className="mt-4 text-center">
        <QuestResetTimer />
      </div>
    </div>
  );
}

// Timer showing when quests reset
function QuestResetTimer() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const hoursLeft = Math.floor((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
  const minutesLeft = Math.floor(((tomorrow.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <p className="text-xs text-white/40">
      New quests in {hoursLeft}h {minutesLeft}m
    </p>
  );
}

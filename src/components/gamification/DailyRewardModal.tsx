"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { useGamificationStore } from "@/stores";
import { useGamification } from "@/hooks";
import { DAILY_REWARDS, type DailyReward } from "@/types/gamification";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export function DailyRewardModal() {
  const { showDailyRewardModal, userProfile, setDailyRewardModal, dailyRewardData } = useGamificationStore();
  const { claimDailyReward } = useGamification();
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimedReward, setClaimedReward] = useState<DailyReward | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [showBonusReveal, setShowBonusReveal] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (showDailyRewardModal) {
      document.body.style.overflow = "hidden";
      setClaimed(false);
      setClaiming(false);
      setClaimedReward(null);
      setShowBonusReveal(false);
      setClaimError(null);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showDailyRewardModal]);

  const handleClaim = async () => {
    if (claiming) return;
    
    setClaimError(null);
    setClaiming(true);
    
    try {
      const success = await claimDailyReward();
      if (success) {
        // Use the actual backend response from dailyRewardData (set by claimDailyReward)
        // Wait a tick for the store to update
        setTimeout(() => {
          const storeData = useGamificationStore.getState().dailyRewardData;
          const actualCycleDay = storeData?.cycleDay || 1;
          const reward = DAILY_REWARDS.find(r => r.day === actualCycleDay) || DAILY_REWARDS[0];
          
          setClaimed(true);
          setClaimedReward(reward);
          if (reward.reward || storeData?.freeSpinEarned) {
            setTimeout(() => setShowBonusReveal(true), 800);
          }
        }, 50);
      } else {
        setClaimError(
          "Unable to claim your reward right now. Please try again in a moment."
        );
      }
    } finally {
      setClaiming(false);
    }
  };

  const handleClose = () => {
    setDailyRewardModal(false);
    setClaimed(false);
    setClaimedReward(null);
    setShowBonusReveal(false);
  };

  if (!userProfile) return null;

  // Calculate what day they're ABOUT to claim (not their current streak)
  const currentStreak = userProfile.current_streak || 0;
  const lastLoginDate = userProfile.last_login_date;
  
  // Check if last login was yesterday (continuing streak)
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const isConsecutive = lastLoginDate === yesterday;
  const alreadyClaimedToday = lastLoginDate === today;
  
  // Calculate the day they're about to claim:
  // - If consecutive (last login yesterday): they're claiming day currentStreak + 1
  // - If streak broken or first time: they're claiming day 1
  const upcomingStreak = isConsecutive ? currentStreak + 1 : 1;
  const cycleDay = ((upcomingStreak - 1) % 7) + 1;
  const todayReward = DAILY_REWARDS.find((r) => r.day === cycleDay) || DAILY_REWARDS[0];

  return (
    <AnimatePresence>
      {showDailyRewardModal && (
        <>
          {/* Confetti on claim */}
          {claimed && (
            <div className="fixed inset-0 z-[100] pointer-events-none">
              <Confetti
                width={windowSize.width}
                height={windowSize.height}
                recycle={false}
                numberOfPieces={todayReward.reward ? 200 : 100}
                gravity={0.2}
                colors={["#e08821", "#ffffff", "#22c55e", "#ffd700", "#8b5cf6"]}
              />
            </div>
          )}

          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-[99]"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-md bg-[var(--color-dark-1)] border-2 border-[var(--color-main-1)] p-6 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glow */}
              <div className="absolute inset-0 bg-[var(--color-main-1)]/20 blur-xl" />

              {/* Content */}
              <div className="relative text-center">
                {/* Header */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-5xl mb-4"
                >
                  {claimed ? "🎉" : "🎁"}
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-heading uppercase tracking-wider text-[var(--color-main-1)] mb-2"
                >
                  {claimed ? "Reward Claimed!" : "Daily Reward"}
                </motion.h2>

                {/* Streak info */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-white/60 mb-6"
                >
                  {claimed ? (
                    <>Your streak: {dailyRewardData?.streak || upcomingStreak} day{(dailyRewardData?.streak || upcomingStreak) !== 1 ? 's' : ''} 🔥</>
                  ) : (
                    <>Day {cycleDay} of your weekly rewards</>
                  )}
                </motion.p>

                {/* Reward display */}
                {!claimed ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 mb-6"
                  >
                    <div className="text-4xl mb-3">
                      {todayReward.reward?.icon || "⚡"}
                    </div>
                    <p className="text-3xl font-heading text-[var(--color-main-1)] mb-2">
                      +{todayReward.xp} XP
                    </p>
                    {todayReward.reward && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 mt-2"
                      >
                        <span className="text-lg">{todayReward.reward.icon}</span>
                        <span className="text-sm text-yellow-500 font-semibold">
                          {todayReward.reward.description}
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <div className="space-y-4 mb-6">
                    {/* XP Claimed - use actual backend response */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      className="bg-green-500/10 border border-green-500/50 p-4"
                    >
                      <p className="text-3xl font-heading text-green-500 mb-1">
                        +{dailyRewardData?.xpEarned || claimedReward?.xp || todayReward.xp} XP
                      </p>
                      <p className="text-xs text-white/40">Added to your account</p>
                    </motion.div>

                    {/* Bonus Reward Reveal */}
                    {(claimedReward?.reward || dailyRewardData?.freeSpinEarned) && (
                      <AnimatePresence>
                        {showBonusReveal && (
                          <motion.div
                            initial={{ scale: 0, rotateY: 180 }}
                            animate={{ scale: 1, rotateY: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="bg-gradient-to-b from-yellow-500/20 to-[var(--color-main-1)]/20 border-2 border-yellow-500 p-4"
                          >
                            <p className="text-xs text-yellow-500 uppercase tracking-wider mb-2">
                              Bonus Reward!
                            </p>
                            <div className="text-4xl mb-2">
                              {dailyRewardData?.freeSpinEarned ? "🎰" : claimedReward?.reward?.icon}
                            </div>
                            <p className="text-lg font-heading text-white">
                              {dailyRewardData?.freeSpinEarned ? "Free Spin Earned!" : claimedReward?.reward?.description}
                            </p>
                            <p className="text-xs text-white/40 mt-2">
                              {dailyRewardData?.freeSpinEarned 
                                ? "Head to the Spin Wheel to use your free spin!"
                                : claimedReward?.reward ? getBonusDescription(claimedReward.reward.type) : ""}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}

                    <p className="text-xs text-white/40">
                      Come back tomorrow to continue your streak!
                    </p>
                  </div>
                )}

                {/* Weekly preview */}
                {!claimed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-center gap-1 mb-6"
                  >
                    {DAILY_REWARDS.map((reward, index) => {
                      const dayNum = index + 1;
                      const isPast = dayNum < cycleDay;
                      const isCurrent = dayNum === cycleDay;

                      return (
                        <div
                          key={dayNum}
                          className={cn(
                            "w-8 h-8 flex items-center justify-center text-xs border",
                            isPast && "bg-green-500/30 text-green-500 border-green-500/50",
                            isCurrent && "bg-[var(--color-main-1)] text-white border-[var(--color-main-1)]",
                            !isPast && !isCurrent && "bg-[var(--color-dark-3)] text-white/40 border-[var(--color-dark-4)]"
                          )}
                          title={reward.reward?.description || `+${reward.xp} XP`}
                        >
                          {/* Show checkmarks for past days, and numbers for current/future days */}
                          {isPast ? "✓" : dayNum}
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {/* Action button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  {claimed ? (
                    <Button variant="outline" onClick={handleClose}>
                      Continue
                    </Button>
                  ) : (
                    <Button 
                      variant="primary" 
                      onClick={handleClaim}
                      disabled={claiming}
                      className="min-w-[160px]"
                    >
                      {claiming ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Claiming...
                        </span>
                      ) : (
                        "Claim Reward"
                      )}
                    </Button>
                  )}
                </motion.div>

                {!claimed && claimError && (
                  <div className="mt-4 border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
                    {claimError}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Helper to get bonus description based on type
function getBonusDescription(type: string): string {
  switch (type) {
    case "discount":
      return "Use at checkout for instant savings";
    case "spin":
      return "Head to the Rewards section to spin";
    case "mystery_key":
      return "Use to unlock a Mystery Box";
    case "xp_multiplier":
      return "All XP earned will be multiplied";
    case "badge":
      return "Added to your profile";
    default:
      return "";
  }
}

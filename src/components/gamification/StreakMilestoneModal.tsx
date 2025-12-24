"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { useGamificationStore } from "@/stores";
import { Button } from "@/components/ui";
import type { StreakMilestone } from "@/types/gamification";

export function StreakMilestoneModal() {
  const { showStreakMilestoneModal, milestoneData, setStreakMilestoneModal } = useGamificationStore();
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (showStreakMilestoneModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showStreakMilestoneModal]);

  const handleClose = () => {
    setStreakMilestoneModal(false);
  };

  if (!milestoneData) return null;

  return (
    <AnimatePresence>
      {showStreakMilestoneModal && (
        <>
          {/* Confetti celebration */}
          <div className="fixed inset-0 z-[102] pointer-events-none">
            <Confetti
              width={windowSize.width}
              height={windowSize.height}
              recycle={false}
              numberOfPieces={300}
              gravity={0.15}
              colors={[milestoneData.color, "#ffffff", "#ffd700", "#e08821"]}
            />
          </div>

          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[101]"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="fixed inset-0 z-[102] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-lg pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glowing border effect */}
              <div 
                className="absolute inset-0 blur-2xl opacity-50"
                style={{ backgroundColor: milestoneData.color }}
              />
              
              <div 
                className="relative bg-[var(--color-dark-1)] border-2 p-8"
                style={{ borderColor: milestoneData.color }}
              >
                {/* Badge icon with glow */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="text-center mb-6"
                >
                  <div 
                    className="inline-flex items-center justify-center w-24 h-24 rounded-full text-6xl"
                    style={{ 
                      backgroundColor: `${milestoneData.color}20`,
                      boxShadow: `0 0 60px ${milestoneData.color}80`
                    }}
                  >
                    {milestoneData.badgeIcon}
                  </div>
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mb-6"
                >
                  <h2 
                    className="text-3xl font-heading uppercase tracking-wider mb-2"
                    style={{ color: milestoneData.color }}
                  >
                    Milestone Achieved!
                  </h2>
                  <p className="text-xl text-white font-semibold">
                    {milestoneData.badge}
                  </p>
                  <p className="text-white/60 mt-2">
                    {milestoneData.description}
                  </p>
                </motion.div>

                {/* Rewards */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3 mb-8"
                >
                  {/* XP Bonus */}
                  <div 
                    className="flex items-center justify-between p-4 border"
                    style={{ 
                      borderColor: `${milestoneData.color}50`,
                      backgroundColor: `${milestoneData.color}10`
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⚡</span>
                      <span className="text-white">XP Bonus</span>
                    </div>
                    <span 
                      className="text-xl font-heading"
                      style={{ color: milestoneData.color }}
                    >
                      +{milestoneData.xpBonus.toLocaleString()}
                    </span>
                  </div>

                  {/* Badge */}
                  <div 
                    className="flex items-center justify-between p-4 border"
                    style={{ 
                      borderColor: `${milestoneData.color}50`,
                      backgroundColor: `${milestoneData.color}10`
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏅</span>
                      <span className="text-white">Exclusive Badge</span>
                    </div>
                    <span className="text-xl">{milestoneData.badgeIcon}</span>
                  </div>

                  {/* Special Reward */}
                  <div 
                    className="flex items-center justify-between p-4 border"
                    style={{ 
                      borderColor: `${milestoneData.color}50`,
                      backgroundColor: `${milestoneData.color}10`
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🎁</span>
                      <span className="text-white">Special Reward</span>
                    </div>
                    <span className="text-white/80 text-sm">
                      {getMilestoneRewardDescription(milestoneData.reward)}
                    </span>
                  </div>
                </motion.div>

                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center mb-6 py-4 border-t border-b border-[var(--color-dark-3)]"
                >
                  <p className="text-4xl font-heading" style={{ color: milestoneData.color }}>
                    {milestoneData.days}
                  </p>
                  <p className="text-sm text-white/40">Days Logged In</p>
                </motion.div>

                {/* Close button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-center"
                >
                  <Button variant="primary" onClick={handleClose} size="lg">
                    Awesome!
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Helper function to get human-readable reward description
function getMilestoneRewardDescription(reward: string): string {
  switch (reward) {
    case "bronze_loyalty":
      return "Bronze Loyalty Status";
    case "10_percent_coupon":
      return "10% Off Coupon";
    case "mystery_box":
      return "Free Mystery Box";
    case "exclusive_item":
      return "Exclusive Item Access";
    case "legendary_badge":
      return "Legendary Badge";
    default:
      return "Special Reward";
  }
}


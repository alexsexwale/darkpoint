"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { useGamificationStore } from "@/stores";
import { RARITY_CONFIG } from "@/types/gamification";
import { Button } from "@/components/ui";

export function AchievementUnlockModal() {
  const { showAchievementModal, unlockedAchievement, setAchievementModal } =
    useGamificationStore();
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
    if (showAchievementModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showAchievementModal]);

  if (!unlockedAchievement) return null;

  const rarity = RARITY_CONFIG[unlockedAchievement.rarity];

  return (
    <AnimatePresence>
      {showAchievementModal && (
        <>
          {/* Confetti for rare+ */}
          {unlockedAchievement.rarity !== "common" && (
            <div className="fixed inset-0 z-[100] pointer-events-none">
              <Confetti
                width={windowSize.width}
                height={windowSize.height}
                recycle={false}
                numberOfPieces={150}
                gravity={0.15}
                colors={[rarity.color, "#ffffff", "#ffd700"]}
              />
            </div>
          )}

          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-[99]"
            onClick={() => setAchievementModal(false)}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-sm bg-[var(--color-dark-1)] border-2 p-6 text-center pointer-events-auto"
              style={{ borderColor: rarity.color }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glow effect */}
              <div
                className="absolute inset-0 blur-2xl opacity-40"
                style={{ background: rarity.color }}
              />

              {/* Content */}
              <div className="relative">
                {/* Header */}
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-xs uppercase tracking-[0.3em] mb-4"
                  style={{ color: rarity.color }}
                >
                  Achievement Unlocked
                </motion.p>

                {/* Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-24 h-24 mx-auto mb-4 flex items-center justify-center text-6xl"
                  style={{
                    background: `linear-gradient(135deg, ${rarity.color}33, ${rarity.color}11)`,
                    border: `3px solid ${rarity.color}`,
                    boxShadow: rarity.glow,
                  }}
                >
                  {unlockedAchievement.icon}
                </motion.div>

                {/* Name */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl font-heading uppercase tracking-wider mb-2"
                  style={{ color: rarity.color }}
                >
                  {unlockedAchievement.name}
                </motion.h2>

                {/* Rarity */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="inline-block px-3 py-1 text-xs uppercase tracking-wider mb-3"
                  style={{
                    background: `${rarity.color}20`,
                    color: rarity.color,
                  }}
                >
                  {rarity.name}
                </motion.div>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-white/60 mb-4"
                >
                  {unlockedAchievement.description}
                </motion.p>

                {/* XP Reward */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-main-1)]/20 border border-[var(--color-main-1)]/50 mb-6"
                >
                  <span className="text-xl">⚡</span>
                  <span className="font-heading text-lg text-[var(--color-main-1)]">
                    +{unlockedAchievement.xp_reward} XP
                  </span>
                </motion.div>

                {/* Close button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <Button
                    variant="outline"
                    onClick={() => setAchievementModal(false)}
                    className="min-w-[120px]"
                  >
                    Nice!
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


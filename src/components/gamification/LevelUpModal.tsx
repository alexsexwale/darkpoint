"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { useGamificationStore } from "@/stores";
import { getLevelTier } from "@/types/gamification";
import { Button } from "@/components/ui";

export function LevelUpModal() {
  const { showLevelUpModal, levelUpData, setLevelUpModal } = useGamificationStore();
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Get window size for confetti
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Lock body scroll
  useEffect(() => {
    if (showLevelUpModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showLevelUpModal]);

  if (!levelUpData) return null;

  const tier = getLevelTier(levelUpData.newLevel);

  return (
    <AnimatePresence>
      {showLevelUpModal && (
        <>
          {/* Confetti */}
          <div className="fixed inset-0 z-[100] pointer-events-none">
            <Confetti
              width={windowSize.width}
              height={windowSize.height}
              recycle={false}
              numberOfPieces={300}
              gravity={0.1}
              colors={[tier.color, "#ffffff", "#ffd700", "#ff6b6b", "#4ecdc4"]}
            />
          </div>

          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/90 z-[99]"
            onClick={() => setLevelUpModal(false)}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-md bg-[var(--color-dark-1)] border-2 p-8 text-center pointer-events-auto"
              style={{ borderColor: tier.color }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glowing border effect */}
              <div
                className="absolute inset-0 blur-xl opacity-30"
                style={{ background: tier.color }}
              />

              {/* Corner decorations */}
              <div
                className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4"
                style={{ borderColor: tier.color }}
              />
              <div
                className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4"
                style={{ borderColor: tier.color }}
              />
              <div
                className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4"
                style={{ borderColor: tier.color }}
              />
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4"
                style={{ borderColor: tier.color }}
              />

              {/* Content */}
              <div className="relative">
                {/* Celebration emoji */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-6xl mb-4"
                >
                  🎉
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-heading uppercase tracking-wider mb-2"
                  style={{ color: tier.color }}
                >
                  Level Up!
                </motion.h2>

                {/* Level number */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                  style={{
                    background: `linear-gradient(135deg, ${tier.color}33, ${tier.color}11)`,
                    border: `3px solid ${tier.color}`,
                    boxShadow: `0 0 30px ${tier.color}60`,
                  }}
                >
                  <span
                    className="text-3xl font-heading font-bold"
                    style={{ color: tier.color }}
                  >
                    {levelUpData.newLevel}
                  </span>
                </motion.div>

                {/* Title */}
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-xl font-heading uppercase tracking-widest mb-6"
                  style={{ color: tier.color }}
                >
                  {levelUpData.newTitle}
                </motion.p>

                {/* Perks unlocked */}
                {levelUpData.perks.length > 0 && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mb-6"
                  >
                    <p className="text-sm text-white/60 uppercase tracking-wider mb-3">
                      Perks Unlocked
                    </p>
                    <div className="space-y-2">
                      {levelUpData.perks.map((perk, index) => (
                        <motion.div
                          key={perk}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.7 + index * 0.1 }}
                          className="flex items-center justify-center gap-2 text-sm"
                        >
                          <span style={{ color: tier.color }}>✓</span>
                          <span className="text-white/80">{perk}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Close button */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <Button
                    variant="outline"
                    onClick={() => setLevelUpModal(false)}
                    className="min-w-[160px]"
                  >
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


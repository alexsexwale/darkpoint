"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { useGamificationStore } from "@/stores";
import { SpinWheel } from "./SpinWheel";
import { Button } from "@/components/ui";
import type { SpinPrize } from "@/types/gamification";

interface SpinWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpinWheelModal({ isOpen, onClose }: SpinWheelModalProps) {
  const { userProfile, isSpinning, lastSpinResult } = useGamificationStore();
  const availableSpins = userProfile?.available_spins || 0;
  const [showResult, setShowResult] = useState(false);
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
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setShowResult(false);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSpinComplete = async (prize: SpinPrize) => {
    setShowResult(true);
    // Note: XP is now awarded directly by the database spin_wheel function
    // which also applies any active XP multiplier. No need to call addXP here.
  };

  const handleClose = () => {
    if (!isSpinning) {
      setShowResult(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Confetti on win */}
          {showResult && lastSpinResult && (
            <div className="fixed inset-0 z-[100] pointer-events-none">
              <Confetti
                width={windowSize.width}
                height={windowSize.height}
                recycle={false}
                numberOfPieces={200}
                gravity={0.15}
                colors={[lastSpinResult.color, "#ffffff", "#ffd700", "#e08821"]}
              />
            </div>
          )}

          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[99]"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-lg bg-[var(--color-dark-1)] border border-[var(--color-dark-3)] p-6 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              {!isSpinning && (
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors cursor-pointer z-10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-heading uppercase tracking-wider text-[var(--color-main-1)]">
                  Spin to Win!
                </h2>
                <p className="text-sm text-white/60 mt-1">
                  Try your luck for amazing prizes
                </p>
              </div>

              {/* Wheel */}
              <div className="flex justify-center mb-6">
                <SpinWheel size={300} onSpinComplete={handleSpinComplete} />
              </div>

              {/* Result display */}
              <AnimatePresence mode="wait">
                {showResult && lastSpinResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="text-center mb-6"
                  >
                    <div
                      className="inline-block px-6 py-4 border-2"
                      style={{
                        borderColor: lastSpinResult.color,
                        background: `${lastSpinResult.color}20`,
                      }}
                    >
                      <p className="text-xs uppercase tracking-wider text-white/60 mb-1">
                        You Won
                      </p>
                      <p
                        className="text-2xl font-heading uppercase"
                        style={{ color: lastSpinResult.color }}
                      >
                        {lastSpinResult.name}
                      </p>
                      {lastSpinResult.description && (
                        <p className="text-sm text-white/60 mt-1">
                          {lastSpinResult.description}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Spins remaining */}
              <div className="text-center">
                <p className="text-sm text-white/40">
                  {availableSpins > 0 ? (
                    <>
                      You have <span className="text-[var(--color-main-1)]">{availableSpins}</span>{" "}
                      spin{availableSpins !== 1 ? "s" : ""} remaining
                    </>
                  ) : (
                    <>No spins available. Earn more through daily logins and purchases!</>
                  )}
                </p>
              </div>

              {/* Action buttons */}
              {showResult && !isSpinning && (
                <div className="flex justify-center gap-4 mt-6">
                  {availableSpins > 0 && (
                    <Button
                      variant="primary"
                      onClick={() => setShowResult(false)}
                    >
                      Spin Again
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleClose}>
                    Close
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


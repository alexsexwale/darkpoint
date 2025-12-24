"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import { RARITY_CONFIG, type Rarity } from "@/types/gamification";
import { Button } from "@/components/ui";

interface MysteryBoxOpeningProps {
  isOpen: boolean;
  onClose: () => void;
  boxName: string;
  revealedItem: {
    name: string;
    value: number;
    rarity: Rarity;
    imageUrl?: string;
  } | null;
}

export function MysteryBoxOpening({
  isOpen,
  onClose,
  boxName,
  revealedItem,
}: MysteryBoxOpeningProps) {
  const [phase, setPhase] = useState<"shaking" | "opening" | "revealed">("shaking");
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
      setPhase("shaking");

      // Progress through phases
      const shakingTimer = setTimeout(() => setPhase("opening"), 2000);
      const revealTimer = setTimeout(() => setPhase("revealed"), 3500);

      return () => {
        clearTimeout(shakingTimer);
        clearTimeout(revealTimer);
      };
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const rarityConfig = revealedItem ? RARITY_CONFIG[revealedItem.rarity] : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Confetti on reveal */}
          {phase === "revealed" && revealedItem && (
            <div className="fixed inset-0 z-[100] pointer-events-none">
              <Confetti
                width={windowSize.width}
                height={windowSize.height}
                recycle={false}
                numberOfPieces={revealedItem.rarity === "legendary" || revealedItem.rarity === "mythic" ? 400 : 200}
                gravity={0.1}
                colors={rarityConfig ? [rarityConfig.color, "#ffffff", "#ffd700"] : undefined}
              />
            </div>
          )}

          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[99]"
          />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg text-center">
              {/* Phase: Shaking */}
              <AnimatePresence mode="wait">
                {phase === "shaking" && (
                  <motion.div
                    key="shaking"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-8"
                  >
                    <p className="text-xl text-white/60 uppercase tracking-widest">
                      Opening {boxName}...
                    </p>

                    {/* Shaking box */}
                    <motion.div
                      animate={{
                        x: [0, -5, 5, -5, 5, 0],
                        rotate: [0, -2, 2, -2, 2, 0],
                      }}
                      transition={{ duration: 0.3, repeat: Infinity }}
                      className="text-9xl inline-block"
                    >
                      📦
                    </motion.div>

                    {/* Loading bar */}
                    <div className="w-64 h-2 mx-auto bg-[var(--color-dark-4)] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2, ease: "linear" }}
                        className="h-full bg-[var(--color-main-1)]"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Phase: Opening */}
                {phase === "opening" && (
                  <motion.div
                    key="opening"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.5 }}
                    className="space-y-8"
                  >
                    {/* Explosion effect */}
                    <motion.div
                      animate={{
                        scale: [1, 1.5, 2],
                        opacity: [1, 0.8, 0],
                      }}
                      transition={{ duration: 1.5 }}
                      className="text-9xl inline-block"
                    >
                      💥
                    </motion.div>

                    {/* Particles */}
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 1, x: 0, y: 0 }}
                        animate={{
                          opacity: 0,
                          x: Math.cos((i / 12) * Math.PI * 2) * 200,
                          y: Math.sin((i / 12) * Math.PI * 2) * 200,
                        }}
                        transition={{ duration: 1 }}
                        className="absolute left-1/2 top-1/2 w-4 h-4 bg-[var(--color-main-1)] rounded-full"
                        style={{
                          marginLeft: -8,
                          marginTop: -8,
                        }}
                      />
                    ))}
                  </motion.div>
                )}

                {/* Phase: Revealed */}
                {phase === "revealed" && revealedItem && rarityConfig && (
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    {/* Rarity label */}
                    <motion.div
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <span
                        className="inline-block px-4 py-2 text-sm uppercase tracking-[0.3em] font-heading"
                        style={{
                          background: `${rarityConfig.color}30`,
                          color: rarityConfig.color,
                          boxShadow: rarityConfig.glow,
                        }}
                      >
                        {rarityConfig.name}
                      </span>
                    </motion.div>

                    {/* Item display */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                      className="relative inline-block"
                    >
                      {/* Glow background */}
                      <div
                        className="absolute inset-0 blur-3xl opacity-50"
                        style={{ background: rarityConfig.color }}
                      />

                      {/* Item container */}
                      <div
                        className="relative w-64 h-64 mx-auto flex items-center justify-center border-4"
                        style={{
                          borderColor: rarityConfig.color,
                          background: `linear-gradient(135deg, ${rarityConfig.color}20, transparent)`,
                          boxShadow: rarityConfig.glow,
                        }}
                      >
                        {revealedItem.imageUrl ? (
                          <img
                            src={revealedItem.imageUrl}
                            alt={revealedItem.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <span className="text-7xl">🎁</span>
                        )}
                      </div>
                    </motion.div>

                    {/* Item name */}
                    <motion.h2
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-2xl font-heading"
                      style={{ color: rarityConfig.color }}
                    >
                      {revealedItem.name}
                    </motion.h2>

                    {/* Item value */}
                    <motion.p
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="text-xl font-heading text-[var(--color-main-1)]"
                    >
                      Worth {formatPrice(revealedItem.value)}
                    </motion.p>

                    {/* Close button */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      <Button variant="outline" onClick={onClose}>
                        Awesome!
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGamificationStore } from "@/stores";

/**
 * Floating XP Multiplier indicator for mobile devices
 * Shows as a small floating badge in the bottom-left corner
 * Only visible on mobile (md:hidden) when an active multiplier exists
 */
export function FloatingXPMultiplier() {
  const { activeMultiplier, fetchActiveMultiplier } = useGamificationStore();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Format time remaining (compact version)
  const formatTime = useCallback((seconds: number): string => {
    if (seconds <= 0) return "0s";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
    }
    return `${minutes}m`;
  }, []);

  // Countdown timer
  useEffect(() => {
    const expiresAtStr = activeMultiplier?.multiplier_expires_at || activeMultiplier?.expires_at;
    if (!expiresAtStr) {
      setTimeRemaining(null);
      return;
    }

    const calculateRemaining = () => {
      const expiresAt = new Date(expiresAtStr).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((expiresAt - now) / 1000));
    };

    setTimeRemaining(calculateRemaining());

    const interval = setInterval(() => {
      setTimeRemaining(calculateRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeMultiplier]);

  // Fetch multiplier on mount
  useEffect(() => {
    fetchActiveMultiplier();
  }, [fetchActiveMultiplier]);

  const isActive = activeMultiplier && timeRemaining !== null && timeRemaining > 0;
  const isExpiring = timeRemaining !== null && timeRemaining <= 300 && timeRemaining > 0;
  const multiplierValue = activeMultiplier?.multiplier_value || activeMultiplier?.multiplier || 1;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, x: -20, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -20, y: 20 }}
          className={`
            md:hidden fixed bottom-20 left-4 z-40
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium
            shadow-lg backdrop-blur-sm
            ${isExpiring 
              ? "bg-red-500/90 text-white border border-red-400/50" 
              : "bg-[var(--color-main-1)]/90 text-white border border-[var(--color-main-1)]/50"
            }
          `}
        >
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-sm"
          >
            ⚡
          </motion.span>
          <span className="font-bold">{multiplierValue}x</span>
          <span className="opacity-90 text-[10px]">
            {formatTime(timeRemaining!)}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


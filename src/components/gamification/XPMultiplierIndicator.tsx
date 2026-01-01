"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGamificationStore } from "@/stores";

interface XPMultiplierIndicatorProps {
  variant?: "compact" | "full" | "header";
  showOnlyWhenActive?: boolean;
}

export function XPMultiplierIndicator({ 
  variant = "compact",
  showOnlyWhenActive = true 
}: XPMultiplierIndicatorProps) {
  const { 
    activeMultiplier, 
    fetchActiveMultiplier,
    clearActiveMultiplier,
    addNotification 
  } = useGamificationStore();
  
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [hasNotifiedExpiring, setHasNotifiedExpiring] = useState(false);
  const [hasNotifiedExpired, setHasNotifiedExpired] = useState(false);

  // Format time remaining
  const formatTime = useCallback((seconds: number): string => {
    if (seconds <= 0) return "Expired";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!activeMultiplier?.expires_at) {
      setTimeRemaining(null);
      return;
    }

    const calculateRemaining = () => {
      const expiresAt = new Date(activeMultiplier.expires_at).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      return remaining;
    };

    // Initial calculation
    setTimeRemaining(calculateRemaining());

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setTimeRemaining(remaining);

      // Notify when 5 minutes remaining
      if (remaining <= 300 && remaining > 0 && !hasNotifiedExpiring) {
        setHasNotifiedExpiring(true);
        addNotification({
          type: "info",
          title: "⚡ XP Boost Expiring Soon!",
          message: `Your ${activeMultiplier.multiplier}x XP multiplier expires in ${formatTime(remaining)}`,
          icon: "⏰",
        });
      }

      // Notify when expired
      if (remaining <= 0 && !hasNotifiedExpired) {
        setHasNotifiedExpired(true);
        addNotification({
          type: "info",
          title: "XP Boost Ended",
          message: `Your ${activeMultiplier.multiplier}x XP multiplier has expired. You earned ${activeMultiplier.xp_earned_with_multiplier || 0} bonus XP!`,
          icon: "⌛",
        });
        // Clear the multiplier from state
        clearActiveMultiplier();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeMultiplier, hasNotifiedExpiring, hasNotifiedExpired, addNotification, clearActiveMultiplier, formatTime]);

  // Reset notification flags when multiplier changes
  useEffect(() => {
    if (activeMultiplier?.id) {
      setHasNotifiedExpiring(false);
      setHasNotifiedExpired(false);
    }
  }, [activeMultiplier?.id]);

  // Fetch multiplier on mount
  useEffect(() => {
    fetchActiveMultiplier();
  }, [fetchActiveMultiplier]);

  // Don't render if no active multiplier and showOnlyWhenActive is true
  if (!activeMultiplier && showOnlyWhenActive) {
    return null;
  }

  // Determine if multiplier is active and valid
  const isActive = activeMultiplier && timeRemaining !== null && timeRemaining > 0;
  const isExpiring = timeRemaining !== null && timeRemaining <= 300 && timeRemaining > 0;

  if (variant === "header") {
    return (
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
              ${isExpiring 
                ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                : "bg-[var(--color-main-1)]/20 text-[var(--color-main-1)] border border-[var(--color-main-1)]/30"
              }
            `}
          >
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-base"
            >
              ⚡
            </motion.span>
            <span className="font-heading">{activeMultiplier.multiplier}x XP</span>
            <span className="text-xs opacity-75">
              {formatTime(timeRemaining!)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (variant === "compact") {
    return (
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`
              inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium
              ${isExpiring 
                ? "bg-red-500/20 text-red-400" 
                : "bg-[var(--color-main-1)]/20 text-[var(--color-main-1)]"
              }
            `}
          >
            <motion.span
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
            >
              ⚡
            </motion.span>
            <span>{activeMultiplier.multiplier}x</span>
            <span className="opacity-75">{formatTime(timeRemaining!)}</span>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Full variant - detailed card
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`
            relative overflow-hidden rounded-lg p-4
            ${isExpiring 
              ? "bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30" 
              : "bg-gradient-to-br from-[var(--color-main-1)]/20 to-[var(--color-main-1)]/5 border border-[var(--color-main-1)]/30"
            }
          `}
        >
          {/* Animated background glow */}
          <motion.div
            className={`
              absolute inset-0 opacity-30
              ${isExpiring ? "bg-red-500" : "bg-[var(--color-main-1)]"}
            `}
            animate={{
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ filter: "blur(40px)" }}
          />

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-2xl"
                >
                  ⚡
                </motion.div>
                <div>
                  <h3 className="font-heading text-lg text-white">XP BOOST ACTIVE</h3>
                  <p className="text-xs text-white/60">{activeMultiplier.source_description}</p>
                </div>
              </div>
              <div className={`
                text-3xl font-heading 
                ${isExpiring ? "text-red-400" : "text-[var(--color-main-1)]"}
              `}>
                {activeMultiplier.multiplier}x
              </div>
            </div>

            {/* Countdown */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-white/60">Time Remaining</span>
                <span className={`
                  font-mono font-bold
                  ${isExpiring ? "text-red-400" : "text-white"}
                `}>
                  {formatTime(timeRemaining!)}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${isExpiring ? "bg-red-500" : "bg-[var(--color-main-1)]"}`}
                  initial={{ width: "100%" }}
                  animate={{ 
                    width: `${Math.min(100, (timeRemaining! / (24 * 3600)) * 100)}%` 
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Bonus XP Earned</span>
              <span className="text-[var(--color-main-1)] font-medium">
                +{activeMultiplier.xp_earned_with_multiplier || 0} XP
              </span>
            </div>

            {/* Expiring warning */}
            {isExpiring && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 p-2 bg-red-500/20 rounded text-center"
              >
                <span className="text-red-400 text-sm font-medium">
                  ⚠️ Your boost is expiring soon! Earn XP now!
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


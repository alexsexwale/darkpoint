"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SpinWheel, XPBar, LevelBadge } from "@/components/gamification";
import { Button } from "@/components/ui";
import { useGamificationStore } from "@/stores";
import { useGamification } from "@/hooks";
import type { SpinPrize } from "@/types/gamification";

export function SpinPageClient() {
  const { userProfile, availableSpins, lastSpinResult, isSpinning } = useGamificationStore();
  const { addXP } = useGamification();

  const handleSpinComplete = async (prize: SpinPrize) => {
    if (prize.prize_type === "xp") {
      await addXP("spin_reward", parseInt(prize.prize_value), `Spin wheel: ${prize.name}`);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-8 md:py-16 overflow-hidden px-4">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-main-1)]/10 to-transparent" />

        <div className="container relative max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6 md:mb-12">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl sm:text-4xl md:text-5xl font-heading uppercase tracking-wider mb-3 md:mb-4"
            >
              <span className="text-[var(--color-main-1)]">Spin</span> to Win!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-sm sm:text-base text-white/60 max-w-md mx-auto px-4"
            >
              Try your luck and win amazing prizes including discounts, XP bonuses, and exclusive rewards!
            </motion.p>
          </div>

          {/* Main content grid */}
          <div className="grid lg:grid-cols-3 gap-6 md:gap-8 items-start">
            {/* Left sidebar - User info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-1 space-y-4 md:space-y-6 order-2 lg:order-1"
            >
              {/* User card */}
              {userProfile && (
                <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-4 md:p-6">
                  <div className="flex items-center gap-3 md:gap-4 mb-4">
                    <LevelBadge size="md" showTitle={false} />
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-base md:text-lg truncate">{userProfile.display_name || "Player"}</p>
                      <p className="text-xs md:text-sm text-white/60">{userProfile.total_xp.toLocaleString()} XP</p>
                    </div>
                  </div>
                  <XPBar showLevel showXPText />
                </div>
              )}

              {/* Spins info */}
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-4 md:p-6">
                <h3 className="font-heading text-base md:text-lg mb-3 md:mb-4">Your Spins</h3>
                <div className="text-center py-3 md:py-4">
                  <span className="text-4xl md:text-5xl font-heading text-[var(--color-main-1)]">
                    {availableSpins}
                  </span>
                  <p className="text-xs md:text-sm text-white/60 mt-1">Available Spins</p>
                </div>
                <div className="border-t border-[var(--color-dark-3)] pt-3 md:pt-4 mt-3 md:mt-4 text-xs md:text-sm text-white/40 space-y-1.5 md:space-y-2">
                  <p>• Login daily for bonus spins</p>
                  <p>• Day 5 streak = Free spin</p>
                  <p>• Spend R1000+ = Bonus spin</p>
                </div>
              </div>

              {/* Quick links */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 md:space-y-2">
                <Link href="/rewards/shop" className="lg:w-full">
                  <Button variant="outline" className="w-full text-xs sm:text-sm">
                    Rewards Shop →
                  </Button>
                </Link>
                <Link href="/account/achievements" className="lg:w-full">
                  <Button variant="outline" className="w-full text-xs sm:text-sm">
                    Achievements →
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Center - Wheel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 flex flex-col items-center order-1 lg:order-2"
            >
              <div className="w-full flex justify-center">
                <SpinWheel 
                  size={380}
                  onSpinComplete={handleSpinComplete} 
                />
              </div>

              {/* Last result */}
              {lastSpinResult && !isSpinning && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 md:mt-8 text-center px-4"
                >
                  <p className="text-xs md:text-sm text-white/60 mb-2">Last spin result:</p>
                  <div
                    className="inline-block px-4 md:px-6 py-2 md:py-3 border rounded"
                    style={{
                      borderColor: lastSpinResult.color,
                      background: `${lastSpinResult.color}20`,
                    }}
                  >
                    <span
                      className="font-heading text-base md:text-xl"
                      style={{ color: lastSpinResult.color }}
                    >
                      {lastSpinResult.name}
                    </span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Prize list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 md:mt-16"
          >
            <h2 className="text-xl md:text-2xl font-heading text-center mb-4 md:mb-8">Possible Prizes</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
              {[
                { name: "5% Off", color: "#22c55e", icon: "🏷️" },
                { name: "10% Off", color: "#3b82f6", icon: "🎫" },
                { name: "50 XP", color: "#8b5cf6", icon: "⚡" },
                { name: "100 XP", color: "#a855f7", icon: "⚡" },
                { name: "Free Shipping", color: "#f59e0b", icon: "🚚" },
                { name: "Mystery Gift", color: "#ec4899", icon: "🎁" },
                { name: "R500 Credit", color: "#ef4444", icon: "💰" },
              ].map((prize) => (
                <div
                  key={prize.name}
                  className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-3 md:p-4 text-center"
                >
                  <div className="text-2xl md:text-3xl mb-1 md:mb-2">{prize.icon}</div>
                  <p className="text-xs md:text-sm font-heading" style={{ color: prize.color }}>
                    {prize.name}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}


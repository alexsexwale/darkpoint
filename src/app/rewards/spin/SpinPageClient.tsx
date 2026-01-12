"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { SpinWheel, XPBar, LevelBadge } from "@/components/gamification";
import { Button } from "@/components/ui";
import { VerificationRequired } from "@/components/auth";
import { useGamificationStore, useAuthStore, useUIStore } from "@/stores";

// Skeleton components
function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-[var(--color-dark-3)] rounded ${className}`} />
  );
}

function SpinPageSkeleton() {
  return (
    <div className="min-h-screen">
      <section className="relative py-8 md:py-16 overflow-hidden px-4">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-main-1)]/10 to-transparent" />

        <div className="container relative max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="text-center mb-6 md:mb-12">
            <SkeletonPulse className="h-10 md:h-14 w-64 mx-auto mb-4" />
            <SkeletonPulse className="h-4 w-80 mx-auto" />
          </div>

          {/* Main content grid */}
          <div className="grid lg:grid-cols-3 gap-6 md:gap-8 items-start">
            {/* Left sidebar skeleton */}
            <div className="lg:col-span-1 space-y-4 md:space-y-6 order-2 lg:order-1">
              {/* User card skeleton */}
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-4 md:p-6">
                <div className="flex items-center gap-3 md:gap-4 mb-4">
                  <SkeletonPulse className="w-12 h-12 rounded-full" />
                  <div className="flex-1">
                    <SkeletonPulse className="h-5 w-24 mb-2" />
                    <SkeletonPulse className="h-3 w-16" />
                  </div>
                </div>
                <SkeletonPulse className="h-2 w-full rounded-full" />
                <div className="flex justify-between mt-2">
                  <SkeletonPulse className="h-3 w-12" />
                  <SkeletonPulse className="h-3 w-16" />
                </div>
              </div>

              {/* Spins info skeleton */}
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-4 md:p-6">
                <SkeletonPulse className="h-5 w-24 mb-4" />
                <div className="text-center py-3 md:py-4">
                  <SkeletonPulse className="h-12 w-12 mx-auto rounded-full mb-2" />
                  <SkeletonPulse className="h-3 w-20 mx-auto" />
                </div>
                <div className="border-t border-[var(--color-dark-3)] pt-3 md:pt-4 mt-3 md:mt-4 space-y-2">
                  <SkeletonPulse className="h-3 w-full" />
                  <SkeletonPulse className="h-3 w-3/4" />
                  <SkeletonPulse className="h-3 w-5/6" />
                </div>
              </div>

              {/* Quick links skeleton */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                <SkeletonPulse className="h-10 w-full" />
                <SkeletonPulse className="h-10 w-full" />
              </div>
            </div>

            {/* Center - Wheel skeleton */}
            <div className="lg:col-span-2 flex flex-col items-center order-1 lg:order-2">
              <div className="relative">
                {/* Wheel circle skeleton */}
                <SkeletonPulse className="w-[300px] h-[300px] md:w-[380px] md:h-[380px] rounded-full" />
                {/* Center button skeleton */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <SkeletonPulse className="w-16 h-16 md:w-20 md:h-20 rounded-full" />
                </div>
              </div>
              <SkeletonPulse className="h-4 w-32 mt-4" />
            </div>
          </div>

          {/* Prize list skeleton */}
          <div className="mt-8 md:mt-16">
            <SkeletonPulse className="h-7 w-40 mx-auto mb-6" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-3 md:p-4"
                >
                  <SkeletonPulse className="w-8 h-8 mx-auto mb-2 rounded" />
                  <SkeletonPulse className="h-3 w-16 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function SpinPageClient() {
  const { 
    userProfile, 
    lastSpinResult, 
    isSpinning,
    fetchSpinPrizes,
    isInitialized,
    isLoading,
    updateQuestProgress,
    initDailyQuests,
    logActivity,
  } = useGamificationStore();
  const { isAuthenticated, isInitialized: authInitialized, isEmailVerified } = useAuthStore();
  const { openSignIn } = useUIStore();
  const hasTrackedVisit = useRef(false);
  
  const availableSpins = userProfile?.available_spins || 0;

  // Fetch spin prizes if not loaded
  useEffect(() => {
    if (isInitialized) {
      fetchSpinPrizes();
    }
  }, [isInitialized, fetchSpinPrizes]);

  // Track page visit for "Lucky Explorer" quest
  useEffect(() => {
    if (authInitialized && isAuthenticated && !hasTrackedVisit.current) {
      hasTrackedVisit.current = true;
      initDailyQuests();
      
      // Log activity to prevent duplicate tracking
      logActivity("visit_spin_wheel").then((isNewActivity) => {
        if (isNewActivity) {
          console.log("[Quest] Tracking Spin Wheel visit");
          updateQuestProgress("visit_spin", 1);
        }
      });
    }
  }, [authInitialized, isAuthenticated, initDailyQuests, logActivity, updateQuestProgress]);

  // Show skeleton loader while loading
  if (!authInitialized || (isAuthenticated && (isLoading || !userProfile))) {
    return <SpinPageSkeleton />;
  }

  // Show login prompt for unauthenticated users
  if (authInitialized && !isAuthenticated) {
    return (
      <div className="min-h-screen">
        <section className="relative py-8 md:py-16 overflow-hidden px-4">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-main-1)]/10 via-transparent to-[var(--color-main-1)]/5" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-main-1)]/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          </div>

          <div className="container relative max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8 md:mb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-6xl md:text-8xl mb-4"
              >
                🎡
              </motion.div>
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
                className="text-sm sm:text-base text-white/60 max-w-md mx-auto"
              >
                Win discounts, XP bonuses, free shipping, and exclusive rewards!
              </motion.p>
            </div>

            {/* Login prompt card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-[var(--color-dark-2)] to-[var(--color-dark-1)] border border-[var(--color-main-1)]/30 rounded-lg p-6 md:p-10 text-center max-w-2xl mx-auto"
            >
              {/* Lock icon */}
              <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 rounded-full bg-[var(--color-main-1)]/20 border-2 border-[var(--color-main-1)]/40 flex items-center justify-center">
                <svg className="w-10 h-10 md:w-12 md:h-12 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <h2 className="text-2xl md:text-3xl font-heading mb-3">
                Unlock the <span className="text-[var(--color-main-1)]">Spin Wheel</span>
              </h2>
              <p className="text-white/60 mb-6 max-w-md mx-auto">
                Sign in or create an account to start spinning and winning amazing prizes. New members get a <span className="text-[var(--color-main-1)] font-semibold">FREE spin</span>!
              </p>

              {/* Benefits */}
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-[var(--color-dark-3)]/50 rounded-lg p-4">
                  <div className="text-3xl mb-2">🎁</div>
                  <p className="text-sm font-medium">1 Free Spin</p>
                  <p className="text-xs text-white/50">On signup</p>
                </div>
                <div className="bg-[var(--color-dark-3)]/50 rounded-lg p-4">
                  <div className="text-3xl mb-2">⚡</div>
                  <p className="text-sm font-medium">100 Bonus XP</p>
                  <p className="text-xs text-white/50">Welcome gift</p>
                </div>
                <div className="bg-[var(--color-dark-3)]/50 rounded-lg p-4">
                  <div className="text-3xl mb-2">🏷️</div>
                  <p className="text-sm font-medium">10% Off</p>
                  <p className="text-xs text-white/50">First order</p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => openSignIn("login")}
                  size="lg"
                  className="min-w-[200px] text-base"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => openSignIn("register")}
                  variant="outline"
                  size="lg"
                  className="min-w-[200px] text-base"
                >
                  Create Account
                </Button>
                <Link href="/rewards">
                  <Button variant="outline" size="lg" className="min-w-[200px] text-base">
                    Explore Rewards
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Prize preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-12 md:mt-16"
            >
              <h3 className="text-lg md:text-xl font-heading text-center mb-6 text-white/80">
                🎰 Prizes You Could Win
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {[
                  { name: "5% Off", color: "#6b7280", icon: "🏷️" },
                  { name: "10% Off", color: "#22c55e", icon: "🎫" },
                  { name: "Free Spin", color: "#ef4444", icon: "🎡" },
                  { name: "+100 XP", color: "#a855f7", icon: "⚡" },
                  { name: "+500 XP", color: "#fbbf24", icon: "🏆" },
                  { name: "2x XP Boost", color: "#dc2626", icon: "🚀" },
                ].map((prize, i) => (
                  <motion.div
                    key={prize.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 0.6, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    whileHover={{ opacity: 1, scale: 1.05 }}
                    className="bg-[var(--color-dark-2)]/50 border border-[var(--color-dark-3)] p-3 text-center rounded cursor-default"
                  >
                    <div className="text-2xl mb-1">{prize.icon}</div>
                    <p className="text-xs font-heading" style={{ color: prize.color }}>
                      {prize.name}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    );
  }

  // Show verification required for unverified users
  if (isAuthenticated && !isEmailVerified) {
    return (
      <div className="min-h-screen">
        <section className="relative py-8 md:py-16 overflow-hidden px-4">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-main-1)]/10 to-transparent" />
          <div className="container relative max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="text-6xl md:text-8xl mb-4">🎡</div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading uppercase tracking-wider mb-3 md:mb-4">
                <span className="text-[var(--color-main-1)]">Spin</span> to Win!
              </h1>
            </div>
            <VerificationRequired feature="spin the wheel and win prizes">
              <div />
            </VerificationRequired>
          </div>
        </section>
      </div>
    );
  }

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
                <div className="border-t border-[var(--color-dark-3)] pt-3 md:pt-4 mt-3 md:mt-4 text-xs md:text-sm text-white/60 space-y-1.5 md:space-y-2">
                  <p>• Login daily for bonus spins</p>
                  <p>• Day 5 streak = Free spin</p>
                  <p>• Spend R1000+ (after discounts) = Bonus spin</p>
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
                <SpinWheel size={380} />
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {[
                { name: "5% Off", color: "#6b7280", icon: "🏷️" },
                { name: "10% Off", color: "#22c55e", icon: "🎫" },
                { name: "Free Spin", color: "#ef4444", icon: "🎡" },
                { name: "Bonus Spin", color: "#f97316", icon: "🎰" },
                { name: "+50 XP", color: "#3b82f6", icon: "⚡" },
                { name: "+75 XP", color: "#8b5cf6", icon: "⚡" },
                { name: "+100 XP", color: "#a855f7", icon: "⚡" },
                { name: "+150 XP", color: "#ec4899", icon: "⚡" },
                { name: "+250 XP", color: "#f59e0b", icon: "💎" },
                { name: "+500 XP", color: "#fbbf24", icon: "🏆" },
                { name: "2x XP Boost", color: "#dc2626", icon: "🚀" },
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


"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RewardShopGrid, XPBar, LevelBadge, XPMultiplierIndicator } from "@/components/gamification";
import { Button } from "@/components/ui";
import { VerificationRequired } from "@/components/auth";
import { useGamificationStore, useAuthStore, useUIStore } from "@/stores";

export function RewardsShopPageClient() {
  const { 
    userProfile, 
    updateQuestProgress, 
    initDailyQuests, 
    logActivity 
  } = useGamificationStore();
  const { isAuthenticated, isInitialized: authInitialized, isEmailVerified } = useAuthStore();
  const { openSignIn } = useUIStore();
  const hasTrackedVisit = useRef(false);

  // Track page visit for "Reward Seeker" quest
  useEffect(() => {
    if (authInitialized && isAuthenticated && !hasTrackedVisit.current) {
      hasTrackedVisit.current = true;
      initDailyQuests();
      
      // Log activity to prevent duplicate tracking
      logActivity("visit_rewards_shop").then((isNewActivity) => {
        if (isNewActivity) {
          updateQuestProgress("visit_rewards", 1);
        }
      });
    }
  }, [authInitialized, isAuthenticated, initDailyQuests, logActivity, updateQuestProgress]);

  // Show login prompt for unauthenticated users
  if (authInitialized && !isAuthenticated) {
    return (
      <div className="min-h-screen">
        <section className="relative py-8 md:py-16 overflow-hidden px-4">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-main-1)]/10 via-transparent to-[var(--color-main-1)]/5" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[var(--color-main-1)]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          </div>

          <div className="container relative max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8 md:mb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-6xl md:text-8xl mb-4"
              >
                🛍️
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl sm:text-4xl md:text-5xl font-heading uppercase tracking-wider mb-3 md:mb-4"
              >
                <span className="text-[var(--color-main-1)]">Rewards</span> Shop
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-sm sm:text-base text-white/60 max-w-md mx-auto"
              >
                Redeem your XP for discounts, perks, and exclusive rewards!
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
                Unlock the <span className="text-[var(--color-main-1)]">Rewards Shop</span>
              </h2>
              <p className="text-white/60 mb-6 max-w-md mx-auto">
                Sign in to start earning and spending XP on exclusive rewards. New members get <span className="text-[var(--color-main-1)] font-semibold">100 bonus XP</span> to start shopping!
              </p>

              {/* Benefits */}
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-[var(--color-dark-3)]/50 rounded-lg p-4">
                  <div className="text-3xl mb-2">🏷️</div>
                  <p className="text-sm font-medium">Discounts</p>
                  <p className="text-xs text-white/50">5% - 20% off</p>
                </div>
                <div className="bg-[var(--color-dark-3)]/50 rounded-lg p-4">
                  <div className="text-3xl mb-2">🚚</div>
                  <p className="text-sm font-medium">Free Shipping</p>
                  <p className="text-xs text-white/50">On any order</p>
                </div>
                <div className="bg-[var(--color-dark-3)]/50 rounded-lg p-4">
                  <div className="text-3xl mb-2">✨</div>
                  <p className="text-sm font-medium">Exclusives</p>
                  <p className="text-xs text-white/50">Badges & perks</p>
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
                    Back to Rewards
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Preview rewards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-12 md:mt-16"
            >
              <h3 className="text-lg md:text-xl font-heading text-center mb-6 text-white/80">
                🎁 Available Rewards Preview
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { name: "5% Off", xp: "100 XP", icon: "🏷️" },
                  { name: "10% Off", xp: "250 XP", icon: "🎫" },
                  { name: "Free Ship", xp: "150 XP", icon: "🚚" },
                  { name: "2x XP", xp: "300 XP", icon: "⚡" },
                  { name: "Bonus Spin", xp: "200 XP", icon: "🎡" },
                  { name: "Gold Badge", xp: "1000 XP", icon: "🥇" },
                ].map((reward, i) => (
                  <motion.div
                    key={reward.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 0.6, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    whileHover={{ opacity: 1, scale: 1.05 }}
                    className="bg-[var(--color-dark-2)]/50 border border-[var(--color-dark-3)] p-3 text-center rounded cursor-default"
                  >
                    <div className="text-2xl mb-1">{reward.icon}</div>
                    <p className="text-xs font-medium text-white/80">{reward.name}</p>
                    <p className="text-xs text-[var(--color-main-1)]">{reward.xp}</p>
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
              <div className="text-6xl md:text-8xl mb-4">🛍️</div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading uppercase tracking-wider mb-3 md:mb-4">
                <span className="text-[var(--color-main-1)]">Rewards</span> Shop
              </h1>
            </div>
            <VerificationRequired feature="redeem rewards and use your XP">
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
      <section className="relative py-16">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-main-1)]/10 to-transparent" />

        <div className="container relative">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-heading uppercase tracking-wider mb-4"
            >
              <span className="text-[var(--color-main-1)]">Rewards</span> Shop
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-white/60 max-w-md mx-auto"
            >
              Exchange your hard-earned XP for discounts, perks, and exclusive cosmetics!
            </motion.p>
          </div>

          {/* Quick links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4 mb-12"
          >
            <Link href="/rewards/spin">
              <Button variant="outline">
                🎡 Spin Wheel
              </Button>
            </Link>
            <Link href="/store/mystery-boxes">
              <Button variant="outline">
                📦 Mystery Boxes
              </Button>
            </Link>
            <Link href="/account/achievements">
              <Button variant="outline">
                🏆 Achievements
              </Button>
            </Link>
          </motion.div>

          {/* Main content */}
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar - User stats */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-1 space-y-6"
            >
              {/* User card */}
              {userProfile && (
                <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <LevelBadge size="md" showTitle={false} />
                    <div>
                      <p className="font-heading text-lg">
                        {userProfile.display_name || "Player"}
                      </p>
                      <p className="text-sm text-white/60">
                        {userProfile.total_xp.toLocaleString()} XP
                      </p>
                    </div>
                  </div>
                  <XPBar showLevel showXPText />
                </div>
              )}

              {/* Active XP Multiplier */}
              <XPMultiplierIndicator variant="full" />

              {/* Stats */}
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6">
                <h3 className="font-heading text-lg mb-4">Your Stats</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Total Orders</span>
                    <span className="text-white">{userProfile?.total_orders || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Total Reviews</span>
                    <span className="text-white">{userProfile?.total_reviews || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Referrals</span>
                    <span className="text-white">{userProfile?.referral_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Login Streak</span>
                    <span className="text-[var(--color-main-1)]">
                      {userProfile?.current_streak || 0} 🔥
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="space-y-2">
                <Link href="/account/referrals" className="block">
                  <div className="bg-gradient-to-r from-green-500/20 to-transparent border border-green-500/30 p-4 hover:border-green-500/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🎁</span>
                      <div>
                        <p className="font-heading text-sm">Refer Friends</p>
                        <p className="text-xs text-white/60">Earn 300+ XP per referral</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </motion.div>

            {/* Main grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-3"
            >
              <RewardShopGrid />
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}


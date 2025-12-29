"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AccountLayout } from "@/components/account";
import { AchievementGrid, LevelBadge, XPBar } from "@/components/gamification";
import { Button } from "@/components/ui";
import { useGamificationStore, useAuthStore, useUIStore } from "@/stores";

export function AchievementsPageClient() {
  const { userProfile, achievements, achievementStats, fetchAchievements, isInitialized } = useGamificationStore();
  const { isAuthenticated, isInitialized: authInitialized } = useAuthStore();
  const { toggleSignIn } = useUIStore();

  // Fetch achievements when component mounts
  useEffect(() => {
    if (isInitialized && achievements.length === 0) {
      fetchAchievements();
    }
  }, [isInitialized, achievements.length, fetchAchievements]);

  // Calculate stats from achievements array (fallback if achievementStats not loaded)
  const unlockedCount = achievements.filter((a) => a.is_unlocked).length;
  const totalCount = achievements.length;
  const xpEarned = achievements
    .filter((a) => a.is_unlocked)
    .reduce((sum, a) => sum + a.xp_reward, 0);
  const legendaryCount = achievements.filter((a) => a.rarity === "legendary" && a.is_unlocked).length;

  // Show login prompt for unauthenticated users
  if (authInitialized && !isAuthenticated) {
    return (
      <div className="min-h-screen">
        <section className="relative py-8 md:py-16 overflow-hidden px-4">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 via-transparent to-[var(--color-main-1)]/5" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
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
                🏆
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl sm:text-4xl md:text-5xl font-heading uppercase tracking-wider mb-3 md:mb-4"
              >
                <span className="text-yellow-500">Achievements</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-sm sm:text-base text-white/60 max-w-md mx-auto"
              >
                Unlock achievements, earn XP, and showcase your accomplishments!
              </motion.p>
            </div>

            {/* Login prompt card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-[var(--color-dark-2)] to-[var(--color-dark-1)] border border-yellow-500/30 rounded-lg p-6 md:p-10 text-center max-w-2xl mx-auto"
            >
              {/* Lock icon */}
              <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 rounded-full bg-yellow-500/20 border-2 border-yellow-500/40 flex items-center justify-center">
                <svg className="w-10 h-10 md:w-12 md:h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <h2 className="text-2xl md:text-3xl font-heading mb-3">
                Start Your <span className="text-yellow-500">Achievement Journey</span>
              </h2>
              <p className="text-white/60 mb-6 max-w-md mx-auto">
                Sign in to track your progress, unlock achievements, and earn XP rewards. Over <span className="text-yellow-500 font-semibold">50+ achievements</span> to discover!
              </p>

              {/* Benefits */}
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-[var(--color-dark-3)]/50 rounded-lg p-4">
                  <div className="text-3xl mb-2">⭐</div>
                  <p className="text-sm font-medium">Earn XP</p>
                  <p className="text-xs text-white/50">Every unlock</p>
                </div>
                <div className="bg-[var(--color-dark-3)]/50 rounded-lg p-4">
                  <div className="text-3xl mb-2">🎖️</div>
                  <p className="text-sm font-medium">Rare Badges</p>
                  <p className="text-xs text-white/50">Show off status</p>
                </div>
                <div className="bg-[var(--color-dark-3)]/50 rounded-lg p-4">
                  <div className="text-3xl mb-2">📈</div>
                  <p className="text-sm font-medium">Level Up</p>
                  <p className="text-xs text-white/50">Unlock tiers</p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={toggleSignIn}
                  size="lg"
                  className="min-w-[200px] text-base"
                >
                  Sign In / Register
                </Button>
                <Link href="/rewards">
                  <Button variant="outline" size="lg" className="min-w-[200px] text-base">
                    Back to Rewards
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Achievement categories preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-12 md:mt-16"
            >
              <h3 className="text-lg md:text-xl font-heading text-center mb-6 text-white/80">
                🎮 Achievement Categories
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { name: "Shopping", icon: "🛒", count: "10+" },
                  { name: "Social", icon: "💬", count: "8+" },
                  { name: "Engagement", icon: "⭐", count: "12+" },
                  { name: "Collector", icon: "📦", count: "15+" },
                  { name: "Special", icon: "✨", count: "5+" },
                ].map((category, i) => (
                  <motion.div
                    key={category.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 0.6, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    whileHover={{ opacity: 1, scale: 1.05 }}
                    className="bg-[var(--color-dark-2)]/50 border border-[var(--color-dark-3)] p-4 text-center rounded cursor-default"
                  >
                    <div className="text-3xl mb-2">{category.icon}</div>
                    <p className="text-sm font-medium text-white/80">{category.name}</p>
                    <p className="text-xs text-yellow-500">{category.count}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <AccountLayout title="Achievements">
      {/* Profile summary */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Level card */}
        <div className="bg-[var(--color-dark-2)] p-6 border border-[var(--color-dark-3)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg">Your Level</h3>
            {userProfile && (
              <span className="text-sm text-white/40">
                {userProfile.total_xp.toLocaleString()} Total XP
              </span>
            )}
          </div>
          <div className="flex items-center gap-6">
            <LevelBadge size="lg" showTitle />
          </div>
          <div className="mt-4">
            <XPBar showLevel={false} />
          </div>
        </div>

        {/* Stats card */}
        <div className="bg-[var(--color-dark-2)] p-6 border border-[var(--color-dark-3)]">
          <h3 className="font-heading text-lg mb-4">Achievement Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-3xl font-heading text-[var(--color-main-1)]">
                {achievementStats.unlocked || unlockedCount}
              </p>
              <p className="text-sm text-white/60">Unlocked</p>
            </div>
            <div>
              <p className="text-3xl font-heading text-white/80">
                {achievementStats.total || totalCount}
              </p>
              <p className="text-sm text-white/60">Total</p>
            </div>
            <div>
              <p className="text-3xl font-heading text-green-500">
                {(achievementStats.xpEarned || xpEarned).toLocaleString()}
              </p>
              <p className="text-sm text-white/60">XP Earned</p>
            </div>
            <div>
              <p className="text-3xl font-heading text-yellow-500">
                {achievementStats.legendary || legendaryCount}
              </p>
              <p className="text-sm text-white/60">Legendary</p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements grid */}
      <AchievementGrid />
    </AccountLayout>
  );
}

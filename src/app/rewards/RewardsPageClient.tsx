"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { DailyRewardCalendar, DailyQuestList, StreakIndicator, LevelBadge, XPBar, XPMultiplierIndicator } from "@/components/gamification";
import { ProductCarousel } from "@/components/store";
import { useProducts } from "@/hooks";
import { useGamificationStore, useAuthStore, useUIStore } from "@/stores";

// Animated background particles for the hero section
function FloatingRewards() {
  const rewards = ["🎁", "⭐", "💎", "🏆", "🎮", "🔥", "✨", "🎯"];
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {rewards.map((emoji, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl opacity-20"
          initial={{ 
            x: Math.random() * 100 + "%", 
            y: "110%",
            rotate: 0
          }}
          animate={{ 
            y: "-10%",
            rotate: 360
          }}
          transition={{
            duration: 15 + Math.random() * 10,
            repeat: Infinity,
            delay: i * 2,
            ease: "linear"
          }}
          style={{ left: `${10 + i * 12}%` }}
        >
          {emoji}
        </motion.div>
      ))}
    </div>
  );
}

// Guest welcome component with attractive CTA
function GuestWelcome() {
  const { openSignIn } = useUIStore();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-br from-[var(--color-main-1)]/30 via-purple-900/20 to-[var(--color-dark-1)] border-2 border-[var(--color-main-1)]/50 rounded-lg p-8 md:p-12 text-center mb-16"
    >
      <FloatingRewards />
      
      <div className="relative z-10">
        <motion.div 
          className="text-7xl mb-6"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🎮
        </motion.div>
        
        <h2 className="text-3xl md:text-4xl font-heading uppercase tracking-wider mb-4">
          <span className="text-[var(--color-main-1)]">Unlock</span> Your Rewards
        </h2>
        
        <p className="text-white/70 max-w-xl mx-auto mb-8 text-lg">
          Join the Darkpoint community to earn XP, complete daily quests, 
          unlock achievements, and get exclusive discounts on gaming gear!
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-2xl mx-auto">
          {[
            { icon: "⭐", label: "Earn XP", desc: "Level up!" },
            { icon: "🎁", label: "Daily Rewards", desc: "Free bonuses" },
            { icon: "🏆", label: "Achievements", desc: "Get badges" },
            { icon: "💰", label: "Discounts", desc: "Save money" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-[var(--color-dark-2)]/80 backdrop-blur p-4 rounded-lg border border-[var(--color-dark-3)]"
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="font-heading text-sm">{item.label}</div>
              <div className="text-xs text-white/50">{item.desc}</div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            variant="primary" 
            size="lg"
            onClick={() => openSignIn("login")}
            className="px-8"
          >
            Sign In to Start Earning
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => openSignIn("register")}
            className="px-8"
          >
            Create Free Account
          </Button>
        </div>

        <p className="text-white/40 text-sm mt-6">
          🎉 New members get <span className="text-[var(--color-main-1)]">100 bonus XP</span> and a free spin!
        </p>
      </div>
    </motion.div>
  );
}

// Skeleton for user stats header
function UserStatsHeaderSkeleton() {
  return (
    <div className="bg-gradient-to-r from-[var(--color-dark-2)] to-[var(--color-dark-1)] border border-[var(--color-dark-3)] rounded-lg p-6 mb-8 animate-pulse">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="w-20 h-20 bg-[var(--color-dark-3)] rounded-full" />
        
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 bg-[var(--color-dark-3)] rounded w-32" />
            <div className="h-4 bg-[var(--color-dark-3)] rounded w-20" />
          </div>
          <div className="h-3 bg-[var(--color-dark-3)] rounded-full w-full" />
        </div>

        <div className="flex gap-6 text-center">
          <div>
            <div className="h-8 w-12 bg-[var(--color-dark-3)] rounded mx-auto mb-1" />
            <div className="h-3 w-16 bg-[var(--color-dark-3)] rounded" />
          </div>
          <div>
            <div className="h-8 w-12 bg-[var(--color-dark-3)] rounded mx-auto mb-1" />
            <div className="h-3 w-16 bg-[var(--color-dark-3)] rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

// User stats header for logged-in users
function UserStatsHeader() {
  const { userProfile, isLoading } = useGamificationStore();

  // Show skeleton while loading
  if (isLoading || !userProfile) {
    return <UserStatsHeaderSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-[var(--color-dark-2)] to-[var(--color-dark-1)] border border-[var(--color-dark-3)] rounded-lg p-6 mb-8"
    >
      <div className="flex flex-col md:flex-row items-center gap-6">
        <LevelBadge size="lg" showTitle />
        
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Progress to next level</span>
            <span className="text-[var(--color-main-1)] font-heading">
              {userProfile?.total_xp.toLocaleString() || 0} XP
            </span>
          </div>
          <XPBar showLevel={false} />
        </div>

        <div className="flex gap-6 text-center">
          <div>
            <div className="text-2xl font-heading text-[var(--color-main-1)]">
              {userProfile?.current_streak || 0}
            </div>
            <div className="text-xs text-white/50">Day Streak</div>
          </div>
          <div>
            <div className="text-2xl font-heading text-green-400">
              {userProfile?.available_spins || 0}
            </div>
            <div className="text-xs text-white/50">Free Spins</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function RewardsPageClient() {
  const { 
    canClaimDailyReward, 
    setDailyRewardModal, 
    initDailyQuests,
    claimDailyReward,
    isLoading,
  } = useGamificationStore();
  
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { products: storeProducts } = useProducts({ featured: true, limit: 4 });

  // Initialize daily quests on mount
  useEffect(() => {
    initDailyQuests();
  }, [initDailyQuests]);

  const handleClaimReward = async () => {
    setDailyRewardModal(true);
    await claimDailyReward();
  };

  // Show loading skeleton while auth initializes
  if (!isInitialized) {
    return (
      <div className="min-h-screen">
        <section className="py-16">
          <div className="container">
            {/* Header Skeleton */}
            <div className="text-center mb-12 animate-pulse">
              <div className="h-12 bg-[var(--color-dark-2)] rounded w-64 mx-auto mb-4" />
              <div className="h-5 bg-[var(--color-dark-2)] rounded w-96 mx-auto" />
            </div>

            {/* User Stats Header Skeleton */}
            <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-lg p-6 mb-8 animate-pulse">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 bg-[var(--color-dark-3)] rounded-full" />
                <div className="flex-1 w-full">
                  <div className="flex justify-between mb-2">
                    <div className="h-4 bg-[var(--color-dark-3)] rounded w-32" />
                    <div className="h-4 bg-[var(--color-dark-3)] rounded w-20" />
                  </div>
                  <div className="h-3 bg-[var(--color-dark-3)] rounded w-full" />
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="h-8 w-12 bg-[var(--color-dark-3)] rounded mx-auto mb-1" />
                    <div className="h-3 w-16 bg-[var(--color-dark-3)] rounded" />
                  </div>
                  <div className="text-center">
                    <div className="h-8 w-12 bg-[var(--color-dark-3)] rounded mx-auto mb-1" />
                    <div className="h-3 w-16 bg-[var(--color-dark-3)] rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Rewards & Quests Grid Skeleton */}
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
              {/* Daily Rewards Calendar Skeleton */}
              <div className="animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-6 bg-[var(--color-dark-2)] rounded w-40" />
                  <div className="h-8 bg-[var(--color-dark-2)] rounded w-16" />
                </div>
                <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="h-7 bg-[var(--color-dark-3)] rounded w-36" />
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-[var(--color-dark-3)] rounded-full" />
                      <div className="h-5 bg-[var(--color-dark-3)] rounded w-16" />
                    </div>
                  </div>
                  
                  {/* Day Icons Row */}
                  <div className="flex justify-between gap-2 mb-6">
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="flex-1 text-center">
                        <div className={`h-16 rounded-lg ${i < 2 ? 'bg-[var(--color-main-1)]/20 border-2 border-[var(--color-main-1)]/30' : 'bg-[var(--color-dark-3)]'}`} />
                        <div className="h-3 bg-[var(--color-dark-3)] rounded w-8 mx-auto mt-2" />
                      </div>
                    ))}
                  </div>
                  
                  {/* Claimed Message */}
                  <div className="bg-[var(--color-dark-3)]/50 p-4 rounded-lg">
                    <div className="h-5 bg-[var(--color-dark-3)] rounded w-48 mx-auto mb-2" />
                    <div className="h-4 bg-[var(--color-dark-3)] rounded w-40 mx-auto" />
                  </div>
                  
                  {/* Milestone */}
                  <div className="mt-6 pt-4 border-t border-[var(--color-dark-3)]">
                    <div className="flex justify-between mb-2">
                      <div className="h-4 bg-[var(--color-dark-3)] rounded w-40" />
                      <div className="h-4 bg-[var(--color-dark-3)] rounded w-16" />
                    </div>
                    <div className="h-2 bg-[var(--color-dark-3)] rounded-full w-full" />
                  </div>
                </div>
              </div>

              {/* Today's Quests Skeleton */}
              <div className="animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-6 bg-[var(--color-dark-2)] rounded w-40" />
                  <div className="h-6 bg-[var(--color-dark-2)] rounded w-12" />
                </div>
                <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6">
                  {/* Quest Progress Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-5 bg-[var(--color-dark-3)] rounded w-28" />
                    <div className="h-5 bg-[var(--color-dark-3)] rounded w-16" />
                  </div>
                  <div className="h-2 bg-[var(--color-dark-3)] rounded-full w-full mb-2" />
                  <div className="h-4 bg-[var(--color-dark-3)] rounded w-64 mx-auto mb-6" />
                  
                  {/* Quest Items */}
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-[var(--color-dark-3)]/30 border border-[var(--color-dark-3)] p-4 rounded-lg mb-3">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-[var(--color-dark-3)] rounded-lg" />
                        <div className="flex-1">
                          <div className="flex justify-between mb-2">
                            <div className="h-5 bg-[var(--color-dark-3)] rounded w-32" />
                            <div className="h-5 bg-[var(--color-dark-3)] rounded w-16" />
                          </div>
                          <div className="h-4 bg-[var(--color-dark-3)] rounded w-40 mb-2" />
                          <div className="h-2 bg-[var(--color-dark-3)] rounded-full w-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Reset Timer */}
                  <div className="h-4 bg-[var(--color-dark-3)] rounded w-36 mx-auto mt-4" />
                </div>
              </div>
            </div>

            {/* More Ways to Earn Skeleton */}
            <div className="text-center mb-8 animate-pulse">
              <div className="h-8 bg-[var(--color-dark-2)] rounded w-52 mx-auto" />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 text-center">
                  <div className="w-16 h-16 bg-[var(--color-dark-3)] rounded-full mx-auto mb-4" />
                  <div className="h-6 bg-[var(--color-dark-3)] rounded w-32 mx-auto mb-2" />
                  <div className="h-4 bg-[var(--color-dark-3)] rounded w-44 mx-auto mb-4" />
                  <div className="h-10 bg-[var(--color-dark-3)] rounded w-28 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <section className="py-16">
        <div className="container">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-wider mb-4">
              <span className="text-[var(--color-main-1)]">Rewards</span> Center
            </h1>
            <p className="text-white/60 max-w-lg mx-auto">
              {isAuthenticated 
                ? "Complete quests, earn XP, and unlock exclusive rewards!"
                : "Level up your gaming experience! Earn XP, complete achievements, and unlock exclusive rewards."
              }
            </p>
          </motion.div>

          {/* Guest Welcome or User Stats */}
          {!isAuthenticated ? (
            <GuestWelcome />
          ) : (
            <>
              <UserStatsHeader />
              {/* Active XP Multiplier */}
              <div className="mb-8 max-w-5xl mx-auto">
                <XPMultiplierIndicator variant="full" showOnlyWhenActive />
              </div>
            </>
          )}

          {/* Featured: Daily Rewards & Quests */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
            {/* Daily Rewards */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-heading uppercase tracking-wider">Daily Rewards</h2>
                {isAuthenticated && <StreakIndicator />}
              </div>
              
              {!isAuthenticated ? (
                <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 text-center h-full flex flex-col items-center justify-center min-h-[300px]">
                  <div className="text-5xl mb-4 opacity-50">🔒</div>
                  <h3 className="text-lg font-heading mb-2">Sign In Required</h3>
                  <p className="text-white/50 text-sm mb-4">
                    Log in to claim daily rewards and build your streak!
                  </p>
                  <Button variant="outline" size="sm" onClick={() => useUIStore.getState().openSignIn()}>
                    Sign In
                  </Button>
                </div>
              ) : canClaimDailyReward ? (
                <div className="bg-gradient-to-br from-[var(--color-main-1)]/20 to-[var(--color-dark-2)] border-2 border-[var(--color-main-1)] p-8 text-center h-full flex flex-col items-center justify-center min-h-[300px]">
                  <motion.div 
                    className="text-6xl mb-4"
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    🎁
                  </motion.div>
                  <h3 className="text-2xl font-heading text-[var(--color-main-1)] mb-2">
                    Daily Reward Available!
                  </h3>
                  <p className="text-white/60 mb-6">
                    Claim your reward to earn XP and special bonuses
                  </p>
                  <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={handleClaimReward}
                    disabled={isLoading}
                  >
                    {isLoading ? "Claiming..." : "Claim Now"}
                  </Button>
                </div>
              ) : (
                <DailyRewardCalendar />
              )}
            </motion.div>

            {/* Daily Quests */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <DailyQuestList showLoginPrompt={!isAuthenticated} />
            </motion.div>
          </div>

          {/* Rewards Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-heading uppercase tracking-wider">More Ways to Earn</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Spin Wheel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="relative z-10"
            >
              <Link href={isAuthenticated ? "/rewards/spin" : "#"} className="group block cursor-pointer" onClick={(e) => !isAuthenticated && (e.preventDefault(), useUIStore.getState().openSignIn())}>
                <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 text-center transition-all group-hover:border-[var(--color-main-1)] h-full relative overflow-hidden">
                  {!isAuthenticated && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-[var(--color-main-1)]/20 text-[var(--color-main-1)] text-xs rounded">
                      Login Required
                    </div>
                  )}
                  <div className="text-6xl mb-4 group-hover:rotate-180 transition-transform duration-500">
                    🎡
                  </div>
                  <h3 className="text-xl font-heading uppercase tracking-wider mb-2">
                    Spin to Win
                  </h3>
                  <p className="text-sm text-white/60 mb-4">
                    Try your luck for discounts, XP, and prizes!
                  </p>
                  <span className="inline-block px-6 py-2.5 border border-white/60 text-sm font-heading tracking-wider group-hover:bg-[var(--color-main-1)] group-hover:border-[var(--color-main-1)] group-hover:text-white transition-colors">
                    {isAuthenticated ? "Spin Now →" : "Sign In to Spin"}
                  </span>
                </div>
              </Link>
            </motion.div>

            {/* Rewards Shop */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="relative z-10"
            >
              <Link href={isAuthenticated ? "/rewards/shop" : "#"} className="group block cursor-pointer" onClick={(e) => !isAuthenticated && (e.preventDefault(), useUIStore.getState().openSignIn())}>
                <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 text-center transition-all group-hover:border-[var(--color-main-1)] h-full relative overflow-hidden">
                  {!isAuthenticated && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-[var(--color-main-1)]/20 text-[var(--color-main-1)] text-xs rounded">
                      Login Required
                    </div>
                  )}
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                    🛒
                  </div>
                  <h3 className="text-xl font-heading uppercase tracking-wider mb-2">
                    Rewards Shop
                  </h3>
                  <p className="text-sm text-white/60 mb-4">
                    Exchange XP for discounts and exclusive items
                  </p>
                  <span className="inline-block px-6 py-2.5 border border-white/60 text-sm font-heading tracking-wider group-hover:bg-[var(--color-main-1)] group-hover:border-[var(--color-main-1)] group-hover:text-white transition-colors">
                    {isAuthenticated ? "Browse Shop →" : "Sign In to Shop"}
                  </span>
                </div>
              </Link>
            </motion.div>

            {/* Mystery Boxes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="relative z-10"
            >
              <Link href="/store/mystery-boxes" className="group block cursor-pointer">
                <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 text-center transition-all group-hover:border-[var(--color-main-1)] h-full">
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                    📦
                  </div>
                  <h3 className="text-xl font-heading uppercase tracking-wider mb-2">
                    Mystery Boxes
                  </h3>
                  <p className="text-sm text-white/60 mb-4">
                    Unbox amazing gear at incredible prices!
                  </p>
                  <span className="inline-block px-6 py-2.5 border border-white/60 text-sm font-heading tracking-wider group-hover:bg-[var(--color-main-1)] group-hover:border-[var(--color-main-1)] group-hover:text-white transition-colors">
                    Open Crates →
                  </span>
                </div>
              </Link>
            </motion.div>

            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="relative z-10"
            >
              <Link href={isAuthenticated ? "/account/achievements" : "#"} className="group block cursor-pointer" onClick={(e) => !isAuthenticated && (e.preventDefault(), useUIStore.getState().openSignIn())}>
                <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 text-center transition-all group-hover:border-[var(--color-main-1)] h-full relative overflow-hidden">
                  {!isAuthenticated && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-[var(--color-main-1)]/20 text-[var(--color-main-1)] text-xs rounded">
                      Login Required
                    </div>
                  )}
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                    🏆
                  </div>
                  <h3 className="text-xl font-heading uppercase tracking-wider mb-2">
                    Achievements
                  </h3>
                  <p className="text-sm text-white/60 mb-4">
                    Complete challenges and earn bonus XP
                  </p>
                  <span className="inline-block px-6 py-2.5 border border-white/60 text-sm font-heading tracking-wider group-hover:bg-[var(--color-main-1)] group-hover:border-[var(--color-main-1)] group-hover:text-white transition-colors">
                    {isAuthenticated ? "View All →" : "Sign In"}
                  </span>
                </div>
              </Link>
            </motion.div>

            {/* Referrals */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="relative z-10"
            >
              <Link href={isAuthenticated ? "/account/referrals" : "#"} className="group block cursor-pointer" onClick={(e) => !isAuthenticated && (e.preventDefault(), useUIStore.getState().openSignIn())}>
                <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 text-center transition-all group-hover:border-[var(--color-main-1)] h-full relative overflow-hidden">
                  {!isAuthenticated && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-[var(--color-main-1)]/20 text-[var(--color-main-1)] text-xs rounded">
                      Login Required
                    </div>
                  )}
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                    🤝
                  </div>
                  <h3 className="text-xl font-heading uppercase tracking-wider mb-2">
                    Refer Friends
                  </h3>
                  <p className="text-sm text-white/60 mb-4">
                    Earn XP for every friend you refer
                  </p>
                  <span className="inline-block px-6 py-2.5 border border-white/60 text-sm font-heading tracking-wider group-hover:bg-[var(--color-main-1)] group-hover:border-[var(--color-main-1)] group-hover:text-white transition-colors">
                    {isAuthenticated ? "Get Link →" : "Sign In"}
                  </span>
                </div>
              </Link>
            </motion.div>

            {/* Leaderboard - Coming Soon */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="relative z-10"
            >
              <div className="group cursor-not-allowed opacity-60">
                <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 text-center h-full relative overflow-hidden">
                  <div className="absolute top-2 right-2 px-2 py-1 bg-[var(--color-main-1)]/20 text-[var(--color-main-1)] text-xs rounded">
                    Coming Soon
                  </div>
                  <div className="text-6xl mb-4">
                    📊
                  </div>
                  <h3 className="text-xl font-heading uppercase tracking-wider mb-2">
                    Leaderboard
                  </h3>
                  <p className="text-sm text-white/60 mb-4">
                    Compete with other gamers for the top spot
                  </p>
                  <span className="inline-block px-6 py-2.5 border border-white/40 text-sm font-heading tracking-wider text-white/60">
                    Coming Soon
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Use your rewards in the store */}
          {storeProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-16 pt-12 border-t border-[var(--color-dark-3)]"
            >
              <p className="text-center text-white/70 text-lg mb-6">
                Use your rewards in the store
              </p>
              <ProductCarousel products={storeProducts} />
              <div className="text-center mt-4">
                <Link href="/store" className="text-[var(--color-main-1)] hover:underline text-sm font-medium">
                  Shop the store →
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}

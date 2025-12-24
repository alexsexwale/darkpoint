"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { RewardShopGrid, XPBar, LevelBadge } from "@/components/gamification";
import { Button } from "@/components/ui";
import { useGamificationStore } from "@/stores";

export function RewardsShopPageClient() {
  const { userProfile } = useGamificationStore();

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
                        <p className="text-xs text-white/60">Earn R50+ per referral</p>
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


"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { DailyRewardCalendar, DailyQuestList, StreakIndicator } from "@/components/gamification";
import { useGamificationStore } from "@/stores";

export function RewardsPageClient() {
  const { 
    canClaimDailyReward, 
    setDailyRewardModal, 
    initDailyQuests,
    claimDailyReward,
    isLoading,
  } = useGamificationStore();

  // Initialize daily quests on mount
  useEffect(() => {
    initDailyQuests();
  }, [initDailyQuests]);

  const handleClaimReward = async () => {
    setDailyRewardModal(true);
    await claimDailyReward();
  };

  return (
    <div className="min-h-screen">
      <section className="py-16">
        <div className="container">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-wider mb-4">
              <span className="text-[var(--color-main-1)]">Rewards</span> Center
            </h1>
            <p className="text-white/60 max-w-lg mx-auto">
              Level up your gaming experience! Earn XP, complete achievements, and unlock exclusive rewards.
            </p>
          </div>

          {/* Featured: Daily Rewards & Quests */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
            {/* Daily Rewards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-heading uppercase tracking-wider">Daily Rewards</h2>
                <StreakIndicator />
              </div>
              {canClaimDailyReward ? (
                <div className="bg-gradient-to-br from-[var(--color-main-1)]/20 to-[var(--color-dark-2)] border-2 border-[var(--color-main-1)] p-8 text-center h-full flex flex-col items-center justify-center">
                  <div className="text-6xl mb-4 animate-bounce">🎁</div>
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
            </div>

            {/* Daily Quests */}
            <DailyQuestList />
          </div>

          {/* Rewards Grid */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-heading uppercase tracking-wider">More Ways to Earn</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Spin Wheel */}
            <Link href="/rewards/spin" className="group">
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 text-center transition-all hover:border-[var(--color-main-1)] h-full">
                <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                  🎡
                </div>
                <h3 className="text-xl font-heading uppercase tracking-wider mb-2">
                  Spin to Win
                </h3>
                <p className="text-sm text-white/60 mb-4">
                  Try your luck for discounts, XP, and prizes!
                </p>
                <Button variant="outline" className="group-hover:bg-[var(--color-main-1)] group-hover:text-white transition-colors">
                  Spin Now →
                </Button>
              </div>
            </Link>

            {/* Rewards Shop */}
            <Link href="/rewards/shop" className="group">
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 text-center transition-all hover:border-[var(--color-main-1)] h-full">
                <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                  🛒
                </div>
                <h3 className="text-xl font-heading uppercase tracking-wider mb-2">
                  Rewards Shop
                </h3>
                <p className="text-sm text-white/60 mb-4">
                  Exchange XP for discounts and exclusive items
                </p>
                <Button variant="outline" className="group-hover:bg-[var(--color-main-1)] group-hover:text-white transition-colors">
                  Browse Shop →
                </Button>
              </div>
            </Link>

            {/* Mystery Boxes */}
            <Link href="/store/mystery-boxes" className="group">
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 text-center transition-all hover:border-[var(--color-main-1)] h-full">
                <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                  📦
                </div>
                <h3 className="text-xl font-heading uppercase tracking-wider mb-2">
                  Mystery Boxes
                </h3>
                <p className="text-sm text-white/60 mb-4">
                  Unbox amazing gear at incredible prices!
                </p>
                <Button variant="outline" className="group-hover:bg-[var(--color-main-1)] group-hover:text-white transition-colors">
                  Open Crates →
                </Button>
              </div>
            </Link>

            {/* Achievements */}
            <Link href="/account/achievements" className="group">
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 text-center transition-all hover:border-[var(--color-main-1)] h-full">
                <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                  🏆
                </div>
                <h3 className="text-xl font-heading uppercase tracking-wider mb-2">
                  Achievements
                </h3>
                <p className="text-sm text-white/60 mb-4">
                  Complete challenges and earn bonus XP
                </p>
                <Button variant="outline" className="group-hover:bg-[var(--color-main-1)] group-hover:text-white transition-colors">
                  View All →
                </Button>
              </div>
            </Link>

            {/* Referrals */}
            <Link href="/account/referrals" className="group">
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 text-center transition-all hover:border-[var(--color-main-1)] h-full">
                <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                  🤝
                </div>
                <h3 className="text-xl font-heading uppercase tracking-wider mb-2">
                  Refer Friends
                </h3>
                <p className="text-sm text-white/60 mb-4">
                  Earn store credit for every friend you refer
                </p>
                <Button variant="outline" className="group-hover:bg-[var(--color-main-1)] group-hover:text-white transition-colors">
                  Get Link →
                </Button>
              </div>
            </Link>

            {/* Leaderboard - Coming Soon */}
            <div className="group cursor-not-allowed opacity-60">
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 text-center h-full relative overflow-hidden">
                <div className="absolute top-2 right-2 px-2 py-1 bg-[var(--color-main-1)]/20 text-[var(--color-main-1)] text-xs">
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
                <Button variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


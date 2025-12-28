"use client";

import { useEffect } from "react";
import { AccountLayout } from "@/components/account";
import { AchievementGrid, LevelBadge, XPBar } from "@/components/gamification";
import { useGamificationStore } from "@/stores";

export function AchievementsPageClient() {
  const { userProfile, achievements, achievementStats, fetchAchievements, isInitialized } = useGamificationStore();

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

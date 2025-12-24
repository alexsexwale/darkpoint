"use client";

import { useCallback, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useGamificationStore } from "@/stores/gamificationStore";
import type {
  Achievement,
  AchievementWithProgress,
  XPAction,
  UserProfile,
  SpinPrize,
  Reward,
} from "@/types/gamification";

// Type-safe Supabase helper to bypass strict typing issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useGamification() {
  const store = useGamificationStore();

  // Initialize gamification data
  const initialize = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      store.setLoading(false);
      return;
    }

    store.setLoading(true);

    try {
      // Get current user
      const {
        data: { user },
      } = await db.auth.getUser();

      if (!user) {
        store.setLoading(false);
        store.setAuthenticated(false);
        return;
      }

      // Fetch user profile
      const { data: profile } = await db
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        store.setUserProfile(profile);
      }

      // Fetch achievements
      const { data: achievements } = await db
        .from("achievements")
        .select("*")
        .eq("is_active", true);

      if (achievements) {
        store.setAchievements(achievements as Achievement[]);
      }

      // Fetch user achievements
      const { data: userAchievements } = await db
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id);

      if (achievements && userAchievements) {
        const achievementsList = achievements as Achievement[];
        const userAchievementsList = userAchievements as Array<{
          achievement_id: string;
          unlocked_at?: string;
          progress?: number;
        }>;
        const achievementsWithProgress: AchievementWithProgress[] = achievementsList.map(
          (achievement: Achievement) => {
            const userAch = userAchievementsList.find(
              (ua) => ua.achievement_id === achievement.id
            );
            return {
              ...achievement,
              isUnlocked: !!userAch,
              unlockedAt: userAch?.unlocked_at,
              progress: userAch?.progress || 0,
            };
          }
        );
        store.setUserAchievements(achievementsWithProgress);
      }

      // Fetch spin prizes
      const { data: spinPrizes } = await db
        .from("spin_prizes")
        .select("*")
        .eq("is_active", true);

      if (spinPrizes) {
        store.setSpinPrizes(spinPrizes as SpinPrize[]);
      }

      // Fetch rewards
      const { data: rewards } = await db
        .from("rewards")
        .select("*")
        .eq("is_active", true);

      if (rewards) {
        store.setRewards(rewards as Reward[]);
      }

      // Fetch mystery boxes
      const { data: mysteryBoxes } = await db
        .from("mystery_boxes")
        .select("*")
        .eq("is_active", true);

      if (mysteryBoxes) {
        store.setMysteryBoxes(mysteryBoxes);
      }

      store.setAuthenticated(true);
    } catch (error) {
      console.error("Failed to initialize gamification:", error);
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  // Add XP with server sync
  const addXP = useCallback(
    async (action: XPAction, value?: number, description?: string) => {
      // Update locally first for instant feedback
      store.addXP(action, value, description);

      // Sync to server
      if (isSupabaseConfigured() && store.userProfile) {
        try {
          const profile = store.userProfile;

          // Update profile
          await db
            .from("user_profiles")
            .update({
              total_xp: profile.total_xp,
              current_level: profile.current_level,
            })
            .eq("id", profile.id);

          // Log transaction
          await db.from("xp_transactions").insert({
            user_id: profile.id,
            amount: value || 0,
            action,
            description,
          });
        } catch (error) {
          console.error("Failed to sync XP:", error);
        }
      }
    },
    [store]
  );

  // Unlock achievement with server sync
  const unlockAchievement = useCallback(
    async (achievement: Achievement) => {
      // Update locally
      store.unlockAchievement(achievement);

      // Sync to server
      if (isSupabaseConfigured() && store.userProfile) {
        try {
          await db.from("user_achievements").insert({
            user_id: store.userProfile.id,
            achievement_id: achievement.id,
            progress: achievement.requirement_value,
          });
        } catch (error) {
          console.error("Failed to unlock achievement:", error);
        }
      }
    },
    [store]
  );

  // Claim daily reward
  const claimDailyReward = useCallback(async () => {
    const reward = store.claimDailyReward();
    if (!reward) return null;

    // Sync to server
    if (isSupabaseConfigured() && store.userProfile) {
      try {
        const profile = store.userProfile;

        // Update profile
        await db
          .from("user_profiles")
          .update({
            current_streak: profile.current_streak,
            longest_streak: profile.longest_streak,
            last_login_date: profile.last_login_date,
            available_spins: profile.available_spins,
          })
          .eq("id", profile.id);

        // Log daily login
        await db.from("daily_logins").insert({
          user_id: profile.id,
          day_of_streak: profile.current_streak,
          xp_earned: reward.xp,
          bonus_reward: reward.reward ? JSON.stringify(reward.reward) : null,
        });
      } catch (error) {
        console.error("Failed to sync daily login:", error);
      }
    }

    return reward;
  }, [store]);

  // Spin the wheel
  const spinWheel = useCallback(async () => {
    const prize = store.spin();
    if (!prize) return null;

    store.setSpinning(true);

    // Sync to server
    if (isSupabaseConfigured() && store.userProfile) {
      try {
        await db.from("spin_history").insert({
          user_id: store.userProfile.id,
          prize_id: prize.id,
        });

        await db
          .from("user_profiles")
          .update({ available_spins: store.availableSpins })
          .eq("id", store.userProfile.id);
      } catch (error) {
        console.error("Failed to sync spin:", error);
      }
    }

    return prize;
  }, [store]);

  // Check for achievements
  const checkAchievements = useCallback(async () => {
    if (!store.userProfile) return;

    const profile = store.userProfile;
    const unlockedIds = store.userAchievements
      .filter((a) => a.isUnlocked)
      .map((a) => a.id);

    for (const achievement of store.achievements) {
      if (unlockedIds.includes(achievement.id)) continue;

      let shouldUnlock = false;

      switch (achievement.requirement_type) {
        case "purchases":
          shouldUnlock = profile.total_orders >= achievement.requirement_value;
          break;
        case "total_spent":
          shouldUnlock = profile.total_spent >= achievement.requirement_value;
          break;
        case "orders":
          shouldUnlock = profile.total_orders >= achievement.requirement_value;
          break;
        case "reviews":
          shouldUnlock = profile.total_reviews >= achievement.requirement_value;
          break;
        case "streak":
          shouldUnlock = profile.current_streak >= achievement.requirement_value;
          break;
        case "referrals":
          shouldUnlock = profile.referral_count >= achievement.requirement_value;
          break;
        // Other types would need additional tracking
      }

      if (shouldUnlock) {
        await unlockAchievement(achievement);
      }
    }
  }, [store, unlockAchievement]);

  // Redeem reward
  const redeemReward = useCallback(
    async (rewardId: string) => {
      const profile = store.userProfile;
      const reward = store.rewards.find((r) => r.id === rewardId);

      if (!profile || !reward) return false;
      if (profile.total_xp < reward.xp_cost) return false;

      // Deduct XP locally
      store.updateProfile({ total_xp: profile.total_xp - reward.xp_cost });

      // Sync to server
      if (isSupabaseConfigured()) {
        try {
          await db
            .from("user_profiles")
            .update({ total_xp: profile.total_xp - reward.xp_cost })
            .eq("id", profile.id);

          await db.from("user_rewards").insert({
            user_id: profile.id,
            reward_id: rewardId,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          });

          // Decrease stock if limited
          if (reward.stock !== null) {
            await db
              .from("rewards")
              .update({ stock: reward.stock - 1 })
              .eq("id", rewardId);
          }
        } catch (error) {
          console.error("Failed to redeem reward:", error);
          // Rollback local change
          store.updateProfile({ total_xp: profile.total_xp });
          return false;
        }
      }

      store.addNotification({
        type: "reward",
        title: "Reward Redeemed!",
        message: `You got ${reward.name}`,
        icon: "🎁",
      });

      return true;
    },
    [store]
  );

  // Track referral click
  const trackReferralClick = useCallback(async (referralCode: string) => {
    if (!isSupabaseConfigured()) return;

    try {
      await db.rpc("increment_referral_clicks", { code: referralCode });
    } catch (error) {
      console.error("Failed to track referral click:", error);
    }
  }, []);

  // Share product (track for achievements)
  const trackShare = useCallback(async () => {
    await addXP("share", undefined, "Shared a product");
    await checkAchievements();
  }, [addXP, checkAchievements]);

  // Effect to check daily reward on mount
  useEffect(() => {
    if (store.userProfile && !store.isLoading) {
      const today = new Date().toISOString().split("T")[0];
      const lastLogin = store.userProfile.last_login_date;

      if (lastLogin !== today) {
        store.setDailyRewardModal(true);
      }
    }
  }, [store, store.userProfile, store.isLoading]);

  return {
    // State
    ...store,

    // Actions
    initialize,
    addXP,
    unlockAchievement,
    claimDailyReward,
    spinWheel,
    checkAchievements,
    redeemReward,
    trackReferralClick,
    trackShare,
  };
}

// Export store for direct access
export { useGamificationStore };


"use client";

import { useCallback } from "react";
import { useGamificationStore } from "@/stores/gamificationStore";

/**
 * Hook to access gamification functionality
 * Provides a simplified interface to the gamification store
 */
export function useGamification() {
  const store = useGamificationStore();

  // Initialize gamification data
  const initialize = useCallback(async () => {
    await store.initialize();
  }, [store]);

  // Add XP
  const addXP = useCallback(
    async (action: string, amount?: number, description?: string) => {
      if (amount && amount > 0) {
        return store.addXP(amount, action, description);
      }
      return false;
    },
    [store]
  );

  // Claim daily reward
  const claimDailyReward = useCallback(async () => {
    return store.claimDailyReward();
  }, [store]);

  // Spin the wheel
  const spinWheel = useCallback(async () => {
    return store.spinWheel();
  }, [store]);

  // Purchase reward
  const purchaseReward = useCallback(
    async (rewardId: string) => {
      return store.purchaseReward(rewardId);
    },
    [store]
  );

  // Check achievements
  const checkAchievements = useCallback(async () => {
    return store.checkAchievements();
  }, [store]);

  // Track quest progress
  const trackQuest = useCallback(
    (questId: string, progress: number) => {
      store.updateQuestProgress(questId, progress);
    },
    [store]
  );

  // Complete quest
  const completeQuest = useCallback(
    (questId: string) => {
      store.completeQuest(questId);
    },
    [store]
  );

  return {
    // State
    userProfile: store.userProfile,
    levelInfo: store.levelInfo,
    nextLevelXP: store.nextLevelXP,
    isLoading: store.isLoading,
    isInitialized: store.isInitialized,
    achievements: store.achievements,
    achievementStats: store.achievementStats,
    spinPrizes: store.spinPrizes,
    rewards: store.rewards,
    dailyQuests: store.dailyQuests,
    canClaimDailyReward: store.canClaimDailyReward,
    availableSpins: store.userProfile?.available_spins || 0,
    isSpinning: store.isSpinning,
    lastSpinResult: store.lastSpinResult,
    notifications: store.notifications,

    // Actions
    initialize,
    addXP,
    claimDailyReward,
    spinWheel,
    purchaseReward,
    checkAchievements,
    trackQuest,
    completeQuest,

    // Quest initialization
    initDailyQuests: store.initDailyQuests,

    // Notifications
    addNotification: store.addNotification,
    removeNotification: store.removeNotification,
    clearNotifications: store.clearNotifications,

    // Modals
    showLevelUpModal: store.showLevelUpModal,
    levelUpData: store.levelUpData,
    showAchievementModal: store.showAchievementModal,
    unlockedAchievement: store.unlockedAchievement,
    showDailyRewardModal: store.showDailyRewardModal,
    dailyRewardData: store.dailyRewardData,
    showStreakMilestoneModal: store.showStreakMilestoneModal,
    milestoneData: store.milestoneData,
    setLevelUpModal: store.setLevelUpModal,
    setAchievementModal: store.setAchievementModal,
    setDailyRewardModal: store.setDailyRewardModal,
    setStreakMilestoneModal: store.setStreakMilestoneModal,

    // Helpers
    getCurrentTier: store.getCurrentTier,
    getXPProgress: store.getXPProgress,

    // Fetch functions
    fetchUserProfile: store.fetchUserProfile,
    fetchAchievements: store.fetchAchievements,
    fetchSpinPrizes: store.fetchSpinPrizes,
    fetchRewards: store.fetchRewards,
  };
}

export { useGamificationStore };

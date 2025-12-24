"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  UserProfile,
  Achievement,
  AchievementWithProgress,
  SpinPrize,
  Reward,
  MysteryBox,
  GamificationNotification,
  XPAction,
  DailyReward,
  StreakMilestone,
  DailyQuest,
} from "@/types/gamification";
import {
  XP_REWARDS,
  getLevelFromXP,
  getLevelTier,
  getXPProgress,
  DAILY_REWARDS,
  getStreakMilestone,
  getDailyQuests,
} from "@/types/gamification";

// State interface
interface GamificationState {
  // User data
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Cached data
  achievements: Achievement[];
  userAchievements: AchievementWithProgress[];
  spinPrizes: SpinPrize[];
  rewards: Reward[];
  mysteryBoxes: MysteryBox[];

  // UI State
  notifications: GamificationNotification[];
  showLevelUpModal: boolean;
  levelUpData: { newLevel: number; newTitle: string; perks: string[] } | null;
  showAchievementModal: boolean;
  unlockedAchievement: Achievement | null;
  showDailyRewardModal: boolean;
  dailyRewardToClaim: DailyReward | null;
  showStreakMilestoneModal: boolean;
  milestoneData: StreakMilestone | null;

  // Daily quests
  dailyQuests: DailyQuest[];
  questsDate: string | null;

  // Spin wheel state
  availableSpins: number;
  isSpinning: boolean;
  lastSpinResult: SpinPrize | null;
}

// Actions interface
interface GamificationActions {
  // Profile actions
  setUserProfile: (profile: UserProfile | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setLoading: (loading: boolean) => void;
  setAuthenticated: (authenticated: boolean) => void;

  // XP actions
  addXP: (action: XPAction, value?: number, description?: string) => void;
  
  // Achievement actions
  setAchievements: (achievements: Achievement[]) => void;
  setUserAchievements: (achievements: AchievementWithProgress[]) => void;
  unlockAchievement: (achievement: Achievement) => void;

  // Spin wheel actions
  setSpinPrizes: (prizes: SpinPrize[]) => void;
  setAvailableSpins: (spins: number) => void;
  spin: () => SpinPrize | null;
  setSpinning: (spinning: boolean) => void;
  setLastSpinResult: (result: SpinPrize | null) => void;

  // Rewards actions
  setRewards: (rewards: Reward[]) => void;
  setMysteryBoxes: (boxes: MysteryBox[]) => void;

  // Daily login
  claimDailyReward: () => DailyReward | null;
  setDailyRewardModal: (show: boolean, reward?: DailyReward | null) => void;

  // Daily quests
  initDailyQuests: () => void;
  updateQuestProgress: (questId: string, progress: number) => void;
  completeQuest: (questId: string) => void;

  // Notification actions
  addNotification: (notification: Omit<GamificationNotification, "id" | "timestamp">) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Modal actions
  setLevelUpModal: (show: boolean, data?: GamificationState["levelUpData"]) => void;
  setAchievementModal: (show: boolean, achievement?: Achievement | null) => void;
  setStreakMilestoneModal: (show: boolean, milestone?: StreakMilestone | null) => void;

  // Helpers
  getCurrentTier: () => ReturnType<typeof getLevelTier>;
  getXPProgress: () => number;
  reset: () => void;
}

type GamificationStore = GamificationState & GamificationActions;

// Initial state
const initialState: GamificationState = {
  userProfile: null,
  isLoading: true,
  isAuthenticated: false,
  achievements: [],
  userAchievements: [],
  spinPrizes: [],
  rewards: [],
  mysteryBoxes: [],
  notifications: [],
  showLevelUpModal: false,
  levelUpData: null,
  showAchievementModal: false,
  unlockedAchievement: null,
  showDailyRewardModal: false,
  dailyRewardToClaim: null,
  showStreakMilestoneModal: false,
  milestoneData: null,
  dailyQuests: [],
  questsDate: null,
  availableSpins: 0,
  isSpinning: false,
  lastSpinResult: null,
};

export const useGamificationStore = create<GamificationStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Profile actions
      setUserProfile: (profile) => {
        set({
          userProfile: profile,
          availableSpins: profile?.available_spins || 0,
          isAuthenticated: !!profile,
        });
      },

      updateProfile: (updates) => {
        const current = get().userProfile;
        if (current) {
          set({ userProfile: { ...current, ...updates } });
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),

      // XP actions
      addXP: (action, value, description) => {
        const profile = get().userProfile;
        if (!profile) return;

        // Calculate XP amount
        const xpReward = XP_REWARDS[action];
        let xpAmount: number;
        if (typeof xpReward === "function") {
          xpAmount = xpReward(value);
        } else {
          xpAmount = value ?? xpReward;
        }

        if (xpAmount <= 0) return;

        const newTotalXP = profile.total_xp + xpAmount;
        const currentLevel = profile.current_level;
        const newLevel = getLevelFromXP(newTotalXP);

        // Update profile
        set({
          userProfile: {
            ...profile,
            total_xp: newTotalXP,
            current_level: newLevel,
          },
        });

        // Add XP notification
        get().addNotification({
          type: "xp_gain",
          title: `+${xpAmount} XP`,
          message: description || `Earned from ${action.replace("_", " ")}`,
          xpAmount,
        });

        // Check for level up
        if (newLevel > currentLevel) {
          const tier = getLevelTier(newLevel);
          get().setLevelUpModal(true, {
            newLevel,
            newTitle: tier.title,
            perks: tier.perks,
          });
        }
      },

      // Achievement actions
      setAchievements: (achievements) => set({ achievements }),
      setUserAchievements: (achievements) => set({ userAchievements: achievements }),

      unlockAchievement: (achievement) => {
        const profile = get().userProfile;
        if (!profile) return;

        // Update user achievements
        const current = get().userAchievements;
        const updated: AchievementWithProgress = {
          ...achievement,
          isUnlocked: true,
          unlockedAt: new Date().toISOString(),
          progress: achievement.requirement_value,
        };

        set({
          userAchievements: [...current.filter((a) => a.id !== achievement.id), updated],
        });

        // Add XP reward
        get().addXP("achievement", achievement.xp_reward, `Achievement: ${achievement.name}`);

        // Show achievement modal
        get().setAchievementModal(true, achievement);
      },

      // Spin wheel actions
      setSpinPrizes: (prizes) => set({ spinPrizes: prizes }),
      setAvailableSpins: (spins) => {
        set({ availableSpins: spins });
        const profile = get().userProfile;
        if (profile) {
          set({ userProfile: { ...profile, available_spins: spins } });
        }
      },

      spin: () => {
        const { spinPrizes, availableSpins } = get();
        if (availableSpins <= 0 || spinPrizes.length === 0) return null;

        // Weighted random selection
        const totalWeight = spinPrizes.reduce((sum, p) => sum + p.probability, 0);
        let random = Math.random() * totalWeight;

        for (const prize of spinPrizes) {
          random -= prize.probability;
          if (random <= 0) {
            get().setAvailableSpins(availableSpins - 1);
            set({ lastSpinResult: prize });
            return prize;
          }
        }

        // Fallback to first prize
        const fallback = spinPrizes[0];
        get().setAvailableSpins(availableSpins - 1);
        set({ lastSpinResult: fallback });
        return fallback;
      },

      setSpinning: (spinning) => set({ isSpinning: spinning }),
      setLastSpinResult: (result) => set({ lastSpinResult: result }),

      // Rewards actions
      setRewards: (rewards) => set({ rewards }),
      setMysteryBoxes: (boxes) => set({ mysteryBoxes: boxes }),

      // Daily login
      claimDailyReward: () => {
        const profile = get().userProfile;
        if (!profile) return null;

        const today = new Date().toISOString().split("T")[0];
        const lastLogin = profile.last_login_date;

        // Check if already claimed today
        if (lastLogin === today) return null;

        // Calculate streak
        let newStreak = 1;
        if (lastLogin) {
          const lastDate = new Date(lastLogin);
          const todayDate = new Date(today);
          const diffDays = Math.floor(
            (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diffDays === 1) {
            // Consecutive day
            newStreak = profile.current_streak + 1;
          }
          // If diffDays > 1, streak resets to 1
        }

        // Get reward for current day in 7-day cycle
        const cycleDay = ((newStreak - 1) % 7) + 1;
        const reward = DAILY_REWARDS.find((r) => r.day === cycleDay) || DAILY_REWARDS[0];

        // Update profile
        set({
          userProfile: {
            ...profile,
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, profile.longest_streak),
            last_login_date: today,
          },
        });

        // Add XP
        get().addXP("daily_login", newStreak, `Day ${cycleDay} login bonus`);

        // Handle bonus rewards based on reward type
        if (reward.reward) {
          switch (reward.reward.type) {
            case "spin":
              get().setAvailableSpins(get().availableSpins + 1);
              get().addNotification({
                type: "reward",
                title: "Free Spin Earned!",
                message: "Head to the Rewards section to spin the wheel",
                icon: "🎡",
              });
              break;
            case "discount":
              get().addNotification({
                type: "reward",
                title: "Discount Unlocked!",
                message: reward.reward.description,
                icon: "🏷️",
              });
              break;
            case "mystery_key":
              get().addNotification({
                type: "reward",
                title: "Mystery Key Earned!",
                message: reward.reward.description,
                icon: "🔑",
              });
              break;
            case "xp_multiplier":
              get().addNotification({
                type: "reward",
                title: "XP Boost Active!",
                message: reward.reward.description,
                icon: "⚡",
              });
              break;
          }
        }

        // Check for streak milestones
        const milestone = getStreakMilestone(newStreak);
        if (milestone) {
          // Add milestone XP bonus
          get().addXP("bonus", milestone.xpBonus, `${milestone.badge} milestone bonus`);
          
          // Show milestone modal after a short delay (let daily reward modal close first)
          setTimeout(() => {
            get().setStreakMilestoneModal(true, milestone);
          }, 2000);
        }

        return reward;
      },

      setDailyRewardModal: (show, reward = null) => {
        set({ showDailyRewardModal: show, dailyRewardToClaim: reward });
      },

      // Daily quests
      initDailyQuests: () => {
        const today = new Date().toISOString().split("T")[0];
        const { questsDate, dailyQuests } = get();

        // If quests are already for today, don't regenerate
        if (questsDate === today && dailyQuests.length > 0) {
          return;
        }

        // Generate new quests for today
        const newQuests = getDailyQuests(today);
        set({ dailyQuests: newQuests, questsDate: today });
      },

      updateQuestProgress: (questId, progress) => {
        const quests = get().dailyQuests;
        const quest = quests.find((q) => q.id === questId);
        
        if (!quest || quest.completed) return;

        const updatedQuests = quests.map((q) => {
          if (q.id === questId) {
            const newProgress = Math.min(progress, q.requirement.count);
            const completed = newProgress >= q.requirement.count;
            
            if (completed && !q.completed) {
              // Quest just completed - add XP
              setTimeout(() => {
                get().addXP("quest", q.xpReward, `Quest: ${q.title}`);
                get().addNotification({
                  type: "achievement",
                  title: "Quest Complete!",
                  message: `${q.title} - +${q.xpReward} XP`,
                  icon: q.icon,
                });
              }, 0);
            }

            return {
              ...q,
              progress: newProgress,
              completed,
              completedAt: completed ? new Date().toISOString() : undefined,
            };
          }
          return q;
        });

        set({ dailyQuests: updatedQuests });
      },

      completeQuest: (questId) => {
        const quests = get().dailyQuests;
        const quest = quests.find((q) => q.id === questId);
        
        if (!quest || quest.completed) return;

        get().updateQuestProgress(questId, quest.requirement.count);
      },

      // Notification actions
      addNotification: (notification) => {
        const newNotification: GamificationNotification = {
          ...notification,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          timestamp: Date.now(),
        };

        set((state) => ({
          notifications: [...state.notifications, newNotification].slice(-5), // Keep last 5
        }));

        // Auto-remove after 5 seconds
        setTimeout(() => {
          get().removeNotification(newNotification.id);
        }, 5000);
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearNotifications: () => set({ notifications: [] }),

      // Modal actions
      setLevelUpModal: (show, data = null) => {
        set({ showLevelUpModal: show, levelUpData: data });
      },

      setAchievementModal: (show, achievement = null) => {
        set({ showAchievementModal: show, unlockedAchievement: achievement });
      },

      setStreakMilestoneModal: (show, milestone = null) => {
        set({ showStreakMilestoneModal: show, milestoneData: milestone });
      },

      // Helpers
      getCurrentTier: () => {
        const profile = get().userProfile;
        return getLevelTier(profile?.current_level || 1);
      },

      getXPProgress: () => {
        const profile = get().userProfile;
        if (!profile) return 0;
        return getXPProgress(profile.total_xp, profile.current_level);
      },

      reset: () => set(initialState),
    }),
    {
      name: "dark-point-gamification",
      partialize: (state) => ({
        // Only persist essential user data
        userProfile: state.userProfile,
        availableSpins: state.availableSpins,
        dailyQuests: state.dailyQuests,
        questsDate: state.questsDate,
      }),
    }
  )
);


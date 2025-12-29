"use client";

import { create } from "zustand";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type {
  Achievement,
  SpinPrize,
  Reward,
  GamificationNotification,
  DailyQuest,
  StreakMilestone,
} from "@/types/gamification";
import {
  getLevelTier,
  getXPProgress,
  getStreakMilestone,
  getDailyQuests,
} from "@/types/gamification";

// RPC Response types
interface GamificationStatsResponse {
  success: boolean;
  error?: string;
  profile?: {
    total_xp: number;
    current_level: number;
    current_streak: number;
    longest_streak: number;
    available_spins: number;
    store_credit: number;
    referral_code: string | null;
    referral_count: number;
    last_login_date: string | null;
  };
  level_info?: LevelInfo;
  next_level?: { level: number; xp_required: number; xp_needed: number } | null;
  achievements?: { total: number; unlocked: number; legendary: number; xpEarned: number };
}

interface DailyRewardResponse {
  success: boolean;
  error?: string;
  claimed?: boolean;
  streak?: number;
  longest_streak?: number;
  cycle_day?: number;
  xp_earned?: number;
  bonus_reward?: string | null;
  free_spin_earned?: boolean;
}

interface SpinWheelResponse {
  success: boolean;
  error?: string;
  prize?: SpinPrize;
  remaining_spins?: number;
}

interface PurchaseRewardResponse {
  success: boolean;
  error?: string;
  reward?: { id: string; name: string; category: string };
  xp_spent?: number;
  remaining_xp?: number;
  required?: number;
  current?: number;
}

interface AddXPResponse {
  success: boolean;
  error?: string;
  xp_earned?: number;
  total_xp?: number;
  old_level?: number;
  new_level?: number;
  leveled_up?: boolean;
}

interface CheckAchievementsResponse {
  success: boolean;
  error?: string;
  unlocked?: string[];
  count?: number;
}

interface AchievementsResponse {
  success: boolean;
  error?: string;
  achievements?: AchievementWithProgress[];
}

interface DailyRewardStatusResponse {
  success: boolean;
  error?: string;
  claimed_today?: boolean;
  current_streak?: number;
  next_cycle_day?: number;
  last_login_date?: string | null;
}

// Extended user profile from database
interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_login_date: string | null;
  total_spent: number;
  total_orders: number;
  total_reviews: number;
  referral_code: string | null;
  referred_by: string | null;
  referral_count: number;
  available_spins: number;
  store_credit: number;
  created_at: string;
  updated_at: string;
}

interface LevelInfo {
  level: number;
  title: string;
  badge_color: string;
  discount_percent: number;
  perks: string[];
}

interface AchievementWithProgress extends Achievement {
  is_unlocked: boolean;
  unlocked_at: string | null;
  progress: number;
}

// State interface
interface GamificationState {
  // User data
  userProfile: UserProfile | null;
  levelInfo: LevelInfo | null;
  nextLevelXP: number | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Cached data
  achievements: AchievementWithProgress[];
  spinPrizes: SpinPrize[];
  rewards: Reward[];
  
  // Stats
  achievementStats: {
    total: number;
    unlocked: number;
    legendary: number;
    xpEarned: number;
  };

  // UI State
  notifications: GamificationNotification[];
  showLevelUpModal: boolean;
  levelUpData: { newLevel: number; newTitle: string; perks: string[] } | null;
  showAchievementModal: boolean;
  unlockedAchievement: Achievement | null;
  showDailyRewardModal: boolean;
  dailyRewardData: {
    streak: number;
    cycleDay: number;
    xpEarned: number;
    bonusReward: string | null;
    freeSpinEarned: boolean;
  } | null;
  canClaimDailyReward: boolean;
  showStreakMilestoneModal: boolean;
  milestoneData: StreakMilestone | null;

  // Daily quests (client-side for now)
  dailyQuests: DailyQuest[];
  questsDate: string | null;

  // Spin wheel state
  isSpinning: boolean;
  lastSpinResult: SpinPrize | null;
}

// Actions interface
interface GamificationActions {
  // Initialization
  initialize: () => Promise<void>;
  fetchUserProfile: () => Promise<void>;
  fetchAchievements: (category?: string) => Promise<void>;
  fetchSpinPrizes: () => Promise<void>;
  fetchRewards: () => Promise<void>;
  
  // Daily rewards
  checkDailyRewardStatus: () => Promise<void>;
  claimDailyReward: () => Promise<boolean>;
  setDailyRewardModal: (show: boolean) => void;
  
  // Spin wheel
  spinWheel: () => Promise<SpinPrize | null>;
  setSpinning: (spinning: boolean) => void;
  setLastSpinResult: (result: SpinPrize | null) => void;

  // Rewards shop
  purchaseReward: (rewardId: string) => Promise<{ success: boolean; error?: string }>;

  // XP
  addXP: (amount: number, action: string, description?: string) => Promise<boolean>;
  addXPLocal: (amount: number, action: string, description?: string) => boolean;

  // Achievement check
  checkAchievements: () => Promise<string[]>;

  // Daily quests
  initDailyQuests: () => void;
  syncQuestProgressFromDB: () => Promise<void>;
  updateQuestProgress: (questId: string, progress: number) => void;
  updateQuestProgressWithDB: (questId: string, progressToAdd: number, requirement: number, xpReward: number) => Promise<void>;
  logActivity: (activityType: string, referenceId?: string) => Promise<boolean>;
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
  levelInfo: null,
  nextLevelXP: null,
  isLoading: false,
  isInitialized: false,
  achievements: [],
  spinPrizes: [],
  rewards: [],
  achievementStats: { total: 0, unlocked: 0, legendary: 0, xpEarned: 0 },
  notifications: [],
  showLevelUpModal: false,
  levelUpData: null,
  showAchievementModal: false,
  unlockedAchievement: null,
  showDailyRewardModal: false,
  dailyRewardData: null,
  canClaimDailyReward: false,
  showStreakMilestoneModal: false,
  milestoneData: null,
  dailyQuests: [],
  questsDate: null,
  isSpinning: false,
  lastSpinResult: null,
};

export const useGamificationStore = create<GamificationStore>()((set, get) => ({
      ...initialState,

  // Initialize gamification data
  initialize: async () => {
    if (!isSupabaseConfigured()) {
      set({ isInitialized: true });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ isInitialized: true });
      return;
    }

    set({ isLoading: true });

    try {
      // Fetch all data in parallel
      await Promise.all([
        get().fetchUserProfile(),
        get().fetchSpinPrizes(),
        get().fetchRewards(),
      ]);

      // Check daily reward status
      await get().checkDailyRewardStatus();

      // Initialize daily quests
      get().initDailyQuests();

      set({ isInitialized: true, isLoading: false });
    } catch (error) {
      console.error("Error initializing gamification:", error);
      set({ isInitialized: true, isLoading: false });
    }
  },

  // Fetch user profile with stats
  fetchUserProfile: async () => {
    if (!isSupabaseConfigured()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc("get_gamification_stats", { p_user_id: user.id } as never);

      if (error) throw error;

      const result = data as unknown as GamificationStatsResponse;
      if (result?.success && result.profile) {
        set({
          userProfile: {
            id: user.id,
            username: null,
            display_name: null,
            avatar_url: null,
            total_spent: 0,
            total_orders: 0,
            total_reviews: 0,
            referred_by: null,
            created_at: "",
            updated_at: "",
            ...result.profile,
          } as UserProfile,
          levelInfo: result.level_info || null,
          nextLevelXP: result.next_level?.xp_required || null,
          achievementStats: result.achievements || { total: 0, unlocked: 0, legendary: 0, xpEarned: 0 },
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      
      // Fallback: try direct query
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        set({ userProfile: profile as UserProfile });
      }
    }
  },

  // Fetch achievements
  fetchAchievements: async (category?: string) => {
    if (!isSupabaseConfigured()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc("get_user_achievements", { 
          p_user_id: user.id,
          p_category: category || null
        } as never);

      if (error) throw error;

      const result = data as unknown as AchievementsResponse;
      if (result?.success && result.achievements) {
        set({ achievements: result.achievements });
      }
    } catch (error) {
      console.error("Error fetching achievements:", error);
    }
  },

  // Fetch spin prizes
  fetchSpinPrizes: async () => {
    if (!isSupabaseConfigured()) return;

    try {
      const { data, error } = await supabase
        .from("spin_prizes")
        .select("*")
        .eq("is_active", true)
        .order("probability", { ascending: false });

      if (error) throw error;

      set({ spinPrizes: data || [] });
    } catch (error) {
      console.error("Error fetching spin prizes:", error);
    }
  },

  // Fetch rewards
  fetchRewards: async () => {
    if (!isSupabaseConfigured()) return;

    try {
      const { data, error } = await supabase
        .from("rewards")
        .select("*")
        .eq("is_active", true)
        .order("xp_cost", { ascending: true });

      if (error) throw error;

      set({ rewards: data || [] });
    } catch (error) {
      console.error("Error fetching rewards:", error);
    }
  },

  // Check daily reward status
  checkDailyRewardStatus: async () => {
    if (!isSupabaseConfigured()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc("check_daily_reward_status", { p_user_id: user.id } as never);

      if (error) throw error;

      const result = data as unknown as DailyRewardStatusResponse;
      if (result?.success) {
        set({ canClaimDailyReward: !result.claimed_today });
        
        // If can claim, show modal
        if (!result.claimed_today) {
          set({ showDailyRewardModal: true });
        }
      }
    } catch (error) {
      console.error("Error checking daily reward status:", error);
    }
  },

  // Claim daily reward
  claimDailyReward: async () => {
    if (!isSupabaseConfigured()) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .rpc("claim_daily_reward", { p_user_id: user.id } as never);

      if (error) throw error;

      const result = data as unknown as DailyRewardResponse;
      if (result?.success) {
        // Update local state
        set({
          canClaimDailyReward: false,
          dailyRewardData: {
            streak: result.streak || 1,
            cycleDay: result.cycle_day || 1,
            xpEarned: result.xp_earned || 0,
            bonusReward: result.bonus_reward || null,
            freeSpinEarned: result.free_spin_earned || false,
          },
        });

        // Refresh profile
        await get().fetchUserProfile();

        // Add notification
        get().addNotification({
          type: "xp_gain",
          title: `+${result.xp_earned || 0} XP`,
          message: `Day ${result.streak || 1} login streak!`,
          xpAmount: result.xp_earned || 0,
        });

        // Check for streak milestone
        const milestone = getStreakMilestone(result.streak || 1);
        if (milestone) {
          setTimeout(() => {
            get().setStreakMilestoneModal(true, milestone);
          }, 2000);
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error("Error claiming daily reward:", error);
      return false;
    }
  },

  setDailyRewardModal: (show) => set({ showDailyRewardModal: show }),

  // Spin the wheel
  spinWheel: async () => {
    const profile = get().userProfile;
    if (!profile || profile.available_spins <= 0) return null;

    set({ isSpinning: true });

    // Try database first
    if (isSupabaseConfigured()) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        try {
          const { data, error } = await supabase
            .rpc("spin_wheel", { p_user_id: user.id } as never);

          if (!error) {
            const result = data as unknown as SpinWheelResponse;
            if (result?.success && result.prize) {
              const prize = result.prize;
              
              set({ 
                lastSpinResult: prize,
                userProfile: {
                  ...profile,
                  available_spins: result.remaining_spins || 0,
                },
              });

              // Refresh profile to get updated XP/credits
              setTimeout(() => get().fetchUserProfile(), 100);
              
              // Add notification for the prize
              const prizeValueNum = typeof prize.prize_value === "string" ? parseInt(prize.prize_value) : prize.prize_value;
              get().addNotification({
                type: prize.prize_type === "xp" ? "xp_gain" : "reward",
                title: `🎉 ${prize.name}!`,
                message: prize.description || `You won: ${prize.prize_value}`,
                xpAmount: prize.prize_type === "xp" ? prizeValueNum : undefined,
              });

              set({ isSpinning: false });
              return prize;
            }
          } else {
            console.warn("Spin wheel RPC error, using local fallback:", error);
          }
        } catch (error) {
          console.warn("Spin wheel error, using local fallback:", error);
        }
      }
    }

    // Local fallback when database isn't available
    const localPrizes: SpinPrize[] = [
      { id: "1", name: "+10 XP", description: "Nice! You won 10 XP!", prize_type: "xp", prize_value: "10", probability: 30, color: "#4CAF50", is_active: true },
      { id: "2", name: "+25 XP", description: "Great! You won 25 XP!", prize_type: "xp", prize_value: "25", probability: 25, color: "#8BC34A", is_active: true },
      { id: "3", name: "+50 XP", description: "Awesome! You won 50 XP!", prize_type: "xp", prize_value: "50", probability: 15, color: "#CDDC39", is_active: true },
      { id: "4", name: "+100 XP", description: "Amazing! You won 100 XP!", prize_type: "xp", prize_value: "100", probability: 8, color: "#FFEB3B", is_active: true },
      { id: "5", name: "5% Off", description: "You won 5% off your next order!", prize_type: "discount", prize_value: "5", probability: 10, color: "#FF9800", is_active: true },
      { id: "6", name: "10% Off", description: "You won 10% off your next order!", prize_type: "discount", prize_value: "10", probability: 5, color: "#FF5722", is_active: true },
      { id: "7", name: "Free Spin!", description: "Lucky! You get another spin!", prize_type: "spin", prize_value: "1", probability: 5, color: "#E91E63", is_active: true },
      { id: "8", name: "Mystery!", description: "Something special awaits!", prize_type: "mystery", prize_value: "0", probability: 2, color: "#9E9E9E", is_active: true },
    ];

    // Weighted random selection
    const totalWeight = localPrizes.reduce((sum, p) => sum + p.probability, 0);
    let random = Math.random() * totalWeight;
    let selectedPrize = localPrizes[0];
    
    for (const prize of localPrizes) {
      random -= prize.probability;
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }

    // Apply prize locally
    const prizeValue = parseInt(selectedPrize.prize_value) || 0;
    const newSpins = profile.available_spins - 1 + (selectedPrize.prize_type === "spin" ? prizeValue : 0);
    const newXP = profile.total_xp + (selectedPrize.prize_type === "xp" ? prizeValue : 0);

    set({
      lastSpinResult: selectedPrize,
      userProfile: {
        ...profile,
        available_spins: newSpins,
        total_xp: newXP,
      },
    });

    // Add notification
    get().addNotification({
      type: selectedPrize.prize_type === "xp" ? "xp_gain" : "reward",
      title: `🎉 ${selectedPrize.name}!`,
      message: selectedPrize.description || "",
      xpAmount: selectedPrize.prize_type === "xp" ? prizeValue : undefined,
    });

    set({ isSpinning: false });
    return selectedPrize;
  },

  setSpinning: (spinning) => set({ isSpinning: spinning }),
  setLastSpinResult: (result) => set({ lastSpinResult: result }),

  // Purchase reward
  purchaseReward: async (rewardId) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Database not configured" };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Please sign in to purchase rewards" };
    }

    // Get the reward details from local store for display
    const reward = get().rewards.find(r => r.id === rewardId);
    const rewardName = reward?.name || "Reward";

    try {
      const { data, error } = await supabase
        .rpc("purchase_reward", { 
          p_user_id: user.id, 
          p_reward_id: rewardId 
        } as never);

      if (error) {
        // Handle specific error cases
        if (error.code === "PGRST202" || error.message?.includes("function") || error.message?.includes("does not exist")) {
          console.warn("purchase_reward RPC not available. Feature requires database setup.");
          return { success: false, error: "This feature is not yet available. Database setup required." };
        }
        console.error("Supabase RPC error:", error);
        return { success: false, error: error.message || "Purchase failed" };
      }

      const result = data as unknown as PurchaseRewardResponse;
      if (result?.success) {
        // Refresh profile
        await get().fetchUserProfile();

        // Add notification
        get().addNotification({
          type: "reward",
          title: "Reward Purchased!",
          message: `You got: ${result.reward?.name || rewardName}`,
          icon: "🎁",
        });

        return { success: true };
      }

      // Handle business logic errors from the function
      const errorMessage = result?.error || "Purchase failed";
      if (errorMessage.includes("Insufficient XP")) {
        return { success: false, error: `Not enough XP. You need ${result?.required || "more"} XP.` };
      }
      return { success: false, error: errorMessage };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Purchase failed";
      console.error("Error purchasing reward:", error);
      return { success: false, error: errorMessage };
    }
  },

  // Add XP
  addXP: async (amount, action, description) => {
    if (!isSupabaseConfigured()) {
      // Fallback: update local state only
      return get().addXPLocal(amount, action, description);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return get().addXPLocal(amount, action, description);
    }

    try {
      const { data, error } = await supabase
        .rpc("add_xp", { 
          p_user_id: user.id, 
          p_amount: amount,
          p_action: action,
          p_description: description || null
        } as never);

      if (error) {
        // If RPC function doesn't exist, fall back to local update
        console.warn("RPC add_xp not available, using local fallback:", error);
        return get().addXPLocal(amount, action, description);
      }

      const result = data as unknown as AddXPResponse;
      if (result?.success) {
        // Refresh profile
        await get().fetchUserProfile();

        // Add notification
        get().addNotification({
          type: "xp_gain",
          title: `+${amount} XP`,
          message: description || `Earned from ${action}`,
          xpAmount: amount,
        });

        // Check for level up
        if (result.leveled_up && result.new_level) {
          const tier = getLevelTier(result.new_level);
          get().setLevelUpModal(true, {
            newLevel: result.new_level,
            newTitle: tier.title,
            perks: tier.perks,
          });
        }

        return true;
      }

      // RPC returned but was not successful - use local fallback
      return get().addXPLocal(amount, action, description);
    } catch (error) {
      console.warn("Error adding XP via RPC, using local fallback:", error);
      return get().addXPLocal(amount, action, description);
    }
  },

  // Local XP addition (fallback when RPC not available)
  addXPLocal: (amount, action, description) => {
    const { userProfile, levelInfo } = get();
    
    if (!userProfile) {
      // Create a basic profile if none exists
      set({
        userProfile: {
          id: "local",
          username: null,
          display_name: null,
          avatar_url: null,
          total_xp: amount,
          current_level: 1,
          available_spins: 0,
          store_credit: 0,
          total_spent: 0,
          total_orders: 0,
          total_reviews: 0,
          referred_by: null,
          current_streak: 0,
          longest_streak: 0,
          last_login_date: null,
          referral_code: null,
          referral_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    } else {
      const newXP = userProfile.total_xp + amount;
      const oldLevel = userProfile.current_level;
      
      // Calculate new level based on XP thresholds
      const newLevel = Math.floor(newXP / 500) + 1; // Simple level calc: 500 XP per level
      const leveledUp = newLevel > oldLevel;

      set({
        userProfile: {
          ...userProfile,
          total_xp: newXP,
          current_level: newLevel,
          updated_at: new Date().toISOString(),
        },
      });

      // Check for level up
      if (leveledUp) {
        const tier = getLevelTier(newLevel);
        get().setLevelUpModal(true, {
          newLevel,
          newTitle: tier.title,
          perks: tier.perks,
        });
      }
    }

    // Add notification
    get().addNotification({
      type: "xp_gain",
      title: `+${amount} XP`,
      message: description || `Earned from ${action}`,
      xpAmount: amount,
    });

    return true;
  },

  // Check achievements
  checkAchievements: async () => {
    if (!isSupabaseConfigured()) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .rpc("check_achievements", { p_user_id: user.id } as never);

      if (error) throw error;

      const result = data as unknown as CheckAchievementsResponse;
      if (result?.success && result.unlocked && result.unlocked.length > 0) {
        // Refresh achievements
        await get().fetchAchievements();

        // Show achievement modal for first unlocked
        const { achievements } = get();
        const firstUnlocked = achievements.find(a => a.id === result.unlocked![0]);
        if (firstUnlocked) {
          get().setAchievementModal(true, firstUnlocked);
        }

        return result.unlocked;
      }

      return [];
    } catch (error) {
      console.error("Error checking achievements:", error);
      return [];
    }
  },

  // Daily quests
  initDailyQuests: () => {
    const today = new Date().toISOString().split("T")[0];
    const { questsDate, dailyQuests } = get();

    if (questsDate === today && dailyQuests.length > 0) {
      return;
    }

    const newQuests = getDailyQuests(today);
    set({ dailyQuests: newQuests, questsDate: today });
    
    // Sync with database if user is logged in
    get().syncQuestProgressFromDB();
  },

  // Sync quest progress from database
  syncQuestProgressFromDB: async () => {
    if (!isSupabaseConfigured()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc("get_daily_quest_progress", { p_user_id: user.id } as never);

      if (error) {
        console.warn("Could not sync quest progress:", error);
        return;
      }

      const result = data as { success: boolean; quests: Array<{ quest_id: string; progress: number; completed: boolean; completed_at: string | null }> };
      if (result?.success && result.quests) {
        // Update local quests with database progress
        const { dailyQuests } = get();
        const updatedQuests = dailyQuests.map((quest) => {
          const dbProgress = result.quests.find((q) => q.quest_id === quest.id);
          if (dbProgress) {
            return {
              ...quest,
              progress: dbProgress.progress,
              completed: dbProgress.completed,
              completedAt: dbProgress.completed_at || undefined,
            };
          }
          return quest;
        });
        set({ dailyQuests: updatedQuests });
      }
    } catch (error) {
      console.warn("Error syncing quest progress:", error);
    }
  },

  // Update quest progress (local + database)
  updateQuestProgress: (questId, progressToAdd) => {
    // Initialize quests if they haven't been loaded yet
    let quests = get().dailyQuests;
    if (quests.length === 0) {
      get().initDailyQuests();
      quests = get().dailyQuests;
    }

    const quest = quests.find((q) => q.id === questId);
    
    // Quest might not be in today's rotation - that's OK
    if (!quest || quest.completed) return;

    // Update local state immediately for responsiveness
    const updatedQuests = quests.map((q) => {
      if (q.id === questId) {
        const newProgress = Math.min(q.progress + progressToAdd, q.requirement.count);
        const completed = newProgress >= q.requirement.count;
        
        if (completed && !q.completed) {
          // Quest completed - add XP (will use local fallback if DB not available)
          setTimeout(async () => {
            await get().addXP(q.xpReward, "quest", `Quest: ${q.title}`);
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

    // Also update database if user is logged in
    get().updateQuestProgressWithDB(questId, progressToAdd, quest.requirement.count, quest.xpReward);
  },

  // Update quest progress in database
  updateQuestProgressWithDB: async (questId, progressToAdd, requirement, xpReward) => {
    if (!isSupabaseConfigured()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await supabase.rpc("update_quest_progress", {
        p_user_id: user.id,
        p_quest_id: questId,
        p_progress_to_add: progressToAdd,
        p_quest_requirement: requirement,
        p_xp_reward: xpReward,
      } as never);
    } catch (error) {
      console.warn("Could not save quest progress to database:", error);
    }
  },

  // Log user activity for quest tracking
  logActivity: async (activityType, referenceId) => {
    if (!isSupabaseConfigured()) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc("log_user_activity", {
        p_user_id: user.id,
        p_activity_type: activityType,
        p_reference_id: referenceId || null,
      } as never);

      if (error) {
        console.warn("Could not log activity:", error);
        return false;
      }

      const result = data as { success: boolean; duplicate: boolean };
      return result?.success && !result?.duplicate;
    } catch (error) {
      console.warn("Error logging activity:", error);
      return false;
    }
  },

  completeQuest: (questId) => {
    const quest = get().dailyQuests.find((q) => q.id === questId);
    if (quest && !quest.completed) {
      get().updateQuestProgress(questId, quest.requirement.count);
    }
  },

      // Notification actions
      addNotification: (notification) => {
        const newNotification: GamificationNotification = {
          ...notification,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          timestamp: Date.now(),
        };

        set((state) => ({
      notifications: [...state.notifications, newNotification].slice(-5),
        }));

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
}));

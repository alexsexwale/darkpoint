"use client";

import { create } from "zustand";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Tables } from "@/types/database";
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

// Module-level lock to prevent concurrent achievement checks
let isCheckingAchievements = false;
let pendingAchievementCheck: { resolve: (value: string[]) => void; skipTypes?: string[] }[] = [];
let achievementCheckDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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
  base_xp?: number;
  bonus_xp?: number;
  total_xp_earned?: number;
  multiplier_applied?: number;
  levelup_reward?: {
    success: boolean;
    reward_granted: boolean;
    xp_bonus?: number;
    free_spin?: boolean;
    new_level?: number;
  };
}

interface XPMultiplier {
  id: string;
  multiplier: number;
  source: string;
  source_description: string | null;
  starts_at: string;
  expires_at: string;
  time_remaining_seconds: number;
  xp_earned_with_multiplier: number;
}

interface GrantMultiplierResponse {
  success: boolean;
  action?: "created" | "extended";
  multiplier_id?: string;
  multiplier?: number;
  expires_at?: string;
  duration_hours?: number;
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
  phone: string | null;
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

  // Track which action types have given XP today (to avoid double XP for achievements)
  questRewardedActions: Set<string>;

  // XP Multiplier state
  activeMultiplier: XPMultiplier | null;

  // Badge state
  userBadges: Array<{ badge_id: string; equipped: boolean; acquired_at: string }>;
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
  checkAchievements: (skipXPTypes?: string[]) => Promise<string[]>;
  trackQuestRewardedAction: (actionType: string) => void;
  clearQuestRewardedActions: () => void;

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

  // XP Multiplier actions
  fetchActiveMultiplier: () => Promise<void>;
  grantMultiplier: (multiplier: number, durationHours: number, source: string, description?: string) => Promise<boolean>;
  clearActiveMultiplier: () => void;

  // Share tracking
  incrementShareCount: () => Promise<void>;

  // Badge actions
  fetchUserBadges: () => Promise<void>;
  hasBadge: (badgeId: string) => boolean;
  hasAnyBadge: () => boolean;
  getHighestBadge: () => string | null;
  equipBadge: (badgeId: string) => Promise<void>;

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
  questRewardedActions: new Set<string>(),
  activeMultiplier: null,
  userBadges: [],
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
        get().fetchActiveMultiplier(),
        get().fetchUserBadges(),
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
      // Fetch both gamification stats and profile details in parallel
      const [rpcResult, profileResult] = await Promise.all([
        supabase.rpc("get_gamification_stats", { p_user_id: user.id } as never),
        supabase.from("user_profiles").select("avatar_url, display_name, username, phone").eq("id", user.id).single()
      ]);

      const result = rpcResult.data as unknown as GamificationStatsResponse;
      const profileDetails = profileResult.data as { avatar_url: string | null; display_name: string | null; username: string | null; phone: string | null } | null;
      
      if (result?.success && result.profile) {
        set({
          userProfile: {
            id: user.id,
            username: profileDetails?.username || null,
            display_name: profileDetails?.display_name || null,
            avatar_url: profileDetails?.avatar_url || null,
            phone: profileDetails?.phone || null,
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
      } else if (profileDetails) {
        // RPC failed but we got profile details
        set({
          userProfile: {
            id: user.id,
            ...profileDetails,
            total_xp: 0,
            current_level: 1,
            current_streak: 0,
            longest_streak: 0,
            last_login_date: null,
            total_spent: 0,
            total_orders: 0,
            total_reviews: 0,
            referral_code: null,
            referred_by: null,
            referral_count: 0,
            available_spins: 0,
            store_credit: 0,
            created_at: "",
            updated_at: "",
          } as UserProfile,
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

    // First, try to restore/sync achievements based on user stats
    // This ensures achievements are properly calculated even if data was lost
    try {
      await supabase.rpc("restore_user_achievements", { p_user_id: user.id } as never);
    } catch (restoreError) {
      // Silently continue if restore fails - it might not be deployed yet
      console.warn("restore_user_achievements not available:", restoreError);
    }

    try {
      // Try RPC call first
      const { data, error } = await supabase
        .rpc("get_user_achievements", { 
          p_user_id: user.id,
          p_category: category || null
        } as never);

      if (error) throw error;

      const result = data as unknown as AchievementsResponse;
      if (result?.success && result.achievements) {
        set({ achievements: result.achievements });
        return;
      }
    } catch (rpcError) {
      console.warn("RPC get_user_achievements failed, falling back to direct query:", rpcError);
    }

    // Fallback: Query achievements directly if RPC fails
    try {
      // Get all achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from("achievements")
        .select("*")
        .eq("is_active", true)
        .order("category")
        .order("requirement_value");

      if (achievementsError) throw achievementsError;

      // Get user's unlocked achievements
      const { data: userAchievements, error: userAchievementsError } = await supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at, progress")
        .eq("user_id", user.id);

      if (userAchievementsError) throw userAchievementsError;

      // Map unlocked achievements
      type UserAchievementRow = { achievement_id: string; unlocked_at: string | null; progress: number };
      const unlockedMap = new Map(
        ((userAchievements || []) as UserAchievementRow[]).map(ua => [ua.achievement_id, ua])
      );

      // Combine data - cast to Achievement type from database
      // Show ALL achievements (no hidden filter - all achievements should be visible)
      const achievements = ((achievementsData || []) as Tables<"achievements">[])
        .filter(a => !category || a.category === category)
        .map(a => {
          const unlocked = unlockedMap.get(a.id);
          return {
            ...a,
            is_unlocked: !!unlocked,
            unlocked_at: unlocked?.unlocked_at || null,
            progress: unlocked?.progress || 0,
          } as AchievementWithProgress;
        });

      set({ achievements });
    } catch (fallbackError) {
      console.error("Error fetching achievements (fallback):", fallbackError);
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
      // Try claim_daily_reward_v2 first, fall back to claim_daily_reward
      let data, error;
      const result1 = await supabase.rpc("claim_daily_reward_v2", { p_user_id: user.id } as never);

      const err1 = result1.error as unknown as { code?: string; message?: string } | null;
      const shouldFallback =
        !!err1 &&
        (err1.message?.includes("does not exist") ||
          err1.code === "42703" || // undefined_column
          err1.message?.includes("streak_day") ||
          err1.message?.includes("bonus_spin") ||
          err1.message?.includes("daily_logins"));

      if (shouldFallback) {
        // Older schema path (works with daily_logins.day_of_streak / bonus_reward)
        const result2 = await supabase.rpc("claim_daily_reward", { p_user_id: user.id } as never);
        data = result2.data;
        error = result2.error;
      } else {
        data = result1.data;
        error = result1.error;
      }

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

        // Check for XP multiplier reward (day 4 in cycle)
        const cycleDay = result.cycle_day || 1;
        if (cycleDay === 4 || result.bonus_reward === "1.5x XP for 24 hours") {
          // Grant 1.5x XP multiplier for 24 hours
          setTimeout(async () => {
            await get().grantMultiplier(1.5, 24, "daily_reward", "Day 4 Login Reward: 1.5x XP for 24 hours");
          }, 500);
        }

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

              // Only update spins count - DON'T set lastSpinResult here
              // The SpinWheel component will set it after animation completes
              set({
                userProfile: {
                  ...profile,
                  available_spins: result.remaining_spins || 0,
                },
              });

              // Refresh profile to get updated XP/credits after animation completes
              // Don't add notification here - the SpinWheel component shows a proper modal
              setTimeout(() => {
                get().fetchUserProfile();
                get().fetchActiveMultiplier(); // In case XP multiplier was won
              }, 5500); // Wait for spin animation to complete (5s) + buffer

              // DON'T set isSpinning: false here - let SpinWheel component control it
              // The component sets it false in GSAP animation's onComplete callback
              return prize;
            }
          } else {
            console.error("Spin wheel RPC error:", error);
          }
        } catch (error) {
          console.warn("Spin wheel error, using local fallback:", error);
        }
      }
    }

    // Local fallback when database isn't available (XP-only prizes - no real money cost)
    // Note: XP multipliers removed from local fallback as they require DB to persist
    const localPrizes: SpinPrize[] = [
      { id: "1", name: "+10 XP", description: "Nice! You earned 10 bonus XP!", prize_type: "xp", prize_value: "10", probability: 20, color: "#6b7280", is_active: true },
      { id: "2", name: "+25 XP", description: "Great spin! 25 XP added!", prize_type: "xp", prize_value: "25", probability: 20, color: "#22c55e", is_active: true },
      { id: "3", name: "+50 XP", description: "Awesome! 50 XP for you!", prize_type: "xp", prize_value: "50", probability: 18, color: "#3b82f6", is_active: true },
      { id: "4", name: "+75 XP", description: "Lucky! 75 XP bonus!", prize_type: "xp", prize_value: "75", probability: 12, color: "#8b5cf6", is_active: true },
      { id: "5", name: "+100 XP", description: "Amazing! 100 XP jackpot!", prize_type: "xp", prize_value: "100", probability: 12, color: "#a855f7", is_active: true },
      { id: "6", name: "+150 XP", description: "Incredible! 150 XP mega bonus!", prize_type: "xp", prize_value: "150", probability: 8, color: "#ec4899", is_active: true },
      { id: "7", name: "Free Spin!", description: "Lucky you! Another free spin!", prize_type: "spin", prize_value: "1", probability: 5, color: "#ef4444", is_active: true },
      { id: "8", name: "+250 XP", description: "EPIC! 250 XP legendary spin!", prize_type: "xp", prize_value: "250", probability: 3, color: "#f59e0b", is_active: true },
      { id: "9", name: "+500 XP", description: "JACKPOT! 500 XP ultra rare!", prize_type: "xp", prize_value: "500", probability: 2, color: "#fbbf24", is_active: true },
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

    // WARNING: Local fallback - data will NOT persist to database!
    console.error("Using local spin fallback - prize will NOT be saved to database!");
    
    // Apply prize locally (temporary - won't persist on refresh)
    const prizeValue = parseInt(selectedPrize.prize_value) || 0;
    const newSpins = profile.available_spins - 1 + (selectedPrize.prize_type === "spin" ? prizeValue : 0);
    const newXP = profile.total_xp + (selectedPrize.prize_type === "xp" ? prizeValue : 0);

    // DON'T set lastSpinResult here - SpinWheel component will set it after animation
    set({
      userProfile: {
        ...profile,
        available_spins: newSpins,
        total_xp: newXP,
      },
    });

    // Don't add notification here - the SpinWheel component shows a proper modal after animation
    // DON'T set isSpinning: false here - let SpinWheel component control it via onComplete
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
        // Refresh profile and active multiplier (in case XP booster was purchased)
        await get().fetchUserProfile();
        await get().fetchActiveMultiplier();
        
        // Refresh badges if this was a cosmetic/badge purchase
        const isCosmetic = reward?.category === "cosmetic" || reward?.category === "exclusive";
        if (isCosmetic || rewardId.includes("badge") || rewardId.includes("frame")) {
          await get().fetchUserBadges();
        }

        // Add notification with specific message for XP boosters and badges
        const isXPBooster = reward?.category === "xp_booster";
        const isBadge = reward?.category === "cosmetic" || rewardId.includes("badge") || rewardId.includes("frame");
        get().addNotification({
          type: "reward",
          title: isBadge ? "🏅 Badge Unlocked!" : isXPBooster ? "XP Boost Activated! 🚀" : "Reward Purchased!",
          message: isBadge 
            ? `You are now a VIP member! Check your profile to see your new ${result.reward?.name || rewardName}.`
            : isXPBooster 
            ? `Your ${result.reward?.name || rewardName} is now active! All XP earned will be doubled for 24 hours.`
            : `You got: ${result.reward?.name || rewardName}`,
          icon: isBadge ? "👑" : isXPBooster ? "⚡" : "🎁",
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
        // Refresh profile and multiplier
        await get().fetchUserProfile();
        await get().fetchActiveMultiplier();

        // Build notification message based on whether multiplier was applied
        const baseXP = result.base_xp || amount;
        const bonusXP = result.bonus_xp || 0;
        const totalXP = result.total_xp_earned || amount;
        const multiplierApplied = result.multiplier_applied && result.multiplier_applied > 1;

        // Add notification (skip for quests - they have their own notification)
        if (action !== "quest") {
          if (multiplierApplied && bonusXP > 0) {
            get().addNotification({
              type: "xp_gain",
              title: `+${totalXP} XP`,
              message: `${description || `Earned from ${action}`} (${baseXP} + ${bonusXP} bonus from ${result.multiplier_applied}x)`,
              xpAmount: totalXP,
            });
          } else {
            get().addNotification({
              type: "xp_gain",
              title: `+${amount} XP`,
              message: description || `Earned from ${action}`,
              xpAmount: amount,
            });
          }
        }

        // Check for level up
        if (result.leveled_up && result.new_level) {
          const tier = getLevelTier(result.new_level);
          get().setLevelUpModal(true, {
            newLevel: result.new_level,
            newTitle: tier.title,
            perks: tier.perks,
          });
          
          // If a reward was granted, show notification
          if (result.levelup_reward?.reward_granted) {
            setTimeout(() => {
              const xpBonus = result.levelup_reward?.xp_bonus || 0;
              const freeSpin = result.levelup_reward?.free_spin;
              
              let message = `+${xpBonus} bonus XP!`;
              if (freeSpin) {
                message += " Plus a free spin!";
              }
              
              get().addNotification({
                type: "reward",
                title: "🎁 Level Up Reward!",
                message,
                icon: "⚡",
                xpAmount: xpBonus,
              });
            }, 2000);
          }
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
          phone: null,
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

    // Add notification (skip for quests - they have their own notification)
    if (action !== "quest") {
      get().addNotification({
        type: "xp_gain",
        title: `+${amount} XP`,
        message: description || `Earned from ${action}`,
        xpAmount: amount,
      });
    }

    return true;
  },

  // Track which action types have been rewarded by quests today
  trackQuestRewardedAction: (actionType: string) => {
    const { questRewardedActions } = get();
    const newSet = new Set(questRewardedActions);
    newSet.add(actionType);
    set({ questRewardedActions: newSet });
  },

  // Clear quest rewarded actions (called at midnight or on new day)
  clearQuestRewardedActions: () => {
    set({ questRewardedActions: new Set<string>() });
  },

  // Check achievements (with optional XP skip for certain action types)
  // Uses debounce and lock to prevent duplicate calls
  checkAchievements: async (skipXPTypes?: string[]) => {
    if (!isSupabaseConfigured()) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // If already checking, queue this request and return a promise
    if (isCheckingAchievements) {
      return new Promise<string[]>((resolve) => {
        pendingAchievementCheck.push({ resolve, skipTypes: skipXPTypes });
      });
    }

    // Clear any pending debounce timer
    if (achievementCheckDebounceTimer) {
      clearTimeout(achievementCheckDebounceTimer);
      achievementCheckDebounceTimer = null;
    }

    // Set lock
    isCheckingAchievements = true;

    try {
      // Use quest-rewarded actions from state if no explicit skip types provided
      const { questRewardedActions } = get();
      const typesToSkip = skipXPTypes || Array.from(questRewardedActions);

      // Try v2 function first (with XP deduplication)
      let data, error;
      if (typesToSkip.length > 0) {
        const result = await supabase
          .rpc("check_achievements_v2", { 
            p_user_id: user.id,
            p_skip_xp_types: typesToSkip
          } as never);
        data = result.data;
        error = result.error;
      }

      // Fallback to original function if v2 not available
      if (error || !data) {
        const result = await supabase
          .rpc("check_achievements", { p_user_id: user.id } as never);
        data = result.data;
        error = result.error;
      }

      // If still failing, try v3 function
      if (error || !data) {
        const result = await supabase
          .rpc("check_achievements_v3", { p_user_id: user.id } as never);
        data = result.data;
        error = result.error;
      }

      // Silently fail if no achievement functions are available
      if (error || !data) {
        console.warn("Achievement check skipped - functions not available");
        pendingAchievementCheck.forEach(p => p.resolve([]));
        pendingAchievementCheck = [];
        return [];
      }

      const result = data as unknown as CheckAchievementsResponse;
      if (result?.success && result.unlocked && result.unlocked.length > 0) {
        // Refresh achievements
        await get().fetchAchievements();

        // Show achievement modal for first unlocked
        const { achievements } = get();
        const firstUnlocked = achievements.find(a => a.id === result.unlocked![0]);
        if (firstUnlocked) {
          get().setAchievementModal(true, firstUnlocked);
          
          // Show notification for achievements that received XP
          const unlockedWithXP = (result as { unlocked_with_xp?: string[] }).unlocked_with_xp || [];
          if (unlockedWithXP.includes(firstUnlocked.id)) {
            get().addNotification({
              type: "achievement",
              title: "Achievement Unlocked!",
              message: `${firstUnlocked.name} (+${firstUnlocked.xp_reward} XP)`,
              icon: "🏆",
            });
          } else {
            get().addNotification({
              type: "achievement",
              title: "Achievement Unlocked!",
              message: firstUnlocked.name,
              icon: "🏆",
            });
          }
        }

        // Resolve any pending requests with the same result
        const unlocked = result.unlocked;
        pendingAchievementCheck.forEach(p => p.resolve(unlocked));
        pendingAchievementCheck = [];
        
        return unlocked;
      }

      // Resolve any pending requests with empty result
      pendingAchievementCheck.forEach(p => p.resolve([]));
      pendingAchievementCheck = [];

      return [];
    } catch (error) {
      console.error("Error checking achievements:", error);
      // Resolve any pending requests with empty result on error
      pendingAchievementCheck.forEach(p => p.resolve([]));
      pendingAchievementCheck = [];
      return [];
    } finally {
      // Release the lock
      isCheckingAchievements = false;
    }
  },

  // Daily quests
  initDailyQuests: () => {
    const today = new Date().toISOString().split("T")[0];
    const { questsDate, dailyQuests } = get();

    if (questsDate === today && dailyQuests.length > 0) {
      return;
    }

    // Clear quest rewarded actions for new day
    if (questsDate !== today) {
      get().clearQuestRewardedActions();
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

    // Map quest IDs to achievement requirement types
    const questToAchievementType: Record<string, string> = {
      add_wishlist: "wishlist",
      browse_products: "categories",
      share_product: "share",
      write_review: "reviews",
    };

    // Update local state immediately for responsiveness
    const updatedQuests = quests.map((q) => {
      if (q.id === questId) {
        const newProgress = Math.min(q.progress + progressToAdd, q.requirement.count);
        const completed = newProgress >= q.requirement.count;
            
        if (completed && !q.completed) {
          // Quest completed - track the action type to avoid double XP for achievements
          const achievementType = questToAchievementType[questId];
          if (achievementType) {
            get().trackQuestRewardedAction(achievementType);
          }
          
          // Show quest completion notification immediately
          get().addNotification({
            type: "reward",
            title: "🎯 Quest Complete!",
            message: `${q.title} - +${q.xpReward} XP`,
            icon: "✅",
            xpAmount: q.xpReward,
          });
          
          // Quest completed - add XP (will use local fallback if DB not available)
          setTimeout(async () => {
            await get().addXP(q.xpReward, "quest", `Quest: ${q.title}`);
            
            // Check achievements after quest completion (with XP dedup)
            await get().checkAchievements();
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

      // XP Multiplier actions
      fetchActiveMultiplier: async () => {
        if (!isSupabaseConfigured()) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
          const { data, error } = await supabase
            .rpc("get_active_xp_multiplier", { p_user_id: user.id } as never);

          if (error) {
            console.warn("Could not fetch active multiplier:", error);
            return;
          }

          // RPC returns an array, get first result
          const result = (data as XPMultiplier[] | null)?.[0] || null;
          
          if (result && result.time_remaining_seconds > 0) {
            set({ activeMultiplier: result });
          } else {
            set({ activeMultiplier: null });
          }
        } catch (error) {
          console.warn("Error fetching active multiplier:", error);
        }
      },

      grantMultiplier: async (multiplier, durationHours, source, description) => {
        if (!isSupabaseConfigured()) return false;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        try {
          const { data, error } = await supabase
            .rpc("grant_xp_multiplier", {
              p_user_id: user.id,
              p_multiplier: multiplier,
              p_duration_hours: durationHours,
              p_source: source,
              p_description: description || null,
            } as never);

          if (error) {
            console.warn("Could not grant multiplier:", error);
            return false;
          }

          const result = data as unknown as GrantMultiplierResponse;
          if (result?.success) {
            // Refresh active multiplier
            await get().fetchActiveMultiplier();
            
            // Show notification (skip for spin_wheel - the modal handles prize reveal)
            if (source !== "spin_wheel") {
              get().addNotification({
                type: "reward",
                title: `⚡ ${multiplier}x XP Boost Activated!`,
                message: `All XP earned for the next ${durationHours} hours will be multiplied by ${multiplier}x!`,
                icon: "⚡",
              });
            }
            
            return true;
          }

          return false;
        } catch (error) {
          console.warn("Error granting multiplier:", error);
          return false;
        }
      },

      clearActiveMultiplier: () => {
        set({ activeMultiplier: null });
      },

      // Increment share count for achievements
      incrementShareCount: async () => {
        if (!isSupabaseConfigured()) return;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        try {
          const { data, error } = await supabase
            .rpc("increment_share_count", { p_user_id: user.id } as never);
          
          if (error) {
            console.warn("increment_share_count RPC not available:", error);
            return;
          }
          
          // Refresh profile and check if any achievements were unlocked
          await get().fetchUserProfile();
          await get().fetchAchievements();
          
          // Check if achievements were unlocked
          const result = data as { unlocked?: string[] };
          if (result?.unlocked && result.unlocked.length > 0) {
            const unlockedAchievements = get().achievements.filter(
              a => result.unlocked?.includes(a.id)
            );
            unlockedAchievements.forEach(achievement => {
              get().addNotification({
                type: "achievement",
                title: "🏆 Achievement Unlocked!",
                message: achievement.name,
                xpAmount: achievement.xp_reward,
              });
            });
          }
        } catch (error) {
          console.warn("Error incrementing share count:", error);
        }
      },

      // Badge actions
      fetchUserBadges: async () => {
        if (!isSupabaseConfigured()) return;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        try {
          // Try to fetch from user_badges table using RPC (more reliable with RLS)
          const { data: rpcData, error: rpcError } = await supabase
            .rpc("get_user_badges" as never, { p_user_id: user.id } as never);
          
          const rpcResult = rpcData as unknown as Array<{ badge_id: string; equipped: boolean; acquired_at: string }> | null;
          if (!rpcError && rpcResult && Array.isArray(rpcResult) && rpcResult.length > 0) {
            set({ userBadges: rpcResult });
            return;
          }
          
          // Fall back to direct table query
          const { data, error } = await supabase
            .from("user_badges")
            .select("badge_id, equipped, acquired_at")
            .eq("user_id", user.id);
          
          const tableResult = data as unknown as Array<{ badge_id: string; equipped: boolean; acquired_at: string }> | null;
          if (!error && tableResult && tableResult.length > 0) {
            set({ userBadges: tableResult });
            return;
          }
          
          // Final fallback: check user_rewards for cosmetic rewards
          const { data: rewardsData } = await supabase
            .from("user_rewards")
            .select("reward_id, created_at")
            .eq("user_id", user.id);
          
          if (rewardsData) {
            const typedRewardsData = rewardsData as Array<{ reward_id: string; created_at: string }>;
            const badges = typedRewardsData
              .filter(r => r.reward_id.startsWith("badge_") || r.reward_id.startsWith("frame_"))
              .map(r => ({
                badge_id: r.reward_id,
                equipped: false,
                acquired_at: r.created_at,
              }));
            if (badges.length > 0) {
              set({ userBadges: badges });
            }
          }
        } catch (err) {
          console.warn("Error fetching badges:", err);
        }
      },

      hasBadge: (badgeId: string) => {
        return get().userBadges.some(b => b.badge_id === badgeId);
      },

      hasAnyBadge: () => {
        return get().userBadges.length > 0;
      },

      getHighestBadge: () => {
        const badges = get().userBadges;
        if (badges.length === 0) return null;
        
        // Badge priority: frame_gold > badge_crown > badge_fire
        const priority = ["frame_gold", "badge_crown", "badge_fire"];
        for (const badge of priority) {
          if (badges.some(b => b.badge_id === badge)) {
            return badge;
          }
        }
        return badges[0]?.badge_id || null;
      },

      equipBadge: async (badgeId: string) => {
        if (!isSupabaseConfigured()) return;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        try {
          // Use RPC to equip badge (table might not exist yet)
          const { error } = await supabase.rpc("equip_badge" as never, {
            p_user_id: user.id,
            p_badge_id: badgeId,
          } as never);
          
          if (error) {
            console.warn("equip_badge RPC not available:", error);
          }
          
          // Refresh badges
          await get().fetchUserBadges();
        } catch {
          console.warn("Error equipping badge");
        }
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

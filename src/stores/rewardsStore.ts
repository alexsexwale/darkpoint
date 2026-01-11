"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// Types for user rewards/coupons (matches database CouponSource enum)
export interface UserReward {
  id: string;
  user_id: string;
  code: string | null;
  discount_type: "percent" | "fixed" | "shipping";
  discount_value: number;
  min_order_value: number;
  source: "spin" | "spin_wheel" | "reward" | "referral" | "achievement" | "promotion" | "manual" | "welcome" | "levelup" | "vip_weekly";
  used: boolean;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
  // Display properties
  name?: string;
  description?: string;
}

// VIP Weekly Prize type
export interface VIPWeeklyPrize {
  id: number;
  name: string;
  description: string;
  discount_type: "percent" | "fixed" | "shipping" | "special";
  discount_value: number;
  min_order_value: number;
  icon: string;
  color: string;
  specialEffect?: string;
}

// 10+ Rotating VIP Weekly Prizes - designed to encourage purchases
export const VIP_WEEKLY_PRIZES: VIPWeeklyPrize[] = [
  {
    id: 1,
    name: "Flash 15% Off",
    description: "15% discount on your entire order - VIP exclusive!",
    discount_type: "percent",
    discount_value: 15,
    min_order_value: 0,
    icon: "⚡",
    color: "from-yellow-500 to-amber-600",
  },
  {
    id: 2,
    name: "R75 VIP Credit",
    description: "R75 off any order over R500 - this week only!",
    discount_type: "fixed",
    discount_value: 75,
    min_order_value: 500,
    icon: "💎",
    color: "from-cyan-500 to-blue-600",
  },
  {
    id: 3,
    name: "Free Shipping",
    description: "Free delivery on any order - no minimum!",
    discount_type: "shipping",
    discount_value: 100,
    min_order_value: 0,
    icon: "🚀",
    color: "from-purple-500 to-pink-600",
  },
  {
    id: 4,
    name: "20% Gaming Gear",
    description: "20% off all gaming accessories this week!",
    discount_type: "percent",
    discount_value: 20,
    min_order_value: 150,
    icon: "🎮",
    color: "from-green-500 to-emerald-600",
  },
  {
    id: 5,
    name: "R100 Power Deal",
    description: "R100 off orders over R700 - massive savings!",
    discount_type: "fixed",
    discount_value: 100,
    min_order_value: 700,
    icon: "🔥",
    color: "from-orange-500 to-red-600",
  },
  {
    id: 6,
    name: "VIP 18% Discount",
    description: "Exclusive 18% off everything - VIP members only!",
    discount_type: "percent",
    discount_value: 18,
    min_order_value: 100,
    icon: "👑",
    color: "from-amber-400 to-yellow-500",
  },
  {
    id: 7,
    name: "R50 Instant Savings",
    description: "R50 off any order over R300 - quick & easy!",
    discount_type: "fixed",
    discount_value: 50,
    min_order_value: 300,
    icon: "💰",
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: 8,
    name: "Premium Free Ship",
    description: "Free shipping + priority handling on all orders!",
    discount_type: "shipping",
    discount_value: 150,
    min_order_value: 100,
    icon: "✈️",
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: 9,
    name: "R125 Mega Deal",
    description: "R125 off orders over R800 - our biggest weekly prize!",
    discount_type: "fixed",
    discount_value: 125,
    min_order_value: 800,
    icon: "🏆",
    color: "from-rose-500 to-pink-600",
  },
  {
    id: 10,
    name: "Lucky 12% Off",
    description: "12% discount with no minimum - use it on anything!",
    discount_type: "percent",
    discount_value: 12,
    min_order_value: 0,
    icon: "🍀",
    color: "from-lime-500 to-green-600",
  },
  {
    id: 11,
    name: "VIP 25% Special",
    description: "Rare 25% off orders over R400 - don't miss out!",
    discount_type: "percent",
    discount_value: 25,
    min_order_value: 400,
    icon: "✨",
    color: "from-violet-500 to-purple-600",
  },
  {
    id: 12,
    name: "R60 Quick Save",
    description: "R60 off any order over R250 - easy savings!",
    discount_type: "fixed",
    discount_value: 60,
    min_order_value: 250,
    icon: "⭐",
    color: "from-sky-500 to-cyan-600",
  },
];

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000; // milliseconds in a week
  return Math.floor(diff / oneWeek);
}

// Get end of current week (Sunday midnight)
function getWeekEnd(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilSunday = 7 - dayOfWeek;
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + daysUntilSunday);
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
}

// Get this week's VIP prize (rotates through the 12 prizes)
export function getCurrentVIPPrize(): VIPWeeklyPrize {
  const weekNumber = getWeekNumber();
  const prizeIndex = weekNumber % VIP_WEEKLY_PRIZES.length;
  return VIP_WEEKLY_PRIZES[prizeIndex];
}

// VIP Prize activation state
export interface VIPPrizeState {
  activatedPrize: VIPWeeklyPrize | null;
  activatedAt: string | null;
  expiresAt: string | null;
  weekNumber: number | null;
}

interface RewardsState {
  // Available (unused) rewards
  rewards: UserReward[];
  isLoading: boolean;
  isInitialized: boolean;
  
  // Applied reward for current cart
  appliedReward: UserReward | null;
  
  // VIP Weekly Prize
  vipPrize: VIPPrizeState;
  appliedVIPPrize: VIPWeeklyPrize | null;
}

interface RewardsActions {
  fetchRewards: () => Promise<void>;
  applyReward: (reward: UserReward) => void;
  removeAppliedReward: () => void;
  markRewardAsUsed: (rewardId: string, orderId?: string) => Promise<boolean>;
  clearLocalState: () => void;
  
  // VIP Prize actions
  activateVIPPrize: () => { success: boolean; prize: VIPWeeklyPrize | null; alreadyActivated?: boolean };
  applyVIPPrize: () => boolean;
  removeVIPPrize: () => void;
  isVIPPrizeActive: () => boolean;
  isVIPPrizeExpired: () => boolean;
  getVIPPrizeTimeRemaining: () => string;
  markVIPPrizeUsed: () => void;
}

interface RewardsGetters {
  availableRewards: () => UserReward[];
  getDiscountAmount: (subtotal: number) => number;
  getShippingDiscount: (shippingCost: number) => number;
  canApplyReward: (reward: UserReward, subtotal: number, alreadyQualifiesForFreeShipping?: boolean) => { canApply: boolean; reason?: string };
  isShippingRewardRedundant: (subtotal: number) => boolean;
  canApplyVIPPrize: (subtotal: number, alreadyQualifiesForFreeShipping?: boolean) => { canApply: boolean; reason?: string };
}

type RewardsStore = RewardsState & RewardsActions & RewardsGetters;

// Helper to format reward display
export function getRewardDisplayInfo(reward: UserReward): { name: string; description: string; icon: string } {
  // Use custom description from database if available
  const customDesc = reward.description;
  
  switch (reward.discount_type) {
    case "percent":
      return {
        name: customDesc || `${reward.discount_value}% Discount`,
        description: reward.min_order_value > 0 
          ? `${reward.discount_value}% off orders over R${reward.min_order_value}`
          : `${reward.discount_value}% off your order`,
        icon: customDesc?.includes("Welcome") ? "🎁" : "🏷️",
      };
    case "fixed":
      return {
        name: customDesc || `R${reward.discount_value} Off`,
        description: reward.min_order_value > 0
          ? `R${reward.discount_value} off orders over R${reward.min_order_value}`
          : `R${reward.discount_value} off your order`,
        icon: "💰",
      };
    case "shipping":
      return {
        name: customDesc || "Free Shipping",
        description: reward.min_order_value > 0
          ? `Free shipping on orders over R${reward.min_order_value}`
          : "Free shipping on any order",
        icon: "🚚",
      };
    default:
      return {
        name: customDesc || "Reward",
        description: "Special reward",
        icon: "🎁",
      };
  }
}

// Helper to get source display
export function getSourceDisplay(source: UserReward["source"]): string {
  switch (source) {
    case "spin": return "Spin Wheel";
    case "spin_wheel": return "Spin Wheel";
    case "reward": return "Rewards Shop";
    case "referral": return "Referral Bonus";
    case "achievement": return "Achievement";
    case "promotion": return "Promotion";
    case "manual": return "Special Gift";
    case "welcome": return "Welcome Bonus";
    case "levelup": return "Level Up Reward";
    case "vip_weekly": return "VIP Weekly Prize";
    default: return "Reward";
  }
}

export const useRewardsStore = create<RewardsStore>()(
  persist(
    (set, get) => ({
      // State
      rewards: [],
      isLoading: false,
      isInitialized: false,
      appliedReward: null,
      
      // VIP Prize State
      vipPrize: {
        activatedPrize: null,
        activatedAt: null,
        expiresAt: null,
        weekNumber: null,
      },
      appliedVIPPrize: null,

      // Fetch user's available rewards
      fetchRewards: async () => {
        if (!isSupabaseConfigured()) {
          set({ isInitialized: true });
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          set({ rewards: [], isInitialized: true });
          return;
        }

        set({ isLoading: true });

        try {
          const { data, error } = await supabase
            .from("user_coupons")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_used", false)  // Column is named is_used, not used
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
            .order("created_at", { ascending: false });

          if (error) throw error;

          // Map is_used to used for interface compatibility
          const mappedRewards = (data || []).map((r: Record<string, unknown>) => ({
            ...r,
            used: (r.is_used as boolean) ?? false,
          })) as UserReward[];

          set({ 
            rewards: mappedRewards, 
            isLoading: false, 
            isInitialized: true 
          });
        } catch (error) {
          console.error("Error fetching rewards:", error);
          set({ isLoading: false, isInitialized: true });
        }
      },

      // Apply a reward to the current cart (clears VIP prize - they can't combine)
      applyReward: (reward) => {
        set({ appliedReward: reward, appliedVIPPrize: null });
      },

      // Remove applied reward
      removeAppliedReward: () => {
        set({ appliedReward: null });
      },

      // Mark reward as used (called after successful checkout)
      markRewardAsUsed: async (rewardId, orderId) => {
        if (!isSupabaseConfigured()) return false;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        try {
          const { error } = await supabase
            .from("user_coupons")
            .update({ 
              is_used: true,  // Column is named is_used, not used
              used_at: new Date().toISOString(),
              // Could add order_id reference if needed
            } as never)
            .eq("id", rewardId)
            .eq("user_id", user.id);

          if (error) throw error;

          // Remove from local state
          set((state) => ({
            rewards: state.rewards.filter((r) => r.id !== rewardId),
            appliedReward: state.appliedReward?.id === rewardId ? null : state.appliedReward,
          }));

          return true;
        } catch (error) {
          console.error("Error marking reward as used:", error);
          return false;
        }
      },

      // Clear local state (on logout)
      clearLocalState: () => {
        set({ 
          rewards: [], 
          isInitialized: false, 
          appliedReward: null,
          vipPrize: {
            activatedPrize: null,
            activatedAt: null,
            expiresAt: null,
            weekNumber: null,
          },
          appliedVIPPrize: null,
        });
      },

      // ========== VIP WEEKLY PRIZE ACTIONS ==========
      
      // Activate this week's VIP prize
      activateVIPPrize: () => {
        const currentWeek = getWeekNumber();
        const { vipPrize } = get();
        
        // Check if already activated this week and not expired
        if (vipPrize.weekNumber === currentWeek && vipPrize.activatedPrize) {
          const expiresAt = vipPrize.expiresAt ? new Date(vipPrize.expiresAt) : null;
          if (expiresAt && expiresAt > new Date()) {
            return { success: true, prize: vipPrize.activatedPrize, alreadyActivated: true };
          }
        }
        
        // Activate new prize
        const prize = getCurrentVIPPrize();
        const now = new Date();
        const expiresAt = getWeekEnd();
        
        set({
          vipPrize: {
            activatedPrize: prize,
            activatedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            weekNumber: currentWeek,
          },
          // Clear any previously applied VIP prize when activating new one
          appliedVIPPrize: null,
        });
        
        // Also clear regular applied reward (can't combine)
        if (get().appliedReward) {
          set({ appliedReward: null });
        }
        
        return { success: true, prize, alreadyActivated: false };
      },

      // Apply the VIP prize to cart
      applyVIPPrize: () => {
        const { vipPrize, appliedReward } = get();
        
        // Check if prize is active and not expired
        if (!vipPrize.activatedPrize || !vipPrize.expiresAt) {
          return false;
        }
        
        if (new Date(vipPrize.expiresAt) < new Date()) {
          return false;
        }
        
        // Remove any applied regular reward (can't combine)
        set({ 
          appliedVIPPrize: vipPrize.activatedPrize,
          appliedReward: null,
        });
        
        return true;
      },

      // Remove VIP prize from cart
      removeVIPPrize: () => {
        set({ appliedVIPPrize: null });
      },

      // Check if VIP prize is currently active (activated and not expired)
      isVIPPrizeActive: () => {
        const { vipPrize } = get();
        if (!vipPrize.activatedPrize || !vipPrize.expiresAt) {
          return false;
        }
        return new Date(vipPrize.expiresAt) > new Date();
      },

      // Check if VIP prize has expired
      isVIPPrizeExpired: () => {
        const { vipPrize } = get();
        if (!vipPrize.expiresAt) return false;
        return new Date(vipPrize.expiresAt) < new Date();
      },

      // Get time remaining for VIP prize
      getVIPPrizeTimeRemaining: () => {
        const { vipPrize } = get();
        if (!vipPrize.expiresAt) return "";
        
        const now = new Date();
        const expires = new Date(vipPrize.expiresAt);
        const diff = expires.getTime() - now.getTime();
        
        if (diff <= 0) return "Expired";
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) return `${days}d ${hours}h remaining`;
        if (hours > 0) return `${hours}h ${minutes}m remaining`;
        return `${minutes}m remaining`;
      },

      // Mark VIP prize as used (after checkout)
      markVIPPrizeUsed: () => {
        set({ 
          appliedVIPPrize: null,
          vipPrize: {
            activatedPrize: null,
            activatedAt: null,
            expiresAt: null,
            weekNumber: null,
          },
        });
      },

      // Get available (unused, not expired) rewards
      availableRewards: () => {
        const now = new Date();
        return get().rewards.filter((r) => {
          if (r.used) return false;
          if (r.expires_at && new Date(r.expires_at) < now) return false;
          return true;
        });
      },

      // Calculate discount amount based on applied reward OR VIP prize
      // Rounds to nearest cent (2 decimal places) for accurate currency calculations
      getDiscountAmount: (subtotal) => {
        const { appliedReward, appliedVIPPrize } = get();
        
        // Helper to round to cents (2 decimal places)
        const roundToCents = (value: number) => Math.round(value * 100) / 100;
        
        // VIP Prize takes precedence
        if (appliedVIPPrize) {
          if (subtotal < appliedVIPPrize.min_order_value) return 0;
          
          switch (appliedVIPPrize.discount_type) {
            case "percent":
              return roundToCents((subtotal * appliedVIPPrize.discount_value) / 100);
            case "fixed":
              return Math.min(appliedVIPPrize.discount_value, subtotal);
            case "shipping":
              return 0;
            default:
              return 0;
          }
        }
        
        if (!appliedReward) return 0;

        // Check minimum order value
        if (subtotal < appliedReward.min_order_value) return 0;

        switch (appliedReward.discount_type) {
          case "percent":
            return roundToCents((subtotal * appliedReward.discount_value) / 100);
          case "fixed":
            return Math.min(appliedReward.discount_value, subtotal);
          case "shipping":
            return 0; // Shipping discount handled separately
          default:
            return 0;
        }
      },

      // Get shipping discount
      getShippingDiscount: (shippingCost) => {
        const { appliedReward, appliedVIPPrize } = get();
        
        // VIP Prize shipping discount
        if (appliedVIPPrize && appliedVIPPrize.discount_type === "shipping") {
          return shippingCost;
        }
        
        if (!appliedReward || appliedReward.discount_type !== "shipping") return 0;
        return shippingCost; // Full shipping discount
      },

      // Check if a reward can be applied
      canApplyReward: (reward, subtotal, alreadyQualifiesForFreeShipping = false) => {
        const now = new Date();

        // Check if already used
        if (reward.used) {
          return { canApply: false, reason: "This reward has already been used" };
        }

        // Check expiry
        if (reward.expires_at && new Date(reward.expires_at) < now) {
          return { canApply: false, reason: "This reward has expired" };
        }

        // Check minimum order value
        if (subtotal < reward.min_order_value) {
          return { 
            canApply: false, 
            reason: `Minimum order of R${reward.min_order_value} required` 
          };
        }

        // Check if free shipping reward is redundant (cart already qualifies)
        if (reward.discount_type === "shipping" && alreadyQualifiesForFreeShipping) {
          return {
            canApply: false,
            reason: "Your order already qualifies for free delivery!"
          };
        }

        return { canApply: true };
      },

      // Check if a shipping reward would be redundant
      // Note: This uses a simple check - the actual threshold may vary by VIP tier
      isShippingRewardRedundant: (subtotal) => {
        // Use the highest threshold (non-VIP) as baseline
        // This is conservative - VIP users might still find value at lower thresholds
        const FREE_SHIPPING_THRESHOLD = 1050; // From env or constants
        return subtotal >= FREE_SHIPPING_THRESHOLD;
      },

      // Check if VIP prize can be applied
      canApplyVIPPrize: (subtotal, alreadyQualifiesForFreeShipping = false) => {
        const { vipPrize, appliedReward } = get();
        
        // Check if prize is activated
        if (!vipPrize.activatedPrize) {
          return { canApply: false, reason: "No VIP prize activated" };
        }
        
        // Check if expired
        if (!vipPrize.expiresAt || new Date(vipPrize.expiresAt) < new Date()) {
          return { canApply: false, reason: "VIP prize has expired" };
        }
        
        // Check minimum order value
        if (subtotal < vipPrize.activatedPrize.min_order_value) {
          return { 
            canApply: false, 
            reason: `Minimum order of R${vipPrize.activatedPrize.min_order_value} required` 
          };
        }
        
        // Check if free shipping prize is redundant
        if (vipPrize.activatedPrize.discount_type === "shipping" && alreadyQualifiesForFreeShipping) {
          return {
            canApply: false,
            reason: "Your order already qualifies for free delivery!"
          };
        }
        
        return { canApply: true };
      },
    }),
    {
      name: "darkpoint-rewards",
      partialize: (state) => ({ 
        appliedReward: state.appliedReward,
        vipPrize: state.vipPrize,
        appliedVIPPrize: state.appliedVIPPrize,
      }),
    }
  )
);


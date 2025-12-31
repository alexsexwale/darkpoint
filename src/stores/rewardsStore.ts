"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// Types for user rewards/coupons (matches database CouponSource enum)
export interface UserReward {
  id: string;
  user_id: string;
  code: string;
  discount_type: "percent" | "fixed" | "shipping";
  discount_value: number;
  min_order_value: number;
  source: "spin" | "reward" | "referral" | "achievement" | "promotion" | "manual";
  used: boolean;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
  // Display properties
  name?: string;
  description?: string;
}

interface RewardsState {
  // Available (unused) rewards
  rewards: UserReward[];
  isLoading: boolean;
  isInitialized: boolean;
  
  // Applied reward for current cart
  appliedReward: UserReward | null;
}

interface RewardsActions {
  fetchRewards: () => Promise<void>;
  applyReward: (reward: UserReward) => void;
  removeAppliedReward: () => void;
  markRewardAsUsed: (rewardId: string, orderId?: string) => Promise<boolean>;
  clearLocalState: () => void;
}

interface RewardsGetters {
  availableRewards: () => UserReward[];
  getDiscountAmount: (subtotal: number) => number;
  getShippingDiscount: (shippingCost: number) => number;
  canApplyReward: (reward: UserReward, subtotal: number, alreadyQualifiesForFreeShipping?: boolean) => { canApply: boolean; reason?: string };
  isShippingRewardRedundant: (subtotal: number) => boolean;
}

type RewardsStore = RewardsState & RewardsActions & RewardsGetters;

// Helper to format reward display
export function getRewardDisplayInfo(reward: UserReward): { name: string; description: string; icon: string } {
  switch (reward.discount_type) {
    case "percent":
      return {
        name: `${reward.discount_value}% Discount`,
        description: reward.min_order_value > 0 
          ? `${reward.discount_value}% off orders over R${reward.min_order_value}`
          : `${reward.discount_value}% off your order`,
        icon: "🏷️",
      };
    case "fixed":
      return {
        name: `R${reward.discount_value} Off`,
        description: reward.min_order_value > 0
          ? `R${reward.discount_value} off orders over R${reward.min_order_value}`
          : `R${reward.discount_value} off your order`,
        icon: "💰",
      };
    case "shipping":
      return {
        name: "Free Shipping",
        description: reward.min_order_value > 0
          ? `Free shipping on orders over R${reward.min_order_value}`
          : "Free shipping on any order",
        icon: "🚚",
      };
    default:
      return {
        name: "Reward",
        description: "Special reward",
        icon: "🎁",
      };
  }
}

// Helper to get source display
export function getSourceDisplay(source: UserReward["source"]): string {
  switch (source) {
    case "spin": return "Spin Wheel";
    case "reward": return "Rewards Shop";
    case "referral": return "Referral Bonus";
    case "achievement": return "Achievement";
    case "promotion": return "Promotion";
    case "manual": return "Special Gift";
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
            .eq("used", false)
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
            .order("created_at", { ascending: false });

          if (error) throw error;

          set({ 
            rewards: (data || []) as UserReward[], 
            isLoading: false, 
            isInitialized: true 
          });
        } catch (error) {
          console.error("Error fetching rewards:", error);
          set({ isLoading: false, isInitialized: true });
        }
      },

      // Apply a reward to the current cart
      applyReward: (reward) => {
        set({ appliedReward: reward });
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
              used: true, 
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
        set({ rewards: [], isInitialized: false, appliedReward: null });
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

      // Calculate discount amount based on applied reward
      getDiscountAmount: (subtotal) => {
        const { appliedReward } = get();
        if (!appliedReward) return 0;

        // Check minimum order value
        if (subtotal < appliedReward.min_order_value) return 0;

        switch (appliedReward.discount_type) {
          case "percent":
            return Math.round((subtotal * appliedReward.discount_value) / 100);
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
        const { appliedReward } = get();
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
      isShippingRewardRedundant: (subtotal) => {
        // Import threshold from constants (500)
        const FREE_SHIPPING_THRESHOLD = 500;
        return subtotal >= FREE_SHIPPING_THRESHOLD;
      },
    }),
    {
      name: "darkpoint-rewards",
      partialize: (state) => ({ appliedReward: state.appliedReward }),
    }
  )
);


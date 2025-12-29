"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGamificationStore } from "@/stores";
import { useGamification } from "@/hooks";
import { RewardShopCard } from "./RewardShopCard";
import type { Reward } from "@/types/gamification";

interface RewardShopGridProps {
  className?: string;
}

type RewardCategory = "all" | "discount" | "shipping" | "xp_booster" | "cosmetic" | "exclusive" | "spin";

const CATEGORIES: { id: RewardCategory; name: string; icon: string }[] = [
  { id: "all", name: "All", icon: "🎁" },
  { id: "discount", name: "Discounts", icon: "🏷️" },
  { id: "shipping", name: "Shipping", icon: "🚚" },
  { id: "xp_booster", name: "XP Boosters", icon: "⚡" },
  { id: "cosmetic", name: "Cosmetics", icon: "✨" },
  { id: "exclusive", name: "Exclusive", icon: "👑" },
  { id: "spin", name: "Spins", icon: "🎡" },
];

// Sample rewards (would come from Supabase in production)
const SAMPLE_REWARDS: Reward[] = [
  {
    id: "discount_5",
    name: "5% Discount",
    description: "5% off your next order",
    category: "discount",
    xp_cost: 100,
    value: "5",
    image_url: null,
    stock: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "discount_10",
    name: "10% Discount",
    description: "10% off your next order",
    category: "discount",
    xp_cost: 250,
    value: "10",
    image_url: null,
    stock: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "discount_15",
    name: "15% Discount",
    description: "15% off your next order",
    category: "discount",
    xp_cost: 500,
    value: "15",
    image_url: null,
    stock: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "free_shipping",
    name: "Free Shipping",
    description: "Free shipping on any order",
    category: "shipping",
    xp_cost: 150,
    value: "free",
    image_url: null,
    stock: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "xp_boost_2x",
    name: "2x XP Boost",
    description: "Double XP for 24 hours",
    category: "xp_booster",
    xp_cost: 300,
    value: "2x_24h",
    image_url: null,
    stock: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "extra_spin",
    name: "Bonus Spin",
    description: "One extra wheel spin",
    category: "spin",
    xp_cost: 200,
    value: "1",
    image_url: null,
    stock: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "badge_fire",
    name: "Fire Badge",
    description: "Exclusive profile badge",
    category: "cosmetic",
    xp_cost: 500,
    value: "badge_fire",
    image_url: null,
    stock: 100,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "badge_crown",
    name: "Crown Badge",
    description: "Royal profile badge",
    category: "cosmetic",
    xp_cost: 1000,
    value: "badge_crown",
    image_url: null,
    stock: 50,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "frame_gold",
    name: "Gold Frame",
    description: "Gold avatar frame",
    category: "cosmetic",
    xp_cost: 1500,
    value: "frame_gold",
    image_url: null,
    stock: 25,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export function RewardShopGrid({ className }: RewardShopGridProps) {
  const { userProfile, rewards: storeRewards, addNotification } = useGamificationStore();
  const { purchaseReward } = useGamification();
  const [selectedCategory, setSelectedCategory] = useState<RewardCategory>("all");
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use store rewards or sample data
  const rewards = storeRewards.length > 0 ? storeRewards : SAMPLE_REWARDS;
  const userXP = userProfile?.total_xp || 0;

  // Filter rewards
  const filteredRewards = rewards.filter(
    (reward) => selectedCategory === "all" || reward.category === selectedCategory
  );

  const handleRedeem = async (reward: Reward) => {
    if (redeeming) return;
    setErrorMessage(null);

    // Check if user has enough XP
    if (userXP < reward.xp_cost) {
      setErrorMessage(`Not enough XP! You need ${reward.xp_cost - userXP} more XP.`);
      addNotification({
        type: "info",
        title: "Not Enough XP",
        message: `You need ${reward.xp_cost} XP but only have ${userXP} XP`,
        icon: "⚡",
      });
      return;
    }

    setRedeeming(reward.id);
    const result = await purchaseReward(reward.id);
    setRedeeming(null);

    if (!result.success) {
      const message = result.error || "Failed to redeem reward";
      setErrorMessage(message);
      addNotification({
        type: "info",
        title: "Redemption Failed",
        message: message,
        icon: "❌",
      });
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* XP balance */}
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-xl">Your XP Balance</h3>
            <p className="text-sm text-white/60">Spend your XP on exclusive rewards</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <span className="text-4xl font-heading text-[var(--color-main-1)]">
                {userXP.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-white/40">Available XP</p>
          </div>
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm text-red-400">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 border transition-all cursor-pointer",
              selectedCategory === category.id
                ? "border-[var(--color-main-1)] bg-[var(--color-main-1)]/10 text-[var(--color-main-1)]"
                : "border-[var(--color-dark-4)] text-white/60 hover:border-[var(--color-dark-3)]"
            )}
          >
            <span>{category.icon}</span>
            <span className="text-sm">{category.name}</span>
          </button>
        ))}
      </div>

      {/* Rewards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredRewards.map((reward, index) => (
            <motion.div
              key={reward.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <RewardShopCard
                reward={reward}
                userXP={userXP}
                onRedeem={() => handleRedeem(reward)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {filteredRewards.length === 0 && (
        <div className="text-center py-12 bg-[var(--color-dark-2)] border border-[var(--color-dark-3)]">
          <span className="text-4xl mb-4 block">🏪</span>
          <p className="text-white/60">No rewards available in this category</p>
        </div>
      )}

      {/* How to earn more XP */}
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6">
        <h3 className="font-heading text-lg mb-4">Earn More XP</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-3 bg-[var(--color-dark-3)]">
            <span className="text-xl block mb-1">📅</span>
            <p className="text-white/60">Daily Login</p>
            <p className="text-[var(--color-main-1)]">+10-100 XP</p>
          </div>
          <div className="text-center p-3 bg-[var(--color-dark-3)]">
            <span className="text-xl block mb-1">🛒</span>
            <p className="text-white/60">Purchases</p>
            <p className="text-[var(--color-main-1)]">1 XP per R10</p>
          </div>
          <div className="text-center p-3 bg-[var(--color-dark-3)]">
            <span className="text-xl block mb-1">⭐</span>
            <p className="text-white/60">Reviews</p>
            <p className="text-[var(--color-main-1)]">+50-100 XP</p>
          </div>
          <div className="text-center p-3 bg-[var(--color-dark-3)]">
            <span className="text-xl block mb-1">🤝</span>
            <p className="text-white/60">Referrals</p>
            <p className="text-[var(--color-main-1)]">+300 XP</p>
          </div>
        </div>
      </div>
    </div>
  );
}


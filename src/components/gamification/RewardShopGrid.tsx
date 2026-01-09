"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGamificationStore, useRewardsStore } from "@/stores";
import { useGamification } from "@/hooks";
import { RewardShopCard, RewardShopCardSkeleton } from "./RewardShopCard";
import type { Reward } from "@/types/gamification";
import { getHighestVIPTier, hasVIPAccess, VIP_TIERS, type VIPTier } from "@/types/vip";

// Extended reward type with VIP tier requirement
interface ExtendedReward extends Reward {
  vip_only?: boolean;
  required_tier?: VIPTier; // Minimum VIP tier required
}

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

// Sample rewards with tiered VIP access
const SAMPLE_REWARDS: ExtendedReward[] = [
  // === NON-VIP REWARDS (Available to everyone) ===
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

  // === VIP BADGES (Purchase to unlock tiers) ===
  {
    id: "badge_fire",
    name: "Fire Badge",
    description: "🔥 Bronze VIP - Unlocks entry-level VIP perks!",
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
    description: "👑 Gold VIP - Unlocks premium rewards & early access!",
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
    description: "✨ Platinum VIP - Ultimate tier with all benefits!",
    category: "cosmetic",
    xp_cost: 1500,
    value: "frame_gold",
    image_url: null,
    stock: 25,
    is_active: true,
    created_at: new Date().toISOString(),
  },

  // === BRONZE VIP REWARDS (Fire Badge required) ===
  {
    id: "vip_discount_15",
    name: "VIP 15% Discount",
    description: "15% off your next order - Bronze VIP exclusive!",
    category: "exclusive",
    xp_cost: 400,
    value: "15",
    image_url: null,
    stock: null,
    is_active: true,
    created_at: new Date().toISOString(),
    vip_only: true,
    required_tier: "bronze",
  },
  {
    id: "vip_xp_boost_2x",
    name: "2x XP Boost",
    description: "Double XP for 24 hours - Bronze VIP perk!",
    category: "exclusive",
    xp_cost: 300,
    value: "2x_24h",
    image_url: null,
    stock: null,
    is_active: true,
    created_at: new Date().toISOString(),
    vip_only: true,
    required_tier: "bronze",
  },
  {
    id: "vip_mystery_box_standard",
    name: "VIP Mystery Box",
    description: "Standard VIP mystery box with bonus items",
    category: "exclusive",
    xp_cost: 600,
    value: "mystery_vip_standard",
    image_url: null,
    stock: 100,
    is_active: true,
    created_at: new Date().toISOString(),
    vip_only: true,
    required_tier: "bronze",
  },

  // === GOLD VIP REWARDS (Crown Badge required) ===
  {
    id: "vip_discount_25",
    name: "VIP 25% Discount",
    description: "Exclusive 25% off - Gold VIP members only!",
    category: "exclusive",
    xp_cost: 700,
    value: "25",
    image_url: null,
    stock: null,
    is_active: true,
    created_at: new Date().toISOString(),
    vip_only: true,
    required_tier: "gold",
  },
  {
    id: "vip_triple_xp",
    name: "3x XP Boost",
    description: "Triple XP for 24 hours - Gold VIP exclusive!",
    category: "exclusive",
    xp_cost: 500,
    value: "3x_24h",
    image_url: null,
    stock: null,
    is_active: true,
    created_at: new Date().toISOString(),
    vip_only: true,
    required_tier: "gold",
  },
  {
    id: "vip_mystery_box_premium",
    name: "Premium Mystery Box",
    description: "Premium VIP mystery box - Higher chance of rare items!",
    category: "exclusive",
    xp_cost: 800,
    value: "mystery_vip_premium",
    image_url: null,
    stock: 50,
    is_active: true,
    created_at: new Date().toISOString(),
    vip_only: true,
    required_tier: "gold",
  },
  {
    id: "vip_extra_spins_3",
    name: "3 Bonus Spins",
    description: "Three extra wheel spins - Gold VIP exclusive!",
    category: "exclusive",
    xp_cost: 450,
    value: "3",
    image_url: null,
    stock: null,
    is_active: true,
    created_at: new Date().toISOString(),
    vip_only: true,
    required_tier: "gold",
  },

  // === PLATINUM VIP REWARDS (Gold Frame required) ===
  {
    id: "vip_discount_35",
    name: "VIP 35% Discount",
    description: "Maximum 35% off - Platinum VIP exclusive!",
    category: "exclusive",
    xp_cost: 900,
    value: "35",
    image_url: null,
    stock: null,
    is_active: true,
    created_at: new Date().toISOString(),
    vip_only: true,
    required_tier: "platinum",
  },
  {
    id: "vip_quad_xp",
    name: "4x XP Boost",
    description: "Quadruple XP for 24 hours - Platinum VIP only!",
    category: "exclusive",
    xp_cost: 600,
    value: "4x_24h",
    image_url: null,
    stock: null,
    is_active: true,
    created_at: new Date().toISOString(),
    vip_only: true,
    required_tier: "platinum",
  },
  {
    id: "vip_diamond_frame",
    name: "Diamond Frame",
    description: "Ultra-rare diamond avatar frame - Platinum exclusive!",
    category: "exclusive",
    xp_cost: 2000,
    value: "frame_diamond",
    image_url: null,
    stock: 10,
    is_active: true,
    created_at: new Date().toISOString(),
    vip_only: true,
    required_tier: "platinum",
  },
  {
    id: "vip_mystery_box_elite",
    name: "Elite Mystery Box",
    description: "Elite VIP mystery box - Guaranteed rare+ items!",
    category: "exclusive",
    xp_cost: 1000,
    value: "mystery_vip_elite",
    image_url: null,
    stock: 25,
    is_active: true,
    created_at: new Date().toISOString(),
    vip_only: true,
    required_tier: "platinum",
  },
  {
    id: "vip_extra_spins_5",
    name: "5 Bonus Spins",
    description: "Five extra wheel spins - Platinum VIP exclusive!",
    category: "exclusive",
    xp_cost: 600,
    value: "5",
    image_url: null,
    stock: null,
    is_active: true,
    created_at: new Date().toISOString(),
    vip_only: true,
    required_tier: "platinum",
  },
];

export function RewardShopGrid({ className }: RewardShopGridProps) {
  const { userProfile, rewards: storeRewards, addNotification, isLoading: gamificationLoading, fetchRewards: fetchGamificationRewards, hasAnyBadge, userBadges } = useGamificationStore();
  const { fetchRewards } = useRewardsStore();
  const { purchaseReward } = useGamification();
  const [selectedCategory, setSelectedCategory] = useState<RewardCategory>("all");
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const isVIP = hasAnyBadge();
  // Get the user's highest VIP tier based on their badges
  const userVIPTier = getHighestVIPTier(userBadges.map(b => b.badge_id));

  // Fetch rewards on mount
  useEffect(() => {
    const loadRewards = async () => {
      setIsInitialLoading(true);
      await fetchGamificationRewards();
      setIsInitialLoading(false);
    };
    loadRewards();
  }, [fetchGamificationRewards]);

  // Use store rewards or sample data
  const allRewards = (storeRewards.length > 0 ? storeRewards : SAMPLE_REWARDS) as ExtendedReward[];
  
  // Filter rewards based on VIP tier access
  // Show all rewards but mark locked ones appropriately
  const rewards = allRewards.map((reward) => {
    const requiredTier = reward.required_tier;
    const isAccessible = !requiredTier || hasVIPAccess(userVIPTier, requiredTier);
    return {
      ...reward,
      isLocked: reward.vip_only && !isAccessible,
      requiredTierName: requiredTier ? VIP_TIERS[requiredTier]?.name : undefined,
    };
  });
  const userXP = userProfile?.total_xp || 0;
  const isLoading = isInitialLoading || gamificationLoading;

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

    if (result.success) {
      // Refresh the user's available rewards after successful purchase
      await fetchRewards();
    } else {
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
            {isLoading ? (
              <>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-2xl">⚡</span>
                  <div className="h-10 w-24 bg-[var(--color-dark-3)] animate-pulse rounded" />
                </div>
                <p className="text-xs text-white/40">Available XP</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  <span className="text-4xl font-heading text-[var(--color-main-1)]">
                    {userXP.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-white/40">Available XP</p>
              </>
            )}
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
        {isLoading ? (
          // Skeleton loading state
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <RewardShopCardSkeleton key={i} />
            ))}
          </>
        ) : (
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
                  isRedeeming={redeeming === reward.id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Empty state */}
      {!isLoading && filteredRewards.length === 0 && (
        <div className="text-center py-12 bg-[var(--color-dark-2)] border border-[var(--color-dark-3)]">
          <span className="text-4xl mb-4 block">🏪</span>
          <p className="text-white/60">No rewards available in this category</p>
        </div>
      )}

      {/* VIP Section with Tier Info */}
      {userVIPTier ? (
        <Link href="/vip" className="block">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className={cn(
              "border-2 p-6 cursor-pointer transition-colors",
              userVIPTier === "platinum" 
                ? "bg-gradient-to-r from-amber-900/30 to-[var(--color-dark-2)] border-amber-400/50 hover:border-amber-400/70"
                : userVIPTier === "gold"
                ? "bg-gradient-to-r from-yellow-900/30 to-[var(--color-dark-2)] border-yellow-500/50 hover:border-yellow-500/70"
                : "bg-gradient-to-r from-orange-900/30 to-[var(--color-dark-2)] border-orange-500/50 hover:border-orange-500/70"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">
                  {userVIPTier === "platinum" ? "✨" : userVIPTier === "gold" ? "👑" : "🔥"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={cn(
                      "font-heading text-xl",
                      userVIPTier === "platinum" ? "text-amber-400" 
                        : userVIPTier === "gold" ? "text-yellow-400" 
                        : "text-orange-400"
                    )}>
                      {VIP_TIERS[userVIPTier].name}
                    </h3>
                    {userVIPTier !== "platinum" && (
                      <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-white/60">
                        Upgrade available
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/60">
                    {userVIPTier === "platinum" 
                      ? "You have access to all exclusive perks and the VIP lounge!"
                      : `Upgrade to ${userVIPTier === "gold" ? "Platinum" : "Gold or Platinum"} for more rewards!`
                    }
                  </p>
                </div>
              </div>
              <div className={cn(
                userVIPTier === "platinum" ? "text-amber-400" 
                  : userVIPTier === "gold" ? "text-yellow-400" 
                  : "text-orange-400"
              )}>
                Enter VIP Lounge →
              </div>
            </div>
          </motion.div>
        </Link>
      ) : (
        <div className="bg-gradient-to-r from-purple-900/20 to-[var(--color-dark-2)] border border-purple-500/20 p-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl opacity-50">🔒</div>
            <div>
              <h3 className="font-heading text-lg text-purple-400/80">Unlock VIP Tiers</h3>
              <p className="text-sm text-white/60 mb-3">
                Purchase a badge above to unlock tiered VIP rewards and exclusive benefits!
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded">🔥 Bronze: 500 XP</span>
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">👑 Gold: 1,000 XP</span>
                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded">✨ Platinum: 1,500 XP</span>
              </div>
            </div>
          </div>
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
            <p className="text-[var(--color-main-1)]">+300-750 XP</p>
          </div>
        </div>
      </div>
    </div>
  );
}


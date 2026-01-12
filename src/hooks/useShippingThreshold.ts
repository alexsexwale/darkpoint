"use client";

import { useMemo } from "react";
import { useGamificationStore } from "@/stores";
import { getHighestVIPTier, type VIPTier } from "@/types/vip";
import {
  FREE_SHIPPING_THRESHOLD,
  BELOW_590_THRESHOLD,
  STANDARD_SHIPPING_FEE,
  BETWEEN_590_AND_1050_SHIPPING_FEE,
  VIP_BRONZE_FREE_SHIPPING_THRESHOLD,
  VIP_GOLD_FREE_SHIPPING_THRESHOLD,
  VIP_PLATINUM_FREE_SHIPPING_THRESHOLD,
} from "@/lib/constants";

export interface ShippingTier {
  name: string;
  freeThreshold: number;
  icon: string;
  color: string;
}

// NonNullVIPTier excludes null since Record keys must be string/number/symbol
type NonNullVIPTier = Exclude<VIPTier, null>;

export const SHIPPING_TIERS: Record<NonNullVIPTier | "none", ShippingTier> = {
  none: {
    name: "Standard",
    freeThreshold: FREE_SHIPPING_THRESHOLD,
    icon: "📦",
    color: "text-white/60",
  },
  bronze: {
    name: "Bronze VIP",
    freeThreshold: VIP_BRONZE_FREE_SHIPPING_THRESHOLD,
    icon: "🔥",
    color: "text-orange-400",
  },
  gold: {
    name: "Gold VIP",
    freeThreshold: VIP_GOLD_FREE_SHIPPING_THRESHOLD,
    icon: "👑",
    color: "text-yellow-400",
  },
  platinum: {
    name: "Platinum VIP",
    freeThreshold: VIP_PLATINUM_FREE_SHIPPING_THRESHOLD,
    icon: "✨",
    color: "text-amber-400",
  },
};

/**
 * Calculate shipping fee based on subtotal and VIP tier
 */
export function calculateShippingFee(subtotal: number, vipTier: VIPTier | null): number {
  // Get the free shipping threshold for this tier
  const freeThreshold = vipTier
    ? SHIPPING_TIERS[vipTier].freeThreshold
    : FREE_SHIPPING_THRESHOLD;

  // Free shipping if above threshold
  if (subtotal >= freeThreshold) {
    return 0;
  }

  // For non-VIP users, use tiered pricing
  if (!vipTier) {
    // Under R590 = R150
    if (subtotal < BELOW_590_THRESHOLD) {
      return STANDARD_SHIPPING_FEE;
    }
    // R590 - R1049 = R75
    return BETWEEN_590_AND_1050_SHIPPING_FEE;
  }

  // VIP users still get tiered pricing if not at free threshold
  if (subtotal < BELOW_590_THRESHOLD) {
    return STANDARD_SHIPPING_FEE;
  }
  return BETWEEN_590_AND_1050_SHIPPING_FEE;
}

/**
 * Get shipping info text based on subtotal and tier
 */
export function getShippingTierInfo(subtotal: number, vipTier: VIPTier | null): {
  fee: number;
  isFree: boolean;
  tierName: string;
  nextTierThreshold: number | null;
  amountToNextTier: number | null;
} {
  const fee = calculateShippingFee(subtotal, vipTier);
  const freeThreshold = vipTier
    ? SHIPPING_TIERS[vipTier].freeThreshold
    : FREE_SHIPPING_THRESHOLD;

  // Determine next tier threshold for non-free orders
  let nextTierThreshold: number | null = null;
  let amountToNextTier: number | null = null;

  if (fee > 0) {
    if (subtotal < BELOW_590_THRESHOLD) {
      // Next tier is the reduced shipping at R590
      nextTierThreshold = BELOW_590_THRESHOLD;
      amountToNextTier = BELOW_590_THRESHOLD - subtotal;
    } else if (subtotal < freeThreshold) {
      // Next tier is free shipping
      nextTierThreshold = freeThreshold;
      amountToNextTier = freeThreshold - subtotal;
    }
  }

  return {
    fee,
    isFree: fee === 0,
    tierName: vipTier ? SHIPPING_TIERS[vipTier].name : "Standard",
    nextTierThreshold,
    amountToNextTier,
  };
}

/**
 * Hook to get the appropriate free shipping threshold and fee based on VIP status.
 * VIP Bronze: Free at R950+
 * VIP Gold: Free at R850+
 * VIP Platinum: Free at R750+
 * Regular: Free at R1050+
 */
export function useShippingThreshold() {
  const { hasAnyBadge, userBadges } = useGamificationStore();

  const isVIP = hasAnyBadge();
  const vipTier = useMemo(() => {
    if (!isVIP) return null;
    return getHighestVIPTier(userBadges.map((b) => b.badge_id));
  }, [isVIP, userBadges]);

  const threshold = useMemo(() => {
    if (!vipTier) return FREE_SHIPPING_THRESHOLD;
    return SHIPPING_TIERS[vipTier].freeThreshold;
  }, [vipTier]);

  const tierInfo = useMemo(() => {
    return vipTier ? SHIPPING_TIERS[vipTier] : SHIPPING_TIERS.none;
  }, [vipTier]);

  return {
    threshold,
    isVIP,
    vipTier,
    tierInfo,
    regularThreshold: FREE_SHIPPING_THRESHOLD,
    bronzeThreshold: VIP_BRONZE_FREE_SHIPPING_THRESHOLD,
    goldThreshold: VIP_GOLD_FREE_SHIPPING_THRESHOLD,
    platinumThreshold: VIP_PLATINUM_FREE_SHIPPING_THRESHOLD,
    // Fee calculation helpers
    calculateFee: (subtotal: number) => calculateShippingFee(subtotal, vipTier),
    getShippingInfo: (subtotal: number) => getShippingTierInfo(subtotal, vipTier),
    // Fee constants
    standardFee: STANDARD_SHIPPING_FEE,
    reducedFee: BETWEEN_590_AND_1050_SHIPPING_FEE,
    midThreshold: BELOW_590_THRESHOLD,
  };
}

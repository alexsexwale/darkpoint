// VIP Tier System
// Each badge grants a different tier of VIP benefits

export type VIPTier = "bronze" | "gold" | "platinum" | null;

export interface VIPTierConfig {
  id: VIPTier;
  name: string;
  badgeId: string;
  icon: string;
  color: string;
  bgGradient: string;
  borderColor: string;
  discountMax: number; // Maximum discount available in rewards shop
  xpBoostMax: number; // Maximum XP boost multiplier available
  benefits: string[];
  earlyAccessHours: number; // Hours early access to sales
  prioritySupport: boolean;
  monthlyBonus: {
    xp: number;
    spins: number;
  } | null;
  mysteryBoxTier: "standard" | "premium" | "elite";
}

export const VIP_TIERS: Record<Exclude<VIPTier, null>, VIPTierConfig> = {
  bronze: {
    id: "bronze",
    name: "Bronze VIP",
    badgeId: "badge_fire",
    icon: "🔥",
    color: "#ff6600",
    bgGradient: "from-orange-500/20 to-red-500/20",
    borderColor: "border-orange-500/50",
    discountMax: 15,
    xpBoostMax: 2,
    benefits: [
      "Access to VIP rewards shop",
      "Up to 15% discount coupons",
      "2x XP boost available",
      "Standard VIP mystery boxes",
      "VIP badge on profile",
      "Secret areas unlocked",
    ],
    earlyAccessHours: 0,
    prioritySupport: false,
    monthlyBonus: null,
    mysteryBoxTier: "standard",
  },
  gold: {
    id: "gold",
    name: "Gold VIP",
    badgeId: "badge_crown",
    icon: "👑",
    color: "#ffd700",
    bgGradient: "from-yellow-500/20 to-amber-500/20",
    borderColor: "border-yellow-500/50",
    discountMax: 25,
    xpBoostMax: 3,
    benefits: [
      "All Bronze VIP benefits",
      "Up to 25% discount coupons",
      "3x XP boost available",
      "Premium VIP mystery boxes",
      "24-hour early sale access",
      "Priority customer support",
      "Gold-exclusive rewards",
    ],
    earlyAccessHours: 24,
    prioritySupport: true,
    monthlyBonus: null,
    mysteryBoxTier: "premium",
  },
  platinum: {
    id: "platinum",
    name: "Platinum VIP",
    badgeId: "frame_gold",
    icon: "✨",
    color: "#daa520",
    bgGradient: "from-amber-400/20 to-yellow-600/20",
    borderColor: "border-amber-400/50",
    discountMax: 35,
    xpBoostMax: 4,
    benefits: [
      "All Gold VIP benefits",
      "Up to 35% discount coupons",
      "4x XP boost available",
      "Elite VIP mystery boxes",
      "48-hour early sale access",
      "Highest priority support",
      "Platinum-exclusive rewards",
      "Monthly 100 XP bonus",
      "Monthly free spin",
      "Diamond Frame available",
    ],
    earlyAccessHours: 48,
    prioritySupport: true,
    monthlyBonus: {
      xp: 100,
      spins: 1,
    },
    mysteryBoxTier: "elite",
  },
};

// Get VIP tier from badge ID
export function getVIPTierFromBadge(badgeId: string | null): VIPTier {
  if (!badgeId) return null;
  
  // Return highest tier if user has multiple badges
  if (badgeId === "frame_gold") return "platinum";
  if (badgeId === "badge_crown") return "gold";
  if (badgeId === "badge_fire") return "bronze";
  
  return null;
}

// Get VIP tier from array of badges (returns highest)
export function getHighestVIPTier(badges: string[]): VIPTier {
  if (badges.includes("frame_gold")) return "platinum";
  if (badges.includes("badge_crown")) return "gold";
  if (badges.includes("badge_fire")) return "bronze";
  return null;
}

// Get tier configuration
export function getVIPTierConfig(tier: VIPTier): VIPTierConfig | null {
  if (!tier) return null;
  return VIP_TIERS[tier];
}

// Check if user has access to a specific reward based on tier
export function hasVIPAccess(
  userTier: VIPTier,
  requiredTier: VIPTier
): boolean {
  if (!requiredTier) return true; // No tier required
  if (!userTier) return false; // User has no tier
  
  const tierOrder: VIPTier[] = ["bronze", "gold", "platinum"];
  const userIndex = tierOrder.indexOf(userTier);
  const requiredIndex = tierOrder.indexOf(requiredTier);
  
  return userIndex >= requiredIndex;
}

// Badge to tier mapping for display
export const BADGE_TIER_INFO: Record<string, {
  tier: VIPTier;
  tierName: string;
  shortDescription: string;
  xpCost: number;
}> = {
  badge_fire: {
    tier: "bronze",
    tierName: "Bronze VIP",
    shortDescription: "Entry-level VIP with basic perks",
    xpCost: 500,
  },
  badge_crown: {
    tier: "gold",
    tierName: "Gold VIP",
    shortDescription: "Enhanced rewards & early access",
    xpCost: 1000,
  },
  frame_gold: {
    tier: "platinum",
    tierName: "Platinum VIP",
    shortDescription: "Ultimate VIP with all benefits",
    xpCost: 1500,
  },
};


// Gamification System Types
import type { Tables, XPAction as DBXPAction, RarityType, AchievementCategory } from "./database";

// Re-export database types for convenience
export type UserProfile = Tables<"user_profiles">;
export type Level = Tables<"levels">;
export type Achievement = Tables<"achievements">;
export type UserAchievement = Tables<"user_achievements">;
export type DailyLogin = Tables<"daily_logins">;
export type SpinPrize = Tables<"spin_prizes">;
export type SpinHistory = Tables<"spin_history">;
export type Referral = Tables<"referrals">;
export type Reward = Tables<"rewards">;
export type UserReward = Tables<"user_rewards">;
export type MysteryBox = Tables<"mystery_boxes">;
export type MysteryBoxPurchase = Tables<"mystery_box_purchases">;
export type XPTransaction = Tables<"xp_transactions">;
export type UserCoupon = Tables<"user_coupons">;

// Re-export enum types from database
export type { RarityType, AchievementCategory };
export type XPAction = DBXPAction;
// Alias for backward compatibility (Rarity was the old name)
export type Rarity = RarityType;

// XP Rewards Configuration
export const XP_REWARDS: Record<XPAction, number | ((value?: number) => number)> = {
  signup: 100,
  daily_login: (streakDay?: number) => {
    // Escalating rewards based on streak day (1-7 cycle)
    const day = ((streakDay || 1) - 1) % 7 + 1;
    const rewards = [10, 15, 25, 35, 50, 75, 100];
    return rewards[day - 1];
  },
  first_purchase: 500,
  purchase: (amountInRands?: number) => Math.floor((amountInRands || 0) / 10), // 1 XP per R10
  review: 50,
  photo_review: 100,
  share: 25,
  referral: 300,
  quest: 0, // Variable based on quest
  achievement: 0, // Variable based on achievement
  spin_reward: 0, // Variable based on spin result
  bonus: 0, // Variable
  admin: 0, // Admin-granted XP (variable)
  read_article: 20, // XP for reading a news article
  add_wishlist: 0, // XP only via quests/achievements, not direct
  redeem: 0, // XP spent on rewards (negative value in transactions)
};

// Level Tier Configuration
export interface LevelTier {
  minLevel: number;
  maxLevel: number;
  title: string;
  color: string;
  perks: string[];
  discountPercent: number;
}

export const LEVEL_TIERS: LevelTier[] = [
  {
    minLevel: 1,
    maxLevel: 4,
    title: "Noob",
    color: "#6b7280",
    perks: ["+25 XP bonus per level"],
    discountPercent: 0,
  },
  {
    minLevel: 5,
    maxLevel: 9,
    title: "Casual",
    color: "#22c55e",
    perks: ["+50 XP bonus per level", "Daily quest bonus"],
    discountPercent: 0,
  },
  {
    minLevel: 10,
    maxLevel: 19,
    title: "Gamer",
    color: "#3b82f6",
    perks: ["+100 XP bonus per level", "Early sale notifications", "Exclusive badges"],
    discountPercent: 0,
  },
  {
    minLevel: 20,
    maxLevel: 34,
    title: "Pro",
    color: "#8b5cf6",
    perks: ["+200 XP bonus per level", "Priority support", "Pro badge"],
    discountPercent: 0,
  },
  {
    minLevel: 35,
    maxLevel: 49,
    title: "Legend",
    color: "#f59e0b",
    perks: ["+300 XP bonus + Free spin per level", "Legend badge", "Exclusive access"],
    discountPercent: 0,
  },
  {
    minLevel: 50,
    maxLevel: 999,
    title: "Elite",
    color: "#ef4444",
    perks: ["+500 XP bonus + Free spin per level", "Elite badge", "VIP recognition", "All perks"],
    discountPercent: 0,
  },
];

// Achievement Categories (using type from database)
export const ACHIEVEMENT_CATEGORIES: { id: AchievementCategory; name: string; icon: string }[] = [
  { id: "shopping", name: "Shopping", icon: "🛒" },
  { id: "social", name: "Social", icon: "🤝" },
  { id: "engagement", name: "Engagement", icon: "⭐" },
  { id: "collector", name: "Collector", icon: "📦" },
  { id: "special", name: "Special", icon: "✨" },
];

// Rarity Types (using RarityType from database)
export const RARITY_CONFIG: Record<RarityType, { color: string; glow: string; name: string }> = {
  common: { color: "#9ca3af", glow: "0 0 20px rgba(156, 163, 175, 0.5)", name: "Common" },
  rare: { color: "#3b82f6", glow: "0 0 20px rgba(59, 130, 246, 0.5)", name: "Rare" },
  epic: { color: "#8b5cf6", glow: "0 0 20px rgba(139, 92, 246, 0.5)", name: "Epic" },
  legendary: { color: "#f59e0b", glow: "0 0 30px rgba(245, 158, 11, 0.7)", name: "Legendary" },
  mythic: { color: "#ef4444", glow: "0 0 40px rgba(239, 68, 68, 0.8)", name: "Mythic" },
};

// Daily Login Reward Types (XP-focused, no real money cost)
export type DailyRewardType = "spin" | "badge" | "xp_multiplier" | "xp_bonus" | "streak_start";

export interface DailyRewardBonus {
  type: DailyRewardType;
  value: string;
  description: string;
  icon: string;
}

export interface DailyReward {
  day: number;
  xp: number;
  reward?: DailyRewardBonus;
}

export const DAILY_REWARDS: DailyReward[] = [
  { 
    day: 1, 
    xp: 5,  // Day 1 = 5 XP to start the streak
    reward: { type: "streak_start", value: "5", description: "Streak started! Come back tomorrow!", icon: "🔥" }
  },
  { 
    day: 2, 
    xp: 15, 
    reward: { type: "xp_bonus", value: "15", description: "+15 Bonus XP!", icon: "✨" } 
  },
  { day: 3, xp: 25 },
  { 
    day: 4, 
    xp: 35, 
    reward: { type: "xp_multiplier", value: "1.5x", description: "1.5x XP for 24 hours", icon: "⚡" } 
  },
  { 
    day: 5, 
    xp: 50, 
    reward: { type: "spin", value: "1", description: "Free Spin!", icon: "🎡" } 
  },
  { 
    day: 6, 
    xp: 75, 
    reward: { type: "xp_bonus", value: "100", description: "+100 Bonus XP!", icon: "🌟" } 
  },
  { 
    day: 7, 
    xp: 100, 
    reward: { type: "spin", value: "2", description: "2 Free Spins!", icon: "🎰" } 
  },
];

// Daily Reward Icon Helper
export function getDailyRewardIcon(day: number): string {
  const reward = DAILY_REWARDS.find((r) => r.day === day);
  if (reward?.reward?.icon) return reward.reward.icon;
  return "⚡"; // Default XP icon
}

// Streak Milestones
export interface StreakMilestone {
  days: number;
  reward: string;
  badge: string;
  badgeIcon: string;
  xpBonus: number;
  description: string;
  color: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { 
    days: 7, 
    reward: "bronze_loyalty", 
    badge: "Bronze Loyalist", 
    badgeIcon: "🥉",
    xpBonus: 500, 
    description: "7-day streak achieved!",
    color: "#cd7f32"
  },
  { 
    days: 14, 
    reward: "10_percent_coupon", 
    badge: "Silver Loyalist", 
    badgeIcon: "🥈",
    xpBonus: 1000, 
    description: "2-week warrior!",
    color: "#c0c0c0"
  },
  { 
    days: 30, 
    reward: "mystery_box", 
    badge: "Gold Loyalist", 
    badgeIcon: "🥇",
    xpBonus: 2500, 
    description: "Monthly master!",
    color: "#ffd700"
  },
  { 
    days: 60, 
    reward: "exclusive_item", 
    badge: "Platinum Loyalist", 
    badgeIcon: "💠",
    xpBonus: 5000, 
    description: "60-day legend!",
    color: "#e5e4e2"
  },
  { 
    days: 100, 
    reward: "legendary_badge", 
    badge: "Diamond Loyalist", 
    badgeIcon: "💎",
    xpBonus: 10000, 
    description: "Century achiever!",
    color: "#b9f2ff"
  },
];

// Helper to check if streak has hit a milestone
export function getStreakMilestone(streak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days === streak) || null;
}

// Helper to get next milestone
export function getNextMilestone(currentStreak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days > currentStreak) || null;
}

// Referral Tiers
export interface ReferralTier {
  id: string;
  name: string;
  minReferrals: number;
  rewardPerReferral: number;
  badge: string;
  bonusPerks: string[];
}

export const REFERRAL_TIERS: ReferralTier[] = [
  {
    id: "bronze",
    name: "Bronze",
    minReferrals: 1,
    rewardPerReferral: 300,
    badge: "🥉",
    bonusPerks: [],
  },
  {
    id: "silver",
    name: "Silver",
    minReferrals: 5,
    rewardPerReferral: 400,
    badge: "🥈",
    bonusPerks: ["Silver badge", "+100 bonus XP"],
  },
  {
    id: "gold",
    name: "Gold",
    minReferrals: 10,
    rewardPerReferral: 500,
    badge: "🥇",
    bonusPerks: ["Gold badge", "+200 bonus XP", "1 Free Spin"],
  },
  {
    id: "diamond",
    name: "Diamond",
    minReferrals: 25,
    rewardPerReferral: 750,
    badge: "💎",
    bonusPerks: ["Diamond badge", "+500 bonus XP", "3 Free Spins", "Exclusive rewards"],
  },
];

// Notification Types
export interface GamificationNotification {
  id: string;
  type: "xp_gain" | "level_up" | "achievement" | "streak" | "reward" | "spin_result" | "error" | "info";
  title: string;
  message: string;
  icon?: string;
  xpAmount?: number;
  timestamp: number;
}

// Extended achievement with user progress
export interface AchievementWithProgress extends Achievement {
  is_unlocked: boolean;
  unlocked_at?: string | null;
  progress: number;
}

// Helper function to get XP for level
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= 4) return (level - 1) * 100;
  if (level <= 9) return 300 + (level - 4) * 200;
  if (level <= 19) return 1300 + (level - 9) * 500;
  if (level <= 34) return 6300 + (level - 19) * 1000;
  if (level <= 49) return 21300 + (level - 34) * 2000;
  return 51300 + (level - 49) * 5000;
}

// Helper to get level from XP
export function getLevelFromXP(xp: number): number {
  let level = 1;
  while (getXPForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

// Helper to get level tier info
export function getLevelTier(level: number): LevelTier {
  return (
    LEVEL_TIERS.find((tier) => level >= tier.minLevel && level <= tier.maxLevel) ||
    LEVEL_TIERS[0]
  );
}

// Helper to get referral tier
export function getReferralTier(referralCount: number): ReferralTier {
  return (
    [...REFERRAL_TIERS].reverse().find((tier) => referralCount >= tier.minReferrals) ||
    REFERRAL_TIERS[0]
  );
}

// Helper to calculate XP progress percentage
export function getXPProgress(currentXP: number, currentLevel: number): number {
  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  const xpIntoLevel = currentXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  return Math.min(100, Math.max(0, (xpIntoLevel / xpNeeded) * 100));
}

// Daily Quest Types
export type QuestRequirementType = "browse" | "wishlist" | "share" | "review" | "purchase" | "visit" | "action";

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  requirement: {
    type: QuestRequirementType;
    count: number;
    target?: string; // e.g., specific page to visit
  };
  progress: number;
  completed: boolean;
  completedAt?: string;
}

// Pool of available daily quests
export const QUEST_POOL: Omit<DailyQuest, "progress" | "completed" | "completedAt">[] = [
  {
    id: "browse_products",
    title: "Window Shopper",
    description: "Browse 3 different products",
    icon: "👀",
    xpReward: 25,
    requirement: { type: "browse", count: 3 },
  },
  {
    id: "add_wishlist",
    title: "Wishful Thinking",
    description: "Add an item to your wishlist",
    icon: "❤️",
    xpReward: 15,
    requirement: { type: "wishlist", count: 1 },
  },
  {
    id: "share_product",
    title: "Social Butterfly",
    description: "Share a product with friends",
    icon: "🦋",
    xpReward: 30,
    requirement: { type: "share", count: 1 },
  },
  {
    id: "visit_mystery",
    title: "Treasure Hunter",
    description: "Visit the Mystery Boxes page",
    icon: "🗺️",
    xpReward: 20,
    requirement: { type: "visit", count: 1, target: "/store/mystery-boxes" },
  },
  {
    id: "visit_spin",
    title: "Lucky Explorer",
    description: "Visit the Spin Wheel",
    icon: "🎰",
    xpReward: 15,
    requirement: { type: "visit", count: 1, target: "/rewards/spin" },
  },
  {
    id: "browse_category",
    title: "Category Expert",
    description: "Browse products in 2 different categories",
    icon: "📂",
    xpReward: 20,
    requirement: { type: "browse", count: 2 },
  },
  {
    id: "visit_rewards",
    title: "Reward Seeker",
    description: "Visit the Rewards Shop",
    icon: "🏪",
    xpReward: 15,
    requirement: { type: "visit", count: 1, target: "/rewards/shop" },
  },
  {
    id: "read_article",
    title: "News Enthusiast",
    description: "Read a news article",
    icon: "📰",
    xpReward: 20,
    requirement: { type: "action", count: 1, target: "/news" },
  },
];

// Get daily quests for a specific day (deterministic based on date)
export function getDailyQuests(date: string = new Date().toISOString().split("T")[0]): DailyQuest[] {
  // Use date to seed a pseudo-random selection
  const seed = date.split("-").reduce((acc, val) => acc + parseInt(val, 10), 0);
  
  // Shuffle the pool based on the seed
  const shuffled = [...QUEST_POOL].sort((a, b) => {
    const hashA = (seed * a.id.charCodeAt(0)) % 100;
    const hashB = (seed * b.id.charCodeAt(0)) % 100;
    return hashA - hashB;
  });

  // Pick 3 quests for the day
  return shuffled.slice(0, 3).map((quest) => ({
    ...quest,
    progress: 0,
    completed: false,
  }));
}


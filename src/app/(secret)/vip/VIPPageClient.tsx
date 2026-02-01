"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { BadgeCollection, type BadgeType } from "@/components/gamification";
import { ParticleEmitter } from "@/components/effects";
import { useConfettiBurst } from "@/components/effects/ParticleEmitter";
import { useEasterEgg } from "@/components/effects";
import { useGamificationStore, useAuthStore, useRewardsStore, getCurrentVIPPrize, type VIPWeeklyPrize } from "@/stores";
import { useBadgeSound } from "@/hooks";
import { getHighestVIPTier, VIP_TIERS, type VIPTier } from "@/types/vip";
import { cn } from "@/lib/utils";

// Tier-specific VIP perks
interface VIPPerk {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: VIPTier;
  tierColor: string;
}

const VIP_PERKS: VIPPerk[] = [
  // Bronze (Fire Badge) Perks
  {
    id: "bronze_discounts",
    name: "Up to 15% Discounts",
    description: "Access VIP discount coupons in the reward shop",
    icon: "🏷️",
    tier: "bronze",
    tierColor: "orange",
  },
  {
    id: "bronze_2x_xp",
    name: "2x XP Boost",
    description: "Double your XP earnings for 24 hours",
    icon: "⚡",
    tier: "bronze",
    tierColor: "orange",
  },
  {
    id: "bronze_mystery",
    name: "VIP Mystery Boxes",
    description: "Standard tier mystery boxes with bonus items",
    icon: "🎁",
    tier: "bronze",
    tierColor: "orange",
  },
  {
    id: "bronze_secrets",
    name: "Secret Areas",
    description: "Access to hidden pages and easter eggs",
    icon: "🔓",
    tier: "bronze",
    tierColor: "orange",
  },
  // Gold (Crown Badge) Perks
  {
    id: "gold_discounts",
    name: "Up to 25% Discounts",
    description: "Higher tier discount coupons available",
    icon: "💎",
    tier: "gold",
    tierColor: "yellow",
  },
  {
    id: "gold_3x_xp",
    name: "3x XP Boost",
    description: "Triple your XP earnings for 24 hours",
    icon: "⚡",
    tier: "gold",
    tierColor: "yellow",
  },
  {
    id: "gold_early_access",
    name: "24h Early Access",
    description: "Shop new products 24 hours before everyone",
    icon: "🚀",
    tier: "gold",
    tierColor: "yellow",
  },
  {
    id: "gold_support",
    name: "Priority Support",
    description: "Get faster responses from our support team",
    icon: "🎯",
    tier: "gold",
    tierColor: "yellow",
  },
  // Platinum (Gold Frame) Perks
  {
    id: "platinum_discounts",
    name: "Up to 35% Discounts",
    description: "Maximum discount coupons available",
    icon: "👑",
    tier: "platinum",
    tierColor: "amber",
  },
  {
    id: "platinum_4x_xp",
    name: "4x XP Boost",
    description: "Quadruple your XP earnings for 24 hours",
    icon: "⚡",
    tier: "platinum",
    tierColor: "amber",
  },
  {
    id: "platinum_early_access",
    name: "48h Early Access",
    description: "Shop new products 48 hours before everyone",
    icon: "🚀",
    tier: "platinum",
    tierColor: "amber",
  },
  {
    id: "platinum_monthly",
    name: "Monthly Bonuses",
    description: "100 XP + 1 free spin every month",
    icon: "🎁",
    tier: "platinum",
    tierColor: "amber",
  },
];

export function VIPPageClient() {
  const router = useRouter();
  const { triggerEasterEgg } = useEasterEgg();
  const { isAuthenticated, isInitialized: authInitialized } = useAuthStore();
  const { userBadges, hasAnyBadge, userProfile, isInitialized: gamificationInitialized } = useGamificationStore();
  const { 
    activateVIPPrize, 
    isVIPPrizeActive, 
    isVIPPrizeUsed,
    vipPrize, 
    getVIPPrizeTimeRemaining,
    fetchVIPPrizeStatus,
  } = useRewardsStore();
  const { playVIPAccess, playSecret } = useBadgeSound();
  const { triggerConfetti } = useConfettiBurst();

  const [showParticles, setShowParticles] = useState(false);
  const [prizeActivated, setPrizeActivated] = useState(false);
  const [prizeUsed, setPrizeUsed] = useState(false);
  const [showPrizeReveal, setShowPrizeReveal] = useState(false);
  const [currentPrize, setCurrentPrize] = useState<VIPWeeklyPrize | null>(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [accessChecked, setAccessChecked] = useState(false);

  // Both auth and gamification must be initialized before checking access
  const fullyInitialized = authInitialized && gamificationInitialized;

  // Fetch VIP prize status from database on mount
  useEffect(() => {
    if (fullyInitialized && isAuthenticated && hasAnyBadge()) {
      fetchVIPPrizeStatus();
    }
  }, [fullyInitialized, isAuthenticated, hasAnyBadge, fetchVIPPrizeStatus]);

  // Check VIP access and update local state from store
  useEffect(() => {
    if (!fullyInitialized) return;
    
    // Only check access once
    if (accessChecked) return;
    setAccessChecked(true);
    
    if (!isAuthenticated || !hasAnyBadge()) {
      // Redirect non-VIP users to 404
      router.replace("/404");
    } else {
      // Play VIP access sound
      playVIPAccess();
      // Show particles celebration
      setTimeout(() => setShowParticles(true), 500);
    }
  }, [fullyInitialized, accessChecked, isAuthenticated, hasAnyBadge, router, playVIPAccess]);

  // Update local component state when store state changes
  useEffect(() => {
    // Check if prize has been used this week
    if (isVIPPrizeUsed()) {
      setCurrentPrize(vipPrize.activatedPrize);
      setPrizeActivated(true);
      setPrizeUsed(true);
    }
    // Check if prize is already activated but not used
    else if (isVIPPrizeActive()) {
      setCurrentPrize(vipPrize.activatedPrize);
      setPrizeActivated(true);
      setPrizeUsed(false);
    } else {
      // Reset if no prize activated
      setPrizeActivated(false);
      setPrizeUsed(false);
      setCurrentPrize(null);
    }
  }, [vipPrize, isVIPPrizeActive, isVIPPrizeUsed]);

  // Update time remaining
  useEffect(() => {
    if (prizeActivated) {
      const updateTime = () => setTimeRemaining(getVIPPrizeTimeRemaining());
      updateTime();
      const interval = setInterval(updateTime, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [prizeActivated, getVIPPrizeTimeRemaining]);

  // Handle prize activation
  const handleActivatePrize = () => {
    const result = activateVIPPrize();
    if (result.success && result.prize) {
      setCurrentPrize(result.prize);
      setPrizeActivated(true);
      setShowPrizeReveal(true);
      playSecret();
      
      // Trigger confetti celebration if newly activated
      if (!result.alreadyActivated) {
        triggerConfetti();
      }
      
      // Hide reveal animation after delay
      setTimeout(() => setShowPrizeReveal(false), 3000);
    }
  };

  // Don't render anything until we verify access
  if (!fullyInitialized || !accessChecked || !isAuthenticated || !hasAnyBadge()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-main-1)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const thisWeeksPrize = getCurrentVIPPrize();
  const ownedBadges = userBadges.map(b => b.badge_id as BadgeType);
  const memberSince = userProfile?.created_at 
    ? new Date(userProfile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Recently";
  
  // Get user's VIP tier
  const userVIPTier = getHighestVIPTier(userBadges.map(b => b.badge_id));
  const tierConfig = userVIPTier ? VIP_TIERS[userVIPTier] : null;
  
  // Filter perks based on user's tier (show all at or below their tier)
  const accessiblePerks = VIP_PERKS.filter(perk => {
    if (!userVIPTier) return false;
    const tierOrder: VIPTier[] = ["bronze", "gold", "platinum"];
    const userTierIndex = tierOrder.indexOf(userVIPTier);
    const perkTierIndex = perk.tier ? tierOrder.indexOf(perk.tier) : -1;
    return perkTierIndex <= userTierIndex;
  });
  
  // Get locked perks (perks above user's tier)
  const lockedPerks = VIP_PERKS.filter(perk => {
    if (!userVIPTier) return true;
    const tierOrder: VIPTier[] = ["bronze", "gold", "platinum"];
    const userTierIndex = tierOrder.indexOf(userVIPTier);
    const perkTierIndex = perk.tier ? tierOrder.indexOf(perk.tier) : -1;
    return perkTierIndex > userTierIndex;
  });

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 via-[var(--color-dark-1)] to-[var(--color-dark-1)]" />
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, delay: 2 }}
        />
      </div>

      {/* Particle Celebration */}
      <AnimatePresence>
        {showParticles && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50"
          >
            <ParticleEmitter
              preset="gold-dust"
              width={window.innerWidth}
              height={window.innerHeight}
              active
              customConfig={{ particleCount: 50 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full mb-6">
            <span className="text-amber-400 text-sm font-semibold tracking-wider">
              ✨ EXCLUSIVE VIP ACCESS ✨
            </span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-heading uppercase tracking-wider mb-4">
            <span className="text-amber-400">VIP</span> Lounge
          </h1>
          
          <p className="text-white/60 max-w-xl mx-auto">
            Welcome to the exclusive inner circle. As a badge holder, you have access to 
            secret perks, deals, and features that regular members can only dream about.
          </p>
        </motion.div>

        {/* Member Card with Tier Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <div className={cn(
            "relative border-2 rounded-xl p-8 overflow-hidden",
            userVIPTier === "platinum" 
              ? "bg-gradient-to-br from-amber-900/30 to-[var(--color-dark-2)] border-amber-400/50"
              : userVIPTier === "gold"
              ? "bg-gradient-to-br from-yellow-900/30 to-[var(--color-dark-2)] border-yellow-500/50"
              : "bg-gradient-to-br from-orange-900/30 to-[var(--color-dark-2)] border-orange-500/50"
          )}>
            {/* Card Shine Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            />

            <div className="relative flex flex-col sm:flex-row items-center gap-6">
              {/* Badge Display */}
              <div className="flex-shrink-0">
                <BadgeCollection badges={ownedBadges} size="lg" />
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className={cn(
                  "text-xs font-semibold tracking-widest mb-1",
                  userVIPTier === "platinum" ? "text-amber-400"
                    : userVIPTier === "gold" ? "text-yellow-400"
                    : "text-orange-400"
                )}>
                  {tierConfig?.icon} {tierConfig?.name?.toUpperCase() || "VIP MEMBER"}
                </div>
                <h2 className="text-2xl font-heading text-white mb-1">
                  {userProfile?.display_name || "VIP Member"}
                </h2>
                <p className="text-sm text-white/60">
                  Member since {memberSince}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-sm">
                  <span className={cn(
                    userVIPTier === "platinum" ? "text-amber-400"
                      : userVIPTier === "gold" ? "text-yellow-400"
                      : "text-orange-400"
                  )}>
                    {userProfile?.total_xp?.toLocaleString() || 0} XP
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="text-white/60">
                    Level {userProfile?.current_level || 1}
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="text-white/60">
                    {userBadges.length} {userBadges.length === 1 ? "Badge" : "Badges"}
                  </span>
                </div>
              </div>
              
              {/* Tier Benefits Summary */}
              {tierConfig && (
                <div className="flex-shrink-0 text-center sm:text-right">
                  <div className="text-xs text-white/40 mb-1">Your Tier Benefits</div>
                  <div className="space-y-1">
                    <div className="text-sm text-white/80">Up to {tierConfig.discountMax}% discounts</div>
                    <div className="text-sm text-white/80">{tierConfig.xpBoostMax}x XP boost available</div>
                    {tierConfig.earlyAccessHours > 0 && (
                      <div className="text-sm text-white/80">{tierConfig.earlyAccessHours}h early access</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Upgrade prompt for non-platinum */}
            {userVIPTier !== "platinum" && (
              <div className="relative mt-6 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">
                    Upgrade to {userVIPTier === "gold" ? "Platinum" : "Gold"} for more benefits!
                  </span>
                  <Link href="/rewards/shop" className={cn(
                    "font-medium hover:underline",
                    userVIPTier === "gold" ? "text-amber-400" : "text-yellow-400"
                  )}>
                    View Badges →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Weekly VIP Prize */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <div className="relative overflow-hidden rounded-xl">
            {/* Animated gradient border */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: "200% 200%" }}
            />
            
            <div className="relative m-[2px] bg-[var(--color-dark-1)] rounded-xl p-6">
              {!prizeActivated ? (
                // Not yet activated - show mystery
                <div className="text-center py-4">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [0, 2, -2, 0]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-6xl mb-4"
                  >
                    🎁
                  </motion.div>
                  
                  <h3 className="font-heading text-2xl mb-2">
                    <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      This Week&apos;s Mystery Prize
                    </span>
                  </h3>
                  
                  <p className="text-white/60 mb-6 max-w-md mx-auto">
                    A special surprise awaits! Activate your exclusive VIP prize 
                    to unlock it and use it on your next order.
                  </p>
                  
                  <Button
                    onClick={handleActivatePrize}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 text-lg"
                  >
                    ✨ Reveal My Prize ✨
                  </Button>
                  
                  <p className="text-xs text-white/40 mt-4">
                    Prize changes every week. Use it or lose it!
                  </p>
                </div>
              ) : prizeUsed ? (
                // Prize already used this week
                <div className="text-center py-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-6xl mb-4 grayscale opacity-60"
                  >
                    {currentPrize?.icon || "🎁"}
                  </motion.div>
                  
                  <h3 className="font-heading text-2xl mb-2 text-white/60">
                    Prize Already Used
                  </h3>
                  
                  <p className="text-white/40 mb-4 max-w-md mx-auto">
                    You&apos;ve already used your <span className="text-white/60">{currentPrize?.name}</span> this week. 
                    Come back next week for a new prize!
                  </p>
                  
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs px-3 py-1 bg-white/10 text-white/50 rounded-full">
                      ✓ Used
                    </span>
                    <span className="text-xs text-white/40">
                      New prize in {timeRemaining || "next week"}
                    </span>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <Link href="/store">
                      <Button variant="outline" className="border-white/20 text-white/60 hover:bg-white/5">
                        Continue Shopping →
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                // Prize activated - show details
                <div>
                  {/* Prize reveal animation */}
                  <AnimatePresence>
                    {showPrizeReveal && (
                      <motion.div
                        initial={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--color-dark-1)]/95"
                      >
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", bounce: 0.5 }}
                          className="text-center"
                        >
                          <div className="text-8xl mb-4">{currentPrize?.icon}</div>
                          <h3 className="text-3xl font-heading text-white mb-2">
                            {currentPrize?.name}!
                          </h3>
                          <p className="text-amber-400">Prize Unlocked!</p>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="flex items-center gap-6">
                    {/* Prize Icon */}
                    <motion.div
                      animate={{ 
                        boxShadow: [
                          `0 0 20px ${currentPrize?.color.includes("purple") ? "rgba(168, 85, 247, 0.4)" : "rgba(251, 191, 36, 0.4)"}`,
                          `0 0 40px ${currentPrize?.color.includes("purple") ? "rgba(168, 85, 247, 0.6)" : "rgba(251, 191, 36, 0.6)"}`,
                          `0 0 20px ${currentPrize?.color.includes("purple") ? "rgba(168, 85, 247, 0.4)" : "rgba(251, 191, 36, 0.4)"}`
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`flex-shrink-0 w-24 h-24 rounded-2xl bg-gradient-to-br ${currentPrize?.color} flex items-center justify-center text-5xl`}
                    >
                      {currentPrize?.icon}
                    </motion.div>
                    
                    {/* Prize Details */}
                    <div className="flex-1">
                      <div className="text-xs text-amber-400 font-semibold tracking-widest mb-1">
                        ✨ YOUR VIP PRIZE
                      </div>
                      <h3 className="text-2xl font-heading text-white mb-1">
                        {currentPrize?.name}
                      </h3>
                      <p className="text-white/70 text-sm mb-3">
                        {currentPrize?.description}
                      </p>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-xs px-3 py-1 bg-green-500/20 text-green-400 rounded-full">
                          ✓ Active
                        </span>
                        <span className="text-xs text-white/50">
                          {timeRemaining}
                        </span>
                      </div>
                    </div>
                    
                    {/* Use Now Button */}
                    <div className="flex-shrink-0">
                      <Link href="/store">
                        <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                          Shop Now →
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm">
                    <span className="text-white/50">
                      Available in cart, at checkout, and in the cart drawer
                    </span>
                    <span className="text-amber-400/70 text-xs">
                      Cannot combine with other rewards
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Your VIP Perks (Unlocked) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-heading text-center mb-2">
            <span className={cn(
              userVIPTier === "platinum" ? "text-amber-400"
                : userVIPTier === "gold" ? "text-yellow-400"
                : "text-orange-400"
            )}>Your</span> VIP Perks
          </h2>
          <p className="text-center text-white/50 text-sm mb-8">
            {accessiblePerks.length} perks unlocked with your {tierConfig?.name}
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {accessiblePerks.map((perk, index) => (
              <motion.div
                key={perk.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                className={cn(
                  "bg-[var(--color-dark-2)] border p-6 transition-colors group",
                  perk.tierColor === "platinum" || perk.tierColor === "amber"
                    ? "border-amber-500/30 hover:border-amber-500/50"
                    : perk.tierColor === "gold" || perk.tierColor === "yellow"
                    ? "border-yellow-500/30 hover:border-yellow-500/50"
                    : "border-orange-500/30 hover:border-orange-500/50"
                )}
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                  {perk.icon}
                </div>
                <h3 className="font-heading text-lg mb-1">{perk.name}</h3>
                <p className="text-sm text-white/60">{perk.description}</p>
                
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className={cn(
                    "text-xs font-semibold",
                    perk.tierColor === "platinum" || perk.tierColor === "amber" ? "text-amber-400"
                      : perk.tierColor === "gold" || perk.tierColor === "yellow" ? "text-yellow-400"
                      : "text-orange-400"
                  )}>
                    {perk.tier === "platinum" ? "✨ PLATINUM" : perk.tier === "gold" ? "👑 GOLD" : "🔥 BRONZE"}
                  </span>
                  <span className="text-xs text-green-400">✓ Unlocked</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Locked Perks (Upgrade Incentive) */}
        {lockedPerks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-heading text-center mb-2">
              <span className="text-white/40">Upgrade</span> to Unlock More
            </h2>
            <p className="text-center text-white/40 text-sm mb-8">
              These perks are available with higher tier badges
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {lockedPerks.map((perk, index) => (
                <motion.div
                  key={perk.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.05 }}
                  className="relative bg-[var(--color-dark-2)] border border-[var(--color-dark-4)] p-6 opacity-60"
                >
                  {/* Lock overlay */}
                  <div className="absolute top-3 right-3 text-xl">🔒</div>
                  
                  <div className="text-4xl mb-4 grayscale opacity-50">
                    {perk.icon}
                  </div>
                  <h3 className="font-heading text-lg mb-1 text-white/60">{perk.name}</h3>
                  <p className="text-sm text-white/60">{perk.description}</p>
                  
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <span className={cn(
                      "text-xs font-semibold",
                      perk.tierColor === "platinum" || perk.tierColor === "amber" ? "text-amber-400/60"
                        : perk.tierColor === "gold" || perk.tierColor === "yellow" ? "text-yellow-400/60"
                        : "text-orange-400/60"
                    )}>
                      Requires {perk.tier === "platinum" ? "✨ Platinum" : perk.tier === "gold" ? "👑 Gold" : "🔥 Bronze"}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="text-center mt-6">
              <Link href="/rewards/shop">
                <Button variant="outline" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
                  Upgrade Your Tier →
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Secret Hints */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-8">
            <h3 className="font-heading text-xl text-center mb-6">
              🕵️ Secret Discoveries
            </h3>
            
            <div className="space-y-4 text-sm text-white/70">
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <span className="text-amber-400">💡</span>
                <p>
                  <span className="text-amber-400">Hint 1:</span> The ancient code still works anywhere on the site... 
                  <span className="text-white/40 italic"> up up down down left right left right B A</span>
                </p>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <span className="text-amber-400">💡</span>
                <p>
                  <span className="text-amber-400">Hint 2:</span> Click the Darkpoint logo 5 times quickly for a surprise...
                </p>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <span className="text-amber-400">💡</span>
                <p>
                  <span className="text-amber-400">Hint 3:</span> Visit at midnight for special effects...
                </p>
              </div>
              
              <button
                type="button"
                onClick={() => triggerEasterEgg("hidden_arcade")}
                className="flex items-start gap-3 p-3 bg-white/5 rounded-lg group cursor-pointer hover:bg-purple-500/20 hover:border-purple-500/30 border border-transparent transition-all w-full text-left"
              >
                <span className="text-amber-400">💡</span>
                <div className="flex-1">
                  <span className="text-amber-400">Hint 4:</span>{" "}
                  <span className="text-white/70 group-hover:text-white transition-colors">
                    There&apos;s a hidden arcade somewhere on this site...
                  </span>
                  <span className="ml-2 text-purple-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    → Click to play! 🕹️
                  </span>
                </div>
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10 text-center">
              <Link href="/rewards/shop" className="text-sm text-amber-400 hover:underline">
                ← Back to Rewards Shop
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


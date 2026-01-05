"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { BadgeCollection, type BadgeType } from "@/components/gamification";
import { ParticleEmitter } from "@/components/effects";
import { useConfettiBurst } from "@/components/effects/ParticleEmitter";
import { useGamificationStore, useAuthStore, useRewardsStore, getCurrentVIPPrize, type VIPWeeklyPrize } from "@/stores";
import { useBadgeSound } from "@/hooks";

// Exclusive deals for VIP members
const VIP_DEALS = [
  {
    id: "vip_extra_5",
    name: "Extra 5% Off",
    description: "Stack with any other discount",
    type: "discount",
    value: 5,
    icon: "💎",
  },
  {
    id: "vip_free_express",
    name: "Free Express Shipping",
    description: "On orders over R300",
    type: "shipping",
    value: 0,
    icon: "🚀",
  },
  {
    id: "vip_triple_xp",
    name: "Triple XP Weekend",
    description: "Active every weekend",
    type: "xp",
    value: 3,
    icon: "⚡",
  },
  {
    id: "vip_early_access",
    name: "Early Access",
    description: "New products 24h early",
    type: "access",
    value: 24,
    icon: "🔓",
  },
];

export function VIPPageClient() {
  const router = useRouter();
  const { isAuthenticated, isInitialized: authInitialized } = useAuthStore();
  const { userBadges, hasAnyBadge, userProfile, isInitialized: gamificationInitialized } = useGamificationStore();
  const { 
    activateVIPPrize, 
    isVIPPrizeActive, 
    vipPrize, 
    getVIPPrizeTimeRemaining 
  } = useRewardsStore();
  const { playVIPAccess, playSecret } = useBadgeSound();
  const { triggerConfetti } = useConfettiBurst();

  const [showParticles, setShowParticles] = useState(false);
  const [prizeActivated, setPrizeActivated] = useState(false);
  const [showPrizeReveal, setShowPrizeReveal] = useState(false);
  const [currentPrize, setCurrentPrize] = useState<VIPWeeklyPrize | null>(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [accessChecked, setAccessChecked] = useState(false);

  // Both auth and gamification must be initialized before checking access
  const fullyInitialized = authInitialized && gamificationInitialized;

  // Check VIP access - only after both stores are initialized
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
      
      // Check if prize is already activated
      if (isVIPPrizeActive()) {
        setCurrentPrize(vipPrize.activatedPrize);
        setPrizeActivated(true);
      }
    }
  }, [fullyInitialized, accessChecked, isAuthenticated, hasAnyBadge, router, playVIPAccess, isVIPPrizeActive, vipPrize]);

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

        {/* Member Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <div className="relative bg-gradient-to-br from-amber-900/30 to-[var(--color-dark-2)] border-2 border-amber-500/30 rounded-xl p-8 overflow-hidden">
            {/* Card Shine Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            />

            <div className="relative flex items-center gap-6">
              {/* Badge Display */}
              <div className="flex-shrink-0">
                <BadgeCollection badges={ownedBadges} size="lg" />
              </div>

              <div className="flex-1">
                <div className="text-xs text-amber-400 font-semibold tracking-widest mb-1">
                  VIP MEMBER
                </div>
                <h2 className="text-2xl font-heading text-white mb-1">
                  {userProfile?.display_name || "VIP Member"}
                </h2>
                <p className="text-sm text-white/60">
                  Member since {memberSince}
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="text-amber-400">
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
            </div>
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

        {/* Exclusive Deals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-heading text-center mb-8">
            <span className="text-amber-400">Exclusive</span> VIP Perks
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {VIP_DEALS.map((deal, index) => (
              <motion.div
                key={deal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 hover:border-amber-500/30 transition-colors group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                  {deal.icon}
                </div>
                <h3 className="font-heading text-lg mb-1">{deal.name}</h3>
                <p className="text-sm text-white/60">{deal.description}</p>
                
                <div className="mt-4 pt-4 border-t border-white/10">
                  <span className="text-xs text-amber-400 font-semibold">
                    VIP EXCLUSIVE
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

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
              
              <Link 
                href="/arcade"
                className="flex items-start gap-3 p-3 bg-white/5 rounded-lg group cursor-pointer hover:bg-purple-500/20 hover:border-purple-500/30 border border-transparent transition-all"
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
              </Link>
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


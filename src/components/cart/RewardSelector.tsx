"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRewardsStore, getRewardDisplayInfo, getSourceDisplay, type UserReward } from "@/stores/rewardsStore";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

interface RewardSelectorProps {
  subtotal: number;
  shippingCost?: number;
  variant?: "compact" | "full";
  className?: string;
}

export function RewardSelector({ 
  subtotal, 
  shippingCost = 0, 
  variant = "full",
  className 
}: RewardSelectorProps) {
  const { 
    rewards, 
    appliedReward, 
    isLoading, 
    isInitialized,
    fetchRewards, 
    applyReward, 
    removeAppliedReward,
    canApplyReward,
    getDiscountAmount,
    getShippingDiscount,
  } = useRewardsStore();
  
  const { isAuthenticated, isInitialized: authInitialized } = useAuthStore();
  const { toggleSignIn } = useUIStore();
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch rewards when component mounts
  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      fetchRewards();
    }
  }, [isAuthenticated, isInitialized, fetchRewards]);

  // Filter available rewards
  const availableRewards = rewards.filter((r) => {
    const { canApply } = canApplyReward(r, subtotal);
    return canApply || r.min_order_value > subtotal; // Show even if min not met
  });

  // Calculate current discount
  const discountAmount = getDiscountAmount(subtotal);
  const shippingDiscount = getShippingDiscount(shippingCost);
  const totalSavings = discountAmount + shippingDiscount;

  // Not authenticated - show login prompt
  if (authInitialized && !isAuthenticated) {
    return (
      <div className={cn("bg-gradient-to-r from-[var(--color-main-1)]/10 to-purple-500/10 border border-[var(--color-main-1)]/30 rounded-lg p-4", className)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-main-1)]/20 flex items-center justify-center">
            <span className="text-xl">🎁</span>
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Have rewards to redeem?</p>
            <p className="text-xs text-white/60">Sign in to use your rewards</p>
          </div>
          <button
            onClick={toggleSignIn}
            className="px-4 py-2 bg-[var(--color-main-1)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-main-1)]/90 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading || !isInitialized) {
    return (
      <div className={cn("bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-lg p-4", className)}>
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-[var(--color-dark-3)]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[var(--color-dark-3)] rounded w-32" />
            <div className="h-3 bg-[var(--color-dark-3)] rounded w-24" />
          </div>
        </div>
      </div>
    );
  }

  // No rewards available
  if (availableRewards.length === 0 && !appliedReward) {
    return (
      <div className={cn("bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-lg p-4", className)}>
        <div className="flex items-center gap-3 text-white/50">
          <span className="text-2xl opacity-50">🎁</span>
          <div>
            <p className="text-sm">No rewards available</p>
            <p className="text-xs">Earn XP to unlock rewards in the shop!</p>
          </div>
        </div>
      </div>
    );
  }

  // Applied reward display
  if (appliedReward) {
    const info = getRewardDisplayInfo(appliedReward);
    
    return (
      <div className={cn("bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="text-xl">{info.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm text-green-400">{info.name}</p>
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Applied</span>
              </div>
              <p className="text-xs text-white/60">{info.description}</p>
              {totalSavings > 0 && (
                <p className="text-xs text-green-400 mt-1 font-medium">
                  You save R{totalSavings.toFixed(0)}!
                </p>
              )}
            </div>
          </div>
          <button
            onClick={removeAppliedReward}
            className="p-2 text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            title="Remove reward"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Compact variant for drawer
  if (variant === "compact") {
    return (
      <div className={cn("", className)}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full bg-gradient-to-r from-[var(--color-main-1)]/10 to-purple-500/10 border border-[var(--color-main-1)]/30 rounded-lg p-3 flex items-center justify-between hover:border-[var(--color-main-1)]/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🎁</span>
            <span className="text-sm font-medium">
              {availableRewards.length} reward{availableRewards.length !== 1 ? "s" : ""} available
            </span>
          </div>
          <motion.svg 
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="w-5 h-5 text-white/60" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 space-y-2 max-h-48 overflow-y-auto">
                {availableRewards.map((reward) => (
                  <RewardCard 
                    key={reward.id} 
                    reward={reward} 
                    subtotal={subtotal}
                    onApply={() => {
                      applyReward(reward);
                      setIsExpanded(false);
                    }}
                    compact
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full variant for cart page
  return (
    <div className={cn("bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-lg overflow-hidden", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-[var(--color-dark-3)]/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-main-1)]/30 to-purple-500/30 flex items-center justify-center">
            <span className="text-xl">🎁</span>
          </div>
          <div className="text-left">
            <p className="font-medium text-sm">Apply a Reward</p>
            <p className="text-xs text-white/60">
              {availableRewards.length} reward{availableRewards.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>
        <motion.svg 
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="w-5 h-5 text-white/60" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-3 max-h-64 overflow-y-auto">
              <p className="text-xs text-white/50 border-t border-[var(--color-dark-3)] pt-3">
                Select one reward to apply (only 1 per order)
              </p>
              {availableRewards.map((reward) => (
                <RewardCard 
                  key={reward.id} 
                  reward={reward} 
                  subtotal={subtotal}
                  onApply={() => {
                    applyReward(reward);
                    setIsExpanded(false);
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Individual reward card
interface RewardCardProps {
  reward: UserReward;
  subtotal: number;
  onApply: () => void;
  compact?: boolean;
}

function RewardCard({ reward, subtotal, onApply, compact }: RewardCardProps) {
  const { canApplyReward } = useRewardsStore();
  const { canApply, reason } = canApplyReward(reward, subtotal);
  const info = getRewardDisplayInfo(reward);
  const source = getSourceDisplay(reward.source);

  // Check if expiring soon (within 7 days)
  const expiringSoon = reward.expires_at && 
    new Date(reward.expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  if (compact) {
    return (
      <button
        onClick={onApply}
        disabled={!canApply}
        className={cn(
          "w-full p-3 rounded-lg border text-left transition-all",
          canApply 
            ? "bg-[var(--color-dark-2)] border-[var(--color-dark-3)] hover:border-[var(--color-main-1)] hover:bg-[var(--color-dark-3)]/50" 
            : "bg-[var(--color-dark-2)]/50 border-[var(--color-dark-4)] opacity-60 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{info.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{info.name}</p>
            {!canApply && reason && (
              <p className="text-xs text-red-400">{reason}</p>
            )}
          </div>
          {canApply && (
            <span className="text-[var(--color-main-1)] text-xs font-medium">Apply</span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "p-4 rounded-lg border transition-all",
        canApply 
          ? "bg-[var(--color-dark-3)]/30 border-[var(--color-dark-4)] hover:border-[var(--color-main-1)]/50" 
          : "bg-[var(--color-dark-3)]/10 border-[var(--color-dark-4)]/50 opacity-70"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center text-2xl",
          canApply ? "bg-[var(--color-main-1)]/20" : "bg-[var(--color-dark-4)]"
        )}>
          {info.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-sm">{info.name}</h4>
              <p className="text-xs text-white/60 mt-0.5">{info.description}</p>
            </div>
            {expiringSoon && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded-full whitespace-nowrap">
                Expiring soon
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">
              From {source}
            </span>
            
            {canApply ? (
              <button
                onClick={onApply}
                className="px-4 py-1.5 bg-[var(--color-main-1)] text-white text-xs font-medium rounded-lg hover:bg-[var(--color-main-1)]/90 transition-colors"
              >
                Apply Reward
              </button>
            ) : (
              <span className="text-xs text-red-400">{reason}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export for use in account dashboard
export function MyRewardsList() {
  const { rewards, isLoading, isInitialized, fetchRewards } = useRewardsStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      fetchRewards();
    }
  }, [isAuthenticated, isInitialized, fetchRewards]);

  if (isLoading || !isInitialized) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[var(--color-dark-3)] rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[var(--color-dark-4)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[var(--color-dark-4)] rounded w-32" />
                <div className="h-3 bg-[var(--color-dark-4)] rounded w-48" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (rewards.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-5xl mb-4 block opacity-50">🎁</span>
        <p className="text-white/60 mb-2">No rewards yet</p>
        <p className="text-sm text-white/40">
          Earn XP and redeem rewards from the shop!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rewards.map((reward) => {
        const info = getRewardDisplayInfo(reward);
        const source = getSourceDisplay(reward.source);
        const expiringSoon = reward.expires_at && 
          new Date(reward.expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

        return (
          <div
            key={reward.id}
            className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--color-main-1)]/30 to-purple-500/30 flex items-center justify-center text-2xl">
                {info.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium">{info.name}</h4>
                    <p className="text-sm text-white/60">{info.description}</p>
                  </div>
                  {expiringSoon && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full whitespace-nowrap">
                      Expiring soon
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-dark-3)]">
                  <span className="text-xs text-white/40">From {source}</span>
                  {reward.expires_at && (
                    <span className="text-xs text-white/40">
                      Expires {new Date(reward.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Reward } from "@/types/gamification";
import { Button } from "@/components/ui";
import type { VIPTier } from "@/types/vip";

// Skeleton loader for the reward card
export function RewardShopCardSkeleton() {
  return (
    <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] animate-pulse h-full">
      <div className="p-5 h-full flex flex-col">
        {/* Header skeleton */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-[var(--color-dark-3)] rounded" />
        </div>

        {/* Name skeleton */}
        <div className="h-6 w-3/4 bg-[var(--color-dark-3)] rounded mb-2" />

        {/* Description skeleton */}
        <div className="h-4 w-full bg-[var(--color-dark-3)] rounded mb-1" />
        <div className="h-4 w-2/3 bg-[var(--color-dark-3)] rounded mb-4" />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Cost and action skeleton */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-[var(--color-dark-3)] rounded" />
            <div className="h-7 w-16 bg-[var(--color-dark-3)] rounded" />
          </div>
          <div className="h-9 w-24 bg-[var(--color-dark-3)] rounded" />
        </div>

        {/* Progress skeleton - for consistent height */}
        <div className="mt-3 pt-3 border-t border-[var(--color-dark-3)]">
          <div className="flex justify-between mb-1">
            <div className="h-3 w-16 bg-[var(--color-dark-3)] rounded" />
            <div className="h-3 w-20 bg-[var(--color-dark-3)] rounded" />
          </div>
          <div className="h-1 bg-[var(--color-dark-4)] rounded" />
        </div>
      </div>
    </div>
  );
}

// Extended reward type with lock info and badge requirements
interface ExtendedReward extends Reward {
  isLocked?: boolean;
  requiredTierName?: string;
  required_tier?: VIPTier;
  // Badge-specific fields
  isBadge?: boolean;
  requiredOrders?: number;
  hasEnoughOrders?: boolean;
  isAlreadyOwned?: boolean;
  isBadgeLocked?: boolean;
}

interface RewardShopCardProps {
  reward: ExtendedReward;
  userXP: number;
  userOrderCount?: number;
  onRedeem?: () => void;
  isRedeeming?: boolean;
  className?: string;
}

export function RewardShopCard({
  reward,
  userXP,
  userOrderCount = 0,
  onRedeem,
  isRedeeming = false,
  className,
}: RewardShopCardProps) {
  const canAfford = userXP >= reward.xp_cost;
  const isOutOfStock = reward.stock !== null && reward.stock <= 0;
  const isLocked = reward.isLocked || false;
  
  // Badge-specific states
  const isBadge = reward.isBadge || false;
  const isBadgeLocked = reward.isBadgeLocked || false;
  const isAlreadyOwned = reward.isAlreadyOwned || false;
  const requiredOrders = reward.requiredOrders || 0;

  // Category styling
  const categoryConfig: Record<
    string,
    { icon: string; color: string; gradient: string }
  > = {
    discount: {
      icon: "🏷️",
      color: "#22c55e",
      gradient: "from-green-500/20 to-transparent",
    },
    shipping: {
      icon: "🚚",
      color: "#3b82f6",
      gradient: "from-blue-500/20 to-transparent",
    },
    xp_booster: {
      icon: "⚡",
      color: "#f59e0b",
      gradient: "from-yellow-500/20 to-transparent",
    },
    cosmetic: {
      icon: "✨",
      color: "#8b5cf6",
      gradient: "from-purple-500/20 to-transparent",
    },
    exclusive: {
      icon: "👑",
      color: "#ef4444",
      gradient: "from-red-500/20 to-transparent",
    },
    spin: {
      icon: "🎡",
      color: "#ec4899",
      gradient: "from-pink-500/20 to-transparent",
    },
  };

  const config = categoryConfig[reward.category] || categoryConfig.discount;

  // Determine if card should be locked visually
  const isVisuallyLocked = isLocked || isBadgeLocked;
  const canPurchase = canAfford && !isOutOfStock && !isLocked && !isBadgeLocked && !isAlreadyOwned;

  return (
    <motion.div
      whileHover={{ scale: canPurchase ? 1.02 : 1 }}
      className={cn(
        "relative group overflow-hidden h-full",
        "bg-[var(--color-dark-2)] border transition-all duration-300",
        isAlreadyOwned
          ? "border-green-500/50 opacity-80"
          : isVisuallyLocked
          ? "border-[var(--color-dark-4)] opacity-70"
          : canAfford && !isOutOfStock
          ? "border-[var(--color-dark-3)] hover:border-[var(--color-main-1)]"
          : "border-[var(--color-dark-4)] opacity-60",
        className
      )}
    >
      {/* Background gradient */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity",
          isVisuallyLocked ? "from-gray-500/10 to-transparent" : config.gradient
        )}
      />

      {/* Already owned overlay */}
      {isAlreadyOwned && (
        <div className="absolute inset-0 bg-green-950/95 z-10 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center px-4 py-6 bg-green-900/50 rounded-lg border border-green-500/30">
            <div className="text-4xl mb-3">✅</div>
            <div className="text-base font-bold text-green-400">
              Already Owned
            </div>
            <div className="text-sm text-green-300/70 mt-2">
              You already have this badge
            </div>
          </div>
        </div>
      )}

      {/* Badge locked overlay (needs more orders) */}
      {isBadgeLocked && !isAlreadyOwned && (
        <div className="absolute inset-0 bg-black/90 z-10 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center px-4 py-6 bg-[var(--color-dark-2)] rounded-lg border border-orange-500/30">
            <div className="text-4xl mb-3">🛒</div>
            <div className="text-base font-bold text-orange-400">
              {requiredOrders} Order{requiredOrders !== 1 ? 's' : ''} Required
            </div>
            <div className="text-sm text-white/70 mt-2">
              You have {userOrderCount} order{userOrderCount !== 1 ? 's' : ''}
            </div>
            {userOrderCount > 0 && (
              <div className="text-xs text-orange-300 mt-1">
                {requiredOrders - userOrderCount} more needed
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIP tier locked overlay */}
      {isLocked && !isBadgeLocked && !isAlreadyOwned && (
        <div className="absolute inset-0 bg-black/90 z-10 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center px-4 py-6 bg-[var(--color-dark-2)] rounded-lg border border-purple-500/30">
            <div className="text-4xl mb-3">🔒</div>
            <div className="text-base font-bold text-purple-400">
              {reward.requiredTierName || "VIP"} Required
            </div>
            <div className="text-sm text-white/70 mt-2">
              Purchase the required badge to unlock
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative p-5 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          {/* Icon */}
          <div
            className={cn(
              "w-12 h-12 flex items-center justify-center text-2xl border",
              (isVisuallyLocked || isAlreadyOwned) && "grayscale"
            )}
            style={{ borderColor: `${config.color}50`, background: `${config.color}10` }}
          >
            {config.icon}
          </div>

          {/* Badge order requirement indicator */}
          {isBadge && !isAlreadyOwned ? (
            <span className={cn(
              "px-2 py-0.5 text-xs",
              isBadgeLocked
                ? "bg-red-500/20 text-red-400"
                : "bg-green-500/20 text-green-400"
            )}>
              {isBadgeLocked 
                ? `🛒 ${requiredOrders}+ orders`
                : `✓ ${requiredOrders}+ orders`
              }
            </span>
          ) : isAlreadyOwned ? (
            <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400">
              ✓ Owned
            </span>
          ) : isLocked && reward.required_tier ? (
            <span className={cn(
              "px-2 py-0.5 text-xs uppercase tracking-wider",
              reward.required_tier === "platinum" ? "bg-amber-500/20 text-amber-400"
                : reward.required_tier === "gold" ? "bg-yellow-500/20 text-yellow-400"
                : "bg-orange-500/20 text-orange-400"
            )}>
              {reward.required_tier === "platinum" ? "✨" : reward.required_tier === "gold" ? "👑" : "🔥"} {reward.requiredTierName}
            </span>
          ) : reward.stock !== null ? (
            <span
              className={cn(
                "px-2 py-0.5 text-xs uppercase tracking-wider",
                isOutOfStock
                  ? "bg-red-500/20 text-red-500"
                  : "bg-[var(--color-dark-3)] text-white/60"
              )}
            >
              {isOutOfStock ? "Sold Out" : `${reward.stock} left`}
            </span>
          ) : null}
        </div>

        {/* Name */}
        <h3 className="font-heading text-lg mb-1">{reward.name}</h3>

        {/* Description */}
        <p className="text-sm text-white/50 mb-4 line-clamp-2">
          {reward.description}
        </p>

        {/* Spacer to push footer to bottom */}
        <div className="flex-1" />

        {/* Cost and action */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-base">⚡</span>
            <span
              className={cn(
                "font-heading text-lg",
                canAfford ? "text-[var(--color-main-1)]" : "text-white/40"
              )}
            >
              {reward.xp_cost.toLocaleString()}
            </span>
            <span className="text-xs text-white/40 uppercase">XP</span>
          </div>

          <Button
            variant={canPurchase ? "primary" : "outline"}
            size="sm"
            onClick={onRedeem}
            disabled={!canPurchase || isRedeeming}
            className="whitespace-nowrap"
          >
            {isRedeeming ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            ) : isAlreadyOwned ? "Owned" : isBadgeLocked ? "Need Orders" : isLocked ? "Locked" : isOutOfStock ? "Unavailable" : canAfford ? "Redeem" : "Need More XP"}
          </Button>
        </div>

        {/* Progress to afford (if can't afford) - Always reserve space for consistent height */}
        <div className={cn(
          "mt-3 pt-3 border-t border-[var(--color-dark-3)]",
          canAfford && "invisible"
        )}>
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>Your XP: {userXP.toLocaleString()}</span>
            <span>Need: {(reward.xp_cost - userXP).toLocaleString()} more</span>
          </div>
          <div className="h-1 bg-[var(--color-dark-4)] overflow-hidden">
            <div
              className="h-full bg-[var(--color-main-1)]"
              style={{ width: `${Math.min((userXP / reward.xp_cost) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Hover glow */}
      {canPurchase && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${config.color}10 0%, transparent 70%)`,
          }}
        />
      )}
    </motion.div>
  );
}


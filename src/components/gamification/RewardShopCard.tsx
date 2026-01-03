"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Reward } from "@/types/gamification";
import { Button } from "@/components/ui";

// Skeleton loader for the reward card
export function RewardShopCardSkeleton() {
  return (
    <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] animate-pulse">
      <div className="p-5">
        {/* Header skeleton */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-[var(--color-dark-3)] rounded" />
        </div>

        {/* Name skeleton */}
        <div className="h-6 w-3/4 bg-[var(--color-dark-3)] rounded mb-2" />

        {/* Description skeleton */}
        <div className="h-4 w-full bg-[var(--color-dark-3)] rounded mb-1" />
        <div className="h-4 w-2/3 bg-[var(--color-dark-3)] rounded mb-4" />

        {/* Cost and action skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-[var(--color-dark-3)] rounded" />
            <div className="h-7 w-16 bg-[var(--color-dark-3)] rounded" />
          </div>
          <div className="h-9 w-24 bg-[var(--color-dark-3)] rounded" />
        </div>
      </div>
    </div>
  );
}

interface RewardShopCardProps {
  reward: Reward;
  userXP: number;
  onRedeem?: () => void;
  isRedeeming?: boolean;
  className?: string;
}

export function RewardShopCard({
  reward,
  userXP,
  onRedeem,
  isRedeeming = false,
  className,
}: RewardShopCardProps) {
  const canAfford = userXP >= reward.xp_cost;
  const isOutOfStock = reward.stock !== null && reward.stock <= 0;

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

  return (
    <motion.div
      whileHover={{ scale: canAfford && !isOutOfStock ? 1.02 : 1 }}
      className={cn(
        "relative group overflow-hidden",
        "bg-[var(--color-dark-2)] border transition-all duration-300",
        canAfford && !isOutOfStock
          ? "border-[var(--color-dark-3)] hover:border-[var(--color-main-1)]"
          : "border-[var(--color-dark-4)] opacity-60",
        className
      )}
    >
      {/* Background gradient */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity",
          config.gradient
        )}
      />

      {/* Content */}
      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          {/* Icon */}
          <div
            className="w-12 h-12 flex items-center justify-center text-2xl border"
            style={{ borderColor: `${config.color}50`, background: `${config.color}10` }}
          >
            {config.icon}
          </div>

          {/* Stock badge */}
          {reward.stock !== null && (
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
          )}
        </div>

        {/* Name */}
        <h3 className="font-heading text-lg mb-1">{reward.name}</h3>

        {/* Description */}
        <p className="text-sm text-white/50 mb-4 line-clamp-2">
          {reward.description}
        </p>

        {/* Cost and action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span
              className={cn(
                "font-heading text-xl",
                canAfford ? "text-[var(--color-main-1)]" : "text-white/40"
              )}
            >
              {reward.xp_cost.toLocaleString()}
            </span>
            <span className="text-xs text-white/40 uppercase">XP</span>
          </div>

          <Button
            variant={canAfford && !isOutOfStock ? "primary" : "outline"}
            size="sm"
            onClick={onRedeem}
            disabled={!canAfford || isOutOfStock || isRedeeming}
            className="min-w-[100px]"
          >
            {isRedeeming ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            ) : isOutOfStock ? "Unavailable" : canAfford ? "Redeem" : "Need More XP"}
          </Button>
        </div>

        {/* Progress to afford (if can't afford) */}
        {!canAfford && !isOutOfStock && (
          <div className="mt-3 pt-3 border-t border-[var(--color-dark-3)]">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>Your XP: {userXP.toLocaleString()}</span>
              <span>Need: {(reward.xp_cost - userXP).toLocaleString()} more</span>
            </div>
            <div className="h-1 bg-[var(--color-dark-4)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-main-1)]"
                style={{ width: `${(userXP / reward.xp_cost) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Hover glow */}
      {canAfford && !isOutOfStock && (
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


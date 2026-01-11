"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useShippingThreshold, SHIPPING_TIERS } from "@/hooks/useShippingThreshold";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface FreeDeliveryIndicatorProps {
  subtotal: number;
  variant?: "default" | "compact";
  showVIPBenefits?: boolean;
}

export function FreeDeliveryIndicator({ 
  subtotal, 
  variant = "default",
  showVIPBenefits = false,
}: FreeDeliveryIndicatorProps) {
  const { 
    threshold: freeShippingThreshold, 
    isVIP, 
    vipTier,
    tierInfo,
    calculateFee,
    getShippingInfo,
    standardFee,
    reducedFee,
    midThreshold,
    regularThreshold,
    bronzeThreshold,
    goldThreshold,
    platinumThreshold,
  } = useShippingThreshold();

  const shippingInfo = getShippingInfo(subtotal);
  const currentFee = calculateFee(subtotal);

  const { progress, amountRemaining, isFreeShipping } = useMemo(() => {
    const remaining = freeShippingThreshold - subtotal;
    const progressPercent = Math.min((subtotal / freeShippingThreshold) * 100, 100);
    
    return {
      progress: progressPercent,
      amountRemaining: Math.max(0, remaining),
      isFreeShipping: subtotal >= freeShippingThreshold,
    };
  }, [subtotal, freeShippingThreshold]);

  if (variant === "compact") {
    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-4 rounded-sm">
        <div className="flex items-center gap-3 mb-3">
          {/* Truck Icon */}
          <div className={`p-2 rounded-full ${isFreeShipping ? 'bg-[var(--color-main-2)]/20 text-[var(--color-main-2)]' : 'bg-[var(--color-main-1)]/20 text-[var(--color-main-1)]'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 5h4m4 0h2m-2 0a2 2 0 110-4h2a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-4a2 2 0 012-2h2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </div>
          
          <div className="flex-1">
            {isFreeShipping ? (
              <p className="text-sm font-medium text-[var(--color-main-2)]">
                🎉 You&apos;ve unlocked FREE delivery!
              </p>
            ) : (
              <div>
                <p className="text-sm">
                  {shippingInfo.amountToNextTier && shippingInfo.nextTierThreshold === freeShippingThreshold ? (
                    <>Add <span className="font-bold text-[var(--color-main-1)]">{formatPrice(amountRemaining)}</span> for <span className="font-bold text-[var(--color-main-2)]">FREE</span> delivery</>
                  ) : shippingInfo.amountToNextTier ? (
                    <>Add <span className="font-bold text-[var(--color-main-1)]">{formatPrice(shippingInfo.amountToNextTier)}</span> to save <span className="font-bold text-[var(--color-main-2)]">{formatPrice(standardFee - reducedFee)}</span> on shipping</>
                  ) : null}
                </p>
                <p className="text-xs text-white/50 mt-0.5">
                  Current delivery: {formatPrice(currentFee)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 bg-[var(--color-dark-4)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`absolute left-0 top-0 h-full rounded-full ${
              isFreeShipping 
                ? 'bg-gradient-to-r from-[var(--color-main-2)] to-[#4ade80]' 
                : 'bg-gradient-to-r from-[var(--color-main-1)] to-[var(--color-main-2)]'
            }`}
          />
          {/* Animated sparkles when free shipping */}
          {isFreeShipping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
          )}
        </div>

        {/* Progress labels */}
        <div className="flex justify-between mt-2 text-xs text-[var(--muted-foreground)]">
          <span>R0</span>
          <span>{formatPrice(freeShippingThreshold)}</span>
        </div>
      </div>
    );
  }

  // Default (larger) variant for cart page
  return (
    <div className="bg-gradient-to-br from-[var(--color-dark-2)] to-[var(--color-dark-1)] border border-[var(--color-dark-3)] p-6 rounded-sm">
      <div className="flex items-start gap-4 mb-4">
        {/* Animated Truck */}
        <motion.div 
          className={`p-3 rounded-lg ${isFreeShipping ? 'bg-[var(--color-main-2)]/20' : 'bg-[var(--color-main-1)]/20'}`}
          animate={isFreeShipping ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5, repeat: isFreeShipping ? Infinity : 0, repeatDelay: 2 }}
        >
          <svg 
            className={`w-8 h-8 ${isFreeShipping ? 'text-[var(--color-main-2)]' : 'text-[var(--color-main-1)]'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h8m-8 5h4m4 0h2m-2 0a2 2 0 110-4h2a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-4a2 2 0 012-2h2" />
            <circle cx="9" cy="17" r="2" strokeWidth={1.5} />
            <circle cx="15" cy="17" r="2" strokeWidth={1.5} />
          </svg>
        </motion.div>
        
        <div className="flex-1">
          {isFreeShipping ? (
            <>
              <motion.p 
                className="text-lg font-heading text-[var(--color-main-2)]"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 0.5 }}
              >
                🎉 FREE Delivery Unlocked!
              </motion.p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {isVIP ? (
                  <span className={tierInfo.color}>{tierInfo.icon} {tierInfo.name} perk applied!</span>
                ) : (
                  "Your order qualifies for free shipping"
                )}
              </p>
            </>
          ) : (
            <>
              <p className="font-heading">
                <span className="text-[var(--color-main-1)]">{formatPrice(amountRemaining)}</span> away from FREE delivery
              </p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {isVIP ? (
                  <span className={tierInfo.color}>{tierInfo.icon} {tierInfo.name}: Free shipping at {formatPrice(freeShippingThreshold)}+</span>
                ) : (
                  <>Orders over {formatPrice(freeShippingThreshold)} ship free!</>
                )}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar with tier markers */}
      <div className="relative">
        <div className="relative h-3 bg-[var(--color-dark-4)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`absolute left-0 top-0 h-full rounded-full ${
              isFreeShipping 
                ? 'bg-gradient-to-r from-[var(--color-main-2)] to-[#4ade80]' 
                : 'bg-gradient-to-r from-[var(--color-main-1)] via-[var(--color-main-3)] to-[var(--color-main-2)]'
            }`}
          />
          {/* Shine effect */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="absolute top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
        </div>

        {/* Milestone markers */}
        <div className="flex justify-between mt-3">
          <div className="text-center">
            <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${progress > 0 ? 'bg-[var(--color-main-1)]' : 'bg-[var(--color-dark-4)]'}`} />
            <span className="text-xs text-[var(--muted-foreground)]">R0</span>
          </div>
          {/* R590 marker - reduced shipping */}
          <div className="text-center" style={{ marginLeft: `${(midThreshold / freeShippingThreshold) * 100 - 8}%` }}>
            <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${subtotal >= midThreshold ? 'bg-amber-500' : 'bg-[var(--color-dark-4)]'}`} />
            <span className={`text-xs ${subtotal >= midThreshold ? 'text-amber-400' : 'text-[var(--muted-foreground)]'}`}>
              {formatPrice(midThreshold)}
            </span>
          </div>
          <div className="text-center">
            <motion.div 
              className={`w-3 h-3 rounded-full mx-auto mb-1 ${isFreeShipping ? 'bg-[var(--color-main-2)]' : 'bg-[var(--color-dark-4)]'}`}
              animate={isFreeShipping ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.5, repeat: isFreeShipping ? 3 : 0 }}
            />
            <span className={`text-xs ${isFreeShipping ? 'text-[var(--color-main-2)] font-bold' : 'text-[var(--muted-foreground)]'}`}>
              {formatPrice(freeShippingThreshold)}
            </span>
          </div>
        </div>
      </div>

      {/* Current shipping cost & tier info */}
      {!isFreeShipping && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between items-center text-sm bg-[var(--color-dark-3)]/50 px-3 py-2 rounded">
            <span className="text-white/60">Current delivery fee:</span>
            <span className="font-bold text-white">{formatPrice(currentFee)}</span>
          </div>
          
          {/* Show savings opportunity */}
          {subtotal < midThreshold && (
            <p className="text-xs text-center text-amber-400">
              💡 Add {formatPrice(midThreshold - subtotal)} to reduce shipping to {formatPrice(reducedFee)}
            </p>
          )}
        </div>
      )}

      {/* VIP Benefits section */}
      {(showVIPBenefits || (!isVIP && subtotal >= 500)) && !isVIP && (
        <div className="mt-4 pt-4 border-t border-[var(--color-dark-3)]">
          <p className="text-xs text-center text-white/50 mb-3">
            🎁 VIP Members get lower free shipping thresholds!
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 bg-orange-500/10 rounded border border-orange-500/20">
              <span className="block text-orange-400">🔥 Bronze</span>
              <span className="text-white/70">Free at {formatPrice(bronzeThreshold)}</span>
            </div>
            <div className="text-center p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
              <span className="block text-yellow-400">👑 Gold</span>
              <span className="text-white/70">Free at {formatPrice(goldThreshold)}</span>
            </div>
            <div className="text-center p-2 bg-amber-500/10 rounded border border-amber-500/20">
              <span className="block text-amber-400">✨ Platinum</span>
              <span className="text-white/70">Free at {formatPrice(platinumThreshold)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Show VIP advantage if VIP */}
      {isVIP && !isFreeShipping && freeShippingThreshold < regularThreshold && (
        <div className="mt-4 pt-4 border-t border-[var(--color-dark-3)]">
          <p className="text-xs text-center">
            <span className={tierInfo.color}>{tierInfo.icon} {tierInfo.name} Perk:</span>{" "}
            <span className="text-white/60">
              You save {formatPrice(regularThreshold - freeShippingThreshold)} on your free shipping threshold!
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Shipping tier breakdown component for info pages
 */
export function ShippingTierBreakdown({ className }: { className?: string }) {
  const { 
    isVIP, 
    vipTier, 
    tierInfo,
    standardFee,
    reducedFee,
    midThreshold,
    regularThreshold,
    bronzeThreshold,
    goldThreshold,
    platinumThreshold,
  } = useShippingThreshold();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Standard Shipping Tiers */}
      <div>
        <h3 className="font-heading text-lg mb-4 flex items-center gap-2">
          <span>📦</span> Standard Shipping Rates
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-[var(--color-dark-3)] rounded">
            <span className="text-white/70">Below {formatPrice(midThreshold)}</span>
            <span className="font-bold">{formatPrice(standardFee)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-[var(--color-dark-3)] rounded">
            <span className="text-white/70">{formatPrice(midThreshold)} - {formatPrice(regularThreshold - 1)}</span>
            <span className="font-bold text-amber-400">{formatPrice(reducedFee)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/30 rounded">
            <span className="text-white/70">{formatPrice(regularThreshold)}+</span>
            <span className="font-bold text-green-400">FREE</span>
          </div>
        </div>
      </div>

      {/* VIP Free Shipping Thresholds */}
      <div>
        <h3 className="font-heading text-lg mb-4 flex items-center gap-2">
          <span>👑</span> VIP Free Shipping Thresholds
        </h3>
        <p className="text-sm text-white/50 mb-4">
          VIP members unlock lower free shipping thresholds!
        </p>
        <div className="space-y-2">
          <div className={cn(
            "flex justify-between items-center p-3 rounded border",
            vipTier === "bronze" 
              ? "bg-orange-500/20 border-orange-500/50" 
              : "bg-[var(--color-dark-3)] border-transparent"
          )}>
            <span className="flex items-center gap-2">
              <span>🔥</span>
              <span className="text-orange-400">Bronze VIP</span>
              {vipTier === "bronze" && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded">Your Tier</span>}
            </span>
            <span className="font-bold">Free at {formatPrice(bronzeThreshold)}+</span>
          </div>
          <div className={cn(
            "flex justify-between items-center p-3 rounded border",
            vipTier === "gold" 
              ? "bg-yellow-500/20 border-yellow-500/50" 
              : "bg-[var(--color-dark-3)] border-transparent"
          )}>
            <span className="flex items-center gap-2">
              <span>👑</span>
              <span className="text-yellow-400">Gold VIP</span>
              {vipTier === "gold" && <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded">Your Tier</span>}
            </span>
            <span className="font-bold">Free at {formatPrice(goldThreshold)}+</span>
          </div>
          <div className={cn(
            "flex justify-between items-center p-3 rounded border",
            vipTier === "platinum" 
              ? "bg-amber-500/20 border-amber-400/50" 
              : "bg-[var(--color-dark-3)] border-transparent"
          )}>
            <span className="flex items-center gap-2">
              <span>✨</span>
              <span className="text-amber-400">Platinum VIP</span>
              {vipTier === "platinum" && <span className="text-xs bg-amber-400 text-black px-2 py-0.5 rounded">Your Tier</span>}
            </span>
            <span className="font-bold">Free at {formatPrice(platinumThreshold)}+</span>
          </div>
        </div>
        
        {!isVIP && (
          <p className="text-xs text-center text-white/40 mt-4">
            Become a VIP to unlock lower free shipping thresholds!
          </p>
        )}
      </div>
    </div>
  );
}

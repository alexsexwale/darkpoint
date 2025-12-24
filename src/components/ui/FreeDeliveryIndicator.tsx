"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

interface FreeDeliveryIndicatorProps {
  subtotal: number;
  variant?: "default" | "compact";
}

export function FreeDeliveryIndicator({ subtotal, variant = "default" }: FreeDeliveryIndicatorProps) {
  const { progress, amountRemaining, isFreeShipping } = useMemo(() => {
    const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
    const progressPercent = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
    
    return {
      progress: progressPercent,
      amountRemaining: Math.max(0, remaining),
      isFreeShipping: subtotal >= FREE_SHIPPING_THRESHOLD,
    };
  }, [subtotal]);

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
              <p className="text-sm">
                Add <span className="font-bold text-[var(--color-main-1)]">{formatPrice(amountRemaining)}</span> for <span className="font-bold text-[var(--color-main-2)]">FREE</span> delivery
              </p>
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
          <span>{formatPrice(FREE_SHIPPING_THRESHOLD)}</span>
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
                Your order qualifies for free shipping
              </p>
            </>
          ) : (
            <>
              <p className="font-heading">
                <span className="text-[var(--color-main-1)]">{formatPrice(amountRemaining)}</span> away from FREE delivery
              </p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Orders over {formatPrice(FREE_SHIPPING_THRESHOLD)} ship free!
              </p>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
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
          <div className="text-center">
            <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${progress >= 50 ? 'bg-[var(--color-main-3)]' : 'bg-[var(--color-dark-4)]'}`} />
            <span className="text-xs text-[var(--muted-foreground)]">{formatPrice(FREE_SHIPPING_THRESHOLD / 2)}</span>
          </div>
          <div className="text-center">
            <motion.div 
              className={`w-3 h-3 rounded-full mx-auto mb-1 ${isFreeShipping ? 'bg-[var(--color-main-2)]' : 'bg-[var(--color-dark-4)]'}`}
              animate={isFreeShipping ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.5, repeat: isFreeShipping ? 3 : 0 }}
            />
            <span className={`text-xs ${isFreeShipping ? 'text-[var(--color-main-2)] font-bold' : 'text-[var(--muted-foreground)]'}`}>
              {formatPrice(FREE_SHIPPING_THRESHOLD)}
            </span>
          </div>
        </div>
      </div>

      {/* Current shipping cost indicator */}
      {!isFreeShipping && (
        <p className="text-center text-xs text-[var(--muted-foreground)] mt-4">
          Current delivery fee: <span className="text-white">{formatPrice(STANDARD_SHIPPING_FEE)}</span>
        </p>
      )}
    </div>
  );
}



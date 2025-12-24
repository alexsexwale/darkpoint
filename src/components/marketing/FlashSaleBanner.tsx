"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CountdownTimer } from "./CountdownTimer";
import { Button } from "@/components/ui";

interface FlashSaleBannerProps {
  className?: string;
  title?: string;
  discount?: number;
  endTime?: Date | string;
  link?: string;
}

export function FlashSaleBanner({
  className,
  title = "Flash Sale",
  discount = 20,
  endTime,
  link = "/store",
}: FlashSaleBannerProps) {
  const [isExpired, setIsExpired] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Default to 24 hours from now if no end time provided
  const saleEndTime = endTime || new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (isExpired || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "relative overflow-hidden bg-gradient-to-r from-[var(--color-main-5)] via-[var(--color-main-1)] to-[var(--color-main-5)]",
          className
        )}
      >
        {/* Animated background stripes */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ x: [0, -100] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 flex"
            style={{
              background: `repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 10px,
                rgba(255,255,255,0.1) 10px,
                rgba(255,255,255,0.1) 20px
              )`,
              width: "200%",
            }}
          />
        </div>

        {/* Content */}
        <div className="container relative py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-white">
            {/* Lightning icon */}
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-2xl"
            >
              ⚡
            </motion.span>

            {/* Title & discount */}
            <div className="text-center sm:text-left">
              <span className="font-heading text-lg sm:text-xl uppercase tracking-wider">
                {title}
              </span>
              <span className="mx-2 text-white/60">|</span>
              <span className="text-xl sm:text-2xl font-heading">
                {discount}% OFF
              </span>
            </div>

            {/* Countdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-white/80 hidden sm:inline">
                Ends in:
              </span>
              <CountdownTimer
                endTime={saleEndTime}
                variant="compact"
                showLabels={false}
                onComplete={() => setIsExpired(true)}
              />
            </div>

            {/* CTA */}
            <Link href={link}>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/30 hover:bg-white hover:text-black"
              >
                Shop Now
              </Button>
            </Link>

            {/* Lightning icon */}
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
              className="text-2xl hidden sm:inline"
            >
              ⚡
            </motion.span>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-1/2 right-4 -translate-y-1/2 p-1 text-white/60 hover:text-white transition-colors cursor-pointer"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}


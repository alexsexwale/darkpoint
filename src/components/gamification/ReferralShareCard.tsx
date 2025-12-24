"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGamificationStore } from "@/stores";
import { SITE_URL, SITE_NAME } from "@/lib/constants";

interface ReferralShareCardProps {
  className?: string;
  variant?: "compact" | "full";
}

export function ReferralShareCard({ className, variant = "full" }: ReferralShareCardProps) {
  const { userProfile } = useGamificationStore();
  const [copied, setCopied] = useState(false);

  if (!userProfile) return null;

  const referralCode = userProfile.referral_code || "LOADING";
  const referralLink = `${SITE_URL}/ref/${referralCode}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (variant === "compact") {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={cn(
          "bg-gradient-to-r from-[var(--color-main-1)]/20 to-transparent border border-[var(--color-main-1)]/30 p-4 cursor-pointer",
          className
        )}
        onClick={copyToClipboard}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎁</span>
            <div>
              <p className="text-sm font-heading">Refer & Earn</p>
              <p className="text-xs text-white/60">Share with friends</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[var(--color-main-1)] font-heading">{referralCode}</p>
            <p className="text-xs text-white/40">{copied ? "Copied!" : "Tap to copy"}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-[var(--color-main-1)]/20 via-[var(--color-dark-2)] to-[var(--color-dark-2)] border border-[var(--color-main-1)]/30 p-6",
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[var(--color-main-1)]/10 rounded-full blur-xl" />

      {/* Content */}
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-3xl mb-2 block">🎁</span>
            <h3 className="font-heading text-xl mb-1">Invite Friends</h3>
            <p className="text-sm text-white/60">
              Earn R{50} for each friend who signs up!
            </p>
          </div>
        </div>

        {/* Referral code display */}
        <div className="bg-[var(--color-dark-1)] border border-[var(--color-dark-3)] p-4 mb-4">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Your Code</p>
          <div className="flex items-center justify-between">
            <span className="font-heading text-2xl text-[var(--color-main-1)]">
              {referralCode}
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={copyToClipboard}
              className={cn(
                "px-4 py-2 text-sm font-heading uppercase tracking-wider transition-colors cursor-pointer",
                copied
                  ? "bg-green-500 text-white"
                  : "bg-[var(--color-main-1)] text-white hover:bg-[var(--color-main-1)]/80"
              )}
            >
              {copied ? "Copied!" : "Copy"}
            </motion.button>
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span className="text-white/70">You get R50 store credit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span className="text-white/70">Friends get 10% off first order</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span className="text-white/70">Unlock exclusive referral badges</span>
          </div>
        </div>
      </div>
    </div>
  );
}


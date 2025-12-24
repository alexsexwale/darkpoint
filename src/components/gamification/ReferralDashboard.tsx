"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGamificationStore } from "@/stores";
import { getReferralTier, REFERRAL_TIERS } from "@/types/gamification";
import { Button } from "@/components/ui";
import { SITE_URL } from "@/lib/constants";

interface ReferralDashboardProps {
  className?: string;
}

export function ReferralDashboard({ className }: ReferralDashboardProps) {
  const { userProfile } = useGamificationStore();
  const [copied, setCopied] = useState(false);

  if (!userProfile) return null;

  const referralCode = userProfile.referral_code || "LOADING";
  const referralCount = userProfile.referral_count;
  const currentTier = getReferralTier(referralCount);
  const nextTier = REFERRAL_TIERS.find((t) => t.minReferrals > referralCount);
  const referralLink = `${SITE_URL}/ref/${referralCode}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareOnSocial = (platform: "twitter" | "facebook" | "whatsapp") => {
    const text = "Check out this awesome gaming store! Use my referral link for exclusive rewards:";
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${referralLink}`)}`,
    };
    window.open(urls[platform], "_blank", "width=600,height=400");
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats overview */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Total referrals */}
        <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 text-center">
          <div className="text-4xl font-heading text-[var(--color-main-1)] mb-2">
            {referralCount}
          </div>
          <p className="text-sm text-white/60">Total Referrals</p>
        </div>

        {/* Current tier */}
        <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 text-center">
          <div className="text-4xl mb-2">{currentTier.badge}</div>
          <p className="text-sm text-white/60">{currentTier.name} Tier</p>
        </div>

        {/* Earnings */}
        <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 text-center">
          <div className="text-4xl font-heading text-green-500 mb-2">
            R{(userProfile.store_credit || 0).toFixed(0)}
          </div>
          <p className="text-sm text-white/60">Store Credit Earned</p>
        </div>
      </div>

      {/* Referral link section */}
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6">
        <h3 className="font-heading text-xl mb-4">Your Referral Link</h3>

        {/* Link display */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white text-sm"
          />
          <Button
            variant={copied ? "primary" : "outline"}
            onClick={() => copyToClipboard(referralLink)}
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        {/* Referral code */}
        <div className="flex items-center justify-between p-4 bg-[var(--color-dark-3)] mb-6">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Your Code</p>
            <p className="font-heading text-xl text-[var(--color-main-1)]">{referralCode}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => copyToClipboard(referralCode)}>
            Copy Code
          </Button>
        </div>

        {/* Share buttons */}
        <div className="space-y-3">
          <p className="text-sm text-white/60">Share on social media:</p>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => shareOnSocial("twitter")}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1DA1F2] hover:bg-[#1DA1F2]/80 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
              Twitter
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => shareOnSocial("facebook")}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#4267B2] hover:bg-[#4267B2]/80 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => shareOnSocial("whatsapp")}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#25D366]/80 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </motion.button>
          </div>
        </div>
      </div>

      {/* Tier progress */}
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6">
        <h3 className="font-heading text-xl mb-4">Referral Tiers</h3>

        <div className="space-y-4">
          {REFERRAL_TIERS.map((tier, index) => {
            const isCurrentTier = tier.id === currentTier.id;
            const isCompleted = referralCount >= tier.minReferrals;
            const progress = isCompleted
              ? 100
              : (referralCount / tier.minReferrals) * 100;

            return (
              <div
                key={tier.id}
                className={cn(
                  "relative p-4 border transition-all",
                  isCurrentTier
                    ? "border-[var(--color-main-1)] bg-[var(--color-main-1)]/10"
                    : "border-[var(--color-dark-4)]"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{tier.badge}</span>
                    <div>
                      <p className="font-heading text-sm uppercase tracking-wider">
                        {tier.name}
                      </p>
                      <p className="text-xs text-white/40">
                        {tier.minReferrals}+ referrals
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[var(--color-main-1)] font-heading">
                      R{tier.rewardPerReferral}
                    </p>
                    <p className="text-xs text-white/40">per referral</p>
                  </div>
                </div>

                {/* Progress bar */}
                {!isCompleted && tier.id !== "bronze" && (
                  <div className="h-1 bg-[var(--color-dark-4)] mt-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progress, 100)}%` }}
                      className="h-full bg-[var(--color-main-1)]"
                    />
                  </div>
                )}

                {/* Completed checkmark */}
                {isCompleted && (
                  <div className="absolute top-4 right-4">
                    <span className="text-green-500">✓</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Next tier info */}
        {nextTier && (
          <div className="mt-4 pt-4 border-t border-[var(--color-dark-3)] text-center">
            <p className="text-sm text-white/60">
              {nextTier.minReferrals - referralCount} more referrals to reach{" "}
              <span className="text-[var(--color-main-1)]">{nextTier.name}</span> tier!
            </p>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6">
        <h3 className="font-heading text-xl mb-4">How It Works</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-[var(--color-main-1)]/20 rounded-full flex items-center justify-center text-2xl">
              1️⃣
            </div>
            <p className="font-heading text-sm mb-1">Share Your Link</p>
            <p className="text-xs text-white/40">
              Send your unique referral link to friends
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-[var(--color-main-1)]/20 rounded-full flex items-center justify-center text-2xl">
              2️⃣
            </div>
            <p className="font-heading text-sm mb-1">They Sign Up</p>
            <p className="text-xs text-white/40">
              Friends create an account using your link
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-[var(--color-main-1)]/20 rounded-full flex items-center justify-center text-2xl">
              3️⃣
            </div>
            <p className="font-heading text-sm mb-1">Both Get Rewards</p>
            <p className="text-xs text-white/40">
              You get credit, they get a welcome discount
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


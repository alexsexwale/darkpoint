"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AccountLayout } from "@/components/account";
import { ReferralDashboard } from "@/components/gamification";
import { Button } from "@/components/ui";
import { useAuthStore, useUIStore } from "@/stores";

export function ReferralsPageClient() {
  const { isAuthenticated, isInitialized: authInitialized } = useAuthStore();
  const { toggleSignIn } = useUIStore();

  // Show login prompt for unauthenticated users
  if (authInitialized && !isAuthenticated) {
    return (
      <div className="min-h-screen">
        <section className="relative py-8 md:py-16 overflow-hidden px-4">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 via-transparent to-[var(--color-main-1)]/5" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[var(--color-main-1)]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          </div>

          <div className="container relative max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8 md:mb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-6xl md:text-8xl mb-4"
              >
                🎁
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl sm:text-4xl md:text-5xl font-heading uppercase tracking-wider mb-3 md:mb-4"
              >
                <span className="text-green-500">Referral</span> Program
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-sm sm:text-base text-white/60 max-w-md mx-auto"
              >
                Invite friends and earn rewards when they make their first purchase!
              </motion.p>
            </div>

            {/* Login prompt card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-[var(--color-dark-2)] to-[var(--color-dark-1)] border border-green-500/30 rounded-lg p-6 md:p-10 text-center max-w-2xl mx-auto"
            >
              {/* Lock icon */}
              <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center">
                <svg className="w-10 h-10 md:w-12 md:h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <h2 className="text-2xl md:text-3xl font-heading mb-3">
                Get Your <span className="text-green-500">Referral Link</span>
              </h2>
              <p className="text-white/60 mb-6 max-w-md mx-auto">
                Sign in to get your unique referral code and start earning. Get <span className="text-green-500 font-semibold">R50 credit</span> for each friend who signs up!
              </p>

              {/* Benefits */}
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-[var(--color-dark-3)]/50 rounded-lg p-4">
                  <div className="text-3xl mb-2">💰</div>
                  <p className="text-sm font-medium">R50 Credit</p>
                  <p className="text-xs text-white/50">Per referral</p>
                </div>
                <div className="bg-[var(--color-dark-3)]/50 rounded-lg p-4">
                  <div className="text-3xl mb-2">⚡</div>
                  <p className="text-sm font-medium">500 XP</p>
                  <p className="text-xs text-white/50">Bonus per friend</p>
                </div>
                <div className="bg-[var(--color-dark-3)]/50 rounded-lg p-4">
                  <div className="text-3xl mb-2">🎯</div>
                  <p className="text-sm font-medium">No Limit</p>
                  <p className="text-xs text-white/50">Unlimited referrals</p>
                </div>
              </div>

              {/* How it works */}
              <div className="bg-[var(--color-dark-3)]/30 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-heading text-sm mb-3 text-center">How It Works</h4>
                <div className="space-y-2 text-sm text-white/60">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold">1</span>
                    <span>Share your unique referral link with friends</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold">2</span>
                    <span>They sign up and make their first purchase</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold">3</span>
                    <span>You both get R50 credit + bonus XP!</span>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={toggleSignIn}
                  size="lg"
                  className="min-w-[200px] text-base"
                >
                  Sign In / Register
                </Button>
                <Link href="/rewards">
                  <Button variant="outline" size="lg" className="min-w-[200px] text-base">
                    Back to Rewards
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <AccountLayout title="Referral Program">
      <ReferralDashboard />
    </AccountLayout>
  );
}


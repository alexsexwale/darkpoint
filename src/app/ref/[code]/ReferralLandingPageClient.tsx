"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { useAuthStore, useUIStore } from "@/stores";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface ReferralLandingPageClientProps {
  code: string;
}

interface ReferrerInfo {
  display_name: string | null;
  username: string | null;
  current_level: number;
  referral_count: number;
}

export function ReferralLandingPageClient({ code }: ReferralLandingPageClientProps) {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { openSignIn } = useUIStore();
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null);
  const [isValidCode, setIsValidCode] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Store referral code in session storage for signup
  useEffect(() => {
    if (code && !isAuthenticated) {
      sessionStorage.setItem("referralCode", code);
    }
  }, [code, isAuthenticated]);

  // Fetch referrer info
  useEffect(() => {
    async function fetchReferrerInfo() {
      if (!isSupabaseConfigured()) {
        setIsLoading(false);
        setIsValidCode(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("display_name, username, current_level, referral_count")
          .eq("referral_code", code)
          .single();

        if (error || !data) {
          setIsValidCode(false);
        } else {
          setReferrerInfo(data);
          setIsValidCode(true);
        }
      } catch {
        setIsValidCode(false);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReferrerInfo();
  }, [code]);

  const handleSignUp = () => {
    // Store referral code before opening sign in
    sessionStorage.setItem("referralCode", code);
    openSignIn();
  };

  // Loading state
  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-[var(--color-main-1)] border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-white/60">Loading referral...</p>
        </div>
      </div>
    );
  }

  // Invalid referral code
  if (isValidCode === false) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full text-center"
        >
          <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 md:p-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-7xl mb-6"
            >
              😕
            </motion.div>
            <h1 className="text-3xl font-heading uppercase tracking-wider mb-4">
              Invalid Referral Code
            </h1>
            <p className="text-white/60 mb-8">
              Oops! This referral code doesn&apos;t seem to be valid. It may have expired or been entered incorrectly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <Button variant="primary" size="lg">
                  Go to Homepage
                </Button>
              </Link>
              <Button variant="outline" size="lg" onClick={() => openSignIn()}>
                Sign Up Anyway
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // User is already logged in
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full text-center"
        >
          <div className="bg-gradient-to-br from-[var(--color-dark-2)] to-[var(--color-dark-1)] border border-[var(--color-main-1)]/30 p-8 md:p-12 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-main-1)]/5 to-transparent" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-main-1)]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-8xl mb-6"
              >
                🎉
              </motion.div>
              
              <h1 className="text-3xl md:text-4xl font-heading uppercase tracking-wider mb-4">
                Hey There, <span className="text-[var(--color-main-1)]">Legend!</span>
              </h1>
              
              <p className="text-white/70 text-lg mb-6">
                You&apos;re already part of the DarkPoint family! 
                {referrerInfo?.display_name && (
                  <> Your friend <span className="text-[var(--color-main-1)] font-semibold">{referrerInfo.display_name}</span> must be proud!</>
                )}
              </p>

              <div className="bg-[var(--color-dark-3)]/50 rounded-lg p-6 mb-8">
                <p className="text-white/60 mb-4">
                  Want to spread the love? Share YOUR referral code with friends and earn:
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl mb-1">⚡</div>
                    <div className="text-[var(--color-main-1)] font-heading text-lg">300 XP</div>
                    <div className="text-xs text-white/50">Per referral</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-1">🏆</div>
                    <div className="text-[var(--color-main-1)] font-heading text-lg">Badges</div>
                    <div className="text-xs text-white/50">Unlock achievements</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-1">🎁</div>
                    <div className="text-[var(--color-main-1)] font-heading text-lg">Bonuses</div>
                    <div className="text-xs text-white/50">Tier rewards</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/account/referrals">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto">
                    Get Your Referral Link →
                  </Button>
                </Link>
                <Link href="/rewards">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Explore Rewards
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Not logged in - Show referral welcome
  const referrerName = referrerInfo?.display_name || referrerInfo?.username || "A friend";

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-main-1)]/10 via-transparent to-[var(--color-main-1)]/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-main-1)]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="container relative max-w-4xl mx-auto px-4">
          {/* Referrer badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-3 bg-[var(--color-dark-2)] border border-[var(--color-main-1)]/30 px-6 py-3 rounded-full">
              <span className="text-2xl">👋</span>
              <span className="text-white/80">
                Invited by <span className="text-[var(--color-main-1)] font-semibold">{referrerName}</span>
              </span>
              {referrerInfo && referrerInfo.referral_count > 0 && (
                <span className="text-xs text-white/40">
                  ({referrerInfo.referral_count} referrals)
                </span>
              )}
            </div>
          </motion.div>

          {/* Main content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-heading uppercase tracking-wider mb-6">
              Welcome to{" "}
              <span className="text-[var(--color-main-1)]">DarkPoint</span>
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8">
              Your gateway to premium gaming gear, exclusive rewards, and an epic community of gamers!
            </p>
          </motion.div>

          {/* Bonus card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-[var(--color-dark-2)] to-[var(--color-dark-1)] border-2 border-[var(--color-main-1)] rounded-lg p-8 md:p-10 mb-12 relative overflow-hidden"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-main-1)]/10 to-transparent" />
            
            <div className="relative z-10">
              <div className="flex justify-center mb-6">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="text-7xl"
                >
                  🎁
                </motion.div>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-heading text-center mb-4">
                Your <span className="text-[var(--color-main-1)]">Exclusive</span> Welcome Bonus!
              </h2>
              
              <p className="text-white/60 text-center mb-8 max-w-lg mx-auto">
                Sign up now with {referrerName}&apos;s referral and unlock these awesome rewards:
              </p>

              {/* Rewards grid */}
              <div className="grid md:grid-cols-4 gap-4 mb-8">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-[var(--color-dark-3)]/50 rounded-lg p-4 text-center border border-[var(--color-main-1)]/20"
                >
                  <div className="text-4xl mb-2">⚡</div>
                  <div className="text-[var(--color-main-1)] font-heading text-xl">200 XP</div>
                  <div className="text-xs text-white/50">Referral Bonus</div>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-[var(--color-dark-3)]/50 rounded-lg p-4 text-center border border-[var(--color-main-1)]/20"
                >
                  <div className="text-4xl mb-2">🎰</div>
                  <div className="text-[var(--color-main-1)] font-heading text-xl">1 Free Spin</div>
                  <div className="text-xs text-white/50">Spin Wheel</div>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-[var(--color-dark-3)]/50 rounded-lg p-4 text-center border border-[var(--color-main-1)]/20"
                >
                  <div className="text-4xl mb-2">🏷️</div>
                  <div className="text-[var(--color-main-1)] font-heading text-xl">10% Off</div>
                  <div className="text-xs text-white/50">First Order</div>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-[var(--color-dark-3)]/50 rounded-lg p-4 text-center border border-[var(--color-main-1)]/20"
                >
                  <div className="text-4xl mb-2">⭐</div>
                  <div className="text-[var(--color-main-1)] font-heading text-xl">100 XP</div>
                  <div className="text-xs text-white/50">Welcome Bonus</div>
                </motion.div>
              </div>

              {/* CTA */}
              <div className="text-center">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleSignUp}
                  className="text-lg px-12 py-4"
                >
                  🚀 Claim Your Rewards - Sign Up Free
                </Button>
                <p className="text-white/40 text-sm mt-4">
                  Already have an account?{" "}
                  <button
                    onClick={() => openSignIn()}
                    className="text-[var(--color-main-1)] hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-xl font-heading text-center mb-8 text-white/80">
              Why Join DarkPoint?
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 text-center">
                <div className="text-4xl mb-3">🎮</div>
                <h4 className="font-heading text-lg mb-2">Premium Gaming Gear</h4>
                <p className="text-sm text-white/60">Quality products at great prices</p>
              </div>
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 text-center">
                <div className="text-4xl mb-3">🏆</div>
                <h4 className="font-heading text-lg mb-2">Rewards System</h4>
                <p className="text-sm text-white/60">Earn XP, unlock achievements, win prizes</p>
              </div>
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 text-center">
                <div className="text-4xl mb-3">👥</div>
                <h4 className="font-heading text-lg mb-2">Epic Community</h4>
                <p className="text-sm text-white/60">Join thousands of gamers</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}


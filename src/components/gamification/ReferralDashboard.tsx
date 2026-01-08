"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGamificationStore } from "@/stores";
import { getReferralTier, REFERRAL_TIERS } from "@/types/gamification";
import { Button } from "@/components/ui";
import { SITE_URL } from "@/lib/constants";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface ReferralRecord {
  id: string;
  referred_name: string;
  status: "pending" | "completed";
  created_at: string;
  completed_at?: string;
}

interface ReferralDashboardProps {
  className?: string;
}

function ReferralDashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6 animate-pulse", className)}>
      {/* Stats overview skeleton */}
      <div className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 text-center">
            <div className="h-10 w-16 bg-[var(--color-dark-3)] rounded mx-auto mb-2" />
            <div className="h-4 w-24 bg-[var(--color-dark-3)] rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Referral link section skeleton */}
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6">
        <div className="h-6 w-40 bg-[var(--color-dark-3)] rounded mb-4" />
        
        {/* Link display skeleton */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-12 bg-[var(--color-dark-3)] rounded" />
          <div className="w-20 h-12 bg-[var(--color-dark-3)] rounded" />
        </div>

        {/* Referral code skeleton */}
        <div className="flex items-center justify-between p-4 bg-[var(--color-dark-3)] mb-6">
          <div>
            <div className="h-3 w-16 bg-[var(--color-dark-4)] rounded mb-2" />
            <div className="h-6 w-32 bg-[var(--color-dark-4)] rounded" />
          </div>
          <div className="w-24 h-8 bg-[var(--color-dark-4)] rounded" />
        </div>

        {/* Share buttons skeleton */}
        <div className="space-y-3">
          <div className="h-4 w-32 bg-[var(--color-dark-3)] rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-[var(--color-dark-3)] rounded" />
            ))}
          </div>
        </div>
      </div>

      {/* Tier progress skeleton */}
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6">
        <div className="h-6 w-32 bg-[var(--color-dark-3)] rounded mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 border border-[var(--color-dark-4)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[var(--color-dark-3)] rounded-full" />
                  <div>
                    <div className="h-4 w-20 bg-[var(--color-dark-3)] rounded mb-1" />
                    <div className="h-3 w-16 bg-[var(--color-dark-4)] rounded" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-5 w-16 bg-[var(--color-dark-3)] rounded mb-1" />
                  <div className="h-3 w-12 bg-[var(--color-dark-4)] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works skeleton */}
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6">
        <div className="h-6 w-28 bg-[var(--color-dark-3)] rounded mb-4" />
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-[var(--color-dark-3)] rounded-full" />
              <div className="h-4 w-24 bg-[var(--color-dark-3)] rounded mx-auto mb-2" />
              <div className="h-3 w-32 bg-[var(--color-dark-4)] rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReferralDashboard({ className }: ReferralDashboardProps) {
  const { userProfile, isLoading } = useGamificationStore();
  const [copied, setCopied] = useState(false);
  const [pendingReferrals, setPendingReferrals] = useState<ReferralRecord[]>([]);
  const [completedReferrals, setCompletedReferrals] = useState<ReferralRecord[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(true);

  // Fetch referrals data
  useEffect(() => {
    async function fetchReferrals() {
      if (!userProfile?.id || !isSupabaseConfigured()) {
        setReferralsLoading(false);
        return;
      }

      try {
        // Try RPC first
        const { data, error } = await supabase.rpc("get_referral_stats", {
          p_user_id: userProfile.id,
        });

        if (!error && data?.success) {
          setPendingReferrals(data.pending_referrals || []);
          setCompletedReferrals(data.completed_referrals || []);
          setReferralsLoading(false);
          return;
        }

        // Fallback: Query referrals table directly
        const { data: referralsData } = await supabase
          .from("referrals")
          .select(`
            id,
            status,
            created_at,
            updated_at,
            referred:referred_id (
              display_name,
              username
            )
          `)
          .eq("referrer_id", userProfile.id)
          .order("created_at", { ascending: false });

        if (referralsData) {
          const pending: ReferralRecord[] = [];
          const completed: ReferralRecord[] = [];

          for (const ref of referralsData) {
            const referred = ref.referred as { display_name?: string; username?: string } | null;
            const record: ReferralRecord = {
              id: ref.id,
              referred_name: referred?.display_name || referred?.username || "Anonymous",
              status: ref.status as "pending" | "completed",
              created_at: ref.created_at,
              completed_at: ref.updated_at,
            };

            // 'pending_purchase' = signed up but hasn't purchased yet
            // 'completed' = made their first purchase  
            // 'signed_up' = old status from before purchase-based system
            if (ref.status === "pending_purchase" || ref.status === "pending") {
              pending.push(record);
            } else if (ref.status === "completed" || ref.status === "signed_up") {
              completed.push(record);
            }
          }

          setPendingReferrals(pending);
          setCompletedReferrals(completed);
        }
      } catch {
        // Silently fail - we'll just show 0 referrals
      } finally {
        setReferralsLoading(false);
      }
    }

    fetchReferrals();
  }, [userProfile?.id]);

  if (!userProfile || isLoading) return <ReferralDashboardSkeleton className={className} />;

  const referralCode = userProfile.referral_code || "LOADING";
  const referralCount = userProfile.referral_count || 0;
  const pendingCount = pendingReferrals.length;
  const completedCount = completedReferrals.length;
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

  const shareOnSocial = (platform: "x" | "facebook" | "whatsapp" | "discord") => {
    const text = "Check out this awesome gaming store! Use my referral link for exclusive rewards:";
    const urls = {
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${referralLink}`)}`,
      discord: `https://discord.gg/darkpoint`,
    };
    window.open(urls[platform], "_blank", "width=600,height=400");
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats overview */}
      <div className="grid md:grid-cols-4 gap-4">
        {/* Pending referrals */}
        <div className="bg-[var(--color-dark-2)] border border-yellow-500/30 p-6 text-center">
          <div className="text-4xl font-heading text-yellow-500 mb-2">
            {referralsLoading ? "..." : pendingCount}
          </div>
          <p className="text-sm text-white/60">Pending</p>
          <p className="text-xs text-yellow-500/60 mt-1">Awaiting purchase</p>
        </div>

        {/* Completed referrals */}
        <div className="bg-[var(--color-dark-2)] border border-green-500/30 p-6 text-center">
          <div className="text-4xl font-heading text-green-500 mb-2">
            {completedCount}
          </div>
          <p className="text-sm text-white/60">Completed</p>
          <p className="text-xs text-green-500/60 mt-1">XP earned</p>
        </div>

        {/* Current tier */}
        <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 text-center">
          <div className="text-4xl mb-2">{currentTier.badge}</div>
          <p className="text-sm text-white/60">{currentTier.name} Tier</p>
        </div>

        {/* Earnings */}
        <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 text-center">
          <div className="text-4xl font-heading text-[var(--color-main-1)] mb-2">
            {(referralCount * currentTier.rewardPerReferral).toLocaleString()} XP
          </div>
          <p className="text-sm text-white/60">XP Earned</p>
        </div>
      </div>

      {/* Referrals List */}
      {(pendingCount > 0 || completedCount > 0) && (
        <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6">
          <h3 className="font-heading text-xl mb-4">Your Referrals</h3>
          
          {/* Info banner */}
          <div className="bg-[var(--color-main-1)]/10 border border-[var(--color-main-1)]/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-white/80">
              <span className="text-[var(--color-main-1)] font-semibold">How it works:</span> You earn XP when your referred friends make their first purchase. 
              Pending referrals have signed up but haven&apos;t purchased yet.
            </p>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {/* Pending referrals */}
            {pendingReferrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between p-3 bg-[var(--color-dark-3)] rounded-lg border-l-4 border-yellow-500">
                <div>
                  <p className="font-medium text-white">{ref.referred_name}</p>
                  <p className="text-xs text-white/40">
                    Signed up {new Date(ref.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-500 rounded">
                    Pending
                  </span>
                </div>
              </div>
            ))}
            
            {/* Completed referrals */}
            {completedReferrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between p-3 bg-[var(--color-dark-3)] rounded-lg border-l-4 border-green-500">
                <div>
                  <p className="font-medium text-white">{ref.referred_name}</p>
                  <p className="text-xs text-white/40">
                    Purchased {ref.completed_at ? new Date(ref.completed_at).toLocaleDateString() : "recently"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500 font-heading text-sm">+{currentTier.rewardPerReferral} XP</span>
                  <span className="px-2 py-1 text-xs bg-green-500/20 text-green-500 rounded">
                    Completed
                  </span>
                </div>
              </div>
            ))}

            {/* Empty state */}
            {pendingCount === 0 && completedCount === 0 && !referralsLoading && (
              <div className="text-center py-8 text-white/40">
                <p>No referrals yet. Share your link to get started!</p>
              </div>
            )}
          </div>
        </div>
      )}

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => shareOnSocial("x")}
              className="flex items-center justify-center gap-2 py-3 bg-black hover:bg-black/80 transition-colors cursor-pointer border border-white/20"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              X
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => shareOnSocial("facebook")}
              className="flex items-center justify-center gap-2 py-3 bg-[#4267B2] hover:bg-[#4267B2]/80 transition-colors cursor-pointer"
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
              className="flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#25D366]/80 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => shareOnSocial("discord")}
              className="flex items-center justify-center gap-2 py-3 bg-[#5865F2] hover:bg-[#5865F2]/80 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Discord
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
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[var(--color-main-1)] font-heading">
                        {tier.rewardPerReferral} XP
                      </p>
                      <p className="text-xs text-white/40">per referral</p>
                    </div>
                    {/* Completed checkmark */}
                    {isCompleted && (
                      <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
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
            <div className="w-12 h-12 mx-auto mb-3 bg-yellow-500/20 rounded-full flex items-center justify-center text-2xl">
              2️⃣
            </div>
            <p className="font-heading text-sm mb-1">They Sign Up</p>
            <p className="text-xs text-white/40">
              They get <span className="text-yellow-500">200 XP</span> instantly, referral marked pending
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-green-500/20 rounded-full flex items-center justify-center text-2xl">
              3️⃣
            </div>
            <p className="font-heading text-sm mb-1">They Make a Purchase</p>
            <p className="text-xs text-white/40">
              You earn <span className="text-green-500">{currentTier.rewardPerReferral} XP</span> when they buy!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


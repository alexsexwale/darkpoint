"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AccountLayout } from "@/components/account";
import { XPMultiplierIndicator } from "@/components/gamification";
import { VerificationRequired } from "@/components/auth";
import { useAuthStore, useGamificationStore } from "@/stores";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { XPAction } from "@/types/database";

// XP Transaction type
interface XPTransaction {
  id: string;
  user_id: string;
  amount: number;
  action: XPAction;
  description: string | null;
  created_at: string;
}

// Action display configuration
const ACTION_CONFIG: Record<XPAction, { icon: string; label: string; color: string }> = {
  signup: { icon: "🎉", label: "Welcome Bonus", color: "text-green-400" },
  daily_login: { icon: "📅", label: "Daily Login", color: "text-blue-400" },
  first_purchase: { icon: "🛒", label: "First Purchase", color: "text-purple-400" },
  purchase: { icon: "💰", label: "Purchase", color: "text-emerald-400" },
  review: { icon: "⭐", label: "Review", color: "text-yellow-400" },
  photo_review: { icon: "📸", label: "Photo Review", color: "text-pink-400" },
  share: { icon: "🔗", label: "Social Share", color: "text-cyan-400" },
  referral: { icon: "🤝", label: "Referral", color: "text-orange-400" },
  quest: { icon: "🎯", label: "Quest Completed", color: "text-indigo-400" },
  achievement: { icon: "🏆", label: "Achievement", color: "text-amber-400" },
  spin_reward: { icon: "🎡", label: "Spin Wheel", color: "text-rose-400" },
  bonus: { icon: "🎁", label: "Bonus", color: "text-lime-400" },
  admin: { icon: "⚡", label: "Admin Grant", color: "text-violet-400" },
  read_article: { icon: "📰", label: "Read Article", color: "text-sky-400" },
  add_wishlist: { icon: "❤️", label: "Wishlist", color: "text-red-400" },
  redeem: { icon: "🛍️", label: "Reward Redeemed", color: "text-amber-400" },
};

// Filter options
type FilterType = "all" | "earned" | "spent";
type TimeFilter = "all" | "today" | "week" | "month";

// Skeleton component for loading state
function XPHistoryPageSkeleton() {
  return (
    <AccountLayout title="XP History">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className={cn(
              "p-4 md:p-6 rounded-lg border animate-pulse",
              i === 1 
                ? "bg-gradient-to-br from-[var(--color-main-1)]/10 to-[var(--color-dark-2)] border-[var(--color-main-1)]/20"
                : "bg-[var(--color-dark-2)] border-[var(--color-dark-3)]"
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-dark-3)]" />
              <div className="h-3 bg-[var(--color-dark-3)] rounded w-20" />
            </div>
            <div className="h-8 bg-[var(--color-dark-3)] rounded w-24 mb-2" />
            <div className="h-3 bg-[var(--color-dark-3)] rounded w-16" />
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-20 bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="flex gap-2 sm:ml-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-16 bg-[var(--color-dark-3)]/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Timeline Skeleton */}
      <div className="bg-[var(--color-dark-2)] rounded-lg border border-[var(--color-dark-3)] overflow-hidden">
        {/* Date header skeleton */}
        <div className="bg-[var(--color-dark-3)]/30 px-4 md:px-6 py-3">
          <div className="h-4 bg-[var(--color-dark-3)] rounded w-20 animate-pulse" />
        </div>
        
        {/* Transaction skeletons */}
        <div className="divide-y divide-[var(--color-dark-3)]/50">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 md:px-6 py-4 animate-pulse">
              <div className="flex items-center gap-4">
                {/* Icon skeleton */}
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[var(--color-dark-3)]" />
                
                {/* Details skeleton */}
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[var(--color-dark-3)] rounded w-32" />
                  <div className="h-3 bg-[var(--color-dark-3)] rounded w-48" />
                  <div className="h-2 bg-[var(--color-dark-3)] rounded w-16" />
                </div>
                
                {/* Amount skeleton */}
                <div className="text-right space-y-1">
                  <div className="h-6 bg-[var(--color-dark-3)] rounded w-16 ml-auto" />
                  <div className="h-3 bg-[var(--color-dark-3)] rounded w-8 ml-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* XP Guide Skeleton */}
      <div className="mt-8 bg-[var(--color-dark-2)] rounded-lg border border-[var(--color-dark-3)] p-6">
        <div className="h-6 bg-[var(--color-dark-3)] rounded w-40 mb-4 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="p-3 bg-[var(--color-dark-3)]/50 rounded-lg animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded bg-[var(--color-dark-3)]" />
                <div className="h-4 bg-[var(--color-dark-3)] rounded w-16" />
              </div>
              <div className="h-4 bg-[var(--color-dark-3)] rounded w-12 mb-1" />
              <div className="h-2 bg-[var(--color-dark-3)] rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    </AccountLayout>
  );
}

export function XPHistoryPageClient() {
  const { isAuthenticated, isInitialized, isEmailVerified } = useAuthStore();
  const { userProfile, isLoading: profileLoading } = useGamificationStore();
  
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  // Fetch XP transactions
  useEffect(() => {
    async function fetchTransactions() {
      if (!isAuthenticated || !isSupabaseConfigured()) {
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("xp_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        setTransactions((data || []) as XPTransaction[]);
      } catch (error) {
        console.error("Error fetching XP transactions:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (isInitialized) {
      fetchTransactions();
    }
  }, [isAuthenticated, isInitialized]);

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    // Type filter
    if (filterType === "earned" && tx.amount <= 0) return false;
    if (filterType === "spent" && tx.amount >= 0) return false;

    // Time filter
    if (timeFilter !== "all") {
      const txDate = new Date(tx.created_at);
      const now = new Date();
      
      if (timeFilter === "today") {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (txDate < today) return false;
      } else if (timeFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (txDate < weekAgo) return false;
      } else if (timeFilter === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (txDate < monthAgo) return false;
      }
    }

    return true;
  });

  // Calculate stats
  const totalEarned = transactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
  const totalSpent = Math.abs(transactions.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0));

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((groups, tx) => {
    const date = new Date(tx.created_at).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(tx);
    return groups;
  }, {} as Record<string, XPTransaction[]>);

  // Format time
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get relative date label
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const txDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (txDate.getTime() === today.getTime()) return "Today";
    if (txDate.getTime() === yesterday.getTime()) return "Yesterday";
    return dateStr;
  };

  // Show verification required for unverified users
  if (isAuthenticated && !isEmailVerified) {
    return (
      <AccountLayout title="XP History">
        <VerificationRequired feature="view your XP history">
          <div />
        </VerificationRequired>
      </AccountLayout>
    );
  }

  // Show skeleton while loading initial data
  if (!isInitialized || (isLoading && transactions.length === 0) || profileLoading) {
    return <XPHistoryPageSkeleton />;
  }

  return (
    <AccountLayout title="XP History">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Current Balance */}
        <div className="bg-gradient-to-br from-[var(--color-main-1)]/20 to-[var(--color-dark-2)] p-4 md:p-6 rounded-lg border border-[var(--color-main-1)]/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⚡</span>
            <span className="text-xs uppercase tracking-wider text-white/60">Current Balance</span>
          </div>
          <p className="text-2xl md:text-3xl font-heading text-[var(--color-main-1)]">
            {userProfile?.total_xp?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-white/40 mt-1">XP available</p>
        </div>

        {/* Total Earned */}
        <div className="bg-[var(--color-dark-2)] p-4 md:p-6 rounded-lg border border-[var(--color-dark-3)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📈</span>
            <span className="text-xs uppercase tracking-wider text-white/60">Total Earned</span>
          </div>
          <p className="text-2xl md:text-3xl font-heading text-green-400">
            +{totalEarned.toLocaleString()}
          </p>
          <p className="text-xs text-white/40 mt-1">XP lifetime</p>
        </div>

        {/* Total Spent */}
        <div className="bg-[var(--color-dark-2)] p-4 md:p-6 rounded-lg border border-[var(--color-dark-3)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🛒</span>
            <span className="text-xs uppercase tracking-wider text-white/60">Total Spent</span>
          </div>
          <p className="text-2xl md:text-3xl font-heading text-red-400">
            -{totalSpent.toLocaleString()}
          </p>
          <p className="text-xs text-white/40 mt-1">XP on rewards</p>
        </div>

        {/* Transactions */}
        <div className="bg-[var(--color-dark-2)] p-4 md:p-6 rounded-lg border border-[var(--color-dark-3)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📊</span>
            <span className="text-xs uppercase tracking-wider text-white/60">Transactions</span>
          </div>
          <p className="text-2xl md:text-3xl font-heading text-white">
            {transactions.length}
          </p>
          <p className="text-xs text-white/40 mt-1">Total activities</p>
        </div>
      </div>

      {/* Active XP Multiplier */}
      <div className="mb-8">
        <XPMultiplierIndicator variant="full" showOnlyWhenActive />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Type Filter */}
        <div className="flex gap-2">
          {[
            { value: "all", label: "All" },
            { value: "earned", label: "Earned" },
            { value: "spent", label: "Spent" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterType(filter.value as FilterType)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                filterType === filter.value
                  ? "bg-[var(--color-main-1)] text-white"
                  : "bg-[var(--color-dark-2)] text-white/60 hover:text-white border border-[var(--color-dark-3)]"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Time Filter */}
        <div className="flex gap-2 sm:ml-auto">
          {[
            { value: "all", label: "All Time" },
            { value: "today", label: "Today" },
            { value: "week", label: "This Week" },
            { value: "month", label: "This Month" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setTimeFilter(filter.value as TimeFilter)}
              className={cn(
                "px-3 py-2 text-xs font-medium rounded-lg transition-all",
                timeFilter === filter.value
                  ? "bg-[var(--color-dark-3)] text-white"
                  : "text-white/40 hover:text-white/60"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-[var(--color-dark-2)] rounded-lg border border-[var(--color-dark-3)] overflow-hidden">
        {isLoading ? (
          // Skeleton loader
          <div className="p-6 space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-[var(--color-dark-3)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[var(--color-dark-3)] rounded w-32" />
                  <div className="h-3 bg-[var(--color-dark-3)] rounded w-48" />
                </div>
                <div className="h-6 bg-[var(--color-dark-3)] rounded w-16" />
              </div>
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          // Empty state
          <div className="p-12 text-center">
            <span className="text-5xl mb-4 block opacity-50">📜</span>
            <h3 className="text-xl font-heading mb-2">No XP History Yet</h3>
            <p className="text-white/60 max-w-md mx-auto">
              {filterType !== "all" || timeFilter !== "all"
                ? "No transactions match your filters. Try adjusting the filters above."
                : "Start earning XP by completing quests, making purchases, and engaging with the platform!"}
            </p>
          </div>
        ) : (
          // Transaction list grouped by date
          <div className="divide-y divide-[var(--color-dark-3)]">
            {Object.entries(groupedTransactions).map(([date, txs], groupIndex) => (
              <div key={date}>
                {/* Date header */}
                <div className="bg-[var(--color-dark-3)]/30 px-4 md:px-6 py-3 sticky top-0">
                  <h3 className="text-sm font-medium text-white/60">{getDateLabel(date)}</h3>
                </div>
                
                {/* Transactions for this date */}
                <div className="divide-y divide-[var(--color-dark-3)]/50">
                  <AnimatePresence>
                    {txs.map((tx, index) => {
                      const config = ACTION_CONFIG[tx.action] || { 
                        icon: "⚡", 
                        label: tx.action, 
                        color: "text-white" 
                      };
                      const isEarned = tx.amount > 0;

                      return (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="px-4 md:px-6 py-4 hover:bg-[var(--color-dark-3)]/20 transition-colors"
                        >
                          {(() => {
                            const multiplierInfo = parseMultiplierInfo(tx.description);
                            return (
                              <div className="flex items-center gap-4">
                                {/* Icon */}
                                <div className={cn(
                                  "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xl md:text-2xl flex-shrink-0",
                                  isEarned 
                                    ? "bg-green-500/10" 
                                    : "bg-red-500/10"
                                )}>
                                  {config.icon}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className={cn("font-medium text-sm md:text-base", config.color)}>
                                      {config.label}
                                    </p>
                                    {multiplierInfo && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--color-main-1)]/20 text-[var(--color-main-1)] text-[10px] rounded-full">
                                        <span>⚡</span>
                                        <span>{multiplierInfo.multiplier}x</span>
                                      </span>
                                    )}
                                    {tx.action === "purchase" && !multiplierInfo && (
                                      <span className="hidden sm:inline-flex px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded-full">
                                        1 XP per R10
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs md:text-sm text-white/50 truncate">
                                    {formatDescription(tx.description) || getDefaultDescription(tx.action, tx.amount)}
                                  </p>
                                  {multiplierInfo && (
                                    <p className="text-[10px] text-[var(--color-main-1)]/70 mt-0.5">
                                      Base: {multiplierInfo.baseXP} XP + {multiplierInfo.bonusXP} bonus
                                    </p>
                                  )}
                                  <p className="text-[10px] md:text-xs text-white/30 mt-1">
                                    {formatTime(tx.created_at)}
                                  </p>
                                </div>

                                {/* Amount */}
                                <div className={cn(
                                  "text-right flex-shrink-0",
                                  isEarned ? "text-green-400" : "text-red-400"
                                )}>
                                  <p className="text-lg md:text-xl font-heading">
                                    {isEarned ? "+" : ""}{tx.amount.toLocaleString()}
                                  </p>
                                  <p className="text-[10px] md:text-xs opacity-60">XP</p>
                                </div>
                              </div>
                            );
                          })()}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Load more hint */}
      {filteredTransactions.length >= 100 && (
        <p className="text-center text-white/40 text-sm mt-4">
          Showing last 100 transactions
        </p>
      )}

      {/* XP Guide */}
      <div className="mt-8 bg-[var(--color-dark-2)] rounded-lg border border-[var(--color-dark-3)] p-6">
        <h3 className="font-heading text-lg mb-4 flex items-center gap-2">
          <span>💡</span>
          How to Earn XP
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "📅", label: "Daily Login", xp: "10-100", desc: "Login streak bonuses" },
            { icon: "🛒", label: "Purchases", xp: "1 per R10", desc: "Shop & earn" },
            { icon: "⭐", label: "Reviews", xp: "50-100", desc: "Share your thoughts" },
            { icon: "🤝", label: "Referrals", xp: "300+", desc: "Invite friends" },
            { icon: "🎯", label: "Quests", xp: "15-50", desc: "Daily challenges" },
            { icon: "🏆", label: "Achievements", xp: "50-500", desc: "Unlock milestones" },
            { icon: "📰", label: "Read Articles", xp: "20", desc: "Stay informed" },
            { icon: "🔗", label: "Share", xp: "10", desc: "Social sharing" },
          ].map((item) => (
            <div key={item.label} className="p-3 bg-[var(--color-dark-3)]/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <p className="text-[var(--color-main-1)] font-heading text-sm">+{item.xp} XP</p>
              <p className="text-[10px] text-white/40 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </AccountLayout>
  );
}

// Parse multiplier info from description
// Format: "... [1.5x: 20 + 10 bonus]" or similar
function parseMultiplierInfo(description: string | null): { multiplier: number; baseXP: number; bonusXP: number } | null {
  if (!description) return null;
  
  // Match pattern like "[1.5x: 20 + 10 bonus]" or "[2x: 25 + 25 bonus]"
  const match = description.match(/\[(\d+\.?\d*)x:\s*(\d+)\s*\+\s*(\d+)\s*bonus\]/i);
  if (match) {
    return {
      multiplier: parseFloat(match[1]),
      baseXP: parseInt(match[2]),
      bonusXP: parseInt(match[3]),
    };
  }
  
  return null;
}

// Quest ID to friendly name mapping
const QUEST_FRIENDLY_NAMES: Record<string, string> = {
  browse_products: "Browse Products",
  add_wishlist: "Add to Wishlist",
  share_product: "Share a Product",
  write_review: "Write a Review",
  visit_spin: "Visit Spin Wheel",
  make_purchase: "Make a Purchase",
  view_news: "Read News Article",
  complete_profile: "Complete Profile",
  daily_login: "Daily Login",
};

// Helper to format description with user-friendly quest names
function formatDescription(description: string | null): string {
  if (!description) return "";
  
  // Remove multiplier info from description (we display it separately)
  let cleanDesc = description.replace(/\s*\[\d+\.?\d*x:\s*\d+\s*\+\s*\d+\s*bonus\]/gi, "").trim();
  
  // Check if it's a quest description with technical ID
  const questMatch = cleanDesc.match(/Daily quest[:\s]+(\w+)/i);
  if (questMatch) {
    const questId = questMatch[1];
    const friendlyName = QUEST_FRIENDLY_NAMES[questId] || questId.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    return `Daily Quest: ${friendlyName}`;
  }
  
  // Handle "Quest: Quest Name" format
  const questFormatMatch = cleanDesc.match(/Quest:\s*(.+)/i);
  if (questFormatMatch) {
    return cleanDesc;
  }
  
  // Replace any remaining snake_case quest IDs in the description
  return cleanDesc.replace(/:\s*(\w+_\w+)/g, (match: string, id: string) => {
    const friendlyName = QUEST_FRIENDLY_NAMES[id] || id.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
    return `: ${friendlyName}`;
  });
}

// Helper to generate default description
function getDefaultDescription(action: XPAction, amount: number): string {
  const isSpent = amount < 0;
  
  if (isSpent) {
    return "XP spent on reward redemption";
  }

  switch (action) {
    case "signup": return "Welcome to Darkpoint!";
    case "daily_login": return "Thanks for visiting today";
    case "first_purchase": return "Congratulations on your first order!";
    case "purchase": return "XP earned from purchase";
    case "review": return "Thanks for your review";
    case "photo_review": return "Thanks for the photo review";
    case "share": return "Content shared on social media";
    case "referral": return "Friend signed up with your link";
    case "quest": return "Daily quest completed";
    case "achievement": return "Achievement unlocked";
    case "spin_reward": return "Spin wheel reward";
    case "bonus": return "Special bonus reward";
    case "admin": return "Granted by admin";
    case "read_article": return "Article read";
    case "add_wishlist": return "Item added to wishlist";
    case "redeem": return "Reward redeemed from shop";
    default: return "XP transaction";
  }
}


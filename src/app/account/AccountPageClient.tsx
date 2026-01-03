"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { AccountLayout } from "@/components/account";
import { DailyRewardCalendar, DailyQuestList, StreakIndicator, BadgeShowcase, BadgeDisplay, BADGE_CONFIGS, type BadgeType } from "@/components/gamification";
import { MyRewardsList } from "@/components/cart/RewardSelector";
import { useUIStore, useGamificationStore, useAuthStore, useAccountStore, useRewardsStore } from "@/stores";

export function AccountPageClient() {
  const { openSignIn } = useUIStore();
  const { isAuthenticated, isInitialized, user, signOut } = useAuthStore();
  const { userProfile, setDailyRewardModal, initDailyQuests, userBadges, hasAnyBadge } = useGamificationStore();
  const { orders, stats, isLoadingStats, fetchOrders, fetchStats } = useAccountStore();
  const { rewards, fetchRewards } = useRewardsStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize daily quests on mount
  useEffect(() => {
    initDailyQuests();
  }, [initDailyQuests]);

  // Fetch stats, orders, and rewards when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      fetchOrders();
      fetchRewards();
    }
  }, [isAuthenticated, fetchStats, fetchOrders, fetchRewards]);

  // Check if daily reward has been claimed
  const today = new Date().toISOString().split("T")[0];
  const hasClaimed = userProfile?.last_login_date === today;

  const handleClaimDailyReward = () => {
    setDailyRewardModal(true);
  };

  const handleSignIn = () => {
    openSignIn();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Show loading while auth is initializing
  if (!mounted || !isInitialized) {
    return (
      <div className="container py-8">
        <div className="nk-gap-2" />
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-wider">
            Account
          </h1>
          <div className="w-24 h-px bg-white/20 mx-auto mt-4" />
        </div>
        <div className="flex justify-center py-12">
          <svg className="animate-spin w-8 h-8 text-[var(--color-main-1)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-8">
        <div className="nk-gap-2" />

        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-wider">
            Account
          </h1>
          <div className="w-24 h-px bg-white/20 mx-auto mt-4" />
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-[var(--color-dark-2)] p-8 text-center">
            <svg
              className="w-16 h-16 mx-auto text-[var(--color-dark-4)] mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>

            <h2 className="text-2xl mb-4">Sign In Required</h2>
            <p className="text-[var(--muted-foreground)] mb-8">
              Sign in to view your orders, track shipments, and manage your account
              settings.
            </p>

            <Button variant="primary" className="w-full" onClick={handleSignIn}>
              Sign In
            </Button>

            <div className="mt-6 pt-6 border-t border-[var(--color-dark-3)]">
              <p className="text-sm text-[var(--muted-foreground)]">
                Don&apos;t have an account? Click sign in to register.
              </p>
            </div>
          </div>
        </div>

        <div className="nk-gap-4" />
      </div>
    );
  }

  // Get display name and stats
  const displayName = userProfile?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const userInitial = displayName.charAt(0).toUpperCase();
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Recently";

  // Recent orders (last 2)
  const recentOrders = orders.slice(0, 2);

  const statusColors: Record<string, string> = {
    pending: "text-gray-400 bg-gray-400/10",
    processing: "text-yellow-500 bg-yellow-500/10",
    shipped: "text-blue-400 bg-blue-400/10",
    delivered: "text-green-500 bg-green-500/10",
    cancelled: "text-red-400 bg-red-400/10",
    refunded: "text-purple-400 bg-purple-400/10",
  };

  // Logged in state - Dashboard
  return (
    <AccountLayout title="Dashboard">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[var(--color-main-1)]/20 to-transparent p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-main-1)]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          {userProfile?.avatar_url || user?.user_metadata?.avatar_url ? (
            <img
              src={userProfile?.avatar_url || user?.user_metadata?.avatar_url}
              alt={displayName}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[var(--color-main-1)] flex items-center justify-center text-2xl font-heading text-white">
              {userInitial}
            </div>
          )}
          <div>
            <h3 className="text-xl font-semibold">Welcome back, {displayName.split(" ")[0]}! 👋</h3>
            <p className="text-white/60">
              Member since {memberSince} •{" "}
              <button
                onClick={handleSignOut}
                className="text-[var(--color-main-1)] hover:underline cursor-pointer"
              >
                Log out
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link href="/account/orders" className="bg-[var(--color-dark-2)] p-4 hover:bg-[var(--color-dark-3)] transition-colors group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="text-2xl font-bold">
              {isLoadingStats ? "..." : (stats?.total_orders || 0)}
            </span>
          </div>
          <p className="text-sm text-white/60">Total Orders</p>
        </Link>

        <Link href="/account/orders" className="bg-[var(--color-dark-2)] p-4 hover:bg-[var(--color-dark-3)] transition-colors group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-2xl font-bold">
              {isLoadingStats ? "..." : (stats?.processing_orders || 0)}
            </span>
          </div>
          <p className="text-sm text-white/60">Processing</p>
        </Link>

        <Link href="/account/orders" className="bg-[var(--color-dark-2)] p-4 hover:bg-[var(--color-dark-3)] transition-colors group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-2xl font-bold">
              {isLoadingStats ? "..." : (stats?.delivered_orders || 0)}
            </span>
          </div>
          <p className="text-sm text-white/60">Delivered</p>
        </Link>

        <div className="bg-[var(--color-dark-2)] p-4 group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[var(--color-main-1)]/10 flex items-center justify-center text-[var(--color-main-1)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-2xl font-bold">
              {isLoadingStats ? "..." : `R${(stats?.total_spent || 0).toLocaleString()}`}
            </span>
          </div>
          <p className="text-sm text-white/60">Total Spent</p>
        </div>
      </div>

      {/* Gamification Section - Daily Rewards & Quests */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Daily Rewards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-xl">Daily Rewards</h3>
            <StreakIndicator />
          </div>
          {!hasClaimed ? (
            <div className="bg-gradient-to-br from-[var(--color-main-1)]/20 to-[var(--color-dark-2)] border-2 border-[var(--color-main-1)] p-6 text-center">
              <div className="text-5xl mb-4 animate-bounce">🎁</div>
              <h4 className="text-xl font-heading text-[var(--color-main-1)] mb-2">
                Daily Reward Available!
              </h4>
              <p className="text-white/60 mb-4">
                Claim your reward to earn XP and special bonuses
              </p>
              <Button variant="primary" onClick={handleClaimDailyReward}>
                Claim Now
              </Button>
            </div>
          ) : (
            <DailyRewardCalendar />
          )}
        </div>

        {/* Daily Quests */}
        <DailyQuestList />
      </div>

      {/* My Rewards Section */}
      <div className="mb-8 bg-[var(--color-dark-2)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎁</span>
            <h3 className="font-heading text-xl">My Rewards</h3>
            {rewards.length > 0 && (
              <span className="px-2 py-0.5 bg-[var(--color-main-1)]/20 text-[var(--color-main-1)] text-xs rounded-full font-semibold">
                {rewards.length} available
              </span>
            )}
          </div>
          <Link href="/rewards/shop" className="text-sm text-[var(--color-main-1)] hover:underline">
            Get More →
          </Link>
        </div>
        
        <p className="text-white/60 text-sm mb-4">
          Use your rewards at checkout for discounts and free shipping!
        </p>
        
        <MyRewardsList />
        
        {rewards.length === 0 && (
          <div className="mt-4 p-4 bg-[var(--color-dark-3)] rounded-lg text-center">
            <p className="text-sm text-white/60">
              Earn XP to unlock rewards in the{" "}
              <Link href="/rewards/shop" className="text-[var(--color-main-1)] hover:underline">
                Rewards Shop
              </Link>
              !
            </p>
          </div>
        )}
      </div>

      {/* VIP Badge Collection */}
      <div className="mb-8 bg-[var(--color-dark-2)] p-6 overflow-hidden relative">
        {/* Secret glow for badge owners */}
        {hasAnyBadge() && (
          <motion.div
            className="absolute inset-0 opacity-20"
            style={{
              background: "radial-gradient(circle at 30% 50%, rgba(255,215,0,0.3) 0%, transparent 50%)",
            }}
            animate={{ opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        )}
        
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏅</span>
              <h3 className="font-heading text-xl">Badge Collection</h3>
              {hasAnyBadge() && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full font-semibold animate-pulse">
                  VIP MEMBER
                </span>
              )}
            </div>
            <Link href="/rewards/shop" className="text-sm text-[var(--color-main-1)] hover:underline">
              Get Badges →
            </Link>
          </div>
          
          {hasAnyBadge() ? (
            <div className="space-y-4">
              {/* Owned Badges */}
              <div className="grid gap-4">
                {userBadges.map((badge, index) => (
                  <motion.div
                    key={badge.badge_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <BadgeShowcase 
                      badge={badge.badge_id as BadgeType} 
                      acquiredAt={badge.acquired_at}
                    />
                  </motion.div>
                ))}
              </div>
              
              {/* Secret hint for badge owners */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-4 p-4 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">🔮</span>
                  <div>
                    <p className="text-sm text-amber-400 font-semibold">Secret VIP Perk</p>
                    <p className="text-xs text-white/60 mt-1">
                      As a badge owner, you have access to exclusive features. 
                      Try the ancient code at any time... <span className="text-amber-400/80 italic">up up down down left right left right...</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="flex justify-center gap-6 mb-6">
                {(Object.keys(BADGE_CONFIGS) as BadgeType[]).map((badgeId) => (
                  <div key={badgeId} className="opacity-40">
                    <BadgeDisplay badge={badgeId} size="lg" isOwned={false} showTooltip={false} />
                  </div>
                ))}
              </div>
              <p className="text-white/60 mb-4">
                Unlock exclusive badges to become a VIP member with secret perks!
              </p>
              <Link href="/rewards/shop">
                <Button variant="outline" size="sm">
                  Browse Badges
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders & Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="md:col-span-2 bg-[var(--color-dark-2)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-xl">Recent Orders</h3>
            <Link href="/account/orders" className="text-sm text-[var(--color-main-1)] hover:underline">
              View All →
            </Link>
          </div>
          
          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="flex items-center justify-between p-4 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[var(--color-dark-4)] rounded flex items-center justify-center">
                      <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold">Order #{order.order_number}</p>
                      <p className="text-sm text-white/60">
                        {new Date(order.created_at).toLocaleDateString("en-ZA", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded capitalize ${statusColors[order.status] || "text-white/60 bg-white/10"}`}>
                      {order.status}
                    </span>
                    <p className="mt-1 font-semibold">R{order.total.toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-white/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="text-white/60 mb-4">No orders yet</p>
              <Link href="/store">
                <Button variant="primary" size="sm">Start Shopping</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-[var(--color-dark-2)] p-6">
          <h3 className="font-heading text-xl mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              href="/store"
              className="flex items-center gap-3 p-3 bg-[var(--color-main-1)] hover:bg-[var(--color-main-1)]/80 transition-colors text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="font-semibold">Continue Shopping</span>
            </Link>

            <Link
              href="/account/orders"
              className="flex items-center gap-3 p-3 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] transition-colors"
            >
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Track Orders</span>
            </Link>

            <Link
              href="/account/addresses"
              className="flex items-center gap-3 p-3 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] transition-colors"
            >
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Manage Addresses</span>
            </Link>

            <Link
              href="/account/details"
              className="flex items-center gap-3 p-3 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] transition-colors"
            >
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Account Settings</span>
            </Link>

            <Link
              href="/contact"
              className="flex items-center gap-3 p-3 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] transition-colors"
            >
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Get Help</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Account Completion */}
      {userProfile && (
        <div className="mt-8 bg-[var(--color-dark-2)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-xl">Your Progress</h3>
            <span className="text-[var(--color-main-1)] font-semibold">
              Level {userProfile.current_level}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <span className="text-white/60">{userProfile.total_xp.toLocaleString()} XP</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <span className="text-white/60">{userProfile.current_streak} day streak</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📝</span>
              <span className="text-white/60">{stats?.total_reviews || 0} reviews</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎰</span>
              <span className="text-white/60">{userProfile.available_spins} spins available</span>
            </div>
          </div>
        </div>
      )}
    </AccountLayout>
  );
}

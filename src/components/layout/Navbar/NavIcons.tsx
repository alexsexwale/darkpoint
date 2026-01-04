"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, useUIStore, useWishlistStore, useGamificationStore, useAuthStore } from "@/stores";
import { XPMultiplierIndicator, MiniBadge, type BadgeType } from "@/components/gamification";

export function NavIcons() {
  const { toggleCart, itemCount } = useCartStore();
  const { itemCount: wishlistItemCount } = useWishlistStore();
  const { toggleSearch, toggleSignIn, toggleMobileMenu } = useUIStore();
  const { userProfile, setDailyRewardModal, getHighestBadge } = useGamificationStore();
  const { user, signOut, isLoading, isAuthenticated, isInitialized } = useAuthStore();
  
  // Get highest badge for display
  const highestBadge = getHighestBadge() as BadgeType | null;
  
  const [mounted, setMounted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Only show authenticated state after both mounted and auth initialized
  const showAuthenticatedUI = mounted && isInitialized && isAuthenticated;

  // Only show counts after hydration to avoid mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cartCount = mounted ? itemCount() : 0;
  const wishlistCount = mounted ? wishlistItemCount() : 0;

  // Check if daily reward has been claimed
  const today = new Date().toISOString().split("T")[0];
  const hasClaimed = mounted && userProfile?.last_login_date === today;
  const showDailyRewardIcon = mounted && isAuthenticated && !hasClaimed;

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
  };

  // Get user display info
  const userDisplayName = userProfile?.display_name ||
    user?.user_metadata?.full_name || 
    user?.user_metadata?.username || 
    user?.email?.split("@")[0] || 
    "User";
  const userAvatar = userProfile?.avatar_url || user?.user_metadata?.avatar_url;
  const userInitial = userDisplayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      {/* Search */}
      <button
        onClick={toggleSearch}
        className="p-2 text-white hover:text-[var(--color-main-1)] transition-colors cursor-pointer"
        aria-label="Search"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>

      {/* Daily Reward Indicator */}
      {showDailyRewardIcon && (
        <button
          onClick={() => setDailyRewardModal(true)}
          className="relative p-2 text-[var(--color-main-1)] hover:text-[var(--color-main-1)]/80 transition-colors cursor-pointer"
          aria-label="Claim Daily Reward"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
              />
            </svg>
          </motion.div>
          {/* Pulsing indicator dot */}
          <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-[var(--color-main-1)] rounded-full">
            <span className="absolute inset-0 bg-[var(--color-main-1)] rounded-full animate-ping" />
          </span>
        </button>
      )}

      {/* XP Multiplier Indicator - visible in header when active */}
      {showAuthenticatedUI && (
        <div className="hidden sm:block">
          <XPMultiplierIndicator variant="header" showOnlyWhenActive />
        </div>
      )}

      {/* Wishlist */}
      <Link
        href="/wishlist"
        className="relative p-2 text-white hover:text-[var(--color-main-1)] transition-colors cursor-pointer"
        aria-label="My Wishlist"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        {mounted && wishlistCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-[var(--color-main-1)] text-white text-xs font-bold rounded-full">
            {wishlistCount > 99 ? "99+" : wishlistCount}
          </span>
        )}
      </Link>

      {/* Cart */}
      <button
        onClick={toggleCart}
        className="relative p-2 text-white hover:text-[var(--color-main-1)] transition-colors cursor-pointer"
        aria-label="Shopping cart"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        {mounted && cartCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-[var(--color-main-1)] text-white text-xs font-bold rounded-full">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        )}
      </button>

      {/* User Icon / Menu */}
      <div className="relative hidden md:block" ref={userMenuRef}>
        {showAuthenticatedUI ? (
          <>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="p-1.5 text-white hover:text-[var(--color-main-1)] transition-colors cursor-pointer flex items-center gap-1"
              aria-label="User menu"
            >
              {/* Badge Display */}
              {highestBadge && (
                <MiniBadge badge={highestBadge} className="mr-0.5" />
              )}
              {userAvatar ? (
                <Image
                  src={userAvatar}
                  alt={userDisplayName}
                  width={28}
                  height={28}
                  className="rounded-full ring-2 ring-[var(--color-dark-3)] hover:ring-[var(--color-main-1)] transition-all"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[var(--color-main-1)] flex items-center justify-center text-white text-sm font-bold">
                  {userInitial}
                </div>
              )}
            </button>

            {/* User Dropdown Menu */}
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-lg shadow-xl overflow-hidden z-50"
                >
                  {/* User Info Header */}
                  <div className="p-4 border-b border-[var(--color-dark-3)]">
                    <p className="font-medium text-white truncate">{userDisplayName}</p>
                    <p className="text-xs text-[var(--muted-foreground)] truncate">{user?.email}</p>
                  </div>

                  {/* Menu Links */}
                  <div className="py-2">
                    <Link
                      href="/account"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--muted-foreground)] hover:text-white hover:bg-[var(--color-dark-3)] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Account
                    </Link>
                    <Link
                      href="/account/orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--muted-foreground)] hover:text-white hover:bg-[var(--color-dark-3)] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      My Orders
                    </Link>
                    <Link
                      href="/rewards"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--muted-foreground)] hover:text-white hover:bg-[var(--color-dark-3)] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                      Rewards
                    </Link>
                    <Link
                      href="/account/achievements"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--muted-foreground)] hover:text-white hover:bg-[var(--color-dark-3)] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Achievements
                    </Link>
                  </div>

                  {/* Sign Out */}
                  <div className="py-2 border-t border-[var(--color-dark-3)]">
                    <button
                      onClick={handleSignOut}
                      disabled={isLoading}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {isLoading ? "Signing out..." : "Sign Out"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <button
            onClick={toggleSignIn}
            className="p-2 text-white hover:text-[var(--color-main-1)] transition-colors cursor-pointer"
            aria-label="Sign In"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Mobile Menu Toggle */}
      <button
        onClick={toggleMobileMenu}
        className="p-2 text-white hover:text-[var(--color-main-1)] transition-colors lg:hidden"
        aria-label="Toggle Menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>
  );
}

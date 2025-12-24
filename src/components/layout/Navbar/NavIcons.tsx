"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCartStore, useUIStore, useWishlistStore, useGamificationStore } from "@/stores";

export function NavIcons() {
  const { toggleCart, itemCount } = useCartStore();
  const { itemCount: wishlistItemCount } = useWishlistStore();
  const { toggleSearch, toggleSignIn, toggleMobileMenu } = useUIStore();
  const { userProfile, isAuthenticated, setDailyRewardModal } = useGamificationStore();
  const [mounted, setMounted] = useState(false);

  // Only show counts after hydration to avoid mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const cartCount = mounted ? itemCount() : 0;
  const wishlistCount = mounted ? wishlistItemCount() : 0;

  // Check if daily reward has been claimed
  const today = new Date().toISOString().split("T")[0];
  const hasClaimed = mounted && userProfile?.last_login_date === today;
  const showDailyRewardIcon = mounted && isAuthenticated && !hasClaimed;

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

      {/* Sign In */}
      <button
        onClick={toggleSignIn}
        className="p-2 text-white hover:text-[var(--color-main-1)] transition-colors hidden md:block"
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

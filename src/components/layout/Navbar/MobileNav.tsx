"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore, useAuthStore, useGamificationStore } from "@/stores";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getLevelTier, getXPProgress } from "@/types/gamification";

interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: string;
  children?: NavItem[];
}

interface NavItemWithVIP extends NavItem {
  vipOnly?: boolean;
  children?: NavItemWithVIP[];
}

const baseNavItems: NavItemWithVIP[] = [
  { 
    id: "home",
    label: "Home", 
    href: "/", 
    icon: "🏠" 
  },
  {
    id: "store",
    label: "Store",
    href: "/store",
    icon: "🛍️",
    children: [
      { id: "all-products", label: "All Products", href: "/store", icon: "📦" },
      { id: "mystery-boxes", label: "Mystery Boxes", href: "/store/mystery-boxes", icon: "🎁" },
      { id: "accessories", label: "Accessories", href: "/store?category=accessories", icon: "⌚" },
      { id: "gadgets", label: "Gadgets", href: "/store?category=gadgets", icon: "🎮" },
      { id: "wearables", label: "Wearables", href: "/store?category=wearables", icon: "👕" },
      { id: "audio", label: "Audio", href: "/store?category=audio", icon: "🎧" },
    ],
  },
  { 
    id: "games",
    label: "Games", 
    href: "/games", 
    icon: "🕹️" 
  },
  {
    id: "rewards",
    label: "Rewards",
    href: "/rewards",
    icon: "🏆",
    children: [
      { id: "rewards-hub", label: "Rewards Hub", href: "/rewards", icon: "⭐" },
      { id: "spin-wheel", label: "Spin Wheel", href: "/rewards/spin", icon: "🎡" },
      { id: "rewards-shop", label: "Rewards Shop", href: "/rewards/shop", icon: "🏪" },
      { id: "achievements", label: "Achievements", href: "/account/achievements", icon: "🎖️" },
      { id: "referrals", label: "Referrals", href: "/account/referrals", icon: "🤝" },
      { id: "vip-lounge", label: "VIP Lounge", href: "/vip", icon: "👑", vipOnly: true },
    ],
  },
  { 
    id: "news",
    label: "News", 
    href: "/news", 
    icon: "📰" 
  },
];

const accountItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/account", icon: "📊" },
  { id: "orders", label: "My Orders", href: "/account/orders", icon: "📦" },
  { id: "downloads", label: "Downloads", href: "/account/downloads", icon: "⬇️" },
  { id: "addresses", label: "Addresses", href: "/account/addresses", icon: "📍" },
  { id: "reviews", label: "Reviews & Reports", href: "/account/reviews", icon: "⭐" },
  { id: "details", label: "Account Details", href: "/account/details", icon: "⚙️" },
  { id: "wishlist", label: "Wishlist", href: "/wishlist", icon: "❤️" },
];

export function MobileNav() {
  const { isMobileMenuOpen, closeMobileMenu, openSignIn } = useUIStore();
  const { user, isAuthenticated, signOut, isLoading, isInitialized } = useAuthStore();
  const { userProfile, hasAnyBadge } = useGamificationStore();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  // Check if user is VIP
  const isVIP = hasAnyBadge();
  
  // Filter nav items based on VIP status
  const navItems = baseNavItems.map(item => ({
    ...item,
    children: item.children?.filter(child => !child.vipOnly || isVIP),
  }));

  // Wait for client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Navigation state for drill-in effect
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  // Reset panel when menu closes
  useEffect(() => {
    if (!isMobileMenuOpen) {
      setTimeout(() => setActivePanel(null), 300);
    }
  }, [isMobileMenuOpen]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        if (activePanel) {
          goBack();
        } else {
          closeMobileMenu();
        }
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMobileMenuOpen, activePanel, closeMobileMenu]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.split("?")[0]);
  };

  const drillIn = (panelId: string) => {
    setDirection("forward");
    setActivePanel(panelId);
  };

  const goBack = () => {
    setDirection("back");
    setActivePanel(null);
  };

  const handleLinkClick = () => {
    closeMobileMenu();
  };

  const handleSignOut = async () => {
    await signOut();
    closeMobileMenu();
  };

  const handleSignIn = () => {
    closeMobileMenu();
    openSignIn();
  };

  // Get current panel data
  const currentPanelData = activePanel 
    ? navItems.find(item => item.id === activePanel) as NavItemWithVIP | undefined
    : null;

  // Level info
  const levelTier = userProfile ? getLevelTier(userProfile.current_level) : null;
  const xpProgress = userProfile 
    ? getXPProgress(userProfile.total_xp, userProfile.current_level) 
    : 0;

  // Animation variants
  const panelVariants = {
    enter: (direction: "forward" | "back") => ({
      x: direction === "forward" ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: "forward" | "back") => ({
      x: direction === "forward" ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence>
      {isMobileMenuOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={closeMobileMenu}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-[300px] max-w-[85vw] bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] z-50 lg:hidden overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-dark-3)]/50">
              <Image
                src="/images/logo.png"
                alt={SITE_NAME}
                width={120}
                height={40}
                className="h-10 w-auto"
              />
              <button
                onClick={closeMobileMenu}
                className="p-2 text-white/70 hover:text-[var(--color-main-1)] transition-colors rounded-lg hover:bg-white/5"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* User Section */}
            <div className="p-4 border-b border-[var(--color-dark-3)]/50">
              {/* Loading skeleton while auth initializes */}
              {(!mounted || !isInitialized) ? (
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--color-dark-3)]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-[var(--color-dark-3)] rounded w-24" />
                      <div className="h-3 bg-[var(--color-dark-3)] rounded w-16" />
                    </div>
                  </div>
                </div>
              ) : isAuthenticated && user ? (
                <div className="space-y-3">
                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {userProfile?.avatar_url || user.user_metadata?.avatar_url ? (
                        <Image
                          src={userProfile?.avatar_url || user.user_metadata?.avatar_url}
                          alt={userProfile?.display_name || user.user_metadata?.username || "User"}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-[var(--color-main-1)]/50"
                        />
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ring-2 ring-[var(--color-main-1)]/50"
                          style={{ 
                            backgroundColor: levelTier?.color || "var(--color-main-1)",
                            color: "white"
                          }}
                        >
                          {(userProfile?.display_name || userProfile?.username || user.user_metadata?.username || user.email || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      {levelTier && userProfile && (
                        <div 
                          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: levelTier.color }}
                        >
                          {userProfile.current_level}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-white truncate">
                        {userProfile?.display_name || userProfile?.username || user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split("@")[0] || "User"}
                      </p>
                      {levelTier && (
                        <p className="text-xs" style={{ color: levelTier.color }}>
                          {levelTier.title}
                        </p>
                      )}
                      {!levelTier && user.email && (
                        <p className="text-xs text-white/50 truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* XP Progress Bar */}
                  {userProfile && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-white/50">
                        <span>{userProfile.total_xp.toLocaleString()} XP</span>
                        <span>Level {userProfile.current_level + 1}</span>
                      </div>
                      <div className="h-1.5 bg-[var(--color-dark-3)] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${xpProgress}%` }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: levelTier?.color || "var(--color-main-1)" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--color-main-1)] hover:bg-[var(--color-main-1)]/90 text-white font-heading rounded-lg transition-all active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Sign In / Register
                </button>
              )}
            </div>

            {/* Navigation Content - Drill-in Panels */}
            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                {!activePanel ? (
                  /* Main Menu */
                  <motion.div
                    key="main"
                    custom={direction}
                    variants={panelVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="absolute inset-0 overflow-y-auto"
                  >
                    <nav className="p-2">
                      {/* Main Navigation */}
                      <ul className="space-y-1">
                        {navItems.map((item, index) => (
                          <motion.li 
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            {item.children ? (
                              <button
                                onClick={() => drillIn(item.id)}
                                className={cn(
                                  "w-full flex items-center justify-between py-3 px-4 rounded-lg transition-all active:scale-[0.98]",
                                  isActive(item.href || "")
                                    ? "bg-[var(--color-main-1)]/10 text-[var(--color-main-1)]"
                                    : "text-white hover:bg-white/5"
                                )}
                              >
                                <span className="flex items-center gap-3">
                                  <span className="text-xl">{item.icon}</span>
                                  <span className="font-heading text-lg">{item.label}</span>
                                </span>
                                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            ) : (
                              <Link
                                href={item.href || "/"}
                                onClick={handleLinkClick}
                                className={cn(
                                  "flex items-center gap-3 py-3 px-4 rounded-lg transition-all active:scale-[0.98]",
                                  isActive(item.href || "")
                                    ? "bg-[var(--color-main-1)]/10 text-[var(--color-main-1)]"
                                    : "text-white hover:bg-white/5"
                                )}
                              >
                                <span className="text-xl">{item.icon}</span>
                                <span className="font-heading text-lg">{item.label}</span>
                              </Link>
                            )}
                          </motion.li>
                        ))}
                      </ul>

                      {/* Account Section (when logged in) */}
                      {mounted && isInitialized && isAuthenticated && (
                        <>
                          <div className="my-4 px-4">
                            <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-dark-3)] to-transparent" />
                          </div>
                          <p className="px-4 py-2 text-xs text-white/40 uppercase tracking-wider font-heading">
                            Account
                          </p>
                          <ul className="space-y-1">
                            {accountItems.map((item, index) => (
                              <motion.li 
                                key={item.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: (navItems.length + index) * 0.05 }}
                              >
                                <Link
                                  href={item.href || "/"}
                                  onClick={handleLinkClick}
                                  className={cn(
                                    "flex items-center gap-3 py-3 px-4 rounded-lg transition-all active:scale-[0.98]",
                                    isActive(item.href || "")
                                      ? "bg-[var(--color-main-1)]/10 text-[var(--color-main-1)]"
                                      : "text-white/70 hover:bg-white/5 hover:text-white"
                                  )}
                                >
                                  <span className="text-lg">{item.icon}</span>
                                  <span className="text-sm">{item.label}</span>
                                </Link>
                              </motion.li>
                            ))}
                          </ul>
                        </>
                      )}
                    </nav>
                  </motion.div>
                ) : (
                  /* Sub Menu Panel */
                  <motion.div
                    key={activePanel}
                    custom={direction}
                    variants={panelVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="absolute inset-0 overflow-y-auto"
                  >
                    <nav className="p-2">
                      {/* Back Button */}
                      <button
                        onClick={goBack}
                        className="w-full flex items-center gap-3 py-3 px-4 mb-2 text-white/70 hover:text-white rounded-lg hover:bg-white/5 transition-all active:scale-[0.98]"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="text-sm">Back</span>
                      </button>

                      {/* Panel Header */}
                      {currentPanelData && (
                        <div className="flex items-center gap-3 py-3 px-4 mb-2">
                          <span className="text-2xl">{currentPanelData.icon}</span>
                          <span className="font-heading text-xl text-[var(--color-main-1)]">
                            {currentPanelData.label}
                          </span>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="mb-2 px-4">
                        <div className="h-px bg-gradient-to-r from-[var(--color-main-1)]/50 via-[var(--color-dark-3)] to-transparent" />
                      </div>

                      {/* Sub Items */}
                      <ul className="space-y-1">
                        {currentPanelData?.children?.map((item, index) => (
                          <motion.li 
                            key={item.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Link
                              href={item.href || "/"}
                              onClick={handleLinkClick}
                              className={cn(
                                "flex items-center gap-3 py-3 px-4 rounded-lg transition-all active:scale-[0.98]",
                                (item as NavItemWithVIP).vipOnly
                                  ? "bg-gradient-to-r from-purple-500/20 to-amber-500/20 text-amber-400 border border-amber-500/30 mt-2"
                                  : isActive(item.href || "")
                                    ? "bg-[var(--color-main-1)]/10 text-[var(--color-main-1)]"
                                    : "text-white hover:bg-white/5"
                              )}
                            >
                              <span className="text-lg">{item.icon}</span>
                              <span className="text-base">{item.label}</span>
                              {(item as NavItemWithVIP).vipOnly && (
                                <span className="ml-auto text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                                  VIP
                                </span>
                              )}
                            </Link>
                          </motion.li>
                        ))}
                      </ul>
                    </nav>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--color-dark-3)]/50 space-y-3">
              {/* Quick Links */}
              <div className="flex items-center justify-center gap-4 text-white/40">
                <Link href="/track-order" onClick={handleLinkClick} className="text-xs hover:text-white transition-colors">
                  Track Order
                </Link>
                <span>•</span>
                <Link href="/contact" onClick={handleLinkClick} className="text-xs hover:text-white transition-colors">
                  Contact
                </Link>
                <span>•</span>
                <Link href="/faq" onClick={handleLinkClick} className="text-xs hover:text-white transition-colors">
                  FAQ
                </Link>
              </div>

              {/* Sign Out Button (when logged in) */}
              {mounted && isInitialized && isAuthenticated && (
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  )}
                  Sign Out
                </button>
              )}

              {/* Copyright */}
              <p className="text-xs text-white/30 text-center">
                © {new Date().getFullYear()} {SITE_NAME}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

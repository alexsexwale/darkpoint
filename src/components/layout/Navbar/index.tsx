"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/constants";
import { NavLinks } from "./NavLinks";
import { NavIcons } from "./NavIcons";
import { MobileNav } from "./MobileNav";
import { XPBar, StreakIndicator, LevelBadge } from "@/components/gamification";
import { useGamificationStore } from "@/stores";

export function Navbar() {
  const [isHidden, setIsHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const { userProfile, isAuthenticated } = useGamificationStore();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    
    // Show/hide based on scroll direction
    if (latest > previous && latest > 150) {
      setIsHidden(true);
    } else {
      setIsHidden(false);
    }
    
    // Add background after scrolling
    setIsScrolled(latest > 50);
  });

  return (
    <>
      <motion.header
        initial={{ y: 0 }}
        animate={{ y: isHidden ? -100 : 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-colors duration-300",
          isScrolled
            ? "bg-[var(--color-dark-1)]/95 backdrop-blur-md border-b border-[var(--color-dark-3)]"
            : "bg-transparent"
        )}
      >
        {/* Top bar */}
        <div className="hidden lg:block border-b border-white/10">
          <div className="container">
            <div className="flex items-center justify-between py-2 text-xs text-[var(--muted-foreground)]">
              <div className="flex items-center gap-4">
                <span>Free shipping on orders over R500</span>
                {/* Rewards link */}
                <Link href="/rewards" className="text-[var(--color-main-1)] hover:text-white transition-colors">
                  🎁 Rewards
                </Link>
              </div>
              <div className="flex items-center gap-4">
                {/* User XP display */}
                {isAuthenticated && userProfile && (
                  <div className="flex items-center gap-3">
                    <StreakIndicator size="sm" showTooltip />
                    <div className="flex items-center gap-2">
                      <LevelBadge size="sm" showTitle={false} animate={false} />
                      <span className="text-[var(--color-main-1)]">
                        {userProfile.total_xp.toLocaleString()} XP
                      </span>
                    </div>
                  </div>
                )}
                <a href="/contact" className="hover:text-white transition-colors">
                  Support
                </a>
                <a href="/contact" className="hover:text-white transition-colors">
                  Contact
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <div className="container">
          <nav className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/images/logo.png"
                alt={SITE_NAME}
                width={180}
                height={60}
                className="h-12 lg:h-14 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center">
              <NavLinks />
            </div>

            {/* Icons */}
            <NavIcons />
          </nav>
        </div>
      </motion.header>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Spacer */}
      <div className="h-16 lg:h-[calc(5rem+2.5rem)]" />
    </>
  );
}

export { NavLinks } from "./NavLinks";
export { NavIcons } from "./NavIcons";
export { MobileNav } from "./MobileNav";


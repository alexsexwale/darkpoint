"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/stores";
import { NavLinks } from "./NavLinks";
import { SITE_NAME } from "@/lib/constants";

export function MobileNav() {
  const { isMobileMenuOpen, closeMobileMenu } = useUIStore();

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
        closeMobileMenu();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMobileMenuOpen, closeMobileMenu]);

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
            className="fixed inset-0 bg-black/80 z-40 lg:hidden"
            onClick={closeMobileMenu}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] bg-[var(--color-dark-1)] z-50 lg:hidden overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-dark-3)]">
              <Image
                src="/images/logo.png"
                alt={SITE_NAME}
                width={120}
                height={40}
                className="h-10 w-auto"
              />
              <button
                onClick={closeMobileMenu}
                className="p-2 text-white hover:text-[var(--color-main-1)] transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-4">
              <NavLinks mobile onLinkClick={closeMobileMenu} />
            </nav>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--color-dark-3)]">
              <p className="text-xs text-[var(--muted-foreground)] text-center">
                © {new Date().getFullYear()} {SITE_NAME}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}



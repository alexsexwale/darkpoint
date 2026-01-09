"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAudioStore, useCartStore, useUIStore, AUDIO_TRACKS } from "@/stores";
import { cn } from "@/lib/utils";

export function SideButtons() {
  const { isPlaying, isMuted, trackIndex, toggle, toggleMute, nextTrack, prevTrack } = useAudioStore();
  const { isOpen: isCartOpen } = useCartStore();
  const { isSearchOpen, isSignInOpen, isForgotPasswordOpen, isSideNavOpen, isMobileMenuOpen } = useUIStore();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showMusicControls, setShowMusicControls] = useState(false);

  // Check if any drawer/modal is open
  const isAnyDrawerOpen = isCartOpen || isSearchOpen || isSignInOpen || isForgotPasswordOpen || isSideNavOpen || isMobileMenuOpen;

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMusicButtonClick = () => {
    setShowMusicControls(!showMusicControls);
  };

  const handleToggleMute = () => {
    toggleMute();
  };

  const handleNextTrack = () => {
    nextTrack();
    // If muted, unmute when changing tracks
    if (isMuted) {
      toggleMute();
    }
  };

  const handlePrevTrack = () => {
    prevTrack();
    // If muted, unmute when changing tracks
    if (isMuted) {
      toggleMute();
    }
  };

  return (
    <div
      className={cn(
        "nk-side-buttons fixed right-5 bottom-5 z-[1000] transition-all duration-200",
        // Hide completely when cart is open (so checkout button is visible)
        isCartOpen && "opacity-0 pointer-events-none translate-y-4",
        // Hide on mobile when other drawers are open
        !isCartOpen && isAnyDrawerOpen && "md:opacity-100 opacity-0 pointer-events-none md:pointer-events-auto"
      )}
    >
      <ul className="flex items-center gap-1.5 list-none p-0 m-0">
        {/* Keep in Touch Button - Hidden on mobile */}
        <li className="hidden sm:block">
          <Link
            href="/contact"
            className="nk-btn nk-btn-lg relative inline-block px-9 py-3.5 font-heading text-sm font-semibold bg-[rgba(23,23,23,0.9)] rounded-sm cursor-pointer transition-all duration-200 hover:bg-[#171717] hover:shadow-[0_5px_15px_0_rgba(23,23,23,0.4)] hover:-translate-y-0.5"
          >
            <span className="absolute top-1 right-1 bottom-1 left-1 border border-white/60 rounded-sm transition-colors" />
            <span className="relative z-10">Keep in Touch</span>
          </Link>
        </li>

        {/* Music Controls Container */}
        <li className="relative">
          <div className="flex items-center gap-1">
            {/* Expanded Music Controls */}
            <AnimatePresence>
              {showMusicControls && (
                <motion.div
                  initial={{ opacity: 0, x: 20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1 mr-1"
                >
                  {/* Previous Track */}
                  <button
                    onClick={handlePrevTrack}
                    className="nk-btn nk-btn-icon relative inline-block p-2.5 font-heading text-sm font-semibold bg-[rgba(23,23,23,0.9)] rounded-sm cursor-pointer transition-all duration-200 hover:bg-[#171717] hover:shadow-[0_5px_15px_0_rgba(23,23,23,0.4)] hover:-translate-y-0.5"
                    aria-label="Previous track"
                  >
                    <span className="absolute top-0.5 right-0.5 bottom-0.5 left-0.5 border border-white/40 rounded-sm transition-colors" />
                    <span className="relative z-10 flex items-center justify-center w-[14px] h-[14px]">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                      </svg>
                    </span>
                  </button>

                  {/* Track Indicator */}
                  <div className="flex items-center gap-1 px-2 py-1.5 bg-[rgba(23,23,23,0.9)] rounded-sm">
                    <div className="flex gap-0.5">
                      {AUDIO_TRACKS.map((_, idx) => (
                        <motion.div
                          key={idx}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full transition-colors duration-200",
                            idx === trackIndex 
                              ? "bg-[var(--color-main-1)]" 
                              : "bg-white/30"
                          )}
                          animate={idx === trackIndex && !isMuted ? {
                            scale: [1, 1.3, 1],
                          } : {}}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Next Track */}
                  <button
                    onClick={handleNextTrack}
                    className="nk-btn nk-btn-icon relative inline-block p-2.5 font-heading text-sm font-semibold bg-[rgba(23,23,23,0.9)] rounded-sm cursor-pointer transition-all duration-200 hover:bg-[#171717] hover:shadow-[0_5px_15px_0_rgba(23,23,23,0.4)] hover:-translate-y-0.5"
                    aria-label="Next track"
                  >
                    <span className="absolute top-0.5 right-0.5 bottom-0.5 left-0.5 border border-white/40 rounded-sm transition-colors" />
                    <span className="relative z-10 flex items-center justify-center w-[14px] h-[14px]">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                      </svg>
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Music Button */}
            <button
              onClick={handleMusicButtonClick}
              className={cn(
                "nk-btn nk-btn-icon relative inline-block p-3.5 font-heading text-sm font-semibold rounded-sm cursor-pointer transition-all duration-200 hover:shadow-[0_5px_15px_0_rgba(23,23,23,0.4)] hover:-translate-y-0.5",
                showMusicControls 
                  ? "bg-[var(--color-main-1)]/90 hover:bg-[var(--color-main-1)]" 
                  : "bg-[rgba(23,23,23,0.9)] hover:bg-[#171717]"
              )}
              aria-label="Music controls"
            >
              <span className={cn(
                "absolute top-1 right-1 bottom-1 left-1 border rounded-sm transition-colors",
                showMusicControls ? "border-white/80" : "border-white/60"
              )} />
              <span className="relative z-10 flex items-center justify-center w-[18px] h-[18px]">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </span>
              {/* Playing indicator */}
              {!isMuted && (
                <motion.span
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[var(--color-main-1)] rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </button>

            {/* Mute/Unmute Button */}
            <button
              onClick={handleToggleMute}
              className="nk-btn nk-btn-icon relative inline-block p-3.5 font-heading text-sm font-semibold bg-[rgba(23,23,23,0.9)] rounded-sm cursor-pointer transition-all duration-200 hover:bg-[#171717] hover:shadow-[0_5px_15px_0_rgba(23,23,23,0.4)] hover:-translate-y-0.5"
              aria-label={isMuted ? "Unmute music" : "Mute music"}
            >
              <span className="absolute top-1 right-1 bottom-1 left-1 border border-white/60 rounded-sm transition-colors" />
              <span className="relative z-10 flex items-center justify-center w-[18px] h-[18px]">
                {!isMuted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                )}
              </span>
            </button>
          </div>
        </li>

        {/* Scroll to Top - Only shows on scroll */}
        <li
          className={cn(
            "nk-scroll-top transition-all duration-200",
            showScrollTop ? "opacity-100 translate-x-0" : "opacity-0 translate-x-5 pointer-events-none"
          )}
        >
          <button
            onClick={scrollToTop}
            className="nk-btn nk-btn-icon relative inline-block p-3.5 font-heading text-sm font-semibold bg-[rgba(23,23,23,0.9)] rounded-sm cursor-pointer transition-all duration-200 hover:bg-[#171717] hover:shadow-[0_5px_15px_0_rgba(23,23,23,0.4)] hover:-translate-y-0.5"
            aria-label="Scroll to top"
          >
            <span className="absolute top-1 right-1 bottom-1 left-1 border border-white/60 rounded-sm transition-colors" />
            <span className="relative z-10 flex items-center justify-center w-[18px] h-[18px]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            </span>
          </button>
        </li>
      </ul>
    </div>
  );
}

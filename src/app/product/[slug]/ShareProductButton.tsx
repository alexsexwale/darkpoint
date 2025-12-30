"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGamificationStore, useAuthStore } from "@/stores";
import type { Product } from "@/types/product";

interface ShareProductButtonProps {
  product: Product;
  className?: string;
}

const shareOptions = [
  {
    name: "Facebook",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    color: "#1877F2",
    shareUrl: (url: string, text: string) => 
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
  },
  {
    name: "Twitter",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: "#000000",
    shareUrl: (url: string, text: string) => 
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    name: "WhatsApp",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    color: "#25D366",
    shareUrl: (url: string, text: string) => 
      `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    name: "Copy Link",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    color: "#6B7280",
    shareUrl: null, // Special case - copies to clipboard
  },
];

export function ShareProductButton({ product, className }: ShareProductButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { updateQuestProgress, initDailyQuests, logActivity, addNotification, addXP } = useGamificationStore();
  const { isAuthenticated } = useAuthStore();
  const hasSharedRef = useRef(false);

  const productUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `Check out ${product.name} at DarkPoint!`;

  const awardShareXP = async (platform: string) => {
    if (!isAuthenticated || hasSharedRef.current) return;
    
    hasSharedRef.current = true;
    initDailyQuests();
    
    const isNewActivity = await logActivity("share_product", product.id);
    if (isNewActivity) {
      console.log(`[Quest] Tracking product share on ${platform}: ${product.name}`);
      updateQuestProgress("share_product", 1);
      
      // Award bonus XP for sharing
      await addXP(10, "share", `Shared product on ${platform}: ${product.name}`);
      
      addNotification({
        type: "xp_gain",
        title: "+10 XP",
        message: `Thanks for sharing on ${platform}!`,
        icon: "🦋",
      });
    }
  };

  const handleShare = async (option: typeof shareOptions[0]) => {
    if (option.shareUrl === null) {
      // Copy to clipboard - no XP for this
      try {
        await navigator.clipboard.writeText(productUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
      setIsOpen(false);
      return;
    }

    // Open share window and track when it closes
    const shareWindow = window.open(
      option.shareUrl(productUrl, shareText), 
      "_blank", 
      "width=600,height=400"
    );

    setIsOpen(false);

    // Award XP when share popup closes (assumes share was completed)
    if (shareWindow && isAuthenticated) {
      const checkClosed = setInterval(() => {
        if (shareWindow.closed) {
          clearInterval(checkClosed);
          awardShareXP(option.name);
        }
      }, 500);

      // Clear interval after 2 minutes max (in case window detection fails)
      setTimeout(() => clearInterval(checkClosed), 120000);
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Share Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-[var(--color-dark-3)] hover:border-[var(--color-main-1)] hover:bg-[var(--color-main-1)]/10 transition-all cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span className="font-heading text-sm tracking-wider">SHARE</span>
      </motion.button>

      {/* Share Options Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full left-0 right-0 mt-2 z-50 bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] shadow-xl overflow-hidden"
            >
              <div className="p-2">
                <p className="text-xs text-white/50 px-3 py-2 border-b border-[var(--color-dark-3)] mb-2">
                  Share this product
                </p>
                {shareOptions.map((option) => (
                  <motion.button
                    key={option.name}
                    whileHover={{ x: 4 }}
                    onClick={() => handleShare(option)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-dark-3)] transition-colors cursor-pointer"
                  >
                    <span style={{ color: option.color }}>{option.icon}</span>
                    <span className="text-sm">
                      {option.name === "Copy Link" && copied ? "Copied!" : option.name}
                    </span>
                    {isAuthenticated && option.shareUrl !== null && !hasSharedRef.current && (
                      <span className="ml-auto text-xs text-[var(--color-main-1)]">+10 XP</span>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Quest hint for logged out users */}
              {!isAuthenticated && (
                <div className="px-3 py-2 bg-[var(--color-main-1)]/10 border-t border-[var(--color-dark-3)]">
                  <p className="text-xs text-white/60">
                    <span className="text-[var(--color-main-1)]">💡 Tip:</span> Sign in to earn XP for sharing!
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


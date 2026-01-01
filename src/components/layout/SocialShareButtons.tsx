"use client";

import { useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useGamificationStore, useAuthStore } from "@/stores";

const socialLinks = [
  {
    name: "WhatsApp",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    shareUrl: (url: string) => `https://wa.me/?text=${encodeURIComponent(`Check this out: ${url}`)}`,
  },
  {
    name: "Facebook",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    shareUrl: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "X",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    shareUrl: (url: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
  },
  {
    name: "Discord",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
    shareUrl: () => `https://discord.gg/darkpoint`,
  },
];

export function SocialShareButtons() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const pathname = usePathname();
  const { updateQuestProgress, initDailyQuests, logActivity, addNotification, addXP, incrementShareCount } = useGamificationStore();
  const { isAuthenticated } = useAuthStore();
  const hasSharedRef = useRef(false);

  // Check if we're on a product page
  const isProductPage = pathname.startsWith("/product/");

  const awardShareXP = async (socialName: string) => {
    if (!isProductPage || !isAuthenticated || hasSharedRef.current) return;
    
    hasSharedRef.current = true;
    initDailyQuests();
    
    // Log activity to prevent duplicate tracking across sessions
    const isNewActivity = await logActivity("share_product", pathname);
    if (isNewActivity) {
      console.log(`[Quest] Tracking product share on ${socialName}`);
      updateQuestProgress("share_product", 1);
      
      // Award bonus XP for sharing
      await addXP(10, "share", `Shared product on ${socialName}`);
      
      // Increment share count for achievements (Sharing is Caring, Social Butterfly, etc.)
      await incrementShareCount();
      
      addNotification({
        type: "xp_gain",
        title: "+10 XP",
        message: `Thanks for sharing on ${socialName}!`,
        icon: "🦋",
      });
    }
  };

  const handleShare = (shareUrl: (url: string) => string, socialName: string) => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareWindow = window.open(shareUrl(url), "_blank", "width=600,height=400");

    // Award XP when share popup closes (assumes share was completed)
    if (shareWindow && isProductPage && isAuthenticated) {
      const checkClosed = setInterval(() => {
        if (shareWindow.closed) {
          clearInterval(checkClosed);
          awardShareXP(socialName);
        }
      }, 500);

      // Clear interval after 2 minutes max
      setTimeout(() => clearInterval(checkClosed), 120000);
    }
  };

  return (
    <div className="fixed left-0 top-0 bottom-0 z-40 hidden md:flex items-center pointer-events-none">
      <ul className="pointer-events-auto">
        {socialLinks.map((social, index) => (
          <li key={social.name} className="relative">
            <button
              onClick={() => handleShare(social.shareUrl, social.name)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="flex items-center justify-center w-[60px] py-4 text-white/70 hover:text-white transition-opacity cursor-pointer"
              title={`Share on ${social.name}`}
            >
              {social.icon}
            </button>
            {/* Name tooltip */}
            <span
              className={cn(
                "absolute left-[60px] top-1/2 -translate-y-1/2 px-4 py-2 text-sm whitespace-nowrap bg-transparent transition-all duration-200",
                hoveredIndex === index
                  ? "opacity-100 visible translate-x-0"
                  : "opacity-0 invisible -translate-x-2"
              )}
            >
              {social.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}


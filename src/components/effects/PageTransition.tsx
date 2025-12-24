"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { useUIStore } from "@/stores";

// Sprite animation config - use different sprites for open/close like Godlike template
const SPRITE_CONFIG = {
  frames: 23,
  speed: 1.2,
  // Open sprite (B&W) - flame expands to COVER the page
  openSprite: "/images/preloader-bg-bw.png",
  // Close sprite - flame shrinks to REVEAL the page  
  closeSprite: "/images/preloader-bg.png",
};

interface SpriteData {
  loaded: boolean;
  width: number;
  height: number;
}

export function PageTransition() {
  const pathname = usePathname();
  const router = useRouter();
  const { isInitialLoad } = useUIStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);
  const hasClosedAfterNav = useRef(false);
  const pendingNavigation = useRef<string | null>(null);
  const lastPathname = useRef(pathname);
  
  const [openSpriteData, setOpenSpriteData] = useState<SpriteData>({ loaded: false, width: 0, height: 0 });
  const [closeSpriteData, setCloseSpriteData] = useState<SpriteData>({ loaded: false, width: 0, height: 0 });

  // Preload both sprites on mount
  useEffect(() => {
    // Open sprite
    const openImg = new window.Image();
    openImg.onload = function() {
      setOpenSpriteData({
        loaded: true,
        width: openImg.width,
        height: openImg.height,
      });
    };
    openImg.src = SPRITE_CONFIG.openSprite;

    // Close sprite
    const closeImg = new window.Image();
    closeImg.onload = function() {
      setCloseSpriteData({
        loaded: true,
        width: closeImg.width,
        height: closeImg.height,
      });
    };
    closeImg.src = SPRITE_CONFIG.closeSprite;
  }, []);

  // Set background size to cover viewport while maintaining aspect ratio
  const prepareBgDiv = useCallback((spriteData: SpriteData, spriteUrl: string) => {
    if (!bgRef.current || !spriteData.loaded) return;
    
    const wndW = window.innerWidth;
    const wndH = window.innerHeight;
    const frameW = spriteData.width / SPRITE_CONFIG.frames;
    const frameH = spriteData.height;

    let width: number, height: number, left: number, top: number;

    if (frameW / frameH > wndW / wndH) {
      height = wndH;
      width = height * frameW / frameH;
      left = (wndW - width) / 2;
      top = 0;
    } else {
      width = wndW;
      height = width * frameH / frameW;
      top = (wndH - height) / 2;
      left = 0;
    }

    gsap.set(bgRef.current, {
      width,
      height,
      left,
      top,
      backgroundImage: `url("${spriteUrl}")`,
    });
  }, []);

  // Open animation: flame expands to cover the page before navigation
  const animateOpen = useCallback((callback?: () => void) => {
    if (isAnimating.current) {
      callback?.();
      return;
    }
    isAnimating.current = true;
    hasClosedAfterNav.current = false;

    const container = containerRef.current;
    const bg = bgRef.current;

    if (!container || !bg) {
      isAnimating.current = false;
      callback?.();
      return;
    }

    if (!openSpriteData.loaded) {
      isAnimating.current = false;
      callback?.();
      return;
    }

    gsap.killTweensOf(bg);
    
    // Use the OPEN sprite (B&W)
    prepareBgDiv(openSpriteData, SPRITE_CONFIG.openSprite);

    // Show container
    gsap.set(container, {
      display: "block",
      opacity: 1,
      visibility: "visible",
    });

    // Open sprite: Start from 0% (no flame) and animate to 100% (flame covering)
    gsap.set(bg, {
      backgroundPosition: "0% 50%",
    });

    gsap.to(bg, {
      backgroundPosition: "100% 50%",
      duration: SPRITE_CONFIG.speed,
      ease: `steps(${SPRITE_CONFIG.frames - 1})`,
      onComplete: () => {
        callback?.();
      },
    });
  }, [openSpriteData, prepareBgDiv]);

  // Close animation: flame shrinks to reveal the page after navigation
  const animateClose = useCallback(() => {
    if (hasClosedAfterNav.current) {
      return;
    }
    hasClosedAfterNav.current = true;

    const container = containerRef.current;
    const bg = bgRef.current;

    if (!container || !bg) {
      isAnimating.current = false;
      return;
    }

    if (!closeSpriteData.loaded) {
      gsap.set(container, { display: "none", opacity: 0, visibility: "hidden" });
      isAnimating.current = false;
      return;
    }

    gsap.killTweensOf(bg);
    
    // Switch to the CLOSE sprite
    prepareBgDiv(closeSpriteData, SPRITE_CONFIG.closeSprite);

    // Ensure container is visible
    gsap.set(container, {
      display: "block",
      opacity: 1,
      visibility: "visible",
    });
    
    // Close sprite: Start from 100% (flame covering) and animate to 0% (page revealed)
    gsap.set(bg, {
      backgroundPosition: "100% 50%",
    });

    gsap.to(bg, {
      backgroundPosition: "0% 50%",
      duration: SPRITE_CONFIG.speed,
      ease: `steps(${SPRITE_CONFIG.frames - 1})`,
      onComplete: () => {
        gsap.set(container, { display: "none", opacity: 0, visibility: "hidden" });
        isAnimating.current = false;
      },
    });
  }, [closeSpriteData, prepareBgDiv]);

  // Handle route changes - close animation after navigation
  useEffect(() => {
    if (pathname !== lastPathname.current) {
      lastPathname.current = pathname;
      
      if (pendingNavigation.current) {
        pendingNavigation.current = null;
        
        const timer = setTimeout(() => {
          animateClose();
        }, 100);
        
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, animateClose]);

  // Intercept link clicks for page transition
  useEffect(() => {
    if (isInitialLoad) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (!link) return;
      
      const href = link.getAttribute('href');
      
      if (
        !href ||
        href.startsWith('http') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        link.target === '_blank' ||
        link.classList.contains('no-transition') ||
        link.classList.contains('no-fade') ||
        link.hasAttribute('download')
      ) {
        return;
      }

      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const currentPath = pathname.split('?')[0].split('#')[0];
      const targetPath = href.split('?')[0].split('#')[0];
      if (targetPath === currentPath) {
        return;
      }

      if (isAnimating.current) {
        return;
      }

      e.preventDefault();
      pendingNavigation.current = href;

      animateOpen(() => {
        router.push(href);
      });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname, router, animateOpen, isInitialLoad]);

  // Handle browser back/forward
  useEffect(() => {
    if (isInitialLoad) return;

    const handlePopState = () => {
      if (!isAnimating.current) {
        pendingNavigation.current = "popstate";
        hasClosedAfterNav.current = false;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isInitialLoad]);

  // Safari bfcache fix
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        const container = containerRef.current;
        if (container) {
          gsap.set(container, { display: "none", opacity: 0, visibility: "hidden" });
        }
        isAnimating.current = false;
        hasClosedAfterNav.current = false;
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  if (isInitialLoad) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden z-[2999]"
      style={{ 
        display: "none", 
        opacity: 0, 
        visibility: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        ref={bgRef}
        className="absolute bg-no-repeat"
        style={{
          backgroundPosition: "0% 50%",
          backgroundSize: "cover",
          backgroundColor: "#000",
          willChange: "background-position",
        }}
      />
    </div>
  );
}

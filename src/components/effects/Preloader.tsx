"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useUIStore } from "@/stores";
import { SITE_NAME } from "@/lib/constants";

// Sprite animation config - matching Godlike template
const SPRITE_CONFIG = {
  frames: 23,
  speed: 1.2,  // Slower for smoother animation
  sprite: "/images/preloader-bg.png",
};

interface SpriteData {
  loaded: boolean;
  width: number;
  height: number;
}

export function Preloader() {
  const { isInitialLoad, hidePreloader, setInitialLoadComplete } = useUIStore();
  const preloaderRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [spriteData, setSpriteData] = useState<SpriteData>({ loaded: false, width: 0, height: 0 });
  const hasAnimated = useRef(false);
  const [isVisible, setIsVisible] = useState(true);

  // Preload sprite image
  useEffect(() => {
    const img = new window.Image();
    img.onload = function() {
      setSpriteData({
        loaded: true,
        width: img.width,
        height: img.height,
      });
      
      // Set initial background position after image loads
      if (bgRef.current) {
        prepareBgDivRef.current?.(img.width, img.height);
        gsap.set(bgRef.current, {
          backgroundPosition: "100% 50%",
        });
      }
    };
    img.src = SPRITE_CONFIG.sprite;
  }, []);

  // Store prepareBgDiv in a ref to avoid circular dependency
  const prepareBgDivRef = useRef<((width: number, height: number) => void) | null>(null);

  // Set background size to cover viewport while maintaining aspect ratio
  const prepareBgDiv = useCallback((imgWidth: number, imgHeight: number) => {
    if (!bgRef.current) return;
    
    const wndW = window.innerWidth;
    const wndH = window.innerHeight;
    const frameW = imgWidth / SPRITE_CONFIG.frames;
    const frameH = imgHeight;

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
      backgroundImage: `url("${SPRITE_CONFIG.sprite}")`,
      force3D: true,
    });
  }, []);

  // Store in ref
  useEffect(() => {
    prepareBgDivRef.current = prepareBgDiv;
  }, [prepareBgDiv]);

  // Close and cleanup
  const finishClose = useCallback(() => {
    setIsVisible(false);
    hidePreloader();
    setInitialLoadComplete();
  }, [hidePreloader, setInitialLoadComplete]);

  // Initial close animation (flame closes/disappears revealing the page)
  const animateClose = useCallback(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const preloader = preloaderRef.current;
    const bg = bgRef.current;
    const content = contentRef.current;

    if (!preloader || !bg || !content) {
      finishClose();
      return;
    }

    // If sprites not loaded, do simple fade
    if (!spriteData.loaded) {
      gsap.to(preloader, {
        opacity: 0,
        duration: 0.5,
        onComplete: finishClose,
      });
      return;
    }

    // Prepare background
    prepareBgDiv(spriteData.width, spriteData.height);

    // Start flame sprite from frame 100% (flame visible/covering)
    gsap.set(bg, {
      backgroundPosition: "100% 50%",
      backgroundColor: "transparent",
    });

    // Fade out content first
    gsap.to(content, {
      y: -20,
      opacity: 0,
      duration: 0.3,
      force3D: true,
      onComplete: () => {
        gsap.set(content, { display: "none" });
      },
    });

    // Animate flame sprite to frame 0% (reveal page)
    gsap.to(bg, {
      backgroundPosition: "0% 50%",
      duration: SPRITE_CONFIG.speed,
      ease: `steps(${SPRITE_CONFIG.frames - 1})`,
      force3D: true,
      onComplete: () => {
        gsap.set(preloader, { display: "none", opacity: 0 });
        finishClose();
      },
    });
  }, [spriteData, prepareBgDiv, finishClose]);

  // Trigger initial close animation after page loads
  useEffect(() => {
    if (!isInitialLoad || hasAnimated.current) return;

    // Wait for page to render and sprites to possibly load
    const timer = setTimeout(() => {
      animateClose();
    }, 800);

    // Safety timeout - force close after 5 seconds
    const safetyTimer = setTimeout(() => {
      if (!hasAnimated.current) {
        hasAnimated.current = true;
        const preloader = preloaderRef.current;
        if (preloader) {
          gsap.to(preloader, {
            opacity: 0,
            duration: 0.3,
            onComplete: finishClose,
          });
        } else {
          finishClose();
        }
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(safetyTimer);
    };
  }, [isInitialLoad, animateClose, finishClose]);

  // Skip button handler
  const handleSkip = () => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    
    const preloader = preloaderRef.current;
    if (preloader) {
      gsap.to(preloader, {
        opacity: 0,
        duration: 0.3,
        onComplete: finishClose,
      });
    } else {
      finishClose();
    }
  };

  // Don't render if not initial load or already hidden
  if (!isInitialLoad || !isVisible) {
    return null;
  }

  return (
    <div
      ref={preloaderRef}
      className="nk-preloader fixed inset-0 overflow-hidden z-[3000] flex items-center justify-center"
    >
      {/* Background with flame animation - fixed dimensions to prevent CLS */}
      <div
        ref={bgRef}
        className="nk-preloader-bg absolute inset-0 bg-no-repeat will-change-[background-position]"
        style={{
          backgroundPosition: "100% 50%",
          backgroundSize: "cover",
          backgroundColor: "#000",
        }}
      />

      {/* Content - Logo and loading animation */}
      <div
        ref={contentRef}
        className="nk-preloader-content absolute inset-0 flex items-center justify-center z-10"
      >
        <div className="text-center">
          <Image
            src="/images/logo.png"
            alt={SITE_NAME}
            width={650}
            height={390}
            priority
            fetchPriority="high"
            className="drop-shadow-[0_0_40px_rgba(224,136,33,0.6)] max-w-[90vw] h-auto"
          />
          <div className="nk-preloader-animation relative block mx-auto mt-8 opacity-70">
            <span className="dot" />
          </div>
        </div>
      </div>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="nk-preloader-skip absolute right-0 bottom-0 p-6 text-sm text-white/70 hover:text-white transition-colors cursor-pointer z-20"
      >
        Skip
      </button>
    </div>
  );
}

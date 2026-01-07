"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Howl } from "howler";
import { useAudioStore } from "@/stores";
import { AUDIO_CONFIG } from "@/lib/constants";

interface BackgroundAudioProps {
  src: string;
  loop?: boolean;
  volume?: number;
  pauseOnBlur?: boolean;
}

export function BackgroundAudio({
  src,
  loop = true,
  volume: initialVolume = AUDIO_CONFIG.defaultVolume,
  pauseOnBlur = true,
}: BackgroundAudioProps) {
  const howlRef = useRef<Howl | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasPausedOnBlurRef = useRef(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const {
    isPlaying,
    isMuted,
    volume,
    play,
    pause,
    setVolume,
    setProgress,
    setDuration,
    setCurrentTrack,
  } = useAudioStore();

  // Wait for Zustand to hydrate from localStorage before acting on muted state
  useEffect(() => {
    // Check if the store has been hydrated by checking if it has the persist API
    const unsubscribe = useAudioStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });
    
    // If already hydrated (e.g., hot reload), set immediately
    if (useAudioStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Fade functions - defined first so they can be used in effects
  const fadeOut = useCallback(() => {
    if (!howlRef.current) return;

    const duration = AUDIO_CONFIG.fadeOutDuration;
    const currentVol = howlRef.current.volume();
    const steps = 20;
    const stepTime = duration / steps;
    const stepAmount = currentVol / steps;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    let currentStep = 0;
    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const newVol = Math.max(0, currentVol - stepAmount * currentStep);
      howlRef.current?.volume(newVol);

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
        }
        howlRef.current?.pause();
      }
    }, stepTime);
  }, []);

  const fadeIn = useCallback(() => {
    if (!howlRef.current) return;

    const duration = AUDIO_CONFIG.fadeInDuration;
    const targetVol = volume / 100;
    const steps = 20;
    const stepTime = duration / steps;
    const stepAmount = targetVol / steps;

    howlRef.current.volume(0);
    howlRef.current.play();

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    let currentStep = 0;
    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const newVol = Math.min(targetVol, stepAmount * currentStep);
      howlRef.current?.volume(newVol);

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
        }
      }
    }, stepTime);
  }, [volume]);

  // Initialize Howl
  useEffect(() => {
    howlRef.current = new Howl({
      src: [src],
      loop,
      volume: initialVolume / 100,
      html5: true,
      onload: () => {
        if (howlRef.current) {
          setDuration(howlRef.current.duration());
          setCurrentTrack(src);
        }
      },
      onplay: () => {
        play();
        // Update progress periodically
        const updateProgress = () => {
          if (howlRef.current && howlRef.current.playing()) {
            setProgress(howlRef.current.seek() as number);
            requestAnimationFrame(updateProgress);
          }
        };
        requestAnimationFrame(updateProgress);
      },
      onpause: () => {
        pause();
      },
      onstop: () => {
        pause();
      },
      onend: () => {
        if (!loop) {
          pause();
        }
      },
    });

    // Set initial volume
    setVolume(initialVolume);

    // Mark as initialized after a small delay (to let zustand hydrate from localStorage)
    const timer = setTimeout(() => {
      setHasInitialized(true);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (howlRef.current) {
        howlRef.current.unload();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Auto-play based on muted state after BOTH component init AND Zustand hydration
  // If user has NOT muted (isMuted = false), auto-play music
  useEffect(() => {
    // Wait for both component initialization AND Zustand hydration
    if (hasInitialized && isHydrated && !isMuted && !isPlaying && howlRef.current) {
      // Small delay to ensure everything is ready
      setTimeout(() => {
        fadeIn();
      }, 500);
    }
    // Only run when both hasInitialized and isHydrated are true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialized, isHydrated]);

  // Handle mute state changes - this is the primary control now
  // Only act on mute changes AFTER hydration to respect persisted state
  useEffect(() => {
    if (!howlRef.current || !hasInitialized || !isHydrated) return;

    if (isMuted && howlRef.current.playing()) {
      // User muted - fade out and pause
      fadeOut();
    } else if (!isMuted && !howlRef.current.playing()) {
      // User unmuted - fade in and play
      fadeIn();
    }
  }, [isMuted, hasInitialized, isHydrated, fadeIn, fadeOut]);

  // Handle play/pause from store (for programmatic control)
  useEffect(() => {
    if (!howlRef.current || !hasInitialized || !isHydrated) return;

    if (isPlaying && !howlRef.current.playing() && !isMuted) {
      fadeIn();
    } else if (!isPlaying && howlRef.current.playing()) {
      fadeOut();
    }
  }, [isPlaying, isMuted, hasInitialized, isHydrated, fadeIn, fadeOut]);

  // Handle volume changes - wait for hydration to use correct muted state
  useEffect(() => {
    if (!howlRef.current || !isHydrated) return;
    howlRef.current.volume(isMuted ? 0 : volume / 100);
  }, [volume, isMuted, isHydrated]);

  // Handle window blur/focus - only if not muted
  useEffect(() => {
    if (!pauseOnBlur || !isHydrated) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (howlRef.current?.playing()) {
          wasPausedOnBlurRef.current = true;
          fadeOut();
        }
      } else {
        // Only resume if not muted
        if (wasPausedOnBlurRef.current && !isMuted) {
          wasPausedOnBlurRef.current = false;
          fadeIn();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pauseOnBlur, isHydrated, isMuted, fadeIn, fadeOut]);

  // This component doesn't render anything visible
  return null;
}



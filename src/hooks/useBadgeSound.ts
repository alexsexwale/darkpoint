"use client";

import { useCallback, useRef } from "react";
import { useAudioStore } from "@/stores";
import type { BadgeType } from "@/components/gamification/BadgeDisplay";

// Sound frequencies for different badge tiers
const BADGE_SOUNDS = {
  badge_fire: {
    frequencies: [440, 554, 659], // A4, C#5, E5 - fiery ascending
    durations: [0.1, 0.1, 0.15],
    type: "sawtooth" as OscillatorType,
    gain: 0.15,
  },
  badge_crown: {
    frequencies: [523, 659, 784, 1047], // C5, E5, G5, C6 - royal fanfare
    durations: [0.1, 0.1, 0.1, 0.2],
    type: "sine" as OscillatorType,
    gain: 0.12,
  },
  frame_gold: {
    frequencies: [659, 784, 988, 1175, 1319], // E5, G5, B5, D6, E6 - golden shimmer
    durations: [0.08, 0.08, 0.08, 0.1, 0.15],
    type: "sine" as OscillatorType,
    gain: 0.1,
  },
};

// Special sound effects
const SPECIAL_SOUNDS = {
  unlock: {
    frequencies: [523, 659, 784, 1047, 1319], // Ascending victory
    durations: [0.1, 0.1, 0.1, 0.1, 0.3],
    type: "sine" as OscillatorType,
    gain: 0.15,
  },
  secret: {
    frequencies: [392, 494, 587, 698, 784], // Mysterious ascending
    durations: [0.15, 0.15, 0.15, 0.15, 0.3],
    type: "triangle" as OscillatorType,
    gain: 0.12,
  },
  vipAccess: {
    frequencies: [523, 659, 784, 659, 784, 1047], // VIP welcome jingle
    durations: [0.1, 0.1, 0.1, 0.1, 0.1, 0.3],
    type: "sine" as OscillatorType,
    gain: 0.12,
  },
  easterEgg: {
    frequencies: [880, 988, 1175, 1319, 1568, 1760], // Exciting discovery
    durations: [0.05, 0.05, 0.05, 0.05, 0.1, 0.2],
    type: "sine" as OscillatorType,
    gain: 0.1,
  },
  konamiSuccess: {
    frequencies: [523, 587, 659, 698, 784, 880, 988, 1047], // Classic game jingle
    durations: [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.3],
    type: "square" as OscillatorType,
    gain: 0.08,
  },
};

interface SoundConfig {
  frequencies: number[];
  durations: number[];
  type: OscillatorType;
  gain: number;
}

export function useBadgeSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const { isMuted } = useAudioStore();

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback(
    (config: SoundConfig) => {
      if (isMuted) return;

      try {
        const ctx = getAudioContext();
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.value = config.gain;

        let startTime = ctx.currentTime;

        config.frequencies.forEach((freq, index) => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(masterGain);

          oscillator.type = config.type;
          oscillator.frequency.value = freq;

          const duration = config.durations[index];

          // Envelope for smooth sound
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(1, startTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

          oscillator.start(startTime);
          oscillator.stop(startTime + duration + 0.1);

          startTime += duration * 0.8; // Slight overlap for smoother sound
        });
      } catch (error) {
        console.warn("Could not play badge sound:", error);
      }
    },
    [getAudioContext, isMuted]
  );

  const playBadgeHover = useCallback(
    (badge: BadgeType) => {
      const config = BADGE_SOUNDS[badge];
      if (config) {
        // Play only first two notes for hover
        playSound({
          ...config,
          frequencies: config.frequencies.slice(0, 2),
          durations: config.durations.slice(0, 2),
          gain: config.gain * 0.5,
        });
      }
    },
    [playSound]
  );

  const playBadgeClick = useCallback(
    (badge: BadgeType) => {
      const config = BADGE_SOUNDS[badge];
      if (config) {
        playSound(config);
      }
    },
    [playSound]
  );

  const playUnlock = useCallback(() => {
    playSound(SPECIAL_SOUNDS.unlock);
  }, [playSound]);

  const playSecret = useCallback(() => {
    playSound(SPECIAL_SOUNDS.secret);
  }, [playSound]);

  const playVIPAccess = useCallback(() => {
    playSound(SPECIAL_SOUNDS.vipAccess);
  }, [playSound]);

  const playEasterEgg = useCallback(() => {
    playSound(SPECIAL_SOUNDS.easterEgg);
  }, [playSound]);

  const playKonamiSuccess = useCallback(() => {
    playSound(SPECIAL_SOUNDS.konamiSuccess);
  }, [playSound]);

  return {
    playBadgeHover,
    playBadgeClick,
    playUnlock,
    playSecret,
    playVIPAccess,
    playEasterEgg,
    playKonamiSuccess,
  };
}

export default useBadgeSound;


import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AUDIO_CONFIG } from "@/lib/constants";

interface AudioState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTrack: string | null;
  progress: number;
  duration: number;
}

interface AudioActions {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unmute: () => void;
  toggleMute: () => void;
  setCurrentTrack: (track: string) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  reset: () => void;
}

type AudioStore = AudioState & AudioActions;

const initialState: AudioState = {
  isPlaying: false,
  isMuted: false, // false = music should play, true = music should be muted
  volume: AUDIO_CONFIG.defaultVolume,
  currentTrack: null,
  progress: 0,
  duration: 0,
};

export const useAudioStore = create<AudioStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      play: () => set({ isPlaying: true }),
      
      pause: () => set({ isPlaying: false }),
      
      toggle: () => set({ isPlaying: !get().isPlaying }),
      
      setVolume: (volume) => {
        const clampedVolume = Math.max(0, Math.min(100, volume));
        set({ volume: clampedVolume });
      },
      
      mute: () => set({ isMuted: true }),
      
      unmute: () => set({ isMuted: false }),
      
      toggleMute: () => set({ isMuted: !get().isMuted }),
      
      setCurrentTrack: (track) => set({ currentTrack: track, progress: 0, duration: 0 }),
      
      setProgress: (progress) => set({ progress }),
      
      setDuration: (duration) => set({ duration }),
      
      reset: () => set(initialState),
    }),
    {
      name: "darkpoint-audio",
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        progress: state.progress,
        currentTrack: state.currentTrack,
      }),
    }
  )
);



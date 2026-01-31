import { create } from "zustand";

interface EmulatorState {
  core: string | null;
  romFile: File | null;
  romFiles: File[]; // For multi-file ROMs (PS1 .cue + .bin)
  biosFile: File | null;
  gameName: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

interface EmulatorActions {
  setPayload: (payload: {
    core: string;
    romFile: File;
    romFiles?: File[];
    biosFile?: File | null;
    gameName?: string;
  }) => void;
  setLoading: (loading: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

const initialState: EmulatorState = {
  core: null,
  romFile: null,
  romFiles: [],
  biosFile: null,
  gameName: null,
  isPlaying: false,
  isLoading: false,
  error: null,
};

export const useEmulatorStore = create<EmulatorState & EmulatorActions>((set) => ({
  ...initialState,

  setPayload: (payload) =>
    set({
      core: payload.core || null,
      romFile: payload.romFile || null,
      romFiles: payload.romFiles || [],
      biosFile: payload.biosFile || null,
      gameName: payload.gameName || null,
      error: null,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setPlaying: (playing) => set({ isPlaying: playing }),

  setError: (error) => set({ error }),

  clear: () => set(initialState),
}));


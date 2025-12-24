import { create } from "zustand";

export interface Rom {
  id: string;
  title: string;
  fileName: string;
  size: string;
  region: string;
  downloadUrl: string;
  imageUrl: string[];
  console: string;
  platform: string;
}

interface RomsState {
  roms: Rom[];
  selectedRom: Rom | null;
  loading: boolean;
  error: string | null;
  totalCount: number;
}

interface RomsActions {
  setRoms: (roms: Rom[]) => void;
  setSelectedRom: (rom: Rom | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchPlayStationRoms: () => Promise<void>;
  fetchPspRoms: () => Promise<void>;
  searchPlayStationRoms: (query: string) => Promise<void>;
  searchPspRoms: (query: string) => Promise<void>;
  clearRoms: () => void;
}

const initialState: RomsState = {
  roms: [],
  selectedRom: null,
  loading: false,
  error: null,
  totalCount: 0,
};

// Cache for ROMs to avoid refetching
let psxRomsCache: Rom[] = [];
let pspRomsCache: Rom[] = [];

export const useRomsStore = create<RomsState & RomsActions>((set, get) => ({
  ...initialState,

  setRoms: (roms) => set({ roms, totalCount: roms.length }),

  setSelectedRom: (rom) => set({ selectedRom: rom }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  fetchPlayStationRoms: async () => {
    // Use cache if available
    if (psxRomsCache.length > 0) {
      set({ roms: psxRomsCache, totalCount: psxRomsCache.length, loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      const response = await fetch("/api/myrient/playstation");
      const data = await response.json();

      if (data.success && data.roms) {
        psxRomsCache = data.roms;
        set({ roms: data.roms, totalCount: data.count, loading: false });
      } else {
        set({ error: data.error || "Failed to fetch PlayStation ROMs", loading: false });
      }
    } catch (error) {
      console.error("Error fetching PlayStation ROMs:", error);
      set({ error: "Failed to fetch PlayStation ROMs", loading: false });
    }
  },

  fetchPspRoms: async () => {
    // Use cache if available
    if (pspRomsCache.length > 0) {
      set({ roms: pspRomsCache, totalCount: pspRomsCache.length, loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      const response = await fetch("/api/myrient/psp");
      const data = await response.json();

      if (data.success && data.roms) {
        pspRomsCache = data.roms;
        set({ roms: data.roms, totalCount: data.count, loading: false });
      } else {
        set({ error: data.error || "Failed to fetch PSP ROMs", loading: false });
      }
    } catch (error) {
      console.error("Error fetching PSP ROMs:", error);
      set({ error: "Failed to fetch PSP ROMs", loading: false });
    }
  },

  searchPlayStationRoms: async (query: string) => {
    const { fetchPlayStationRoms } = get();

    // Make sure we have the full list
    if (psxRomsCache.length === 0) {
      await fetchPlayStationRoms();
    }

    if (!query.trim()) {
      set({ roms: psxRomsCache, totalCount: psxRomsCache.length });
      return;
    }

    const searchTerm = query.toLowerCase();
    const filtered = psxRomsCache.filter(
      (rom) =>
        rom.title.toLowerCase().includes(searchTerm) ||
        rom.fileName.toLowerCase().includes(searchTerm)
    );

    set({ roms: filtered, totalCount: filtered.length });
  },

  searchPspRoms: async (query: string) => {
    const { fetchPspRoms } = get();

    // Make sure we have the full list
    if (pspRomsCache.length === 0) {
      await fetchPspRoms();
    }

    if (!query.trim()) {
      set({ roms: pspRomsCache, totalCount: pspRomsCache.length });
      return;
    }

    const searchTerm = query.toLowerCase();
    const filtered = pspRomsCache.filter(
      (rom) =>
        rom.title.toLowerCase().includes(searchTerm) ||
        rom.fileName.toLowerCase().includes(searchTerm)
    );

    set({ roms: filtered, totalCount: filtered.length });
  },

  clearRoms: () => set({ roms: [], selectedRom: null, totalCount: 0 }),
}));


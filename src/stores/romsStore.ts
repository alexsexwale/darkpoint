import { create } from "zustand";

export interface Rom {
  id: string;
  title: string;
  fileName: string;
  size: string;
  sizeBytes: number;
  region: string;
  downloadUrl: string;
  imageUrl: string[];
  console: string;
  platform: string;
}

export type Platform = 
  | "psx" 
  | "ps2" 
  | "ps3" 
  | "psp" 
  | "dreamcast" 
  | "megacd" 
  | "saturn" 
  | "xbox" 
  | "xbox360"
  | "amigacd"
  | "amigacd32"
  | "amigacdtv";

export interface PlatformInfo {
  id: Platform;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  brand: "Sony" | "Sega" | "Microsoft" | "Commodore";
  note?: string;
}

export const PLATFORMS: PlatformInfo[] = [
  // Sony
  { id: "psx", name: "PlayStation 1", shortName: "PS1", icon: "🎮", description: "Classic PS1 games", brand: "Sony", note: "PS1 games usually have .cue and .bin files - make sure to keep them together!" },
  { id: "ps2", name: "PlayStation 2", shortName: "PS2", icon: "🕹️", description: "PS2 classics library", brand: "Sony", note: "PS2 games are typically .iso files. Use the experimental PS2 emulator at /games/ps2 to play them." },
  { id: "ps3", name: "PlayStation 3", shortName: "PS3", icon: "🎯", description: "PS3 game collection", brand: "Sony", note: "PS3 games are very large (often 10GB+) and require RPCS3 emulator on PC." },
  { id: "psp", name: "PlayStation Portable", shortName: "PSP", icon: "📱", description: "PSP games on the go", brand: "Sony" },
  // Sega
  { id: "dreamcast", name: "Sega Dreamcast", shortName: "DC", icon: "🌀", description: "Dreamcast classics", brand: "Sega", note: "Dreamcast games can be played with Redream or Flycast emulator." },
  { id: "saturn", name: "Sega Saturn", shortName: "Saturn", icon: "🪐", description: "Saturn game library", brand: "Sega", note: "Saturn games require specialized emulators like Mednafen or Yabause." },
  { id: "megacd", name: "Sega Mega CD / Sega CD", shortName: "Mega CD", icon: "💿", description: "Mega CD / Sega CD games", brand: "Sega", note: "Mega CD games can be played with Genesis Plus GX or Kega Fusion." },
  // Microsoft
  { id: "xbox", name: "Microsoft Xbox", shortName: "Xbox", icon: "🎮", description: "Original Xbox games", brand: "Microsoft", note: "Xbox games require XEMU emulator on PC." },
  { id: "xbox360", name: "Microsoft Xbox 360", shortName: "360", icon: "🔵", description: "Xbox 360 library", brand: "Microsoft", note: "Xbox 360 games are very large and require Xenia emulator on PC." },
  // Commodore
  { id: "amigacd", name: "Commodore Amiga CD", shortName: "Amiga CD", icon: "💾", description: "Amiga CD software library", brand: "Commodore", note: "Amiga CD games can be played with FS-UAE or WinUAE emulator." },
  { id: "amigacd32", name: "Commodore Amiga CD32", shortName: "CD32", icon: "🎮", description: "Amiga CD32 console games", brand: "Commodore", note: "CD32 games can be played with FS-UAE or WinUAE emulator with CD32 mode." },
  { id: "amigacdtv", name: "Commodore Amiga CDTV", shortName: "CDTV", icon: "📺", description: "Amiga CDTV multimedia", brand: "Commodore", note: "CDTV titles can be played with FS-UAE or WinUAE emulator with CDTV mode." },
];

interface RomsState {
  roms: Rom[];
  allRoms: Rom[]; // Full unfiltered list for the current platform
  selectedRom: Rom | null;
  loading: boolean;
  error: string | null;
  totalCount: number;
  filteredCount: number;
  currentPlatform: Platform;
  availableRegions: string[];
  
  // Filters
  searchQuery: string;
  regionFilter: string;
  sizeFilter: string;
  
  // Pagination
  currentPage: number;
  itemsPerPage: number;
}

interface RomsActions {
  setCurrentPlatform: (platform: Platform) => void;
  setSelectedRom: (rom: Rom | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Unified fetch method
  fetchRoms: (platform: Platform) => Promise<void>;
  
  // Filters
  setSearchQuery: (query: string) => void;
  setRegionFilter: (region: string) => void;
  setSizeFilter: (size: string) => void;
  applyFilters: () => void;
  clearFilters: () => void;
  
  // Pagination
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
  getPagedRoms: () => Rom[];
  getTotalPages: () => number;
  
  clearRoms: () => void;
}

const initialState: RomsState = {
  roms: [],
  allRoms: [],
  selectedRom: null,
  loading: false,
  error: null,
  totalCount: 0,
  filteredCount: 0,
  currentPlatform: "psx",
  availableRegions: [],
  searchQuery: "",
  regionFilter: "",
  sizeFilter: "",
  currentPage: 1,
  itemsPerPage: 25,
};

// Cache for ROMs per platform
const romsCache: Partial<Record<Platform, { roms: Rom[]; regions: string[] }>> = {};

// API endpoint mapping
const API_ENDPOINTS: Record<Platform, string> = {
  psx: "/api/myrient/playstation",
  ps2: "/api/myrient/ps2",
  ps3: "/api/myrient/ps3",
  psp: "/api/myrient/psp",
  dreamcast: "/api/myrient/dreamcast",
  megacd: "/api/myrient/megacd",
  saturn: "/api/myrient/saturn",
  xbox: "/api/myrient/xbox",
  xbox360: "/api/myrient/xbox360",
  amigacd: "/api/myrient/amigacd",
  amigacd32: "/api/myrient/amigacd32",
  amigacdtv: "/api/myrient/amigacdtv",
};

// Size filter options in bytes
export const SIZE_FILTERS = [
  { label: "All Sizes", value: "", min: 0, max: Infinity },
  { label: "< 100 MiB", value: "small", min: 0, max: 100 * 1024 * 1024 },
  { label: "100 - 500 MiB", value: "medium", min: 100 * 1024 * 1024, max: 500 * 1024 * 1024 },
  { label: "500 MiB - 1 GiB", value: "large", min: 500 * 1024 * 1024, max: 1024 * 1024 * 1024 },
  { label: "1 - 5 GiB", value: "xlarge", min: 1024 * 1024 * 1024, max: 5 * 1024 * 1024 * 1024 },
  { label: "> 5 GiB", value: "xxlarge", min: 5 * 1024 * 1024 * 1024, max: Infinity },
];

export const useRomsStore = create<RomsState & RomsActions>((set, get) => ({
  ...initialState,

  setCurrentPlatform: (platform) => {
    set({ 
      currentPlatform: platform,
      currentPage: 1,
      searchQuery: "",
      regionFilter: "",
      sizeFilter: "",
    });
  },

  setSelectedRom: (rom) => set({ selectedRom: rom }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  fetchRoms: async (platform: Platform) => {
    // Use cache if available
    if (romsCache[platform]) {
      const cached = romsCache[platform]!;
      set({ 
        allRoms: cached.roms,
        roms: cached.roms,
        totalCount: cached.roms.length,
        filteredCount: cached.roms.length,
        availableRegions: cached.regions,
        loading: false,
        currentPage: 1,
      });
      return;
    }

    set({ loading: true, error: null });

    try {
      const endpoint = API_ENDPOINTS[platform];
      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.success && data.roms) {
        // Ensure sizeBytes exists (fallback for older cached data)
        const roms = data.roms.map((rom: Rom) => ({
          ...rom,
          sizeBytes: rom.sizeBytes || 0,
        }));
        
        romsCache[platform] = { 
          roms, 
          regions: data.regions || [...new Set(roms.map((r: Rom) => r.region))].sort() as string[]
        };
        
        set({ 
          allRoms: roms,
          roms: roms,
          totalCount: roms.length,
          filteredCount: roms.length,
          availableRegions: romsCache[platform]!.regions,
          loading: false,
          currentPage: 1,
        });
      } else {
        set({ error: data.error || `Failed to fetch ${platform} ROMs`, loading: false });
      }
    } catch (error) {
      console.error(`Error fetching ${platform} ROMs:`, error);
      set({ error: `Failed to fetch ${platform} ROMs`, loading: false });
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query, currentPage: 1 });
    get().applyFilters();
  },

  setRegionFilter: (region) => {
    set({ regionFilter: region, currentPage: 1 });
    get().applyFilters();
  },

  setSizeFilter: (size) => {
    set({ sizeFilter: size, currentPage: 1 });
    get().applyFilters();
  },

  applyFilters: () => {
    const { allRoms, searchQuery, regionFilter, sizeFilter } = get();
    
    let filtered = [...allRoms];

    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (rom) =>
          rom.title.toLowerCase().includes(searchLower) ||
          rom.fileName.toLowerCase().includes(searchLower)
      );
    }

    // Apply region filter
    if (regionFilter) {
      filtered = filtered.filter((rom) => rom.region === regionFilter);
    }

    // Apply size filter
    if (sizeFilter) {
      const sizeConfig = SIZE_FILTERS.find((s) => s.value === sizeFilter);
      if (sizeConfig) {
        filtered = filtered.filter(
          (rom) => rom.sizeBytes >= sizeConfig.min && rom.sizeBytes < sizeConfig.max
        );
      }
    }

    set({ 
      roms: filtered, 
      filteredCount: filtered.length,
      currentPage: 1,
    });
  },

  clearFilters: () => {
    const { allRoms } = get();
    set({
      searchQuery: "",
      regionFilter: "",
      sizeFilter: "",
      roms: allRoms,
      filteredCount: allRoms.length,
      currentPage: 1,
    });
  },

  setCurrentPage: (page) => set({ currentPage: page }),

  setItemsPerPage: (count) => set({ itemsPerPage: count, currentPage: 1 }),

  getPagedRoms: () => {
    const { roms, currentPage, itemsPerPage } = get();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return roms.slice(startIndex, startIndex + itemsPerPage);
  },

  getTotalPages: () => {
    const { filteredCount, itemsPerPage } = get();
    return Math.ceil(filteredCount / itemsPerPage);
  },

  clearRoms: () => set({ 
    roms: [], 
    allRoms: [],
    selectedRom: null, 
    totalCount: 0,
    filteredCount: 0,
    currentPage: 1,
  }),
}));

// Legacy exports for backwards compatibility
export const fetchPlayStationRoms = () => useRomsStore.getState().fetchRoms("psx");
export const fetchPspRoms = () => useRomsStore.getState().fetchRoms("psp");
export const fetchPs2Roms = () => useRomsStore.getState().fetchRoms("ps2");
export const fetchPs3Roms = () => useRomsStore.getState().fetchRoms("ps3");

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AccountLayout } from "@/components/account";
import { Button } from "@/components/ui";
import { useRomsStore, PLATFORMS, SIZE_FILTERS } from "@/stores/romsStore";
import type { Rom, Platform, PlatformInfo } from "@/stores/romsStore";
import { useAuthStore, useAccountStore } from "@/stores";
import type { UserRomDownload } from "@/stores/accountStore";
import { supabase } from "@/lib/supabase";

const PLACEHOLDER_IMAGE_PATH = "/images/placeholder-game.svg";

// Group platforms by brand for the dropdown
const PLATFORM_GROUPS = [
  { brand: "Sony", platforms: PLATFORMS.filter(p => p.brand === "Sony") },
  { brand: "Nintendo", platforms: PLATFORMS.filter(p => p.brand === "Nintendo") },
  { brand: "Sega", platforms: PLATFORMS.filter(p => p.brand === "Sega") },
  { brand: "Atari", platforms: PLATFORMS.filter(p => p.brand === "Atari") },
  { brand: "Microsoft", platforms: PLATFORMS.filter(p => p.brand === "Microsoft") },
  { brand: "Commodore", platforms: PLATFORMS.filter(p => p.brand === "Commodore") },
];

function matchesConsoleSearch(platform: PlatformInfo, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  return (
    platform.name.toLowerCase().includes(q) ||
    platform.shortName.toLowerCase().includes(q) ||
    platform.brand.toLowerCase().includes(q) ||
    platform.description.toLowerCase().includes(q)
  );
}

export function DownloadsPageClient() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [consoleSearch, setConsoleSearch] = useState("");
  const [romDetailRom, setRomDetailRom] = useState<Rom | null>(null);
  const [romArtUrls, setRomArtUrls] = useState<Record<string, string>>({});
  const [downloadsTab, setDownloadsTab] = useState<"library" | "my-downloads">("library");
  const [redownloadingId, setRedownloadingId] = useState<string | null>(null);
  const requestedArtIds = useRef<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const consoleSearchInputRef = useRef<HTMLInputElement>(null);

  const {
    roms,
    loading,
    error,
    totalCount,
    filteredCount,
    currentPlatform,
    availableRegions,
    searchQuery,
    regionFilter,
    sizeFilter,
    currentPage,
    itemsPerPage,
    setCurrentPlatform,
    fetchRoms,
    setSearchQuery,
    setRegionFilter,
    setSizeFilter,
    clearFilters,
    setCurrentPage,
    setItemsPerPage,
    getPagedRoms,
    getTotalPages,
  } = useRomsStore();

  const {
    romDownloads,
    isLoadingRomDownloads,
    fetchRomDownloads,
  } = useAccountStore();

  const pagedRoms = getPagedRoms();
  const totalPages = getTotalPages();
  const currentPlatformInfo = PLATFORMS.find(p => p.id === currentPlatform);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus console search when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      setConsoleSearch("");
      requestAnimationFrame(() => consoleSearchInputRef.current?.focus());
    }
  }, [isDropdownOpen]);

  // Filter platform groups by console search
  const filteredPlatformGroups = PLATFORM_GROUPS.map((group) => ({
    ...group,
    platforms: group.platforms.filter((p) => matchesConsoleSearch(p, consoleSearch)),
  })).filter((group) => group.platforms.length > 0);

  // Fetch ROMs when platform changes
  useEffect(() => {
    fetchRoms(currentPlatform);
  }, [currentPlatform, fetchRoms]);

  // Handle platform selection
  const handlePlatformSelect = (platform: Platform) => {
    setCurrentPlatform(platform);
    setIsDropdownOpen(false);
    setConsoleSearch("");
  };

  // Close ROM detail modal on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRomDetailRom(null);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Lazy-load game art for visible ROMs (requested IDs tracked in ref to avoid duplicate fetches)
  const fetchArtForRom = useCallback((rom: Rom) => {
    if (requestedArtIds.current.has(rom.id)) return;
    requestedArtIds.current.add(rom.id);
    const params = new URLSearchParams({
      title: rom.title,
      platform: rom.platform,
    });
    fetch(`/api/game-art?${params}`)
      .then((res) => res.json())
      .then((data: { imageUrl?: string | null }) => {
        if (data?.imageUrl) {
          setRomArtUrls((prev) => ({ ...prev, [rom.id]: data.imageUrl! }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    pagedRoms.forEach((rom) => fetchArtForRom(rom));
    if (romDetailRom) fetchArtForRom(romDetailRom);
  }, [pagedRoms, romDetailRom, fetchArtForRom]);

  // Helper: get display image for a ROM (art URL or null for emoji fallback)
  const getRomImageUrl = useCallback((rom: Rom): string | null => {
    const url = romArtUrls[rom.id];
    if (url && url !== PLACEHOLDER_IMAGE_PATH) return url;
    return null;
  }, [romArtUrls]);

  // Handle download
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const startDownload = async (rom: Rom) => {
    if (!rom || !rom.downloadUrl) return;
    setDownloadingId(rom.id);

    if (isAuthenticated) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await fetch("/api/account/rom-downloads", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              title: rom.title,
              fileName: rom.fileName,
              size: rom.size,
              sizeBytes: rom.sizeBytes ?? 0,
              region: rom.region,
              downloadUrl: rom.downloadUrl,
              console: rom.console,
              platform: rom.platform,
              imageUrl: Array.isArray(rom.imageUrl) && rom.imageUrl[0] ? rom.imageUrl[0] : undefined,
            }),
          });
          if (!res.ok && res.status !== 401) {
            console.warn("Failed to record ROM download:", await res.text());
          }
        }
      } catch (err) {
        console.warn("Could not record ROM download:", err);
      }
    }

    const a = document.createElement("a");
    const fileName = (rom.fileName || rom.title || "game") + ".zip";
    a.href = `/api/myrient/download?url=${encodeURIComponent(rom.downloadUrl)}&filename=${encodeURIComponent(fileName)}`;
    a.download = fileName;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    requestAnimationFrame(() => {
      a.remove();
      setTimeout(() => setDownloadingId(null), 2000);
    });
  };

  const handleRedownload = async (row: UserRomDownload) => {
    if (!row.download_url || !row.file_name) return;
    setRedownloadingId(row.id);
    try {
      if (isAuthenticated) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch("/api/account/rom-downloads", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              title: row.title,
              fileName: row.file_name,
              size: row.size,
              sizeBytes: row.size_bytes ?? 0,
              region: row.region,
              downloadUrl: row.download_url,
              console: row.console,
              platform: row.platform,
              imageUrl: row.image_url ?? undefined,
            }),
          });
        }
      }
      const a = document.createElement("a");
      a.href = `/api/myrient/download?url=${encodeURIComponent(row.download_url)}&filename=${encodeURIComponent(row.file_name)}`;
      a.download = row.file_name;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      requestAnimationFrame(() => a.remove());
      await fetchRomDownloads();
    } finally {
      setTimeout(() => setRedownloadingId(null), 1500);
    }
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      if (currentPage > 3) pages.push("...");
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push("...");
      
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    
    return pages;
  };

  const hasActiveFilters = searchQuery || regionFilter || sizeFilter;

  return (
    <AccountLayout title="ROM Library">
      <div className="space-y-6">
        {/* Tabs: ROM Library | My Downloaded ROMs */}
        <div className="flex gap-1 p-1 bg-[var(--color-dark-3)]/50 border border-[var(--color-dark-4)] rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setDownloadsTab("library")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              downloadsTab === "library"
                ? "bg-[var(--color-main-1)] text-white"
                : "text-[var(--muted-foreground)] hover:text-white hover:bg-[var(--color-dark-4)]"
            }`}
          >
            ROM Library
          </button>
          <button
            type="button"
            onClick={() => {
              setDownloadsTab("my-downloads");
              if (isAuthenticated) fetchRomDownloads();
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              downloadsTab === "my-downloads"
                ? "bg-[var(--color-main-1)] text-white"
                : "text-[var(--muted-foreground)] hover:text-white hover:bg-[var(--color-dark-4)]"
            }`}
          >
            My Downloaded ROMs
          </button>
        </div>

        {downloadsTab === "my-downloads" ? (
          /* My Downloaded ROMs tab */
          <div className="space-y-4">
            {!isAuthenticated ? (
              <div className="text-center py-12 bg-[var(--color-dark-3)]/30 rounded-lg">
                <p className="text-[var(--muted-foreground)]">Sign in to see your download history.</p>
              </div>
            ) : isLoadingRomDownloads ? (
              <div className="grid gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-[var(--color-dark-3)]/30 rounded-lg">
                    <div className="w-12 h-12 bg-[var(--color-dark-4)] rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-[var(--color-dark-4)] rounded w-1/3 mb-2" />
                      <div className="h-3 bg-[var(--color-dark-4)] rounded w-1/4" />
                    </div>
                    <div className="h-8 w-24 bg-[var(--color-dark-4)] rounded" />
                  </div>
                ))}
              </div>
            ) : romDownloads.length === 0 ? (
              <div className="text-center py-12 bg-[var(--color-dark-3)]/30 rounded-lg">
                <span className="text-4xl mb-4 block">📦</span>
                <p className="text-[var(--muted-foreground)]">No downloaded ROMs yet.</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">Download games from the ROM Library to see them here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {romDownloads.map((row: UserRomDownload) => (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 p-4 bg-[var(--color-dark-3)]/30 hover:bg-[var(--color-dark-3)]/50 rounded-lg transition-colors"
                  >
                    <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-[var(--color-dark-4)] to-[var(--color-dark-3)] rounded-lg flex items-center justify-center overflow-hidden">
                      {row.image_url ? (
                        <img src={row.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <img src={PLACEHOLDER_IMAGE_PATH} alt="" className="w-8 h-8 opacity-50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{row.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                        <span className="text-[var(--color-main-1)] font-medium">{row.region}</span>
                        <span>•</span>
                        <span>{row.size}</span>
                        <span>•</span>
                        <span>{row.console}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRedownload(row)}
                      disabled={redownloadingId === row.id}
                      className="flex-shrink-0"
                    >
                      {redownloadingId === row.id ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Starting...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Re-download
                        </span>
                      )}
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
        {/* Console Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-sm text-[var(--muted-foreground)] mb-2">Select Console</label>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[var(--color-dark-2)] border border-[var(--color-dark-4)] hover:border-[var(--color-main-1)]/50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentPlatformInfo?.icon}</span>
              <div className="text-left">
                <p className="font-medium text-white">{currentPlatformInfo?.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{currentPlatformInfo?.description}</p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-[var(--muted-foreground)] transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute z-50 w-full mt-2 bg-[var(--color-dark-2)] border border-[var(--color-dark-4)] rounded-lg shadow-xl overflow-hidden"
              >
                {/* Console search */}
                <div className="p-2 border-b border-[var(--color-dark-4)]">
                  <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg focus-within:border-[var(--color-main-1)] transition-colors">
                    <svg className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      ref={consoleSearchInputRef}
                      type="text"
                      placeholder="Search consoles..."
                      value={consoleSearch}
                      onChange={(e) => setConsoleSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-[var(--muted-foreground)] outline-none focus:ring-0 border-none"
                    />
                    {consoleSearch && (
                      <button
                        type="button"
                        onClick={() => setConsoleSearch("")}
                        className="text-[var(--muted-foreground)] hover:text-white transition-colors"
                        aria-label="Clear search"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[340px] overflow-y-auto">
                  {filteredPlatformGroups.length > 0 ? (
                    filteredPlatformGroups.map((group, groupIndex) => (
                      <div key={group.brand}>
                        {groupIndex > 0 && <div className="border-t border-[var(--color-dark-4)]" />}
                        <div className="px-3 py-2 bg-[var(--color-dark-3)]/50 sticky top-0 z-10">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                            {group.brand}
                          </span>
                        </div>
                        {group.platforms.map((platform) => (
                          <button
                            key={platform.id}
                            onClick={() => handlePlatformSelect(platform.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-dark-3)] transition-colors ${
                              currentPlatform === platform.id ? "bg-[var(--color-main-1)]/10 border-l-2 border-[var(--color-main-1)]" : ""
                            }`}
                          >
                            <span className="text-xl">{platform.icon}</span>
                            <div className="text-left flex-1">
                              <p className={`font-medium ${currentPlatform === platform.id ? "text-[var(--color-main-1)]" : "text-white"}`}>
                                {platform.name}
                              </p>
                              <p className="text-xs text-[var(--muted-foreground)]">{platform.description}</p>
                            </div>
                            {currentPlatform === platform.id && (
                              <svg className="w-5 h-5 text-[var(--color-main-1)]" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                      No consoles match &quot;{consoleSearch}&quot;
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search and Filters */}
        <div className="bg-[var(--color-dark-2)]/50 border border-[var(--color-dark-4)] rounded-lg p-4 space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg focus-within:border-[var(--color-main-1)] transition-colors">
            <svg 
              className="w-5 h-5 text-[var(--muted-foreground)] flex-shrink-0" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={`Search ${currentPlatformInfo?.name} games...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-[var(--muted-foreground)] outline-none focus:ring-0 border-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[var(--muted-foreground)] hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3">
            {/* Region Filter */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">Region</label>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--color-main-1)]"
              >
                <option value="">All Regions</option>
                {availableRegions.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            {/* Size Filter */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">File Size</label>
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--color-main-1)]"
              >
                {SIZE_FILTERS.map((size) => (
                  <option key={size.value} value={size.value}>{size.label}</option>
                ))}
              </select>
            </div>

            {/* Items Per Page */}
            <div className="min-w-[100px]">
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">Per Page</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--color-main-1)]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-[var(--color-main-1)] hover:bg-[var(--color-main-1)]/10 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results Summary */}
        {!loading && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-[var(--muted-foreground)]">
              {filteredCount > 0 ? (
                <>
                  Showing <span className="text-white font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span>
                  {" - "}
                  <span className="text-white font-medium">{Math.min(currentPage * itemsPerPage, filteredCount)}</span>
                  {" of "}
                  <span className="text-white font-medium">{filteredCount.toLocaleString()}</span>
                  {filteredCount !== totalCount && (
                    <span className="text-[var(--muted-foreground)]"> (filtered from {totalCount.toLocaleString()})</span>
                  )}
                  {" games"}
                </>
              ) : (
                "No games found"
              )}
            </p>
            {hasActiveFilters && (
              <p className="text-[var(--muted-foreground)]">
                {searchQuery && <span>Search: <span className="text-[var(--color-main-1)]">"{searchQuery}"</span></span>}
                {regionFilter && <span className="ml-2">Region: <span className="text-[var(--color-main-1)]">{regionFilter}</span></span>}
                {sizeFilter && <span className="ml-2">Size: <span className="text-[var(--color-main-1)]">{SIZE_FILTERS.find(s => s.value === sizeFilter)?.label}</span></span>}
              </p>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-[var(--color-dark-3)]/30 rounded-lg">
                <div className="w-12 h-12 bg-[var(--color-dark-4)] rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-[var(--color-dark-4)] rounded w-1/3 mb-2" />
                  <div className="h-3 bg-[var(--color-dark-4)] rounded w-1/4" />
                </div>
                <div className="h-8 w-24 bg-[var(--color-dark-4)] rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-[var(--color-dark-3)]/30 rounded-lg">
            <span className="text-4xl mb-4 block">⚠️</span>
            <p className="text-[var(--muted-foreground)]">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => fetchRoms(currentPlatform)}>
              Try Again
            </Button>
          </div>
        ) : pagedRoms.length > 0 ? (
          <>
            {/* ROM List */}
            <div className="space-y-2">
              {pagedRoms.map((rom, index) => (
                <motion.div
                  key={`${rom.id}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center gap-4 p-4 bg-[var(--color-dark-3)]/30 hover:bg-[var(--color-dark-3)]/50 rounded-lg transition-colors group"
                >
                  {/* Game Icon / Cover */}
                  <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-[var(--color-dark-4)] to-[var(--color-dark-3)] rounded-lg flex items-center justify-center overflow-hidden text-[var(--muted-foreground)]">
                    {getRomImageUrl(rom) ? (
                      <img
                        src={getRomImageUrl(rom)!}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={PLACEHOLDER_IMAGE_PATH}
                        alt=""
                        className="w-8 h-8 opacity-50"
                      />
                    )}
                  </div>

                  {/* Game Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate group-hover:text-[var(--color-main-1)] transition-colors">
                      {rom.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                      <span className="text-[var(--color-main-1)] font-medium">{rom.region}</span>
                      <span>•</span>
                      <span>{rom.size}</span>
                    </div>
                  </div>

                  {/* Info Button */}
                  <button
                    type="button"
                    onClick={() => setRomDetailRom(rom)}
                    className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] hover:border-[var(--color-main-1)]/50 hover:bg-[var(--color-dark-4)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--color-main-1)] transition-colors"
                    title="View details"
                    aria-label="View game details"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>

                  {/* Download Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startDownload(rom)}
                    disabled={downloadingId === rom.id}
                    className="flex-shrink-0"
                  >
                    {downloadingId === rom.id ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Starting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </span>
                    )}
                  </Button>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page, index) => (
                    typeof page === "number" ? (
                      <button
                        key={index}
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[40px] px-3 py-2 rounded-lg transition-colors ${
                          currentPage === page
                            ? "bg-[var(--color-main-1)] text-white"
                            : "bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] text-white"
                        }`}
                      >
                        {page}
                      </button>
                    ) : (
                      <span key={index} className="px-2 text-[var(--muted-foreground)]">...</span>
                    )
                  ))}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-lg bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-[var(--color-dark-3)]/30 rounded-lg">
            <span className="text-4xl mb-4 block">🔍</span>
            <p className="text-[var(--muted-foreground)] mb-2">No games found</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Try adjusting your filters or search term
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear All Filters
              </Button>
            )}
          </div>
        )}

        {/* ROM Detail Modal */}
        <AnimatePresence>
          {romDetailRom && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
              onClick={() => setRomDetailRom(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="w-full max-w-lg bg-[var(--color-dark-2)] border border-[var(--color-dark-4)] rounded-xl shadow-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-dark-4)] bg-[var(--color-dark-3)]/50">
                  <span className="text-sm font-medium text-[var(--muted-foreground)]">Game details</span>
                  <button
                    type="button"
                    onClick={() => setRomDetailRom(null)}
                    className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-white hover:bg-[var(--color-dark-4)] transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex gap-5">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-gradient-to-br from-[var(--color-dark-4)] to-[var(--color-dark-3)] rounded-xl flex items-center justify-center overflow-hidden text-[var(--muted-foreground)] shadow-lg ring-1 ring-[var(--color-dark-4)]">
                      {romDetailRom && getRomImageUrl(romDetailRom) ? (
                        <img
                          src={getRomImageUrl(romDetailRom)!}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={PLACEHOLDER_IMAGE_PATH}
                          alt=""
                          className="w-16 h-16 opacity-50"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white text-lg leading-snug break-words">
                        {romDetailRom.title}
                      </h3>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1 break-all">
                        {romDetailRom.fileName}
                      </p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-[var(--muted-foreground)]">Region</dt>
                      <dd className="font-medium text-white mt-0.5">{romDetailRom.region}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted-foreground)]">File size</dt>
                      <dd className="font-medium text-white mt-0.5">{romDetailRom.size}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted-foreground)]">Console</dt>
                      <dd className="font-medium text-white mt-0.5">{romDetailRom.console}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted-foreground)]">Platform</dt>
                      <dd className="font-medium text-white mt-0.5">{romDetailRom.platform}</dd>
                    </div>
                  </dl>
                  <div className="pt-2 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setRomDetailRom(null)}>
                      Close
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        startDownload(romDetailRom);
                      }}
                      disabled={downloadingId === romDetailRom.id}
                    >
                      {downloadingId === romDetailRom.id ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Starting...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Box */}
        <div className="bg-[var(--color-dark-2)]/50 border border-[var(--color-dark-3)] rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div className="text-sm text-[var(--muted-foreground)]">
              <p className="font-medium text-white mb-1">How to play downloaded games:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Download the game you want to play</li>
                <li>Extract the ZIP file (you'll get .bin/.cue or .iso files)</li>
                <li>Go to the <a href="/arcade" className="text-[var(--color-main-1)] hover:underline">Retro Arcade</a></li>
                <li>Launch the emulator and drag your ROM file onto it</li>
              </ol>
              {currentPlatformInfo?.note && (
                <p className="mt-2 text-yellow-400/80">
                  <strong>Note:</strong> {currentPlatformInfo.note}
                </p>
              )}
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </AccountLayout>
  );
}

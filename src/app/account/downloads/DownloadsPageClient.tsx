"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AccountLayout } from "@/components/account";
import { Button } from "@/components/ui";
import { useRomsStore, PLATFORMS, SIZE_FILTERS } from "@/stores/romsStore";
import type { Rom, Platform, PlatformInfo } from "@/stores/romsStore";

// Group platforms by brand for the dropdown
const PLATFORM_GROUPS = [
  { brand: "Sony", platforms: PLATFORMS.filter(p => p.brand === "Sony") },
  { brand: "Sega", platforms: PLATFORMS.filter(p => p.brand === "Sega") },
  { brand: "Microsoft", platforms: PLATFORMS.filter(p => p.brand === "Microsoft") },
  { brand: "Commodore", platforms: PLATFORMS.filter(p => p.brand === "Commodore") },
];

export function DownloadsPageClient() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Fetch ROMs when platform changes
  useEffect(() => {
    fetchRoms(currentPlatform);
  }, [currentPlatform, fetchRoms]);

  // Handle platform selection
  const handlePlatformSelect = (platform: Platform) => {
    setCurrentPlatform(platform);
    setIsDropdownOpen(false);
  };

  // Handle download
  const startDownload = (rom: Rom) => {
    if (!rom || !rom.downloadUrl) return;
    setDownloadingId(rom.id);
    
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
                <div className="max-h-[400px] overflow-y-auto">
                  {PLATFORM_GROUPS.map((group, groupIndex) => (
                    <div key={group.brand}>
                      {groupIndex > 0 && <div className="border-t border-[var(--color-dark-4)]" />}
                      <div className="px-3 py-2 bg-[var(--color-dark-3)]/50">
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
                  ))}
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
                  {/* Game Icon */}
                  <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-[var(--color-dark-4)] to-[var(--color-dark-3)] rounded-lg flex items-center justify-center">
                    <span className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity">
                      {currentPlatformInfo?.icon || "🎮"}
                    </span>
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
      </div>
    </AccountLayout>
  );
}

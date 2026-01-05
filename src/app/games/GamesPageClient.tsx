"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useEmulatorStore, useRomsStore } from "@/stores";
import { Button, Input } from "@/components/ui";
import type { Rom } from "@/stores/romsStore";

const EJS_DATA_BASE = "https://cdn.emulatorjs.org/stable/data/";
const BUILTIN_PSX_BIOS = "/bios/playstation/scph5501.bin";

// Console options with better categorization
const CONSOLE_CATEGORIES = [
  {
    name: "PlayStation",
    consoles: [
      { value: "psx", label: "PlayStation 1", icon: "🎮", hasRomSearch: true, color: "#003087" },
      { value: "psp", label: "PSP", icon: "📱", hasRomSearch: true, color: "#00439c" },
      { value: "ps2", label: "PlayStation 2", icon: "🎮", hasRomSearch: false, external: true, color: "#003087", experimental: true },
    ],
  },
  {
    name: "Nintendo",
    consoles: [
      { value: "nes", label: "NES", icon: "🕹️", hasRomSearch: false, color: "#e60012" },
      { value: "snes", label: "SNES", icon: "🎮", hasRomSearch: false, color: "#8f8f8f" },
      { value: "n64", label: "N64", icon: "🎮", hasRomSearch: false, color: "#009c00" },
      { value: "gb", label: "Game Boy", icon: "🕹️", hasRomSearch: false, color: "#8b956d" },
      { value: "gbc", label: "Game Boy Color", icon: "🕹️", hasRomSearch: false, color: "#663399" },
      { value: "gba", label: "GBA", icon: "🕹️", hasRomSearch: false, color: "#4f4f87" },
    ],
  },
  {
    name: "Sega",
    consoles: [
      { value: "sms", label: "Master System", icon: "🎮", hasRomSearch: false, color: "#d91818" },
      { value: "md", label: "Genesis / Mega Drive", icon: "🎮", hasRomSearch: false, color: "#1a1a1a" },
      { value: "gg", label: "Game Gear", icon: "🕹️", hasRomSearch: false, color: "#1a1a1a" },
    ],
  },
];

// Flatten for easy access
const ALL_CONSOLES = CONSOLE_CATEGORIES.flatMap((cat) => cat.consoles);

// External ROM URLs
const EXTERNAL_ROM_URLS: Record<string, string> = {
  gba: "https://www.romsgames.net/roms/gameboy-advance/",
  gb: "https://www.romsgames.net/roms/gameboy/",
  gbc: "https://www.romsgames.net/roms/gameboy-color/",
  snes: "https://www.romsgames.net/roms/super-nintendo/",
  nes: "https://www.romsgames.net/roms/nintendo/",
  n64: "https://www.romsgames.net/roms/nintendo-64/",
  sms: "https://www.romsgames.net/roms/sega-master-system/",
  gg: "https://www.romsgames.net/roms/game-gear/",
  md: "https://www.romsgames.net/roms/sega-genesis/",
};

export function GamesPageClient() {
  const [selectedCore, setSelectedCore] = useState("psx");
  const [romFile, setRomFile] = useState<File | null>(null);
  const [isBooting, setIsBooting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const emulatorStore = useEmulatorStore();
  const romsStore = useRomsStore();

  // Fetch ROMs when console changes
  useEffect(() => {
    const console = ALL_CONSOLES.find((c) => c.value === selectedCore);
    if (console?.hasRomSearch) {
      if (selectedCore === "psx") {
        romsStore.fetchPlayStationRoms();
      } else if (selectedCore === "psp") {
        romsStore.fetchPspRoms();
      }
    } else {
      romsStore.clearRoms();
    }
    setSearchQuery("");
    romsStore.setSelectedRom(null);
  }, [selectedCore]);

  // Handle search
  const handleSearch = useCallback(() => {
    if (selectedCore === "psx") {
      romsStore.searchPlayStationRoms(searchQuery);
    } else if (selectedCore === "psp") {
      romsStore.searchPspRoms(searchQuery);
    }
  }, [selectedCore, searchQuery, romsStore]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    if (selectedCore === "psx") {
      romsStore.fetchPlayStationRoms();
    } else if (selectedCore === "psp") {
      romsStore.fetchPspRoms();
    }
  }, [selectedCore, romsStore]);

  // Handle ROM selection
  const selectRom = (rom: Rom) => {
    romsStore.setSelectedRom(rom);
    setRomFile(null);
    setError(null);
  };

  // Start browser download
  const startBrowserDownload = (rom: Rom) => {
    if (!rom || !rom.downloadUrl) return;
    const a = document.createElement("a");
    const fileName = (rom.fileName || rom.title || "game") + ".zip";
    a.href = `/api/myrient/download?url=${encodeURIComponent(rom.downloadUrl)}&filename=${encodeURIComponent(fileName)}`;
    a.download = fileName;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    requestAnimationFrame(() => a.remove());
  };

  // Handle file upload
  const onRomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setRomFile(file);
    romsStore.setSelectedRom(null);
    setError(null);
  };

  const onDropRom = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      setRomFile(file);
      romsStore.setSelectedRom(null);
      setError(null);
    }
  };

  // Load EmulatorJS script
  const loadEjsLoaderOnce = async () => {
    if (typeof window === "undefined") throw new Error("Window not available");
    if ((window as any).EJS_loader) return false;

    return new Promise<boolean>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${EJS_DATA_BASE}loader.js`;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = () => {
        setTimeout(() => resolve(true), 400);
      };
      script.onerror = () => reject(new Error("Failed to load EmulatorJS loader"));
      document.body.appendChild(script);
    });
  };

  // Start the emulator
  const startOverlayEmulator = async () => {
    const core = emulatorStore.core || "psx";
    let gameName = emulatorStore.gameName || "ROM";
    const rom = emulatorStore.romFile;
    if (!rom) return;

    let romUrl = URL.createObjectURL(rom);
    let biosUrl = "";

    if (emulatorStore.biosFile) {
      biosUrl = URL.createObjectURL(emulatorStore.biosFile);
    } else if (core === "psx") {
      biosUrl = BUILTIN_PSX_BIOS;
    }

    if (!gameName || gameName === "ROM") {
      gameName = rom.name || "game";
    }

    (window as any).EJS_player = "#ejs-overlay";
    (window as any).EJS_core = core;
    (window as any).EJS_gameName = gameName;
    (window as any).EJS_color = "#e50914";
    (window as any).EJS_startOnLoaded = true;
    (window as any).EJS_pathtodata = EJS_DATA_BASE;
    (window as any).EJS_gameUrl = romUrl;
    if (biosUrl) (window as any).EJS_biosUrl = biosUrl;

    if (core === "psp") {
      (window as any).EJS_threads = true;
    }

    await loadEjsLoaderOnce();
    if ((window as any).EJS_loader?.loadGame) {
      (window as any).EJS_loader.loadGame();
    }
  };

  // Boot the game
  const boot = async () => {
    if (!romFile) return;
    setIsBooting(true);
    setError(null);

    try {
      emulatorStore.setPayload({
        core: selectedCore,
        romFile: romFile,
        biosFile: null,
        gameName: romFile.name || "ROM",
      });

      setShowOverlay(true);
      document.body.style.overflow = "hidden";

      await startOverlayEmulator();
    } catch (e) {
      console.error("Failed to start game", e);
      setError(e instanceof Error ? e.message : "Failed to start game");
      setShowOverlay(false);
      document.body.style.overflow = "";
    } finally {
      setIsBooting(false);
    }
  };

  // Close overlay
  const closeOverlay = () => {
    window.location.reload();
  };

  // Reset
  const reset = () => {
    setRomFile(null);
    romsStore.setSelectedRom(null);
    setError(null);
  };

  const currentConsole = ALL_CONSOLES.find((c) => c.value === selectedCore);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-main-1)]/5 via-transparent to-transparent" />
          <motion.div
            className="absolute top-20 left-10 w-64 h-64 bg-[var(--color-main-1)]/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </div>

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Animated Icon */}
            <motion.div
              className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-[var(--color-main-1)] to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--color-main-1)]/30"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <span className="text-5xl">🎮</span>
            </motion.div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading uppercase tracking-wider mb-6 bg-gradient-to-r from-white via-[var(--color-main-1)] to-purple-400 bg-clip-text text-transparent">
              Retro Arcade
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-[var(--color-main-1)] to-purple-600 mx-auto mb-8 rounded-full" />
            <p className="text-[var(--muted-foreground)] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Relive the golden era of gaming! Play classic PlayStation, Nintendo, 
              and Sega games directly in your browser. No downloads required.
            </p>
          </motion.div>
        </div>
      </section>

      {/* How to Play - Compact Version */}
      <section className="pb-8">
        <div className="container max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4 md:gap-8"
          >
            {[
              { step: "1", title: "Choose Console", icon: "🎯" },
              { step: "2", title: "Get ROM", icon: "📦" },
              { step: "3", title: "Play!", icon: "🚀" },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-3 bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] px-5 py-3 rounded-full"
              >
                <span className="w-8 h-8 rounded-full bg-[var(--color-main-1)] flex items-center justify-center text-sm font-bold text-white">
                  {item.step}
                </span>
                <span className="text-2xl">{item.icon}</span>
                <span className="font-medium text-white">{item.title}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container max-w-7xl">
          <div className="grid lg:grid-cols-[1fr_420px] gap-8">
            {/* Left Side - Console Selection & ROM Library */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="space-y-6"
            >
              {/* Console Selection Grid */}
              <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] p-6 rounded-xl">
                <h2 className="text-xl font-heading mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg bg-[var(--color-main-1)]/20 flex items-center justify-center">
                    🎮
                  </span>
                  Select Your Console
                </h2>

                <div className="space-y-6">
                  {CONSOLE_CATEGORIES.map((category) => (
                    <div key={category.name}>
                      <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-3 uppercase tracking-wider">
                        {category.name}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {category.consoles.map((console) => (
                          <button
                            key={console.value}
                            onClick={() => setSelectedCore(console.value)}
                            className={`relative p-4 rounded-lg border-2 transition-all duration-300 text-left group ${
                              selectedCore === console.value
                                ? "border-[var(--color-main-1)] bg-[var(--color-main-1)]/10"
                                : "border-[var(--color-dark-4)] hover:border-[var(--color-dark-3)] bg-[var(--color-dark-3)]/30"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{console.icon}</span>
                              <div>
                                <p className="font-medium text-white text-sm">{console.label}</p>
                                {console.experimental && (
                                  <span className="text-[10px] text-yellow-400 font-medium">BETA</span>
                                )}
                              </div>
                            </div>
                            {selectedCore === console.value && (
                              <motion.div
                                layoutId="console-indicator"
                                className="absolute top-2 right-2 w-3 h-3 rounded-full bg-[var(--color-main-1)]"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ROM Library / Search (for PSX/PSP) */}
              {currentConsole?.hasRomSearch && !currentConsole?.external && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] p-6 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-heading flex items-center gap-3">
                      <span className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        📚
                      </span>
                      {currentConsole.label} Library
                    </h2>
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {romsStore.totalCount.toLocaleString()} games
                    </span>
                  </div>

                  {/* Search */}
                  <div className="flex gap-2 mb-6">
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        placeholder="Search games..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyUp={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-10"
                      />
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <Button variant="primary" onClick={handleSearch} disabled={romsStore.loading}>
                      Search
                    </Button>
                    {searchQuery && (
                      <Button variant="outline" onClick={clearSearch}>
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* ROM Grid */}
                  {romsStore.loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="aspect-square bg-[var(--color-dark-4)] rounded-lg mb-2" />
                          <div className="h-4 bg-[var(--color-dark-4)] rounded w-3/4" />
                        </div>
                      ))}
                    </div>
                  ) : romsStore.roms.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-2">
                      {romsStore.roms.slice(0, 12).map((rom) => (
                        <motion.div
                          key={rom.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => selectRom(rom)}
                          className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                            romsStore.selectedRom?.id === rom.id
                              ? "border-[var(--color-main-1)] ring-4 ring-[var(--color-main-1)]/20"
                              : "border-transparent hover:border-[var(--color-dark-3)]"
                          }`}
                        >
                          <div className="relative aspect-square bg-gradient-to-br from-[var(--color-dark-3)] to-[var(--color-dark-4)] flex items-center justify-center group">
                            <span className="text-4xl opacity-40 group-hover:opacity-60 transition-opacity">🎮</span>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startBrowserDownload(rom);
                                }}
                                className="bg-[var(--color-main-1)] hover:bg-[var(--color-main-1)]/80 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                              </button>
                            </div>
                          </div>
                          <div className="p-3 bg-[var(--color-dark-3)]/50">
                            <p className="text-xs font-medium text-white truncate mb-1">
                              {rom.title.length > 20 ? rom.title.slice(0, 20) + "..." : rom.title}
                            </p>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-[var(--color-main-1)] font-medium">{rom.region}</span>
                              <span className="text-[var(--muted-foreground)]">{rom.size}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-[var(--muted-foreground)]">
                      <span className="text-4xl mb-4 block">🔍</span>
                      <p>No games found. Try a different search term.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* External ROM Link for other consoles */}
              {!currentConsole?.hasRomSearch && !currentConsole?.external && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-purple-500/10 to-[var(--color-main-1)]/10 border border-purple-500/30 p-8 rounded-xl text-center"
                >
                  <span className="text-5xl mb-4 block">🔗</span>
                  <h3 className="text-xl font-heading mb-2">Get {currentConsole?.label} ROMs</h3>
                  <p className="text-[var(--muted-foreground)] mb-6">
                    Download ROMs from our trusted partner site, then upload them here to play.
                  </p>
                  <a
                    href={EXTERNAL_ROM_URLS[selectedCore] || "https://www.romsgames.net/roms/"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="primary" size="lg">
                      Browse {currentConsole?.label} ROMs →
                    </Button>
                  </a>
                </motion.div>
              )}
            </motion.div>

            {/* Right Side - Upload & Play */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-6"
            >
              {/* Upload Area */}
              {selectedCore !== "ps2" ? (
                <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] p-6 rounded-xl">
                  <h2 className="text-xl font-heading mb-6 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      📁
                    </span>
                    Upload ROM
                  </h2>

                  <div
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      isDragging
                        ? "border-[var(--color-main-1)] bg-[var(--color-main-1)]/10"
                        : romFile
                        ? "border-green-500 bg-green-500/10"
                        : "border-[var(--color-dark-4)] hover:border-[var(--color-main-1)]/50"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDropRom}
                  >
                    <input
                      type="file"
                      onChange={onRomChange}
                      accept=".zip,.7z,.bin,.iso,.nes,.smc,.sfc,.gba,.gb,.gbc,.n64,.z64,.v64,.sms,.gg,.gen,.md,.cue,.pbp"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    
                    {romFile ? (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-green-400 font-medium mb-1">{romFile.name}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {(romFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </motion.div>
                    ) : (
                      <>
                        <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-dark-4)] rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-white font-medium mb-1">
                          {isDragging ? "Drop your ROM here!" : "Drag & drop your ROM"}
                        </p>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          or click to browse files
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-3">
                          Supports: ZIP, BIN, ISO, and more
                        </p>
                      </>
                    )}
                  </div>

                  {romsStore.selectedRom && !romFile && (
                    <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-sm text-yellow-400">
                        <strong>Selected:</strong> {romsStore.selectedRom.title.slice(0, 40)}...
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        Download this ROM first, then upload it above to play.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => startBrowserDownload(romsStore.selectedRom!)}
                      >
                        Download ROM
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-yellow-500/10 border border-yellow-500/30 p-6 rounded-xl">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">⚠️</span>
                    <div>
                      <h3 className="font-heading text-lg mb-2">PlayStation 2 - Experimental</h3>
                      <p className="text-sm text-[var(--muted-foreground)] mb-4">
                        PS2 emulation in browsers is still in early development. For the best experience, 
                        we recommend using PCSX2 on desktop.
                      </p>
                      {/* Use regular anchor tag to force full page load for COOP/COEP headers */}
                      <a href="/games/ps2">
                        <Button variant="primary">
                          Try PS2 Emulator Anyway
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Play Button */}
              {selectedCore !== "ps2" && (
                <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] p-6 rounded-xl">
                  <h2 className="text-xl font-heading mb-6 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg bg-[var(--color-main-1)]/20 flex items-center justify-center">
                      🚀
                    </span>
                    Launch Game
                  </h2>

                  {romFile ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full text-lg py-4"
                        onClick={boot}
                        disabled={isBooting}
                      >
                        {isBooting ? (
                          <span className="flex items-center justify-center gap-3">
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Loading Game...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-3">
                            <span className="text-2xl">▶️</span>
                            Play Now!
                          </span>
                        )}
                      </Button>
                      <button
                        onClick={reset}
                        className="w-full mt-3 text-sm text-[var(--muted-foreground)] hover:text-white transition-colors"
                      >
                        Start over
                      </button>
                    </motion.div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-dark-4)] rounded-full flex items-center justify-center">
                        <span className="text-3xl opacity-50">🎮</span>
                      </div>
                      <p className="text-[var(--muted-foreground)]">
                        Upload a ROM file to start playing
                      </p>
                    </div>
                  )}

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}
                </div>
              )}

              {/* Quick Tips */}
              <div className="bg-[var(--color-dark-2)]/30 border border-[var(--color-dark-3)] p-5 rounded-xl">
                <h3 className="font-medium text-sm mb-3 text-[var(--muted-foreground)] uppercase tracking-wider">
                  Quick Tips
                </h3>
                <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-main-1)]">•</span>
                    Use keyboard or connect a gamepad for controls
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-main-1)]">•</span>
                    Press F11 for fullscreen mode
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-main-1)]">•</span>
                    Save states are available in-game
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-[var(--color-dark-2)]/50 to-transparent">
        <div className="container max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-heading mb-4">Why Play on Darkpoint?</h2>
            <div className="w-16 h-1 bg-[var(--color-main-1)] mx-auto rounded-full" />
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "🌐",
                title: "No Downloads",
                description: "Play directly in your browser. No emulators to install or configure.",
              },
              {
                icon: "💾",
                title: "Save Anywhere",
                description: "Create save states at any point. Continue exactly where you left off.",
              },
              {
                icon: "🎮",
                title: "12+ Consoles",
                description: "PlayStation, Nintendo, Sega - all your favorite retro systems in one place.",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 rounded-xl text-center group hover:border-[var(--color-main-1)]/50 transition-colors"
              >
                <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-[var(--color-main-1)]/20 to-purple-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-3xl">{feature.icon}</span>
                </div>
                <h3 className="font-heading text-xl mb-3">{feature.title}</h3>
                <p className="text-[var(--muted-foreground)] text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Legal Notice */}
      <section className="pb-16">
        <div className="container max-w-2xl">
          <div className="bg-[var(--color-dark-2)]/50 border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              <span className="text-[var(--color-main-1)] font-medium">Legal Notice:</span>{" "}
              This emulator is for playing games you legally own. Please ensure you have the rights 
              to use any ROMs you upload.
            </p>
          </div>
        </div>
      </section>

      {/* Fullscreen Emulator Overlay */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[9999] flex flex-col"
          >
            <div className="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-[var(--color-dark-2)] to-[var(--color-dark-1)] border-b border-[var(--color-dark-3)]">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎮</span>
                <span className="text-white font-medium">
                  {emulatorStore.gameName || "Game"}
                </span>
              </div>
              <button
                onClick={closeOverlay}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Exit Game
              </button>
            </div>
            <div id="ejs-overlay" className="flex-1 relative" />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

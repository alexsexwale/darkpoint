"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  initPS2Emulator,
  bootPS2File,
  getPS2Fps,
  clearPS2Stats,
  isPS2EmulatorLoaded,
  isCrossOriginIsolated,
} from "@/lib/ps2Emulator";

type EmulatorStatus = "idle" | "initializing" | "ready" | "loading" | "running" | "error";

export function PS2EmulatorPage() {
  const [status, setStatus] = useState<EmulatorStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fpsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Lock body scroll and hide site UI when component mounts
  useEffect(() => {
    // Hide overflow to prevent scrolling
    document.body.style.overflow = "hidden";
    
    return () => {
      // Restore on unmount
      document.body.style.overflow = "";
    };
  }, []);

  // Check cross-origin isolation and auto-refresh if needed
  useEffect(() => {
    // If cross-origin isolation is not enabled, force a full page reload
    // This happens when navigating via client-side routing (Next.js Link)
    if (!isCrossOriginIsolated()) {
      // Check if we've already tried refreshing to prevent infinite loop
      const hasRefreshed = sessionStorage.getItem("ps2_page_refreshed");
      if (!hasRefreshed) {
        sessionStorage.setItem("ps2_page_refreshed", "true");
        // Force a full page reload to get the COOP/COEP headers
        window.location.reload();
        return;
      }
      // Clear the flag after showing error so user can try again
      sessionStorage.removeItem("ps2_page_refreshed");
    } else {
      // Clear the refresh flag on successful load
      sessionStorage.removeItem("ps2_page_refreshed");
    }
  }, []);

  // Initialize emulator on mount
  useEffect(() => {
    // Only initialize if cross-origin isolated
    if (isCrossOriginIsolated()) {
      initializeEmulator();
    }
  }, []);

  // FPS counter
  useEffect(() => {
    if (status === "running") {
      fpsIntervalRef.current = setInterval(() => {
        const currentFps = getPS2Fps();
        clearPS2Stats();
        setFps(currentFps);
      }, 1000);
    } else {
      if (fpsIntervalRef.current) {
        clearInterval(fpsIntervalRef.current);
        fpsIntervalRef.current = null;
      }
      setFps(0);
    }

    return () => {
      if (fpsIntervalRef.current) {
        clearInterval(fpsIntervalRef.current);
      }
    };
  }, [status]);

  // Focus canvas when running
  useEffect(() => {
    if (status === "running") {
      const canvas = document.getElementById("outputCanvas") as HTMLCanvasElement;
      if (canvas) {
        canvas.focus();
      }
    }
  }, [status]);

  const initializeEmulator = async () => {
    setStatus("initializing");
    setError(null);

    // Check for cross-origin isolation first
    if (!isCrossOriginIsolated()) {
      setError(
        "Cross-origin isolation is not enabled. Please restart the dev server and ensure you're accessing this page directly at /games/ps2"
      );
      setStatus("error");
      return;
    }

    try {
      await initPS2Emulator();
      setStatus("ready");
    } catch (err) {
      console.error("Failed to initialize PS2 emulator:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize emulator");
      setStatus("error");
    }
  };

  const handleFileSelect = useCallback((file: File) => {
    const validExtensions = [".iso", ".bin", ".img", ".elf", ".cue"];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setError("Invalid file type. Please use ISO, BIN, IMG, ELF, or CUE files.");
      return;
    }

    setSelectedFile(file);
    setError(null);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const startGame = async () => {
    if (!selectedFile || status !== "ready") return;

    setStatus("loading");
    setError(null);

    try {
      await bootPS2File(selectedFile);
      setStatus("running");
    } catch (err) {
      console.error("Failed to boot game:", err);
      setError(err instanceof Error ? err.message : "Failed to start game");
      setStatus("ready");
    }
  };

  const resetEmulator = () => {
    setSelectedFile(null);
    setError(null);
    if (isPS2EmulatorLoaded()) {
      setStatus("ready");
    } else {
      setStatus("idle");
    }
  };

  return (
    // Fullscreen fixed overlay that covers everything including site navigation
    <div className="fixed inset-0 z-[99999] bg-[var(--color-dark-1)] flex flex-col">
      {/* Header - matches site header style */}
      <div className="flex justify-between items-center px-6 py-4 bg-[var(--color-dark-2)] border-b border-[var(--color-dark-4)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[var(--color-main-1)]/20 border border-[var(--color-main-1)]/30 flex items-center justify-center">
            <span className="text-2xl">🎮</span>
          </div>
          <div>
            <h1 className="text-white font-heading text-xl tracking-wider uppercase">
              PlayStation 2 Emulator
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs bg-[var(--color-main-1)]/20 text-[var(--color-main-1)] px-2 py-0.5 rounded border border-[var(--color-main-1)]/30 font-medium uppercase tracking-wider">
                Beta
              </span>
              {status === "running" && (
                <span className="text-xs text-[var(--color-main-1)]">{fps} FPS</span>
              )}
            </div>
          </div>
        </div>
        <Link href="/games">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Exit
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Background Pattern - matches site style */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 20px,
                rgba(224, 136, 33, 0.3) 20px,
                rgba(224, 136, 33, 0.3) 40px
              )`,
            }}
          />
        </div>

        {/* Canvas for emulator output */}
        <canvas
          id="outputCanvas"
          width="640"
          height="480"
          tabIndex={0}
          className={`max-w-full max-h-full ${status !== "running" ? "hidden" : ""}`}
          style={{
            imageRendering: "pixelated",
            aspectRatio: "4/3",
            backgroundColor: "#000",
          }}
        />

        {/* UI Overlay */}
        {status !== "running" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-2xl mx-4"
          >
            {/* Initializing */}
            {status === "initializing" && (
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-4)] rounded-lg p-8 text-center">
                <motion.div
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--color-main-1)]/20 border border-[var(--color-main-1)]/30 flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <svg className="w-10 h-10 text-[var(--color-main-1)]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </motion.div>
                <h3 className="text-xl font-heading text-white mb-2 uppercase tracking-wider">Initializing Emulator</h3>
                <p className="text-white/60 text-sm">Loading PlayStation 2 core... This may take a moment.</p>
                <div className="mt-6 w-full bg-[var(--color-dark-4)] rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[var(--color-main-1)] to-[var(--color-main-1)]/70"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3, ease: "easeInOut" }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {status === "error" && (
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-main-5)]/50 rounded-lg p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--color-main-5)]/20 border border-[var(--color-main-5)]/30 flex items-center justify-center">
                  <span className="text-4xl">❌</span>
                </div>
                <h3 className="text-xl font-heading text-white mb-2 uppercase tracking-wider">Initialization Failed</h3>
                <p className="text-[var(--color-main-5)] text-sm mb-4">{error}</p>
                <p className="text-white/60 text-xs mb-6">
                  PS2 emulation requires SharedArrayBuffer support. Make sure your browser supports it 
                  and this page is served with proper security headers.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="primary" onClick={initializeEmulator}>
                    Try Again
                  </Button>
                  <Link href="/games">
                    <Button variant="outline">Back to Games</Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Ready */}
            {status === "ready" && (
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-4)] rounded-lg p-8">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--color-main-2)]/20 border border-[var(--color-main-2)]/30 flex items-center justify-center">
                    <span className="text-4xl">✅</span>
                  </div>
                  <h3 className="text-xl font-heading text-white mb-2 uppercase tracking-wider">Emulator Ready</h3>
                  <p className="text-white/60 text-sm">Select a PS2 game file to start playing</p>
                </div>

                {/* File Upload */}
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-[var(--color-main-1)] bg-[var(--color-main-1)]/10"
                      : selectedFile
                      ? "border-[var(--color-main-2)] bg-[var(--color-main-2)]/10"
                      : "border-[var(--color-dark-4)] hover:border-[var(--color-main-1)]/50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept=".iso,.bin,.img,.elf,.cue"
                    className="hidden"
                  />

                  {selectedFile ? (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                      <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-main-2)]/20 border border-[var(--color-main-2)]/30 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-[var(--color-main-2)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-[var(--color-main-2)] font-medium mb-1">{selectedFile.name}</p>
                      <p className="text-sm text-white/60">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </motion.div>
                  ) : (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-main-1)]/20 border border-[var(--color-main-1)]/30 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-white font-medium mb-1">
                        {isDragging ? "Drop your game here!" : "Drag & drop your PS2 game"}
                      </p>
                      <p className="text-sm text-white/60">or click to browse files</p>
                      <p className="text-xs text-white/40 mt-3">Supports: ISO, BIN, IMG, ELF, CUE</p>
                    </>
                  )}
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-[var(--color-main-5)]/10 border border-[var(--color-main-5)]/30 rounded-lg text-[var(--color-main-5)] text-sm text-center"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                  {selectedFile ? (
                    <>
                      <Button variant="primary" className="flex-1 py-3" onClick={startGame}>
                        <span className="flex items-center justify-center gap-2">
                          <span className="text-xl">▶️</span>
                          Start Game
                        </span>
                      </Button>
                      <Button variant="outline" onClick={resetEmulator}>Clear</Button>
                    </>
                  ) : (
                    <Button variant="outline" className="w-full py-3" onClick={() => fileInputRef.current?.click()}>
                      Select Game File
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Loading */}
            {status === "loading" && (
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-4)] rounded-lg p-8 text-center">
                <motion.div
                  className="w-20 h-20 mx-auto mb-6"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                >
                  <div className="w-full h-full rounded-full border-4 border-[var(--color-dark-4)] border-t-[var(--color-main-1)]" />
                </motion.div>
                <h3 className="text-xl font-heading text-white mb-2 uppercase tracking-wider">Loading Game</h3>
                <p className="text-white/60 text-sm mb-2">{selectedFile?.name}</p>
                <p className="text-xs text-white/40">This may take a while for large games...</p>
              </div>
            )}

            {/* Tips */}
            {(status === "ready" || status === "loading") && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 bg-[var(--color-dark-2)] border border-[var(--color-dark-4)] rounded-lg p-5"
              >
                <h4 className="text-sm font-heading text-[var(--color-main-1)] mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span>💡</span>
                  Tips
                </h4>
                <ul className="text-xs text-white/60 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-main-1)]">•</span>
                    PS2 emulation is experimental and may not work with all games
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-main-1)]">•</span>
                    For best results, use ISO files extracted from original discs
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-main-1)]">•</span>
                    Performance depends on your device&apos;s capabilities
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-main-1)]">•</span>
                    Use a gamepad for the best experience
                  </li>
                </ul>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Running - Controls Toggle */}
        {status === "running" && (
          <>
            <div className="absolute top-4 left-4 bg-[var(--color-dark-2)]/90 backdrop-blur border border-[var(--color-dark-4)] rounded-lg px-4 py-2 text-white text-sm">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[var(--color-main-2)] animate-pulse" />
                <span className="text-white/80">Running</span>
                <span className="text-[var(--color-dark-4)]">|</span>
                <span className="text-[var(--color-main-1)] font-medium">{fps} FPS</span>
              </div>
            </div>

            <button
              onClick={() => setShowControls(!showControls)}
              className="absolute top-4 right-4 w-12 h-12 rounded-lg bg-[var(--color-main-1)] hover:bg-[var(--color-main-1)]/80 text-white flex items-center justify-center shadow-lg transition-all z-50"
              title="Toggle Controls"
            >
              🎮
            </button>

            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  className="absolute top-20 right-4 bg-[var(--color-dark-2)]/95 backdrop-blur border border-[var(--color-dark-4)] rounded-lg p-5 w-80 z-40"
                >
                  <h3 className="text-[var(--color-main-1)] font-heading text-sm mb-4 text-center uppercase tracking-wider">🎮 PS2 Controls</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[var(--color-dark-3)] rounded-lg p-3 border border-[var(--color-dark-4)]">
                      <h4 className="text-[var(--color-main-1)] font-medium mb-2 uppercase text-[10px] tracking-wider">Movement</h4>
                      <div className="space-y-1.5 text-white/70">
                        <div className="flex justify-between"><span className="text-white/50">D-Pad</span><span className="bg-[var(--color-dark-4)] px-1.5 py-0.5 rounded font-mono text-white/80">↑↓←→</span></div>
                        <div className="flex justify-between"><span className="text-white/50">L.Stick</span><span className="bg-[var(--color-dark-4)] px-1.5 py-0.5 rounded font-mono text-white/80">F,H,T,G</span></div>
                        <div className="flex justify-between"><span className="text-white/50">R.Stick</span><span className="bg-[var(--color-dark-4)] px-1.5 py-0.5 rounded font-mono text-white/80">J,L,I,K</span></div>
                      </div>
                    </div>
                    <div className="bg-[var(--color-dark-3)] rounded-lg p-3 border border-[var(--color-dark-4)]">
                      <h4 className="text-[var(--color-main-1)] font-medium mb-2 uppercase text-[10px] tracking-wider">Buttons</h4>
                      <div className="space-y-1.5 text-white/70">
                        <div className="flex justify-between"><span className="text-white/50">□</span><span className="bg-[var(--color-dark-4)] px-1.5 py-0.5 rounded font-mono text-white/80">A</span></div>
                        <div className="flex justify-between"><span className="text-white/50">✕</span><span className="bg-[var(--color-dark-4)] px-1.5 py-0.5 rounded font-mono text-white/80">Z</span></div>
                        <div className="flex justify-between"><span className="text-white/50">△</span><span className="bg-[var(--color-dark-4)] px-1.5 py-0.5 rounded font-mono text-white/80">S</span></div>
                        <div className="flex justify-between"><span className="text-white/50">○</span><span className="bg-[var(--color-dark-4)] px-1.5 py-0.5 rounded font-mono text-white/80">X</span></div>
                      </div>
                    </div>
                    <div className="bg-[var(--color-dark-3)] rounded-lg p-3 border border-[var(--color-dark-4)]">
                      <h4 className="text-[var(--color-main-1)] font-medium mb-2 uppercase text-[10px] tracking-wider">System</h4>
                      <div className="space-y-1.5 text-white/70">
                        <div className="flex justify-between"><span className="text-white/50">Start</span><span className="bg-[var(--color-dark-4)] px-1.5 py-0.5 rounded font-mono text-white/80">Enter</span></div>
                        <div className="flex justify-between"><span className="text-white/50">Select</span><span className="bg-[var(--color-dark-4)] px-1.5 py-0.5 rounded font-mono text-white/80">Bksp</span></div>
                      </div>
                    </div>
                    <div className="bg-[var(--color-dark-3)] rounded-lg p-3 border border-[var(--color-dark-4)]">
                      <h4 className="text-[var(--color-main-1)] font-medium mb-2 uppercase text-[10px] tracking-wider">Shoulders</h4>
                      <div className="space-y-1.5 text-white/70">
                        <div className="flex justify-between"><span className="text-white/50">L1/2/3</span><span className="bg-[var(--color-dark-4)] px-1.5 py-0.5 rounded font-mono text-white/80">1,2,3</span></div>
                        <div className="flex justify-between"><span className="text-white/50">R1/2/3</span><span className="bg-[var(--color-dark-4)] px-1.5 py-0.5 rounded font-mono text-white/80">8,9,0</span></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Footer - matches site footer style */}
      <div className="px-6 py-4 bg-[var(--color-dark-2)] border-t border-[var(--color-dark-4)] text-center">
        <p className="text-xs text-white/40">Powered by Play! PS2 Emulator • WebAssembly Edition</p>
      </div>
    </div>
  );
}

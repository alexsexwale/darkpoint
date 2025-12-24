"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui";
import {
  initPS2Emulator,
  bootPS2File,
  getPS2Fps,
  clearPS2Stats,
  isPS2EmulatorLoaded,
} from "@/lib/ps2Emulator";

interface PS2EmulatorProps {
  isOpen: boolean;
  onClose: () => void;
}

// Controls overlay component
function ControlsOverlay() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="absolute top-4 right-4 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg transition-all z-50"
        title="Toggle Controls"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Controls Panel */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="absolute top-20 right-4 bg-black/90 backdrop-blur border border-blue-500/30 rounded-xl p-4 w-72 z-40"
          >
            <h3 className="text-blue-400 font-heading text-sm mb-4 text-center flex items-center justify-center gap-2">
              <span>🎮</span> PS2 Controls
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Movement */}
              <div className="bg-blue-500/10 rounded-lg p-3">
                <h4 className="text-blue-300 font-medium mb-2 uppercase text-[10px] tracking-wider">
                  Movement
                </h4>
                <div className="space-y-1 text-white/70">
                  <div className="flex justify-between">
                    <span className="text-blue-400">D-Pad</span>
                    <span className="bg-white/10 px-1.5 rounded font-mono">↑↓←→</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400">L. Stick</span>
                    <span className="bg-white/10 px-1.5 rounded font-mono">F,H,T,G</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400">R. Stick</span>
                    <span className="bg-white/10 px-1.5 rounded font-mono">J,L,I,K</span>
                  </div>
                </div>
              </div>

              {/* Face Buttons */}
              <div className="bg-blue-500/10 rounded-lg p-3">
                <h4 className="text-blue-300 font-medium mb-2 uppercase text-[10px] tracking-wider">
                  Buttons
                </h4>
                <div className="space-y-1 text-white/70">
                  <div className="flex justify-between">
                    <span className="text-blue-400">Square</span>
                    <span className="bg-white/10 px-1.5 rounded font-mono">A</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400">Cross</span>
                    <span className="bg-white/10 px-1.5 rounded font-mono">Z</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400">Triangle</span>
                    <span className="bg-white/10 px-1.5 rounded font-mono">S</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400">Circle</span>
                    <span className="bg-white/10 px-1.5 rounded font-mono">X</span>
                  </div>
                </div>
              </div>

              {/* System */}
              <div className="bg-blue-500/10 rounded-lg p-3">
                <h4 className="text-blue-300 font-medium mb-2 uppercase text-[10px] tracking-wider">
                  System
                </h4>
                <div className="space-y-1 text-white/70">
                  <div className="flex justify-between">
                    <span className="text-blue-400">Start</span>
                    <span className="bg-white/10 px-1.5 rounded font-mono">Enter</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400">Select</span>
                    <span className="bg-white/10 px-1.5 rounded font-mono">Backspace</span>
                  </div>
                </div>
              </div>

              {/* Shoulders */}
              <div className="bg-blue-500/10 rounded-lg p-3">
                <h4 className="text-blue-300 font-medium mb-2 uppercase text-[10px] tracking-wider">
                  Shoulders
                </h4>
                <div className="space-y-1 text-white/70">
                  <div className="flex justify-between">
                    <span className="text-blue-400">L1/L2/L3</span>
                    <span className="bg-white/10 px-1.5 rounded font-mono">1,2,3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400">R1/R2/R3</span>
                    <span className="bg-white/10 px-1.5 rounded font-mono">8,9,0</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-white/40 text-[10px] mt-3">
              Press Ctrl+H to toggle • Click canvas to focus
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

type EmulatorStatus = "idle" | "initializing" | "ready" | "loading" | "running" | "error";

export function PS2Emulator({ isOpen, onClose }: PS2EmulatorProps) {
  const [status, setStatus] = useState<EmulatorStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fpsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize emulator when opened
  useEffect(() => {
    if (isOpen && status === "idle") {
      initializeEmulator();
    }
  }, [isOpen, status]);

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

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setError(null);
      // Note: We don't reset the emulator state because it stays loaded
    }
  }, [isOpen]);

  // Focus canvas when running to enable keyboard controls
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
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

  const handleClose = () => {
    // Reload page to fully reset the emulator
    if (status === "running") {
      window.location.reload();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-[9999] flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-[#003087] via-[#00439c] to-[#003087] border-b border-blue-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="text-2xl">🎮</span>
            </div>
            <div>
              <h2 className="text-white font-heading text-lg tracking-wider">
                PlayStation 2 Emulator
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-medium">
                  BETA
                </span>
                {status === "running" && (
                  <span className="text-xs text-blue-300">{fps} FPS</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Exit
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 10px,
                  rgba(0, 48, 135, 0.5) 10px,
                  rgba(0, 48, 135, 0.5) 20px
                )`,
              }}
            />
          </div>

          {/* Canvas for emulator output - must have id="outputCanvas" for Play! emulator */}
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

          {/* UI Overlay (shown when not running) */}
          {status !== "running" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative z-10 w-full max-w-2xl mx-4"
            >
              {/* Status Display */}
              {status === "initializing" && (
                <div className="bg-[#0a0a1a]/90 backdrop-blur border border-blue-500/30 rounded-2xl p-8 text-center">
                  <motion.div
                    className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <svg
                      className="w-10 h-10 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  </motion.div>
                  <h3 className="text-xl font-heading text-white mb-2">
                    Initializing Emulator
                  </h3>
                  <p className="text-blue-300/60 text-sm">
                    Loading PlayStation 2 core... This may take a moment.
                  </p>
                  <div className="mt-6 w-full bg-blue-900/30 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 3, ease: "easeInOut" }}
                    />
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="bg-[#0a0a1a]/90 backdrop-blur border border-red-500/30 rounded-2xl p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-4xl">❌</span>
                  </div>
                  <h3 className="text-xl font-heading text-white mb-2">
                    Initialization Failed
                  </h3>
                  <p className="text-red-400 text-sm mb-6">{error}</p>
                  <Button variant="primary" onClick={initializeEmulator}>
                    Try Again
                  </Button>
                </div>
              )}

              {status === "ready" && (
                <div className="bg-[#0a0a1a]/90 backdrop-blur border border-blue-500/30 rounded-2xl p-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-4xl">✅</span>
                    </div>
                    <h3 className="text-xl font-heading text-white mb-2">
                      Emulator Ready
                    </h3>
                    <p className="text-blue-300/60 text-sm">
                      Select a PS2 game file to start playing
                    </p>
                  </div>

                  {/* File Upload Area */}
                  <div
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                      isDragging
                        ? "border-blue-400 bg-blue-500/10"
                        : selectedFile
                        ? "border-green-500 bg-green-500/10"
                        : "border-blue-500/30 hover:border-blue-400/50"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
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
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <p className="text-green-400 font-medium mb-1">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-blue-300/60">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </motion.div>
                    ) : (
                      <>
                        <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-blue-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                        </div>
                        <p className="text-white font-medium mb-1">
                          {isDragging
                            ? "Drop your game here!"
                            : "Drag & drop your PS2 game"}
                        </p>
                        <p className="text-sm text-blue-300/60">
                          or click to browse files
                        </p>
                        <p className="text-xs text-blue-300/40 mt-3">
                          Supports: ISO, BIN, IMG, ELF, CUE
                        </p>
                      </>
                    )}
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center"
                    >
                      {error}
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex gap-3">
                    {selectedFile ? (
                      <>
                        <Button
                          variant="primary"
                          className="flex-1 py-3"
                          onClick={startGame}
                        >
                          <span className="flex items-center justify-center gap-2">
                            <span className="text-xl">▶️</span>
                            Start Game
                          </span>
                        </Button>
                        <Button variant="outline" onClick={resetEmulator}>
                          Clear
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full py-3"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Select Game File
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {status === "loading" && (
                <div className="bg-[#0a0a1a]/90 backdrop-blur border border-blue-500/30 rounded-2xl p-8 text-center">
                  <motion.div
                    className="w-20 h-20 mx-auto mb-6"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="w-full h-full rounded-full border-4 border-blue-500/30 border-t-blue-500" />
                  </motion.div>
                  <h3 className="text-xl font-heading text-white mb-2">
                    Loading Game
                  </h3>
                  <p className="text-blue-300/60 text-sm mb-2">
                    {selectedFile?.name}
                  </p>
                  <p className="text-xs text-blue-300/40">
                    This may take a while for large games...
                  </p>
                </div>
              )}

              {/* Tips */}
              {(status === "ready" || status === "loading") && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4"
                >
                  <h4 className="text-sm font-medium text-blue-300 mb-2">
                    💡 Tips
                  </h4>
                  <ul className="text-xs text-blue-300/60 space-y-1">
                    <li>• PS2 emulation is experimental and may not work with all games</li>
                    <li>• For best results, use ISO files extracted from original discs</li>
                    <li>• Performance depends on your device&apos;s capabilities</li>
                    <li>• Use a gamepad for the best experience</li>
                  </ul>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Running State Controls & Info Overlay */}
          {status === "running" && (
            <>
              {/* Status Bar */}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur rounded-lg px-3 py-2 text-white text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Running</span>
                  <span className="text-blue-300">|</span>
                  <span className="text-yellow-400">{fps} FPS</span>
                </div>
              </div>

              {/* Controls Help */}
              <ControlsOverlay />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#0a0a1a] border-t border-blue-500/20 text-center">
          <p className="text-xs text-blue-300/40">
            Powered by Play! PS2 Emulator • WebAssembly Edition
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


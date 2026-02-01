"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import { ProductCarousel } from "@/components/store";
import { useProducts } from "@/hooks";

const EMULATOR_URL = "https://demo.emulatorjs.org/";

// All supported consoles from EmulatorJS
const SUPPORTED_CONSOLES = [
  {
    category: "Nintendo",
    consoles: [
      "Nintendo Entertainment System (NES)",
      "Super Nintendo (SNES)",
      "Nintendo 64",
      "Nintendo DS",
      "Game Boy",
      "Game Boy Color",
      "Game Boy Advance",
      "Virtual Boy",
    ],
  },
  {
    category: "PlayStation",
    consoles: [
      "PlayStation 1",
      "PlayStation Portable (PSP)",
    ],
  },
  {
    category: "Sega",
    consoles: [
      "Sega Master System",
      "Sega Mega Drive / Genesis",
      "Sega CD",
      "Sega 32X",
      "Sega Saturn",
      "Sega Game Gear",
    ],
  },
  {
    category: "Atari",
    consoles: [
      "Atari 2600",
      "Atari 5200",
      "Atari 7800",
      "Atari Lynx",
      "Atari Jaguar",
    ],
  },
  {
    category: "Other Consoles",
    consoles: [
      "NEC TurboGrafx-16 / PC Engine",
      "NEC PC-FX",
      "SNK Neo Geo Pocket (Color)",
      "Bandai WonderSwan (Color)",
      "3DO",
      "ColecoVision",
    ],
  },
  {
    category: "Computers",
    consoles: [
      "DOS",
      "Commodore 64",
      "Commodore 128",
      "Commodore VIC-20",
      "Commodore Plus/4",
      "Commodore PET",
      "Amiga",
    ],
  },
];

export function ArcadePageClient() {
  const [isEmulatorOpen, setIsEmulatorOpen] = useState(false);
  const [showConsoles, setShowConsoles] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { products: gamingProducts } = useProducts({ category: "gaming", limit: 10 });
  const { products: featuredProducts } = useProducts({ featured: true, limit: 10 });
  const stripProducts = gamingProducts.length >= 3 ? gamingProducts : featuredProducts;

  // Handle escape key to close emulator
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isEmulatorOpen) {
        setIsEmulatorOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isEmulatorOpen]);

  // Prevent body scroll when emulator is open
  useEffect(() => {
    if (isEmulatorOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isEmulatorOpen]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
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
              className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[var(--color-main-1)] to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--color-main-1)]/30"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <span className="text-4xl">🎮</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading uppercase tracking-wider mb-4 bg-gradient-to-r from-white via-[var(--color-main-1)] to-purple-400 bg-clip-text text-transparent">
              Retro Arcade
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-[var(--color-main-1)] to-purple-600 mx-auto mb-6 rounded-full" />
            <p className="text-[var(--muted-foreground)] text-lg max-w-2xl mx-auto leading-relaxed mb-8">
              Play classic retro games directly in your browser. No downloads, no installs - 
              just drag and drop your ROM files and start playing instantly!
            </p>

            {/* Main CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button
                variant="primary"
                size="lg"
                className="text-lg px-8 py-4"
                onClick={() => setIsEmulatorOpen(true)}
              >
                <span className="flex items-center gap-3">
                  <span className="text-2xl">🚀</span>
                  Launch Emulator
                </span>
              </Button>
              <button
                onClick={() => setShowConsoles(!showConsoles)}
                className="text-[var(--muted-foreground)] hover:text-white transition-colors flex items-center gap-2"
              >
                <span>View Supported Consoles</span>
                <motion.svg
                  animate={{ rotate: showConsoles ? 180 : 0 }}
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Supported Consoles (Expandable) */}
      <AnimatePresence>
        {showConsoles && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="container max-w-6xl pb-12">
              <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] rounded-xl p-6">
                <h2 className="text-xl font-heading mb-6 text-center">
                  <span className="text-[var(--color-main-1)]">30+</span> Supported Systems
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {SUPPORTED_CONSOLES.map((group) => (
                    <div key={group.category}>
                      <h3 className="text-sm font-medium text-[var(--color-main-1)] mb-3 uppercase tracking-wider">
                        {group.category}
                      </h3>
                      <ul className="space-y-1">
                        {group.consoles.map((console) => (
                          <li key={console} className="text-sm text-[var(--muted-foreground)] flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-main-1)]/50" />
                            {console}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* How to Play */}
      <section className="py-12">
        <div className="container max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl font-heading mb-2">How to Play</h2>
            <div className="w-16 h-0.5 bg-[var(--color-main-1)] mx-auto rounded-full" />
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                icon: "🎯",
                title: "Launch Emulator",
                description: "Click the Launch button above to open the emulator interface",
              },
              {
                step: "2",
                icon: "📁",
                title: "Drop Your ROM",
                description: "Drag and drop your ROM file onto the emulator, or click to browse",
              },
              {
                step: "3",
                icon: "🎮",
                title: "Start Playing",
                description: "The emulator auto-detects the console and starts your game instantly",
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] p-6 rounded-xl text-center"
              >
                <div className="w-12 h-12 mx-auto mb-4 bg-[var(--color-main-1)] rounded-full flex items-center justify-center text-lg font-bold text-white">
                  {item.step}
                </div>
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h3 className="font-heading text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PS2 Experimental Section */}
      <section className="py-12">
        <div className="container max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-8"
          >
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-16 h-16 flex-shrink-0 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <span className="text-3xl">⚠️</span>
              </div>
              <div className="flex-1">
                <h3 className="font-heading text-xl mb-2 flex items-center gap-2">
                  PlayStation 2 Emulator
                  <span className="text-xs bg-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded-full">EXPERIMENTAL</span>
                </h3>
                <p className="text-[var(--muted-foreground)] mb-4">
                  PS2 emulation in browsers is still in early development and may not work well on all devices.
                  For the best experience, we recommend using PCSX2 on desktop. However, you can try our 
                  experimental web-based PS2 emulator below.
                </p>
                <Link href="/arcade/ps2">
                  <Button variant="outline">
                    Try PS2 Emulator (Beta)
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gradient-to-b from-[var(--color-dark-2)]/50 to-transparent">
        <div className="container max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl font-heading mb-2">Why Play on Darkpoint?</h2>
            <div className="w-16 h-0.5 bg-[var(--color-main-1)] mx-auto rounded-full" />
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "🌐", title: "Browser-Based", description: "No downloads or installs needed" },
              { icon: "💾", title: "Save States", description: "Save and load your progress anytime" },
              { icon: "🎮", title: "30+ Consoles", description: "From NES to PlayStation and beyond" },
              { icon: "⚡", title: "Instant Play", description: "Auto-detects your ROM and starts immediately" },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-6"
              >
                <span className="text-3xl mb-3 block">{feature.icon}</span>
                <h3 className="font-heading text-lg mb-1">{feature.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Get the gear - product strip */}
      {stripProducts.length > 0 && (
        <section className="py-12 bg-[var(--color-dark-2)]/50">
          <div className="container">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-heading mb-2">Get the gear. Play anywhere.</h2>
              <p className="text-[var(--muted-foreground)] text-sm mb-4">Controllers and headsets for the best experience</p>
              <Link href="/store?category=gaming" className="text-[var(--color-main-1)] hover:underline text-sm font-medium">
                Shop gaming gear →
              </Link>
            </div>
            <ProductCarousel products={stripProducts} startOneBack />
          </div>
        </section>
      )}

      {/* Quick Tips */}
      <section className="py-12">
        <div className="container max-w-3xl">
          <div className="bg-[var(--color-dark-2)]/30 border border-[var(--color-dark-3)] rounded-xl p-6">
            <h3 className="font-heading text-lg mb-4 flex items-center gap-2">
              <span className="text-xl">💡</span>
              Quick Tips
            </h3>
            <ul className="grid sm:grid-cols-2 gap-3">
              {[
                "Use a gamepad for the best experience",
                "Press F11 for fullscreen mode",
                "Save states work across sessions",
                "Most ROM formats are supported (ZIP, BIN, ISO, etc.)",
                "PS1 games need both .cue and .bin files",
                "Use keyboard arrow keys + Z, X, A, S for controls",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
                  <span className="text-[var(--color-main-1)]">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Back to Games */}
      <section className="py-8">
        <div className="container text-center">
          <Link
            href="/games"
            className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Games Hub
          </Link>
        </div>
      </section>

      {/* Legal Notice */}
      <section className="pb-16">
        <div className="container max-w-2xl">
          <div className="bg-[var(--color-dark-2)]/50 border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              <span className="text-[var(--color-main-1)] font-medium">Legal Notice:</span>{" "}
              This emulator is for playing games you legally own. Please ensure you have the rights 
              to use any ROMs you upload. Powered by{" "}
              <a 
                href="https://emulatorjs.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[var(--color-main-1)] hover:underline"
              >
                EmulatorJS
              </a>.
            </p>
          </div>
        </div>
      </section>

      {/* Fullscreen Emulator Overlay */}
      <AnimatePresence>
        {isEmulatorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[9999] flex flex-col"
          >
            {/* Header Bar */}
            <div className="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-[var(--color-dark-2)] to-[var(--color-dark-1)] border-b border-[var(--color-dark-3)]">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎮</span>
                <span className="text-white font-medium">Darkpoint Retro Arcade</span>
                <span className="text-xs text-[var(--muted-foreground)] hidden sm:inline">
                  • Drag & drop your ROM to play
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--muted-foreground)] hidden sm:inline">
                  Press ESC to exit
                </span>
                <button
                  onClick={() => setIsEmulatorOpen(false)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="hidden sm:inline">Exit</span>
                </button>
              </div>
            </div>

            {/* Emulator iframe */}
            <div className="flex-1 relative bg-[#1a1a2e]">
              <iframe
                ref={iframeRef}
                src={EMULATOR_URL}
                className="absolute inset-0 w-full h-full border-0"
                allow="autoplay; fullscreen; gamepad"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
                title="EmulatorJS"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";

// Pre-defined particle positions to avoid hydration mismatch
const PARTICLES = [
  { x: 5, duration: 7, delay: 0.5 },
  { x: 15, duration: 8, delay: 1 },
  { x: 25, duration: 6, delay: 2 },
  { x: 35, duration: 9, delay: 0 },
  { x: 45, duration: 7, delay: 3 },
  { x: 55, duration: 8, delay: 1.5 },
  { x: 65, duration: 6, delay: 4 },
  { x: 75, duration: 9, delay: 2.5 },
  { x: 85, duration: 7, delay: 0.8 },
  { x: 95, duration: 8, delay: 3.5 },
  { x: 10, duration: 6, delay: 1.2 },
  { x: 20, duration: 9, delay: 4.5 },
  { x: 30, duration: 7, delay: 2.8 },
  { x: 40, duration: 8, delay: 0.3 },
  { x: 50, duration: 6, delay: 3.8 },
  { x: 60, duration: 9, delay: 1.8 },
  { x: 70, duration: 7, delay: 4.2 },
  { x: 80, duration: 8, delay: 2.2 },
  { x: 90, duration: 6, delay: 0.7 },
  { x: 98, duration: 9, delay: 3.2 },
];

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[var(--color-main-1)]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Floating particles effect - only render after mount to avoid hydration issues */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {PARTICLES.map((particle, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-[var(--color-main-1)]/30 rounded-full"
              style={{ left: `${particle.x}%` }}
              initial={{
                y: "110%",
                opacity: 0,
              }}
              animate={{
                y: "-10%",
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay,
                ease: "linear",
              }}
            />
          ))}
        </div>
      )}

      <div className="relative text-center max-w-2xl mx-auto">
        {/* 404 Number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
          className="relative mb-8"
        >
          <h1 className="text-[150px] md:text-[200px] font-heading text-transparent bg-clip-text bg-gradient-to-b from-[var(--color-main-1)] to-[var(--color-main-1)]/20 leading-none select-none">
            404
          </h1>
          
          {/* Glitch effect overlay */}
          <motion.div
            className="absolute inset-0 text-[150px] md:text-[200px] font-heading text-[var(--color-main-1)]/20 leading-none select-none"
            animate={{
              x: [0, -2, 2, -2, 0],
              opacity: [0, 0.5, 0, 0.5, 0],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          >
            404
          </motion.div>
        </motion.div>

        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-6xl mb-6"
        >
          🎮
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-2xl md:text-4xl font-heading uppercase tracking-wider mb-4"
        >
          Page Not Found
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-white/60 text-lg mb-8 max-w-md mx-auto"
        >
          Oops! Looks like this page wandered off into the void. 
          The quest you seek doesn&apos;t exist here.
        </motion.p>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/">
            <Button variant="primary" className="w-full sm:w-auto">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Return Home
              </span>
            </Button>
          </Link>
          
          <Link href="/store">
            <Button variant="outline" className="w-full sm:w-auto">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Browse Store
              </span>
            </Button>
          </Link>
        </motion.div>

        {/* Helpful links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 pt-8 border-t border-[var(--color-dark-3)]"
        >
          <p className="text-white/40 text-sm mb-4">Looking for something?</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/store" className="text-[var(--color-main-1)] hover:underline">
              Store
            </Link>
            <Link href="/games" className="text-[var(--color-main-1)] hover:underline">
              Games
            </Link>
            <Link href="/rewards" className="text-[var(--color-main-1)] hover:underline">
              Rewards
            </Link>
            <Link href="/contact" className="text-[var(--color-main-1)] hover:underline">
              Contact
            </Link>
            <span className="text-white/20">•</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


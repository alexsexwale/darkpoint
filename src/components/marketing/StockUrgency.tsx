"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface StockUrgencyProps {
  stock: number;
  lowStockThreshold?: number;
  className?: string;
  showViewers?: boolean;
  showSoldRecently?: boolean;
}

export function StockUrgency({
  stock,
  lowStockThreshold = 5,
  className,
  showViewers = true,
  showSoldRecently = true,
}: StockUrgencyProps) {
  const [viewers, setViewers] = useState(0);
  const [soldRecently, setSoldRecently] = useState(0);

  // Simulate viewers (in production, this would be real-time data)
  useEffect(() => {
    // Initial random viewers
    setViewers(Math.floor(Math.random() * 15) + 3);
    setSoldRecently(Math.floor(Math.random() * 25) + 5);

    // Occasionally update viewers
    const interval = setInterval(() => {
      setViewers((prev) => {
        const change = Math.random() > 0.5 ? 1 : -1;
        return Math.max(1, Math.min(30, prev + change));
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const isLowStock = stock > 0 && stock <= lowStockThreshold;
  const isOutOfStock = stock <= 0;

  if (isOutOfStock) {
    return (
      <div className={cn("text-sm", className)}>
        <span className="px-2 py-1 bg-red-500/20 text-red-400 font-medium">
          Out of Stock
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <AnimatePresence mode="wait">
        {/* Low stock warning */}
        {isLowStock && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-2"
          >
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="text-orange-500"
            >
              🔥
            </motion.span>
            <span className="text-sm font-medium text-orange-400">
              Only {stock} left in stock!
            </span>
          </motion.div>
        )}

        {/* Viewers count */}
        {showViewers && viewers > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm text-white/60"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <motion.span
              key={viewers}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
            >
              {viewers} {viewers === 1 ? "person is" : "people are"} viewing this
            </motion.span>
          </motion.div>
        )}

        {/* Sold recently */}
        {showSoldRecently && soldRecently > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 text-sm text-white/60"
          >
            <span>📦</span>
            <span>{soldRecently} sold in the last 24 hours</span>
          </motion.div>
        )}

        {/* Fast selling badge */}
        {isLowStock && soldRecently > 15 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--color-main-1)]/20 border border-[var(--color-main-1)]/50 text-[var(--color-main-1)] text-xs font-medium"
          >
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            >
              ⚡
            </motion.span>
            Selling fast!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


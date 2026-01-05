"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useMysteryBoxStore, determineRarity } from "@/stores/mysteryBoxStore";
import { useConfettiBurst } from "@/components/effects";
import { formatPrice } from "@/lib/utils";
import type { Rarity } from "@/types/gamification";

const RARITY_COLORS: Record<Rarity, string> = {
  common: "#9CA3AF",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F59E0B",
  mythic: "#EF4444",
};

const RARITY_GLOW: Record<Rarity, string> = {
  common: "shadow-gray-500/50",
  rare: "shadow-blue-500/50",
  epic: "shadow-purple-500/50",
  legendary: "shadow-yellow-500/50",
  mythic: "shadow-red-500/50",
};

const RARITY_LABELS: Record<Rarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
};

interface RevealedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  rarity: Rarity;
}

export function MysteryBoxRevealClient() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");
  
  const { pendingOrder, clearPendingOrder, setRevealedProduct, revealedProduct: storedProduct, orderNumber: storedOrderNumber } = useMysteryBoxStore();
  const { triggerConfetti } = useConfettiBurst();

  const [phase, setPhase] = useState<"loading" | "box" | "opening" | "reveal">("loading");
  const [revealedProduct, setLocalRevealedProduct] = useState<RevealedProduct | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch the revealed product
  const fetchRevealedProduct = useCallback(async () => {
    if (!orderNumber) {
      setError("No order number provided");
      return;
    }

    // Check if we already have the revealed product stored
    if (storedProduct && storedOrderNumber === orderNumber) {
      setLocalRevealedProduct(storedProduct);
      setPhase("reveal");
      return;
    }

    try {
      // Fetch from API
      const response = await fetch("/api/mystery-box/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to reveal product");
        return;
      }

      // Determine rarity based on product value
      const rarity = pendingOrder
        ? determineRarity(
            data.product.price,
            pendingOrder.minValue,
            pendingOrder.maxValue,
            pendingOrder.rarityWeights
          )
        : "rare";

      const product: RevealedProduct = {
        ...data.product,
        rarity,
      };

      setLocalRevealedProduct(product);
      setRevealedProduct(product, orderNumber);
      setPhase("box");
      
      // Clear the pending order
      clearPendingOrder();
    } catch (err) {
      console.error("Reveal error:", err);
      setError("Failed to reveal your mystery item");
    }
  }, [orderNumber, storedProduct, storedOrderNumber, pendingOrder, setRevealedProduct, clearPendingOrder]);

  useEffect(() => {
    fetchRevealedProduct();
  }, [fetchRevealedProduct]);

  // Handle box click
  const handleOpenBox = () => {
    setPhase("opening");
    
    // After animation, show reveal
    setTimeout(() => {
      setPhase("reveal");
      triggerConfetti();
    }, 2500);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-heading mb-4">Something went wrong</h1>
          <p className="text-white/60 mb-6">{error}</p>
          <Link
            href="/account/orders"
            className="nk-btn nk-btn-primary nk-btn-md inline-flex"
          >
            <span className="nk-btn-inner" />
            <span className="nk-btn-content">View My Orders</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-radial from-[var(--color-dark-2)] to-[var(--color-dark-1)]" />
      
      {/* Animated particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[var(--color-main-1)]/30 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800),
            }}
            animate={{
              y: [null, -100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container py-16">
        <AnimatePresence mode="wait">
          {/* Loading Phase */}
          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="animate-pulse">
                <div className="text-8xl mb-8">📦</div>
                <p className="text-white/60">Preparing your mystery box...</p>
              </div>
            </motion.div>
          )}

          {/* Box Phase - Click to open */}
          {phase === "box" && (
            <motion.div
              key="box"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="text-center"
            >
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-heading mb-8"
              >
                Your Mystery Box is Ready!
              </motion.h1>
              
              <motion.button
                onClick={handleOpenBox}
                className="relative mx-auto block cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  y: {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-[var(--color-main-1)] rounded-lg blur-3xl opacity-30 animate-pulse" />
                
                {/* Box */}
                <div className="relative text-[200px] leading-none">
                  📦
                </div>

                {/* Click hint */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 text-xl text-[var(--color-main-1)] font-heading"
                >
                  Click to Open!
                </motion.p>
              </motion.button>
            </motion.div>
          )}

          {/* Opening Animation */}
          {phase === "opening" && (
            <motion.div
              key="opening"
              initial={{ opacity: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{
                  rotateY: [0, 360, 720],
                  scale: [1, 1.3, 0],
                }}
                transition={{
                  duration: 2.5,
                  ease: "easeInOut",
                }}
                className="text-[200px] leading-none"
              >
                📦
              </motion.div>
              
              {/* Light burst effect */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 3], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, delay: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-40 h-40 bg-[var(--color-main-1)] rounded-full blur-3xl" />
              </motion.div>
            </motion.div>
          )}

          {/* Reveal Phase */}
          {phase === "reveal" && revealedProduct && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center max-w-2xl mx-auto"
            >
              {/* Congratulations */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-4xl md:text-5xl font-heading mb-2">
                  🎉 Congratulations! 🎉
                </h1>
                <p className="text-white/60 mb-8">You won an amazing item!</p>
              </motion.div>

              {/* Product Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.4, type: "spring", bounce: 0.4 }}
                className={`bg-[var(--color-dark-2)] border-2 p-8 shadow-2xl ${RARITY_GLOW[revealedProduct.rarity]}`}
                style={{ borderColor: RARITY_COLORS[revealedProduct.rarity] }}
              >
                {/* Rarity Badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                  className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-6"
                  style={{ 
                    backgroundColor: `${RARITY_COLORS[revealedProduct.rarity]}20`,
                    color: RARITY_COLORS[revealedProduct.rarity],
                    border: `1px solid ${RARITY_COLORS[revealedProduct.rarity]}`,
                  }}
                >
                  ✨ {RARITY_LABELS[revealedProduct.rarity]} ✨
                </motion.div>

                {/* Product Image */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="relative w-64 h-64 mx-auto mb-6 bg-[var(--color-dark-3)] rounded-lg overflow-hidden"
                >
                  <Image
                    src={revealedProduct.image}
                    alt={revealedProduct.name}
                    fill
                    className="object-contain p-4"
                  />
                </motion.div>

                {/* Product Name */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="text-2xl font-heading mb-2"
                >
                  {revealedProduct.name}
                </motion.h2>

                {/* Product Value */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="text-3xl font-heading mb-4"
                  style={{ color: RARITY_COLORS[revealedProduct.rarity] }}
                >
                  {formatPrice(revealedProduct.price)}
                </motion.p>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="text-white/60 text-sm mb-6 line-clamp-3"
                >
                  {revealedProduct.description}
                </motion.p>
              </motion.div>

              {/* Order Number */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-8 p-4 bg-[var(--color-dark-2)] border border-[var(--color-dark-3)]"
              >
                <p className="text-sm text-white/50">Order Number</p>
                <p className="text-lg font-heading text-[var(--color-main-1)]">{orderNumber}</p>
                <p className="text-xs text-white/40 mt-2">
                  Your item will be shipped to your address. Check your email for tracking updates.
                </p>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Link
                  href="/store/mystery-boxes"
                  className="nk-btn nk-btn-primary nk-btn-md inline-flex"
                >
                  <span className="nk-btn-inner" />
                  <span className="nk-btn-content">Try Another Box!</span>
                </Link>
                <Link
                  href="/account/orders"
                  className="nk-btn nk-btn-outline nk-btn-md inline-flex"
                >
                  <span className="nk-btn-inner" />
                  <span className="nk-btn-content">View My Orders</span>
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


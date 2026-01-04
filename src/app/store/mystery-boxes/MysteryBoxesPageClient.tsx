"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { MysteryBoxCard } from "@/components/gamification";
import { useGamificationStore, useAuthStore } from "@/stores";
import { useMysteryBoxStore, MYSTERY_BOXES } from "@/stores/mysteryBoxStore";
import type { MysteryBox } from "@/types/gamification";

export function MysteryBoxesPageClient() {
  const router = useRouter();
  const { setPendingOrder } = useMysteryBoxStore();
  const { updateQuestProgress, initDailyQuests, logActivity } = useGamificationStore();
  const { isAuthenticated, isInitialized: authInitialized } = useAuthStore();
  const hasTrackedVisit = useRef(false);

  // Track page visit for "Treasure Hunter" quest
  useEffect(() => {
    if (authInitialized && isAuthenticated && !hasTrackedVisit.current) {
      hasTrackedVisit.current = true;
      initDailyQuests();
      
      // Log activity to prevent duplicate tracking
      logActivity("visit_mystery_boxes").then((isNewActivity) => {
        if (isNewActivity) {
          console.log("[Quest] Tracking Mystery Boxes visit");
          updateQuestProgress("visit_mystery", 1);
        }
      });
    }
  }, [authInitialized, isAuthenticated, initDailyQuests, logActivity, updateQuestProgress]);

  const handlePurchase = (box: MysteryBox) => {
    // Store the selected box in state
    setPendingOrder(box);
    
    // Navigate to mystery box checkout
    router.push("/checkout/mystery-box");
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-main-1)]/10 to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-main-1)]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container relative">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-6xl mb-4"
            >
              📦
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-heading uppercase tracking-wider mb-4"
            >
              <span className="text-[var(--color-main-1)]">Mystery</span> Boxes
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/60 max-w-lg mx-auto"
            >
              Unbox amazing gaming gear worth way more than the price! Every box is guaranteed value.
            </motion.p>
          </div>

          {/* Boxes grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            {MYSTERY_BOXES.map((box, index) => (
              <motion.div
                key={box.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <MysteryBoxCard box={box} onPurchase={() => handlePurchase(box)} />
              </motion.div>
            ))}
          </div>

          {/* How it works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 max-w-4xl mx-auto"
          >
            <h2 className="text-2xl font-heading text-center mb-8">How It Works</h2>

            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-main-1)]/20 rounded-full flex items-center justify-center text-3xl">
                  1️⃣
                </div>
                <h3 className="font-heading text-sm mb-2">Choose a Crate</h3>
                <p className="text-xs text-white/50">Pick from Starter, Pro, or Elite tiers</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-main-1)]/20 rounded-full flex items-center justify-center text-3xl">
                  2️⃣
                </div>
                <h3 className="font-heading text-sm mb-2">Purchase</h3>
                <p className="text-xs text-white/50">Complete your secure payment</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-main-1)]/20 rounded-full flex items-center justify-center text-3xl">
                  3️⃣
                </div>
                <h3 className="font-heading text-sm mb-2">Reveal</h3>
                <p className="text-xs text-white/50">See what amazing item you won!</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-main-1)]/20 rounded-full flex items-center justify-center text-3xl">
                  4️⃣
                </div>
                <h3 className="font-heading text-sm mb-2">Receive</h3>
                <p className="text-xs text-white/50">Your item ships to you for free!</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[var(--color-dark-3)] text-center relative z-10">
              <p className="text-sm text-white/60 mb-4">
                ✓ Every box guaranteed worth more than purchase price • 
                ✓ Free shipping on all items • 
                ✓ Real gaming products
              </p>
              <Link 
                href="/store" 
                className="nk-btn nk-btn-outline nk-btn-md inline-flex"
              >
                <span className="nk-btn-inner" />
                <span className="nk-btn-content">Browse Regular Products →</span>
              </Link>
            </div>
          </motion.div>

          {/* Important Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-8 max-w-4xl mx-auto"
          >
            <div className="bg-[var(--color-main-1)]/10 border border-[var(--color-main-1)]/30 p-6 text-center">
              <p className="text-sm text-[var(--color-main-1)]">
                <strong>Note:</strong> Mystery Box purchases cannot be combined with discount codes or rewards. 
                All sales are final - no returns on mystery boxes.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

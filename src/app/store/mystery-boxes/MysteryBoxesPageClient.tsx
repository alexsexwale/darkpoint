"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { MysteryBoxCard, MysteryBoxOpening } from "@/components/gamification";
import { Button } from "@/components/ui";
import type { MysteryBox, Rarity } from "@/types/gamification";

// Sample mystery box data (would come from Supabase in production)
const SAMPLE_BOXES: MysteryBox[] = [
  {
    id: "starter_crate",
    name: "Starter Crate",
    description: "Perfect for beginners - guaranteed value!",
    price: 199,
    min_value: 200,
    max_value: 400,
    image_url: null,
    rarity_weights: { common: 60, rare: 30, epic: 10 },
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "pro_crate",
    name: "Pro Crate",
    description: "Higher stakes, better rewards",
    price: 499,
    min_value: 500,
    max_value: 1000,
    image_url: null,
    rarity_weights: { common: 40, rare: 40, epic: 18, legendary: 2 },
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "elite_crate",
    name: "Elite Crate",
    description: "Premium loot for serious collectors",
    price: 999,
    min_value: 1000,
    max_value: 2500,
    image_url: null,
    rarity_weights: { rare: 20, epic: 50, legendary: 25, mythic: 5 },
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

// Sample items for reveal
const SAMPLE_ITEMS = [
  { name: "Gaming Mouse", rarity: "common" as Rarity, value: 250 },
  { name: "RGB Mousepad", rarity: "common" as Rarity, value: 180 },
  { name: "Mechanical Keyboard", rarity: "rare" as Rarity, value: 450 },
  { name: "Gaming Headset", rarity: "rare" as Rarity, value: 600 },
  { name: "Wireless Controller", rarity: "epic" as Rarity, value: 850 },
  { name: "Gaming Monitor Stand", rarity: "epic" as Rarity, value: 750 },
  { name: "Premium Headset Pro", rarity: "legendary" as Rarity, value: 1500 },
  { name: "Elite Gaming Chair", rarity: "mythic" as Rarity, value: 2500 },
];

export function MysteryBoxesPageClient() {
  const [isOpening, setIsOpening] = useState(false);
  const [selectedBox, setSelectedBox] = useState<MysteryBox | null>(null);
  const [revealedItem, setRevealedItem] = useState<{
    name: string;
    value: number;
    rarity: Rarity;
    imageUrl?: string;
  } | null>(null);

  // Use sample data for now (mystery boxes will be fetched from DB when fully integrated)
  const boxes = SAMPLE_BOXES;

  const handlePurchase = (box: MysteryBox) => {
    setSelectedBox(box);

    // Simulate rarity roll
    const weights = box.rarity_weights as Record<Rarity, number>;
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    let rolledRarity: Rarity = "common";
    for (const [rarity, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        rolledRarity = rarity as Rarity;
        break;
      }
    }

    // Get random item of that rarity
    const possibleItems = SAMPLE_ITEMS.filter((i) => i.rarity === rolledRarity);
    const item = possibleItems[Math.floor(Math.random() * possibleItems.length)] || SAMPLE_ITEMS[0];

    setRevealedItem({
      name: item.name,
      value: item.value,
      rarity: item.rarity,
    });

    setIsOpening(true);
  };

  const handleClose = () => {
    setIsOpening(false);
    setSelectedBox(null);
    setRevealedItem(null);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-main-1)]/10 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-main-1)]/5 rounded-full blur-3xl" />

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
            {boxes.map((box, index) => (
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
                <h3 className="font-heading text-sm mb-2">Open</h3>
                <p className="text-xs text-white/50">Watch the exciting reveal animation</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-main-1)]/20 rounded-full flex items-center justify-center text-3xl">
                  4️⃣
                </div>
                <h3 className="font-heading text-sm mb-2">Receive</h3>
                <p className="text-xs text-white/50">Your item ships to you for free!</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[var(--color-dark-3)] text-center">
              <p className="text-sm text-white/60 mb-4">
                ✓ Every box guaranteed worth more than purchase price • 
                ✓ Free shipping on all items • 
                ✓ Real gaming products
              </p>
              <Link href="/store">
                <Button variant="outline">Browse Regular Products →</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Opening animation */}
      <MysteryBoxOpening
        isOpen={isOpening}
        onClose={handleClose}
        boxName={selectedBox?.name || "Mystery Box"}
        revealedItem={revealedItem}
      />
    </div>
  );
}


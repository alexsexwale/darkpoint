"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import type { MysteryBox } from "@/types/gamification";
import { RARITY_CONFIG, type Rarity } from "@/types/gamification";
import { Button } from "@/components/ui";

interface MysteryBoxCardProps {
  box: MysteryBox;
  onPurchase?: () => void;
  className?: string;
}

export function MysteryBoxCard({ box, onPurchase, className }: MysteryBoxCardProps) {
  // Parse rarity weights
  const rarityWeights = box.rarity_weights as Record<Rarity, number>;

  // Get primary rarity color based on best odds
  const primaryRarity = Object.entries(rarityWeights).reduce((a, b) =>
    (rarityWeights[a[0] as Rarity] || 0) > (rarityWeights[b[0] as Rarity] || 0) ? a : b
  )[0] as Rarity;

  const primaryColor = RARITY_CONFIG[primaryRarity]?.color || "#e08821";

  // Box tier styling
  const tierStyles: Record<string, { gradient: string; icon: string }> = {
    starter_crate: {
      gradient: "from-gray-600/30 to-gray-800/30",
      icon: "📦",
    },
    pro_crate: {
      gradient: "from-blue-600/30 to-purple-800/30",
      icon: "🎁",
    },
    elite_crate: {
      gradient: "from-yellow-600/30 to-red-800/30",
      icon: "👑",
    },
  };

  const style = tierStyles[box.id] || tierStyles.starter_crate;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      className={cn(
        "relative group overflow-hidden",
        "bg-[var(--color-dark-2)] border-2 transition-all duration-300",
        className
      )}
      style={{
        borderColor: primaryColor,
        boxShadow: `0 0 30px ${primaryColor}30`,
      }}
    >
      {/* Background gradient */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50 transition-opacity group-hover:opacity-70",
          style.gradient
        )}
      />

      {/* Animated glow effect */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        animate={{
          background: [
            `radial-gradient(circle at 50% 50%, ${primaryColor}20 0%, transparent 50%)`,
            `radial-gradient(circle at 50% 50%, ${primaryColor}30 0%, transparent 70%)`,
            `radial-gradient(circle at 50% 50%, ${primaryColor}20 0%, transparent 50%)`,
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Content */}
      <div className="relative p-6">
        {/* Box icon with animation */}
        <motion.div
          animate={{ 
            y: [0, -5, 0],
            rotate: [-2, 2, -2],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-6xl text-center mb-4"
        >
          {style.icon}
        </motion.div>

        {/* Box name */}
        <h3
          className="text-xl font-heading text-center uppercase tracking-wider mb-2"
          style={{ color: primaryColor }}
        >
          {box.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-white/60 text-center mb-4">
          {box.description}
        </p>

        {/* Value range */}
        <div className="text-center mb-4">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Value Range</p>
          <p className="font-heading text-lg">
            {formatPrice(box.min_value)} - {formatPrice(box.max_value)}
          </p>
        </div>

        {/* Rarity odds */}
        <div className="mb-6">
          <p className="text-xs text-white/40 uppercase tracking-wider text-center mb-2">
            Rarity Odds
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {Object.entries(rarityWeights).map(([rarity, weight]) => {
              const rarityConfig = RARITY_CONFIG[rarity as Rarity];
              if (!rarityConfig) return null;
              return (
                <div
                  key={rarity}
                  className="px-2 py-1 text-xs"
                  style={{
                    background: `${rarityConfig.color}20`,
                    color: rarityConfig.color,
                    border: `1px solid ${rarityConfig.color}40`,
                  }}
                >
                  {rarityConfig.name}: {weight}%
                </div>
              );
            })}
          </div>
        </div>

        {/* Price and buy button */}
        <div className="text-center">
          <p className="text-3xl font-heading text-[var(--color-main-1)] mb-4">
            {formatPrice(box.price)}
          </p>
          <Button
            variant="primary"
            onClick={onPurchase}
            className="w-full"
          >
            Purchase Crate
          </Button>
        </div>
      </div>

      {/* Corner decorations */}
      <div
        className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2"
        style={{ borderColor: primaryColor }}
      />
      <div
        className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2"
        style={{ borderColor: primaryColor }}
      />
      <div
        className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2"
        style={{ borderColor: primaryColor }}
      />
      <div
        className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2"
        style={{ borderColor: primaryColor }}
      />
    </motion.div>
  );
}


import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MysteryBox, Rarity } from "@/types/gamification";

export interface MysteryBoxOrder {
  boxId: string;
  boxName: string;
  boxPrice: number;
  minValue: number;
  maxValue: number;
  rarityWeights: Record<Rarity, number>;
}

interface RevealedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  rarity: Rarity;
  categoryId?: string;
}

interface MysteryBoxState {
  pendingOrder: MysteryBoxOrder | null;
  revealedProduct: RevealedProduct | null;
  orderNumber: string | null;
  isRevealing: boolean;
}

interface MysteryBoxActions {
  setPendingOrder: (box: MysteryBox) => void;
  clearPendingOrder: () => void;
  setRevealedProduct: (product: RevealedProduct, orderNumber: string) => void;
  clearRevealedProduct: () => void;
  setIsRevealing: (isRevealing: boolean) => void;
}

export const useMysteryBoxStore = create<MysteryBoxState & MysteryBoxActions>()(
  persist(
    (set) => ({
      // State
      pendingOrder: null,
      revealedProduct: null,
      orderNumber: null,
      isRevealing: false,

      // Actions
      setPendingOrder: (box: MysteryBox) => {
        set({
          pendingOrder: {
            boxId: box.id,
            boxName: box.name,
            boxPrice: box.price,
            minValue: box.min_value,
            maxValue: box.max_value,
            rarityWeights: box.rarity_weights as Record<Rarity, number>,
          },
        });
      },

      clearPendingOrder: () => {
        set({ pendingOrder: null });
      },

      setRevealedProduct: (product: RevealedProduct, orderNumber: string) => {
        set({ 
          revealedProduct: product, 
          orderNumber,
          isRevealing: false,
        });
      },

      clearRevealedProduct: () => {
        set({ 
          revealedProduct: null, 
          orderNumber: null,
          isRevealing: false,
        });
      },

      setIsRevealing: (isRevealing: boolean) => {
        set({ isRevealing });
      },
    }),
    {
      name: "mystery-box-store",
      partialize: (state) => ({
        pendingOrder: state.pendingOrder,
        revealedProduct: state.revealedProduct,
        orderNumber: state.orderNumber,
      }),
    }
  )
);

// Mystery box configurations
export const MYSTERY_BOXES: MysteryBox[] = [
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

// Helper to determine rarity based on product value and box range
export function determineRarity(
  productValue: number,
  minValue: number,
  maxValue: number,
  rarityWeights: Record<Rarity, number>
): Rarity {
  const range = maxValue - minValue;
  const normalizedValue = (productValue - minValue) / range;
  
  // Map value to rarity tiers
  const availableRarities = Object.keys(rarityWeights) as Rarity[];
  
  if (normalizedValue >= 0.9 && availableRarities.includes("mythic")) return "mythic";
  if (normalizedValue >= 0.75 && availableRarities.includes("legendary")) return "legendary";
  if (normalizedValue >= 0.5 && availableRarities.includes("epic")) return "epic";
  if (normalizedValue >= 0.25 && availableRarities.includes("rare")) return "rare";
  return "common";
}


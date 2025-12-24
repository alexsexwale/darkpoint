"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/types";

interface WishlistItem {
  product: Product;
  addedAt: string;
}

interface WishlistState {
  items: WishlistItem[];
}

interface WishlistActions {
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  toggleItem: (product: Product) => void;
  clearWishlist: () => void;
  isInWishlist: (productId: string) => boolean;
}

interface WishlistGetters {
  itemCount: () => number;
}

type WishlistStore = WishlistState & WishlistActions & WishlistGetters;

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      // State
      items: [],

      // Actions
      addItem: (product) => {
        const items = get().items;
        const existingItem = items.find((item) => item.product.id === product.id);

        if (!existingItem) {
          set({
            items: [
              ...items,
              {
                product,
                addedAt: new Date().toISOString(),
              },
            ],
          });
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.product.id !== productId),
        });
      },

      toggleItem: (product) => {
        const items = get().items;
        const existingItem = items.find((item) => item.product.id === product.id);

        if (existingItem) {
          set({
            items: items.filter((item) => item.product.id !== product.id),
          });
        } else {
          set({
            items: [
              ...items,
              {
                product,
                addedAt: new Date().toISOString(),
              },
            ],
          });
        }
      },

      clearWishlist: () => {
        set({ items: [] });
      },

      isInWishlist: (productId) => {
        return get().items.some((item) => item.product.id === productId);
      },

      // Getters
      itemCount: () => {
        return get().items.length;
      },
    }),
    {
      name: "darkpoint-wishlist",
      partialize: (state) => ({ items: state.items }),
    }
  )
);



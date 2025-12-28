"use client";

import { create } from "zustand";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Product } from "@/types";
import { useGamificationStore } from "./gamificationStore";

export interface WishlistItem {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string | null;
  product_image: string | null;
  product_price: number;
  product_original_price: number | null;
  product_category: string | null;
  added_at: string;
}

interface WishlistState {
  items: WishlistItem[];
  isLoading: boolean;
  isInitialized: boolean;
  pendingProduct: Product | null; // Product to add after login
}

interface WishlistActions {
  fetchWishlist: () => Promise<void>;
  addItem: (product: Product) => Promise<{ success: boolean; requiresAuth?: boolean }>;
  removeItem: (productId: string) => Promise<void>;
  toggleItem: (product: Product) => Promise<{ success: boolean; requiresAuth?: boolean; added?: boolean }>;
  clearWishlist: () => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  setPendingProduct: (product: Product | null) => void;
  processPendingProduct: () => Promise<void>;
  clearLocalState: () => void;
}

interface WishlistGetters {
  itemCount: () => number;
}

type WishlistStore = WishlistState & WishlistActions & WishlistGetters;

export const useWishlistStore = create<WishlistStore>()((set, get) => ({
      // State
      items: [],
  isLoading: false,
  isInitialized: false,
  pendingProduct: null,

  // Fetch wishlist from database
  fetchWishlist: async () => {
    if (!isSupabaseConfigured()) {
      set({ isInitialized: true });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ items: [], isInitialized: true });
      return;
    }

    set({ isLoading: true });

    try {
      const { data, error } = await supabase
        .from("user_wishlist")
        .select("*")
        .eq("user_id", user.id)
        .order("added_at", { ascending: false });

      if (error) throw error;

      set({ items: data || [], isLoading: false, isInitialized: true });
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  // Add item to wishlist
  addItem: async (product) => {
    if (!isSupabaseConfigured()) {
      return { success: false };
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    // If not authenticated, set pending product and return
    if (!user) {
      set({ pendingProduct: product });
      return { success: false, requiresAuth: true };
    }

    // Check if already in wishlist
    if (get().isInWishlist(product.id)) {
      return { success: true };
    }

    try {
      // Get the first image URL (images is an array of {id, src, alt} objects)
      const imageUrl = product.images?.[0]?.src || null;
      
      const { data, error } = await supabase
        .from("user_wishlist")
        // @ts-expect-error - Supabase type inference issue, types are correct
        .insert([{
          user_id: user.id,
          product_id: product.id,
          product_name: product.name,
          product_slug: product.slug,
          product_image: imageUrl,
          product_price: product.price,
          product_original_price: product.compareAtPrice || null,
          product_category: product.category || null,
        }])
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation (already exists)
        if (error.code === "23505") {
          return { success: true };
        }
        throw error;
      }

      set((state) => ({
        items: [data, ...state.items],
      }));

      // Trigger quest progress for "Wishful Thinking" quest
      const gamificationStore = useGamificationStore.getState();
      // Log activity to database for tracking
      gamificationStore.logActivity("wishlist_add", product.id);
      // Update quest progress
      gamificationStore.updateQuestProgress("add_wishlist", 1);

      return { success: true };
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      return { success: false };
    }
  },

  // Remove item from wishlist
  removeItem: async (productId) => {
    if (!isSupabaseConfigured()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (error) throw error;

      set((state) => ({
        items: state.items.filter((item) => item.product_id !== productId),
      }));
    } catch (error) {
      console.error("Error removing from wishlist:", error);
    }
  },

  // Toggle item in wishlist
  toggleItem: async (product) => {
    if (!isSupabaseConfigured()) {
      return { success: false };
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    // If not authenticated, set pending product and return
    if (!user) {
      set({ pendingProduct: product });
      return { success: false, requiresAuth: true };
    }

    const isInWishlist = get().isInWishlist(product.id);

    if (isInWishlist) {
      await get().removeItem(product.id);
      return { success: true, added: false };
        } else {
      const result = await get().addItem(product);
      return { ...result, added: result.success };
    }
  },

  // Clear wishlist
  clearWishlist: async () => {
    if (!isSupabaseConfigured()) {
      set({ items: [] });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_wishlist")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

        set({ items: [] });
    } catch (error) {
      console.error("Error clearing wishlist:", error);
    }
      },

  // Check if product is in wishlist
      isInWishlist: (productId) => {
    return get().items.some((item) => item.product_id === productId);
  },

  // Set pending product (to add after login)
  setPendingProduct: (product) => {
    set({ pendingProduct: product });
  },

  // Process pending product after login
  processPendingProduct: async () => {
    const { pendingProduct } = get();
    if (!pendingProduct) return;

    // Clear pending first
    set({ pendingProduct: null });

    // Add the product
    await get().addItem(pendingProduct);
  },

  // Clear local state (on logout)
  clearLocalState: () => {
    set({ items: [], isInitialized: false, pendingProduct: null });
      },

      // Getters
      itemCount: () => {
        return get().items.length;
      },
}));

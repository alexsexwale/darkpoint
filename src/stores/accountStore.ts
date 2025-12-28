"use client";

import { create } from "zustand";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Tables, InsertTables, UpdateTables, AddressType, OrderStatus, ReviewStatus } from "@/types/database";

// Types
export type UserAddress = Tables<"user_addresses">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type ProductReview = Tables<"product_reviews">;
export type ReviewReport = Tables<"review_reports">;
export type UserDownload = Tables<"user_downloads">;

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface UserStats {
  total_orders: number;
  processing_orders: number;
  delivered_orders: number;
  total_spent: number;
  total_reviews: number;
  helpful_votes: number;
}

export interface ReviewableProduct {
  order_item_id: string;
  product_id: string;
  product_name: string;
  product_slug: string | null;
  product_image: string | null;
  order_date: string;
}

interface AccountState {
  // Addresses
  addresses: UserAddress[];
  isLoadingAddresses: boolean;
  
  // Orders
  orders: OrderWithItems[];
  isLoadingOrders: boolean;
  
  // Reviews
  reviews: ProductReview[];
  reports: ReviewReport[];
  reviewableProducts: ReviewableProduct[];
  isLoadingReviews: boolean;
  
  // Downloads
  downloads: UserDownload[];
  isLoadingDownloads: boolean;
  
  // Stats
  stats: UserStats | null;
  isLoadingStats: boolean;
  
  // Actions
  fetchAddresses: () => Promise<void>;
  addAddress: (address: InsertTables<"user_addresses">) => Promise<{ success: boolean; error?: string }>;
  updateAddress: (id: string, updates: UpdateTables<"user_addresses">) => Promise<{ success: boolean; error?: string }>;
  deleteAddress: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  fetchOrders: () => Promise<void>;
  fetchOrderById: (id: string) => Promise<OrderWithItems | null>;
  
  fetchReviews: () => Promise<void>;
  fetchReports: () => Promise<void>;
  fetchReviewableProducts: () => Promise<void>;
  addReview: (review: InsertTables<"product_reviews">) => Promise<{ success: boolean; error?: string }>;
  updateReview: (id: string, updates: UpdateTables<"product_reviews">) => Promise<{ success: boolean; error?: string }>;
  deleteReview: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  fetchDownloads: () => Promise<void>;
  
  fetchStats: () => Promise<void>;
  
  updateProfile: (updates: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  // Initial State
  addresses: [],
  isLoadingAddresses: false,
  orders: [],
  isLoadingOrders: false,
  reviews: [],
  reports: [],
  reviewableProducts: [],
  isLoadingReviews: false,
  downloads: [],
  isLoadingDownloads: false,
  stats: null,
  isLoadingStats: false,
  
  // Addresses
  fetchAddresses: async () => {
    if (!isSupabaseConfigured()) return;
    
    set({ isLoadingAddresses: true });
    
    try {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      set({ addresses: data || [], isLoadingAddresses: false });
    } catch (error) {
      console.error("Error fetching addresses:", error);
      set({ isLoadingAddresses: false });
    }
  },
  
  addAddress: async (address) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Database not configured" };
    }
    
    try {
      const { data, error } = await supabase
        .from("user_addresses")
        // @ts-expect-error - Supabase type inference issue, types are correct
        .insert([address])
        .select()
        .single();
      
      if (error) throw error;
      
      set((state) => ({
        addresses: [data, ...state.addresses],
      }));
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add address";
      return { success: false, error: message };
    }
  },
  
  updateAddress: async (id, updates) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Database not configured" };
    }
    
    try {
      const { data, error } = await supabase
        .from("user_addresses")
        // @ts-expect-error - Supabase type inference issue, types are correct
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      
      set((state) => ({
        addresses: state.addresses.map((a) => (a.id === id ? data : a)),
      }));
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update address";
      return { success: false, error: message };
    }
  },
  
  deleteAddress: async (id) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Database not configured" };
    }
    
    try {
      const { error } = await supabase
        .from("user_addresses")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      set((state) => ({
        addresses: state.addresses.filter((a) => a.id !== id),
      }));
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete address";
      return { success: false, error: message };
    }
  },
  
  // Orders
  fetchOrders: async () => {
    if (!isSupabaseConfigured()) return;
    
    set({ isLoadingOrders: true });
    
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (ordersError) throw ordersError;
      
      // Fetch items for each order
      const ordersWithItems: OrderWithItems[] = await Promise.all(
        ((ordersData as Order[]) || []).map(async (order) => {
          const { data: itemsData } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", order.id);
          
          return {
            ...order,
            items: itemsData || [],
          };
        })
      );
      
      set({ orders: ordersWithItems, isLoadingOrders: false });
    } catch (error) {
      console.error("Error fetching orders:", error);
      set({ isLoadingOrders: false });
    }
  },
  
  fetchOrderById: async (id) => {
    if (!isSupabaseConfigured()) return null;
    
    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();
      
      if (orderError) throw orderError;
      if (!order) return null;
      
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id);
      
      return {
        ...(order as Order),
        items: (items as OrderItem[]) || [],
      };
    } catch (error) {
      console.error("Error fetching order:", error);
      return null;
    }
  },
  
  // Reviews
  fetchReviews: async () => {
    if (!isSupabaseConfigured()) return;
    
    set({ isLoadingReviews: true });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      set({ reviews: data || [], isLoadingReviews: false });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      set({ isLoadingReviews: false });
    }
  },
  
  fetchReports: async () => {
    if (!isSupabaseConfigured()) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from("review_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      set({ reports: data || [] });
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  },
  
  fetchReviewableProducts: async () => {
    if (!isSupabaseConfigured()) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Use the RPC function to get reviewable products
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .rpc("get_reviewable_products", { p_user_id: user.id });
      
      if (error) throw error;
      
      set({ reviewableProducts: data || [] });
    } catch (error) {
      console.error("Error fetching reviewable products:", error);
    }
  },
  
  addReview: async (review) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Database not configured" };
    }
    
    try {
      const { data, error } = await supabase
        .from("product_reviews")
        // @ts-expect-error - Supabase type inference issue, types are correct
        .insert([review])
        .select()
        .single();
      
      if (error) throw error;
      
      set((state) => ({
        reviews: [data, ...state.reviews],
        // Remove from reviewable products
        reviewableProducts: state.reviewableProducts.filter(
          (p) => p.order_item_id !== review.order_item_id
        ),
      }));
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add review";
      return { success: false, error: message };
    }
  },
  
  updateReview: async (id, updates) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Database not configured" };
    }
    
    try {
      const { data, error } = await supabase
        .from("product_reviews")
        // @ts-expect-error - Supabase type inference issue, types are correct
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      
      set((state) => ({
        reviews: state.reviews.map((r) => (r.id === id ? data : r)),
      }));
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update review";
      return { success: false, error: message };
    }
  },
  
  deleteReview: async (id) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Database not configured" };
    }
    
    try {
      const { error } = await supabase
        .from("product_reviews")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      set((state) => ({
        reviews: state.reviews.filter((r) => r.id !== id),
      }));
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete review";
      return { success: false, error: message };
    }
  },
  
  // Downloads
  fetchDownloads: async () => {
    if (!isSupabaseConfigured()) return;
    
    set({ isLoadingDownloads: true });
    
    try {
      const { data, error } = await supabase
        .from("user_downloads")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      set({ downloads: data || [], isLoadingDownloads: false });
    } catch (error) {
      console.error("Error fetching downloads:", error);
      set({ isLoadingDownloads: false });
    }
  },
  
  // Stats
  fetchStats: async () => {
    if (!isSupabaseConfigured()) return;
    
    set({ isLoadingStats: true });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // Use the RPC function to get stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .rpc("get_user_stats", { p_user_id: user.id });
      
      if (error) throw error;
      
      set({ stats: data?.[0] || null, isLoadingStats: false });
    } catch (error) {
      console.error("Error fetching stats:", error);
      set({ isLoadingStats: false });
    }
  },
  
  // Profile
  updateProfile: async (updates) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Database not configured" };
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("user_profiles")
        // @ts-expect-error - Supabase type inference issue, types are correct
        .update(updates)
        .eq("id", user.id);
      
      if (error) throw error;
      
      // Also update auth user metadata if display_name changed
      if (updates.display_name) {
        await supabase.auth.updateUser({
          data: { full_name: updates.display_name },
        });
      }
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile";
      return { success: false, error: message };
    }
  },
  
  updatePassword: async (currentPassword, newPassword) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Database not configured" };
    }
    
    try {
      // First verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Not authenticated");
      
      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update password";
      return { success: false, error: message };
    }
  },
}));


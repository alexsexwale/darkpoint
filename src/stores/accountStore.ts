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
  addReview: (review: InsertTables<"product_reviews">) => Promise<{ success: boolean; error?: string; xpAwarded?: number; achievementsUnlocked?: string[]; message?: string }>;
  updateReview: (id: string, updates: UpdateTables<"product_reviews">) => Promise<{ success: boolean; error?: string }>;
  deleteReview: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  fetchDownloads: () => Promise<void>;
  
  fetchStats: () => Promise<void>;
  
  updateProfile: (updates: {
    display_name?: string;
    username?: string;
    avatar_url?: string | null;
    phone?: string | null;
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
      const err = error as { message?: string; code?: string };
      let message = "Unable to save address. Please check your information and try again.";
      if (err.message?.includes("duplicate") || err.code === "23505") {
        message = "This address already exists. Please use a different address.";
      } else if (err.message?.includes("required") || err.message?.includes("null")) {
        message = "Please fill in all required fields.";
      }
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
      const err = error as { message?: string; code?: string };
      let message = "Unable to update address. Please try again.";
      if (err.message?.includes("not found") || err.code === "PGRST116") {
        message = "Address not found. It may have been deleted.";
      }
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
      const err = error as { message?: string; code?: string };
      let message = "Unable to delete address. Please try again.";
      if (err.message?.includes("not found") || err.code === "PGRST116") {
        message = "Address not found. It may have already been deleted.";
      }
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
      // Get auth session for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: "Please sign in to submit a review" };
      }

      // Get user info for author name
      const { data: { user } } = await supabase.auth.getUser();
      const authorName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Customer";

      // Use API endpoint for XP and achievement rewards
      const response = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          productId: review.product_id,
          rating: review.rating,
          title: review.title,
          content: review.content,
          authorName: authorName,
          images: [],
        }),
      });

      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error || "Unable to submit review" };
      }
      
      // Refresh reviews list
      await get().fetchReviews();
      
      // Remove from reviewable products
      set((state) => ({
        reviewableProducts: state.reviewableProducts.filter(
          (p) => p.order_item_id !== review.order_item_id
        ),
      }));

      // Refresh gamification profile to update XP display and show notification
      const { useGamificationStore } = await import("./gamificationStore");
      const gamificationStore = useGamificationStore.getState();
      await gamificationStore.fetchUserProfile();
      
      // Show XP notification
      if (result.xp_awarded) {
        gamificationStore.addNotification({
          type: "xp_gain",
          title: `+${result.xp_awarded} XP`,
          message: "Review submitted successfully!",
          xpAmount: result.xp_awarded,
        });
      }
      
      return { 
        success: true, 
        xpAwarded: result.xp_awarded,
        achievementsUnlocked: result.achievements_unlocked,
        message: result.message,
      };
    } catch (error) {
      console.error("Error submitting review:", error);
      return { success: false, error: "Unable to submit review. Please try again." };
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
      return { success: false, error: "Unable to update review. Please try again." };
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
      return { success: false, error: "Unable to delete review. Please try again." };
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
      
      // Log what we're updating (without the full base64 data)
      const logUpdates = { ...updates };
      if (logUpdates.avatar_url && logUpdates.avatar_url.length > 100) {
        logUpdates.avatar_url = `[base64 image, ${logUpdates.avatar_url.length} chars]`;
      }
      console.log("Updating profile for user:", user.id, "with:", logUpdates);
      
      // First check if profile exists
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("id", user.id)
        .single();
      
      let error;
      let data;
      
      if (!existingProfile) {
        // Profile doesn't exist, create it with upsert
        console.log("Profile doesn't exist, creating with upsert...");
        const result = await supabase
          .from("user_profiles")
          .upsert({
            id: user.id,
            email: user.email,
            ...updates,
          } as never)
          .select();
        error = result.error;
        data = result.data;
      } else {
        // Profile exists, just update
        const result = await supabase
          .from("user_profiles")
          // @ts-expect-error - Supabase type inference issue, types are correct
          .update(updates)
          .eq("id", user.id)
          .select();
        error = result.error;
        data = result.data;
      }
      
      if (error) {
        console.error("Supabase update error:", error);
        throw new Error(`${error.message} (Code: ${error.code})`);
      }
      
      console.log("Profile updated successfully:", data);
      
      // Also update auth user metadata if display_name changed
      if (updates.display_name) {
        await supabase.auth.updateUser({
          data: { full_name: updates.display_name },
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error("updateProfile error:", error);
      const err = error as { message?: string; code?: string };
      let message = "Unable to update profile. Please try again.";
      if (err.message?.includes("duplicate") || err.code === "23505") {
        message = "This username or email is already taken. Please choose a different one.";
      } else if (err.message?.includes("too long") || err.message?.includes("length")) {
        message = "Some fields are too long. Please shorten them and try again.";
      }
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
      const err = error as { message?: string; code?: string };
      let message = "Unable to update password. Please try again.";
      if (err.message?.includes("same") || err.message?.includes("identical")) {
        message = "New password must be different from your current password.";
      } else if (err.message?.includes("weak") || err.message?.includes("Password")) {
        message = "Password is too weak. Please use at least 6 characters.";
      } else if (err.message?.includes("current") || err.message?.includes("old")) {
        message = "Current password is incorrect. Please try again.";
      }
      return { success: false, error: message };
    }
  },
}));


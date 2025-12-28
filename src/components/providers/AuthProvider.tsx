"use client";

import { useEffect } from "react";
import { useAuthStore, useWishlistStore } from "@/stores";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initialize, isInitialized, isAuthenticated } = useAuthStore();
  const { fetchWishlist, clearLocalState, processPendingProduct, pendingProduct } = useWishlistStore();

  // Initialize auth
  useEffect(() => {
    if (!isInitialized && isSupabaseConfigured()) {
      initialize();
    }
  }, [initialize, isInitialized]);

  // Fetch wishlist when auth state changes
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      // Fetch wishlist when user is authenticated
      fetchWishlist().then(() => {
        // Process any pending product after fetching
        if (pendingProduct) {
          processPendingProduct();
        }
      });
    } else if (isInitialized && !isAuthenticated) {
      // Clear wishlist state when user logs out
      clearLocalState();
    }
  }, [isInitialized, isAuthenticated, fetchWishlist, clearLocalState, processPendingProduct, pendingProduct]);

  // Listen for auth state changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        // Clear wishlist on sign out
        clearLocalState();
      } else if (event === "SIGNED_IN") {
        // Fetch wishlist on sign in
        fetchWishlist().then(() => {
          if (pendingProduct) {
            processPendingProduct();
          }
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchWishlist, clearLocalState, processPendingProduct, pendingProduct]);

  return <>{children}</>;
}

"use client";

import { useEffect } from "react";
import { useAuthStore, useWishlistStore, useGamificationStore } from "@/stores";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initialize, isInitialized, isAuthenticated } = useAuthStore();
  const { fetchWishlist, clearLocalState, processPendingProduct, pendingProduct } = useWishlistStore();
  const { initialize: initGamification, reset: resetGamification } = useGamificationStore();

  // Initialize auth
  useEffect(() => {
    if (!isInitialized && isSupabaseConfigured()) {
      initialize();
    }
  }, [initialize, isInitialized]);

  // Fetch user data when auth state changes
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      // Fetch wishlist when user is authenticated
      fetchWishlist().then(() => {
        // Process any pending product after fetching
        if (pendingProduct) {
          processPendingProduct();
        }
      });
      
      // Initialize gamification system
      initGamification();
    } else if (isInitialized && !isAuthenticated) {
      // Clear state when user logs out
      clearLocalState();
      resetGamification();
    }
  }, [isInitialized, isAuthenticated, fetchWishlist, clearLocalState, processPendingProduct, pendingProduct, initGamification, resetGamification]);

  // Listen for auth state changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        // Clear state on sign out
        clearLocalState();
        resetGamification();
      } else if (event === "SIGNED_IN") {
        // Fetch user data on sign in
        fetchWishlist().then(() => {
          if (pendingProduct) {
            processPendingProduct();
          }
        });
        initGamification();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchWishlist, clearLocalState, processPendingProduct, pendingProduct, initGamification, resetGamification]);

  return <>{children}</>;
}

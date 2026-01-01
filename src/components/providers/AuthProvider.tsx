"use client";

import { useEffect } from "react";
import { useAuthStore, useWishlistStore, useGamificationStore, useRewardsStore } from "@/stores";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initialize, isInitialized, isAuthenticated } = useAuthStore();
  const { fetchWishlist, clearLocalState, processPendingProduct, pendingProduct } = useWishlistStore();
  const { initialize: initGamification, reset: resetGamification } = useGamificationStore();
  const { fetchRewards, clearLocalState: clearRewardsState } = useRewardsStore();

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
      
      // Fetch user rewards
      fetchRewards();
    } else if (isInitialized && !isAuthenticated) {
      // Clear state when user logs out
      clearLocalState();
      resetGamification();
      clearRewardsState();
    }
  }, [isInitialized, isAuthenticated, fetchWishlist, clearLocalState, processPendingProduct, pendingProduct, initGamification, resetGamification, fetchRewards, clearRewardsState]);

  // Listen for auth state changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        // Clear state on sign out
        clearLocalState();
        resetGamification();
        clearRewardsState();
      } else if (event === "SIGNED_IN") {
        // Fetch user data on sign in
        fetchWishlist().then(() => {
          if (pendingProduct) {
            processPendingProduct();
          }
        });
        initGamification();
        fetchRewards();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchWishlist, clearLocalState, processPendingProduct, pendingProduct, initGamification, resetGamification, fetchRewards, clearRewardsState]);

  // Listen for custom events to refresh rewards (e.g., after level up)
  useEffect(() => {
    const handleRefreshRewards = () => {
      if (isAuthenticated) {
        fetchRewards();
      }
    };

    window.addEventListener("refresh-rewards", handleRefreshRewards);
    return () => window.removeEventListener("refresh-rewards", handleRefreshRewards);
  }, [isAuthenticated, fetchRewards]);

  return <>{children}</>;
}

"use client";

import { useEffect, useCallback } from "react";
import { useAuthStore, useWishlistStore, useGamificationStore, useRewardsStore } from "@/stores";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initialize, isInitialized, isAuthenticated, user, signOut } = useAuthStore();
  const { fetchWishlist, clearLocalState, processPendingProduct, pendingProduct } = useWishlistStore();
  const { initialize: initGamification, reset: resetGamification } = useGamificationStore();
  const { fetchRewards, clearLocalState: clearRewardsState } = useRewardsStore();

  // Check if user is suspended
  const checkSuspension = useCallback(async () => {
    if (!isSupabaseConfigured() || !user?.id) return;
    
    try {
      type SuspensionCheck = { is_suspended: boolean | null; suspension_reason: string | null };
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("is_suspended, suspension_reason")
        .eq("id", user.id)
        .single<SuspensionCheck>();
      
      if (profile?.is_suspended) {
        // Force logout suspended user
        await signOut();
        
        // Show alert with reason
        const reason = profile.suspension_reason || "Please contact support for assistance.";
        alert(`Your account has been suspended.\n\nReason: ${reason}`);
        
        // Redirect to home
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Error checking suspension:", err);
    }
  }, [user?.id, signOut]);

  // Initialize auth
  useEffect(() => {
    if (!isInitialized && isSupabaseConfigured()) {
      initialize();
    }
  }, [initialize, isInitialized]);

  // Check suspension status periodically (every 60 seconds) and on mount
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    
    // Check immediately
    checkSuspension();
    
    // Then check every 60 seconds
    const interval = setInterval(checkSuspension, 60000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, user?.id, checkSuspension]);

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

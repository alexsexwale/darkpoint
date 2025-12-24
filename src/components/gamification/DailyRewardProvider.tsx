"use client";

import { useEffect, useRef } from "react";
import { useGamificationStore } from "@/stores";

interface DailyRewardProviderProps {
  children: React.ReactNode;
}

/**
 * DailyRewardProvider - Automatically shows the daily reward modal
 * when a user visits the site and hasn't claimed their reward today.
 * 
 * Features:
 * - 2-second delay before showing modal (lets page load first)
 * - Only shows for authenticated users
 * - Only shows once per session (won't re-trigger on navigation)
 * - Checks if user has already claimed today's reward
 */
export function DailyRewardProvider({ children }: DailyRewardProviderProps) {
  const { userProfile, isAuthenticated, setDailyRewardModal } = useGamificationStore();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Only check once per session
    if (hasCheckedRef.current) return;

    // Need to be authenticated with a profile
    if (!isAuthenticated || !userProfile) return;

    // Check if already claimed today
    const today = new Date().toISOString().split("T")[0];
    const hasClaimed = userProfile.last_login_date === today;

    if (hasClaimed) {
      hasCheckedRef.current = true;
      return;
    }

    // Show the modal after a short delay to let the page load
    const timer = setTimeout(() => {
      hasCheckedRef.current = true;
      setDailyRewardModal(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, userProfile, setDailyRewardModal]);

  return <>{children}</>;
}


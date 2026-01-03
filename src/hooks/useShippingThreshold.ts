"use client";

import { useMemo } from "react";
import { useGamificationStore } from "@/stores";
import { FREE_SHIPPING_THRESHOLD, VIP_FREE_SHIPPING_THRESHOLD } from "@/lib/constants";

/**
 * Hook to get the appropriate free shipping threshold based on VIP status.
 * VIP badge holders get free shipping at R300, regular users at R500.
 */
export function useShippingThreshold() {
  const { hasAnyBadge } = useGamificationStore();
  
  const isVIP = hasAnyBadge();
  
  const threshold = useMemo(() => {
    return isVIP ? VIP_FREE_SHIPPING_THRESHOLD : FREE_SHIPPING_THRESHOLD;
  }, [isVIP]);

  return {
    threshold,
    isVIP,
    regularThreshold: FREE_SHIPPING_THRESHOLD,
    vipThreshold: VIP_FREE_SHIPPING_THRESHOLD,
  };
}


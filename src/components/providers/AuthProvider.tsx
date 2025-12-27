"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores";
import { isSupabaseConfigured } from "@/lib/supabase";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized && isSupabaseConfigured()) {
      initialize();
    }
  }, [initialize, isInitialized]);

  return <>{children}</>;
}


"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/stores";

/**
 * If user has a session (e.g. OAuth succeeded but callback sent them here),
 * redirect to home so they are not stuck on the error page.
 */
export function AuthErrorClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const refreshSession = useAuthStore.getState().refreshSession;
        await refreshSession();
        router.replace("/");
      }
    })();
  }, [router]);

  return <>{children}</>;
}

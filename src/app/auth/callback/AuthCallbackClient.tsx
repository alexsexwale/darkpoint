"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/stores";

/**
 * Handles OAuth callback in the browser so the PKCE code_verifier (stored
 * when signInWithOAuth was called) is available for exchangeCodeForSession.
 */
export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const [status, setStatus] = useState<"exchanging" | "success" | "error">("exchanging");

  useEffect(() => {
    const code = searchParams.get("code");
    const rawNext = searchParams.get("next") ?? "/";
    // Only allow relative paths to prevent open redirect
    const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

    if (!isSupabaseConfigured()) {
      router.replace("/auth/error");
      return;
    }

    async function hasSession(): Promise<boolean> {
      const { data } = await supabase.auth.getSession();
      return Boolean(data.session);
    }

    // No code: might be return from OAuth with session already set (e.g. fragment) or refresh
    if (!code) {
      (async () => {
        if (await hasSession()) {
          setStatus("success");
          await refreshSession();
          router.replace(next);
        } else {
          router.replace("/auth/error");
        }
      })();
      return;
    }

    const codeToExchange = code;
    let cancelled = false;

    async function exchange() {
      const { data, error } = await supabase.auth.exchangeCodeForSession(codeToExchange);
      if (cancelled) return;
      if (error) {
        // Session may be set asynchronously (e.g. link to existing account); check immediately and after short delay
        let session = data?.session ?? (await supabase.auth.getSession()).data.session;
        if (!session) {
          await new Promise((r) => setTimeout(r, 150));
          if (cancelled) return;
          session = (await supabase.auth.getSession()).data.session ?? null;
        }
        if (session) {
          setStatus("success");
          await refreshSession();
          router.replace(next);
          return;
        }
        setStatus("error");
        router.replace("/auth/error");
        return;
      }
      setStatus("success");
      await refreshSession();
      router.replace(next);
    }

    exchange();
    return () => {
      cancelled = true;
    };
  }, [searchParams, router, refreshSession]);

  return (
    <main className="min-h-screen bg-[var(--color-dark-1)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {status === "exchanging" && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
            <p className="text-[var(--muted-foreground)]">Completing sign in…</p>
          </>
        )}
        {status === "success" && (
          <p className="text-[var(--muted-foreground)]">Redirecting…</p>
        )}
        {status === "error" && (
          <p className="text-[var(--muted-foreground)]">Redirecting to sign in…</p>
        )}
      </div>
    </main>
  );
}

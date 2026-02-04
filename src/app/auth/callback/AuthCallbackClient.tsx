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
    <main className="min-h-screen bg-[var(--color-dark-1)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-dark-1)] via-[var(--color-dark-2)] to-[var(--color-dark-1)]" />
      <div className="absolute top-1/4 left-1/2 w-[480px] h-[480px] -translate-x-1/2 -translate-y-1/2 bg-[var(--color-main-1)]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-[var(--color-main-1)]/5 rounded-full blur-[60px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full text-center">
        <div className="inline-flex flex-col items-center">
          {/* Logo / brand */}
          <p className="font-heading text-xl uppercase tracking-[0.3em] text-white/90 mb-10">
            Darkpoint
          </p>

          {/* Card */}
          <div className="w-full rounded-2xl border border-[var(--color-dark-3)] bg-[var(--color-dark-2)]/80 backdrop-blur-sm px-10 py-12 shadow-2xl shadow-black/40">
            {status === "exchanging" && (
              <>
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 rounded-full border-2 border-[var(--color-dark-4)]" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-main-1)] border-r-[var(--color-main-1)] animate-spin" />
                  <div className="absolute inset-2 rounded-full bg-[var(--color-main-1)]/20 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-main-1)] shadow-[0_0_20px_var(--color-main-1)]" />
                  </div>
                </div>
                <p className="text-lg font-medium text-white mb-1">Completing sign in</p>
                <p className="text-sm text-[var(--muted-foreground)]">Taking you back to Darkpoint…</p>
              </>
            )}
            {status === "success" && (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--color-main-1)]/20 flex items-center justify-center border border-[var(--color-main-1)]/40">
                  <svg className="w-10 h-10 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-white mb-1">You’re in</p>
                <p className="text-sm text-[var(--muted-foreground)]">Redirecting…</p>
              </>
            )}
            {status === "error" && (
              <p className="text-[var(--muted-foreground)]">Redirecting…</p>
            )}
          </div>

          <p className="mt-8 text-xs text-[var(--muted-foreground)]/70 uppercase tracking-widest">
            {status === "exchanging" ? "Securing your session" : status === "success" ? "Welcome back" : "One moment"}
          </p>
        </div>
      </div>
    </main>
  );
}

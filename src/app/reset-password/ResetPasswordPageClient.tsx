"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { useUIStore, useAuthStore } from "@/stores";
import { supabase } from "@/lib/supabase";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { openSignIn } = useUIStore();
  const { updatePassword } = useAuthStore();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isSupabaseRecovery, setIsSupabaseRecovery] = useState(false);

  // Password strength indicators
  const passwordChecks = {
    length: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasLetter: /[a-zA-Z]/.test(password),
    match: password === confirmPassword && password.length > 0,
  };

  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

  // Validate on mount: Supabase recovery (hash) or custom token (query)
  useEffect(() => {
    async function validate() {
      if (typeof window === "undefined") return;

      const hash = window.location.hash || "";
      const hasSupabaseRecovery = hash.includes("type=recovery");

      if (hasSupabaseRecovery) {
        setIsSupabaseRecovery(true);
        try {
          // Client may need a moment to recover session from URL hash
          let session = (await supabase.auth.getSession()).data.session;
          for (let i = 0; i < 5 && !session; i++) {
            await new Promise((r) => setTimeout(r, 200));
            session = (await supabase.auth.getSession()).data.session;
          }
          if (session?.user) {
            setUserEmail(session.user.email || "");
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
          } else {
            setTokenError("Invalid or expired reset link. Please request a new one.");
          }
        } catch {
          setTokenError("Invalid or expired reset link. Please request a new one.");
        }
        setIsValidating(false);
        return;
      }

      if (!token) {
        setTokenError("No reset token provided. Please request a new password reset link.");
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setTokenError(data.error || "Invalid or expired reset link. Please request a new one.");
        } else {
          setUserEmail(data.email || "");
        }
      } catch (err) {
        setTokenError("Failed to validate reset link. Please try again.");
      } finally {
        setIsValidating(false);
      }
    }

    validate();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!passwordChecks.length) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!passwordChecks.match) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      if (isSupabaseRecovery) {
        const result = await updatePassword(password);
        if (!result.success) {
          setError(result.error || "Failed to reset password. Please try again.");
          return;
        }
        setIsSuccess(true);
      } else {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || "Failed to reset password. Please try again.");
          return;
        }
        setIsSuccess(true);
      }
    } catch (err) {
      setError("An error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-[var(--color-main-1)] border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-white/60">Validating reset link...</p>
        </div>
      </div>
    );
  }

  // Token error state
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full"
        >
          <div className="bg-gradient-to-br from-[var(--color-dark-2)] to-[var(--color-dark-1)] border border-red-500/30 rounded-lg p-8 md:p-10 text-center">
            {/* Error icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h1 className="text-3xl font-heading uppercase tracking-wider mb-4">
              Link <span className="text-red-500">Expired</span>
            </h1>

            <p className="text-white/60 mb-8">{tokenError}</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/forgot-password">
                <Button variant="primary">Request New Link</Button>
              </Link>
              <Button variant="outline" onClick={() => openSignIn("login")}>
                Back to Sign In
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full"
        >
          <div className="bg-gradient-to-br from-[var(--color-dark-2)] to-[var(--color-dark-1)] border border-green-500/30 rounded-lg p-8 md:p-10 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />

            <div className="relative z-10">
              {/* Success icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-24 h-24 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center"
              >
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="w-12 h-12 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </motion.svg>
              </motion.div>

              <h1 className="text-3xl font-heading uppercase tracking-wider mb-4">
                Password <span className="text-green-500">Updated!</span>
              </h1>

              <p className="text-white/70 mb-8">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>

              <Button variant="primary" size="lg" onClick={() => openSignIn("login")}>
                Sign In Now
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full"
      >
        <div className="bg-gradient-to-br from-[var(--color-dark-2)] to-[var(--color-dark-1)] border border-[var(--color-dark-3)] rounded-lg p-8 md:p-10 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-main-1)]/5 to-transparent" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-main-1)]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-[var(--color-main-1)]/20 rounded-full flex items-center justify-center border-2 border-[var(--color-main-1)]/40">
              <svg className="w-10 h-10 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h1 className="text-3xl font-heading uppercase tracking-wider text-center mb-2">
              Create New <span className="text-[var(--color-main-1)]">Password</span>
            </h1>

            {userEmail && (
              <p className="text-white/60 text-center mb-6">
                For: <span className="text-[var(--color-main-1)]">{userEmail}</span>
              </p>
            )}

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6"
              >
                <p className="text-red-400 text-sm text-center">{error}</p>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 pr-12 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded text-white placeholder-white/40 focus:outline-none focus:border-[var(--color-main-1)] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80 mb-2">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded text-white placeholder-white/40 focus:outline-none focus:border-[var(--color-main-1)] transition-colors"
                />
              </div>

              {/* Password strength indicator */}
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded transition-colors ${
                        passwordStrength >= level
                          ? passwordStrength === 4
                            ? "bg-green-500"
                            : passwordStrength >= 3
                            ? "bg-yellow-500"
                            : "bg-red-500"
                          : "bg-[var(--color-dark-4)]"
                      }`}
                    />
                  ))}
                </div>
                <ul className="text-xs space-y-1">
                  <li className={passwordChecks.length ? "text-green-500" : "text-white/40"}>
                    {passwordChecks.length ? "✓" : "○"} At least 8 characters
                  </li>
                  <li className={passwordChecks.hasLetter ? "text-green-500" : "text-white/40"}>
                    {passwordChecks.hasLetter ? "✓" : "○"} Contains letters
                  </li>
                  <li className={passwordChecks.hasNumber ? "text-green-500" : "text-white/40"}>
                    {passwordChecks.hasNumber ? "✓" : "○"} Contains numbers
                  </li>
                  <li className={passwordChecks.match ? "text-green-500" : "text-white/40"}>
                    {passwordChecks.match ? "✓" : "○"} Passwords match
                  </li>
                </ul>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isLoading || passwordStrength < 4}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full"
                    />
                    Updating...
                  </span>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>

            {/* Back to sign in */}
            <div className="mt-6 text-center">
              <button
                onClick={() => openSignIn("login")}
                className="text-white/50 text-sm hover:text-white/70"
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function ResetPasswordPageClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-[var(--color-main-1)] border-t-transparent rounded-full"
          />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}


"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "invalid">("idle");
  const [error, setError] = useState("");

  // Check if token exists
  useEffect(() => {
    if (!token) {
      setStatus("invalid");
    }
  }, [token]);

  const validatePassword = () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validatePassword()) {
      return;
    }

    setStatus("loading");

    // TODO: Implement actual password reset API call
    // Simulating API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate success
    setStatus("success");

    // Redirect to sign in after 3 seconds
    setTimeout(() => {
      router.push("/");
    }, 3000);
  };

  // Invalid or expired token
  if (status === "invalid") {
    return (
      <div className="container py-8">
        <div className="nk-gap-4 h-16" />

        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 className="text-3xl font-heading text-white mb-4">Invalid Reset Link</h1>

          <p className="text-white/60 mb-8">
            This password reset link is invalid or has expired. Please request a new password reset link.
          </p>

          <Link
            href="/"
            className="inline-block px-8 py-3 bg-[var(--color-main-1)] text-black font-heading uppercase tracking-wider hover:bg-[var(--color-main-1)]/90 transition-colors cursor-pointer"
          >
            Back to Home
          </Link>
        </div>

        <div className="nk-gap-4 h-16" />
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="container py-8">
        <div className="nk-gap-4 h-16" />

        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-heading text-white mb-4">Password Reset Successfully</h1>

          <p className="text-white/60 mb-4">
            Your password has been changed. You can now sign in with your new password.
          </p>

          <p className="text-white/40 text-sm mb-8">
            Redirecting to home page...
          </p>

          <Link
            href="/"
            className="inline-block px-8 py-3 bg-[var(--color-main-1)] text-black font-heading uppercase tracking-wider hover:bg-[var(--color-main-1)]/90 transition-colors cursor-pointer"
          >
            Sign In Now
          </Link>
        </div>

        <div className="nk-gap-4 h-16" />
      </div>
    );
  }

  // Reset form
  return (
    <div className="container py-8">
      <div className="nk-gap-4 h-16" />

      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-heading text-white mb-4">Reset Your Password</h1>
          <p className="text-white/60">
            Enter your new password below.
          </p>
        </div>

        <div className="bg-[var(--color-dark-1)] border border-[var(--color-dark-3)] p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm text-white/60 mb-2">
                New Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={8}
                className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
              />
              <p className="text-white/40 text-xs mt-1">
                Must be at least 8 characters
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm text-white/60 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button
              variant="primary"
              className="w-full cursor-pointer"
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Resetting Password...
                </span>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>

          {/* Password requirements */}
          <div className="mt-6 pt-6 border-t border-[var(--color-dark-3)]">
            <p className="text-white/40 text-xs mb-3">Password requirements:</p>
            <ul className="text-white/40 text-xs space-y-1">
              <li className={password.length >= 8 ? "text-green-400" : ""}>
                • At least 8 characters
              </li>
              <li className={password && password === confirmPassword ? "text-green-400" : ""}>
                • Passwords match
              </li>
            </ul>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-white/50 hover:text-[var(--color-main-1)] transition-colors text-sm cursor-pointer"
          >
            ← Back to Home
          </Link>
        </div>
      </div>

      <div className="nk-gap-4 h-16" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="container py-8">
        <div className="nk-gap-4 h-16" />
        <div className="max-w-md mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-10 bg-white/10 rounded mb-4 w-3/4 mx-auto" />
            <div className="h-4 bg-white/10 rounded mb-8 w-1/2 mx-auto" />
            <div className="h-40 bg-white/10 rounded" />
          </div>
        </div>
        <div className="nk-gap-4 h-16" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}



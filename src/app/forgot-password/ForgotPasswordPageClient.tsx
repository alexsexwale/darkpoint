"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { useUIStore } from "@/stores";

export function ForgotPasswordPageClient() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const { openSignIn } = useUIStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setIsSubmitted(true);
    } catch (err) {
      setError("An error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full"
        >
          <div className="bg-gradient-to-br from-[var(--color-dark-2)] to-[var(--color-dark-1)] border border-[var(--color-main-1)]/30 rounded-lg p-8 md:p-10 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-main-1)]/5 to-transparent" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10">
              {/* Success icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-24 h-24 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center"
              >
                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </motion.div>

              <h1 className="text-3xl font-heading uppercase tracking-wider mb-4">
                Check Your <span className="text-green-500">Email</span>
              </h1>

              <p className="text-white/70 mb-6">
                We&apos;ve sent a password reset link to{" "}
                <span className="text-[var(--color-main-1)] font-semibold">{email}</span>
              </p>

              <div className="bg-[var(--color-dark-3)]/50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-white/60 mb-2">
                  <strong className="text-white/80">📧 What to do next:</strong>
                </p>
                <ul className="text-sm text-white/60 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-main-1)]">1.</span>
                    Check your inbox (and spam folder)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-main-1)]">2.</span>
                    Click the reset link in the email
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--color-main-1)]">3.</span>
                    Create your new password
                  </li>
                </ul>
              </div>

              <p className="text-xs text-white/40 mb-6">
                Link expires in 1 hour. Didn&apos;t receive it?{" "}
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="text-[var(--color-main-1)] hover:underline"
                >
                  Try again
                </button>
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => openSignIn("login")}>
                  Back to Sign In
                </Button>
                <Link href="/">
                  <Button variant="ghost">Go to Homepage</Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Form state
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>

            <h1 className="text-3xl font-heading uppercase tracking-wider text-center mb-2">
              Forgot <span className="text-[var(--color-main-1)]">Password?</span>
            </h1>

            <p className="text-white/60 text-center mb-8">
              No worries! Enter your email and we&apos;ll send you a reset link.
            </p>

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
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded text-white placeholder-white/40 focus:outline-none focus:border-[var(--color-main-1)] transition-colors"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full"
                    />
                    Sending...
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>

            {/* Back to sign in */}
            <div className="mt-6 text-center">
              <p className="text-white/50 text-sm">
                Remember your password?{" "}
                <button
                  onClick={() => openSignIn("login")}
                  className="text-[var(--color-main-1)] hover:underline font-medium"
                >
                  Sign In
                </button>
              </p>
            </div>

            {/* Additional help */}
            <div className="mt-8 pt-6 border-t border-[var(--color-dark-3)]">
              <p className="text-xs text-white/40 text-center">
                Need help? Contact us at{" "}
                <a href="mailto:support@darkpoint.co.za" className="text-[var(--color-main-1)] hover:underline">
                  support@darkpoint.co.za
                </a>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


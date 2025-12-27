"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuthStore } from "@/stores";
import { Button } from "@/components/ui";

export function ResetPasswordClient() {
  const router = useRouter();
  const { updatePassword, isLoading, user } = useAuthStore();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if user has a recovery session
  useEffect(() => {
    // User should be authenticated via the recovery link
    if (!user) {
      // Give it a moment to initialize
      const timeout = setTimeout(() => {
        if (!user) {
          setError("Invalid or expired reset link. Please request a new password reset.");
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const result = await updatePassword(password);
    
    if (result.success) {
      setSuccess(true);
      // Redirect after a short delay
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } else {
      setError(result.error || "Failed to update password");
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[var(--color-dark-1)] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-heading text-white mb-4">Password Updated!</h1>
          
          <p className="text-[var(--muted-foreground)] mb-8">
            Your password has been successfully updated. You&apos;ll be redirected to the homepage shortly.
          </p>
          
          <Link 
            href="/"
            className="nk-btn nk-btn-default"
          >
            <span className="nk-btn-inner" />
            <span className="nk-btn-content">Go to Homepage</span>
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-dark-1)] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-main-1)]/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-2xl font-heading text-white mb-2">Set New Password</h1>
            <p className="text-[var(--muted-foreground)] text-sm">
              Enter your new password below
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-[var(--muted-foreground)] mb-2">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="nk-form-control"
                disabled={isLoading}
                required
                minLength={6}
              />
            </div>
            
            <div>
              <label className="block text-sm text-[var(--muted-foreground)] mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="nk-form-control"
                disabled={isLoading}
                required
              />
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Updating Password...
                </span>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--color-dark-3)] text-center">
            <Link
              href="/"
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--color-main-1)] transition-colors"
            >
              ← Back to Homepage
            </Link>
          </div>
        </div>
      </motion.div>
    </main>
  );
}


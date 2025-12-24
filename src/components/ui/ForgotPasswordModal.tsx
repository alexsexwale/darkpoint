"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/stores";
import { Button } from "./Button";

export function ForgotPasswordModal() {
  const { isForgotPasswordOpen, closeForgotPassword, openSignIn } = useUIStore();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isForgotPasswordOpen) {
        closeForgotPassword();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isForgotPasswordOpen, closeForgotPassword]);

  // Lock body scroll
  useEffect(() => {
    if (isForgotPasswordOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isForgotPasswordOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isForgotPasswordOpen) {
      setEmail("");
      setSubmitted(false);
    }
  }, [isForgotPasswordOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual password reset
    setSubmitted(true);
  };

  const handleBackToSignIn = () => {
    closeForgotPassword();
    openSignIn();
  };

  return (
    <AnimatePresence>
      {isForgotPasswordOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 z-50"
            onClick={closeForgotPassword}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={closeForgotPassword}
          >
            <div
              className="w-full max-w-md bg-[var(--color-dark-1)] border border-[var(--color-dark-3)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative p-6 border-b border-[var(--color-dark-3)]">
                <h2 className="text-lg font-heading text-center text-[var(--color-main-1)]">
                  Reset Password
                </h2>
                <button
                  onClick={closeForgotPassword}
                  className="absolute top-1/2 right-4 -translate-y-1/2 p-2 text-[var(--muted-foreground)] hover:text-white transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {!submitted ? (
                  <>
                    <p className="text-[var(--muted-foreground)] text-sm text-center mb-6">
                      Enter your email address and we&apos;ll send you a link to reset your password.
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Address *"
                        required
                        className="nk-form-control"
                      />
                      <Button variant="outline" className="w-full cursor-pointer">
                        Send Reset Link
                      </Button>
                    </form>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-heading text-white mb-2">Check Your Email</h3>
                    <p className="text-[var(--muted-foreground)] text-sm mb-6">
                      We&apos;ve sent a password reset link to <span className="text-white">{email}</span>
                    </p>
                    <p className="text-[var(--muted-foreground)] text-xs">
                      Didn&apos;t receive the email? Check your spam folder or{" "}
                      <button
                        onClick={() => setSubmitted(false)}
                        className="text-[var(--color-main-1)] hover:underline cursor-pointer"
                      >
                        try again
                      </button>
                    </p>
                  </div>
                )}

                {/* Back to Sign In */}
                <div className="mt-6 pt-6 border-t border-[var(--color-dark-3)] text-center">
                  <button
                    onClick={handleBackToSignIn}
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--color-main-1)] transition-colors cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


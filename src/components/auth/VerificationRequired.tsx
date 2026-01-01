"use client";

import { motion } from "framer-motion";
import { useAuthStore } from "@/stores";
import Link from "next/link";

interface VerificationRequiredProps {
  children: React.ReactNode;
  feature?: string; // e.g., "place orders", "spin the wheel"
}

export function VerificationRequired({ children, feature = "access this feature" }: VerificationRequiredProps) {
  const { 
    isAuthenticated, 
    isEmailVerified, 
    user,
    isResendingVerification,
    verificationResendCooldown,
    resendVerificationEmail 
  } = useAuthStore();

  // If not logged in, show login prompt
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--color-dark-2)] p-8 md:p-12 max-w-md w-full mx-4 text-center border border-[var(--color-dark-3)]"
        >
          <div className="text-6xl mb-6">🔐</div>
          <h2 className="font-heading text-2xl md:text-3xl mb-4">
            Login Required
          </h2>
          <p className="text-[var(--muted-foreground)] mb-8">
            Please sign in or create an account to {feature}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="nk-btn nk-btn-primary px-8 py-3"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="nk-btn nk-btn-outline px-8 py-3"
            >
              Create Account
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // If logged in but not verified
  if (!isEmailVerified) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--color-dark-2)] p-8 md:p-12 max-w-lg w-full mx-4 text-center border border-amber-500/30"
        >
          {/* Animated envelope */}
          <div className="relative mb-6">
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotateZ: [0, -5, 5, 0]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-6xl"
            >
              📧
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-xs font-bold text-black"
            >
              !
            </motion.div>
          </div>

          <h2 className="font-heading text-2xl md:text-3xl mb-4 text-amber-400">
            Email Verification Required
          </h2>
          
          <p className="text-[var(--muted-foreground)] mb-6">
            To <span className="text-white font-medium">{feature}</span>, please verify your email address first.
          </p>

          <div className="bg-[var(--color-dark-3)] p-4 rounded-lg mb-6">
            <p className="text-sm text-white/70">
              We sent a verification link to:
            </p>
            <p className="font-mono text-[var(--color-main-1)] mt-1">
              {user.email}
            </p>
          </div>

          {/* Why verify section */}
          <div className="text-left mb-6 space-y-2">
            <p className="text-sm font-medium text-white/90">Why verify?</p>
            <ul className="text-sm text-white/60 space-y-1">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Unlock 100 XP welcome bonus
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Use your free spin on the wheel
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Place orders and track history
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Earn achievements and rewards
              </li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={() => resendVerificationEmail()}
              disabled={isResendingVerification || verificationResendCooldown > 0}
              className={`
                w-full py-3 px-6 font-bold text-sm uppercase tracking-wider rounded transition-all
                ${isResendingVerification || verificationResendCooldown > 0
                  ? "bg-amber-500/30 text-amber-200 cursor-not-allowed"
                  : "bg-amber-500 text-black hover:bg-amber-400 hover:scale-[1.02]"
                }
              `}
            >
              {isResendingVerification ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </span>
              ) : verificationResendCooldown > 0 ? (
                `Wait ${verificationResendCooldown}s to resend`
              ) : (
                "📩 Resend Verification Email"
              )}
            </button>

            <p className="text-xs text-white/50">
              Check your spam folder if you don't see the email
            </p>
          </div>

          {/* Different email link */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-sm text-white/60">
              Wrong email?{" "}
              <Link href="/account/details" className="text-[var(--color-main-1)] hover:underline">
                Update your email
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // User is verified, show the content
  return <>{children}</>;
}


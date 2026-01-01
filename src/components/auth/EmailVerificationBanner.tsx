"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores";

export function EmailVerificationBanner() {
  const { 
    user, 
    isAuthenticated, 
    isEmailVerified, 
    isResendingVerification,
    verificationResendCooldown,
    resendVerificationEmail,
    checkEmailVerification
  } = useAuthStore();
  
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Check verification status periodically
  useEffect(() => {
    if (!isAuthenticated || isEmailVerified) return;

    // Check immediately
    checkEmailVerification();

    // Check every 30 seconds
    const interval = setInterval(() => {
      checkEmailVerification();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isEmailVerified, checkEmailVerification]);

  // Don't show if not logged in or already verified
  if (!isAuthenticated || !user || isEmailVerified) {
    return null;
  }

  const handleResend = async () => {
    setMessage(null);
    const result = await resendVerificationEmail();
    
    if (result.success) {
      setMessage({ 
        type: "success", 
        text: "✅ Verification email sent! Check your inbox (and spam folder)." 
      });
    } else {
      setMessage({ 
        type: "error", 
        text: result.error || "Failed to send verification email" 
      });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-gradient-to-r from-amber-600/90 via-orange-500/90 to-amber-600/90 text-white"
      >
        <div className="container mx-auto px-4">
          {/* Collapsed view */}
          {!isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full py-2 flex items-center justify-center gap-2 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <span className="animate-pulse">⚠️</span>
              <span>Email not verified - Click to verify</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}

          {/* Expanded view */}
          {isExpanded && (
            <div className="py-3 md:py-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                {/* Message */}
                <div className="flex items-center gap-3 text-center md:text-left">
                  <div className="hidden md:flex items-center justify-center w-10 h-10 bg-white/20 rounded-full">
                    <span className="text-xl animate-bounce">📧</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm md:text-base">
                      🚨 Please Verify Your Email
                    </p>
                    <p className="text-xs md:text-sm opacity-90">
                      Check <span className="font-semibold">{user.email}</span> to unlock all features!
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 md:gap-3">
                  {/* Resend button */}
                  <button
                    onClick={handleResend}
                    disabled={isResendingVerification || verificationResendCooldown > 0}
                    className={`
                      px-4 py-2 text-sm font-bold rounded transition-all
                      ${isResendingVerification || verificationResendCooldown > 0
                        ? "bg-white/20 cursor-not-allowed opacity-70"
                        : "bg-white text-orange-600 hover:bg-yellow-100 hover:scale-105 shadow-lg"
                      }
                    `}
                  >
                    {isResendingVerification ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending...
                      </span>
                    ) : verificationResendCooldown > 0 ? (
                      `Resend in ${verificationResendCooldown}s`
                    ) : (
                      "📩 Resend Email"
                    )}
                  </button>

                  {/* Collapse button (desktop) */}
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="hidden md:flex items-center justify-center w-8 h-8 rounded bg-white/10 hover:bg-white/20 transition-colors"
                    title="Minimize"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Status message */}
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-2 text-center text-sm font-medium ${
                    message.type === "success" ? "text-green-100" : "text-red-100"
                  }`}
                >
                  {message.text}
                </motion.div>
              )}

              {/* What's locked info */}
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-xs text-center opacity-80">
                  <span className="font-semibold">🔒 Locked features:</span> Orders • Spin Wheel • Rewards • XP History • Achievements
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


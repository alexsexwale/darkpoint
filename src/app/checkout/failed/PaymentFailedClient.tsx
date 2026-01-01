"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

// Common payment failure reasons
const failureReasons: Record<string, { title: string; description: string; icon: string; suggestion: string }> = {
  cancelled: {
    title: "Payment Cancelled",
    description: "You cancelled the payment before it was completed.",
    icon: "🚫",
    suggestion: "Your cart items are still saved. Return to checkout when you're ready to complete your purchase.",
  },
  failed: {
    title: "Payment Failed",
    description: "We were unable to process your payment. This could be due to insufficient funds, incorrect card details, or a temporary issue.",
    icon: "💳",
    suggestion: "Please check your payment details and try again, or use a different payment method.",
  },
  expired: {
    title: "Session Expired",
    description: "Your payment session has expired.",
    icon: "⏰",
    suggestion: "Please return to checkout to start a new payment session.",
  },
  declined: {
    title: "Card Declined",
    description: "Your card was declined by the issuing bank.",
    icon: "🚫",
    suggestion: "Please check your card details or try a different card.",
  },
};

const troubleshootingTips = [
  "Double-check your card number, expiration date, and CVV",
  "Ensure your billing address matches the address on file with your bank",
  "Try a different payment method (credit card, debit card)",
  "Contact your bank to ensure the transaction isn't being blocked",
  "Clear your browser cache and try again",
];

export function PaymentFailedClient() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "failed";
  const orderNumber = searchParams.get("order");
  
  const [showTips, setShowTips] = useState(false);

  const errorInfo = useMemo(() => {
    return failureReasons[reason] || failureReasons.failed;
  }, [reason]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-main-1)]/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 pb-32 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Error Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
            className="text-center mb-8"
          >
            <div className="w-32 h-32 mx-auto mb-6 relative">
              {/* Animated Circle */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500 to-rose-600"
              />
              {/* Shake Effect */}
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, -5, 5, -5, 5, 0] }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="absolute inset-0"
              >
                {/* X Mark */}
                <svg
                  className="absolute inset-0 w-full h-full p-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6"
                  />
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.6, duration: 0.3 }}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 6l12 12"
                  />
                </svg>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-wider mb-4">
                Payment Failed
              </h1>
              <p className="text-xl text-white/70">
                Oops! Something went wrong 😔
              </p>
            </motion.div>
          </motion.div>

          {/* Error Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-[var(--color-dark-2)] border border-red-500/20 p-8 mb-6"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="text-4xl">{errorInfo.icon}</div>
              <div>
                <h2 className="text-xl font-heading mb-2">{errorInfo.title}</h2>
                <p className="text-white/70">{errorInfo.description}</p>
              </div>
            </div>

            {orderNumber && (
              <div className="mb-4 p-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)]">
                <p className="text-sm text-white/60">
                  Order Reference: <span className="text-white font-mono">{orderNumber}</span>
                </p>
              </div>
            )}

            <div className="bg-[var(--color-dark-3)] p-4 border-l-4 border-[var(--color-main-1)]">
              <p className="text-sm">
                <span className="text-[var(--color-main-1)] font-medium">Suggestion: </span>
                {errorInfo.suggestion}
              </p>
            </div>
          </motion.div>

          {/* Your Cart is Safe Message */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-green-500/10 border border-green-500/20 p-4 mb-6 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-green-400">Don&apos;t worry, your cart is safe!</p>
              <p className="text-sm text-white/60">All your items are still in your cart, ready for checkout.</p>
            </div>
          </motion.div>

          {/* Troubleshooting Tips */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="bg-[var(--color-dark-2)] border border-[var(--color-dark-4)] mb-8"
          >
            <button
              type="button"
              onClick={() => setShowTips(!showTips)}
              className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--color-dark-3)] transition-colors"
            >
              <span className="font-heading uppercase tracking-wider flex items-center gap-2">
                <span>💡</span> Troubleshooting Tips
              </span>
              <motion.svg
                animate={{ rotate: showTips ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </motion.svg>
            </button>
            
            <motion.div
              initial={false}
              animate={{ height: showTips ? "auto" : 0, opacity: showTips ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0 space-y-3">
                {troubleshootingTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--color-dark-4)] flex items-center justify-center text-xs text-white/60 flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm text-white/70">{tip}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link href="/checkout" className="flex-1">
              <button className="nk-btn nk-btn-primary w-full">
                <span className="nk-btn-inner" />
                <span className="nk-btn-content flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </span>
              </button>
            </Link>
            <Link href="/cart" className="flex-1">
              <button className="nk-btn nk-btn-outline w-full">
                <span className="nk-btn-inner" />
                <span className="nk-btn-content flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  View Cart
                </span>
              </button>
            </Link>
          </motion.div>

          {/* Alternative Payment Methods */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="mt-8 text-center"
          >
            <p className="text-white/50 text-sm mb-4">Or try a different payment method:</p>
            <div className="flex justify-center gap-4">
              <button className="p-3 bg-[var(--color-dark-2)] hover:bg-[var(--color-dark-3)] transition-colors cursor-pointer">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 4H2v16h20V4zm-2 14H4V8h16v10zm-3-8h-2v6h2v-6zm-4 0h-2v6h2v-6zm-4 0H7v6h2v-6z" />
                </svg>
              </button>
              <button className="p-3 bg-[var(--color-dark-2)] hover:bg-[var(--color-dark-3)] transition-colors cursor-pointer">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                </svg>
              </button>
              <button className="p-3 bg-[var(--color-dark-2)] hover:bg-[var(--color-dark-3)] transition-colors cursor-pointer">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </button>
            </div>
          </motion.div>

          {/* Support Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="text-center mt-12 p-6 bg-[var(--color-dark-2)] border border-[var(--color-dark-4)]"
          >
            <p className="text-white/70 mb-4">
              Still having trouble? Our support team is here to help!
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 text-[var(--color-main-1)] hover:underline"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Support
              </Link>
              <Link
                href="/faq"
                className="inline-flex items-center justify-center gap-2 text-[var(--color-main-1)] hover:underline"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                View FAQ
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


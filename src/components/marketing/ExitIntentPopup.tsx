"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

interface ExitIntentPopupProps {
  discount?: number;
  onSubscribe?: (email: string) => void;
  className?: string;
}

export function ExitIntentPopup({
  discount = 10,
  onSubscribe,
  className,
}: ExitIntentPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Check if already shown in this session
  useEffect(() => {
    const shown = sessionStorage.getItem("exitIntentShown");
    if (shown) {
      setHasShown(true);
    }
  }, []);

  // Exit intent detection
  const handleMouseLeave = useCallback(
    (e: MouseEvent) => {
      // Only trigger when mouse leaves from the top of the page
      if (e.clientY < 10 && !hasShown && !isVisible) {
        setIsVisible(true);
        setHasShown(true);
        sessionStorage.setItem("exitIntentShown", "true");
      }
    },
    [hasShown, isVisible]
  );

  useEffect(() => {
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [handleMouseLeave]);

  // Lock body scroll when visible
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isVisible]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      onSubscribe?.(email);
      setSubscribed(true);
      setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[100]"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className={cn(
                "relative w-full max-w-lg bg-[var(--color-dark-1)] border-2 border-[var(--color-main-1)] pointer-events-auto overflow-hidden",
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 p-2 text-white/40 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-main-1)]/20 blur-2xl" />

              {/* Content */}
              <div className="relative p-8 md:p-12 text-center">
                {!subscribed ? (
                  <>
                    {/* Icon */}
                    <motion.div
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-6xl mb-4"
                    >
                      👋
                    </motion.div>

                    {/* Title */}
                    <h2 className="text-2xl md:text-3xl font-heading uppercase tracking-wider mb-2">
                      Wait! Don&apos;t Go Yet!
                    </h2>

                    {/* Discount offer */}
                    <div className="my-6">
                      <span className="inline-block px-6 py-3 bg-[var(--color-main-1)]/20 border border-[var(--color-main-1)]">
                        <span className="text-4xl font-heading text-[var(--color-main-1)]">
                          {discount}% OFF
                        </span>
                      </span>
                    </div>

                    <p className="text-white/70 mb-6 max-w-sm mx-auto">
                      Subscribe to our newsletter and get {discount}% off your first order,
                      plus exclusive deals and early access to sales!
                    </p>

                    {/* Email form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-white/40 focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
                      />
                      <Button variant="primary" className="w-full" type="submit">
                        Claim My {discount}% Off
                      </Button>
                    </form>

                    {/* No thanks */}
                    <button
                      onClick={handleClose}
                      className="mt-4 text-sm text-white/40 hover:text-white/60 transition-colors cursor-pointer"
                    >
                      No thanks, I&apos;ll pay full price
                    </button>
                  </>
                ) : (
                  <>
                    {/* Success state */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-6xl mb-4"
                    >
                      🎉
                    </motion.div>

                    <h2 className="text-2xl font-heading uppercase tracking-wider mb-2 text-green-500">
                      You&apos;re In!
                    </h2>

                    <p className="text-white/70">
                      Check your email for your {discount}% discount code!
                    </p>

                    <div className="mt-6 px-4 py-2 bg-green-500/20 border border-green-500/50 inline-block">
                      <span className="text-green-500 font-heading">
                        WELCOME{discount}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Bottom decoration */}
              <div className="h-1 bg-gradient-to-r from-transparent via-[var(--color-main-1)] to-transparent" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


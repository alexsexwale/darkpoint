"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const [emailInput, setEmailInput] = useState(email);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Auto-decode email from URL
  useEffect(() => {
    if (email) {
      setEmailInput(decodeURIComponent(email));
    }
  }, [email]);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailInput) {
      setStatus("error");
      setMessage("Please enter your email address");
      return;
    }

    setIsProcessing(true);
    setStatus("idle");

    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "You have been successfully unsubscribed.");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to unsubscribe. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("An error occurred. Please try again later.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-main-1)]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[var(--color-main-1)]/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 md:p-12">
          {status === "success" ? (
            // Success State
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="text-6xl mb-6"
              >
                👋
              </motion.div>
              
              <h1 className="text-2xl md:text-3xl font-heading uppercase tracking-wider mb-4">
                Goodbye for Now
              </h1>
              
              <p className="text-white/70 mb-8">
                {message}
              </p>

              <div className="space-y-4">
                <p className="text-sm text-white/50">
                  Changed your mind? You can always resubscribe!
                </p>
                
                <Link href="/">
                  <Button variant="outline" className="w-full">
                    Return Home
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            // Unsubscribe Form
            <>
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">📧</div>
                <h1 className="text-2xl md:text-3xl font-heading uppercase tracking-wider mb-2">
                  Unsubscribe
                </h1>
                <p className="text-white/60">
                  We&apos;re sorry to see you go
                </p>
              </div>

              <form onSubmit={handleUnsubscribe} className="space-y-6">
                {status === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                  >
                    {message}
                  </motion.div>
                )}

                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-white/40 focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "Unsubscribe"
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-[var(--color-dark-4)] text-center">
                <p className="text-sm text-white/50 mb-4">
                  You&apos;ll stop receiving promotional emails, but we&apos;ll still send important order updates.
                </p>
                
                <Link href="/" className="text-[var(--color-main-1)] hover:underline text-sm">
                  ← Back to DarkPoint
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Bottom decoration */}
        <div className="h-1 bg-gradient-to-r from-transparent via-[var(--color-main-1)] to-transparent" />
      </motion.div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-white/50">Loading...</div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}


"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/stores";
import { Button } from "./Button";

export function SignInModal() {
  const { isSignInOpen, closeSignIn, openForgotPassword } = useUIStore();
  const [mode, setMode] = useState<"login" | "register">("login");

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSignInOpen) {
        closeSignIn();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isSignInOpen, closeSignIn]);

  // Lock body scroll
  useEffect(() => {
    if (isSignInOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSignInOpen]);

  return (
    <AnimatePresence>
      {isSignInOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 z-50"
            onClick={closeSignIn}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={closeSignIn}
          >
            <div
              className="w-full max-w-md bg-[var(--color-dark-1)] border border-[var(--color-dark-3)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative p-6 border-b border-[var(--color-dark-3)]">
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setMode("login")}
                    className={`text-lg font-heading transition-colors cursor-pointer ${
                      mode === "login"
                        ? "text-[var(--color-main-1)]"
                        : "text-[var(--muted-foreground)] hover:text-white"
                    }`}
                  >
                    Sign In
                  </button>
                  <span className="text-[var(--muted-foreground)]">/</span>
                  <button
                    onClick={() => setMode("register")}
                    className={`text-lg font-heading transition-colors cursor-pointer ${
                      mode === "register"
                        ? "text-[var(--color-main-1)]"
                        : "text-[var(--muted-foreground)] hover:text-white"
                    }`}
                  >
                    Register
                  </button>
                </div>
                <button
                  onClick={closeSignIn}
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
                {mode === "login" ? (
                  <form className="space-y-6">
                    <input
                      type="email"
                      placeholder="Email Address *"
                      className="nk-form-control"
                    />
                    <input
                      type="password"
                      placeholder="Password *"
                      className="nk-form-control"
                    />
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 accent-[var(--color-main-1)] cursor-pointer" />
                        <span>Remember me</span>
                      </label>
                      <button 
                        type="button" 
                        onClick={openForgotPassword}
                        className="text-[var(--muted-foreground)] hover:text-[var(--color-main-1)] transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Button variant="outline" className="w-full">
                      Sign In
                    </Button>
                  </form>
                ) : (
                  <form className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="First Name *"
                        className="nk-form-control"
                      />
                      <input
                        type="text"
                        placeholder="Last Name *"
                        className="nk-form-control"
                      />
                    </div>
                    <input
                      type="email"
                      placeholder="Email Address *"
                      className="nk-form-control"
                    />
                    <input
                      type="password"
                      placeholder="Password *"
                      className="nk-form-control"
                    />
                    <input
                      type="password"
                      placeholder="Confirm Password *"
                      className="nk-form-control"
                    />
                    <label className="flex items-start gap-2 text-sm cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 mt-1 accent-[var(--color-main-1)] cursor-pointer" />
                      <span className="text-[var(--muted-foreground)]">
                        I agree to the{" "}
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--color-main-1)] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--color-main-1)] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Privacy Policy
                        </a>
                      </span>
                    </label>
                    <Button variant="outline" className="w-full">
                      Create Account
                    </Button>
                  </form>
                )}

                {/* Social Login */}
                <div className="mt-6 pt-6 border-t border-[var(--color-dark-3)]">
                  <p className="text-sm text-[var(--muted-foreground)] text-center mb-4">
                    Or continue with
                  </p>
                  <div className="flex gap-4">
                    <button className="nk-btn nk-btn-default nk-btn-sm flex-1 flex items-center justify-center gap-2">
                      <span className="nk-btn-inner" />
                      <span className="nk-btn-content flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                        </svg>
                        Google
                      </span>
                    </button>
                    <button className="nk-btn nk-btn-default nk-btn-sm flex-1 flex items-center justify-center gap-2">
                      <span className="nk-btn-inner" />
                      <span className="nk-btn-content flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                        </svg>
                        GitHub
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

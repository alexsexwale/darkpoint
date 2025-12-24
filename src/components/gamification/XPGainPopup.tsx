"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGamificationStore } from "@/stores";

export function XPGainPopup() {
  const { notifications, removeNotification } = useGamificationStore();

  // Filter only XP gain notifications
  const xpNotifications = notifications.filter((n) => n.type === "xp_gain");

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {xpNotifications.map((notification) => (
          <motion.div
            key={notification.id}
            layout
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="pointer-events-auto"
          >
            <div className="relative bg-[var(--color-dark-2)] border border-[var(--color-main-1)]/50 px-4 py-2 shadow-lg">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-[var(--color-main-1)]/10 blur-xl" />

              {/* Content */}
              <div className="relative flex items-center gap-3">
                {/* XP Icon */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-main-1)]/20">
                  <motion.span
                    initial={{ scale: 1.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                    className="text-2xl"
                  >
                    ⚡
                  </motion.span>
                </div>

                {/* Text */}
                <div>
                  <motion.p
                    initial={{ y: -10 }}
                    animate={{ y: 0 }}
                    className="font-heading text-lg text-[var(--color-main-1)]"
                  >
                    {notification.title}
                  </motion.p>
                  <p className="text-xs text-white/60">{notification.message}</p>
                </div>

                {/* Close button */}
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="ml-2 p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Progress bar animation */}
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
                className="absolute bottom-0 left-0 h-0.5 bg-[var(--color-main-1)]"
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}


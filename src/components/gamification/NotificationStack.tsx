"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGamificationStore } from "@/stores";
import { cn } from "@/lib/utils";

interface NotificationStackProps {
  className?: string;
  position?: "top-right" | "bottom-right" | "top-left" | "bottom-left";
}

export function NotificationStack({
  className,
  position = "bottom-right",
}: NotificationStackProps) {
  const { notifications, removeNotification } = useGamificationStore();

  // Filter out XP gain notifications (handled by XPGainPopup)
  const generalNotifications = notifications.filter(
    (n) => n.type !== "xp_gain"
  );

  const positionClasses = {
    "top-right": "top-24 right-6",
    "bottom-right": "bottom-6 right-6",
    "top-left": "top-24 left-6",
    "bottom-left": "bottom-6 left-6",
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case "level_up":
        return {
          icon: "🎉",
          border: "border-yellow-500",
          bg: "bg-yellow-500/10",
          iconBg: "bg-yellow-500/20",
        };
      case "achievement":
        return {
          icon: "🏆",
          border: "border-purple-500",
          bg: "bg-purple-500/10",
          iconBg: "bg-purple-500/20",
        };
      case "streak":
        return {
          icon: "🔥",
          border: "border-orange-500",
          bg: "bg-orange-500/10",
          iconBg: "bg-orange-500/20",
        };
      case "reward":
        return {
          icon: "🎁",
          border: "border-green-500",
          bg: "bg-green-500/10",
          iconBg: "bg-green-500/20",
        };
      case "spin_result":
        return {
          icon: "🎡",
          border: "border-pink-500",
          bg: "bg-pink-500/10",
          iconBg: "bg-pink-500/20",
        };
      case "error":
        return {
          icon: "❌",
          border: "border-red-500",
          bg: "bg-red-500/10",
          iconBg: "bg-red-500/20",
        };
      case "info":
        return {
          icon: "ℹ️",
          border: "border-blue-500",
          bg: "bg-blue-500/10",
          iconBg: "bg-blue-500/20",
        };
      default:
        return {
          icon: "💬",
          border: "border-[var(--color-main-1)]",
          bg: "bg-[var(--color-main-1)]/10",
          iconBg: "bg-[var(--color-main-1)]/20",
        };
    }
  };

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col gap-3 pointer-events-none max-w-sm",
        positionClasses[position],
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {generalNotifications.map((notification) => {
          const style = getNotificationStyle(notification.type);

          return (
            <motion.div
              key={notification.id}
              layout
              initial={{ opacity: 0, x: position.includes("right") ? 100 : -100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: position.includes("right") ? 100 : -100, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="pointer-events-auto"
            >
              <div
                className={cn(
                  "relative overflow-hidden bg-[var(--color-dark-1)] border shadow-lg",
                  style.border
                )}
              >
                {/* Background glow */}
                <div className={cn("absolute inset-0 opacity-50", style.bg)} />

                {/* Content */}
                <div className="relative flex items-start gap-3 p-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-xl",
                      style.iconBg
                    )}
                  >
                    {notification.icon || style.icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm text-white">
                      {notification.title}
                    </p>
                    <p className="text-xs text-white/60 mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="flex-shrink-0 p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Auto-dismiss progress bar */}
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 5, ease: "linear" }}
                  className={cn("absolute bottom-0 left-0 h-0.5", style.border.replace("border-", "bg-"))}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}


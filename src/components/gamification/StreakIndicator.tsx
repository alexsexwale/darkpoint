"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGamificationStore } from "@/stores";

interface StreakIndicatorProps {
  className?: string;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StreakIndicator({
  className,
  showTooltip = true,
  size = "md",
}: StreakIndicatorProps) {
  const { userProfile } = useGamificationStore();

  if (!userProfile || userProfile.current_streak === 0) return null;

  const streak = userProfile.current_streak;

  const sizeClasses = {
    sm: "text-base gap-0.5",
    md: "text-lg gap-1",
    lg: "text-2xl gap-1.5",
  };

  const iconSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  // Determine fire color based on streak length
  const getFireIntensity = () => {
    if (streak >= 30) return "text-red-500";
    if (streak >= 14) return "text-orange-500";
    if (streak >= 7) return "text-yellow-500";
    return "text-[var(--color-main-1)]";
  };

  return (
    <div className={cn("relative group inline-flex items-center", sizeClasses[size], className)}>
      {/* Fire icon with animation */}
      <motion.span
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [-2, 2, -2],
        }}
        transition={{ 
          duration: 0.5, 
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className={cn(iconSizes[size], getFireIntensity())}
      >
        🔥
      </motion.span>

      {/* Streak count */}
      <span className="font-heading font-bold text-white">
        {streak}
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--color-dark-1)] border border-[var(--color-dark-3)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          <p className="text-sm text-white">{streak} day login streak!</p>
          <p className="text-xs text-white/60">
            Best: {userProfile.longest_streak} days
          </p>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--color-dark-3)]" />
        </div>
      )}
    </div>
  );
}


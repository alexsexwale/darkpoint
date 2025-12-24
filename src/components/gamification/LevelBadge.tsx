"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGamificationStore } from "@/stores";
import { getLevelTier } from "@/types/gamification";

interface LevelBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showTitle?: boolean;
  animate?: boolean;
}

export function LevelBadge({
  className,
  size = "md",
  showTitle = true,
  animate = true,
}: LevelBadgeProps) {
  const { userProfile } = useGamificationStore();

  if (!userProfile) return null;

  const tier = getLevelTier(userProfile.current_level);

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
  };

  const badgeContent = (
    <div
      className={cn(
        "relative flex items-center justify-center font-heading font-bold rounded-lg",
        sizeClasses[size],
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${tier.color}33, ${tier.color}11)`,
        border: `2px solid ${tier.color}`,
        boxShadow: `0 0 20px ${tier.color}40, inset 0 0 20px ${tier.color}20`,
      }}
    >
      {/* Level number */}
      <span style={{ color: tier.color }}>{userProfile.current_level}</span>

      {/* Corner decorations */}
      <div
        className="absolute -top-0.5 -left-0.5 w-2 h-2 border-l-2 border-t-2"
        style={{ borderColor: tier.color }}
      />
      <div
        className="absolute -top-0.5 -right-0.5 w-2 h-2 border-r-2 border-t-2"
        style={{ borderColor: tier.color }}
      />
      <div
        className="absolute -bottom-0.5 -left-0.5 w-2 h-2 border-l-2 border-b-2"
        style={{ borderColor: tier.color }}
      />
      <div
        className="absolute -bottom-0.5 -right-0.5 w-2 h-2 border-r-2 border-b-2"
        style={{ borderColor: tier.color }}
      />
    </div>
  );

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {animate ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {badgeContent}
        </motion.div>
      ) : (
        badgeContent
      )}

      {showTitle && (
        <div className="flex flex-col">
          <span
            className="font-heading text-sm uppercase tracking-wider"
            style={{ color: tier.color }}
          >
            {tier.title}
          </span>
          <span className="text-xs text-white/40">
            Level {userProfile.current_level}
          </span>
        </div>
      )}
    </div>
  );
}


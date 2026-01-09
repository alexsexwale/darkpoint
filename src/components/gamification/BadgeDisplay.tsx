"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { BADGE_TIER_INFO, type VIPTier } from "@/types/vip";

export type BadgeType = "badge_fire" | "badge_crown" | "frame_gold";
export type BadgeSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface BadgeConfig {
  id: BadgeType;
  name: string;
  icon: string;
  description: string;
  tierDescription: string;
  rarity: "rare" | "epic" | "legendary";
  vipTier: VIPTier;
  glowColor: string;
  particleColors: string[];
  borderGradient: string;
  secretHint?: string;
  keyBenefits: string[];
}

export const BADGE_CONFIGS: Record<BadgeType, BadgeConfig> = {
  badge_fire: {
    id: "badge_fire",
    name: "Fire Badge",
    icon: "🔥",
    description: "Blazing hot profile badge - Unlocks VIP features!",
    tierDescription: "Bronze VIP - Entry Level",
    rarity: "rare",
    vipTier: "bronze",
    glowColor: "rgba(255, 100, 0, 0.6)",
    particleColors: ["#ff6600", "#ff3300", "#ffaa00", "#ff0000"],
    borderGradient: "linear-gradient(135deg, #ff6600, #ff3300, #ffaa00)",
    secretHint: "The flames whisper of hidden paths...",
    keyBenefits: [
      "Up to 15% discount coupons",
      "2x XP boost available",
      "Standard VIP mystery boxes",
      "Secret areas unlocked",
    ],
  },
  badge_crown: {
    id: "badge_crown",
    name: "Crown Badge",
    icon: "👑",
    description: "Royal profile badge - Unlocks Gold VIP features!",
    tierDescription: "Gold VIP - Premium Tier",
    rarity: "epic",
    vipTier: "gold",
    glowColor: "rgba(255, 215, 0, 0.6)",
    particleColors: ["#ffd700", "#fff700", "#ffb700", "#ffffff"],
    borderGradient: "linear-gradient(135deg, #ffd700, #fff700, #ffc700)",
    secretHint: "Royalty has its privileges... seek the hidden court.",
    keyBenefits: [
      "Up to 25% discount coupons",
      "3x XP boost available",
      "Premium VIP mystery boxes",
      "24-hour early sale access",
      "Priority support",
    ],
  },
  frame_gold: {
    id: "frame_gold",
    name: "Gold Frame",
    icon: "✨",
    description: "Prestigious gold avatar frame - Unlocks Platinum VIP!",
    tierDescription: "Platinum VIP - Ultimate Tier",
    rarity: "legendary",
    vipTier: "platinum",
    glowColor: "rgba(218, 165, 32, 0.7)",
    particleColors: ["#daa520", "#ffd700", "#b8860b", "#ffffff"],
    borderGradient: "linear-gradient(135deg, #daa520, #ffd700, #b8860b, #ffd700)",
    secretHint: "The golden ones see what others cannot...",
    keyBenefits: [
      "Up to 35% discount coupons",
      "4x XP boost available",
      "Elite VIP mystery boxes",
      "48-hour early sale access",
      "Monthly 100 XP + free spin",
      "Diamond Frame available",
    ],
  },
};

const RARITY_STYLES = {
  rare: {
    bg: "from-orange-500/20 to-red-500/20",
    border: "border-orange-500/50",
    text: "text-orange-400",
    label: "RARE",
  },
  epic: {
    bg: "from-yellow-500/20 to-amber-500/20",
    border: "border-yellow-500/50",
    text: "text-yellow-400",
    label: "EPIC",
  },
  legendary: {
    bg: "from-amber-400/20 to-yellow-600/20",
    border: "border-amber-400/50",
    text: "text-amber-400",
    label: "LEGENDARY",
  },
};

const SIZE_CLASSES: Record<BadgeSize, { container: string; icon: string; particles: number }> = {
  xs: { container: "w-6 h-6", icon: "text-sm", particles: 3 },
  sm: { container: "w-8 h-8", icon: "text-base", particles: 5 },
  md: { container: "w-12 h-12", icon: "text-xl", particles: 8 },
  lg: { container: "w-16 h-16", icon: "text-3xl", particles: 12 },
  xl: { container: "w-24 h-24", icon: "text-5xl", particles: 20 },
};

interface BadgeDisplayProps {
  badge: BadgeType;
  size?: BadgeSize;
  showTooltip?: boolean;
  showParticles?: boolean;
  showGlow?: boolean;
  isOwned?: boolean;
  onClick?: () => void;
  className?: string;
  showSecretHint?: boolean;
}

export function BadgeDisplay({
  badge,
  size = "md",
  showTooltip = true,
  showParticles = true,
  showGlow = true,
  isOwned = true,
  onClick,
  className,
  showSecretHint = false,
}: BadgeDisplayProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const config = BADGE_CONFIGS[badge];
  const sizeConfig = SIZE_CLASSES[size];
  const rarityStyle = RARITY_STYLES[config.rarity];

  // Generate particles on hover
  useEffect(() => {
    if (!isHovered || !showParticles || !isOwned) return;

    const interval = setInterval(() => {
      setParticles((prev) => {
        const newParticle = {
          id: Date.now() + Math.random(),
          x: Math.random() * 100,
          y: Math.random() * 100,
          color: config.particleColors[Math.floor(Math.random() * config.particleColors.length)],
        };
        return [...prev.slice(-sizeConfig.particles), newParticle];
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isHovered, showParticles, isOwned, config.particleColors, sizeConfig.particles]);

  // Clear particles when not hovered
  useEffect(() => {
    if (!isHovered) {
      const timeout = setTimeout(() => setParticles([]), 500);
      return () => clearTimeout(timeout);
    }
  }, [isHovered]);

  return (
    <div className={cn("relative inline-block", className)}>
      <motion.div
        ref={containerRef}
        className={cn(
          "relative flex items-center justify-center rounded-full cursor-pointer overflow-visible",
          sizeConfig.container,
          isOwned ? "opacity-100" : "opacity-40 grayscale"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        whileHover={isOwned ? { scale: 1.1 } : {}}
        whileTap={isOwned ? { scale: 0.95 } : {}}
      >
        {/* Glow Effect */}
        {showGlow && isOwned && (
          <motion.div
            className="absolute inset-0 rounded-full blur-md"
            style={{ backgroundColor: config.glowColor }}
            animate={{
              opacity: isHovered ? [0.6, 1, 0.6] : [0.3, 0.5, 0.3],
              scale: isHovered ? [1, 1.2, 1] : [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Border Gradient */}
        <div
          className="absolute inset-0 rounded-full p-[2px]"
          style={{ background: isOwned ? config.borderGradient : "linear-gradient(135deg, #666, #444)" }}
        >
          <div className="w-full h-full rounded-full bg-[var(--color-dark-2)]" />
        </div>

        {/* Badge Icon */}
        <motion.span
          className={cn(sizeConfig.icon, "relative z-10")}
          animate={
            isOwned && isHovered
              ? {
                  rotate: badge === "badge_fire" ? [0, -5, 5, -5, 0] : 0,
                  scale: [1, 1.1, 1],
                }
              : {}
          }
          transition={{ duration: 0.5, repeat: isHovered ? Infinity : 0 }}
        >
          {config.icon}
        </motion.span>

        {/* Floating Particles */}
        <AnimatePresence>
          {showParticles &&
            isOwned &&
            particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute w-1 h-1 rounded-full pointer-events-none"
                style={{
                  backgroundColor: particle.color,
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  boxShadow: `0 0 4px ${particle.color}`,
                }}
                initial={{ opacity: 0, scale: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], y: -30 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            ))}
        </AnimatePresence>

        {/* Sparkle Effect for Crown/Gold */}
        {isOwned && (badge === "badge_crown" || badge === "frame_gold") && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, transparent 20%)`,
            }}
            animate={{
              opacity: [0.5, 1, 0.5],
              rotate: [0, 360],
            }}
            transition={{
              opacity: { duration: 2, repeat: Infinity },
              rotate: { duration: 8, repeat: Infinity, ease: "linear" },
            }}
          />
        )}
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className={cn(
              "absolute z-50 left-1/2 -translate-x-1/2 mt-2 px-3 py-2 rounded-lg",
              "bg-[var(--color-dark-1)] border shadow-xl min-w-[180px]",
              rarityStyle.border
            )}
          >
            {/* Arrow */}
            <div
              className={cn(
                "absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0",
                "border-l-8 border-r-8 border-b-8 border-transparent",
                "border-b-[var(--color-dark-1)]"
              )}
            />

            {/* Tier Label */}
            <div className={cn("text-[10px] font-bold tracking-widest mb-1", rarityStyle.text)}>
              {config.tierDescription}
            </div>

            {/* Badge Name */}
            <div className="font-heading text-white text-sm">{config.name}</div>

            {/* Description */}
            <div className="text-xs text-white/60 mt-1">{config.description}</div>

            {/* Key Benefits Preview */}
            {!isOwned && config.keyBenefits.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <div className="text-[10px] text-white/40 mb-1">Key Benefits:</div>
                <ul className="space-y-0.5">
                  {config.keyBenefits.slice(0, 3).map((benefit, idx) => (
                    <li key={idx} className="text-[10px] text-white/60 flex items-start gap-1">
                      <span className="text-green-400">✓</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                  {config.keyBenefits.length > 3 && (
                    <li className="text-[10px] text-white/40">+{config.keyBenefits.length - 3} more...</li>
                  )}
                </ul>
              </div>
            )}

            {/* Secret Hint - Only for owners */}
            {showSecretHint && isOwned && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-2 pt-2 border-t border-white/10"
              >
                <div className="text-[10px] text-amber-400/80 italic">
                  {config.secretHint}
                </div>
              </motion.div>
            )}

            {/* VIP Indicator */}
            {isOwned && (
              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/10">
                <span className="text-[10px] text-green-400">✓ {config.tierDescription}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Badge Collection Display Component
interface BadgeCollectionProps {
  badges: BadgeType[];
  size?: BadgeSize;
  className?: string;
}

export function BadgeCollection({ badges, size = "md", className }: BadgeCollectionProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {badges.map((badge, index) => (
        <motion.div
          key={badge}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          <BadgeDisplay badge={badge} size={size} showSecretHint />
        </motion.div>
      ))}
    </div>
  );
}

// Badge Showcase - Large display for profile pages
interface BadgeShowcaseProps {
  badge: BadgeType;
  acquiredAt?: string;
  className?: string;
}

export function BadgeShowcase({ badge, acquiredAt, className }: BadgeShowcaseProps) {
  const config = BADGE_CONFIGS[badge];
  const rarityStyle = RARITY_STYLES[config.rarity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative p-6 rounded-xl overflow-hidden",
        "bg-gradient-to-br",
        rarityStyle.bg,
        "border",
        rarityStyle.border,
        className
      )}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${config.glowColor} 0%, transparent 50%)`,
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </div>

      <div className="relative flex items-center gap-6">
        {/* Large Badge Display */}
        <BadgeDisplay badge={badge} size="xl" showTooltip={false} />

        {/* Badge Info */}
        <div className="flex-1">
          <div className={cn("text-xs font-bold tracking-widest mb-1", rarityStyle.text)}>
            {rarityStyle.label}
          </div>
          <h3 className="font-heading text-2xl text-white mb-1">{config.name}</h3>
          <p className="text-sm text-white/60 mb-3">{config.description}</p>

          {acquiredAt && (
            <div className="text-xs text-white/40">
              Acquired {new Date(acquiredAt).toLocaleDateString()}
            </div>
          )}

          {/* Secret VIP Section */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ delay: 2 }}
            className="mt-4 p-3 rounded-lg bg-black/30 border border-white/10"
          >
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <span>🔮</span>
              <span className="italic">{config.secretHint}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// Mini Badge - For comments/reviews
interface MiniBadgeProps {
  badge: BadgeType;
  className?: string;
}

export function MiniBadge({ badge, className }: MiniBadgeProps) {
  const config = BADGE_CONFIGS[badge];
  
  return (
    <motion.span
      className={cn(
        "inline-flex items-center justify-center w-5 h-5 rounded-full text-xs",
        "ring-1 ring-offset-1 ring-offset-transparent",
        className
      )}
      style={{
        background: config.borderGradient,
        boxShadow: `0 0 8px ${config.glowColor}`,
      }}
      whileHover={{ scale: 1.2 }}
      title={`${config.name} - VIP Member`}
    >
      {config.icon}
    </motion.span>
  );
}


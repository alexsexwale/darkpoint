"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { useGamificationStore } from "@/stores";
import type { SpinPrize } from "@/types/gamification";

interface SpinWheelProps {
  className?: string;
  size?: number;
  onSpinComplete?: (prize: SpinPrize) => void;
}

export function SpinWheel({ className, size = 320, onSpinComplete }: SpinWheelProps) {
  const wheelRef = useRef<SVGGElement>(null);
  const { spinPrizes, isSpinning, availableSpins, setSpinning, spin, setLastSpinResult } =
    useGamificationStore();
  const [hasSpun, setHasSpun] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<SpinPrize | null>(null);

  // Reset on mount
  useEffect(() => {
    setHasSpun(false);
    setSelectedPrize(null);
  }, []);

  const handleSpin = () => {
    if (isSpinning || availableSpins <= 0 || spinPrizes.length === 0) return;

    setSpinning(true);
    setHasSpun(true);

    // Get the prize before spinning (for landing calculation)
    const prize = spin();
    if (!prize) {
      setSpinning(false);
      return;
    }

    // Find prize index
    const prizeIndex = spinPrizes.findIndex((p) => p.id === prize.id);
    const segmentAngle = 360 / spinPrizes.length;
    
    // Calculate the angle to land on the prize
    // Wheel spins clockwise, pointer is at top (0 degrees)
    // We need the segment to end up at the top
    const segmentCenter = prizeIndex * segmentAngle + segmentAngle / 2;
    const targetAngle = 360 - segmentCenter; // Inverted because we rotate the wheel

    // Add multiple rotations for effect
    const totalRotation = 360 * 5 + targetAngle;

    // Animate with GSAP
    if (wheelRef.current) {
      gsap.to(wheelRef.current, {
        rotation: totalRotation,
        duration: 5,
        ease: "power4.out",
        transformOrigin: "center center",
        onComplete: () => {
          setSpinning(false);
          setSelectedPrize(prize);
          setLastSpinResult(prize);
          onSpinComplete?.(prize);
        },
      });
    }
  };

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 10;

  // Calculate segment paths
  const segmentAngle = spinPrizes.length > 0 ? 360 / spinPrizes.length : 360;
  const segmentAngleRad = (segmentAngle * Math.PI) / 180;

  const getSegmentPath = (index: number) => {
    const startAngle = index * segmentAngleRad - Math.PI / 2;
    const endAngle = startAngle + segmentAngleRad;

    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);

    const largeArcFlag = segmentAngle > 180 ? 1 : 0;

    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const getTextPosition = (index: number) => {
    const angle = index * segmentAngleRad + segmentAngleRad / 2 - Math.PI / 2;
    const textRadius = radius * 0.65;
    return {
      x: centerX + textRadius * Math.cos(angle),
      y: centerY + textRadius * Math.sin(angle),
      rotation: (index * segmentAngle + segmentAngle / 2),
    };
  };

  return (
    <div className={cn("relative inline-block", className)}>
      {/* Wheel container */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full blur-xl"
          style={{
            background: `conic-gradient(from 0deg, ${spinPrizes.map((p) => p.color).join(", ")})`,
            opacity: 0.3,
          }}
        />

        {/* SVG Wheel */}
        <svg width={size} height={size} className="relative">
          <defs>
            {/* Drop shadow for wheel */}
            <filter id="wheelShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Wheel group for rotation */}
          <g ref={wheelRef} filter="url(#wheelShadow)">
            {/* Outer ring */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius + 5}
              fill="none"
              stroke="var(--color-dark-4)"
              strokeWidth="8"
            />

            {/* Segments */}
            {spinPrizes.map((prize, index) => {
              const textPos = getTextPosition(index);
              return (
                <g key={prize.id}>
                  <path
                    d={getSegmentPath(index)}
                    fill={prize.color}
                    stroke="var(--color-dark-1)"
                    strokeWidth="2"
                  />
                  {/* Prize name */}
                  <text
                    x={textPos.x}
                    y={textPos.y}
                    fill="white"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textPos.rotation}, ${textPos.x}, ${textPos.y})`}
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                  >
                    {prize.name}
                  </text>
                </g>
              );
            })}

            {/* Center circle */}
            <circle
              cx={centerX}
              cy={centerY}
              r={30}
              fill="var(--color-dark-1)"
              stroke="var(--color-main-1)"
              strokeWidth="4"
            />

            {/* Center decoration */}
            <text
              x={centerX}
              y={centerY}
              fill="var(--color-main-1)"
              fontSize="24"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              🎰
            </text>
          </g>
        </svg>

        {/* Pointer (stationary) */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10"
          style={{
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
          }}
        >
          <svg width="30" height="40" viewBox="0 0 30 40">
            <path
              d="M15 40 L0 10 L15 0 L30 10 Z"
              fill="var(--color-main-1)"
              stroke="var(--color-dark-1)"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Spin button overlay */}
        {!isSpinning && !selectedPrize && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSpin}
            disabled={availableSpins <= 0}
            className={cn(
              "absolute inset-0 flex items-center justify-center cursor-pointer",
              "bg-black/40 opacity-0 hover:opacity-100 transition-opacity",
              availableSpins <= 0 && "cursor-not-allowed"
            )}
          >
            <div className="bg-[var(--color-main-1)] px-6 py-3 font-heading uppercase tracking-wider">
              {availableSpins > 0 ? "SPIN!" : "No Spins"}
            </div>
          </motion.button>
        )}
      </div>

      {/* Available spins indicator */}
      <div className="text-center mt-4">
        <p className="text-sm text-white/60">
          Available Spins:{" "}
          <span className="text-[var(--color-main-1)] font-bold">{availableSpins}</span>
        </p>
      </div>
    </div>
  );
}


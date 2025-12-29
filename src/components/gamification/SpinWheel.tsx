"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import Confetti from "react-confetti";
import { cn } from "@/lib/utils";
import { useGamificationStore } from "@/stores";
import { Button } from "@/components/ui";
import type { SpinPrize } from "@/types/gamification";

interface SpinWheelProps {
  className?: string;
  size?: number;
  onSpinComplete?: (prize: SpinPrize) => void;
}

// Hook to get responsive size
function useResponsiveSize(defaultSize: number) {
  const [size, setSize] = useState(defaultSize);

  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth < 640) {
        setSize(280); // Mobile
      } else if (window.innerWidth < 768) {
        setSize(320); // Small tablet
      } else {
        setSize(defaultSize); // Desktop
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [defaultSize]);

  return size;
}

export function SpinWheel({ className, size = 320, onSpinComplete }: SpinWheelProps) {
  const wheelRef = useRef<SVGGElement>(null);
  const { spinPrizes, isSpinning, userProfile, setSpinning, spinWheel, setLastSpinResult } =
    useGamificationStore();
  const [hasSpun, setHasSpun] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<SpinPrize | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const responsiveSize = useResponsiveSize(size);
  
  const availableSpins = userProfile?.available_spins || 0;

  // Track window size for confetti
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Reset on mount
  useEffect(() => {
    setHasSpun(false);
    setSelectedPrize(null);
    setShowResultModal(false);
  }, []);

  const handleSpin = async () => {
    if (isSpinning || availableSpins <= 0 || spinPrizes.length === 0) return;

    setSpinning(true);
    setHasSpun(true);
    setShowResultModal(false);

    // Call the database to spin and get result
    const prize = await spinWheel();
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
          setShowResultModal(true);
          
          onSpinComplete?.(prize);
        },
      });
    }
  };

  const closeResultModal = () => {
    setShowResultModal(false);
  };

  const centerX = responsiveSize / 2;
  const centerY = responsiveSize / 2;
  const radius = responsiveSize / 2 - 10;

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
    <div className={cn("relative inline-block w-full max-w-full", className)}>
      {/* Wheel container */}
      <div className="relative mx-auto" style={{ width: responsiveSize, height: responsiveSize, maxWidth: "100%" }}>
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full blur-xl"
          style={{
            background: `conic-gradient(from 0deg, ${spinPrizes.map((p) => p.color).join(", ")})`,
            opacity: 0.3,
          }}
        />

        {/* SVG Wheel */}
        <svg width={responsiveSize} height={responsiveSize} className="relative" viewBox={`0 0 ${responsiveSize} ${responsiveSize}`}>
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
                    fontSize={responsiveSize < 320 ? "9" : responsiveSize < 380 ? "10" : "11"}
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
              fontSize={responsiveSize < 320 ? "18" : responsiveSize < 380 ? "20" : "24"}
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
            <div className="bg-[var(--color-main-1)] px-4 sm:px-6 py-2 sm:py-3 font-heading uppercase tracking-wider text-sm sm:text-base">
              {availableSpins > 0 ? "SPIN!" : "No Spins"}
            </div>
          </motion.button>
        )}
      </div>

      {/* Available spins indicator */}
      <div className="text-center mt-3 sm:mt-4">
        <p className="text-xs sm:text-sm text-white/60">
          Available Spins:{" "}
          <span className="text-[var(--color-main-1)] font-bold">{availableSpins}</span>
        </p>
      </div>

      {/* Result Modal */}
      <AnimatePresence>
        {showResultModal && selectedPrize && (
          <>
            {/* Confetti */}
            <Confetti
              width={windowSize.width}
              height={windowSize.height}
              recycle={false}
              numberOfPieces={200}
              gravity={0.3}
              style={{ position: "fixed", top: 0, left: 0, zIndex: 9999 }}
            />

            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeResultModal}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            >
              {/* Modal Content */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0, y: 50 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-gradient-to-br from-[var(--color-dark-2)] to-[var(--color-dark-1)] border-2 rounded-xl p-6 sm:p-8 max-w-md w-full text-center overflow-hidden"
                style={{ borderColor: selectedPrize.color }}
              >
                {/* Background glow */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    background: `radial-gradient(circle at center, ${selectedPrize.color} 0%, transparent 70%)`,
                  }}
                />

                {/* Content */}
                <div className="relative">
                  {/* Celebration icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="text-6xl sm:text-7xl mb-4"
                  >
                    🎉
                  </motion.div>

                  {/* Title */}
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl sm:text-3xl font-heading mb-2"
                  >
                    Congratulations!
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/60 mb-6"
                  >
                    You won
                  </motion.p>

                  {/* Prize display */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="inline-block px-6 py-4 rounded-lg mb-6"
                    style={{
                      backgroundColor: `${selectedPrize.color}20`,
                      borderColor: selectedPrize.color,
                      borderWidth: 2,
                    }}
                  >
                    <p
                      className="text-2xl sm:text-3xl font-heading"
                      style={{ color: selectedPrize.color }}
                    >
                      {selectedPrize.name}
                    </p>
                    {selectedPrize.description && (
                      <p className="text-sm text-white/60 mt-1">
                        {selectedPrize.description}
                      </p>
                    )}
                  </motion.div>

                  {/* Prize type indicator */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-center justify-center gap-2 mb-6 text-sm text-white/50"
                  >
                    {selectedPrize.prize_type === "discount" && "🏷️ Discount added to your account"}
                    {selectedPrize.prize_type === "xp" && "⚡ XP added to your balance"}
                    {selectedPrize.prize_type === "spin" && "🎡 Bonus spin added"}
                    {selectedPrize.prize_type === "credit" && "💰 Store credit added"}
                    {selectedPrize.prize_type === "shipping" && "🚚 Free shipping unlocked"}
                    {selectedPrize.prize_type === "mystery" && "🎁 Check your rewards!"}
                  </motion.div>

                  {/* Claim button */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <Button
                      onClick={closeResultModal}
                      size="lg"
                      className="min-w-[200px]"
                    >
                      Awesome! 🎊
                    </Button>
                  </motion.div>

                  {/* Remaining spins hint */}
                  {availableSpins > 0 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="text-xs text-white/40 mt-4"
                    >
                      You have {availableSpins} more spin{availableSpins !== 1 ? "s" : ""} remaining!
                    </motion.p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


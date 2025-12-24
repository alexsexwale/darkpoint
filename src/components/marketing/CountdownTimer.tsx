"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  endTime: Date | string;
  className?: string;
  variant?: "default" | "compact" | "large";
  showLabels?: boolean;
  onComplete?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({
  endTime,
  className,
  variant = "default",
  showLabels = true,
  onComplete,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isComplete, setIsComplete] = useState(false);

  const targetDate = useMemo(() => new Date(endTime), [endTime]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference <= 0) {
        setIsComplete(true);
        onComplete?.();
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  if (isComplete) {
    return (
      <div className={cn("text-center", className)}>
        <span className="text-[var(--color-main-1)] font-heading uppercase tracking-wider">
          Expired
        </span>
      </div>
    );
  }

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex items-center justify-center font-heading",
          variant === "compact" && "w-8 h-8 text-sm bg-[var(--color-dark-3)]",
          variant === "default" && "w-12 h-12 text-xl bg-[var(--color-dark-3)] border border-[var(--color-dark-4)]",
          variant === "large" && "w-16 h-16 text-2xl bg-[var(--color-dark-2)] border-2 border-[var(--color-main-1)]"
        )}
      >
        {value.toString().padStart(2, "0")}
      </motion.div>
      {showLabels && (
        <span
          className={cn(
            "uppercase tracking-wider text-white/40 mt-1",
            variant === "compact" && "text-[8px]",
            variant === "default" && "text-[10px]",
            variant === "large" && "text-xs"
          )}
        >
          {label}
        </span>
      )}
    </div>
  );

  const Separator = () => (
    <span
      className={cn(
        "font-heading text-[var(--color-main-1)]",
        variant === "compact" && "text-sm mx-0.5",
        variant === "default" && "text-xl mx-1",
        variant === "large" && "text-2xl mx-2"
      )}
    >
      :
    </span>
  );

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {timeLeft.days > 0 && (
        <>
          <TimeUnit value={timeLeft.days} label="Days" />
          <Separator />
        </>
      )}
      <TimeUnit value={timeLeft.hours} label="Hrs" />
      <Separator />
      <TimeUnit value={timeLeft.minutes} label="Min" />
      <Separator />
      <TimeUnit value={timeLeft.seconds} label="Sec" />
    </div>
  );
}


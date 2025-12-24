"use client";

import { cn } from "@/lib/utils";

interface RatingProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

export function Rating({
  value,
  max = 5,
  size = "md",
  showValue = false,
  className,
}: RatingProps) {
  const percentage = (value / max) * 100;

  const sizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("relative inline-block leading-none", sizes[size])}>
        {/* Background stars */}
        <span className="text-[var(--color-dark-4)]">
          {Array.from({ length: max }).map((_, i) => (
            <span key={i} className="inline-block">★</span>
          ))}
        </span>
        {/* Filled stars */}
        <span
          className="absolute top-0 left-0 overflow-hidden whitespace-nowrap text-[var(--color-main-1)]"
          style={{ width: `${percentage}%` }}
        >
          {Array.from({ length: max }).map((_, i) => (
            <span key={i} className="inline-block">★</span>
          ))}
        </span>
      </span>
      {showValue && (
        <span className={cn("text-[var(--muted-foreground)]", sizes[size])}>
          ({value.toFixed(1)})
        </span>
      )}
    </div>
  );
}



"use client";

import { type ReactNode, useRef, useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LinkEffectProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

/**
 * LinkEffect4 - Strikethrough hover effect from Godlike template
 * Creates a horizontal line that appears through the text on hover
 */
export function LinkEffect({ href, children, className, onClick, active }: LinkEffectProps) {
  const [text, setText] = useState<string>("");
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (ref.current) {
      setText(ref.current.textContent || "");
    }
  }, [children]);

  return (
    <Link
      ref={ref}
      href={href}
      onClick={onClick}
      className={cn("link-effect-4 group", className)}
    >
      <span className="link-effect-inner">
        {/* Shade overlay (hidden) */}
        <span className="link-effect-shade">{children}</span>
        
        {/* Left half of text (moves left on hover) */}
        <span className="link-effect-l">
          <span>{text}</span>
        </span>
        
        {/* Right half of text (moves right on hover) */}
        <span className="link-effect-r">
          <span>{text}</span>
        </span>
        
        {/* Original text */}
        {children}
      </span>
    </Link>
  );
}



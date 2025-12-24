"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NavLinkEffectProps {
  href: string;
  children: string;
  isActive?: boolean;
  className?: string;
  showDots?: boolean;
  onClick?: () => void;
}

export function NavLinkEffect({
  href,
  children,
  isActive = false,
  className,
  showDots = true,
  onClick,
}: NavLinkEffectProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "nk-nav-link relative block px-6 py-2 font-heading text-sm uppercase tracking-wider cursor-pointer",
        isActive ? "nk-nav-link-active" : "",
        className
      )}
    >
      {/* Text container with split effect */}
      <span className="nk-nav-text-wrap">
        {/* Top half of text */}
        <span className="nk-nav-text nk-nav-text-top" data-text={children}>
          {children}
        </span>
        {/* Bottom half of text */}
        <span className="nk-nav-text nk-nav-text-bottom" aria-hidden="true">
          {children}
        </span>
        {/* Strikethrough line */}
        <span className="nk-nav-line" />
      </span>
      {/* Dots under the link */}
      {showDots && <span className="nk-nav-dots">•••</span>}
    </Link>
  );
}

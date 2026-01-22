"use client";

import { useState, useEffect } from "react";
import { useWishlistStore, useUIStore } from "@/stores";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface AddToWishlistButtonProps {
  product: Product;
  className?: string;
}

export function AddToWishlistButton({ product, className }: AddToWishlistButtonProps) {
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { openSignIn } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const inWishlist = mounted ? isInWishlist(product.id) : false;

  const handleClick = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const result = await toggleItem(product);
      
      // If auth is required, open sign-in modal
      if (result.requiresAuth) {
        openSignIn();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "nk-btn nk-btn-outline",
        inWishlist && "nk-btn-active",
        isLoading && "opacity-50 cursor-wait",
        className
      )}
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
    >
      <span className="nk-btn-inner" />
      <span className="nk-btn-content flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
        {isLoading ? (
          <svg className="animate-spin w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill={inWishlist ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        )}
        <span className="hidden xs:inline">{isLoading ? "..." : inWishlist ? "In Wishlist" : "Wishlist"}</span>
        <span className="xs:hidden">{inWishlist ? "♥" : "+"}</span>
      </span>
    </button>
  );
}

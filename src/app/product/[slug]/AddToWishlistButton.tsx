"use client";

import { useState, useEffect } from "react";
import { useWishlistStore } from "@/stores";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface AddToWishlistButtonProps {
  product: Product;
  className?: string;
}

export function AddToWishlistButton({ product, className }: AddToWishlistButtonProps) {
  const { toggleItem, isInWishlist } = useWishlistStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const inWishlist = mounted ? isInWishlist(product.id) : false;

  const handleClick = () => {
    toggleItem(product);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "nk-btn nk-btn-outline",
        inWishlist && "nk-btn-active",
        className
      )}
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
    >
      <span className="nk-btn-inner" />
      <span className="nk-btn-content flex items-center gap-2">
        <svg
          className="w-5 h-5"
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
        <span>{inWishlist ? "In Wishlist" : "Add to Wishlist"}</span>
      </span>
    </button>
  );
}

"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore, useWishlistStore, useUIStore } from "@/stores";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  className?: string;
}

const PLACEHOLDER_IMAGE = "/images/placeholder.png";

export function ProductCard({ product, className }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const dragStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addItem, openCart } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { openSignIn } = useUIStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const inWishlist = mounted ? isInWishlist(product.id) : false;

  // Filter out failed images
  const validImages = useMemo(() => {
    const filtered = product.images.filter((img) => !failedImages.has(img.id));
    return filtered.length > 0 
      ? filtered 
      : [{ id: 'placeholder', src: PLACEHOLDER_IMAGE, alt: product.name }];
  }, [product.images, product.name, failedImages]);

  const handleImageError = (imageId: string) => {
    setFailedImages((prev) => new Set(prev).add(imageId));
  };

  const handleAddToCart = () => {
    addItem(product, 1);
    openCart();
  };

  const handleToggleWishlist = async () => {
    if (isWishlistLoading) return;
    
    setIsWishlistLoading(true);
    try {
      const result = await toggleItem(product);
      
      // If auth is required, open sign-in modal
      if (result.requiresAuth) {
        openSignIn();
      }
    } finally {
      setIsWishlistLoading(false);
    }
  };

  // Swipe handlers
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    dragStartX.current = clientX;
  };

  const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    const clientX = "changedTouches" in e ? e.changedTouches[0].clientX : e.clientX;
    const diff = dragStartX.current - clientX;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentImageIndex < validImages.length - 1) {
        setCurrentImageIndex((prev) => prev + 1);
      } else if (diff < 0 && currentImageIndex > 0) {
        setCurrentImageIndex((prev) => prev - 1);
      }
    }
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentImageIndex((prev) => (prev + 1) % validImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentImageIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  // Reset image index if it's out of bounds after images filter
  useEffect(() => {
    if (currentImageIndex >= validImages.length) {
      setCurrentImageIndex(0);
    }
  }, [validImages.length, currentImageIndex]);

  return (
    <motion.div
      ref={containerRef}
      className={cn("group relative", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCurrentImageIndex(0);
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      data-mouse-parallax-z="3"
      data-mouse-parallax-speed="1"
    >
      <div
        className={cn(
          "nk-product relative p-5 text-left transition-all duration-300 bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] h-full flex flex-col",
          "group-hover:bg-[var(--color-dark-1)] group-hover:border-[var(--color-main-1)]/30 group-hover:z-10"
        )}
      >
        {/* Product Images - Swipeable Carousel with click to navigate */}
        <div
          className="nk-carousel-3 relative aspect-square mb-4 overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleDragStart}
          onMouseUp={(e) => {
            handleDragEnd(e);
            // If not a drag (small movement), navigate to product
            const clientX = e.clientX;
            const diff = Math.abs(dragStartX.current - clientX);
            if (diff < 10) {
              window.location.href = `/product/${product.slug}`;
            }
          }}
          onMouseLeave={() => isDragging && setIsDragging(false)}
          onTouchStart={handleDragStart}
          onTouchEnd={(e) => {
            handleDragEnd(e);
            // If not a swipe (small movement), navigate to product
            const clientX = e.changedTouches[0].clientX;
            const diff = Math.abs(dragStartX.current - clientX);
            if (diff < 10) {
              window.location.href = `/product/${product.slug}`;
            }
          }}
        >
          <div
            className="nk-carousel-inner flex transition-transform duration-300 ease-out h-full"
            style={{
              transform: `translateX(-${currentImageIndex * 100}%)`,
            }}
          >
            {validImages.map((image) => (
              <div key={image.id} className="relative w-full h-full flex-shrink-0 cursor-pointer">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  draggable={false}
                  onError={() => handleImageError(image.id)}
                />
              </div>
            ))}
          </div>

          {/* Navigation Arrows - Always visible when multiple images */}
          {validImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className={cn(
                  "absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-[var(--color-main-1)] transition-all cursor-pointer z-10",
                  isHovered ? "opacity-100" : "opacity-50"
                )}
                aria-label="Previous image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextImage}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-[var(--color-main-1)] transition-all cursor-pointer z-10",
                  isHovered ? "opacity-100" : "opacity-50"
                )}
                aria-label="Next image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Image counter badge */}
          {validImages.length > 1 && (
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-xs text-white/80 z-10">
              {currentImageIndex + 1} / {validImages.length}
            </div>
          )}
        </div>

        {/* Image Dots (if multiple images) - Always visible */}
        {validImages.length > 1 && (
          <div className="flex justify-center gap-1.5 mb-4">
            {validImages.slice(0, 5).map((_, index) => (
              <button
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all cursor-pointer",
                  index === currentImageIndex
                    ? "bg-[var(--color-main-1)] scale-125"
                    : "bg-[var(--color-dark-4)] hover:bg-[var(--color-main-1)]/50"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setCurrentImageIndex(index);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                aria-label={`View image ${index + 1}`}
              />
            ))}
            {validImages.length > 5 && (
              <span className="text-xs text-white/40 ml-1">+{validImages.length - 5}</span>
            )}
          </div>
        )}

        {/* Title - Wrapped in Link */}
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-heading text-base mb-1 transition-colors group-hover:text-[var(--color-main-1)] line-clamp-2 cursor-pointer">
            {product.name}
          </h3>
        </Link>

        {/* Category */}
        <p className="text-xs text-white/60 uppercase tracking-wider mb-2">
          {product.category}
        </p>

        {/* Price with Action Icons */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div>
            <span className="text-lg font-bold text-[var(--color-main-1)]">
              {formatPrice(product.price)}
            </span>
            {product.compareAtPrice && (
              <del className="ml-2 text-sm text-white/60">
                {formatPrice(product.compareAtPrice)}
              </del>
            )}
          </div>

          {/* Quick Action Icons - Outside Link */}
          <div className="flex items-center gap-1">
            {/* Wishlist Icon */}
            <button
              onClick={handleToggleWishlist}
              disabled={isWishlistLoading}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded transition-all duration-200 cursor-pointer",
                isWishlistLoading && "opacity-50 cursor-wait",
                inWishlist
                  ? "text-[var(--color-main-1)]"
                  : "text-white/40 hover:text-[var(--color-main-1)]"
              )}
              aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            >
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
            </button>

            {/* Add to Cart Icon */}
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded transition-all duration-200 cursor-pointer",
                product.inStock
                  ? "bg-[var(--color-main-1)] text-white hover:bg-[var(--color-main-1)]/80"
                  : "bg-white/10 text-white/30 cursor-not-allowed"
              )}
              aria-label="Add to cart"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Badges */}
        {!product.inStock && (
          <span className="absolute top-4 left-4 px-2 py-1 text-xs bg-[var(--color-main-5)] text-white">
            Out of Stock
          </span>
        )}
        {product.featured && product.inStock && (
          <span className="absolute top-4 left-4 px-2 py-1 text-xs bg-[var(--color-main-1)] text-white">
            Featured
          </span>
        )}
      </div>
    </motion.div>
  );
}

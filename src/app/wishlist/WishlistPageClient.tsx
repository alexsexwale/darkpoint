"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlistStore, useCartStore, useAuthStore, useUIStore } from "@/stores";
import { Button } from "@/components/ui";
import { formatPrice, cn } from "@/lib/utils";
import type { WishlistItem } from "@/stores/wishlistStore";

const PLACEHOLDER_IMAGE = "/images/placeholder.png";

// Helper to get valid image URL
const getValidImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl || imageUrl.trim() === "") {
    return PLACEHOLDER_IMAGE;
  }
  // Check if it's a valid URL or path
  try {
    // If it starts with http/https or /, it's likely valid
    if (imageUrl.startsWith("http") || imageUrl.startsWith("/")) {
      return imageUrl;
    }
    return PLACEHOLDER_IMAGE;
  } catch {
    return PLACEHOLDER_IMAGE;
  }
};

export function WishlistPageClient() {
  const { items, removeItem, clearWishlist, itemCount, fetchWishlist, isLoading, isInitialized } = useWishlistStore();
  const { addItem: addToCart, openCart } = useCartStore();
  const { isAuthenticated, isInitialized: authInitialized } = useAuthStore();
  const { openSignIn } = useUIStore();
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Fetch wishlist when component mounts and user is authenticated
  useEffect(() => {
    if (authInitialized && isAuthenticated && !isInitialized) {
      fetchWishlist();
    }
  }, [authInitialized, isAuthenticated, isInitialized, fetchWishlist]);

  // Handle image load error
  const handleImageError = (productId: string) => {
    setFailedImages((prev) => new Set(prev).add(productId));
  };

  // Get image URL with fallback for failed images
  const getImageUrl = (item: WishlistItem): string => {
    if (failedImages.has(item.product_id)) {
      return PLACEHOLDER_IMAGE;
    }
    return getValidImageUrl(item.product_image);
  };

  // Build a product-like object from wishlist item for cart
  const buildProductFromWishlistItem = (item: WishlistItem) => {
    const imageUrl = getValidImageUrl(item.product_image);
    return {
      id: item.product_id,
      name: item.product_name,
      slug: item.product_slug || item.product_id,
      price: item.product_price,
      originalPrice: item.product_original_price || undefined,
      compareAtPrice: item.product_original_price || undefined,
      images: [{ id: "1", src: imageUrl, alt: item.product_name }],
      category: item.product_category || "General",
      description: "",
      rating: 0,
      reviewCount: 0,
      inStock: true,
      featured: false,
      tags: [],
      createdAt: item.added_at,
      updatedAt: item.added_at,
    };
  };

  const handleAddToCart = (item: WishlistItem) => {
    const product = buildProductFromWishlistItem(item);
    addToCart(product, 1);
    openCart();
  };

  const handleAddAllToCart = () => {
    items.forEach((item) => {
      const product = buildProductFromWishlistItem(item);
      addToCart(product, 1);
    });
    openCart();
  };

  const handleRemoveItem = async (productId: string) => {
    await removeItem(productId);
  };

  const handleClearWishlist = async () => {
    await clearWishlist();
  };

  // Show loading while auth or wishlist is initializing
  if (!authInitialized || (isAuthenticated && !isInitialized) || isLoading) {
    return (
      <div className="container py-8">
        <div className="nk-gap-2" />
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-wider">
            My Wishlist
          </h1>
          <div className="w-24 h-px bg-white/20 mx-auto mt-4" />
        </div>
        <div className="flex justify-center py-20">
          <div className="flex items-center gap-3 text-white/50">
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading your wishlist...
          </div>
        </div>
      </div>
    );
  }

  // Show sign in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="container py-8">
        <div className="nk-gap-2" />
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-wider">
            My Wishlist
          </h1>
          <div className="w-24 h-px bg-white/20 mx-auto mt-4" />
        </div>
        <div className="text-center py-20 bg-[var(--color-dark-2)] max-w-2xl mx-auto">
          <div className="mb-6">
            <svg
              className="w-20 h-20 mx-auto text-[var(--color-dark-4)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-heading mb-4">Sign in to view your wishlist</h2>
          <p className="text-[var(--muted-foreground)] mb-8 max-w-md mx-auto">
            Create an account or sign in to save your favorite items. Your wishlist will be synced across all your devices.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" size="lg" onClick={openSignIn}>
              Sign In / Register
            </Button>
            <Link href="/store">
              <Button variant="outline" size="lg">
                Browse Products
              </Button>
            </Link>
          </div>
        </div>
        <div className="nk-gap-4" />
        <div className="nk-gap-4" />
      </div>
    );
  }

  const count = itemCount();

  return (
    <div className="container py-8">
      <div className="nk-gap-2" />

      {/* Page Title */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-wider">
          My Wishlist
        </h1>
        <div className="w-24 h-px bg-white/20 mx-auto mt-4" />
        {count > 0 && (
          <p className="text-[var(--muted-foreground)] mt-4">
            {count} {count === 1 ? "item" : "items"} saved
          </p>
        )}
      </div>

      {count === 0 ? (
        // Empty State
        <div className="text-center py-20 bg-[var(--color-dark-2)] max-w-2xl mx-auto">
          <div className="mb-6">
            <svg
              className="w-20 h-20 mx-auto text-[var(--color-dark-4)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-heading mb-4">Your wishlist is empty</h2>
          <p className="text-[var(--muted-foreground)] mb-8 max-w-md mx-auto">
            Save items you love by clicking the heart icon on any product. Your wishlist will be saved for when you&apos;re ready to shop.
          </p>
          <Link href="/store">
            <Button variant="primary" size="lg">
              Browse Products
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-4 bg-[var(--color-dark-2)]">
            <span className="text-sm text-[var(--muted-foreground)]">
              {count} {count === 1 ? "item" : "items"} in your wishlist
            </span>
            <div className="flex gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddAllToCart}
                className="cursor-pointer"
              >
                Add All to Cart
              </Button>
              <button
                onClick={handleClearWishlist}
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--color-main-5)] transition-colors cursor-pointer"
              >
                Clear Wishlist
              </button>
            </div>
          </div>

          {/* Wishlist Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.product_id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="group relative bg-[var(--color-dark-2)] overflow-hidden"
                >
                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveItem(item.product_id)}
                    className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-black/50 hover:bg-[var(--color-main-5)] text-white rounded-full transition-colors cursor-pointer"
                    aria-label="Remove from wishlist"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Product Image */}
                  <Link href={`/product/${item.product_slug || item.product_id}`}>
                    <div className="relative aspect-square p-4 bg-[var(--color-dark-3)]">
                      <Image
                        src={getImageUrl(item)}
                        alt={item.product_name}
                        fill
                        className="object-contain transition-transform duration-300 group-hover:scale-110"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        onError={() => handleImageError(item.product_id)}
                        unoptimized={getImageUrl(item).startsWith("http")}
                      />
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="p-4 space-y-3">
                    <Link href={`/product/${item.product_slug || item.product_id}`}>
                      <h3 className="font-heading text-lg hover:text-[var(--color-main-1)] transition-colors line-clamp-2">
                        {item.product_name}
                      </h3>
                    </Link>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-white">
                          {formatPrice(item.product_price)}
                        </span>
                        {item.product_original_price && item.product_original_price > item.product_price && (
                          <span className="ml-2 text-sm text-[var(--muted-foreground)] line-through">
                            {formatPrice(item.product_original_price)}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs px-2 py-1",
                          "bg-green-500/20 text-green-400"
                        )}
                      >
                        In Stock
                      </span>
                    </div>

                    {/* Add to Cart Button */}
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full cursor-pointer"
                      onClick={() => handleAddToCart(item)}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Continue Shopping */}
          <div className="text-center mt-12">
            <Link href="/store">
              <Button variant="outline" size="lg" className="cursor-pointer">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </>
      )}

      <div className="nk-gap-4" />
      <div className="nk-gap-4" />
    </div>
  );
}

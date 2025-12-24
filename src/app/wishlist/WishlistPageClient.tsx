"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlistStore, useCartStore } from "@/stores";
import { Button } from "@/components/ui";
import { formatPrice, cn } from "@/lib/utils";

export function WishlistPageClient() {
  const { items, removeItem, clearWishlist, itemCount } = useWishlistStore();
  const { addItem: addToCart, openCart } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddToCart = (product: typeof items[0]["product"]) => {
    addToCart(product, 1);
    openCart();
  };

  const handleAddAllToCart = () => {
    items.forEach((item) => {
      addToCart(item.product, 1);
    });
    openCart();
  };

  // Avoid hydration mismatch
  if (!mounted) {
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
          <div className="animate-pulse text-white/50">Loading...</div>
        </div>
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
                onClick={clearWishlist}
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
                  key={item.product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="group relative bg-[var(--color-dark-2)] overflow-hidden"
                >
                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-black/50 hover:bg-[var(--color-main-5)] text-white rounded-full transition-colors cursor-pointer"
                    aria-label="Remove from wishlist"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Product Image */}
                  <Link href={`/product/${item.product.slug}`}>
                    <div className="relative aspect-square p-4 bg-[var(--color-dark-3)]">
                      <Image
                        src={item.product.images[0]?.src || "/images/placeholder.png"}
                        alt={item.product.name}
                        fill
                        className="object-contain transition-transform duration-300 group-hover:scale-110"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="p-4 space-y-3">
                    <Link href={`/product/${item.product.slug}`}>
                      <h3 className="font-heading text-lg hover:text-[var(--color-main-1)] transition-colors line-clamp-2">
                        {item.product.name}
                      </h3>
                    </Link>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-white">
                          {formatPrice(item.product.price)}
                        </span>
                        {item.product.compareAtPrice && (
                          <span className="ml-2 text-sm text-[var(--muted-foreground)] line-through">
                            {formatPrice(item.product.compareAtPrice)}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs px-2 py-1",
                          item.product.inStock
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        )}
                      >
                        {item.product.inStock ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>

                    {/* Add to Cart Button */}
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full cursor-pointer"
                      onClick={() => handleAddToCart(item.product)}
                      disabled={!item.product.inStock}
                    >
                      {item.product.inStock ? "Add to Cart" : "Out of Stock"}
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



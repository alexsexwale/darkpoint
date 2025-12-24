"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore, useWishlistStore } from "@/stores";
import { Rating, Button } from "@/components/ui";
import type { Product } from "@/types";

interface ProductListProps {
  products: Product[];
}

export function ProductList({ products }: ProductListProps) {
  const { addItem: addToCart, openCart } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-4">
      {products.map((product, index) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="group bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] hover:border-[var(--color-main-1)]/30 transition-colors"
        >
          <Link href={`/product/${product.slug}`}>
            <div className="flex flex-col sm:flex-row">
              {/* Product Image */}
              <div className="relative w-full sm:w-48 h-48 flex-shrink-0 bg-[var(--color-dark-3)] overflow-hidden">
                <Image
                  src={product.images[0]?.src || "/images/placeholder.png"}
                  alt={product.name}
                  fill
                  className="object-contain p-4 transition-transform duration-300 group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, 192px"
                />
                
                {/* Badges */}
                {!product.inStock && (
                  <span className="absolute top-2 left-2 px-2 py-1 text-xs bg-[var(--color-main-5)] text-white">
                    Out of Stock
                  </span>
                )}
                {product.featured && product.inStock && (
                  <span className="absolute top-2 left-2 px-2 py-1 text-xs bg-[var(--color-main-1)] text-white">
                    Featured
                  </span>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-heading text-lg text-white group-hover:text-[var(--color-main-1)] transition-colors">
                      {product.name}
                    </h3>
                    <span className="text-xs text-white/40 uppercase tracking-wider">
                      {product.category}
                    </span>
                  </div>
                  
                  <p className="text-sm text-white/60 line-clamp-2 mb-3">
                    {product.shortDescription || product.description}
                  </p>
                  
                  <Rating value={product.rating} size="sm" className="mb-3" />
                </div>

                <div className="flex items-center justify-between gap-4">
                  {/* Price */}
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">
                      {formatPrice(product.price)}
                    </span>
                    {product.compareAtPrice && (
                      <span className="text-sm text-white/40 line-through">
                        {formatPrice(product.compareAtPrice)}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                    {/* Wishlist */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleItem(product);
                      }}
                      className={cn(
                        "w-10 h-10 flex items-center justify-center border transition-all cursor-pointer",
                        mounted && isInWishlist(product.id)
                          ? "bg-[var(--color-main-1)] border-[var(--color-main-1)] text-white"
                          : "border-[var(--color-dark-4)] text-white/50 hover:border-[var(--color-main-1)] hover:text-[var(--color-main-1)]"
                      )}
                      aria-label={mounted && isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <svg
                        className="w-5 h-5"
                        fill={mounted && isInWishlist(product.id) ? "currentColor" : "none"}
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

                    {/* Add to Cart */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addToCart(product, 1);
                        openCart();
                      }}
                      disabled={!product.inStock}
                      className={cn(
                        "w-10 h-10 flex items-center justify-center border transition-all cursor-pointer",
                        product.inStock
                          ? "border-[var(--color-dark-4)] text-white/50 hover:bg-[var(--color-main-1)] hover:border-[var(--color-main-1)] hover:text-white"
                          : "border-[var(--color-dark-4)] text-white/20 cursor-not-allowed"
                      )}
                      aria-label="Add to cart"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}



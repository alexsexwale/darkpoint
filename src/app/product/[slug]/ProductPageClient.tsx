"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useProduct } from "@/hooks";
import { ProductGallery, ProductTabs, ProductDescription, VariantSelectors } from "@/components/store";
import { Rating, ProductDetailSkeleton } from "@/components/ui";
import { AddToCartButton } from "./AddToCartButton";
import { AddToWishlistButton } from "./AddToWishlistButton";
import { ShareProductButton } from "./ShareProductButton";
import { useGamificationStore, useAuthStore, useReviewsStore } from "@/stores";
import { ProductJsonLd, BreadcrumbJsonLd } from "@/components/seo";
import type { ProductVariant } from "@/types";

interface ProductPageClientProps {
  slug: string;
}

// Extract product ID from slug (format: product-name-productId)
function extractProductId(slug: string): string {
  const parts = slug.split("-");
  
  // Check if the last segments form a UUID pattern (e.g., C1D0DB37-65E7-4B2A-96E5-ABC123)
  // UUIDs have 5 segments separated by hyphens with specific lengths: 8-4-4-4-12
  if (parts.length >= 5) {
    const lastFive = parts.slice(-5);
    const isUUID = (
      lastFive[0].length === 8 &&
      lastFive[1].length === 4 &&
      lastFive[2].length === 4 &&
      lastFive[3].length === 4 &&
      lastFive[4].length >= 12 &&
      lastFive.every(p => /^[a-fA-F0-9]+$/.test(p))
    );
    
    if (isUUID) {
      return lastFive.join("-");
    }
  }
  
  // For non-UUID IDs, take the last part
  return parts[parts.length - 1];
}

export function ProductPageClient({ slug }: ProductPageClientProps) {
  const productId = extractProductId(slug);
  const { product, loading, error } = useProduct(productId);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const { updateQuestProgress, initDailyQuests, logActivity } = useGamificationStore();
  const { isAuthenticated, isInitialized: authInitialized } = useAuthStore();
  const { stats, totalReviews, fetchProductReviews } = useReviewsStore();
  const trackedProductRef = useRef<string | null>(null);
  
  // Fetch reviews stats for rating display
  useEffect(() => {
    if (product) {
      fetchProductReviews(product.id, { limit: 1, offset: 0 });
    }
  }, [product, fetchProductReviews]);
  
  // Set default variant when product loads
  useEffect(() => {
    if (product?.variants && product.variants.length > 0 && !selectedVariant) {
      // Select the first variant by default
      setSelectedVariant(product.variants[0]);
    }
  }, [product, selectedVariant]);

  // Track product view for "Window Shopper" quest (only for authenticated users)
  useEffect(() => {
    // Only track if:
    // 1. Product is loaded
    // 2. Auth is initialized
    // 3. User is authenticated
    // 4. We haven't tracked THIS specific product yet in this component instance
    if (product && authInitialized && isAuthenticated && trackedProductRef.current !== productId) {
      trackedProductRef.current = productId;
      
      // Ensure quests are initialized
      initDailyQuests();
      
      // Log activity to database (handles deduplication server-side)
      logActivity("product_view", productId).then((isNewActivity) => {
        if (isNewActivity) {
          // Update quest progress - add 1 for this new product view
          console.log(`[Quest] Tracking product view: ${productId}`);
          updateQuestProgress("browse_products", 1);
        }
      });
    }
  }, [product, productId, authInitialized, isAuthenticated, updateQuestProgress, initDailyQuests, logActivity]);
  
  // Compute effective price based on selected variant
  const effectivePrice = useMemo(() => {
    if (selectedVariant?.price) {
      return selectedVariant.price;
    }
    return product?.price || 0;
  }, [selectedVariant, product]);
  
  // Check if product has variants
  const hasVariants = product?.variants && product.variants.length > 0;

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="container py-8">
        <div className="nk-gap-2" />
        <div className="text-center py-20">
          <svg
            className="w-20 h-20 mx-auto text-white/20 mb-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h1 className="text-3xl font-heading mb-4">Product Not Found</h1>
          <p className="text-white/60 mb-8">
            {error || "The product you're looking for doesn't exist or has been removed."}
          </p>
          <Link
            href="/store"
            className="inline-block px-6 py-3 bg-[var(--color-main-1)] text-white hover:bg-[var(--color-main-1)]/80 transition-colors"
          >
            Back to Store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 sm:py-8">
      {/* SEO: Product structured data */}
      <ProductJsonLd 
        product={product} 
        reviewCount={totalReviews} 
        averageRating={stats?.average || 0} 
      />
      <BreadcrumbJsonLd 
        items={[
          { name: "Home", url: "/" },
          { name: "Store", url: "/store" },
          { name: product.category.charAt(0).toUpperCase() + product.category.slice(1), url: `/store?category=${product.category}` },
          { name: product.name, url: `/product/${product.slug}` },
        ]} 
      />
      
      <div className="nk-gap-1 sm:nk-gap-2" />

      {/* Breadcrumb - Simplified on mobile */}
      <nav className="text-xs sm:text-sm text-[var(--muted-foreground)] mb-4 sm:mb-8 overflow-hidden">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <Link href="/" className="hover:text-white transition-colors shrink-0">
            Home
          </Link>
          <span>/</span>
          <Link href="/store" className="hover:text-white transition-colors shrink-0">
            Store
          </Link>
          <span>/</span>
          <span className="text-white truncate max-w-[200px] sm:max-w-none">{product.name}</span>
        </div>
      </nav>

      {/* Product Details */}
      <div className="nk-store-product grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
        {/* Gallery */}
        <ProductGallery images={product.images} productName={product.name} />

        {/* Info */}
        <div className="space-y-4 sm:space-y-6">
          {/* Category */}
          <Link
            href={`/store?category=${product.category}`}
            className="nk-product-category inline-block text-xs sm:text-sm text-[var(--color-main-1)] font-medium uppercase tracking-wider hover:text-[var(--color-main-1)]/80 transition-colors"
          >
            {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
          </Link>

          {/* Title */}
          <h1 className="nk-product-title text-2xl sm:text-3xl lg:text-4xl !mt-1 sm:!mt-2 !mb-4 sm:!mb-8 leading-tight">{product.name}</h1>

          {/* Rating */}
          <div className="nk-product-rating-wrapper flex items-center gap-2 sm:gap-4 flex-wrap">
            <Rating value={stats?.average || 0} size="lg" showValue />
            <span className="text-xs sm:text-sm text-[var(--muted-foreground)]">
              ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
            </span>
          </div>

          {/* Description */}
          <ProductDescription 
            description={product.description} 
            maxLength={250}
          />

          {/* Variant Selectors */}
          {hasVariants && (
            <div className="pt-2">
              <VariantSelectors
                variants={product.variants!}
                selectedVariant={selectedVariant}
                onVariantChange={setSelectedVariant}
              />
            </div>
          )}

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                product.inStock ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-xs sm:text-sm">
              {product.inStock ? "In Stock" : "Out of Stock"}
            </span>
          </div>

          {/* Add to Cart Section */}
          <div className="pt-2 sm:pt-4">
            <AddToCartButton 
              product={product} 
              selectedVariant={selectedVariant}
              effectivePrice={effectivePrice}
            />
          </div>

          {/* Wishlist & Share Buttons */}
          <div className="flex gap-2 sm:gap-3">
            <AddToWishlistButton product={product} className="flex-1" />
            <ShareProductButton product={product} className="flex-1" />
          </div>

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="pt-4 sm:pt-6 border-t border-[var(--color-dark-3)]">
              <span className="text-xs sm:text-sm text-[var(--muted-foreground)]">Tags: </span>
              {product.tags.map((tag, index) => (
                <span key={tag}>
                  <Link
                    href={`/store?search=${tag}`}
                    className="text-xs sm:text-sm text-[var(--muted-foreground)] hover:text-[var(--color-main-1)] transition-colors"
                  >
                    {tag}
                  </Link>
                  {index < product.tags.length - 1 && ", "}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="nk-gap-3 sm:nk-gap-5" />

      {/* Product Tabs */}
      <ProductTabs product={product} />

      {/* Related Products */}
      <div className="nk-gap-3 sm:nk-gap-5" />
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl lg:text-3xl mb-2 sm:mb-4">You Might Also Like</h2>
        <p className="text-sm sm:text-base text-[var(--muted-foreground)]">
          Explore more products in this category
        </p>
      </div>
      <div className="text-center">
        <Link
          href={`/store?category=${product.category}`}
          className="inline-block px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base border border-[var(--color-main-1)] text-[var(--color-main-1)] hover:bg-[var(--color-main-1)] hover:text-white transition-colors rounded-lg sm:rounded-none"
        >
          View {product.category.charAt(0).toUpperCase() + product.category.slice(1)} Products
        </Link>
      </div>

      <div className="nk-gap-3 sm:nk-gap-4" />
    </div>
  );
}


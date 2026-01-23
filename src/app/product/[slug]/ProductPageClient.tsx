"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useProduct } from "@/hooks";
import { ProductGallery, ProductTabs, VariantSelectors } from "@/components/store";
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
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
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
  
  // Handle attribute change for multi-dimensional variants
  const handleAttributeChange = (attribute: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attribute]: value
    }));
  };
  
  // Reset selection when product changes
  useEffect(() => {
    setSelectedVariant(null);
    setSelectedAttributes({});
  }, [product?.id]);

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
  
  // Get the variant image URL
  const variantImageUrl = useMemo(() => {
    if (!selectedVariant?.image) return null;
    
    // Handle both string and ProductImage types
    if (typeof selectedVariant.image === 'string') {
      return selectedVariant.image;
    }
    return selectedVariant.image.src || null;
  }, [selectedVariant]);
  
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
    <div className="w-full">
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

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="container py-8">
          <div className="nk-gap-2" />
          
          {/* Breadcrumb */}
          <nav className="text-sm text-[var(--muted-foreground)] mb-8">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/store" className="hover:text-white transition-colors">Store</Link>
            <span className="mx-2">/</span>
            <span className="text-white">{product.name}</span>
          </nav>

          {/* Product Details - Two Column */}
          <div className="nk-store-product grid lg:grid-cols-2 gap-12">
            <ProductGallery images={product.images} productName={product.name} variantImage={variantImageUrl} />

            <div className="space-y-6">
              <Link
                href={`/store?category=${product.category}`}
                className="nk-product-category inline-block text-sm text-[var(--muted-foreground)] italic hover:text-[var(--color-main-1)] transition-colors"
              >
                {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
              </Link>

              <h1 className="nk-product-title text-4xl !mt-2 !mb-8">{product.name}</h1>

              <div className="nk-product-rating-wrapper flex items-center gap-4">
                <Rating value={stats?.average || 0} size="lg" showValue />
                <span className="text-sm text-[var(--muted-foreground)]">
                  ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
                </span>
              </div>

              {hasVariants && (
                <VariantSelectors
                  variants={product.variants!}
                  selectedVariant={selectedVariant}
                  onVariantChange={setSelectedVariant}
                  selectedAttributes={selectedAttributes}
                  onAttributeChange={handleAttributeChange}
                  variantGroupName={product.variantGroupName}
                />
              )}

              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm">In Stock</span>
              </div>

              <div className="pt-4">
                <AddToCartButton 
                  product={product} 
                  selectedVariant={selectedVariant}
                  effectivePrice={effectivePrice}
                  hasVariants={hasVariants}
                />
              </div>

              <div className="flex gap-3">
                <AddToWishlistButton product={product} className="flex-1" />
                <ShareProductButton product={product} className="flex-1" />
              </div>

              {product.tags.length > 0 && (
                <div className="pt-6 border-t border-[var(--color-dark-3)]">
                  <span className="text-sm text-[var(--muted-foreground)]">Tags: </span>
                  {product.tags.map((tag, index) => (
                    <span key={tag}>
                      <Link
                        href={`/store?search=${tag}`}
                        className="text-sm text-[var(--muted-foreground)] hover:text-[var(--color-main-1)] transition-colors"
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

          <div className="nk-gap-5" />
          <ProductTabs product={product} />

          <div className="nk-gap-5" />
          <div className="text-center mb-8">
            <h2 className="text-3xl mb-4">You Might Also Like</h2>
            <p className="text-[var(--muted-foreground)]">Explore more products in this category</p>
          </div>
          <div className="text-center">
            <Link
              href={`/store?category=${product.category}`}
              className="inline-block px-6 py-3 border border-[var(--color-main-1)] text-[var(--color-main-1)] hover:bg-[var(--color-main-1)] hover:text-white transition-colors"
            >
              View {product.category.charAt(0).toUpperCase() + product.category.slice(1)} Products
            </Link>
          </div>
          <div className="nk-gap-4" />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Breadcrumb */}
        <div className="px-4 py-3">
          <nav className="text-xs text-[var(--muted-foreground)]">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-1">/</span>
            <Link href="/store" className="hover:text-white">Store</Link>
            <span className="mx-1">/</span>
            <span className="text-white truncate">{product.name}</span>
          </nav>
        </div>

        {/* Gallery - Full width */}
        <div className="w-full bg-[var(--color-dark-2)]">
          <ProductGallery images={product.images} productName={product.name} variantImage={variantImageUrl} />
        </div>

        {/* Product Info */}
        <div className="px-4 py-6">
          <Link
            href={`/store?category=${product.category}`}
            className="inline-block text-xs text-[var(--color-main-1)] font-medium uppercase tracking-wider mb-2"
          >
            {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
          </Link>

          <h1 className="text-xl font-heading leading-tight mb-3">{product.name}</h1>

          <div className="flex items-center gap-2 mb-4">
            <Rating value={stats?.average || 0} size="lg" showValue />
            <span className="text-xs text-[var(--muted-foreground)]">
              ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
            </span>
          </div>

          {hasVariants && (
            <div className="mb-4 pb-4 border-b border-[var(--color-dark-3)]">
              <VariantSelectors
                variants={product.variants!}
                selectedVariant={selectedVariant}
                onVariantChange={setSelectedVariant}
                selectedAttributes={selectedAttributes}
                onAttributeChange={handleAttributeChange}
                variantGroupName={product.variantGroupName}
              />
            </div>
          )}

          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs">In Stock</span>
          </div>

          <div className="mb-4">
            <AddToCartButton 
              product={product} 
              selectedVariant={selectedVariant}
              effectivePrice={effectivePrice}
              hasVariants={hasVariants}
            />
          </div>

          <div className="flex gap-2 mb-6">
            <AddToWishlistButton product={product} className="flex-1" />
            <ShareProductButton product={product} className="flex-1" />
          </div>

          {product.tags.length > 0 && (
            <div className="pt-4 border-t border-[var(--color-dark-3)]">
              <span className="text-xs text-[var(--muted-foreground)]">Tags: </span>
              {product.tags.map((tag, index) => (
                <span key={tag}>
                  <Link
                    href={`/store?search=${tag}`}
                    className="text-xs text-[var(--muted-foreground)] hover:text-[var(--color-main-1)]"
                  >
                    {tag}
                  </Link>
                  {index < product.tags.length - 1 && ", "}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-4">
          <ProductTabs product={product} />
        </div>

        {/* Related */}
        <div className="px-4 py-8 text-center">
          <h2 className="text-xl mb-2">You Might Also Like</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">Explore more products</p>
          <Link
            href={`/store?category=${product.category}`}
            className="inline-block px-4 py-2 text-sm border border-[var(--color-main-1)] text-[var(--color-main-1)] hover:bg-[var(--color-main-1)] hover:text-white transition-colors"
          >
            View More
          </Link>
        </div>
      </div>
    </div>
  );
}


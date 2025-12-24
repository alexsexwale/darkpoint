"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { ProductGrid } from "@/components/store";
import { ProductGridSkeleton } from "@/components/ui";
import { StoreFilters } from "./StoreFilters";
import { StoreToolbar } from "./StoreToolbar";
import { ProductList } from "./ProductList";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { useProducts } from "@/hooks";

interface StorePageClientProps {
  currentCategory?: string;
  currentSearch?: string;
  currentMinPrice?: number;
  currentMaxPrice?: number;
  currentInStock?: boolean;
  currentFeatured?: boolean;
  currentOnSale?: boolean;
  currentSort?: string;
  currentView?: "grid" | "list";
}

export function StorePageClient({
  currentCategory,
  currentSearch,
  currentMinPrice,
  currentMaxPrice,
  currentInStock = false,
  currentFeatured = false,
  currentOnSale = false,
  currentSort = "featured",
  currentView = "grid",
}: StorePageClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Fetch products from API
  const { products, loading, error } = useProducts({
    category: currentCategory,
    keywords: currentSearch,
    minPrice: currentMinPrice,
    maxPrice: currentMaxPrice,
    inStock: currentInStock,
    featured: currentFeatured,
    sortBy: currentSort,
    limit: 20,
  });

  // Scroll to top when products finish loading
  useEffect(() => {
    if (!loading && products.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [loading, products.length]);

  // Create query string helper
  const createQueryString = useCallback(
    (params: Record<string, string | undefined>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "" && value !== "false") {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      });
      return newParams.toString();
    },
    [searchParams]
  );

  // Handle sort change
  const handleSortChange = useCallback(
    (sort: string) => {
      const queryString = createQueryString({ sort: sort === "featured" ? undefined : sort });
      router.push(`/store${queryString ? `?${queryString}` : ""}`, { scroll: false });
    },
    [createQueryString, router]
  );

  // Handle view mode change
  const handleViewModeChange = useCallback(
    (view: "grid" | "list") => {
      const queryString = createQueryString({ view: view === "grid" ? undefined : view });
      router.push(`/store${queryString ? `?${queryString}` : ""}`, { scroll: false });
    },
    [createQueryString, router]
  );

  // Sort products (client-side for on-sale filter and additional sorting)
  const sortedProducts = useMemo(() => {
    let filtered = [...products];
    
    // Apply on-sale filter
    if (currentOnSale) {
      filtered = filtered.filter((p) => p.compareAtPrice !== undefined);
    }
    
    // Apply sorting
    switch (currentSort) {
      case "price-asc":
        return filtered.sort((a, b) => a.price - b.price);
      case "price-desc":
        return filtered.sort((a, b) => b.price - a.price);
      case "name-asc":
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return filtered.sort((a, b) => b.name.localeCompare(a.name));
      case "rating":
        return filtered.sort((a, b) => b.rating - a.rating);
      case "newest":
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case "featured":
      default:
        return filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
  }, [products, currentSort, currentOnSale]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Get all parallax elements
    const parallaxElements = container.querySelectorAll("[data-mouse-parallax-z]");

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      parallaxElements.forEach((element) => {
        const el = element as HTMLElement;
        const z = parseFloat(el.dataset.mouseParallaxZ || "1");
        const speed = parseFloat(el.dataset.mouseParallaxSpeed || "1");

        const rect = el.getBoundingClientRect();
        const itemCenterX = rect.left + rect.width / 2;
        const itemCenterY = rect.top + rect.height / 2;

        // Calculate offset from element center
        const x =
          (itemCenterX - clientX) /
          (clientX > itemCenterX ? innerWidth - itemCenterX : itemCenterX);
        const y =
          (itemCenterY - clientY) /
          (clientY > itemCenterY ? innerHeight - itemCenterY : itemCenterY);

        const maxOffset = 5 * z;

        gsap.to(el, {
          x: x * maxOffset,
          y: y * maxOffset,
          duration: speed,
          ease: "power2.out",
          force3D: true,
        });
      });
    };

    const handleMouseLeave = () => {
      parallaxElements.forEach((element) => {
        gsap.to(element, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          force3D: true,
        });
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [products]);

  return (
    <div ref={containerRef} className="container py-8" data-hide-social="true">
      <div className="nk-gap-2" />

      {/* Page Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-wider mb-4">
          Our Store
        </h1>
        <div className="w-24 h-px bg-[var(--color-main-1)] mx-auto mb-4" />
        <p className="text-white/60 max-w-2xl mx-auto">
          Level up your setup with our curated collection of gaming gear, tech gadgets,
          hardware, and exclusive merchandise.
        </p>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className="lg:w-72 flex-shrink-0">
          <StoreFilters
            categories={PRODUCT_CATEGORIES}
            currentCategory={currentCategory}
            currentSearch={currentSearch}
            currentMinPrice={currentMinPrice}
            currentMaxPrice={currentMaxPrice}
            currentInStock={currentInStock}
            currentFeatured={currentFeatured}
            currentOnSale={currentOnSale}
          />
        </div>

        {/* Products Area */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <StoreToolbar
            productCount={loading ? 0 : sortedProducts.length}
            sortBy={currentSort}
            onSortChange={handleSortChange}
            viewMode={currentView}
            onViewModeChange={handleViewModeChange}
            loading={loading}
          />

          {/* Loading State */}
          {loading ? (
            <ProductGridSkeleton count={9} columns={3} />
          ) : error ? (
            <div className="text-center py-20 bg-[var(--color-dark-2)] border border-[var(--color-dark-3)]">
              <svg
                className="w-16 h-16 mx-auto text-[var(--color-main-1)]/50 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p className="text-white/60 text-lg mb-2">
                {error.includes('credentials') ? 'Configuration Required' : 'Failed to load products'}
              </p>
              <p className="text-white/40 text-sm mb-4">
                {error.includes('credentials') 
                  ? 'Add your CJ Dropshipping credentials to .env.local to fetch real products.'
                  : error
                }
              </p>
              {error.includes('credentials') && (
                <div className="text-left max-w-md mx-auto bg-[var(--color-dark-3)] p-4 rounded text-xs font-mono text-white/60">
                  <p className="mb-2">Add to .env.local:</p>
                  <p>CJ_DROPSHIPPING_EMAIL=your-email</p>
                  <p>CJ_DROPSHIPPING_PASSWORD=your-api-key</p>
                </div>
              )}
            </div>
          ) : sortedProducts.length > 0 ? (
            currentView === "grid" ? (
              <ProductGrid products={sortedProducts} columns={3} />
            ) : (
              <ProductList products={sortedProducts} />
            )
          ) : (
            <div className="text-center py-20 bg-[var(--color-dark-2)] border border-[var(--color-dark-3)]">
              <svg
                className="w-16 h-16 mx-auto text-white/20 mb-4"
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
              <p className="text-white/60 text-lg mb-2">
                No products found
              </p>
              <p className="text-white/40 text-sm">
                Try adjusting your filters or search terms
              </p>
            </div>
          )}

          <div className="nk-gap-4" />

          {/* Pagination - Godlike style */}
          {!loading && sortedProducts.length > 0 && (
            <div className="nk-pagination nk-pagination-center text-center">
              <nav className="inline-block align-middle">
                <a href="#" className="inline-block px-[9px] py-[9px] text-white no-underline transition-opacity hover:opacity-60 cursor-pointer">
                  1
                </a>
                <a href="#" className="inline-block px-[9px] py-[9px] text-white no-underline transition-opacity hover:opacity-60 cursor-pointer">
                  2
                </a>
                <a href="#" className="nk-pagination-current-white inline-block w-[34px] h-[34px] px-[6px] py-[6px] text-center leading-[22px] text-[var(--color-dark-1)] bg-white rounded-[17px] cursor-pointer">
                  3
                </a>
                <a href="#" className="inline-block px-[9px] py-[9px] text-white no-underline transition-opacity hover:opacity-60 cursor-pointer">
                  4
                </a>
                <span className="inline-block px-[9px] py-[9px] text-white">...</span>
              </nav>
            </div>
          )}
        </div>
      </div>

      <div className="nk-gap-4" />
    </div>
  );
}

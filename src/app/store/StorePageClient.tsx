"use client";

import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { ProductGrid } from "@/components/store";
import { ProductGridSkeleton } from "@/components/ui";
import { StoreFilters } from "./StoreFilters";
import { StoreToolbar } from "./StoreToolbar";
import { ProductList } from "./ProductList";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { useProducts } from "@/hooks";

const PRODUCTS_PER_PAGE = 15;

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
  currentPage?: number;
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
  currentPage = 1,
}: StorePageClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(currentPage);

  // Fetch products from API - get all then paginate client-side for smooth UX
  const { products, loading, error, pagination } = useProducts({
    category: currentCategory,
    keywords: currentSearch,
    minPrice: currentMinPrice,
    maxPrice: currentMaxPrice,
    inStock: currentInStock,
    featured: currentFeatured,
    sortBy: currentSort,
    limit: 200, // Fetch more for client-side pagination
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [currentCategory, currentSearch, currentMinPrice, currentMaxPrice, currentInStock, currentFeatured, currentSort]);

  // Scroll to products section when page changes (not on initial load)
  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    // Don't scroll on filter changes, only on pagination
  }, [currentCategory, currentSearch, currentMinPrice, currentMaxPrice, currentInStock, currentFeatured, currentSort]);

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

  // Pagination calculations
  const totalProducts = sortedProducts.length;
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);
  const startIndex = (page - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      // Scroll to top of page instantly
      window.scrollTo(0, 0);
    }
  }, [totalPages]);

  // Generate page numbers to display
  const getPageNumbers = useCallback(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible + 2) {
      // Show all pages if not many
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (page > 3) {
        pages.push('...');
      }
      
      // Show pages around current
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      if (page < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  }, [page, totalPages]);

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
            productCount={loading ? 0 : totalProducts}
            sortBy={currentSort}
            onSortChange={handleSortChange}
            viewMode={currentView}
            onViewModeChange={handleViewModeChange}
            loading={loading}
          />
          
          {/* Products count info */}
          {!loading && totalProducts > 0 && (
            <div className="mb-4 text-sm text-white/50">
              Showing {startIndex + 1}-{Math.min(endIndex, totalProducts)} of {totalProducts} products
            </div>
          )}

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
          ) : totalProducts > 0 ? (
            currentView === "grid" ? (
              <ProductGrid products={paginatedProducts} columns={3} />
            ) : (
              <ProductList products={paginatedProducts} />
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

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex flex-col items-center gap-4">
              {/* Page indicator */}
              <div className="text-sm text-white/40">
                Page <span className="text-[var(--color-main-1)] font-bold">{page}</span> of <span className="font-medium text-white/60">{totalPages}</span>
              </div>
              
              {/* Pagination controls */}
              <div className="flex items-center gap-2">
                {/* Previous button */}
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className={`
                    flex items-center gap-1 px-4 py-2 rounded-lg font-medium text-sm
                    transition-all duration-300 ease-out
                    ${page === 1 
                      ? 'bg-white/5 text-white/30 cursor-not-allowed' 
                      : 'bg-white/10 text-white hover:bg-[var(--color-main-1)] hover:text-black hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-main-1)]/20'
                    }
                  `}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Prev
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((pageNum, idx) => (
                    pageNum === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-white/40">•••</span>
                    ) : (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum as number)}
                        className={`
                          relative w-10 h-10 rounded-full font-bold text-sm
                          transition-all duration-300 ease-out
                          ${page === pageNum 
                            ? 'bg-gradient-to-br from-[var(--color-main-1)] to-[var(--color-main-2)] text-black scale-110 shadow-lg shadow-[var(--color-main-1)]/30' 
                            : 'bg-white/5 text-white/70 hover:bg-white/15 hover:text-white hover:scale-105'
                          }
                        `}
                      >
                        {pageNum}
                        {page === pageNum && (
                          <span className="absolute inset-0 rounded-full animate-ping bg-[var(--color-main-1)]/30" style={{ animationDuration: '2s' }} />
                        )}
                      </button>
                    )
                  ))}
                </div>

                {/* Next button */}
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className={`
                    flex items-center gap-1 px-4 py-2 rounded-lg font-medium text-sm
                    transition-all duration-300 ease-out
                    ${page === totalPages 
                      ? 'bg-white/5 text-white/30 cursor-not-allowed' 
                      : 'bg-white/10 text-white hover:bg-[var(--color-main-1)] hover:text-black hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-main-1)]/20'
                    }
                  `}
                >
                  Next
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Quick jump for many pages */}
              {totalPages > 5 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-white/40">Jump to:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={page === 1}
                      className="px-2 py-1 rounded bg-white/5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      First
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={page === totalPages}
                      className="px-2 py-1 rounded bg-white/5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="nk-gap-4" />
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useTransition, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Category {
  id: string;
  label: string;
}

interface StoreFiltersProps {
  categories: readonly Category[];
  currentCategory?: string;
  currentSearch?: string;
  currentMinPrice?: number;
  currentMaxPrice?: number;
  currentInStock?: boolean;
  currentFeatured?: boolean;
  currentOnSale?: boolean;
}

const PRICE_MIN = 0;
const PRICE_MAX = 500;

export function StoreFilters({
  categories,
  currentCategory,
  currentSearch,
  currentMinPrice,
  currentMaxPrice,
  currentInStock = false,
  currentFeatured = false,
  currentOnSale = false,
}: StoreFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  // Local state for controlled inputs
  const [searchValue, setSearchValue] = useState(currentSearch || "");
  const [priceRange, setPriceRange] = useState<[number, number]>([
    currentMinPrice ?? PRICE_MIN,
    currentMaxPrice ?? PRICE_MAX,
  ]);
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  // Sync local state with URL params
  useEffect(() => {
    setSearchValue(currentSearch || "");
    setPriceRange([currentMinPrice ?? PRICE_MIN, currentMaxPrice ?? PRICE_MAX]);
  }, [currentSearch, currentMinPrice, currentMaxPrice]);

  // Create query string helper
  const createQueryString = useCallback(
    (params: Record<string, string | undefined>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "" && value !== "false" && value !== "0" && value !== "500") {
          // Don't include default values
          if (key === "minPrice" && value === "0") {
            newParams.delete(key);
          } else if (key === "maxPrice" && value === "500") {
            newParams.delete(key);
          } else {
            newParams.set(key, value);
          }
        } else {
          newParams.delete(key);
        }
      });
      return newParams.toString();
    },
    [searchParams]
  );

  // Navigate with new params
  const navigateWithParams = useCallback(
    (params: Record<string, string | undefined>) => {
      startTransition(() => {
        const queryString = createQueryString(params);
        router.push(`/store${queryString ? `?${queryString}` : ""}`, { scroll: false });
      });
    },
    [createQueryString, router]
  );

  const handleCategoryChange = (categoryId: string) => {
    navigateWithParams({ category: categoryId === "all" ? undefined : categoryId });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigateWithParams({ search: searchValue || undefined });
  };

  const handlePriceChange = (index: number, value: number) => {
    const newRange: [number, number] = [...priceRange] as [number, number];
    newRange[index] = value;
    // Ensure min doesn't exceed max and vice versa
    if (index === 0 && value > priceRange[1]) {
      newRange[1] = value;
    } else if (index === 1 && value < priceRange[0]) {
      newRange[0] = value;
    }
    setPriceRange(newRange);
  };

  const handlePriceApply = () => {
    navigateWithParams({
      minPrice: priceRange[0] > PRICE_MIN ? priceRange[0].toString() : undefined,
      maxPrice: priceRange[1] < PRICE_MAX ? priceRange[1].toString() : undefined,
    });
  };

  const handleInStockChange = (checked: boolean) => {
    navigateWithParams({ inStock: checked ? "true" : undefined });
  };

  const handleFeaturedChange = (checked: boolean) => {
    navigateWithParams({ featured: checked ? "true" : undefined });
  };

  const handleOnSaleChange = (checked: boolean) => {
    navigateWithParams({ onSale: checked ? "true" : undefined });
  };

  const clearAllFilters = () => {
    setSearchValue("");
    setPriceRange([PRICE_MIN, PRICE_MAX]);
    startTransition(() => {
      router.push("/store", { scroll: false });
    });
  };

  // Count active filters
  const activeFilterCount = [
    currentCategory && currentCategory !== "all",
    currentSearch,
    currentMinPrice !== undefined && currentMinPrice > PRICE_MIN,
    currentMaxPrice !== undefined && currentMaxPrice < PRICE_MAX,
    currentInStock,
    currentFeatured,
    currentOnSale,
  ].filter(Boolean).length;

  return (
    <aside className="w-full bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] sticky top-28">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsFilterOpen(!isFilterOpen)}
        className="w-full flex items-center justify-between p-4 border-b border-[var(--color-dark-3)] cursor-pointer lg:cursor-default"
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className="font-heading text-lg">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-[var(--color-main-1)] text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <svg
          className={cn(
            "w-5 h-5 transition-transform lg:hidden",
            isFilterOpen ? "rotate-180" : ""
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {(isFilterOpen || typeof window !== "undefined" && window.innerWidth >= 1024) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden lg:!h-auto lg:!opacity-100"
          >
            <div className="p-5 space-y-6">
              {/* Search */}
              <div>
                <h3 className="font-heading text-sm uppercase tracking-wider text-white/70 mb-3">Search</h3>
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-white/40 focus:border-[var(--color-main-1)] focus:outline-none transition-colors text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-[var(--color-main-1)] transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </form>
                {currentSearch && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-white/50">Searching:</span>
                    <span className="text-xs px-2 py-1 bg-[var(--color-main-1)]/20 text-[var(--color-main-1)] rounded">
                      {currentSearch}
                    </span>
                    <button
                      onClick={() => navigateWithParams({ search: undefined })}
                      className="text-white/50 hover:text-white transition-colors cursor-pointer"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Categories */}
              <div>
                <h3 className="font-heading text-sm uppercase tracking-wider text-white/70 mb-3">Category</h3>
                <div className="space-y-1">
                  {categories.map((category) => {
                    const isActive = currentCategory === category.id || (!currentCategory && category.id === "all");
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryChange(category.id)}
                        disabled={isPending}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-all duration-200 rounded cursor-pointer",
                          isActive
                            ? "bg-[var(--color-main-1)]/20 text-[var(--color-main-1)] border-l-2 border-[var(--color-main-1)]"
                            : "text-white/70 hover:bg-[var(--color-dark-3)] hover:text-white"
                        )}
                      >
                        <span
                          className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                            isActive ? "border-[var(--color-main-1)]" : "border-white/30"
                          )}
                        >
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-[var(--color-main-1)]" />
                          )}
                        </span>
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="font-heading text-sm uppercase tracking-wider text-white/70 mb-3">Price Range</h3>
                <div className="space-y-4">
                  {/* Slider Track */}
                  <div className="relative h-2 bg-[var(--color-dark-4)] rounded-full">
                    <div
                      className="absolute h-full bg-[var(--color-main-1)] rounded-full"
                      style={{
                        left: `${(priceRange[0] / PRICE_MAX) * 100}%`,
                        right: `${100 - (priceRange[1] / PRICE_MAX) * 100}%`,
                      }}
                    />
                    <input
                      type="range"
                      min={PRICE_MIN}
                      max={PRICE_MAX}
                      value={priceRange[0]}
                      onChange={(e) => handlePriceChange(0, parseInt(e.target.value))}
                      className="absolute w-full h-full opacity-0 cursor-pointer"
                    />
                    <input
                      type="range"
                      min={PRICE_MIN}
                      max={PRICE_MAX}
                      value={priceRange[1]}
                      onChange={(e) => handlePriceChange(1, parseInt(e.target.value))}
                      className="absolute w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>

                  {/* Price Inputs */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-white/40 mb-1 block">Min</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">R</span>
                        <input
                          type="number"
                          min={PRICE_MIN}
                          max={PRICE_MAX}
                          value={priceRange[0]}
                          onChange={(e) => handlePriceChange(0, parseInt(e.target.value) || 0)}
                          onBlur={handlePriceApply}
                          onKeyDown={(e) => e.key === "Enter" && handlePriceApply()}
                          className="w-full pl-7 pr-3 py-2 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white text-sm focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <span className="text-white/30 mt-5">to</span>
                    <div className="flex-1">
                      <label className="text-xs text-white/40 mb-1 block">Max</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">R</span>
                        <input
                          type="number"
                          min={PRICE_MIN}
                          max={PRICE_MAX}
                          value={priceRange[1]}
                          onChange={(e) => handlePriceChange(1, parseInt(e.target.value) || 0)}
                          onBlur={handlePriceApply}
                          onKeyDown={(e) => e.key === "Enter" && handlePriceApply()}
                          className="w-full pl-7 pr-3 py-2 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white text-sm focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Apply Button */}
                  <button
                    onClick={handlePriceApply}
                    className="w-full py-2 text-xs bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] text-white/70 hover:text-white transition-colors cursor-pointer"
                  >
                    Apply Price Filter
                  </button>

                  {/* Active price filter indicator */}
                  {(currentMinPrice !== undefined || currentMaxPrice !== undefined) && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-[var(--color-main-1)]/20 text-[var(--color-main-1)] rounded">
                        R{currentMinPrice ?? 0} - R{currentMaxPrice ?? PRICE_MAX}
                      </span>
                      <button
                        onClick={() => {
                          setPriceRange([PRICE_MIN, PRICE_MAX]);
                          navigateWithParams({ minPrice: undefined, maxPrice: undefined });
                        }}
                        className="text-white/50 hover:text-white transition-colors cursor-pointer"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Availability & Special */}
              <div>
                <h3 className="font-heading text-sm uppercase tracking-wider text-white/70 mb-3">Availability & Special</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-2 cursor-pointer hover:bg-[var(--color-dark-3)] rounded transition-colors">
                    <div
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                        currentInStock
                          ? "bg-[var(--color-main-1)] border-[var(--color-main-1)]"
                          : "border-white/30 bg-transparent"
                      )}
                    >
                      {currentInStock && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={currentInStock}
                      onChange={(e) => handleInStockChange(e.target.checked)}
                      className="sr-only"
                    />
                    <span className="text-sm text-white/70">In Stock Only</span>
                  </label>

                  <label className="flex items-center gap-3 p-2 cursor-pointer hover:bg-[var(--color-dark-3)] rounded transition-colors">
                    <div
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                        currentFeatured
                          ? "bg-[var(--color-main-1)] border-[var(--color-main-1)]"
                          : "border-white/30 bg-transparent"
                      )}
                    >
                      {currentFeatured && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={currentFeatured}
                      onChange={(e) => handleFeaturedChange(e.target.checked)}
                      className="sr-only"
                    />
                    <span className="text-sm text-white/70">Featured</span>
                  </label>

                  <label className="flex items-center gap-3 p-2 cursor-pointer hover:bg-[var(--color-dark-3)] rounded transition-colors">
                    <div
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                        currentOnSale
                          ? "bg-[var(--color-main-1)] border-[var(--color-main-1)]"
                          : "border-white/30 bg-transparent"
                      )}
                    >
                      {currentOnSale && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={currentOnSale}
                      onChange={(e) => handleOnSaleChange(e.target.checked)}
                      className="sr-only"
                    />
                    <span className="text-sm text-white/70">On Sale</span>
                  </label>
                </div>
              </div>

              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="w-full py-3 border border-[var(--color-main-1)]/50 text-[var(--color-main-1)] hover:bg-[var(--color-main-1)]/10 transition-colors text-sm font-heading uppercase tracking-wider cursor-pointer"
                >
                  Clear All Filters ({activeFilterCount})
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface StoreToolbarProps {
  productCount: number;
  sortBy: string;
  onSortChange: (sort: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  loading?: boolean;
}

const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
  { value: "rating", label: "Top Rated" },
];

export function StoreToolbar({
  productCount,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  loading = false,
}: StoreToolbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const currentSort = sortOptions.find((opt) => opt.value === sortBy) || sortOptions[0];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] mb-6">
      {/* Product Count */}
      <div className="flex items-center gap-2">
        {loading ? (
          <div className="h-5 w-20 bg-[var(--color-dark-3)] animate-pulse rounded" />
        ) : (
          <>
            <span className="text-white font-heading">{productCount}</span>
            <span className="text-white/50 text-sm">
              {productCount === 1 ? "product" : "products"}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white text-sm hover:border-[var(--color-main-1)] transition-colors cursor-pointer min-w-[180px] justify-between"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <span>{currentSort.label}</span>
            </div>
            <svg
              className={cn(
                "w-4 h-4 text-white/50 transition-transform",
                isDropdownOpen ? "rotate-180" : ""
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-full bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] z-20 shadow-xl">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSortChange(option.value);
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2.5 text-left text-sm transition-colors cursor-pointer",
                      sortBy === option.value
                        ? "bg-[var(--color-main-1)]/20 text-[var(--color-main-1)]"
                        : "text-white/70 hover:bg-[var(--color-dark-3)] hover:text-white"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-[var(--color-dark-3)] border border-[var(--color-dark-4)]">
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "p-2.5 transition-colors cursor-pointer",
              viewMode === "grid"
                ? "bg-[var(--color-main-1)] text-white"
                : "text-white/50 hover:text-white"
            )}
            aria-label="Grid view"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={cn(
              "p-2.5 transition-colors cursor-pointer",
              viewMode === "list"
                ? "bg-[var(--color-main-1)] text-white"
                : "text-white/50 hover:text-white"
            )}
            aria-label="List view"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}


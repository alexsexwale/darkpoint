"use client";

import { clsx } from "clsx";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  circle?: boolean;
}

export function Skeleton({
  className,
  width,
  height,
  rounded = false,
  circle = false,
}: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse bg-gradient-to-r from-[var(--color-dark-3)] via-[var(--color-dark-4)] to-[var(--color-dark-3)] bg-[length:200%_100%]",
        circle && "rounded-full",
        rounded && !circle && "rounded-lg",
        className
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        animation: "shimmer 1.5s ease-in-out infinite",
      }}
    />
  );
}

// Add shimmer animation to globals.scss
export function ProductCardSkeleton() {
  return (
    <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] overflow-hidden">
      {/* Image skeleton */}
      <div className="relative aspect-square bg-[var(--color-dark-3)]">
        <Skeleton className="absolute inset-0" />
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Category */}
        <Skeleton className="h-3 w-16" rounded />
        
        {/* Title */}
        <Skeleton className="h-5 w-3/4" rounded />
        
        {/* Rating */}
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-4" rounded />
          ))}
          <Skeleton className="h-3 w-12 ml-2" rounded />
        </div>
        
        {/* Price */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-20" rounded />
          <Skeleton className="h-8 w-8" rounded />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6, columns = 3 }: { count?: number; columns?: number }) {
  return (
    <div
      className={clsx(
        "grid gap-6",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      )}
    >
      {[...Array(count)].map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="container py-8">
      <div className="nk-gap-2" />
      
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2 mb-8">
        <Skeleton className="h-4 w-12" rounded />
        <span className="text-white/20">/</span>
        <Skeleton className="h-4 w-12" rounded />
        <span className="text-white/20">/</span>
        <Skeleton className="h-4 w-32" rounded />
      </div>
      
      {/* Product details */}
      <div className="grid lg:grid-cols-2 gap-12">
        {/* Gallery skeleton */}
        <div className="space-y-4">
          <div className="aspect-square bg-[var(--color-dark-3)]">
            <Skeleton className="w-full h-full" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square bg-[var(--color-dark-3)]">
                <Skeleton className="w-full h-full" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Info skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-4 w-20" rounded />
          <Skeleton className="h-10 w-3/4" rounded />
          
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-5 w-5" rounded />
              ))}
            </div>
            <Skeleton className="h-4 w-24" rounded />
          </div>
          
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" rounded />
            <Skeleton className="h-4 w-full" rounded />
            <Skeleton className="h-4 w-2/3" rounded />
          </div>
          
          <Skeleton className="h-12 w-32" rounded />
          
          <div className="flex items-center gap-2">
            <Skeleton className="w-2 h-2" circle />
            <Skeleton className="h-4 w-16" rounded />
          </div>
          
          <div className="flex gap-4 pt-4">
            <Skeleton className="h-12 flex-1" rounded />
            <Skeleton className="h-12 w-32" rounded />
          </div>
          
          <Skeleton className="h-12 w-full" rounded />
        </div>
      </div>
    </div>
  );
}

export function CategoryBannerSkeleton() {
  return (
    <div className="group relative aspect-square overflow-hidden bg-[var(--color-dark-3)] border border-[var(--color-dark-4)]">
      <Skeleton className="absolute inset-0" />
      <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
        <Skeleton className="h-6 w-24" rounded />
        <Skeleton className="h-4 w-32" rounded />
      </div>
    </div>
  );
}

export function SearchResultsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-[var(--color-dark-2)] border border-[var(--color-dark-3)]">
          <Skeleton className="w-16 h-16 flex-shrink-0" rounded />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" rounded />
            <Skeleton className="h-4 w-full" rounded />
            <Skeleton className="h-5 w-20" rounded />
          </div>
        </div>
      ))}
    </div>
  );
}



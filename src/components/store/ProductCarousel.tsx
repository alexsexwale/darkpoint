"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ProductCard } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductCarouselProps {
  products: Product[];
  autoplay?: boolean;
  autoplayDelay?: number;
  /** Start one position "back" (last snap) so the first product is partially off-screen, suggesting more content to the left */
  startOneBack?: boolean;
}

export function ProductCarousel({ 
  products, 
  autoplay = false,
  autoplayDelay = 4000,
  startOneBack = false,
}: ProductCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const startOneBackApplied = useRef(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
    skipSnaps: false,
    slidesToScroll: 1,
    containScroll: "trimSnaps",
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Re-initialize when products change, after layout so Embla measures correct slide sizes
  useEffect(() => {
    if (!emblaApi || products.length === 0) return;
    startOneBackApplied.current = false;
    const raf = requestAnimationFrame(() => {
      emblaApi.reInit();
    });
    return () => cancelAnimationFrame(raf);
  }, [emblaApi, products.length]);

  // Start one position "back" (last snap) so first product is partially off-screen
  useEffect(() => {
    if (!startOneBack || !emblaApi || scrollSnaps.length <= 1 || startOneBackApplied.current) return;
    const lastIndex = scrollSnaps.length - 1;
    const raf = requestAnimationFrame(() => {
      emblaApi.scrollTo(lastIndex);
      startOneBackApplied.current = true;
    });
    return () => cancelAnimationFrame(raf);
  }, [startOneBack, emblaApi, scrollSnaps.length]);

  // Autoplay
  useEffect(() => {
    if (!autoplay || !emblaApi) return;

    const intervalId = setInterval(() => {
      emblaApi.scrollNext();
    }, autoplayDelay);

    return () => clearInterval(intervalId);
  }, [autoplay, autoplayDelay, emblaApi]);

  if (products.length === 0) {
    return null;
  }

  // Remount when slide count changes so Embla initializes with correct measurements
  return (
    <div key={`carousel-${products.length}`} className="relative w-full min-w-0">
      {/* Viewport: overflow hidden + bounded width so slides overflow and scroll works */}
      <div className="overflow-hidden w-full min-w-0" ref={emblaRef}>
        <div
          className="flex touch-pan-y"
          style={{ backfaceVisibility: "hidden" }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="shrink-0 grow-0 min-w-0 basis-[80%] sm:basis-[48%] md:basis-[33.333%] lg:basis-[25%] px-2"
            >
              <ProductCard product={product} singleImage />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {products.length > 1 && (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            className="absolute left-1 top-[35%] -translate-y-1/2 z-20 w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center bg-black/80 border border-[var(--color-main-1)] text-white rounded-sm transition-all duration-200 hover:bg-[var(--color-main-1)]"
            aria-label="Previous products"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={scrollNext}
            className="absolute right-1 top-[35%] -translate-y-1/2 z-20 w-8 h-8 lg:w-9 lg:h-9 flex items-center justify-center bg-black/80 border border-[var(--color-main-1)] text-white rounded-sm transition-all duration-200 hover:bg-[var(--color-main-1)]"
            aria-label="Next products"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots Pagination */}
      {scrollSnaps.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                selectedIndex === index
                  ? "w-5 bg-[var(--color-main-1)]"
                  : "bg-white/30 hover:bg-white/50"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

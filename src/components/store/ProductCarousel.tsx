"use client";

import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ProductCard } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductCarouselProps {
  products: Product[];
  title?: string;
  autoplay?: boolean;
  autoplayDelay?: number;
}

export function ProductCarousel({ 
  products, 
  autoplay = false,
  autoplayDelay = 4000 
}: ProductCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
    skipSnaps: false,
    slidesToScroll: 1,
    breakpoints: {
      "(min-width: 768px)": { slidesToScroll: 2 },
      "(min-width: 1024px)": { slidesToScroll: 3 },
    },
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

  return (
    <div className="relative">
      {/* Carousel */}
      <div className="embla overflow-hidden" ref={emblaRef}>
        <div className="embla__container flex">
          {products.map((product) => (
            <div
              key={product.id}
              className="embla__slide flex-[0_0_100%] min-w-0 px-2 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {products.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 lg:-translate-x-4 z-10 w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center bg-[var(--color-dark-2)] border border-[var(--color-dark-4)] hover:border-[var(--color-main-1)] hover:bg-[var(--color-dark-3)] text-white transition-all duration-200"
            aria-label="Previous products"
          >
            <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 lg:translate-x-4 z-10 w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center bg-[var(--color-dark-2)] border border-[var(--color-dark-4)] hover:border-[var(--color-main-1)] hover:bg-[var(--color-dark-3)] text-white transition-all duration-200"
            aria-label="Next products"
          >
            <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots Pagination */}
      {scrollSnaps.length > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                selectedIndex === index
                  ? "w-6 bg-[var(--color-main-1)]"
                  : "bg-[var(--color-dark-4)] hover:bg-[var(--color-dark-3)]"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

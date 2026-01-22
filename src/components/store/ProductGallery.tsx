"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types";

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

const PLACEHOLDER_IMAGE = "/images/placeholder.png";

// Validate and sanitize image URL
function isValidImageUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  
  // Sanitize and validate images
  const validImages = useMemo(() => {
    const sanitized = images
      .map((img) => ({
        ...img,
        src: isValidImageUrl(img.src) ? img.src : PLACEHOLDER_IMAGE,
      }))
      .filter((img) => !failedImages.has(img.src) || img.src === PLACEHOLDER_IMAGE);
    
    // Always have at least one image
    if (sanitized.length === 0) {
      return [{ id: 'placeholder', src: PLACEHOLDER_IMAGE, alt: productName }];
    }
    
    return sanitized;
  }, [images, failedImages, productName]);
  
  const handleImageError = (src: string) => {
    if (src !== PLACEHOLDER_IMAGE) {
      setFailedImages((prev) => new Set([...prev, src]));
    }
  };
  
  const [emblaMainRef, emblaMainApi] = useEmblaCarousel({ loop: true });
  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
  });
  const [emblaLightboxRef, emblaLightboxApi] = useEmblaCarousel({ 
    loop: true,
    startIndex: selectedIndex 
  });

  const onThumbClick = useCallback(
    (index: number) => {
      if (!emblaMainApi || !emblaThumbsApi) return;
      emblaMainApi.scrollTo(index);
    },
    [emblaMainApi, emblaThumbsApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaMainApi || !emblaThumbsApi) return;
    setSelectedIndex(emblaMainApi.selectedScrollSnap());
    emblaThumbsApi.scrollTo(emblaMainApi.selectedScrollSnap());
  }, [emblaMainApi, emblaThumbsApi]);

  // Navigation callbacks - defined before useEffects that use them
  const scrollPrev = useCallback(() => {
    if (emblaMainApi) emblaMainApi.scrollPrev();
  }, [emblaMainApi]);

  const scrollNext = useCallback(() => {
    if (emblaMainApi) emblaMainApi.scrollNext();
  }, [emblaMainApi]);

  const lightboxScrollPrev = useCallback(() => {
    if (emblaLightboxApi) emblaLightboxApi.scrollPrev();
  }, [emblaLightboxApi]);

  const lightboxScrollNext = useCallback(() => {
    if (emblaLightboxApi) emblaLightboxApi.scrollNext();
  }, [emblaLightboxApi]);

  useEffect(() => {
    if (!emblaMainApi) return;
    onSelect();
    emblaMainApi.on("select", onSelect);
    emblaMainApi.on("reInit", onSelect);
  }, [emblaMainApi, onSelect]);

  // Sync lightbox carousel when opening
  useEffect(() => {
    if (isLightboxOpen && emblaLightboxApi) {
      emblaLightboxApi.scrollTo(selectedIndex, true);
    }
  }, [isLightboxOpen, emblaLightboxApi, selectedIndex]);

  // Update selectedIndex when lightbox carousel changes
  useEffect(() => {
    if (!emblaLightboxApi) return;
    
    const onLightboxSelect = () => {
      const index = emblaLightboxApi.selectedScrollSnap();
      setSelectedIndex(index);
      // Also sync main carousel
      if (emblaMainApi) {
        emblaMainApi.scrollTo(index, true);
      }
    };
    
    emblaLightboxApi.on("select", onLightboxSelect);
    return () => {
      emblaLightboxApi.off("select", onLightboxSelect);
    };
  }, [emblaLightboxApi, emblaMainApi]);

  // Handle keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      } else if (e.key === "ArrowLeft") {
        lightboxScrollPrev();
      } else if (e.key === "ArrowRight") {
        lightboxScrollNext();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, lightboxScrollPrev, lightboxScrollNext]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLightboxOpen]);

  // Handle mouse move for zoom effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  const openLightbox = () => {
    setIsLightboxOpen(true);
  };

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        {/* Main Image */}
        <div className="relative bg-[var(--color-dark-2)] rounded-lg sm:rounded-none overflow-hidden">
          <div className="embla" ref={emblaMainRef}>
            <div className="embla__container flex">
              {validImages.map((image, index) => (
                <div key={image.id} className="embla__slide flex-[0_0_100%] min-w-0">
                  <div 
                    className="relative aspect-[4/3] sm:aspect-square cursor-zoom-in overflow-hidden"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onMouseMove={handleMouseMove}
                    onClick={openLightbox}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt || `${productName} - Image ${index + 1}`}
                      fill
                      className={cn(
                        "object-contain p-4 sm:p-8 transition-transform duration-300 ease-out",
                        isHovered && selectedIndex === index && "scale-150"
                      )}
                      style={isHovered && selectedIndex === index ? {
                        transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`
                      } : undefined}
                      priority={index === 0}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      onError={() => handleImageError(image.src)}
                    />
                    
                    {/* Zoom hint - hidden on mobile */}
                    <div className={cn(
                      "absolute bottom-3 right-3 sm:bottom-4 sm:right-4 px-2 py-1 sm:px-3 sm:py-1.5 bg-black/70 text-white text-[10px] sm:text-xs flex items-center gap-1.5 sm:gap-2 transition-opacity duration-200",
                      isHovered ? "opacity-0" : "opacity-100"
                    )}>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                      <span className="hidden sm:inline">Click to expand</span>
                      <span className="sm:hidden">Tap</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          {validImages.length > 1 && (
            <>
              <button
                onClick={scrollPrev}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-black/60 text-white hover:bg-[var(--color-main-1)] transition-colors z-10 cursor-pointer rounded-full sm:rounded-none"
                aria-label="Previous image"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={scrollNext}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-black/60 text-white hover:bg-[var(--color-main-1)] transition-colors z-10 cursor-pointer rounded-full sm:rounded-none"
                aria-label="Next image"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Thumbnails - Horizontal scroll on mobile */}
        {validImages.length > 1 && (
          <div className="embla -mx-4 px-4 sm:mx-0 sm:px-0" ref={emblaThumbsRef}>
            <div className="embla__container flex gap-2 sm:gap-3">
              {validImages.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => onThumbClick(index)}
                  className={cn(
                    "flex-[0_0_60px] sm:flex-[0_0_80px] min-w-0 aspect-square bg-[var(--color-dark-2)] p-1.5 sm:p-2 border-2 transition-colors cursor-pointer rounded-md sm:rounded-none",
                    selectedIndex === index
                      ? "border-[var(--color-main-1)]"
                      : "border-transparent hover:border-[var(--color-dark-4)]"
                  )}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={image.src}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-contain"
                      sizes="80px"
                      onError={() => handleImageError(image.src)}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
            onClick={() => setIsLightboxOpen(false)}
          >
            {/* Close button */}
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white transition-colors z-10 cursor-pointer"
              aria-label="Close lightbox"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image counter */}
            <div className="absolute top-6 left-6 text-white/70 text-sm">
              {selectedIndex + 1} / {validImages.length}
            </div>

            {/* Lightbox Carousel */}
            <div 
              className="w-full h-full max-w-6xl max-h-[90vh] px-16"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="embla h-full" ref={emblaLightboxRef}>
                <div className="embla__container flex h-full">
                  {validImages.map((image, index) => (
                    <div key={image.id} className="embla__slide flex-[0_0_100%] min-w-0 flex items-center justify-center">
                      <div className="relative w-full h-full">
                        <Image
                          src={image.src}
                          alt={image.alt || `${productName} - Image ${index + 1}`}
                          fill
                          className="object-contain"
                          sizes="100vw"
                          onError={() => handleImageError(image.src)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Lightbox Navigation */}
            {validImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    lightboxScrollPrev();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center bg-white/10 text-white hover:bg-[var(--color-main-1)] transition-colors cursor-pointer"
                  aria-label="Previous image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    lightboxScrollNext();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center bg-white/10 text-white hover:bg-[var(--color-main-1)] transition-colors cursor-pointer"
                  aria-label="Next image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Thumbnail strip at bottom */}
            {validImages.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {validImages.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      emblaLightboxApi?.scrollTo(index);
                    }}
                    className={cn(
                      "w-16 h-16 bg-[var(--color-dark-2)] p-1 border-2 transition-all cursor-pointer",
                      index === selectedIndex
                        ? "border-[var(--color-main-1)] opacity-100"
                        : "border-transparent opacity-50 hover:opacity-100"
                    )}
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src={image.src}
                        alt={`Thumbnail ${index + 1}`}
                        fill
                        className="object-contain"
                        sizes="64px"
                        onError={() => handleImageError(image.src)}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

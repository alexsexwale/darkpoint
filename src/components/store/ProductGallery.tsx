"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types";

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
  variantImage?: string | null;
}

const PLACEHOLDER_IMAGE = "/images/placeholder.png";

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

export function ProductGallery({ images, productName, variantImage }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const prevVariantImageRef = useRef<string | null>(null);
  
  // Build the images array, including variant image at the start if it exists and is different
  const validImages = useMemo(() => {
    const baseImages = images
      .map((img) => ({
        ...img,
        src: isValidImageUrl(img.src) ? img.src : PLACEHOLDER_IMAGE,
      }))
      .filter((img) => !failedImages.has(img.src) || img.src === PLACEHOLDER_IMAGE);
    
    // If we have a variant image that's not already in the array, add it at the start
    if (variantImage && isValidImageUrl(variantImage)) {
      const variantExists = baseImages.some(img => img.src === variantImage);
      if (!variantExists && !failedImages.has(variantImage)) {
        return [
          { id: 'variant-image', src: variantImage, alt: `${productName} - Selected Variant` },
          ...baseImages
        ];
      }
    }
    
    if (baseImages.length === 0) {
      return [{ id: 'placeholder', src: PLACEHOLDER_IMAGE, alt: productName }];
    }
    return baseImages;
  }, [images, failedImages, productName, variantImage]);
  
  const handleImageError = (src: string) => {
    if (src !== PLACEHOLDER_IMAGE) {
      setFailedImages((prev) => new Set([...prev, src]));
    }
  };
  
  // Desktop carousel
  const [emblaMainRef, emblaMainApi] = useEmblaCarousel({ loop: true });
  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
  });
  
  // Mobile carousel (separate instance)
  const [emblaMobileRef, emblaMobileApi] = useEmblaCarousel({ loop: true });

  // Reinitialize Embla when images array changes
  useEffect(() => {
    if (emblaMainApi) {
      emblaMainApi.reInit();
    }
    if (emblaThumbsApi) {
      emblaThumbsApi.reInit();
    }
    if (emblaMobileApi) {
      emblaMobileApi.reInit();
    }
  }, [validImages, emblaMainApi, emblaThumbsApi, emblaMobileApi]);

  // When variant image changes (not on every render), scroll to show it
  // This only triggers when the user selects a different variant, not when manually scrolling
  useEffect(() => {
    // Only scroll if the variant image actually changed
    if (variantImage && variantImage !== prevVariantImageRef.current) {
      prevVariantImageRef.current = variantImage;
      
      // Small delay to ensure Embla has reinitialized with new images
      setTimeout(() => {
        // Find the variant image in the gallery
        const variantImageIndex = validImages.findIndex(img => img.src === variantImage);
        
        if (variantImageIndex !== -1) {
          // Scroll both desktop and mobile carousels
          if (emblaMainApi) {
            emblaMainApi.scrollTo(variantImageIndex);
          }
          if (emblaMobileApi) {
            emblaMobileApi.scrollTo(variantImageIndex);
          }
          setSelectedIndex(variantImageIndex);
        }
      }, 50);
    } else if (!variantImage) {
      prevVariantImageRef.current = null;
    }
  }, [variantImage, validImages, emblaMainApi, emblaMobileApi]);

  // Desktop thumbnail click
  const onThumbClick = useCallback(
    (index: number) => {
      if (emblaMainApi) {
        emblaMainApi.scrollTo(index);
      }
      if (emblaThumbsApi) {
        emblaThumbsApi.scrollTo(index);
      }
    },
    [emblaMainApi, emblaThumbsApi]
  );

  // Mobile thumbnail click
  const onMobileThumbClick = useCallback(
    (index: number) => {
      if (emblaMobileApi) {
        emblaMobileApi.scrollTo(index);
      }
      setSelectedIndex(index);
    },
    [emblaMobileApi]
  );

  // Desktop carousel select handler
  const onSelect = useCallback(() => {
    if (!emblaMainApi) return;
    const index = emblaMainApi.selectedScrollSnap();
    setSelectedIndex(index);
    if (emblaThumbsApi) {
      emblaThumbsApi.scrollTo(index);
    }
  }, [emblaMainApi, emblaThumbsApi]);

  // Mobile carousel select handler
  const onMobileSelect = useCallback(() => {
    if (!emblaMobileApi) return;
    setSelectedIndex(emblaMobileApi.selectedScrollSnap());
  }, [emblaMobileApi]);

  // Desktop scroll functions
  const scrollPrev = useCallback(() => {
    if (emblaMainApi) emblaMainApi.scrollPrev();
  }, [emblaMainApi]);

  const scrollNext = useCallback(() => {
    if (emblaMainApi) emblaMainApi.scrollNext();
  }, [emblaMainApi]);

  // Mobile scroll functions
  const scrollMobilePrev = useCallback(() => {
    if (emblaMobileApi) emblaMobileApi.scrollPrev();
  }, [emblaMobileApi]);

  const scrollMobileNext = useCallback(() => {
    if (emblaMobileApi) emblaMobileApi.scrollNext();
  }, [emblaMobileApi]);

  // Desktop carousel event binding
  useEffect(() => {
    if (!emblaMainApi) return;
    onSelect();
    emblaMainApi.on("select", onSelect);
    emblaMainApi.on("reInit", onSelect);
    return () => {
      emblaMainApi.off("select", onSelect);
      emblaMainApi.off("reInit", onSelect);
    };
  }, [emblaMainApi, onSelect]);

  // Mobile carousel event binding
  useEffect(() => {
    if (!emblaMobileApi) return;
    onMobileSelect();
    emblaMobileApi.on("select", onMobileSelect);
    emblaMobileApi.on("reInit", onMobileSelect);
    return () => {
      emblaMobileApi.off("select", onMobileSelect);
      emblaMobileApi.off("reInit", onMobileSelect);
    };
  }, [emblaMobileApi, onMobileSelect]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === "Escape") setIsLightboxOpen(false);
      else if (e.key === "ArrowLeft") setSelectedIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
      else if (e.key === "ArrowRight") setSelectedIndex((prev) => (prev + 1) % validImages.length);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, validImages.length]);

  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isLightboxOpen]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  return (
    <>
      {/* Desktop Gallery */}
      <div className="hidden lg:block space-y-4">
        <div className="relative bg-[var(--color-dark-2)] overflow-hidden">
          <div className="embla" ref={emblaMainRef}>
            <div className="embla__container flex">
              {validImages.map((image, index) => (
                <div key={image.id} className="embla__slide flex-[0_0_100%] min-w-0">
                  <div 
                    className="relative aspect-square cursor-zoom-in overflow-hidden"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onMouseMove={handleMouseMove}
                    onClick={() => setIsLightboxOpen(true)}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt || `${productName} - Image ${index + 1}`}
                      fill
                      className={cn(
                        "object-contain p-8 transition-transform duration-300 ease-out",
                        isHovered && selectedIndex === index && "scale-150"
                      )}
                      style={isHovered && selectedIndex === index ? {
                        transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`
                      } : undefined}
                      priority={index === 0}
                      sizes="50vw"
                      onError={() => handleImageError(image.src)}
                    />
                    
                    <div className={cn(
                      "absolute bottom-4 right-4 px-3 py-1.5 bg-black/70 text-white text-xs flex items-center gap-2 transition-opacity duration-200",
                      isHovered ? "opacity-0" : "opacity-100"
                    )}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                      Click to expand
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {validImages.length > 1 && (
            <>
              <button
                onClick={scrollPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/50 text-white hover:bg-[var(--color-main-1)] transition-colors z-10 cursor-pointer"
                aria-label="Previous image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={scrollNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/50 text-white hover:bg-[var(--color-main-1)] transition-colors z-10 cursor-pointer"
                aria-label="Next image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {validImages.length > 1 && (
          <div className="embla" ref={emblaThumbsRef}>
            <div className="embla__container flex gap-3">
              {validImages.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => onThumbClick(index)}
                  className={cn(
                    "flex-[0_0_80px] min-w-0 aspect-square bg-[var(--color-dark-2)] p-2 border-2 transition-colors cursor-pointer",
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

      {/* Mobile Gallery */}
      <div className="lg:hidden w-full">
        <div className="relative overflow-hidden embla" ref={emblaMobileRef}>
          <div className="embla__container flex">
            {validImages.map((image, index) => (
              <div 
                key={image.id} 
                className="embla__slide flex-[0_0_100%] min-w-0"
                onClick={() => setIsLightboxOpen(true)}
              >
                <div className="relative aspect-square bg-[var(--color-dark-2)]">
                  <Image
                    src={image.src}
                    alt={image.alt || `${productName} - ${index + 1}`}
                    fill
                    className="object-contain p-4"
                    priority={index === 0}
                    sizes="100vw"
                    onError={() => handleImageError(image.src)}
                  />
                </div>
              </div>
            ))}
          </div>
          
          {validImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); scrollMobilePrev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/50 text-white rounded-full z-10"
                aria-label="Previous"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); scrollMobileNext(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/50 text-white rounded-full z-10"
                aria-label="Next"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {validImages.length > 1 && (
          <div className="flex gap-2 p-2 overflow-x-auto">
            {validImages.map((image, index) => (
              <button
                key={image.id}
                onClick={() => onMobileThumbClick(index)}
                className={cn(
                  "w-14 h-14 flex-shrink-0 bg-[var(--color-dark-3)] p-1 border-2 transition-colors",
                  selectedIndex === index ? "border-white" : "border-transparent"
                )}
              >
                <div className="relative w-full h-full">
                  <Image
                    src={image.src}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-contain"
                    sizes="56px"
                    onError={() => handleImageError(image.src)}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
            onClick={() => setIsLightboxOpen(false)}
          >
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white transition-colors z-10 cursor-pointer"
              aria-label="Close lightbox"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="absolute top-6 left-6 text-white/70 text-sm">
              {selectedIndex + 1} / {validImages.length}
            </div>

            <div className="w-full h-full max-w-6xl max-h-[90vh] px-4 lg:px-16 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <div className="relative w-full h-full">
                <Image
                  src={validImages[selectedIndex].src}
                  alt={validImages[selectedIndex].alt || productName}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  onError={() => handleImageError(validImages[selectedIndex].src)}
                />
              </div>
            </div>

            {validImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedIndex((prev) => (prev - 1 + validImages.length) % validImages.length); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center bg-white/10 text-white hover:bg-[var(--color-main-1)] transition-colors cursor-pointer"
                  aria-label="Previous image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedIndex((prev) => (prev + 1) % validImages.length); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center bg-white/10 text-white hover:bg-[var(--color-main-1)] transition-colors cursor-pointer"
                  aria-label="Next image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {validImages.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {validImages.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedIndex(index); }}
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

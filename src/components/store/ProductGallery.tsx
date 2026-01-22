"use client";

import { useState, useMemo } from "react";
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
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  
  const validImages = useMemo(() => {
    const sanitized = images
      .map((img) => ({
        ...img,
        src: isValidImageUrl(img.src) ? img.src : PLACEHOLDER_IMAGE,
      }))
      .filter((img) => !failedImages.has(img.src) || img.src === PLACEHOLDER_IMAGE);
    
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
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  const scrollTo = (index: number) => {
    if (emblaApi) {
      emblaApi.scrollTo(index);
      setSelectedIndex(index);
    }
  };

  // Sync selected index with embla
  emblaApi?.on("select", () => {
    setSelectedIndex(emblaApi.selectedScrollSnap());
  });

  return (
    <>
      <div className="w-full">
        {/* Main Image Carousel */}
        <div className="relative overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {validImages.map((image, index) => (
              <div 
                key={image.id} 
                className="flex-[0_0_100%] min-w-0"
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
          
          {/* Nav arrows */}
          {validImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); emblaApi?.scrollPrev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/50 text-white rounded-full z-10"
                aria-label="Previous"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); emblaApi?.scrollNext(); }}
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

        {/* Thumbnails */}
        {validImages.length > 1 && (
          <div className="flex gap-2 p-2 overflow-x-auto">
            {validImages.map((image, index) => (
              <button
                key={image.id}
                onClick={() => scrollTo(index)}
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
            className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
            onClick={() => setIsLightboxOpen(false)}
          >
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white z-10"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="absolute top-4 left-4 text-white/70 text-sm">
              {selectedIndex + 1} / {validImages.length}
            </div>

            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="relative w-full h-full max-w-4xl">
                <Image
                  src={validImages[selectedIndex].src}
                  alt={validImages[selectedIndex].alt || productName}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
            </div>

            {validImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedIndex((selectedIndex - 1 + validImages.length) % validImages.length); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/10 text-white"
                  aria-label="Previous"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedIndex((selectedIndex + 1) % validImages.length); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/10 text-white"
                  aria-label="Next"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

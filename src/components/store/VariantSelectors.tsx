"use client";

import { useMemo } from "react";
import Image from "next/image";
import { cn, formatPrice } from "@/lib/utils";
import type { ProductVariant } from "@/types";

interface VariantSelectorsProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onVariantChange: (variant: ProductVariant) => void;
}

// Extended color mappings with gradients for special colors
const COLOR_MAP: Record<string, { hex: string; gradient?: string }> = {
  black: { hex: "#1a1a1a" },
  white: { hex: "#FFFFFF" },
  red: { hex: "#DC2626" },
  blue: { hex: "#3B82F6" },
  green: { hex: "#22C55E" },
  orange: { hex: "#F97316" },
  yellow: { hex: "#EAB308" },
  pink: { hex: "#EC4899" },
  purple: { hex: "#A855F7" },
  gray: { hex: "#6B7280" },
  grey: { hex: "#6B7280" },
  brown: { hex: "#92400E" },
  navy: { hex: "#1E3A8A" },
  gold: { hex: "#D4AF37", gradient: "linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%)" },
  silver: { hex: "#C0C0C0", gradient: "linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 50%, #C0C0C0 100%)" },
  beige: { hex: "#D4C4A8" },
  cyan: { hex: "#06B6D4" },
  teal: { hex: "#14B8A6" },
  coral: { hex: "#FF6B6B" },
  khaki: { hex: "#C3B091" },
  rose: { hex: "#FB7185" },
  lime: { hex: "#84CC16" },
  indigo: { hex: "#6366F1" },
  violet: { hex: "#8B5CF6" },
  amber: { hex: "#F59E0B" },
  emerald: { hex: "#10B981" },
  sky: { hex: "#0EA5E9" },
  slate: { hex: "#64748B" },
  zinc: { hex: "#71717A" },
  stone: { hex: "#78716C" },
  neutral: { hex: "#737373" },
  rainbow: { hex: "#FF0000", gradient: "linear-gradient(135deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #8B00FF)" },
  multicolor: { hex: "#FF0000", gradient: "linear-gradient(135deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4)" },
};

// Size order for sorting
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL"];

// Storage/Memory sizes order
const MEMORY_ORDER = ["4GB", "8GB", "16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"];

// Extract the actual attribute from variant name (handles "PRODUCT NAME COLOR" format)
function extractAttributeFromName(fullName: string): string {
  if (!fullName) return "";
  
  const name = fullName.trim();
  const lowerName = name.toLowerCase();
  
  // Check if the last word is a known color
  const words = name.split(/[\s_-]+/);
  const lastWord = words[words.length - 1];
  const lastWordLower = lastWord.toLowerCase();
  
  if (COLOR_MAP[lastWordLower]) {
    return lastWord;
  }
  
  // Check last two words for compound colors like "Light Blue", "Dark Green"
  if (words.length >= 2) {
    const lastTwoWords = words.slice(-2).join(" ");
    const lastTwoLower = lastTwoWords.toLowerCase();
    for (const color of Object.keys(COLOR_MAP)) {
      if (lastTwoLower.includes(color)) {
        return lastTwoWords;
      }
    }
  }
  
  // Check for size patterns at the end
  const sizeMatch = name.match(/\b(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|\d+GB|\d+TB)\s*$/i);
  if (sizeMatch) {
    return sizeMatch[1].toUpperCase();
  }
  
  // Check for any color word anywhere in the last part
  for (const color of Object.keys(COLOR_MAP)) {
    if (lastWordLower === color || lastWordLower.includes(color)) {
      // Capitalize first letter
      return color.charAt(0).toUpperCase() + color.slice(1);
    }
  }
  
  // Return the last word as fallback (but limit length)
  if (lastWord.length <= 20) {
    return lastWord;
  }
  
  // If all else fails, return shortened version
  return name.length > 20 ? name.slice(-20) + "..." : name;
}

// Parse variant to determine its type and display value
function parseVariantAttribute(variant: ProductVariant): { 
  type: "size" | "color" | "other"; 
  value: string; 
  display: string;
  colorInfo?: { hex: string; gradient?: string };
} {
  // First try to use the value field if it exists and is short
  let rawValue = variant.value || variant.name || "";
  
  // If value is too long (contains product name), extract the attribute
  if (rawValue.length > 30) {
    rawValue = extractAttributeFromName(rawValue);
  }
  
  const lowerValue = rawValue.toLowerCase().trim();
  
  // Check if it's a color
  for (const [colorName, colorData] of Object.entries(COLOR_MAP)) {
    if (lowerValue === colorName || lowerValue.includes(colorName)) {
      return {
        type: "color",
        value: colorName,
        display: colorName.charAt(0).toUpperCase() + colorName.slice(1),
        colorInfo: colorData,
      };
    }
  }
  
  // Check if it's a size/memory
  const upperValue = rawValue.toUpperCase();
  if (SIZE_ORDER.includes(upperValue) || MEMORY_ORDER.some(m => upperValue.includes(m))) {
    return {
      type: "size",
      value: upperValue,
      display: upperValue,
    };
  }
  
  // Default to "other"
  return {
    type: "other",
    value: rawValue,
    display: rawValue.length > 25 ? rawValue.slice(0, 22) + "..." : rawValue,
  };
}

export function VariantSelectors({ variants, selectedVariant, onVariantChange }: VariantSelectorsProps) {
  // Group and parse variants
  const { colors, sizes, others } = useMemo(() => {
    if (!variants || variants.length === 0) {
      return { colors: [], sizes: [], others: [] };
    }

    const colorItems: { variant: ProductVariant; parsed: ReturnType<typeof parseVariantAttribute> }[] = [];
    const sizeItems: { variant: ProductVariant; parsed: ReturnType<typeof parseVariantAttribute> }[] = [];
    const otherItems: { variant: ProductVariant; parsed: ReturnType<typeof parseVariantAttribute> }[] = [];

    variants.forEach(variant => {
      const parsed = parseVariantAttribute(variant);
      const item = { variant, parsed };

      switch (parsed.type) {
        case "color":
          colorItems.push(item);
          break;
        case "size":
          sizeItems.push(item);
          break;
        default:
          otherItems.push(item);
      }
    });

    // Sort sizes
    sizeItems.sort((a, b) => {
      const aIdx = SIZE_ORDER.indexOf(a.parsed.display) !== -1 
        ? SIZE_ORDER.indexOf(a.parsed.display) 
        : MEMORY_ORDER.findIndex(m => a.parsed.display.includes(m));
      const bIdx = SIZE_ORDER.indexOf(b.parsed.display) !== -1 
        ? SIZE_ORDER.indexOf(b.parsed.display) 
        : MEMORY_ORDER.findIndex(m => b.parsed.display.includes(m));
      
      if (aIdx === -1 && bIdx === -1) return a.parsed.display.localeCompare(b.parsed.display);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

    return { colors: colorItems, sizes: sizeItems, others: otherItems };
  }, [variants]);

  // Don't render if only one or no variants
  if (variants.length <= 1) {
    return null;
  }

  const hasColors = colors.length > 0;
  const hasSizes = sizes.length > 0;
  const hasOthers = others.length > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Color Selector - Attractive color swatches */}
      {hasColors && (
        <div className="variant-selector">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <h4 className="text-xs sm:text-sm font-heading uppercase tracking-wider text-white/80">
              Color
            </h4>
            {selectedVariant && colors.find(c => c.variant.id === selectedVariant.id) && (
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[var(--color-main-1)]/20 text-[var(--color-main-1)] text-xs sm:text-sm font-medium">
                {colors.find(c => c.variant.id === selectedVariant.id)?.parsed.display}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {colors.map(({ variant, parsed }) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isOutOfStock = variant.stock !== undefined && variant.stock <= 0;
              const colorStyle = parsed.colorInfo?.gradient 
                ? { background: parsed.colorInfo.gradient }
                : { backgroundColor: parsed.colorInfo?.hex || "#888" };

              return (
                <button
                  key={variant.id}
                  onClick={() => !isOutOfStock && onVariantChange(variant)}
                  disabled={isOutOfStock}
                  className={cn(
                    "group relative w-9 h-9 sm:w-12 sm:h-12 rounded-full transition-all duration-300 cursor-pointer",
                    "hover:scale-110 hover:shadow-lg hover:shadow-[var(--color-main-1)]/20",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-main-1)] focus:ring-offset-2 focus:ring-offset-[var(--color-dark-2)]",
                    isSelected && "ring-2 ring-[var(--color-main-1)] ring-offset-2 ring-offset-[var(--color-dark-2)] scale-110",
                    isOutOfStock && "opacity-40 cursor-not-allowed hover:scale-100"
                  )}
                  title={`${parsed.display}${isOutOfStock ? " (Out of stock)" : ""}`}
                >
                  {/* Color swatch */}
                  <span
                    className={cn(
                      "absolute inset-1 rounded-full transition-all duration-300",
                      "shadow-inner",
                      parsed.colorInfo?.hex === "#FFFFFF" && "border border-white/30"
                    )}
                    style={colorStyle}
                  />
                  
                  {/* Shine effect */}
                  <span className="absolute inset-1 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-60" />
                  
                  {/* Selected checkmark */}
                  {isSelected && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <svg 
                        className={cn(
                          "w-4 h-4 sm:w-5 sm:h-5 drop-shadow-lg",
                          parsed.colorInfo?.hex === "#FFFFFF" || parsed.colorInfo?.hex === "#EAB308" 
                            ? "text-gray-800" 
                            : "text-white"
                        )} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                  
                  {/* Out of stock indicator */}
                  {isOutOfStock && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-full h-0.5 bg-red-500 rotate-45 absolute" />
                    </span>
                  )}
                  
                  {/* Hover tooltip - hidden on touch devices */}
                  <span className="hidden sm:block absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {parsed.display}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Size/Memory Selector - Modern pill buttons */}
      {hasSizes && (
        <div className="variant-selector">
          <h4 className="text-xs sm:text-sm font-heading uppercase tracking-wider text-white/80 mb-3 sm:mb-4">
            {sizes.some(s => s.parsed.display.includes("GB") || s.parsed.display.includes("TB")) 
              ? "Storage" 
              : "Size"}
          </h4>
          
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {sizes.map(({ variant, parsed }) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isOutOfStock = variant.stock !== undefined && variant.stock <= 0;

              return (
                <button
                  key={variant.id}
                  onClick={() => !isOutOfStock && onVariantChange(variant)}
                  disabled={isOutOfStock}
                  className={cn(
                    "relative px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-300",
                    "border-2 cursor-pointer",
                    "hover:border-[var(--color-main-1)] hover:text-[var(--color-main-1)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-main-1)]/50",
                    isSelected 
                      ? "bg-[var(--color-main-1)] border-[var(--color-main-1)] text-white shadow-lg shadow-[var(--color-main-1)]/30" 
                      : "bg-transparent border-white/20 text-white/80 hover:bg-white/5",
                    isOutOfStock && "opacity-40 cursor-not-allowed line-through hover:border-white/20 hover:text-white/80"
                  )}
                >
                  {parsed.display}
                  
                  {/* Price difference indicator - hidden on small mobile */}
                  {variant.price && selectedVariant && variant.price !== selectedVariant.price && !isSelected && (
                    <span className={cn(
                      "hidden sm:block absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full",
                      variant.price > selectedVariant.price 
                        ? "bg-amber-500/20 text-amber-400" 
                        : "bg-green-500/20 text-green-400"
                    )}>
                      {variant.price > selectedVariant.price ? "+" : "-"}
                      {formatPrice(Math.abs(variant.price - selectedVariant.price))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Other Options - Card style */}
      {hasOthers && (
        <div className="variant-selector">
          <h4 className="text-xs sm:text-sm font-heading uppercase tracking-wider text-white/80 mb-3 sm:mb-4">
            Options
          </h4>
          
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {others.map(({ variant, parsed }) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isOutOfStock = variant.stock !== undefined && variant.stock <= 0;
              const hasImage = typeof variant.image === 'string' && variant.image;

              return (
                <button
                  key={variant.id}
                  onClick={() => !isOutOfStock && onVariantChange(variant)}
                  disabled={isOutOfStock}
                  className={cn(
                    "relative p-2 sm:p-3 rounded-xl transition-all duration-300 cursor-pointer",
                    "border-2 text-left",
                    "hover:border-[var(--color-main-1)]/50 hover:bg-[var(--color-main-1)]/5",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-main-1)]/50",
                    isSelected 
                      ? "border-[var(--color-main-1)] bg-[var(--color-main-1)]/10" 
                      : "border-white/10 bg-white/5",
                    isOutOfStock && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {hasImage && (
                    <div className="relative w-full aspect-square mb-1.5 sm:mb-2 rounded-lg overflow-hidden bg-black/20">
                      <Image
                        src={variant.image as string}
                        alt={parsed.display}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  
                  <span className={cn(
                    "block text-xs sm:text-sm font-medium line-clamp-2",
                    isSelected ? "text-[var(--color-main-1)]" : "text-white/80"
                  )}>
                    {parsed.display}
                  </span>
                  
                  {variant.price && (
                    <span className="block text-[10px] sm:text-xs text-white/50 mt-0.5 sm:mt-1">
                      {formatPrice(variant.price)}
                    </span>
                  )}
                  
                  {/* Selected indicator */}
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[var(--color-main-1)] flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                  
                  {isOutOfStock && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                      <span className="text-[10px] sm:text-xs text-red-400 font-medium">Out of Stock</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

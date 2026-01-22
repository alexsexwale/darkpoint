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

// Color mappings
const COLOR_MAP: Record<string, string> = {
  black: "#1a1a1a",
  white: "#FFFFFF",
  red: "#DC2626",
  blue: "#3B82F6",
  green: "#22C55E",
  orange: "#F97316",
  yellow: "#EAB308",
  pink: "#EC4899",
  purple: "#A855F7",
  gray: "#6B7280",
  grey: "#6B7280",
  brown: "#92400E",
  navy: "#1E3A8A",
  gold: "#D4AF37",
  silver: "#C0C0C0",
  beige: "#D4C4A8",
  cyan: "#06B6D4",
  teal: "#14B8A6",
  coral: "#FF6B6B",
};

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL"];

// Extract the actual attribute from variant name
function extractAttributeFromName(fullName: string): string {
  if (!fullName) return "";
  const name = fullName.trim();
  const words = name.split(/[\s_-]+/);
  const lastWord = words[words.length - 1].toLowerCase();
  
  if (COLOR_MAP[lastWord]) {
    return lastWord.charAt(0).toUpperCase() + lastWord.slice(1);
  }
  
  for (const color of Object.keys(COLOR_MAP)) {
    if (lastWord.includes(color)) {
      return color.charAt(0).toUpperCase() + color.slice(1);
    }
  }
  
  const sizeMatch = name.match(/\b(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|\d+GB|\d+TB)\s*$/i);
  if (sizeMatch) return sizeMatch[1].toUpperCase();
  
  return words[words.length - 1].length <= 15 ? words[words.length - 1] : name.slice(-15);
}

function parseVariant(variant: ProductVariant): { 
  type: "color" | "size" | "other"; 
  display: string;
  colorHex?: string;
} {
  let rawValue = variant.value || variant.name || "";
  if (rawValue.length > 25) rawValue = extractAttributeFromName(rawValue);
  
  const lowerValue = rawValue.toLowerCase().trim();
  
  // Check for color
  for (const [colorName, hex] of Object.entries(COLOR_MAP)) {
    if (lowerValue === colorName || lowerValue.includes(colorName)) {
      return {
        type: "color",
        display: colorName.charAt(0).toUpperCase() + colorName.slice(1),
        colorHex: hex,
      };
    }
  }
  
  // Check for size
  const upperValue = rawValue.toUpperCase();
  if (SIZE_ORDER.includes(upperValue) || /\d+GB|\d+TB/i.test(upperValue)) {
    return { type: "size", display: upperValue };
  }
  
  return { type: "other", display: rawValue };
}

export function VariantSelectors({ variants, selectedVariant, onVariantChange }: VariantSelectorsProps) {
  const { colors, sizes, others } = useMemo(() => {
    if (!variants || variants.length === 0) {
      return { colors: [], sizes: [], others: [] };
    }

    const colorItems: { variant: ProductVariant; parsed: ReturnType<typeof parseVariant> }[] = [];
    const sizeItems: { variant: ProductVariant; parsed: ReturnType<typeof parseVariant> }[] = [];
    const otherItems: { variant: ProductVariant; parsed: ReturnType<typeof parseVariant> }[] = [];

    variants.forEach(variant => {
      const parsed = parseVariant(variant);
      const item = { variant, parsed };
      if (parsed.type === "color") colorItems.push(item);
      else if (parsed.type === "size") sizeItems.push(item);
      else otherItems.push(item);
    });

    // Sort sizes
    sizeItems.sort((a, b) => {
      const aIdx = SIZE_ORDER.indexOf(a.parsed.display);
      const bIdx = SIZE_ORDER.indexOf(b.parsed.display);
      if (aIdx === -1 && bIdx === -1) return a.parsed.display.localeCompare(b.parsed.display);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

    return { colors: colorItems, sizes: sizeItems, others: otherItems };
  }, [variants]);

  if (variants.length <= 1) return null;

  const hasColors = colors.length > 0;
  const hasSizes = sizes.length > 0;
  const hasOthers = others.length > 0;

  return (
    <div className="space-y-6">
      {/* Colors */}
      {hasColors && (
        <div className="nk-product-color">
          <h4 className="text-sm font-heading uppercase tracking-wider mb-3">
            Color
            {selectedVariant && colors.find(c => c.variant.id === selectedVariant.id) && (
              <span className="ml-2 font-normal text-[var(--muted-foreground)] normal-case">
                - {colors.find(c => c.variant.id === selectedVariant.id)?.parsed.display}
              </span>
            )}
          </h4>
          <div className="nk-color-selector">
            {colors.map(({ variant, parsed }) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isOutOfStock = variant.stock !== undefined && variant.stock <= 0;
              
              return (
                <div key={variant.id} className="inline-block">
                  <input
                    type="radio"
                    id={`color-${variant.id}`}
                    name="product-color"
                    value={parsed.display}
                    checked={isSelected}
                    onChange={() => onVariantChange(variant)}
                    disabled={isOutOfStock}
                    className="sr-only"
                  />
                  <label
                    htmlFor={`color-${variant.id}`}
                    className={cn(
                      "nk-color-label",
                      isSelected && "selected",
                      isOutOfStock && "out-of-stock"
                    )}
                    style={{ 
                      backgroundColor: parsed.colorHex,
                      color: parsed.colorHex,
                    }}
                    title={`${parsed.display}${isOutOfStock ? " (Out of stock)" : ""}`}
                  >
                    {parsed.display}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sizes */}
      {hasSizes && (
        <div className="nk-product-size">
          <h4 className="text-sm font-heading uppercase tracking-wider mb-3">
            {sizes.some(s => /GB|TB/i.test(s.parsed.display)) ? "Storage" : "Size"}
          </h4>
          <div className="nk-size-selector">
            {sizes.map(({ variant, parsed }) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isOutOfStock = variant.stock !== undefined && variant.stock <= 0;
              
              return (
                <div key={variant.id} className="inline-block">
                  <input
                    type="radio"
                    id={`size-${variant.id}`}
                    name="product-size"
                    value={parsed.display}
                    checked={isSelected}
                    onChange={() => onVariantChange(variant)}
                    disabled={isOutOfStock}
                    className="sr-only"
                  />
                  <label
                    htmlFor={`size-${variant.id}`}
                    className={cn(
                      "nk-size-label",
                      isSelected && "selected",
                      isOutOfStock && "out-of-stock"
                    )}
                    title={isOutOfStock ? "Out of stock" : undefined}
                  >
                    {parsed.display}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Others */}
      {hasOthers && (
        <div className="nk-product-variant">
          <h4 className="text-sm font-heading uppercase tracking-wider mb-3">Options</h4>
          <div className="nk-size-selector">
            {others.map(({ variant, parsed }) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isOutOfStock = variant.stock !== undefined && variant.stock <= 0;
              const hasImage = typeof variant.image === 'string' && variant.image;
              
              return (
                <div key={variant.id} className="inline-block">
                  <input
                    type="radio"
                    id={`variant-${variant.id}`}
                    name="product-variant"
                    value={parsed.display}
                    checked={isSelected}
                    onChange={() => onVariantChange(variant)}
                    disabled={isOutOfStock}
                    className="sr-only"
                  />
                  <label
                    htmlFor={`variant-${variant.id}`}
                    className={cn(
                      "nk-size-label",
                      isSelected && "selected",
                      isOutOfStock && "out-of-stock"
                    )}
                    title={isOutOfStock ? "Out of stock" : undefined}
                  >
                    {hasImage && (
                      <span className="relative w-6 h-6 mr-2 inline-block align-middle">
                        <Image
                          src={variant.image as string}
                          alt={parsed.display}
                          fill
                          className="object-contain"
                        />
                      </span>
                    )}
                    {parsed.display}
                    {variant.price && (
                      <span className="ml-1 opacity-60">({formatPrice(variant.price)})</span>
                    )}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

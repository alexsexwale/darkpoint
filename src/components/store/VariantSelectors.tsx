"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ProductVariant } from "@/types";

interface VariantSelectorsProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onVariantChange: (variant: ProductVariant) => void;
}

// Common color mappings
const COLOR_MAP: Record<string, string> = {
  black: "#3A3A3A",
  white: "#FFFFFF",
  red: "#DC2626",
  blue: "#558dc8",
  green: "#48ac55",
  orange: "#c89355",
  yellow: "#EAB308",
  pink: "#EC4899",
  purple: "#9333EA",
  gray: "#6B7280",
  grey: "#6B7280",
  brown: "#92400E",
  navy: "#1E3A5F",
  gold: "#D4AF37",
  silver: "#C0C0C0",
  beige: "#F5F5DC",
  cyan: "#06B6D4",
  teal: "#14B8A6",
  coral: "#FF7F50",
  khaki: "#C3B091",
};

// Size order for sorting
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL"];

// Parse variant name/value to extract attribute type
function parseVariantAttribute(variant: ProductVariant): { type: "size" | "color" | "other"; value: string; display: string } {
  const name = (variant.name || "").toLowerCase();
  const value = (variant.value || variant.name || "").toLowerCase();
  
  // Check if it's a size
  const sizePatterns = ["size", "tamaño", "größe", "taille"];
  const sizeValues = ["xs", "s", "m", "l", "xl", "xxl", "xxxl", "2xl", "3xl", "4xl", "small", "medium", "large"];
  
  if (sizePatterns.some(p => name.includes(p)) || sizeValues.some(s => value === s || value.includes(s))) {
    // Extract the size value
    let sizeValue = variant.value || variant.name || "";
    // Clean up common prefixes
    sizeValue = sizeValue.replace(/^(size|Size|SIZE)[:\s]*/i, "").trim();
    
    return {
      type: "size",
      value: sizeValue,
      display: sizeValue.toUpperCase(),
    };
  }
  
  // Check if it's a color
  const colorPatterns = ["color", "colour", "farbe", "couleur"];
  const knownColors = Object.keys(COLOR_MAP);
  
  if (colorPatterns.some(p => name.includes(p)) || knownColors.some(c => value.includes(c))) {
    let colorValue = variant.value || variant.name || "";
    colorValue = colorValue.replace(/^(color|Color|COLOR|colour)[:\s]*/i, "").trim();
    
    return {
      type: "color",
      value: colorValue.toLowerCase(),
      display: colorValue.charAt(0).toUpperCase() + colorValue.slice(1).toLowerCase(),
    };
  }
  
  // Other variant type
  return {
    type: "other",
    value: variant.value || variant.name || "",
    display: variant.value || variant.name || "",
  };
}

// Get color hex from variant
function getColorHex(colorValue: string): string {
  const lowerColor = colorValue.toLowerCase();
  
  // Check direct match
  if (COLOR_MAP[lowerColor]) {
    return COLOR_MAP[lowerColor];
  }
  
  // Check partial match
  for (const [colorName, hex] of Object.entries(COLOR_MAP)) {
    if (lowerColor.includes(colorName)) {
      return hex;
    }
  }
  
  // Check if it's already a hex color
  if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
    return colorValue;
  }
  
  // Default color
  return "#888888";
}

export function VariantSelectors({ variants, selectedVariant, onVariantChange }: VariantSelectorsProps) {
  // Group variants by type - must be called unconditionally (hooks rule)
  const groupedVariants = useMemo(() => {
    // Early check for empty variants
    if (!variants || variants.length === 0) {
      return { sizes: [], colors: [], others: [], isEmpty: true };
    }
    
    // Filter out variants with no meaningful name/value
    const validVariants = variants.filter(v => 
      (v.name && v.name.trim() !== '') || (v.value && v.value.trim() !== '')
    );
    
    if (validVariants.length === 0) {
      return { sizes: [], colors: [], others: [], isEmpty: true };
    }

    const sizes: { variant: ProductVariant; parsed: ReturnType<typeof parseVariantAttribute> }[] = [];
    const colors: { variant: ProductVariant; parsed: ReturnType<typeof parseVariantAttribute> }[] = [];
    const others: { variant: ProductVariant; parsed: ReturnType<typeof parseVariantAttribute> }[] = [];
    
    validVariants.forEach(variant => {
      const parsed = parseVariantAttribute(variant);
      // Skip variants with empty display values
      if (!parsed.display || parsed.display.trim() === '') {
        return;
      }
      const item = { variant, parsed };
      
      switch (parsed.type) {
        case "size":
          sizes.push(item);
          break;
        case "color":
          colors.push(item);
          break;
        default:
          others.push(item);
      }
    });
    
    // Sort sizes by standard order
    sizes.sort((a, b) => {
      const aIndex = SIZE_ORDER.indexOf(a.parsed.display);
      const bIndex = SIZE_ORDER.indexOf(b.parsed.display);
      if (aIndex === -1 && bIndex === -1) return a.parsed.display.localeCompare(b.parsed.display);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    
    const totalCount = sizes.length + colors.length + others.length;
    
    return { 
      sizes, 
      colors, 
      others, 
      isEmpty: totalCount < 2 // Need at least 2 variants to show selector
    };
  }, [variants]);

  // Don't render if no valid variants
  if (groupedVariants.isEmpty) {
    return null;
  }

  const hasSizes = groupedVariants.sizes.length > 0;
  const hasColors = groupedVariants.colors.length > 0;
  const hasOthers = groupedVariants.others.length > 0;

  return (
    <div className="space-y-6">
      {/* Size Selector */}
      {hasSizes && (
        <div className="nk-product-size">
          <h4 className="text-sm font-heading uppercase tracking-wider mb-3">Size</h4>
          <div className="nk-size-selector">
            {groupedVariants.sizes.map(({ variant, parsed }) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isOutOfStock = variant.stock !== undefined && variant.stock <= 0;
              
              return (
                <div key={variant.id} className="inline-block">
                  <input
                    type="radio"
                    id={`size-${variant.id}`}
                    name="product-size"
                    value={parsed.value}
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

      {/* Color Selector */}
      {hasColors && (
        <div className="nk-product-color">
          <h4 className="text-sm font-heading uppercase tracking-wider mb-3">
            Color
            {selectedVariant && (
              <span className="ml-2 font-normal text-[var(--muted-foreground)] normal-case">
                - {groupedVariants.colors.find(c => c.variant.id === selectedVariant.id)?.parsed.display || ""}
              </span>
            )}
          </h4>
          <div className="nk-color-selector">
            {groupedVariants.colors.map(({ variant, parsed }) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isOutOfStock = variant.stock !== undefined && variant.stock <= 0;
              const colorHex = getColorHex(parsed.value);
              
              return (
                <div key={variant.id} className="inline-block">
                  <input
                    type="radio"
                    id={`color-${variant.id}`}
                    name="product-color"
                    value={parsed.value}
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
                      backgroundColor: colorHex,
                      color: colorHex,
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

      {/* Other Variants */}
      {hasOthers && (
        <div className="nk-product-variant">
          <h4 className="text-sm font-heading uppercase tracking-wider mb-3">Options</h4>
          <div className="nk-size-selector">
            {groupedVariants.others.map(({ variant, parsed }) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isOutOfStock = variant.stock !== undefined && variant.stock <= 0;
              
              return (
                <div key={variant.id} className="inline-block">
                  <input
                    type="radio"
                    id={`variant-${variant.id}`}
                    name="product-variant"
                    value={parsed.value}
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
                    {parsed.display}
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


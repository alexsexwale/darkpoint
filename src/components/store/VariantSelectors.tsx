"use client";

import { useMemo, useCallback } from "react";
import Image from "next/image";
import { cn, formatPrice } from "@/lib/utils";
import type { ProductVariant } from "@/types";

interface VariantSelectorsProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onVariantChange: (variant: ProductVariant | null) => void;
  selectedAttributes: Record<string, string>;
  onAttributeChange: (attribute: string, value: string) => void;
  variantGroupName?: string;
}

// Color mappings for visual display
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

// Check if a value looks like a color
function isColorValue(value: string): { isColor: boolean; hex?: string } {
  const lower = value.toLowerCase().trim();
  for (const [colorName, hex] of Object.entries(COLOR_MAP)) {
    if (lower === colorName || lower.includes(colorName)) {
      return { isColor: true, hex };
    }
  }
  return { isColor: false };
}

// Check if a value looks like a size
function isSizeValue(value: string): boolean {
  const upper = value.toUpperCase().trim();
  return SIZE_ORDER.includes(upper) || /^\d+$/.test(upper) || /\d+GB|\d+TB/i.test(upper);
}

// Parse variant name to extract attributes
function parseVariantAttributes(variant: ProductVariant, productName: string): Record<string, string> {
  // If variant already has attributes, use them
  if (variant.attributes && Object.keys(variant.attributes).length > 0) {
    return variant.attributes;
  }

  // Try to extract from variant name by removing product name prefix
  let variantPart = variant.name || variant.value || "";
  
  // Remove product name from the beginning if present
  if (productName && variantPart.toLowerCase().startsWith(productName.toLowerCase())) {
    variantPart = variantPart.slice(productName.length).trim();
  }
  
  // Split by common delimiters
  const parts = variantPart.split(/[\s_\-\/]+/).filter(p => p.length > 0);
  
  const attributes: Record<string, string> = {};
  
  for (const part of parts) {
    const colorCheck = isColorValue(part);
    if (colorCheck.isColor) {
      attributes["Colour"] = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    } else if (isSizeValue(part)) {
      attributes["Size"] = part.toUpperCase();
    } else if (part.length <= 10) {
      // Likely a style/option letter or short code
      if (/^[A-Z]$/i.test(part)) {
        attributes["Style"] = part.toUpperCase();
      } else {
        // Generic option
        attributes["Option"] = part;
      }
    }
  }
  
  // If we couldn't parse anything meaningful, use the whole variant part
  if (Object.keys(attributes).length === 0 && variantPart) {
    attributes["Option"] = variantPart;
  }
  
  return attributes;
}

// Extract all unique dimensions and their values from variants
function extractDimensions(variants: ProductVariant[], productName: string): {
  dimensions: Map<string, Set<string>>;
  variantAttributeMap: Map<string, Record<string, string>>;
} {
  const dimensions = new Map<string, Set<string>>();
  const variantAttributeMap = new Map<string, Record<string, string>>();
  
  for (const variant of variants) {
    const attrs = parseVariantAttributes(variant, productName);
    variantAttributeMap.set(variant.id, attrs);
    
    for (const [key, value] of Object.entries(attrs)) {
      if (!dimensions.has(key)) {
        dimensions.set(key, new Set());
      }
      dimensions.get(key)!.add(value);
    }
  }
  
  return { dimensions, variantAttributeMap };
}

// Find variant matching all selected attributes
function findMatchingVariant(
  variants: ProductVariant[],
  variantAttributeMap: Map<string, Record<string, string>>,
  selectedAttributes: Record<string, string>
): ProductVariant | null {
  const selectedKeys = Object.keys(selectedAttributes);
  if (selectedKeys.length === 0) return null;
  
  for (const variant of variants) {
    const attrs = variantAttributeMap.get(variant.id) || {};
    let matches = true;
    
    for (const [key, value] of Object.entries(selectedAttributes)) {
      if (attrs[key] !== value) {
        matches = false;
        break;
      }
    }
    
    if (matches) {
      return variant;
    }
  }
  
  return null;
}

// Get image for a specific attribute value
function getImageForAttribute(
  variants: ProductVariant[],
  variantAttributeMap: Map<string, Record<string, string>>,
  attributeKey: string,
  attributeValue: string
): string | undefined {
  for (const variant of variants) {
    const attrs = variantAttributeMap.get(variant.id) || {};
    if (attrs[attributeKey] === attributeValue && variant.image) {
      return typeof variant.image === 'string' ? variant.image : variant.image.src;
    }
  }
  return undefined;
}

// Sort dimension values
function sortDimensionValues(key: string, values: string[]): string[] {
  if (key.toLowerCase() === 'size') {
    return values.sort((a, b) => {
      const aIdx = SIZE_ORDER.indexOf(a.toUpperCase());
      const bIdx = SIZE_ORDER.indexOf(b.toUpperCase());
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.localeCompare(b);
    });
  }
  
  // For Style letters, sort alphabetically
  if (key.toLowerCase() === 'style' || key.toLowerCase() === 'option') {
    return values.sort((a, b) => a.localeCompare(b));
  }
  
  return values.sort();
}

export function VariantSelectors({ 
  variants, 
  selectedVariant, 
  onVariantChange,
  selectedAttributes,
  onAttributeChange,
  variantGroupName 
}: VariantSelectorsProps) {
  // Extract product name from first variant for parsing
  const productName = useMemo(() => {
    if (!variants || variants.length === 0) return "";
    // Find common prefix among variant names
    const names = variants.map(v => v.name || "");
    if (names.length === 0) return "";
    
    let prefix = names[0];
    for (const name of names.slice(1)) {
      while (prefix && !name.startsWith(prefix)) {
        prefix = prefix.slice(0, -1);
      }
    }
    return prefix.trim();
  }, [variants]);

  // Extract dimensions and attribute map
  const { dimensions, variantAttributeMap } = useMemo(() => {
    if (!variants || variants.length === 0) {
      return { dimensions: new Map(), variantAttributeMap: new Map() };
    }
    return extractDimensions(variants, productName);
  }, [variants, productName]);

  // Check if this is a single-dimension product (original behavior)
  const isSingleDimension = dimensions.size <= 1;

  // For single dimension products, fall back to simple selection
  const handleSimpleSelect = useCallback((variant: ProductVariant) => {
    onVariantChange(variant);
  }, [onVariantChange]);

  // Handle attribute selection for multi-dimension
  const handleAttributeSelect = useCallback((key: string, value: string) => {
    onAttributeChange(key, value);
  }, [onAttributeChange]);

  // Find matching variant when attributes change
  useMemo(() => {
    if (isSingleDimension) return;
    
    const dimensionKeys = Array.from(dimensions.keys());
    const allSelected = dimensionKeys.every(key => selectedAttributes[key]);
    
    if (allSelected) {
      const match = findMatchingVariant(variants, variantAttributeMap, selectedAttributes);
      if (match !== selectedVariant) {
        onVariantChange(match);
      }
    } else if (selectedVariant) {
      onVariantChange(null);
    }
  }, [selectedAttributes, dimensions, variants, variantAttributeMap, selectedVariant, onVariantChange, isSingleDimension]);

  if (!variants || variants.length <= 1) return null;

  // Single dimension - use simple variant selection
  if (isSingleDimension) {
    const [dimensionKey, dimensionValues] = Array.from(dimensions.entries())[0] || ["Option", new Set()];
    const sortedValues = sortDimensionValues(dimensionKey, Array.from(dimensionValues));
    const isColorDimension = sortedValues.some(v => isColorValue(v).isColor);

    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-heading uppercase tracking-wider mb-3">
            {variantGroupName || dimensionKey}
            {selectedVariant && (
              <span className="ml-2 font-normal text-[var(--muted-foreground)] normal-case">
                - {variantAttributeMap.get(selectedVariant.id)?.[dimensionKey] || selectedVariant.value || selectedVariant.name}
              </span>
            )}
          </h4>
          <div className={isColorDimension ? "nk-color-selector" : "nk-size-selector flex flex-wrap gap-2"}>
            {variants.map((variant) => {
              const attrs = variantAttributeMap.get(variant.id) || {};
              const displayValue = attrs[dimensionKey] || variant.value || variant.name;
              const isSelected = selectedVariant?.id === variant.id;
              const colorCheck = isColorValue(displayValue);
              const hasImage = typeof variant.image === 'string' && variant.image;

              if (isColorDimension && colorCheck.isColor) {
                return (
                  <div key={variant.id} className="inline-block">
                    <input
                      type="radio"
                      id={`variant-${variant.id}`}
                      name="product-variant"
                      checked={isSelected}
                      onChange={() => handleSimpleSelect(variant)}
                      className="sr-only"
                    />
                    <label
                      htmlFor={`variant-${variant.id}`}
                      className={cn("nk-color-label", isSelected && "selected")}
                      style={{ backgroundColor: colorCheck.hex, color: colorCheck.hex }}
                      title={displayValue}
                    >
                      {displayValue}
                    </label>
                  </div>
                );
              }

              return (
                <div key={variant.id} className="inline-block">
                  <input
                    type="radio"
                    id={`variant-${variant.id}`}
                    name="product-variant"
                    checked={isSelected}
                    onChange={() => handleSimpleSelect(variant)}
                    className="sr-only"
                  />
                  <label
                    htmlFor={`variant-${variant.id}`}
                    className={cn("nk-size-label flex items-center gap-2", isSelected && "selected")}
                  >
                    {hasImage && (
                      <span className="relative w-6 h-6 inline-block">
                        <Image src={variant.image as string} alt={displayValue} fill className="object-contain rounded" />
                      </span>
                    )}
                    {displayValue}
                    {variant.price && <span className="opacity-60">({formatPrice(variant.price)})</span>}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Multi-dimension - show each dimension separately
  const dimensionEntries = Array.from(dimensions.entries());
  const requiredSelections = dimensionEntries.length;
  const currentSelections = Object.keys(selectedAttributes).length;
  const allSelected = currentSelections >= requiredSelections;

  return (
    <div className="space-y-6">
      {dimensionEntries.map(([key, valuesSet]) => {
        const values = sortDimensionValues(key, Array.from(valuesSet));
        const selectedValue = selectedAttributes[key];
        const isColorDimension = values.some(v => isColorValue(v).isColor);
        
        // Determine display name for dimension
        let dimensionLabel = key;
        if (key === 'Colour' || key === 'Color') dimensionLabel = 'Colour';
        else if (key === 'Size') dimensionLabel = 'Size';
        else if (key === 'Style') dimensionLabel = 'Style';

        return (
          <div key={key}>
            <h4 className="text-sm font-heading uppercase tracking-wider mb-3">
              {dimensionLabel}
              {selectedValue && (
                <span className="ml-2 font-normal text-[var(--muted-foreground)] normal-case">
                  - {selectedValue}
                </span>
              )}
              {!selectedValue && (
                <span className="ml-2 font-normal text-red-400/80 normal-case text-xs">
                  (required)
                </span>
              )}
            </h4>
            <div className={cn(
              isColorDimension ? "nk-color-selector" : "flex flex-wrap gap-2"
            )}>
              {values.map((value) => {
                const isSelected = selectedValue === value;
                const colorCheck = isColorValue(value);
                const imageUrl = getImageForAttribute(variants, variantAttributeMap, key, value);

                if (isColorDimension && colorCheck.isColor) {
                  return (
                    <div key={value} className="inline-block">
                      <input
                        type="radio"
                        id={`${key}-${value}`}
                        name={`dimension-${key}`}
                        checked={isSelected}
                        onChange={() => handleAttributeSelect(key, value)}
                        className="sr-only"
                      />
                      <label
                        htmlFor={`${key}-${value}`}
                        className={cn("nk-color-label", isSelected && "selected")}
                        style={{ backgroundColor: colorCheck.hex, color: colorCheck.hex }}
                        title={value}
                      >
                        {value}
                      </label>
                    </div>
                  );
                }

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleAttributeSelect(key, value)}
                    className={cn(
                      "px-4 py-2 border rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                      isSelected
                        ? "border-[var(--color-main-1)] bg-[var(--color-main-1)]/10 text-[var(--color-main-1)]"
                        : "border-[var(--color-dark-4)] bg-[var(--color-dark-3)] text-white/80 hover:border-[var(--color-main-1)]/50 hover:bg-[var(--color-dark-4)]"
                    )}
                  >
                    {imageUrl && (
                      <span className="relative w-6 h-6 inline-block rounded overflow-hidden">
                        <Image src={imageUrl} alt={value} fill className="object-cover" />
                      </span>
                    )}
                    <span>{value}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Selection status message */}
      {!allSelected && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-sm text-amber-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Please select {dimensionEntries.filter(([k]) => !selectedAttributes[k]).map(([k]) => k.toLowerCase()).join(' and ')} to add to cart
          </p>
        </div>
      )}

      {/* Show selected variant info */}
      {allSelected && selectedVariant && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-sm text-green-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Selected: {Object.entries(selectedAttributes).map(([k, v]) => `${k}: ${v}`).join(', ')}
            {selectedVariant.price && <span className="ml-2 font-bold">{formatPrice(selectedVariant.price)}</span>}
          </p>
        </div>
      )}

      {/* Warning if no matching variant */}
      {allSelected && !selectedVariant && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            This combination is not available. Please try a different selection.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper hook for managing multi-dimensional variant selection
export function useVariantSelection(variants: ProductVariant[] | undefined) {
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const handleAttributeChange = useCallback((attribute: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attribute]: value
    }));
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedAttributes({});
    setSelectedVariant(null);
  }, []);

  return {
    selectedAttributes,
    selectedVariant,
    setSelectedVariant,
    handleAttributeChange,
    resetSelection,
  };
}

// Need to import useState
import { useState } from "react";

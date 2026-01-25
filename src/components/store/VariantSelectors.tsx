"use client";

import { useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
import { cn, formatPrice } from "@/lib/utils";
import type { ProductVariant } from "@/types";

interface VariantSelectorsProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onVariantChange: (variant: ProductVariant | null) => void;
  selectedAttributes: Record<string, string>;
  onAttributeChange: (attribute: string, value: string) => void;
  variantGroupName?: string; // Legacy: for single-dimension products
  variantDimensionNames?: Record<string, string>; // Custom names for each dimension
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
  // Camouflage and special colours
  "camouflage black": "#3D3D29",
  "camouflage green": "#4B5320",
  "camouflage": "#78866B",
  "army green": "#4B5320",
  "military green": "#4B5320",
  "khaki": "#C3B091",
  "olive": "#808000",
};

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL"];

// Check if a value looks like a color
function isColorValue(value: string): { isColor: boolean; hex?: string } {
  const lower = value.toLowerCase().trim();
  
  // First check for exact match (including multi-word colours like "camouflage black")
  if (COLOR_MAP[lower]) {
    return { isColor: true, hex: COLOR_MAP[lower] };
  }
  
  // Then check if value contains a known colour
  for (const [colorName, hex] of Object.entries(COLOR_MAP)) {
    if (lower === colorName || lower.includes(colorName)) {
      return { isColor: true, hex };
    }
  }
  return { isColor: false };
}

// Check if a value looks like a size (but not just a single letter like M/L which could be style)
function isSizeValue(value: string, context: { hasManyStyleLetters: boolean }): boolean {
  const upper = value.toUpperCase().trim();
  
  // Storage sizes are always sizes
  if (/\d+GB|\d+TB/i.test(upper)) return true;
  
  // Pure numbers are sizes
  if (/^\d+$/.test(upper)) return true;
  
  // Multi-character sizes like XS, XL, XXL are sizes
  if (['XS', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL', 'XXS'].includes(upper)) return true;
  
  // Single letters S, M, L are ONLY sizes if we don't have many style letters
  // If variants include A, B, C, D, E, F, G, H, I, J, K, N, O - then M and L are probably style letters
  if (['S', 'M', 'L'].includes(upper)) {
    return !context.hasManyStyleLetters;
  }
  
  return false;
}

// Analyze all variants to understand the dimension structure
function analyzeVariantStructure(variants: ProductVariant[], productName: string): {
  hasManyStyleLetters: boolean;
  allParts: string[][];
} {
  const allParts: string[][] = [];
  const singleLetters = new Set<string>();
  
  for (const variant of variants) {
    let variantPart = variant.name || variant.value || "";
    if (productName && variantPart.toLowerCase().startsWith(productName.toLowerCase())) {
      variantPart = variantPart.slice(productName.length).trim();
    }
    const parts = variantPart.split(/[\s_\-\/]+/).filter(p => p.length > 0);
    allParts.push(parts);
    
    for (const part of parts) {
      if (/^[A-Z]$/i.test(part)) {
        singleLetters.add(part.toUpperCase());
      }
    }
  }
  
  // If we have many single letters including non-size letters, treat all as style
  const nonSizeLetters = [...singleLetters].filter(l => !['S', 'M', 'L'].includes(l));
  const hasManyStyleLetters = nonSizeLetters.length >= 3; // Has A, B, C, D, etc.
  
  return { hasManyStyleLetters, allParts };
}

// Parse variant name to extract attributes
function parseVariantAttributes(
  variant: ProductVariant, 
  productName: string,
  context: { hasManyStyleLetters: boolean }
): Record<string, string> {
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
  
  // First, check if the LAST part is a colour - if so, combine with modifiers like "Camouflage", "Matte", "Glossy"
  // Common colour modifiers that should be combined with the colour name
  const colourModifiers = ['camouflage', 'camo', 'matte', 'glossy', 'metallic', 'neon', 'pastel', 'dark', 'light', 'bright', 'deep', 'army', 'military', 'rose', 'sky', 'ocean', 'forest', 'midnight', 'royal'];
  
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    const colorCheck = isColorValue(lastPart);
    
    if (colorCheck.isColor) {
      // Check if previous parts are colour modifiers
      let colourParts: string[] = [lastPart];
      let nonColourParts: string[] = [];
      
      for (let i = parts.length - 2; i >= 0; i--) {
        const part = parts[i];
        if (colourModifiers.includes(part.toLowerCase())) {
          colourParts.unshift(part);
        } else {
          nonColourParts = parts.slice(0, i + 1);
          break;
        }
      }
      
      // Combine colour parts into a single colour value (e.g., "Camouflage Black")
      const fullColour = colourParts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
      attributes["Colour"] = fullColour;
      
      // Process remaining non-colour parts
      for (const part of nonColourParts) {
        if (isSizeValue(part, context)) {
          attributes["Size"] = part.toUpperCase();
        } else if (part.length <= 10) {
          if (/^[A-Z]$/i.test(part)) {
            attributes["Style"] = part.toUpperCase();
          } else {
            attributes["Option"] = part;
          }
        }
      }
      
      return attributes;
    }
  }
  
  // Standard parsing for single-part variants or no colour modifier detected
  for (const part of parts) {
    const colorCheck = isColorValue(part);
    if (colorCheck.isColor) {
      attributes["Colour"] = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    } else if (isSizeValue(part, context)) {
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
  // First, analyze the structure to understand what we're dealing with
  const context = analyzeVariantStructure(variants, productName);
  
  const dimensions = new Map<string, Set<string>>();
  const variantAttributeMap = new Map<string, Record<string, string>>();
  
  for (const variant of variants) {
    const attrs = parseVariantAttributes(variant, productName, context);
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
  selectedAttributes: Record<string, string>,
  dimensions: Map<string, Set<string>>
): ProductVariant | null {
  const selectedKeys = Object.keys(selectedAttributes);
  if (selectedKeys.length === 0) return null;
  
  // Identify dimensions that only have 1 value globally (optional attributes)
  const singleValueDimensions = new Set<string>();
  for (const [key, values] of dimensions.entries()) {
    if (values.size === 1) {
      singleValueDimensions.add(key);
    }
  }
  
  for (const variant of variants) {
    const attrs = variantAttributeMap.get(variant.id) || {};
    let matches = true;
    
    for (const [key, value] of Object.entries(selectedAttributes)) {
      // If the variant doesn't have this attribute, but the dimension only has 1 value,
      // consider it a match (the variant implicitly has this value)
      if (attrs[key] === undefined && singleValueDimensions.has(key)) {
        continue;
      }
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

// Get available values for a dimension based on current selections in other dimensions
function getAvailableValuesForDimension(
  dimensionKey: string,
  selectedAttributes: Record<string, string>,
  variants: ProductVariant[],
  variantAttributeMap: Map<string, Record<string, string>>
): Set<string> {
  const availableValues = new Set<string>();
  
  // Get selected attributes except for the dimension we're checking
  const otherSelections = Object.entries(selectedAttributes)
    .filter(([key]) => key !== dimensionKey);
  
  for (const variant of variants) {
    const attrs = variantAttributeMap.get(variant.id) || {};
    
    // Check if this variant matches all other selected attributes
    let matchesOthers = true;
    for (const [key, value] of otherSelections) {
      if (attrs[key] !== value) {
        matchesOthers = false;
        break;
      }
    }
    
    // If it matches, this variant's value for dimensionKey is available
    if (matchesOthers && attrs[dimensionKey]) {
      availableValues.add(attrs[dimensionKey]);
    }
  }
  
  return availableValues;
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
  variantGroupName,
  variantDimensionNames 
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

  // Auto-select dimensions that only have one available value
  useEffect(() => {
    if (isSingleDimension) return;
    
    const dimensionKeys = Array.from(dimensions.keys());
    
    for (const key of dimensionKeys) {
      const dimensionSet = dimensions.get(key);
      if (!dimensionSet) continue;
      const allValues: string[] = Array.from(dimensionSet);
      
      // PRIORITY: If dimension only has 1 value GLOBALLY, always auto-select it
      // This handles cases where a dimension like "Option" only has one value across all variants
      if (allValues.length === 1 && selectedAttributes[key] !== allValues[0]) {
        onAttributeChange(key, allValues[0]);
        break; // Only select one at a time to avoid cascading issues
      }
      
      // Get available values based on current selections in OTHER dimensions
      const availableValues = getAvailableValuesForDimension(
        key, 
        selectedAttributes, 
        variants, 
        variantAttributeMap
      );
      
      // For the first dimension, use all values; for others, filter by availability
      const isFirstDimension = dimensionKeys.indexOf(key) === 0;
      const valuesToConsider: string[] = isFirstDimension 
        ? allValues 
        : allValues.filter(v => availableValues.has(v));
      
      // If only one value is available and it's not selected, auto-select it
      if (valuesToConsider.length === 1 && selectedAttributes[key] !== valuesToConsider[0]) {
        onAttributeChange(key, valuesToConsider[0]);
        break; // Only select one at a time to avoid cascading issues
      }
    }
  }, [dimensions, selectedAttributes, variants, variantAttributeMap, isSingleDimension, onAttributeChange]);

  // Find matching variant when attributes change
  useMemo(() => {
    if (isSingleDimension) return;
    
    const dimensionKeys = Array.from(dimensions.keys());
    const allSelected = dimensionKeys.every(key => selectedAttributes[key]);
    
    if (allSelected) {
      const match = findMatchingVariant(variants, variantAttributeMap, selectedAttributes, dimensions);
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
  // Sort dimensions to ensure Colour is always first, then Size, then others
  const dimensionEntries = Array.from(dimensions.entries()).sort(([a], [b]) => {
    const order: Record<string, number> = {
      'Colour': 0,
      'Color': 0,
      'Size': 1,
      'Style': 2,
      'Option': 3,
    };
    const aOrder = order[a] ?? 99;
    const bOrder = order[b] ?? 99;
    return aOrder - bOrder;
  });
  const requiredSelections = dimensionEntries.length;
  const currentSelections = Object.keys(selectedAttributes).length;
  const allSelected = currentSelections >= requiredSelections;

  return (
    <div className="space-y-6">
      {dimensionEntries.map(([key, valuesSet], dimIndex) => {
        const allValues = sortDimensionValues(key, Array.from(valuesSet));
        const selectedValue = selectedAttributes[key];
        const isColorDimension = allValues.some(v => isColorValue(v).isColor);
        
        // Get available values based on selections in OTHER dimensions
        const availableValues = getAvailableValuesForDimension(
          key, 
          selectedAttributes, 
          variants, 
          variantAttributeMap
        );
        
        // For the first dimension (usually colour), show all values
        // For subsequent dimensions, only show values available with current selections
        const isFirstDimension = dimIndex === 0;
        const valuesToShow = isFirstDimension 
          ? allValues 
          : allValues.filter(v => availableValues.has(v));
        
        // Don't show dimension if no values available (shouldn't happen, but safety check)
        if (valuesToShow.length === 0) return null;
        
        // If only one value is available, don't show the dimension (it's auto-selected via useEffect)
        if (valuesToShow.length === 1) {
          return null;
        }
        
        // Determine display name for dimension - use custom name if provided
        let dimensionLabel = variantDimensionNames?.[key] || key;
        // Fallback to standard names if no custom name
        if (!variantDimensionNames?.[key]) {
          if (key === 'Colour' || key === 'Color') dimensionLabel = 'Colour';
          else if (key === 'Size') dimensionLabel = 'Size';
          else if (key === 'Style') dimensionLabel = 'Style';
        }

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
                <span className="ml-2 font-normal text-amber-400/80 normal-case text-xs">
                  (select one)
                </span>
              )}
            </h4>
            <div className={cn(
              isColorDimension ? "nk-color-selector" : "flex flex-wrap gap-2"
            )}>
              {valuesToShow.map((value) => {
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

      {/* Show selected variant info when complete */}
      {allSelected && selectedVariant && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-sm text-green-400 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              Selected: {Object.entries(selectedAttributes).map(([k, v]) => `${k}: ${v}`).join(', ')}
              {selectedVariant.price && <span className="ml-2 font-bold">{formatPrice(selectedVariant.price)}</span>}
            </span>
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

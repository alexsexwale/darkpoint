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
  // Multi-word colours (must check these FIRST before single words)
  "rose gold": "#B76E79",
  "space gray": "#4A4A4A",
  "space grey": "#4A4A4A",
  "midnight blue": "#191970",
  "sky blue": "#87CEEB",
  "hot pink": "#FF69B4",
  "light blue": "#ADD8E6",
  "dark blue": "#00008B",
  "light green": "#90EE90",
  "dark green": "#006400",
  "light pink": "#FFB6C1",
  "dark pink": "#E75480",
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
  
  const attributes: Record<string, string> = {};
  
  // FIRST: Check for multi-word colours in the variant part (e.g., "Rose Gold", "Space Gray")
  // We need to do this BEFORE splitting to avoid breaking up colour names
  const lowerVariantPart = variantPart.toLowerCase();
  const multiWordColours = Object.keys(COLOR_MAP).filter(c => c.includes(' ')).sort((a, b) => b.length - a.length);
  
  for (const multiColour of multiWordColours) {
    if (lowerVariantPart.includes(multiColour)) {
      // Found a multi-word colour - extract it and remove from variantPart
      const colourIndex = lowerVariantPart.indexOf(multiColour);
      const actualColour = variantPart.slice(colourIndex, colourIndex + multiColour.length);
      // Properly capitalize
      const formattedColour = actualColour.split(/\s+/).map(w => 
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join(' ');
      attributes["Colour"] = formattedColour;
      // Remove the colour from variantPart for further processing
      variantPart = variantPart.slice(0, colourIndex) + variantPart.slice(colourIndex + multiColour.length);
      variantPart = variantPart.trim();
      break;
    }
  }
  
  // Split remaining part by common delimiters
  const parts = variantPart.split(/[\s_\-\/]+/).filter(p => p.length > 0);
  
  // First, check if the LAST part is a colour - if so, combine with modifiers like "Camouflage", "Matte", "Glossy"
  // Common colour modifiers that should be combined with the colour name
  const colourModifiers = [
    // Camouflage/military
    'camouflage', 'camo', 'army', 'military',
    // Finish types
    'matte', 'glossy', 'metallic', 'chrome', 'frosted', 'transparent', 'clear',
    // Intensity modifiers
    'neon', 'pastel', 'dark', 'light', 'bright', 'deep', 'pale', 'vivid',
    // Nature-inspired
    'rose', 'sky', 'ocean', 'forest', 'midnight', 'royal', 'sunset', 'ice',
    // Patterns and designs (common for gaming accessories)
    'colorful', 'colourful', 'rainbow', 'dynamic', 'english', 'graffiti', 'galaxy', 'marble',
    'flame', 'fire', 'water', 'skull', 'cracks', 'carbon', 'fiber', 'wood', 'stone',
    'dragon', 'tiger', 'leopard', 'zebra', 'snake', 'animal',
    // Texture descriptors
    'soft', 'silicone', 'rubber', 'gel', 'leather', 'fabric',
    // Style descriptors
    'classic', 'vintage', 'retro', 'modern', 'pro', 'elite', 'premium', 'limited'
  ];
  
  // Skip colour modifier logic if we already found a multi-word colour
  if (!attributes["Colour"] && parts.length >= 2) {
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
      
      // Process size from remaining parts if colour was found
      for (const part of parts) {
        if (isSizeValue(part, context) && !attributes["Size"]) {
          attributes["Size"] = part.toUpperCase();
        }
      }
      
      return attributes;
    }
  }
  
  // Standard parsing for single-part variants or no colour modifier detected
  for (const part of parts) {
    const colorCheck = isColorValue(part);
    // Only set colour if not already set by multi-word colour detection
    if (colorCheck.isColor && !attributes["Colour"]) {
      attributes["Colour"] = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    } else if (isSizeValue(part, context)) {
      attributes["Size"] = part.toUpperCase();
    } else if (part.length <= 10 && !attributes["Colour"]) {
      // Likely a style/option letter or short code - but skip if it might be part of a colour we already found
      if (/^[A-Z]$/i.test(part)) {
        attributes["Style"] = part.toUpperCase();
      } else if (!attributes["Option"]) {
        // Generic option - but don't add if it looks like part of a colour name
        const lowerPart = part.toLowerCase();
        const isColourRelated = ['rose', 'space', 'hot', 'light', 'dark', 'sky', 'midnight'].includes(lowerPart);
        if (!isColourRelated) {
          attributes["Option"] = part;
        }
      }
    }
  }
  
  // If we couldn't parse anything meaningful, use the whole variant part (but not if empty)
  if (Object.keys(attributes).length === 0 && variantPart && variantPart.trim()) {
    attributes["Option"] = variantPart;
  }
  
  return attributes;
}

// Get the display value for a variant - prioritizes displayName set in admin
function getVariantDisplayValue(variant: ProductVariant, productName: string): string {
  // Use custom display name if set in admin
  if (variant.displayName && variant.displayName.trim()) {
    return variant.displayName.trim();
  }
  
  // Fall back to parsing the variant name
  let variantPart = variant.name || variant.value || "";
  if (productName && variantPart.toLowerCase().startsWith(productName.toLowerCase())) {
    variantPart = variantPart.slice(productName.length).trim();
  }
  return variantPart || variant.value || variant.name || "Default";
}

// Extract all unique dimensions and their values from variants
function extractDimensions(variants: ProductVariant[], productName: string): {
  dimensions: Map<string, Set<string>>;
  variantAttributeMap: Map<string, Record<string, string>>;
  useImageSelector: boolean; // Flag to always use image selectors instead of colour circles
} {
  // First, analyze the structure to understand what we're dealing with
  const context = analyzeVariantStructure(variants, productName);
  
  const dimensions = new Map<string, Set<string>>();
  const variantAttributeMap = new Map<string, Record<string, string>>();
  
  // First pass: parse all variants
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
  
  // Check if variants have inconsistent dimension structures
  // If some variants have Colour and some have Option (but not both), it's inconsistent
  const dimensionKeys = Array.from(dimensions.keys());
  
  // Count how many variants have each dimension
  const dimensionCounts = new Map<string, number>();
  for (const variant of variants) {
    const attrs = variantAttributeMap.get(variant.id) || {};
    for (const key of Object.keys(attrs)) {
      dimensionCounts.set(key, (dimensionCounts.get(key) || 0) + 1);
    }
  }
  
  // Check for inconsistency: if we have multiple dimensions but no dimension covers all variants
  const totalVariants = variants.length;
  const hasInconsistentDimensions = dimensionKeys.length > 1 && 
    !Array.from(dimensionCounts.values()).some(count => count === totalVariants);
  
  // Check if most variants have custom display names set - if so, use those instead of parsing
  const variantsWithDisplayNames = variants.filter(v => v.displayName && v.displayName.trim()).length;
  const hasCustomDisplayNames = variantsWithDisplayNames >= totalVariants * 0.5; // At least 50% have display names
  
  // If inconsistent OR has custom display names, fall back to single "Style" dimension
  if (hasInconsistentDimensions || hasCustomDisplayNames) {
    const simpleDimensions = new Map<string, Set<string>>();
    const simpleAttributeMap = new Map<string, Record<string, string>>();
    
    simpleDimensions.set("Style", new Set());
    
    for (const variant of variants) {
      // Use custom display name if available, otherwise parse from variant name
      const displayValue = getVariantDisplayValue(variant, productName);
      
      simpleDimensions.get("Style")!.add(displayValue);
      simpleAttributeMap.set(variant.id, { "Style": displayValue });
    }
    
    // Use image selectors for inconsistent dimensions (mixed styles/colours/patterns)
    return { dimensions: simpleDimensions, variantAttributeMap: simpleAttributeMap, useImageSelector: true };
  }
  
  return { dimensions, variantAttributeMap, useImageSelector: false };
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
  const { dimensions, variantAttributeMap, useImageSelector } = useMemo(() => {
    if (!variants || variants.length === 0) {
      return { dimensions: new Map(), variantAttributeMap: new Map(), useImageSelector: false };
    }
    return extractDimensions(variants, productName);
  }, [variants, productName]);

  // Check if this is effectively a single-dimension product
  // Dimensions with only 1 value are auto-selected and don't count as "real" dimensions
  const meaningfulDimensions = useMemo(() => {
    return Array.from(dimensions.entries()).filter(([, values]) => values.size > 1);
  }, [dimensions]);
  
  const isSingleDimension = dimensions.size <= 1 || meaningfulDimensions.length <= 1;

  // For single dimension products, fall back to simple selection
  // Also auto-select any single-value dimensions
  const handleSimpleSelect = useCallback((variant: ProductVariant) => {
    // Auto-select any single-value dimensions
    for (const [key, values] of dimensions.entries()) {
      if (values.size === 1) {
        const valuesArray: string[] = Array.from(values);
        const singleValue: string = valuesArray[0];
        if (selectedAttributes[key] !== singleValue) {
          onAttributeChange(key, singleValue);
        }
      }
    }
    // Also set the attribute for the selected variant
    const attrs = variantAttributeMap.get(variant.id) || {};
    for (const [key, value] of Object.entries(attrs)) {
      const strValue = value as string;
      if (selectedAttributes[key] !== strValue) {
        onAttributeChange(key, strValue);
      }
    }
    onVariantChange(variant);
  }, [onVariantChange, dimensions, selectedAttributes, onAttributeChange, variantAttributeMap]);

  // Handle attribute selection for multi-dimension
  const handleAttributeSelect = useCallback((key: string, value: string) => {
    onAttributeChange(key, value);
  }, [onAttributeChange]);

  // Auto-select dimensions that only have one value GLOBALLY
  // We don't auto-select based on filtered availability anymore - users can see all options
  useEffect(() => {
    if (isSingleDimension) return;
    
    const dimensionKeys = Array.from(dimensions.keys());
    
    for (const key of dimensionKeys) {
      const dimensionSet = dimensions.get(key);
      if (!dimensionSet) continue;
      const allValues: string[] = Array.from(dimensionSet);
      
      // Only auto-select if dimension has exactly 1 value GLOBALLY
      // This handles cases where a dimension like "Option" only has one value across all variants
      if (allValues.length === 1 && selectedAttributes[key] !== allValues[0]) {
        onAttributeChange(key, allValues[0]);
        break; // Only select one at a time to avoid cascading issues
      }
    }
  }, [dimensions, selectedAttributes, isSingleDimension, onAttributeChange]);

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
    // Use the meaningful dimension (one with multiple values) if available
    const [dimensionKey, dimensionValues] = meaningfulDimensions.length > 0 
      ? meaningfulDimensions[0] 
      : (Array.from(dimensions.entries())[0] || ["Option", new Set()]);
    const sortedValues = sortDimensionValues(dimensionKey, Array.from(dimensionValues));
    // Only use colour circles if NOT in image selector mode (mixed styles/patterns should show images)
    const isColorDimension = !useImageSelector && sortedValues.some(v => isColorValue(v).isColor);

    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-heading uppercase tracking-wider mb-3">
            {variantGroupName || variantDimensionNames?.[dimensionKey] || dimensionKey}
            {selectedVariant && (
              <span className="ml-2 font-normal text-[var(--muted-foreground)] normal-case">
                - {selectedVariant.displayName || variantAttributeMap.get(selectedVariant.id)?.[dimensionKey] || selectedVariant.value || selectedVariant.name}
              </span>
            )}
          </h4>
          <div className={isColorDimension ? "nk-color-selector" : "flex flex-wrap gap-2"}>
            {variants.map((variant) => {
              const attrs = variantAttributeMap.get(variant.id) || {};
              // Prioritize custom displayName from admin, then parsed attributes, then fallbacks
              const displayValue = variant.displayName || attrs[dimensionKey] || variant.value || variant.name;
              const isSelected = selectedVariant?.id === variant.id;
              const colorCheck = isColorValue(displayValue);
              const hasImage = typeof variant.image === 'string' && variant.image;

              // Only show colour circles if in colour mode (not image selector mode)
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

              // For image selector mode, show larger image thumbnails
              if (useImageSelector && hasImage) {
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => handleSimpleSelect(variant)}
                    className={cn(
                      "relative flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all",
                      isSelected
                        ? "border-[var(--color-main-1)] bg-[var(--color-main-1)]/10"
                        : "border-transparent bg-[var(--color-dark-3)] hover:border-[var(--color-dark-4)]"
                    )}
                  >
                    <span className="relative w-12 h-12 rounded overflow-hidden">
                      <Image src={variant.image as string} alt={displayValue} fill className="object-cover" />
                    </span>
                    <span className="text-xs text-center max-w-[80px] truncate" title={displayValue}>
                      {displayValue}
                    </span>
                  </button>
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
        
        // Always show ALL values for all dimensions
        // We'll mark unavailable ones as disabled instead of hiding them
        const valuesToShow = allValues;
        
        // Don't show dimension if no values exist at all
        if (valuesToShow.length === 0) return null;
        
        // Only hide single-value dimensions if it's the ONLY dimension or all values globally are 1
        // Don't hide based on filtered availability - user should always see all options
        if (allValues.length === 1) {
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
                // Check if this value is available with current selections in other dimensions
                const isAvailable = availableValues.size === 0 || availableValues.has(value);

                if (isColorDimension && colorCheck.isColor) {
                  return (
                    <div key={value} className="inline-block">
                      <input
                        type="radio"
                        id={`${key}-${value}`}
                        name={`dimension-${key}`}
                        checked={isSelected}
                        onChange={() => isAvailable && handleAttributeSelect(key, value)}
                        disabled={!isAvailable}
                        className="sr-only"
                      />
                      <label
                        htmlFor={`${key}-${value}`}
                        className={cn(
                          "nk-color-label", 
                          isSelected && "selected",
                          !isAvailable && "opacity-30 cursor-not-allowed"
                        )}
                        style={{ backgroundColor: colorCheck.hex, color: colorCheck.hex }}
                        title={isAvailable ? value : `${value} (not available with current selection)`}
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
                    onClick={() => isAvailable && handleAttributeSelect(key, value)}
                    disabled={!isAvailable}
                    className={cn(
                      "px-4 py-2 border rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                      isSelected
                        ? "border-[var(--color-main-1)] bg-[var(--color-main-1)]/10 text-[var(--color-main-1)]"
                        : isAvailable
                          ? "border-[var(--color-dark-4)] bg-[var(--color-dark-3)] text-white/80 hover:border-[var(--color-main-1)]/50 hover:bg-[var(--color-dark-4)]"
                          : "border-[var(--color-dark-4)] bg-[var(--color-dark-3)]/50 text-white/30 cursor-not-allowed"
                    )}
                    title={isAvailable ? value : `${value} (not available with current selection)`}
                  >
                    {imageUrl && (
                      <span className={cn("relative w-6 h-6 inline-block rounded overflow-hidden", !isAvailable && "opacity-50")}>
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

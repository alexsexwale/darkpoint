"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores";
import type { Product, ProductVariant } from "@/types";

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
  cyan: "#06B6D4",
  teal: "#14B8A6",
};

// Size order for sorting
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL"];

interface VariantSelectionModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

// Parse variant attribute type
function parseVariantAttribute(variant: ProductVariant): { type: "size" | "color" | "other"; value: string; display: string } {
  const name = (variant.name || "").toLowerCase();
  const value = (variant.value || variant.name || "").toLowerCase();
  
  // Check if it's a size
  const sizePatterns = ["size", "tamaño", "größe", "taille", "style"];
  const sizeValues = ["xs", "s", "m", "l", "xl", "xxl", "xxxl", "2xl", "3xl", "4xl", "small", "medium", "large", "4gb", "8gb", "16gb", "32gb", "64gb", "128gb"];
  
  if (sizePatterns.some(p => name.includes(p)) || sizeValues.some(s => value === s || value.includes(s))) {
    let sizeValue = variant.value || variant.name || "";
    sizeValue = sizeValue.replace(/^(size|Size|SIZE|style|Style)[:\s]*/i, "").trim();
    return { type: "size", value: sizeValue, display: sizeValue };
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
  
  return {
    type: "other",
    value: variant.value || variant.name || "",
    display: variant.value || variant.name || "",
  };
}

function getColorHex(colorValue: string): string {
  const lowerColor = colorValue.toLowerCase();
  if (COLOR_MAP[lowerColor]) return COLOR_MAP[lowerColor];
  for (const [colorName, hex] of Object.entries(COLOR_MAP)) {
    if (lowerColor.includes(colorName)) return hex;
  }
  if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) return colorValue;
  return "#888888";
}

export function VariantSelectionModal({ product, isOpen, onClose }: VariantSelectionModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem, openCart } = useCartStore();

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen && product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
      setQuantity(1);
    }
  }, [isOpen, product.variants]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Group variants by type
  const groupedVariants = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return { sizes: [], colors: [], others: [], isEmpty: true };
    }
    
    const validVariants = product.variants.filter(v => 
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
      if (!parsed.display || parsed.display.trim() === '') return;
      const item = { variant, parsed };
      
      switch (parsed.type) {
        case "size": sizes.push(item); break;
        case "color": colors.push(item); break;
        default: others.push(item);
      }
    });
    
    // Sort sizes
    sizes.sort((a, b) => {
      const aIndex = SIZE_ORDER.indexOf(a.parsed.display.toUpperCase());
      const bIndex = SIZE_ORDER.indexOf(b.parsed.display.toUpperCase());
      if (aIndex === -1 && bIndex === -1) return a.parsed.display.localeCompare(b.parsed.display);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    
    return { sizes, colors, others, isEmpty: false };
  }, [product.variants]);

  const effectivePrice = selectedVariant?.price || product.price;
  const isInStock = selectedVariant 
    ? (selectedVariant.stock === undefined || selectedVariant.stock > 0)
    : product.inStock;

  const handleAddToCart = () => {
    if (selectedVariant) {
      addItem(product, quantity, { ...selectedVariant, price: effectivePrice });
    } else {
      addItem(product, quantity);
    }
    openCart();
    onClose();
  };

  const productImage = product.images?.[0]?.src || "/images/placeholder.png";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div 
              className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Image */}
              <div className="relative">
                <div className="aspect-[16/9] relative bg-[var(--color-dark-3)] overflow-hidden">
                  <Image
                    src={productImage}
                    alt={product.name}
                    fill
                    className="object-contain p-4"
                  />
                </div>
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                {/* Product Name */}
                <h3 className="font-heading text-xl mb-2">{product.name}</h3>
                <p className="text-sm text-white/60 mb-4">{product.category}</p>

                {/* Variant Selectors */}
                <div className="space-y-4 mb-6">
                  {/* Size/Style Selector */}
                  {groupedVariants.sizes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white/80 mb-2">
                        {groupedVariants.sizes[0].parsed.type === "size" ? "Size / Style" : "Option"}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {groupedVariants.sizes.map(({ variant, parsed }) => {
                          const isSelected = selectedVariant?.id === variant.id;
                          const isOutOfStock = variant.stock !== undefined && variant.stock <= 0;
                          
                          return (
                            <button
                              key={variant.id}
                              onClick={() => !isOutOfStock && setSelectedVariant(variant)}
                              disabled={isOutOfStock}
                              className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                isSelected
                                  ? "bg-[var(--color-main-1)] text-white ring-2 ring-[var(--color-main-1)]/30"
                                  : "bg-[var(--color-dark-3)] text-white/80 hover:bg-[var(--color-dark-4)]",
                                isOutOfStock && "opacity-40 cursor-not-allowed line-through"
                              )}
                            >
                              {parsed.display}
                              {variant.price && variant.price !== product.price && (
                                <span className="ml-1 text-xs opacity-70">
                                  ({formatPrice(variant.price)})
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Color Selector */}
                  {groupedVariants.colors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white/80 mb-2">
                        Color
                        {selectedVariant && (
                          <span className="ml-2 font-normal text-white/50">
                            - {groupedVariants.colors.find(c => c.variant.id === selectedVariant.id)?.parsed.display || ""}
                          </span>
                        )}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {groupedVariants.colors.map(({ variant, parsed }) => {
                          const isSelected = selectedVariant?.id === variant.id;
                          const isOutOfStock = variant.stock !== undefined && variant.stock <= 0;
                          const colorHex = getColorHex(parsed.value);
                          
                          return (
                            <button
                              key={variant.id}
                              onClick={() => !isOutOfStock && setSelectedVariant(variant)}
                              disabled={isOutOfStock}
                              className={cn(
                                "w-10 h-10 rounded-full transition-all relative",
                                isSelected && "ring-2 ring-offset-2 ring-offset-[var(--color-dark-2)] ring-[var(--color-main-1)]",
                                isOutOfStock && "opacity-40 cursor-not-allowed"
                              )}
                              style={{ backgroundColor: colorHex }}
                              title={`${parsed.display}${isOutOfStock ? " (Out of stock)" : ""}`}
                            >
                              {isOutOfStock && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <span className="w-full h-0.5 bg-red-500 rotate-45 absolute" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Other Variants */}
                  {groupedVariants.others.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white/80 mb-2">Options</h4>
                      <div className="flex flex-wrap gap-2">
                        {groupedVariants.others.map(({ variant, parsed }) => {
                          const isSelected = selectedVariant?.id === variant.id;
                          const isOutOfStock = variant.stock !== undefined && variant.stock <= 0;
                          
                          return (
                            <button
                              key={variant.id}
                              onClick={() => !isOutOfStock && setSelectedVariant(variant)}
                              disabled={isOutOfStock}
                              className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                isSelected
                                  ? "bg-[var(--color-main-1)] text-white ring-2 ring-[var(--color-main-1)]/30"
                                  : "bg-[var(--color-dark-3)] text-white/80 hover:bg-[var(--color-dark-4)]",
                                isOutOfStock && "opacity-40 cursor-not-allowed line-through"
                              )}
                            >
                              {parsed.display}
                              {variant.price && variant.price !== product.price && (
                                <span className="ml-1 text-xs opacity-70">
                                  ({formatPrice(variant.price)})
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quantity */}
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-sm text-white/80">Quantity:</span>
                  <div className="flex items-center">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 flex items-center justify-center bg-[var(--color-dark-3)] rounded-l-lg hover:bg-[var(--color-dark-4)] transition-colors"
                    >
                      −
                    </button>
                    <span className="w-12 h-8 flex items-center justify-center bg-[var(--color-dark-4)] text-sm">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center bg-[var(--color-dark-3)] rounded-r-lg hover:bg-[var(--color-dark-4)] transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Price Display */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-2xl font-bold text-[var(--color-main-1)]">
                      {formatPrice(effectivePrice * quantity)}
                    </span>
                    {quantity > 1 && (
                      <span className="ml-2 text-sm text-white/50">
                        ({formatPrice(effectivePrice)} each)
                      </span>
                    )}
                  </div>
                  {product.compareAtPrice && effectivePrice < product.compareAtPrice && (
                    <del className="text-white/40">{formatPrice(product.compareAtPrice)}</del>
                  )}
                </div>

                {/* Stock Status */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={cn("w-2 h-2 rounded-full", isInStock ? "bg-green-500" : "bg-red-500")} />
                  <span className="text-sm text-white/60">
                    {isInStock ? "In Stock" : "Out of Stock"}
                  </span>
                  {selectedVariant?.stock !== undefined && selectedVariant.stock > 0 && selectedVariant.stock < 10 && (
                    <span className="text-xs text-amber-400">
                      (Only {selectedVariant.stock} left)
                    </span>
                  )}
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={!isInStock || !selectedVariant}
                  className={cn(
                    "w-full py-3 rounded-lg font-medium text-white transition-all",
                    isInStock && selectedVariant
                      ? "bg-[var(--color-main-1)] hover:bg-[var(--color-main-1)]/80"
                      : "bg-white/10 cursor-not-allowed"
                  )}
                >
                  {!selectedVariant 
                    ? "Select an Option" 
                    : isInStock 
                      ? "Add to Cart" 
                      : "Out of Stock"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

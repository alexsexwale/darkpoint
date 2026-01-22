"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores";
import type { Product, ProductVariant } from "@/types";

// Extended color mappings
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
  rainbow: { hex: "#FF0000", gradient: "linear-gradient(135deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #8B00FF)" },
};

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL"];
const MEMORY_ORDER = ["4GB", "8GB", "16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"];

interface VariantSelectionModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

// Extract the actual attribute from variant name
function extractAttributeFromName(fullName: string): string {
  if (!fullName) return "";
  const name = fullName.trim();
  const words = name.split(/[\s_-]+/);
  const lastWord = words[words.length - 1];
  const lastWordLower = lastWord.toLowerCase();
  
  if (COLOR_MAP[lastWordLower]) return lastWord;
  
  if (words.length >= 2) {
    const lastTwoWords = words.slice(-2).join(" ");
    for (const color of Object.keys(COLOR_MAP)) {
      if (lastTwoWords.toLowerCase().includes(color)) return lastTwoWords;
    }
  }
  
  const sizeMatch = name.match(/\b(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|\d+GB|\d+TB)\s*$/i);
  if (sizeMatch) return sizeMatch[1].toUpperCase();
  
  for (const color of Object.keys(COLOR_MAP)) {
    if (lastWordLower === color || lastWordLower.includes(color)) {
      return color.charAt(0).toUpperCase() + color.slice(1);
    }
  }
  
  return lastWord.length <= 20 ? lastWord : name.slice(-20);
}

function parseVariantAttribute(variant: ProductVariant): { 
  type: "size" | "color" | "other"; 
  value: string; 
  display: string;
  colorInfo?: { hex: string; gradient?: string };
} {
  let rawValue = variant.value || variant.name || "";
  if (rawValue.length > 30) rawValue = extractAttributeFromName(rawValue);
  
  const lowerValue = rawValue.toLowerCase().trim();
  
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
  
  const upperValue = rawValue.toUpperCase();
  if (SIZE_ORDER.includes(upperValue) || MEMORY_ORDER.some(m => upperValue.includes(m))) {
    return { type: "size", value: upperValue, display: upperValue };
  }
  
  return {
    type: "other",
    value: rawValue,
    display: rawValue.length > 25 ? rawValue.slice(0, 22) + "..." : rawValue,
  };
}

export function VariantSelectionModal({ product, isOpen, onClose }: VariantSelectionModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem, openCart } = useCartStore();

  useEffect(() => {
    if (isOpen && product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
      setQuantity(1);
    }
  }, [isOpen, product.variants]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const { colors, sizes, others } = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return { colors: [], sizes: [], others: [] };
    }

    const colorItems: { variant: ProductVariant; parsed: ReturnType<typeof parseVariantAttribute> }[] = [];
    const sizeItems: { variant: ProductVariant; parsed: ReturnType<typeof parseVariantAttribute> }[] = [];
    const otherItems: { variant: ProductVariant; parsed: ReturnType<typeof parseVariantAttribute> }[] = [];

    product.variants.forEach(variant => {
      const parsed = parseVariantAttribute(variant);
      const item = { variant, parsed };

      switch (parsed.type) {
        case "color": colorItems.push(item); break;
        case "size": sizeItems.push(item); break;
        default: otherItems.push(item);
      }
    });

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
  const hasColors = colors.length > 0;
  const hasSizes = sizes.length > 0;
  const hasOthers = others.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div 
              className="bg-gradient-to-b from-[var(--color-dark-2)] to-[var(--color-dark-1)] border border-[var(--color-dark-3)] rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-black/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Image */}
              <div className="relative bg-gradient-to-b from-[var(--color-dark-3)] to-transparent">
                <div className="aspect-[4/3] relative overflow-hidden">
                  <Image
                    src={productImage}
                    alt={product.name}
                    fill
                    className="object-contain p-6"
                  />
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--color-dark-2)] to-transparent" />
                </div>
                
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 hover:bg-[var(--color-main-1)] text-white transition-all hover:scale-110"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="px-6 pb-6 -mt-4 relative">
                {/* Product Name */}
                <h3 className="font-heading text-xl mb-1 line-clamp-2">{product.name}</h3>
                <p className="text-sm text-[var(--color-main-1)] uppercase tracking-wider mb-4">{product.category}</p>

                {/* Variant Selectors */}
                <div className="space-y-5 mb-6 max-h-[30vh] overflow-y-auto pr-2">
                  {/* Colors */}
                  {hasColors && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="text-sm font-medium text-white/70">Color:</h4>
                        {selectedVariant && colors.find(c => c.variant.id === selectedVariant.id) && (
                          <span className="text-sm font-medium text-[var(--color-main-1)]">
                            {colors.find(c => c.variant.id === selectedVariant.id)?.parsed.display}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {colors.map(({ variant, parsed }) => {
                          const isSelected = selectedVariant?.id === variant.id;
                          const isOutOfStock = variant.stock !== undefined && variant.stock <= 0;
                          const colorStyle = parsed.colorInfo?.gradient 
                            ? { background: parsed.colorInfo.gradient }
                            : { backgroundColor: parsed.colorInfo?.hex || "#888" };

                          return (
                            <button
                              key={variant.id}
                              onClick={() => !isOutOfStock && setSelectedVariant(variant)}
                              disabled={isOutOfStock}
                              className={cn(
                                "relative w-11 h-11 rounded-full transition-all duration-200",
                                "hover:scale-110 focus:outline-none",
                                isSelected && "ring-2 ring-[var(--color-main-1)] ring-offset-2 ring-offset-[var(--color-dark-2)] scale-110",
                                isOutOfStock && "opacity-40 cursor-not-allowed"
                              )}
                              title={parsed.display}
                            >
                              <span
                                className={cn(
                                  "absolute inset-1 rounded-full shadow-inner",
                                  parsed.colorInfo?.hex === "#FFFFFF" && "border border-white/30"
                                )}
                                style={colorStyle}
                              />
                              <span className="absolute inset-1 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-60" />
                              
                              {isSelected && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <svg 
                                    className={cn(
                                      "w-4 h-4 drop-shadow-lg",
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

                  {/* Sizes */}
                  {hasSizes && (
                    <div>
                      <h4 className="text-sm font-medium text-white/70 mb-3">
                        {sizes.some(s => s.parsed.display.includes("GB")) ? "Storage" : "Size"}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {sizes.map(({ variant, parsed }) => {
                          const isSelected = selectedVariant?.id === variant.id;
                          const isOutOfStock = variant.stock !== undefined && variant.stock <= 0;

                          return (
                            <button
                              key={variant.id}
                              onClick={() => !isOutOfStock && setSelectedVariant(variant)}
                              disabled={isOutOfStock}
                              className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                "border-2 focus:outline-none",
                                isSelected 
                                  ? "bg-[var(--color-main-1)] border-[var(--color-main-1)] text-white shadow-lg shadow-[var(--color-main-1)]/30" 
                                  : "border-white/20 text-white/80 hover:border-[var(--color-main-1)] hover:text-[var(--color-main-1)]",
                                isOutOfStock && "opacity-40 cursor-not-allowed line-through"
                              )}
                            >
                              {parsed.display}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Others */}
                  {hasOthers && (
                    <div>
                      <h4 className="text-sm font-medium text-white/70 mb-3">Options</h4>
                      <div className="flex flex-wrap gap-2">
                        {others.map(({ variant, parsed }) => {
                          const isSelected = selectedVariant?.id === variant.id;
                          const isOutOfStock = variant.stock !== undefined && variant.stock <= 0;

                          return (
                            <button
                              key={variant.id}
                              onClick={() => !isOutOfStock && setSelectedVariant(variant)}
                              disabled={isOutOfStock}
                              className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                "border-2 focus:outline-none",
                                isSelected 
                                  ? "bg-[var(--color-main-1)] border-[var(--color-main-1)] text-white" 
                                  : "border-white/20 text-white/80 hover:border-[var(--color-main-1)]",
                                isOutOfStock && "opacity-40 cursor-not-allowed"
                              )}
                            >
                              {parsed.display}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quantity & Price */}
                <div className="flex items-center justify-between py-4 border-t border-white/10">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <span className="w-12 text-center text-lg font-bold">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-[var(--color-main-1)]">
                      {formatPrice(effectivePrice * quantity)}
                    </div>
                    {quantity > 1 && (
                      <div className="text-xs text-white/50">
                        {formatPrice(effectivePrice)} each
                      </div>
                    )}
                  </div>
                </div>

                {/* Stock & Add to Cart */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={cn("w-2 h-2 rounded-full", isInStock ? "bg-green-500" : "bg-red-500")} />
                    <span className="text-white/60">
                      {isInStock ? "In Stock" : "Out of Stock"}
                    </span>
                    {selectedVariant?.stock !== undefined && selectedVariant.stock > 0 && selectedVariant.stock < 10 && (
                      <span className="text-amber-400 text-xs">
                        (Only {selectedVariant.stock} left!)
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleAddToCart}
                    disabled={!isInStock || !selectedVariant}
                    className={cn(
                      "w-full py-4 rounded-xl font-bold text-white transition-all duration-300",
                      "flex items-center justify-center gap-2",
                      isInStock && selectedVariant
                        ? "bg-gradient-to-r from-[var(--color-main-1)] to-[var(--color-main-2,var(--color-main-1))] hover:shadow-lg hover:shadow-[var(--color-main-1)]/30 hover:scale-[1.02] active:scale-[0.98]"
                        : "bg-white/10 cursor-not-allowed"
                    )}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {!selectedVariant 
                      ? "Select an Option" 
                      : isInStock 
                        ? "Add to Cart" 
                        : "Out of Stock"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

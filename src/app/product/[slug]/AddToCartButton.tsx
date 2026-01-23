"use client";

import { useState } from "react";
import { useCartStore } from "@/stores";
import { formatPrice } from "@/lib/utils";
import type { Product, ProductVariant } from "@/types";

interface AddToCartButtonProps {
  product: Product;
  selectedVariant?: ProductVariant | null;
  effectivePrice?: number;
  hasVariants?: boolean; // Whether product has variants that need selection
}

export function AddToCartButton({ product, selectedVariant, effectivePrice, hasVariants }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const { addItem, openCart } = useCartStore();

  // Use effective price if provided, otherwise fall back to product price
  const displayPrice = effectivePrice ?? product.price;
  
  // Require variant selection if product has variants
  const requiresVariantSelection = hasVariants && !selectedVariant;
  const isInStock = true;
  const canAddToCart = isInStock && !requiresVariantSelection;

  const handleAddToCart = () => {
    if (!canAddToCart) return;
    
    // If variant is selected, pass it to the cart with the effective price
    if (selectedVariant) {
      // Create variant with effective price
      const variantWithPrice = {
        ...selectedVariant,
        price: displayPrice,
      };
      addItem(product, quantity, variantWithPrice);
    } else {
      addItem(product, quantity);
    }
    openCart();
  };
  
  // Button text based on state
  const getButtonText = () => {
    if (!isInStock) return "Out of Stock";
    if (requiresVariantSelection) return "Select Options";
    return "Add to Cart";
  };

  const incrementQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const decrementQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden lg:flex nk-product-addtocart flex-wrap items-center gap-6">
        <div className="nk-form-control-number nk-form-control-number-sm">
          <button
            type="button"
            className="nk-form-control-number-down"
            onClick={decrementQuantity}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            aria-label="Quantity"
          />
          <button
            type="button"
            className="nk-form-control-number-up"
            onClick={incrementQuantity}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <button
          type="button"
          className={`nk-btn nk-btn-lg link-effect-4 ${canAddToCart ? 'nk-btn-primary' : 'nk-btn-outline opacity-60'}`}
          onClick={handleAddToCart}
          disabled={!canAddToCart}
        >
          <span className="nk-btn-inner" />
          <span className="nk-btn-content">
            {getButtonText()}
          </span>
        </button>

        <div className="nk-product-price text-2xl font-bold">
          {formatPrice(displayPrice)}
          {product.compareAtPrice && displayPrice < product.compareAtPrice && (
            <del className="ml-4 text-base text-white/50 font-normal">
              {formatPrice(product.compareAtPrice)}
            </del>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden space-y-3">
        <div className="text-2xl font-bold text-[var(--color-main-1)]">
          {formatPrice(displayPrice)}
          {product.compareAtPrice && displayPrice < product.compareAtPrice && (
            <del className="ml-2 text-sm text-white/50 font-normal">
              {formatPrice(product.compareAtPrice)}
            </del>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-white/20 rounded">
            <button
              type="button"
              onClick={decrementQuantity}
              className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 h-10 text-center bg-transparent border-x border-white/20 text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Quantity"
            />
            <button
              type="button"
              onClick={incrementQuantity}
              className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className={`flex-1 h-10 px-4 font-medium text-sm transition-colors disabled:cursor-not-allowed ${
              canAddToCart 
                ? 'bg-[var(--color-main-1)] text-white hover:bg-[var(--color-main-1)]/90' 
                : 'bg-white/10 text-white/60 border border-white/20'
            }`}
          >
            {getButtonText()}
          </button>
        </div>
      </div>
    </>
  );
}

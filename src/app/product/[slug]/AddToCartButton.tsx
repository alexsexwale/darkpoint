"use client";

import { useState } from "react";
import { useCartStore } from "@/stores";
import { formatPrice } from "@/lib/utils";
import type { Product, ProductVariant } from "@/types";

interface AddToCartButtonProps {
  product: Product;
  selectedVariant?: ProductVariant | null;
  effectivePrice?: number;
}

export function AddToCartButton({ product, selectedVariant, effectivePrice }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const { addItem, openCart } = useCartStore();

  // Use effective price if provided, otherwise fall back to product price
  const displayPrice = effectivePrice ?? product.price;
  
  // Check stock based on selected variant or product
  const isInStock = selectedVariant 
    ? (selectedVariant.stock === undefined || selectedVariant.stock > 0)
    : product.inStock;

  const handleAddToCart = () => {
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

  const incrementQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const decrementQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  return (
    <div className="space-y-3">
      {/* Price Display */}
      <div className="text-2xl font-bold text-[var(--color-main-1)]">
        {formatPrice(displayPrice)}
        {product.compareAtPrice && displayPrice < product.compareAtPrice && (
          <del className="ml-2 text-sm text-white/50 font-normal">
            {formatPrice(product.compareAtPrice)}
          </del>
        )}
      </div>
      
      {/* Quantity and Add to Cart Row */}
      <div className="flex items-center gap-2">
        {/* Quantity Picker */}
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

        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!isInStock}
          className="flex-1 h-10 px-4 bg-[var(--color-main-1)] text-white font-medium text-sm hover:bg-[var(--color-main-1)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isInStock ? "Add to Cart" : "Out of Stock"}
        </button>
      </div>
    </div>
  );
}

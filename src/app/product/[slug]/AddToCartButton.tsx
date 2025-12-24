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
    <div className="nk-product-addtocart flex flex-wrap items-center gap-6">
      {/* Quantity Picker - Godlike Style */}
      <div className="nk-form-control-number">
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

      {/* Add to Cart Button - Godlike Style */}
      <button
        type="button"
        className="nk-btn nk-btn-primary nk-btn-lg link-effect-4"
        onClick={handleAddToCart}
        disabled={!isInStock}
      >
        <span className="nk-btn-inner" />
        <span className="nk-btn-content">
          {isInStock ? "Add to Cart" : "Out of Stock"}
        </span>
      </button>

      {/* Price Display */}
      <div className="nk-product-price text-2xl font-bold">
        {formatPrice(displayPrice)}
        {product.compareAtPrice && displayPrice < product.compareAtPrice && (
          <del className="ml-4 text-base text-white/50 font-normal">
            {formatPrice(product.compareAtPrice)}
          </del>
        )}
      </div>
    </div>
  );
}

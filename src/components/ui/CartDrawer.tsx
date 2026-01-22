"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/stores";
import { useRewardsStore, getRewardDisplayInfo } from "@/stores/rewardsStore";
import { useShippingThreshold } from "@/hooks";
import { formatPrice, getVariantDisplayName } from "@/lib/utils";
import { Button } from "./Button";
import { FreeDeliveryIndicator } from "./FreeDeliveryIndicator";
import { RewardSelector } from "@/components/cart/RewardSelector";

export function CartDrawer() {
  const { isOpen, closeCart, items, removeItem, updateQuantity, subtotal } =
    useCartStore();
  const { appliedReward, getDiscountAmount, getShippingDiscount } = useRewardsStore();
  const { threshold: freeShippingThreshold, calculateFee } = useShippingThreshold();

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeCart();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeCart]);

  const total = subtotal();
  const baseShippingCost = calculateFee(total);
  
  // Calculate reward discounts
  const discountAmount = getDiscountAmount(total);
  const shippingDiscount = getShippingDiscount(baseShippingCost);
  const shippingCost = baseShippingCost - shippingDiscount;
  const isFreeShipping = shippingCost === 0;
  
  const finalTotal = total - discountAmount + shippingCost;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 z-40"
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed right-0 top-0 bottom-0 w-[400px] max-w-full bg-[var(--color-dark-1)] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-dark-3)]">
              <h2 className="text-xl font-heading">Shopping Cart</h2>
              <button
                onClick={closeCart}
                className="p-2 text-[var(--muted-foreground)] hover:text-white transition-colors"
                aria-label="Close cart"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 mx-auto text-[var(--color-dark-4)] mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  <p className="text-[var(--muted-foreground)]">Your cart is empty</p>
                  <Link href="/store" onClick={closeCart}>
                    <Button variant="outline" className="mt-4">
                      Continue Shopping
                    </Button>
                  </Link>
                </div>
              ) : (
                <ul className="space-y-6">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex gap-4 pb-6 border-b border-[var(--color-dark-3)]"
                    >
                      {/* Image */}
                      <Link
                        href={`/product/${item.product.slug}`}
                        onClick={closeCart}
                        className="flex-shrink-0 w-20 h-20 bg-[var(--color-dark-2)]"
                      >
                        <Image
                          src={item.product.images[0]?.src || "/images/placeholder.png"}
                          alt={item.product.name}
                          width={80}
                          height={80}
                          className="w-full h-full object-contain p-2"
                        />
                      </Link>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/product/${item.product.slug}`}
                          onClick={closeCart}
                          className="font-heading text-sm hover:text-[var(--color-main-1)] transition-colors line-clamp-2"
                        >
                          {item.product.name}
                        </Link>
                        
                        {/* Variant Info */}
                        {item.variant && (
                          <p className="text-xs text-[var(--color-main-1)] mt-1 flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-main-1)]" />
                            {getVariantDisplayName(item.variant)}
                          </p>
                        )}
                        
                        <p className="text-sm text-[var(--muted-foreground)] mt-1">
                          {formatPrice(item.variant?.price ?? item.product.price)}
                        </p>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] transition-colors text-xs"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] transition-colors text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-[var(--muted-foreground)] hover:text-[var(--color-main-5)] transition-colors"
                        aria-label="Remove item"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 border-t border-[var(--color-dark-3)] space-y-4">
                {/* Free Delivery Indicator */}
                <FreeDeliveryIndicator subtotal={total} variant="compact" />

                {/* Reward Selector - Compact */}
                <RewardSelector subtotal={total} shippingCost={baseShippingCost} variant="compact" />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">Subtotal</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  
                  {/* Show discount if applied */}
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-500 flex items-center gap-1">
                        <span className="text-xs">🎁</span>
                        Discount
                      </span>
                      <span className="text-green-500">-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">Delivery</span>
                    {isFreeShipping ? (
                      <span className="text-green-500 font-medium flex items-center gap-1">
                        {shippingDiscount > 0 && <span className="text-xs">🎁</span>}
                        FREE
                      </span>
                    ) : (
                      <span>{formatPrice(shippingCost)}</span>
                    )}
                  </div>
                  
                  {/* Show savings */}
                  {(discountAmount > 0 || shippingDiscount > 0) && (
                    <div className="flex items-center justify-between text-sm bg-green-500/10 -mx-2 px-2 py-1 rounded">
                      <span className="text-green-400">You save</span>
                      <span className="text-green-400 font-medium">{formatPrice(discountAmount + shippingDiscount)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--color-dark-3)]">
                    <span className="text-lg font-medium">Total</span>
                    <span className="text-xl font-bold text-[var(--color-main-1)]">
                      {formatPrice(finalTotal)}
                    </span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                  <Link href="/checkout" onClick={closeCart} className="block">
                    <Button variant="primary" className="w-full">
                      Checkout
                    </Button>
                  </Link>
                  <Link href="/cart" onClick={closeCart} className="block">
                    <Button variant="outline" className="w-full">
                      View Cart
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/stores";
import { Button, FreeDeliveryIndicator } from "@/components/ui";
import { formatPrice } from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE } from "@/lib/constants";

export function CartContent() {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCartStore();

  const total = subtotal();
  const isFreeShipping = total >= FREE_SHIPPING_THRESHOLD;
  const shippingCost = isFreeShipping ? 0 : STANDARD_SHIPPING_FEE;
  const finalTotal = total + shippingCost;

  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-[var(--color-dark-2)]">
        <svg
          className="w-24 h-24 mx-auto text-[var(--color-dark-4)] mb-6"
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
        <h2 className="text-2xl mb-4">Your cart is empty</h2>
        <p className="text-[var(--muted-foreground)] mb-8">
          Looks like you haven&apos;t added any items to your cart yet.
        </p>
        <Link href="/store">
          <Button variant="primary" size="lg">
            Continue Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Cart Items */}
      <div className="lg:col-span-2 space-y-6">
        {/* Free Delivery Indicator */}
        <FreeDeliveryIndicator subtotal={total} variant="default" />

        <div className="bg-[var(--color-dark-2)] p-4 md:p-6">
          {/* Desktop Table Header */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-4 pb-4 border-b border-[var(--color-dark-3)] text-sm font-heading">
            <div className="col-span-5">Product</div>
            <div className="col-span-2 text-center">Price</div>
            <div className="col-span-2 text-center">Quantity</div>
            <div className="col-span-2 text-center">Total</div>
            <div className="col-span-1"></div>
          </div>

          {/* Cart Items */}
          <AnimatePresence>
            {items.map((item) => {
              const price = item.variant?.price ?? item.product.price;
              const itemTotal = price * item.quantity;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="border-b border-[var(--color-dark-3)] py-6 last:border-b-0"
                >
                  {/* Desktop Layout */}
                  <div className="hidden lg:grid lg:grid-cols-12 gap-4 items-center">
                    {/* Product */}
                    <div className="col-span-5 flex items-center gap-4">
                      <Link
                        href={`/product/${item.product.slug}`}
                        className="flex-shrink-0 w-20 h-20 bg-[var(--color-dark-3)] rounded-lg overflow-hidden"
                      >
                        <Image
                          src={item.product.images[0]?.src || "/images/placeholder.png"}
                          alt={item.product.name}
                          width={80}
                          height={80}
                          className="w-full h-full object-contain p-2"
                        />
                      </Link>
                      <div className="min-w-0">
                        <Link
                          href={`/product/${item.product.slug}`}
                          className="font-heading text-sm hover:text-[var(--color-main-1)] transition-colors line-clamp-2"
                        >
                          {item.product.name}
                        </Link>
                        {item.variant && (
                          <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            {item.variant.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="col-span-2 text-center">
                      <span className="font-medium">{formatPrice(price)}</span>
                      {item.product.compareAtPrice && (
                        <del className="block text-xs text-[var(--muted-foreground)]">
                          {formatPrice(item.product.compareAtPrice)}
                        </del>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2 flex justify-center">
                      <div className="inline-flex items-center bg-[var(--color-dark-3)] rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-10 h-10 flex items-center justify-center hover:bg-[var(--color-dark-4)] rounded-l-lg transition-colors text-lg"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(
                              item.id,
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          className="w-12 h-10 text-center bg-transparent text-white focus:outline-none font-medium"
                        />
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-10 h-10 flex items-center justify-center hover:bg-[var(--color-dark-4)] rounded-r-lg transition-colors text-lg"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="col-span-2 text-center">
                      <span className="font-bold text-[var(--color-main-1)]">
                        {formatPrice(itemTotal)}
                      </span>
                    </div>

                    {/* Remove */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-10 h-10 flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        aria-label="Remove item"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Mobile/Tablet Layout */}
                  <div className="lg:hidden">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <Link
                        href={`/product/${item.product.slug}`}
                        className="flex-shrink-0 w-24 h-24 bg-[var(--color-dark-3)] rounded-lg overflow-hidden"
                      >
                        <Image
                          src={item.product.images[0]?.src || "/images/placeholder.png"}
                          alt={item.product.name}
                          width={96}
                          height={96}
                          className="w-full h-full object-contain p-2"
                        />
                      </Link>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <Link
                            href={`/product/${item.product.slug}`}
                            className="font-heading text-sm hover:text-[var(--color-main-1)] transition-colors line-clamp-2"
                          >
                            {item.product.name}
                          </Link>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            aria-label="Remove item"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>

                        {item.variant && (
                          <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            {item.variant.name}
                          </p>
                        )}

                        <div className="mt-2 text-sm">
                          <span className="font-medium">{formatPrice(price)}</span>
                          {item.product.compareAtPrice && (
                            <del className="ml-2 text-xs text-[var(--muted-foreground)]">
                              {formatPrice(item.product.compareAtPrice)}
                            </del>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quantity and Total Row */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-dark-3)]/50">
                      {/* Quantity */}
                      <div className="inline-flex items-center bg-[var(--color-dark-3)] rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-10 h-10 flex items-center justify-center hover:bg-[var(--color-dark-4)] rounded-l-lg transition-colors text-lg"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(
                              item.id,
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          className="w-12 h-10 text-center bg-transparent text-white focus:outline-none font-medium"
                        />
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-10 h-10 flex items-center justify-center hover:bg-[var(--color-dark-4)] rounded-r-lg transition-colors text-lg"
                        >
                          +
                        </button>
                      </div>

                      {/* Item Total */}
                      <div className="text-right">
                        <p className="text-xs text-[var(--muted-foreground)]">Item Total</p>
                        <p className="font-bold text-lg text-[var(--color-main-1)]">
                          {formatPrice(itemTotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Cart Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-6 border-t border-[var(--color-dark-3)]">
            <button
              onClick={clearCart}
              className="text-sm text-[var(--muted-foreground)] hover:text-red-500 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Clear Cart
            </button>
            <Link href="/store">
              <Button variant="outline" size="sm">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Cart Summary */}
      <div className="lg:col-span-1">
        <div className="bg-[var(--color-dark-2)] p-6 sticky top-32 rounded-lg">
          <h2 className="text-xl font-heading mb-6 text-center">Cart Totals</h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-[var(--color-dark-3)]">
              <span className="text-[var(--muted-foreground)]">Subtotal</span>
              <span className="font-medium">{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-[var(--color-dark-3)]">
              <span className="text-[var(--muted-foreground)]">Delivery</span>
              <span className="font-medium">
                {isFreeShipping ? (
                  <span className="text-green-500">FREE</span>
                ) : (
                  formatPrice(shippingCost)
                )}
              </span>
            </div>
            <div className="flex justify-between items-center py-4">
              <span className="text-lg font-bold">Total</span>
              <span className="text-xl font-bold text-[var(--color-main-1)]">
                {formatPrice(finalTotal)}
              </span>
            </div>
          </div>

          {!isFreeShipping && (
            <div className="mb-6 p-4 bg-[var(--color-main-1)]/10 border border-[var(--color-main-1)]/30 rounded-lg">
              <p className="text-sm text-center">
                Add{" "}
                <span className="font-bold text-[var(--color-main-1)]">
                  {formatPrice(FREE_SHIPPING_THRESHOLD - total)}
                </span>{" "}
                more for{" "}
                <span className="font-bold text-green-500">FREE</span> delivery!
              </p>
            </div>
          )}

          <Link href="/checkout" className="block">
            <Button variant="primary" size="lg" className="w-full">
              Proceed to Checkout
            </Button>
          </Link>

          {/* Trust Badges */}
          <div className="mt-6 pt-6 border-t border-[var(--color-dark-3)]">
            <div className="flex justify-center gap-4 text-xs text-[var(--muted-foreground)]">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Secure
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Safe Payment
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

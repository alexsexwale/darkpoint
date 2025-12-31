"use client";

import { useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/stores";
import { useRewardsStore, getRewardDisplayInfo } from "@/stores/rewardsStore";
import { Button, Input, TextArea, FreeDeliveryIndicator } from "@/components/ui";
import { RewardSelector } from "@/components/cart/RewardSelector";
import { formatPrice } from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE } from "@/lib/constants";

export function CheckoutContent() {
  const { items, subtotal } = useCartStore();
  const { appliedReward, getDiscountAmount, getShippingDiscount } = useRewardsStore();
  const [sameAsBilling, setSameAsBilling] = useState(true);

  const total = subtotal();
  const baseShippingCost = total >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  
  // Calculate reward discounts
  const discountAmount = getDiscountAmount(total);
  const shippingDiscount = getShippingDiscount(baseShippingCost);
  const shippingCost = baseShippingCost - shippingDiscount;
  const isFreeShipping = shippingCost === 0;
  
  const finalTotal = total - discountAmount + shippingCost;

  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-[var(--color-dark-2)]">
        <p className="text-[var(--muted-foreground)] mb-8">
          Your cart is empty. Add items to checkout.
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
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Billing Details */}
      <div className="space-y-8">
        <div className="bg-[var(--color-dark-2)] p-8">
          <h2 className="text-xl font-heading mb-8 text-center">Billing Details</h2>

          <form className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <Input
                type="text"
                placeholder="First Name *"
                required
              />
              <Input
                type="text"
                placeholder="Last Name *"
                required
              />
            </div>

            <Input
              type="text"
              placeholder="Company Name (optional)"
            />

            <div className="grid sm:grid-cols-2 gap-6">
              <Input
                type="email"
                placeholder="Email Address *"
                required
              />
              <Input
                type="tel"
                placeholder="Phone *"
                required
              />
            </div>

            <div className="nk-form-group">
              <select
                className="nk-form-control"
                required
              >
                <option value="">Select a country *</option>
                <option value="ZA">South Africa</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
              </select>
            </div>

            <Input
              type="text"
              placeholder="Address *"
              required
            />

            <Input
              type="text"
              placeholder="City *"
              required
            />

            <div className="grid sm:grid-cols-2 gap-6">
              <Input
                type="text"
                placeholder="State/Province *"
                required
              />
              <Input
                type="text"
                placeholder="ZIP/Postal Code *"
                required
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sameAsBilling}
                onChange={(e) => setSameAsBilling(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-main-1)] cursor-pointer"
              />
              <span className="text-sm">Ship to same address</span>
            </label>
          </form>
        </div>

        {/* Shipping Address (if different) */}
        {!sameAsBilling && (
          <div className="bg-[var(--color-dark-2)] p-8">
            <h2 className="text-xl font-heading mb-8 text-center">
              Shipping Address
            </h2>
            <form className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <Input
                  type="text"
                  placeholder="First Name *"
                />
                <Input
                  type="text"
                  placeholder="Last Name *"
                />
              </div>
              <Input
                type="text"
                placeholder="Address *"
              />
              <Input
                type="text"
                placeholder="City *"
              />
              <div className="grid sm:grid-cols-2 gap-6">
                <Input
                  type="text"
                  placeholder="State *"
                />
                <Input
                  type="text"
                  placeholder="ZIP *"
                />
              </div>
            </form>
          </div>
        )}

        {/* Order Notes */}
        <div className="bg-[var(--color-dark-2)] p-8">
          <TextArea
            placeholder="Order Notes (optional)"
            rows={4}
          />
        </div>
      </div>

      {/* Order Summary */}
      <div className="space-y-8">
        <div className="bg-[var(--color-dark-2)] p-6 md:p-8 sticky top-32">
          <h2 className="text-xl font-heading mb-6 md:mb-8 text-center">Your Order</h2>

          {/* Reward Selector */}
          <div className="mb-6">
            <RewardSelector subtotal={total} shippingCost={baseShippingCost} />
          </div>

          <table className="w-full text-sm md:text-base">
            <thead>
              <tr className="border-b border-[var(--color-dark-3)]">
                <th className="text-left pb-4 font-heading text-sm">Product</th>
                <th className="text-right pb-4 font-heading text-sm">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const price = item.variant?.price ?? item.product.price;
                return (
                  <tr key={item.id} className="border-b border-[var(--color-dark-3)]">
                    <td className="py-4 pr-2">
                      <span className="line-clamp-2">{item.product.name}</span>
                      <span className="text-white/60"> × {item.quantity}</span>
                    </td>
                    <td className="py-4 text-right whitespace-nowrap">
                      {formatPrice(price * item.quantity)}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-b border-[var(--color-dark-3)]">
                <td className="py-4">Subtotal</td>
                <td className="py-4 text-right">{formatPrice(total)}</td>
              </tr>
              
              {/* Show discount if applied */}
              {discountAmount > 0 && (
                <tr className="border-b border-[var(--color-dark-3)]">
                  <td className="py-4 text-green-500 flex items-center gap-2">
                    <span>🎁</span>
                    {appliedReward && getRewardDisplayInfo(appliedReward).name}
                  </td>
                  <td className="py-4 text-right text-green-500">
                    -{formatPrice(discountAmount)}
                  </td>
                </tr>
              )}
              
              <tr className="border-b border-[var(--color-dark-3)]">
                <td className="py-4">Delivery</td>
                <td className="py-4 text-right">
                  {isFreeShipping ? (
                    <span className="text-green-500 font-medium flex items-center justify-end gap-1">
                      {shippingDiscount > 0 && <span>🎁</span>}
                      FREE
                    </span>
                  ) : (
                    formatPrice(shippingCost)
                  )}
                </td>
              </tr>
              
              {/* Show total savings */}
              {(discountAmount > 0 || shippingDiscount > 0) && (
                <tr className="bg-green-500/10">
                  <td className="py-3 px-2 text-green-400 font-medium">You save</td>
                  <td className="py-3 px-2 text-right text-green-400 font-medium">
                    {formatPrice(discountAmount + shippingDiscount)}
                  </td>
                </tr>
              )}
              
              <tr>
                <td className="py-6 text-lg font-bold">Total</td>
                <td className="py-6 text-right text-lg font-bold text-[var(--color-main-1)]">
                  {formatPrice(finalTotal)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Free Delivery Indicator */}
          {!isFreeShipping && total < FREE_SHIPPING_THRESHOLD && !appliedReward && (
            <div className="mt-6 pt-6 border-t border-[var(--color-dark-3)]">
              <FreeDeliveryIndicator subtotal={total} variant="compact" />
            </div>
          )}

          {/* Delivery Info */}
          <div className="mt-6 pt-6 border-t border-[var(--color-dark-3)]">
            <div className="flex items-start gap-3 text-sm text-[var(--muted-foreground)]">
              <svg className="w-5 h-5 text-[var(--color-main-1)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                {isFreeShipping ? (
                  <>Your order qualifies for <span className="text-green-500 font-medium">FREE delivery</span>!</>
                ) : total >= FREE_SHIPPING_THRESHOLD ? (
                  <>Your order qualifies for <span className="text-green-500 font-medium">FREE delivery</span>!</>
                ) : (
                  <>Standard delivery fee of <span className="text-white font-medium">{formatPrice(STANDARD_SHIPPING_FEE)}</span> applies. Spend <span className="text-[var(--color-main-1)] font-medium">{formatPrice(FREE_SHIPPING_THRESHOLD - total)}</span> more for free delivery!</>
                )}
              </p>
            </div>
          </div>

          <Button variant="primary" className="w-full mt-6">
            Place Order
          </Button>

          <p className="text-xs text-[var(--muted-foreground)] text-center mt-4">
            By placing your order, you agree to our{" "}
            <Link href="/terms" className="text-[var(--color-main-1)]">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-[var(--color-main-1)]">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

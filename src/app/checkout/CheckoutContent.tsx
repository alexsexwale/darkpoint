"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore, useAuthStore } from "@/stores";
import { useRewardsStore, getRewardDisplayInfo } from "@/stores/rewardsStore";
import { Button, Input, TextArea, FreeDeliveryIndicator } from "@/components/ui";
import { VerificationRequired } from "@/components/auth";
import { RewardSelector } from "@/components/cart/RewardSelector";
import { formatPrice } from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE } from "@/lib/constants";

interface BillingDetails {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
}

interface ShippingDetails {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
}

export function CheckoutContent() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCartStore();
  const { user, isAuthenticated, isEmailVerified } = useAuthStore();
  const { appliedReward, getDiscountAmount, getShippingDiscount, removeAppliedReward } = useRewardsStore();
  
  // If user is logged in but not verified, show verification required
  // (Guest checkout is allowed - only logged-in unverified users are blocked)
  if (isAuthenticated && !isEmailVerified) {
    return (
      <div className="py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-heading uppercase tracking-wider mb-4">
              Checkout
            </h1>
          </div>
          <VerificationRequired feature="place orders while logged in">
            <div />
          </VerificationRequired>
          <div className="mt-8 text-center">
            <p className="text-white/60 mb-4">
              Or you can checkout as a guest without logging in
            </p>
            <Link
              href="/checkout?guest=true"
              className="text-[var(--color-main-1)] hover:underline"
            >
              Continue as Guest →
            </Link>
          </div>
        </div>
      </div>
    );
  }
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerNotes, setCustomerNotes] = useState("");
  
  const [billing, setBilling] = useState<BillingDetails>({
    firstName: "",
    lastName: "",
    company: "",
    email: user?.email || "",
    phone: "",
    country: "ZA",
    address: "",
    city: "",
    province: "",
    postalCode: "",
  });

  const [shipping, setShipping] = useState<ShippingDetails>({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
  });

  const total = subtotal();
  const baseShippingCost = total >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  
  // Calculate reward discounts
  const discountAmount = getDiscountAmount(total);
  const shippingDiscount = getShippingDiscount(baseShippingCost);
  const shippingCost = baseShippingCost - shippingDiscount;
  const isFreeShipping = shippingCost === 0;
  
  const finalTotal = total - discountAmount + shippingCost;

  const updateBilling = (field: keyof BillingDetails, value: string) => {
    setBilling(prev => ({ ...prev, [field]: value }));
  };

  const updateShipping = (field: keyof ShippingDetails, value: string) => {
    setShipping(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!billing.firstName.trim()) return "First name is required";
    if (!billing.lastName.trim()) return "Last name is required";
    if (!billing.email.trim()) return "Email is required";
    if (!billing.phone.trim()) return "Phone number is required";
    if (!billing.address.trim()) return "Address is required";
    if (!billing.city.trim()) return "City is required";
    if (!billing.province.trim()) return "Province is required";
    if (!billing.postalCode.trim()) return "Postal code is required";
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(billing.email)) return "Invalid email address";
    
    if (!sameAsBilling) {
      if (!shipping.firstName.trim()) return "Shipping first name is required";
      if (!shipping.lastName.trim()) return "Shipping last name is required";
      if (!shipping.address.trim()) return "Shipping address is required";
      if (!shipping.city.trim()) return "Shipping city is required";
      if (!shipping.province.trim()) return "Shipping province is required";
      if (!shipping.postalCode.trim()) return "Shipping postal code is required";
    }
    
    return null;
  };

  const handlePlaceOrder = async () => {
    setError(null);
    
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Prepare checkout data
      const checkoutData = {
        items: items.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          productSlug: item.product.slug,
          productImage: item.product.images[0]?.src || null,
          variantId: item.variant?.id || null,
          variantName: item.variant?.name || null,
          quantity: item.quantity,
          unitPrice: item.variant?.price ?? item.product.price,
        })),
        billing: {
          firstName: billing.firstName,
          lastName: billing.lastName,
          company: billing.company || null,
          email: billing.email,
          phone: billing.phone,
          country: billing.country,
          address: billing.address,
          city: billing.city,
          province: billing.province,
          postalCode: billing.postalCode,
        },
        shipping: sameAsBilling ? null : {
          name: `${shipping.firstName} ${shipping.lastName}`,
          address: shipping.address,
          city: shipping.city,
          province: shipping.province,
          postalCode: shipping.postalCode,
          country: billing.country,
          phone: billing.phone,
        },
        subtotal: total,
        shippingCost: shippingCost,
        discountAmount: discountAmount,
        total: finalTotal,
        customerNotes: customerNotes || null,
        appliedRewardId: appliedReward?.id || null,
        userId: user?.id || null,
      };
      
      // Call checkout API
      const response = await fetch("/api/checkout/yoco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutData),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create checkout");
      }
      
      // Redirect to Yoco payment page
      if (result.checkoutUrl) {
        // Clear cart before redirecting (will be restored if payment fails)
        clearCart();
        removeAppliedReward();
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err instanceof Error ? err.message : "An error occurred during checkout");
      setIsProcessing(false);
    }
  };

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

          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <Input
                type="text"
                placeholder="First Name *"
                value={billing.firstName}
                onChange={(e) => updateBilling("firstName", e.target.value)}
                required
              />
              <Input
                type="text"
                placeholder="Last Name *"
                value={billing.lastName}
                onChange={(e) => updateBilling("lastName", e.target.value)}
                required
              />
            </div>

            <Input
              type="text"
              placeholder="Company Name (optional)"
              value={billing.company}
              onChange={(e) => updateBilling("company", e.target.value)}
            />

            <div className="grid sm:grid-cols-2 gap-6">
              <Input
                type="email"
                placeholder="Email Address *"
                value={billing.email}
                onChange={(e) => updateBilling("email", e.target.value)}
                required
              />
              <Input
                type="tel"
                placeholder="Phone *"
                value={billing.phone}
                onChange={(e) => updateBilling("phone", e.target.value)}
                required
              />
            </div>

            <div className="nk-form-group">
              <select
                className="nk-form-control"
                value={billing.country}
                onChange={(e) => updateBilling("country", e.target.value)}
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
              value={billing.address}
              onChange={(e) => updateBilling("address", e.target.value)}
              required
            />

            <Input
              type="text"
              placeholder="City *"
              value={billing.city}
              onChange={(e) => updateBilling("city", e.target.value)}
              required
            />

            <div className="grid sm:grid-cols-2 gap-6">
              <Input
                type="text"
                placeholder="State/Province *"
                value={billing.province}
                onChange={(e) => updateBilling("province", e.target.value)}
                required
              />
              <Input
                type="text"
                placeholder="ZIP/Postal Code *"
                value={billing.postalCode}
                onChange={(e) => updateBilling("postalCode", e.target.value)}
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
          </div>
        </div>

        {/* Shipping Address (if different) */}
        {!sameAsBilling && (
          <div className="bg-[var(--color-dark-2)] p-8">
            <h2 className="text-xl font-heading mb-8 text-center">
              Shipping Address
            </h2>
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <Input
                  type="text"
                  placeholder="First Name *"
                  value={shipping.firstName}
                  onChange={(e) => updateShipping("firstName", e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Last Name *"
                  value={shipping.lastName}
                  onChange={(e) => updateShipping("lastName", e.target.value)}
                />
              </div>
              <Input
                type="text"
                placeholder="Address *"
                value={shipping.address}
                onChange={(e) => updateShipping("address", e.target.value)}
              />
              <Input
                type="text"
                placeholder="City *"
                value={shipping.city}
                onChange={(e) => updateShipping("city", e.target.value)}
              />
              <div className="grid sm:grid-cols-2 gap-6">
                <Input
                  type="text"
                  placeholder="State/Province *"
                  value={shipping.province}
                  onChange={(e) => updateShipping("province", e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="ZIP/Postal Code *"
                  value={shipping.postalCode}
                  onChange={(e) => updateShipping("postalCode", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Order Notes */}
        <div className="bg-[var(--color-dark-2)] p-8">
          <TextArea
            placeholder="Order Notes (optional)"
            rows={4}
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
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

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 text-red-400 text-sm rounded">
              {error}
            </div>
          )}

          <Button 
            variant="primary" 
            className="w-full mt-6"
            onClick={handlePlaceOrder}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              `Pay ${formatPrice(finalTotal)}`
            )}
          </Button>

          {/* Payment Methods */}
          <div className="mt-6 pt-6 border-t border-[var(--color-dark-3)]">
            <p className="text-xs text-center text-white/50 mb-3">Secure payment powered by</p>
            <div className="flex items-center justify-center gap-4">
              <div className="bg-white rounded px-3 py-1.5">
                <svg className="h-6" viewBox="0 0 73 32" fill="none">
                  <path d="M18.15 10.69h-3.71l-2.32 14.31h3.71l2.32-14.31z" fill="#006FCF"/>
                  <path d="M33.58 10.95c-.73-.28-1.88-.58-3.31-.58-3.65 0-6.22 1.82-6.24 4.42-.02 1.92 1.83 2.99 3.23 3.63 1.43.65 1.91 1.07 1.91 1.66-.01.89-1.15 1.3-2.21 1.3-1.48 0-2.26-.2-3.47-.71l-.48-.22-.52 3.01c.86.37 2.45.7 4.11.71 3.88 0 6.4-1.8 6.44-4.57.02-1.52-0.97-2.68-3.1-3.64-1.29-.62-2.08-1.03-2.07-1.66 0-.56.67-1.15 2.11-1.15 1.2-.02 2.07.24 2.75.51l.33.15.5-2.86z" fill="#006FCF"/>
                  <path d="M40.22 10.69h-2.86c-.89 0-1.55.24-1.94 1.11l-5.5 12.21h3.88l.77-2h4.74l.45 2h3.42l-2.96-13.32zm-4.56 8.86c.31-.78 1.49-3.78 1.49-3.78-.02.04.31-.78.5-1.29l.25 1.17s.71 3.25.87 3.9h-3.11z" fill="#006FCF"/>
                  <path d="M12.53 10.69l-3.62 9.77-.39-1.87c-.67-2.13-2.77-4.44-5.11-5.59l3.31 11.99h3.91l5.81-14.3h-3.91z" fill="#006FCF"/>
                  <path d="M5.61 10.69H0l-.06.29c4.64 1.11 7.71 3.78 8.98 6.99l-1.3-6.17c-.22-.85-.88-1.08-1.66-1.11h-.35z" fill="#FAA61A"/>
                </svg>
              </div>
              <div className="bg-white rounded px-3 py-1.5">
                <svg className="h-6" viewBox="0 0 48 32" fill="none">
                  <circle cx="17" cy="16" r="11" fill="#EB001B"/>
                  <circle cx="31" cy="16" r="11" fill="#F79E1B"/>
                  <path d="M24 7.5a11 11 0 000 17 11 11 0 000-17z" fill="#FF5F00"/>
                </svg>
              </div>
              <span className="text-xs text-white/60">& more</span>
            </div>
          </div>

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

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores";
import { useAccountStore } from "@/stores/accountStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useMysteryBoxStore } from "@/stores/mysteryBoxStore";
import { Button, Input, TextArea, PhoneInput, parsePhoneToRaw } from "@/components/ui";
import { formatPrice } from "@/lib/utils";

interface BillingDetails {
  firstName: string;
  lastName: string;
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

export function MysteryBoxCheckoutClient() {
  const router = useRouter();
  const { pendingOrder, clearPendingOrder } = useMysteryBoxStore();
  const { user, isAuthenticated } = useAuthStore();
  const { addresses, fetchAddresses } = useAccountStore();
  const { userProfile } = useGamificationStore();
  
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerNotes, setCustomerNotes] = useState("");
  const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);
  
  const [billing, setBilling] = useState<BillingDetails>({
    firstName: "",
    lastName: "",
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

  // Redirect if no pending order
  useEffect(() => {
    if (!pendingOrder) {
      router.push("/store/mystery-boxes");
    }
  }, [pendingOrder, router]);

  // Fetch addresses and pre-fill form if user is logged in
  useEffect(() => {
    if (isAuthenticated && user && !hasLoadedSavedData) {
      fetchAddresses();
      setHasLoadedSavedData(true);
    }
  }, [isAuthenticated, user, hasLoadedSavedData, fetchAddresses]);

  // Pre-fill billing details from saved addresses and user data
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Get default billing address or first billing address
    const billingAddress = addresses.find(a => a.type === "billing" && a.is_default) 
      || addresses.find(a => a.type === "billing");
    
    // Get default shipping address or first shipping address
    const shippingAddress = addresses.find(a => a.type === "shipping" && a.is_default)
      || addresses.find(a => a.type === "shipping");

    // Extract name parts from user metadata or profile
    const fullName = userProfile?.display_name 
      || user.user_metadata?.full_name 
      || user.user_metadata?.name 
      || "";
    const nameParts = fullName.split(" ");
    const defaultFirstName = nameParts[0] || "";
    const defaultLastName = nameParts.slice(1).join(" ") || "";

    // Pre-fill billing from saved address or user data
    if (billingAddress) {
      const addressNameParts = billingAddress.name.split(" ");
      setBilling(prev => ({
        ...prev,
        firstName: addressNameParts[0] || defaultFirstName,
        lastName: addressNameParts.slice(1).join(" ") || defaultLastName,
        email: user.email || prev.email,
        phone: billingAddress.phone || userProfile?.phone || "",
        country: billingAddress.country || "ZA",
        address: billingAddress.address_line1 + (billingAddress.address_line2 ? `, ${billingAddress.address_line2}` : ""),
        city: billingAddress.city,
        province: billingAddress.province,
        postalCode: billingAddress.postal_code,
      }));
    } else {
      // No saved billing address - fill in what we know from user data and profile
      setBilling(prev => ({
        ...prev,
        firstName: prev.firstName || defaultFirstName,
        lastName: prev.lastName || defaultLastName,
        email: user.email || prev.email,
        phone: prev.phone || userProfile?.phone || "",
      }));
    }

    // Pre-fill shipping from saved address
    if (shippingAddress) {
      const addressNameParts = shippingAddress.name.split(" ");
      setShipping(prev => ({
        ...prev,
        firstName: addressNameParts[0] || defaultFirstName,
        lastName: addressNameParts.slice(1).join(" ") || defaultLastName,
        address: shippingAddress.address_line1 + (shippingAddress.address_line2 ? `, ${shippingAddress.address_line2}` : ""),
        city: shippingAddress.city,
        province: shippingAddress.province,
        postalCode: shippingAddress.postal_code,
      }));
    }
  }, [addresses, user, userProfile, isAuthenticated]);

  if (!pendingOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-main-1)]" />
      </div>
    );
  }

  // Mystery boxes have free shipping
  const total = pendingOrder.boxPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    // Validate required fields
    if (!billing.firstName || !billing.lastName || !billing.email || !billing.phone) {
      setError("Please fill in all required billing fields");
      setIsProcessing(false);
      return;
    }

    if (!billing.address || !billing.city || !billing.province || !billing.postalCode) {
      setError("Please fill in your complete billing address");
      setIsProcessing(false);
      return;
    }

    const shippingDetails = sameAsBilling 
      ? {
          firstName: billing.firstName,
          lastName: billing.lastName,
          address: billing.address,
          city: billing.city,
          province: billing.province,
          postalCode: billing.postalCode,
        }
      : shipping;

    if (!sameAsBilling && (!shippingDetails.address || !shippingDetails.city)) {
      setError("Please fill in your complete shipping address");
      setIsProcessing(false);
      return;
    }

    try {
      // Create Yoco checkout session for mystery box
      const response = await fetch("/api/checkout/mystery-box", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mysteryBox: {
            boxId: pendingOrder.boxId,
            boxName: pendingOrder.boxName,
            boxPrice: pendingOrder.boxPrice,
            minValue: pendingOrder.minValue,
            maxValue: pendingOrder.maxValue,
          },
          billing: {
            firstName: billing.firstName,
            lastName: billing.lastName,
            email: billing.email,
            phone: parsePhoneToRaw(billing.phone),
            country: billing.country,
            address: billing.address,
            city: billing.city,
            province: billing.province,
            postalCode: billing.postalCode,
          },
          shipping: {
            firstName: shippingDetails.firstName,
            lastName: shippingDetails.lastName,
            address: shippingDetails.address,
            city: shippingDetails.city,
            province: shippingDetails.province,
            postalCode: shippingDetails.postalCode,
            country: "ZA",
          },
          customerNotes,
          userId: user?.id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Yoco payment page
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err instanceof Error ? err.message : "Failed to process checkout");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl mb-4"
          >
            📦
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-heading uppercase tracking-wider mb-2">
            Mystery Box Checkout
          </h1>
          <p className="text-white/60">Complete your purchase to reveal your mystery item!</p>
        </div>

        {/* No Rewards Notice */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 bg-[var(--color-main-1)]/10 border border-[var(--color-main-1)]/30"
        >
          <p className="text-sm text-center text-[var(--color-main-1)]">
            <strong>Note:</strong> Discount codes and rewards cannot be applied to Mystery Box purchases. 
            Free shipping is included!
          </p>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left column - Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Billing Details */}
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6">
                <h2 className="text-xl font-heading mb-6">Billing Details</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="nk-form-label">First Name *</label>
                    <Input
                      type="text"
                      value={billing.firstName}
                      onChange={(e) => setBilling({ ...billing, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="nk-form-label">Last Name *</label>
                    <Input
                      type="text"
                      value={billing.lastName}
                      onChange={(e) => setBilling({ ...billing, lastName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="nk-form-label">Email *</label>
                    <Input
                      type="email"
                      value={billing.email}
                      onChange={(e) => setBilling({ ...billing, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="nk-form-label">Phone *</label>
                    <PhoneInput
                      value={billing.phone}
                      onChange={(value) => setBilling({ ...billing, phone: value })}
                      variant="underline"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="nk-form-label">Country *</label>
                    <div className="nk-form-control flex items-center">
                      🇿🇦 South Africa
                    </div>
                    <input type="hidden" name="country" value="ZA" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="nk-form-label">Street Address *</label>
                    <Input
                      type="text"
                      value={billing.address}
                      onChange={(e) => setBilling({ ...billing, address: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="nk-form-label">City *</label>
                    <Input
                      type="text"
                      value={billing.city}
                      onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="nk-form-label">Province *</label>
                    <select
                      className="nk-form-control w-full"
                      value={billing.province}
                      onChange={(e) => setBilling({ ...billing, province: e.target.value })}
                      required
                    >
                      <option value="">Select Province</option>
                      <option value="Eastern Cape">Eastern Cape</option>
                      <option value="Free State">Free State</option>
                      <option value="Gauteng">Gauteng</option>
                      <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                      <option value="Limpopo">Limpopo</option>
                      <option value="Mpumalanga">Mpumalanga</option>
                      <option value="North West">North West</option>
                      <option value="Northern Cape">Northern Cape</option>
                      <option value="Western Cape">Western Cape</option>
                    </select>
                  </div>
                  <div>
                    <label className="nk-form-label">Postal Code *</label>
                    <Input
                      type="text"
                      value={billing.postalCode}
                      onChange={(e) => setBilling({ ...billing, postalCode: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Details */}
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-heading">Shipping Details</h2>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={(e) => setSameAsBilling(e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-main-1)]"
                    />
                    <span className="text-sm text-white/70">Same as billing</span>
                  </label>
                </div>

                {!sameAsBilling && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="nk-form-label">First Name *</label>
                      <Input
                        type="text"
                        value={shipping.firstName}
                        onChange={(e) => setShipping({ ...shipping, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="nk-form-label">Last Name *</label>
                      <Input
                        type="text"
                        value={shipping.lastName}
                        onChange={(e) => setShipping({ ...shipping, lastName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="nk-form-label">Street Address *</label>
                      <Input
                        type="text"
                        value={shipping.address}
                        onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="nk-form-label">City *</label>
                      <Input
                        type="text"
                        value={shipping.city}
                        onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="nk-form-label">Province *</label>
                      <select
                        className="nk-form-control w-full"
                        value={shipping.province}
                        onChange={(e) => setShipping({ ...shipping, province: e.target.value })}
                        required
                      >
                        <option value="">Select Province</option>
                        <option value="Eastern Cape">Eastern Cape</option>
                        <option value="Free State">Free State</option>
                        <option value="Gauteng">Gauteng</option>
                        <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                        <option value="Limpopo">Limpopo</option>
                        <option value="Mpumalanga">Mpumalanga</option>
                        <option value="North West">North West</option>
                        <option value="Northern Cape">Northern Cape</option>
                        <option value="Western Cape">Western Cape</option>
                      </select>
                    </div>
                    <div>
                      <label className="nk-form-label">Postal Code *</label>
                      <Input
                        type="text"
                        value={shipping.postalCode}
                        onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                )}

                {sameAsBilling && (
                  <p className="text-sm text-white/50">
                    Your mystery box will be shipped to your billing address.
                  </p>
                )}
              </div>

              {/* Order Notes */}
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6">
                <h2 className="text-xl font-heading mb-4">Additional Notes</h2>
                <TextArea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Any special instructions for your order..."
                  rows={3}
                />
              </div>
            </div>

            {/* Right column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 sticky top-24">
                <h2 className="text-xl font-heading mb-6">Order Summary</h2>

                {/* Mystery Box Item */}
                <div className="flex items-center gap-4 pb-4 border-b border-[var(--color-dark-3)]">
                  <div className="w-16 h-16 bg-[var(--color-main-1)]/20 rounded-lg flex items-center justify-center text-3xl">
                    📦
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{pendingOrder.boxName}</p>
                    <p className="text-sm text-white/50">
                      Value: {formatPrice(pendingOrder.minValue)} - {formatPrice(pendingOrder.maxValue)}
                    </p>
                  </div>
                  <p className="font-heading text-[var(--color-main-1)]">
                    {formatPrice(pendingOrder.boxPrice)}
                  </p>
                </div>

                {/* Totals */}
                <div className="py-4 space-y-2 border-b border-[var(--color-dark-3)]">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Subtotal</span>
                    <span>{formatPrice(pendingOrder.boxPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Shipping</span>
                    <span className="text-green-400">FREE</span>
                  </div>
                </div>

                {/* Total */}
                <div className="py-4 flex justify-between items-center">
                  <span className="text-lg font-heading">Total</span>
                  <span className="text-2xl font-heading text-[var(--color-main-1)]">
                    {formatPrice(total)}
                  </span>
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    `Pay ${formatPrice(total)}`
                  )}
                </Button>

                {/* Cancel */}
                <Link href="/store/mystery-boxes" className="block mt-4 text-center text-sm text-white/50 hover:text-white">
                  Cancel and return to Mystery Boxes
                </Link>

                {/* Security Notice */}
                <div className="mt-6 pt-4 border-t border-[var(--color-dark-3)]">
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Secure checkout powered by Yoco</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

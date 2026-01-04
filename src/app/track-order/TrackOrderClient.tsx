"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Input, Button } from "@/components/ui";
import { formatPrice } from "@/lib/utils";

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface TrackingResult {
  orderNumber: string;
  status: string;
  statusColor: string;
  estimatedDelivery: string;
  trackingNumber: string | null;
  total: number;
  currency: string;
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  items: OrderItem[];
  timeline: {
    date: string;
    status: string;
    description: string;
    completed: boolean;
  }[];
  createdAt: string;
}

export function TrackOrderClient() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTrackingResult(null);

    if (!orderNumber.trim()) {
      setError("Please enter your order number or tracking number");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orderNumber: orderNumber.trim(), 
          email: email.trim() 
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || "Failed to track order");
        return;
      }

      setTrackingResult(result.order);
    } catch (err) {
      console.error("Track order error:", err);
      setError("An error occurred while tracking your order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-[var(--color-main-1)]/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>

            <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-wider mb-4">
              Track Your Order
            </h1>
            <div className="w-24 h-px bg-[var(--color-main-1)] mx-auto mb-6" />
            <p className="text-[var(--muted-foreground)] text-lg">
              Enter your order details below to view the current status and tracking 
              information for your purchase.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tracking Form Section */}
      <section className="py-12 bg-[var(--color-dark-2)]">
        <div className="container max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-[var(--color-dark-1)] border border-[var(--color-dark-3)] p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Order Number or Tracking Number
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., DP-XXXXXXXX-XXXX"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Tracking...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Track Order
                  </span>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Tracking Result */}
      {trackingResult && (
        <section className="py-12">
          <div className="container max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Order Status Header */}
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 pb-6 border-b border-[var(--color-dark-3)]">
                  <div>
                    <p className="text-sm text-[var(--muted-foreground)] mb-1">Order Number</p>
                    <p className="text-xl font-heading text-[var(--color-main-1)]">{trackingResult.orderNumber}</p>
                  </div>
                  <div className="mt-4 md:mt-0 md:text-right">
                    <p className="text-sm text-[var(--muted-foreground)] mb-1">Status</p>
                    <p className={`text-xl font-heading ${trackingResult.statusColor}`}>{trackingResult.status}</p>
                  </div>
                </div>

                {/* Tracking Number */}
                {trackingResult.trackingNumber && (
                  <div className="mb-6 p-4 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">Tracking Number</p>
                        <p className="font-mono text-white">{trackingResult.trackingNumber}</p>
                      </div>
                      <button 
                        onClick={() => navigator.clipboard.writeText(trackingResult.trackingNumber || "")}
                        className="text-[var(--color-main-1)] hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Estimated Delivery */}
                <div className="mb-6 p-4 bg-[var(--color-main-1)]/10 border border-[var(--color-main-1)]/30">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-sm text-[var(--muted-foreground)]">Estimated Delivery</p>
                      <p className="font-medium text-white">{trackingResult.estimatedDelivery}</p>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="p-4 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)]">
                  <p className="text-sm text-[var(--muted-foreground)] mb-2">Shipping To</p>
                  <p className="text-white font-medium">{trackingResult.shippingAddress.name}</p>
                  <p className="text-white/70 text-sm">
                    {trackingResult.shippingAddress.address}<br />
                    {trackingResult.shippingAddress.city}, {trackingResult.shippingAddress.province} {trackingResult.shippingAddress.postalCode}<br />
                    {trackingResult.shippingAddress.country}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              {trackingResult.items && trackingResult.items.length > 0 && (
                <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8">
                  <h3 className="text-lg font-heading mb-6">Order Items</h3>
                  <div className="space-y-4">
                    {trackingResult.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)]">
                        <div className="w-16 h-16 bg-[var(--color-dark-4)] flex-shrink-0 relative overflow-hidden">
                          {item.product_image ? (
                            <Image
                              src={item.product_image}
                              alt={item.product_name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/30">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{item.product_name}</p>
                          {item.variant_name && (
                            <p className="text-sm text-[var(--muted-foreground)]">{item.variant_name}</p>
                          )}
                          <p className="text-sm text-[var(--muted-foreground)]">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">{formatPrice(item.total_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-6 border-t border-[var(--color-dark-4)] flex justify-between items-center">
                    <span className="text-[var(--muted-foreground)]">Total</span>
                    <span className="text-xl font-heading text-[var(--color-main-1)]">
                      {formatPrice(trackingResult.total)}
                    </span>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8">
                <h3 className="text-lg font-heading mb-6">Tracking History</h3>
                <div className="space-y-0">
                  {trackingResult.timeline.map((event, index) => (
                    <div key={index} className="relative pl-8 pb-8 last:pb-0">
                      {/* Timeline line */}
                      {index < trackingResult.timeline.length - 1 && (
                        <div 
                          className={`absolute left-[11px] top-6 w-0.5 h-full ${
                            event.completed ? "bg-[var(--color-main-1)]" : "bg-[var(--color-dark-4)]"
                          }`} 
                        />
                      )}
                      {/* Timeline dot */}
                      <div 
                        className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${
                          event.completed 
                            ? "bg-[var(--color-main-1)]" 
                            : "bg-[var(--color-dark-4)] border-2 border-[var(--color-dark-3)]"
                        }`}
                      >
                        {event.completed && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      {/* Content */}
                      <div>
                        <p className="text-xs text-[var(--muted-foreground)] mb-1">{event.date}</p>
                        <p className={`font-medium ${event.completed ? "text-white" : "text-white/50"}`}>{event.status}</p>
                        <p className={`text-sm ${event.completed ? "text-[var(--muted-foreground)]" : "text-white/30"}`}>{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* How to Track Section */}
      <section className="py-16 bg-[var(--color-dark-2)]">
        <div className="container max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h2 className="text-2xl font-heading text-center mb-12">How to Track Your Order</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Online Tracking */}
              <div className="bg-[var(--color-dark-1)] border border-[var(--color-dark-3)] p-6">
                <div className="w-14 h-14 bg-[var(--color-main-1)]/20 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-heading text-[var(--color-main-1)] mb-4">Online Tracking</h3>
                <ol className="space-y-3 text-[var(--muted-foreground)]">
                  <li className="flex gap-2">
                    <span className="text-[var(--color-main-1)]">1.</span>
                    Visit this tracking page
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--color-main-1)]">2.</span>
                    Enter your order number (e.g., DP-XXXXXXXX-XXXX)
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--color-main-1)]">3.</span>
                    Enter the email used for your order
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--color-main-1)]">4.</span>
                    Click &quot;Track Order&quot; to view status
                  </li>
                </ol>
              </div>

              {/* Email Notifications */}
              <div className="bg-[var(--color-dark-1)] border border-[var(--color-dark-3)] p-6">
                <div className="w-14 h-14 bg-[var(--color-main-1)]/20 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-heading text-[var(--color-main-1)] mb-4">Email Notifications</h3>
                <ol className="space-y-3 text-[var(--muted-foreground)]">
                  <li className="flex gap-2">
                    <span className="text-[var(--color-main-1)]">1.</span>
                    Check your email for order confirmation
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--color-main-1)]">2.</span>
                    Look for shipping notification with tracking number
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--color-main-1)]">3.</span>
                    Receive updates at each delivery milestone
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--color-main-1)]">4.</span>
                    Get notified when your order is delivered
                  </li>
                </ol>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Need Help Section */}
      <section className="py-16">
        <div className="container max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="w-16 h-16 mx-auto mb-6 bg-[var(--color-main-1)]/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-heading mb-4">Need Help?</h2>
            <p className="text-[var(--muted-foreground)] mb-8">
              Can&apos;t find your order? Have questions about delivery? 
              Our support team is ready to assist you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button variant="primary">
                  Contact Support
                </Button>
              </Link>
              <Link href="/faq">
                <Button variant="outline">
                  View FAQ
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Input, Button } from "@/components/ui";

interface TrackingResult {
  orderNumber: string;
  status: string;
  statusColor: string;
  estimatedDelivery: string;
  timeline: {
    date: string;
    status: string;
    description: string;
    completed: boolean;
  }[];
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

    // Simulate API call - in production, this would call a real tracking API
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Demo tracking result
    if (orderNumber.toLowerCase().includes("demo") || orderNumber === "DP-2024-001") {
      setTrackingResult({
        orderNumber: orderNumber.toUpperCase(),
        status: "In Transit",
        statusColor: "text-blue-400",
        estimatedDelivery: "December 28, 2024",
        timeline: [
          {
            date: "Dec 24, 2024 - 10:30 AM",
            status: "Order Placed",
            description: "Your order has been confirmed and is being processed",
            completed: true,
          },
          {
            date: "Dec 24, 2024 - 2:15 PM",
            status: "Payment Confirmed",
            description: "Payment successfully processed",
            completed: true,
          },
          {
            date: "Dec 25, 2024 - 9:00 AM",
            status: "Shipped",
            description: "Package has been handed to the courier",
            completed: true,
          },
          {
            date: "Dec 26, 2024 - 11:45 AM",
            status: "In Transit",
            description: "Package is on its way to your location",
            completed: true,
          },
          {
            date: "Estimated: Dec 28, 2024",
            status: "Out for Delivery",
            description: "Package will be delivered today",
            completed: false,
          },
          {
            date: "Pending",
            status: "Delivered",
            description: "Package delivered successfully",
            completed: false,
          },
        ],
      });
    } else {
      setError("No order found with the provided details. Please check your order number and email address, or try using the demo order number: DP-2024-001");
    }

    setIsLoading(false);
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
                    placeholder="e.g., DP-2024-001 or EX123456789ZA"
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
          <div className="container max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8"
            >
              {/* Order Status Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-[var(--color-dark-3)]">
                <div>
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">Order Number</p>
                  <p className="text-xl font-heading text-[var(--color-main-1)]">{trackingResult.orderNumber}</p>
                </div>
                <div className="mt-4 md:mt-0 md:text-right">
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">Status</p>
                  <p className={`text-xl font-heading ${trackingResult.statusColor}`}>{trackingResult.status}</p>
                </div>
              </div>

              {/* Estimated Delivery */}
              <div className="mb-8 p-4 bg-[var(--color-main-1)]/10 border border-[var(--color-main-1)]/30">
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

              {/* Timeline */}
              <div className="space-y-0">
                <h3 className="text-lg font-heading mb-6">Tracking History</h3>
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
                    Enter your order number or tracking number
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

      {/* Demo Note */}
      <section className="pb-16">
        <div className="container max-w-2xl">
          <div className="bg-[var(--color-dark-2)] border border-[var(--color-main-1)]/30 p-6 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              <span className="text-[var(--color-main-1)] font-medium">Demo Mode:</span> Try tracking with order number{" "}
              <code className="bg-[var(--color-dark-3)] px-2 py-1 text-white">DP-2024-001</code>{" "}
              and any email to see a sample tracking result.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}


"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Input, Button } from "@/components/ui";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
  eligible: boolean;
}

interface OrderResult {
  orderNumber: string;
  orderDate: string;
  items: OrderItem[];
}

const RETURN_REASONS = [
  "Damaged or defective item",
  "Wrong item received",
  "Item not as described",
  "Changed my mind",
  "Better price found elsewhere",
  "Ordered by mistake",
  "Other",
];

// Policy Accordion Component
function PolicyAccordion() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const sections = [
    {
      id: "conditions",
      title: "Return Conditions",
      content: (
        <ul className="space-y-2 text-[var(--muted-foreground)]">
          <li className="flex gap-2">
            <span className="text-[var(--color-main-1)]">•</span>
            Items must be unused and in original packaging
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--color-main-1)]">•</span>
            All tags and labels must be attached
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--color-main-1)]">•</span>
            Original receipt or proof of purchase required
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--color-main-1)]">•</span>
            Items must not be damaged (except if received damaged)
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--color-main-1)]">•</span>
            Sealed items (headphones, earbuds) cannot be returned once opened
          </li>
        </ul>
      ),
    },
    {
      id: "process",
      title: "How to Return",
      content: (
        <div className="space-y-4">
          <div className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-main-1)] text-black flex items-center justify-center font-bold text-sm">1</span>
            <div>
              <p className="font-medium text-white">Submit Request Online</p>
              <p className="text-sm text-[var(--muted-foreground)]">Use the form above to start your return</p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-main-1)] text-black flex items-center justify-center font-bold text-sm">2</span>
            <div>
              <p className="font-medium text-white">Get Return Label</p>
              <p className="text-sm text-[var(--muted-foreground)]">We&apos;ll email you a prepaid return label within 24 hours</p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-main-1)] text-black flex items-center justify-center font-bold text-sm">3</span>
            <div>
              <p className="font-medium text-white">Ship Your Return</p>
              <p className="text-sm text-[var(--muted-foreground)]">Pack securely and drop off at any courier location</p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-main-1)] text-black flex items-center justify-center font-bold text-sm">4</span>
            <div>
              <p className="font-medium text-white">Receive Refund</p>
              <p className="text-sm text-[var(--muted-foreground)]">Refunds processed within 5-7 business days</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "defective",
      title: "Defective Items",
      content: (
        <p className="text-[var(--muted-foreground)]">
          If you receive a defective item, please contact us immediately. We&apos;ll arrange 
          for a free return and send you a replacement or full refund. Defective items 
          can be returned within 6 months of purchase. For defective items, you can also 
          email us directly at <a href="mailto:returns@darkpoint.co.za" className="text-[var(--color-main-1)] hover:underline">returns@darkpoint.co.za</a>.
        </p>
      ),
    },
    {
      id: "non-returnable",
      title: "Non-Returnable Items",
      content: (
        <div className="grid grid-cols-2 gap-3 text-sm text-[var(--muted-foreground)]">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Digital downloads
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Gift cards
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Opened software/media
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Customized items
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Final sale items
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Items past 30 days
          </div>
        </div>
      ),
    },
    {
      id: "refund",
      title: "Refund Information",
      content: (
        <p className="text-[var(--muted-foreground)]">
          Refunds will be issued to the original payment method within 5-7 business days 
          of receiving your return. Credit card refunds may take an additional 5-10 business 
          days to appear on your statement, depending on your bank. You&apos;ll receive an 
          email confirmation once your refund has been processed.
        </p>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-heading mb-4">Return Policy Details</h3>
      {sections.map((section) => (
        <div key={section.id} className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)]">
          <button
            onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--color-dark-3)]/30 transition-colors"
          >
            <span className="font-medium">{section.title}</span>
            <svg
              className={`w-5 h-5 text-[var(--color-main-1)] transition-transform ${
                openSection === section.id ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <AnimatePresence>
            {openSection === section.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 border-t border-[var(--color-dark-3)]">
                  {section.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export function ReturnRequestClient() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [returnReasons, setReturnReasons] = useState<Record<string, string>>({});
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [step, setStep] = useState<"search" | "select" | "confirm" | "success">("search");

  const handleFindOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOrderResult(null);

    if (!orderNumber.trim()) {
      setError("Please enter your order number");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Demo order result
    if (orderNumber.toLowerCase().includes("demo") || orderNumber === "DP-2024-001") {
      setOrderResult({
        orderNumber: orderNumber.toUpperCase(),
        orderDate: "December 20, 2024",
        items: [
          {
            id: "1",
            name: "RGB Gaming Keyboard - Mechanical",
            quantity: 1,
            price: 899.99,
            image: "/images/placeholder.png",
            eligible: true,
          },
          {
            id: "2",
            name: "Wireless Gaming Mouse - Pro Edition",
            quantity: 1,
            price: 599.99,
            image: "/images/placeholder.png",
            eligible: true,
          },
          {
            id: "3",
            name: "Gaming Headset - 7.1 Surround",
            quantity: 1,
            price: 1299.99,
            image: "/images/placeholder.png",
            eligible: false,
          },
        ],
      });
      setStep("select");
    } else {
      setError("No order found with the provided details. Please check your order number and email address, or try using the demo order number: DP-2024-001");
    }

    setIsLoading(false);
  };

  const handleItemSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
      const newReasons = { ...returnReasons };
      delete newReasons[itemId];
      setReturnReasons(newReasons);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleReasonChange = (itemId: string, reason: string) => {
    setReturnReasons({ ...returnReasons, [itemId]: reason });
  };

  const handleContinueToConfirm = () => {
    if (selectedItems.size === 0) {
      setError("Please select at least one item to return");
      return;
    }

    const missingReasons = Array.from(selectedItems).filter((id) => !returnReasons[id]);
    if (missingReasons.length > 0) {
      setError("Please select a reason for each item you want to return");
      return;
    }

    setError(null);
    setStep("confirm");
  };

  const handleSubmitReturn = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
    setStep("success");
  };

  const handleStartOver = () => {
    setOrderNumber("");
    setEmail("");
    setOrderResult(null);
    setSelectedItems(new Set());
    setReturnReasons({});
    setAdditionalInfo("");
    setError(null);
    setStep("search");
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>

            <h1 className="text-4xl md:text-5xl font-heading uppercase tracking-wider mb-4">
              Request a Return
            </h1>
            <div className="w-24 h-px bg-[var(--color-main-1)] mx-auto mb-6" />
            <p className="text-[var(--muted-foreground)] text-lg">
              Enter your order details below to start a return request for eligible items from your purchase.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Progress Steps */}
      <section className="pb-8">
        <div className="container max-w-2xl">
          <div className="flex items-center justify-center gap-4">
            {["search", "select", "confirm", "success"].map((s, index) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step === s
                      ? "bg-[var(--color-main-1)] text-white"
                      : ["search", "select", "confirm", "success"].indexOf(step) > index
                      ? "bg-green-500 text-white"
                      : "bg-[var(--color-dark-3)] text-white/50"
                  }`}
                >
                  {["search", "select", "confirm", "success"].indexOf(step) > index ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 3 && (
                  <div
                    className={`w-12 md:w-20 h-0.5 ${
                      ["search", "select", "confirm", "success"].indexOf(step) > index
                        ? "bg-green-500"
                        : "bg-[var(--color-dark-3)]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-[var(--muted-foreground)]">
            <span className="w-16 text-center">Find Order</span>
            <span className="w-16 text-center">Select Items</span>
            <span className="w-16 text-center">Confirm</span>
            <span className="w-16 text-center">Done</span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 bg-[var(--color-dark-2)]">
        <div className="container max-w-3xl">
          <AnimatePresence mode="wait">
            {/* Step 1: Search Order */}
            {step === "search" && (
              <motion.div
                key="search"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-[var(--color-dark-1)] border border-[var(--color-dark-3)] p-8"
              >
                <form onSubmit={handleFindOrder} className="space-y-6">
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

                  <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Finding Order...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Find Order
                      </span>
                    )}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* Step 2: Select Items */}
            {step === "select" && orderResult && (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Order Info */}
                <div className="bg-[var(--color-dark-1)] border border-[var(--color-dark-3)] p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-[var(--muted-foreground)]">Order Number</p>
                      <p className="text-lg font-heading text-[var(--color-main-1)]">{orderResult.orderNumber}</p>
                    </div>
                    <div className="mt-2 md:mt-0">
                      <p className="text-sm text-[var(--muted-foreground)]">Order Date</p>
                      <p className="text-lg">{orderResult.orderDate}</p>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="bg-[var(--color-dark-1)] border border-[var(--color-dark-3)] p-6">
                  <h3 className="text-lg font-heading mb-4">Select Items to Return</h3>
                  <div className="space-y-4">
                    {orderResult.items.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 border transition-colors ${
                          item.eligible
                            ? selectedItems.has(item.id)
                              ? "border-[var(--color-main-1)] bg-[var(--color-main-1)]/5"
                              : "border-[var(--color-dark-3)] hover:border-[var(--color-dark-4)]"
                            : "border-[var(--color-dark-3)] opacity-50"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => item.eligible && handleItemSelect(item.id)}
                            disabled={!item.eligible}
                            className={`w-6 h-6 mt-1 flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                              item.eligible
                                ? selectedItems.has(item.id)
                                  ? "bg-[var(--color-main-1)] border-[var(--color-main-1)]"
                                  : "border-[var(--color-dark-4)] hover:border-[var(--color-main-1)]"
                                : "border-[var(--color-dark-4)] cursor-not-allowed"
                            }`}
                          >
                            {selectedItems.has(item.id) && (
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>

                          {/* Item Details */}
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-[var(--muted-foreground)]">Qty: {item.quantity}</p>
                              </div>
                              <p className="font-medium text-[var(--color-main-1)]">R {item.price.toFixed(2)}</p>
                            </div>

                            {!item.eligible && (
                              <p className="text-sm text-red-400 mt-2">
                                ⚠️ This item is not eligible for return (past return window)
                              </p>
                            )}

                            {/* Reason Selector */}
                            {selectedItems.has(item.id) && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="mt-4"
                              >
                                <label className="block text-sm mb-2">Reason for return</label>
                                <select
                                  value={returnReasons[item.id] || ""}
                                  onChange={(e) => handleReasonChange(item.id, e.target.value)}
                                  className="w-full bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-3 text-white focus:border-[var(--color-main-1)] outline-none"
                                >
                                  <option value="">Select a reason...</option>
                                  {RETURN_REASONS.map((reason) => (
                                    <option key={reason} value={reason}>
                                      {reason}
                                    </option>
                                  ))}
                                </select>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}

                  <div className="flex gap-4 mt-6">
                    <Button variant="outline" onClick={handleStartOver}>
                      Start Over
                    </Button>
                    <Button variant="primary" className="flex-1" onClick={handleContinueToConfirm}>
                      Continue
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirm */}
            {step === "confirm" && orderResult && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="bg-[var(--color-dark-1)] border border-[var(--color-dark-3)] p-6">
                  <h3 className="text-lg font-heading mb-4">Review Your Return Request</h3>

                  <div className="space-y-4 mb-6">
                    {orderResult.items
                      .filter((item) => selectedItems.has(item.id))
                      .map((item) => (
                        <div key={item.id} className="flex justify-between p-4 bg-[var(--color-dark-2)]">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-[var(--muted-foreground)]">Reason: {returnReasons[item.id]}</p>
                          </div>
                          <p className="font-medium text-[var(--color-main-1)]">R {item.price.toFixed(2)}</p>
                        </div>
                      ))}
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Additional Information (Optional)</label>
                    <textarea
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                      placeholder="Provide any additional details about your return..."
                      className="w-full bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-3 text-white focus:border-[var(--color-main-1)] outline-none min-h-[100px] resize-none"
                    />
                  </div>

                  <div className="p-4 bg-[var(--color-main-1)]/10 border border-[var(--color-main-1)]/30 mb-6">
                    <p className="text-sm">
                      <strong className="text-[var(--color-main-1)]">Note:</strong> Once submitted, you&apos;ll receive an email with your return label and instructions within 24 hours.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep("select")}>
                      Back
                    </Button>
                    <Button variant="primary" className="flex-1" onClick={handleSubmitReturn} disabled={isLoading}>
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Submitting...
                        </span>
                      ) : (
                        "Submit Return Request"
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Success */}
            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[var(--color-dark-1)] border border-[var(--color-dark-3)] p-8 text-center"
              >
                <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-heading mb-4">Return Request Submitted!</h2>
                <p className="text-[var(--muted-foreground)] mb-6">
                  Your return request has been successfully submitted. You&apos;ll receive an email with your return label and detailed instructions within 24 hours.
                </p>
                <div className="p-4 bg-[var(--color-dark-2)] mb-6">
                  <p className="text-sm text-[var(--muted-foreground)]">Return Request ID</p>
                  <p className="text-xl font-heading text-[var(--color-main-1)]">RET-{Date.now().toString().slice(-8)}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="primary" onClick={handleStartOver}>
                    Submit Another Return
                  </Button>
                  <Link href="/track-order">
                    <Button variant="outline">Track Your Order</Button>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Return Policy Section - Collapsible for cleaner UX */}
      <section className="py-16">
        <div className="container max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Quick Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-[var(--color-main-1)]/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-2xl font-heading text-[var(--color-main-1)]">30 Days</p>
                <p className="text-sm text-[var(--muted-foreground)]">Return Window</p>
              </div>
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-[var(--color-main-1)]/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-2xl font-heading text-[var(--color-main-1)]">5-7 Days</p>
                <p className="text-sm text-[var(--muted-foreground)]">Refund Processing</p>
              </div>
              <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-[var(--color-main-1)]/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <p className="text-2xl font-heading text-[var(--color-main-1)]">6 Months</p>
                <p className="text-sm text-[var(--muted-foreground)]">Defective Items</p>
              </div>
            </div>

            {/* Expandable Policy Details */}
            <PolicyAccordion />
          </motion.div>
        </div>
      </section>

      {/* Need Help Section */}
      <section className="py-16 bg-[var(--color-dark-2)]">
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
              Our support team is ready to assist you with any questions about returns, refunds, or exchanges.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button variant="primary">Contact Support</Button>
              </Link>
              <Link href="/faq">
                <Button variant="outline">View FAQ</Button>
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
              <span className="text-[var(--color-main-1)] font-medium">Demo Mode:</span> Try with order number{" "}
              <code className="bg-[var(--color-dark-3)] px-2 py-1 text-white">DP-2024-001</code>{" "}
              and any email to see the return request flow.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}


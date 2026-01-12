"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui";
import { formatPrice } from "@/lib/utils";

interface OrderItem {
  id: string;
  name: string;
  image: string;
  quantity: number;
  price: number;
  variant?: string;
}

interface ReturnRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  items: OrderItem[];
  onSubmit: (returnData: ReturnRequestData) => void;
}

export interface ReturnRequestData {
  orderId: string;
  items: {
    itemId: string;
    quantity: number;
    reason: string;
  }[];
  returnMethod: "refund" | "exchange" | "store_credit";
  additionalNotes: string;
}

const returnReasons = [
  "Item doesn't match description",
  "Item arrived damaged",
  "Wrong item received",
  "Item doesn't fit/work as expected",
  "Changed my mind",
  "Quality not as expected",
  "Other",
];

export function ReturnRequestModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  items,
  onSubmit,
}: ReturnRequestModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedItems, setSelectedItems] = useState<
    Record<string, { selected: boolean; quantity: number; reason: string }>
  >(() =>
    items.reduce(
      (acc, item) => ({
        ...acc,
        [item.id]: { selected: false, quantity: 1, reason: "" },
      }),
      {}
    )
  );
  const [returnMethod, setReturnMethod] = useState<"refund" | "exchange" | "store_credit">("refund");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const hasSelectedItems = Object.values(selectedItems).some((item) => item.selected);
  const allSelectedHaveReasons = Object.values(selectedItems)
    .filter((item) => item.selected)
    .every((item) => item.reason !== "");

  const handleItemToggle = (itemId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: !prev[itemId].selected },
    }));
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const validQuantity = Math.max(1, Math.min(quantity, item.quantity));
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity: validQuantity },
    }));
  };

  const handleReasonChange = (itemId: string, reason: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], reason },
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const returnData: ReturnRequestData = {
      orderId,
      items: Object.entries(selectedItems)
        .filter(([, data]) => data.selected)
        .map(([itemId, data]) => ({
          itemId,
          quantity: data.quantity,
          reason: data.reason,
        })),
      returnMethod,
      additionalNotes,
    };

    onSubmit(returnData);
    setIsSubmitting(false);
    setIsSuccess(true);
  };

  const handleClose = () => {
    setStep(1);
    setIsSuccess(false);
    setSelectedItems(
      items.reduce(
        (acc, item) => ({
          ...acc,
          [item.id]: { selected: false, quantity: 1, reason: "" },
        }),
        {}
      )
    );
    setReturnMethod("refund");
    setAdditionalNotes("");
    onClose();
  };

  // Calculate refund estimate
  const estimatedRefund = Object.entries(selectedItems)
    .filter(([, data]) => data.selected)
    .reduce((total, [itemId, data]) => {
      const item = items.find((i) => i.id === itemId);
      return total + (item ? item.price * data.quantity : 0);
    }, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={handleClose}
          >
            <div
              className="w-full max-w-2xl bg-[var(--color-dark-1)] border border-[var(--color-dark-3)] my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative p-6 border-b border-[var(--color-dark-3)]">
                <h2 className="text-xl font-heading">
                  {isSuccess ? "Return Request Submitted" : `Request Return - Order #${orderNumber}`}
                </h2>
                <button
                  onClick={handleClose}
                  className="absolute top-1/2 right-4 -translate-y-1/2 p-2 text-[var(--muted-foreground)] hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {isSuccess ? (
                  /* Success State */
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Return Request Submitted!</h3>
                    <p className="text-white/60 mb-6 max-w-md mx-auto">
                      We&apos;ve received your return request. You&apos;ll receive an email with return instructions and a
                      shipping label within 24 hours.
                    </p>
                    <div className="bg-[var(--color-dark-2)] p-4 mb-6 text-left max-w-sm mx-auto">
                      <p className="text-sm text-white/60 mb-1">Return Request ID</p>
                      <p className="font-mono text-lg">RET-{orderId}-{Date.now().toString().slice(-6)}</p>
                    </div>
                    <Button variant="primary" onClick={handleClose}>
                      Done
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Progress Steps */}
                    <div className="flex items-center justify-center mb-8">
                      {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                              step >= s
                                ? "bg-[var(--color-main-1)] text-white"
                                : "bg-[var(--color-dark-3)] text-white/40"
                            }`}
                          >
                            {s}
                          </div>
                          {s < 3 && (
                            <div
                              className={`w-16 h-0.5 ${
                                step > s ? "bg-[var(--color-main-1)]" : "bg-[var(--color-dark-3)]"
                              }`}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Step 1: Select Items */}
                    {step === 1 && (
                      <div>
                        <h3 className="font-semibold mb-4">Select items to return</h3>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-center gap-4 p-4 border transition-colors cursor-pointer ${
                                selectedItems[item.id]?.selected
                                  ? "border-[var(--color-main-1)] bg-[var(--color-main-1)]/5"
                                  : "border-[var(--color-dark-3)] hover:border-[var(--color-dark-4)]"
                              }`}
                              onClick={() => handleItemToggle(item.id)}
                            >
                              <input
                                type="checkbox"
                                checked={selectedItems[item.id]?.selected || false}
                                onChange={() => handleItemToggle(item.id)}
                                className="w-5 h-5 accent-[var(--color-main-1)]"
                              />
                              <div className="w-16 h-16 bg-[var(--color-dark-3)] relative flex-shrink-0">
                                <Image src={item.image} alt={item.name} fill className="object-contain p-1" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{item.name}</p>
                                {item.variant && <p className="text-sm text-white/60">{item.variant}</p>}
                                <p className="text-sm text-white/60">Qty purchased: {item.quantity}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{formatPrice(item.price)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step 2: Return Details */}
                    {step === 2 && (
                      <div>
                        <h3 className="font-semibold mb-4">Return details</h3>
                        <div className="space-y-6">
                          {Object.entries(selectedItems)
                            .filter(([, data]) => data.selected)
                            .map(([itemId, data]) => {
                              const item = items.find((i) => i.id === itemId);
                              if (!item) return null;
                              return (
                                <div key={itemId} className="bg-[var(--color-dark-2)] p-4">
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-[var(--color-dark-3)] relative flex-shrink-0">
                                      <Image src={item.image} alt={item.name} fill className="object-contain p-1" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-semibold">{item.name}</p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm text-white/60 mb-2">
                                        Quantity to return
                                      </label>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleQuantityChange(itemId, data.quantity - 1)}
                                          className="w-8 h-8 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] transition-colors"
                                        >
                                          -
                                        </button>
                                        <span className="w-12 text-center">{data.quantity}</span>
                                        <button
                                          onClick={() => handleQuantityChange(itemId, data.quantity + 1)}
                                          className="w-8 h-8 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] transition-colors"
                                        >
                                          +
                                        </button>
                                        <span className="text-sm text-white/60">of {item.quantity}</span>
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-sm text-white/60 mb-2">
                                        Reason for return <span className="text-[var(--color-main-1)]">*</span>
                                      </label>
                                      <select
                                        value={data.reason}
                                        onChange={(e) => handleReasonChange(itemId, e.target.value)}
                                        className="w-full px-3 py-2 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white focus:border-[var(--color-main-1)] focus:outline-none"
                                      >
                                        <option value="">Select reason</option>
                                        {returnReasons.map((reason) => (
                                          <option key={reason} value={reason}>
                                            {reason}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Step 3: Confirm & Submit */}
                    {step === 3 && (
                      <div>
                        <h3 className="font-semibold mb-4">Confirm your return</h3>

                        {/* Return Method */}
                        <div className="mb-6">
                          <label className="block text-sm text-white/60 mb-3">How would you like to be compensated?</label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { value: "refund", label: "Refund", desc: "Original payment method" },
                              { value: "exchange", label: "Exchange", desc: "Same item, different variant" },
                              { value: "store_credit", label: "Store Credit", desc: "10% bonus credit" },
                            ].map((option) => (
                              <button
                                key={option.value}
                                onClick={() => setReturnMethod(option.value as typeof returnMethod)}
                                className={`p-4 border text-left transition-colors ${
                                  returnMethod === option.value
                                    ? "border-[var(--color-main-1)] bg-[var(--color-main-1)]/5"
                                    : "border-[var(--color-dark-3)] hover:border-[var(--color-dark-4)]"
                                }`}
                              >
                                <p className="font-semibold">{option.label}</p>
                                <p className="text-xs text-white/60">{option.desc}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-[var(--color-dark-2)] p-4 mb-6">
                          <h4 className="font-semibold mb-3">Return Summary</h4>
                          <div className="space-y-2 text-sm">
                            {Object.entries(selectedItems)
                              .filter(([, data]) => data.selected)
                              .map(([itemId, data]) => {
                                const item = items.find((i) => i.id === itemId);
                                if (!item) return null;
                                return (
                                  <div key={itemId} className="flex justify-between">
                                    <span className="text-white/70">
                                      {item.name} x{data.quantity}
                                    </span>
                                    <span>{formatPrice(item.price * data.quantity)}</span>
                                  </div>
                                );
                              })}
                            <div className="h-px bg-white/10 my-2" />
                            <div className="flex justify-between font-semibold">
                              <span>Estimated {returnMethod === "store_credit" ? "Credit" : "Refund"}</span>
                              <span className="text-[var(--color-main-1)]">
                                {formatPrice(returnMethod === "store_credit" ? estimatedRefund * 1.1 : estimatedRefund)}
                              </span>
                            </div>
                            {returnMethod === "store_credit" && (
                              <p className="text-xs text-green-500">Includes 10% bonus!</p>
                            )}
                          </div>
                        </div>

                        {/* Additional Notes */}
                        <div className="mb-6">
                          <label className="block text-sm text-white/60 mb-2">Additional notes (optional)</label>
                          <textarea
                            value={additionalNotes}
                            onChange={(e) => setAdditionalNotes(e.target.value)}
                            placeholder="Any additional information about your return..."
                            rows={3}
                            className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none resize-none"
                          />
                        </div>

                        {/* Policy Note */}
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 mb-6">
                          <div className="flex gap-3">
                            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm">
                              <p className="font-semibold text-blue-400 mb-1">Return Policy</p>
                              <p className="text-white/60">
                                Items must be unused and in original packaging. Once approved, you&apos;ll receive a
                                prepaid shipping label via email. Returns are processed within 5-7 business days after
                                we receive the item.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-between pt-4 border-t border-[var(--color-dark-3)]">
                      {step > 1 ? (
                        <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2)}>
                          Back
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={handleClose}>
                          Cancel
                        </Button>
                      )}

                      {step < 3 ? (
                        <Button
                          variant="primary"
                          onClick={() => setStep((s) => (s + 1) as 2 | 3)}
                          disabled={step === 1 ? !hasSelectedItems : !allSelectedHaveReasons}
                        >
                          Continue
                        </Button>
                      ) : (
                        <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
                          {isSubmitting ? "Submitting..." : "Submit Return Request"}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}



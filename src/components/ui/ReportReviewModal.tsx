"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ReportOption {
  id: string;
  label: string;
  description: string;
}

const reportOptions: ReportOption[] = [
  {
    id: "off-topic",
    label: "Off Topic",
    description: "Not about the product",
  },
  {
    id: "inappropriate",
    label: "Inappropriate",
    description: "Disrespectful, hateful, or obscene content",
  },
  {
    id: "fake",
    label: "Fake",
    description: "Paid for or inauthentic review",
  },
  {
    id: "other",
    label: "Other",
    description: "Something else",
  },
];

interface ReportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  reviewId: string;
}

export function ReportReviewModal({
  isOpen,
  onClose,
  onSubmit,
}: ReportReviewModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    onSubmit(selectedReason);
    setIsSubmitting(false);
    setSelectedReason(null);
    onClose();
  };

  const handleClose = () => {
    setSelectedReason(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div
              className="bg-[var(--color-dark-2)] border border-[var(--color-dark-4)] w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[var(--color-dark-4)]">
                <h2 className="text-xl font-heading uppercase tracking-wider">
                  Report This Review
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close modal"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-3">
                {reportOptions.map((option) => (
                  <label
                    key={option.id}
                    className={cn(
                      "flex items-start gap-4 p-4 cursor-pointer transition-all duration-200 border",
                      selectedReason === option.id
                        ? "bg-[var(--color-main-1)]/10 border-[var(--color-main-1)]"
                        : "bg-[var(--color-dark-1)] border-[var(--color-dark-4)] hover:border-[var(--color-dark-3)]"
                    )}
                  >
                    <div className="pt-0.5 flex-shrink-0">
                      <div
                        className={cn(
                          "w-5 h-5 border-2 flex items-center justify-center transition-all duration-200",
                          selectedReason === option.id
                            ? "border-[var(--color-main-1)] bg-[var(--color-main-1)]"
                            : "border-[var(--color-dark-4)]"
                        )}
                      >
                        {selectedReason === option.id && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <span className="font-medium block text-white">
                        {option.label}
                      </span>
                      <span className="text-sm text-white/50">
                        {option.description}
                      </span>
                    </div>
                    <input
                      type="radio"
                      name="report-reason"
                      value={option.id}
                      checked={selectedReason === option.id}
                      onChange={() => setSelectedReason(option.id)}
                      className="sr-only"
                    />
                  </label>
                ))}

                {/* Community Guidelines Notice */}
                <p className="text-sm text-white/60 pt-4">
                  We will check if this review meets our{" "}
                  <Link
                    href="/community-guidelines"
                    className="text-[var(--color-main-1)] hover:underline font-medium"
                    target="_blank"
                  >
                    community guidelines
                  </Link>
                  . If it does not, we will remove it.
                </p>
              </div>

              {/* Footer */}
              <div className="flex gap-4 p-6 pt-2 border-t border-[var(--color-dark-4)]">
                <button
                  type="button"
                  onClick={handleClose}
                  className="nk-btn nk-btn-outline flex-1"
                >
                  <span className="nk-btn-inner" />
                  <span className="nk-btn-content">Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selectedReason || isSubmitting}
                  className={cn(
                    "nk-btn flex-1",
                    selectedReason ? "nk-btn-primary" : "nk-btn-default opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="nk-btn-inner" />
                  <span className="nk-btn-content">
                    {isSubmitting ? "Submitting..." : "Submit Report"}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

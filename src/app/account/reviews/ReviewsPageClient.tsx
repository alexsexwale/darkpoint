"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { AccountLayout } from "@/components/account";
import { Rating, Button } from "@/components/ui";
import { useAccountStore, useAuthStore } from "@/stores";
import { cn } from "@/lib/utils";
import type { ProductReview, ReviewableProduct } from "@/stores/accountStore";
import type { ReviewStatus, ReportStatus } from "@/types/database";

type TabType = "reviews" | "write" | "reports";

const reviewStatusConfig: Record<ReviewStatus, { label: string; color: string }> = {
  published: { label: "Published", color: "text-green-400 bg-green-400/10" },
  pending: { label: "Pending Review", color: "text-yellow-400 bg-yellow-400/10" },
  rejected: { label: "Rejected", color: "text-red-400 bg-red-400/10" },
};

const reportStatusConfig: Record<ReportStatus, { label: string; color: string; icon: string }> = {
  pending: { label: "Under Review", color: "text-yellow-400 bg-yellow-400/10", icon: "🔍" },
  reviewed: { label: "Reviewed", color: "text-blue-400 bg-blue-400/10", icon: "📋" },
  action_taken: { label: "Action Taken", color: "text-green-400 bg-green-400/10", icon: "✅" },
  dismissed: { label: "Dismissed", color: "text-white/50 bg-white/5", icon: "❌" },
};

function WriteReviewModal({
  isOpen,
  onClose,
  product,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: ReviewableProduct | null;
  onSubmit: (data: { rating: number; title: string; content: string }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setRating(5);
      setTitle("");
      setContent("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ rating, title, content });
  };

  if (!product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={onClose}
          >
            <div
              className="w-full max-w-lg bg-[var(--color-dark-1)] border border-[var(--color-dark-3)] my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative p-6 border-b border-[var(--color-dark-3)]">
                <h2 className="text-xl font-heading">Write a Review</h2>
                <button
                  onClick={onClose}
                  className="absolute top-1/2 right-4 -translate-y-1/2 p-2 text-[var(--muted-foreground)] hover:text-white transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Product Info */}
                <div className="flex items-center gap-4 p-4 bg-[var(--color-dark-2)]">
                  <div className="w-16 h-16 bg-[var(--color-dark-3)] relative flex-shrink-0">
                    {product.product_image ? (
                      <Image
                        src={product.product_image}
                        alt={product.product_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{product.product_name}</h3>
                    <p className="text-sm text-white/50">
                      Purchased {new Date(product.order_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm text-white/70 mb-3">Your Rating *</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="text-3xl transition-transform hover:scale-110 cursor-pointer"
                      >
                        {star <= rating ? "⭐" : "☆"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Review Title <span className="text-[var(--color-main-1)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Summarize your experience"
                    className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Your Review <span className="text-[var(--color-main-1)]">*</span>
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={4}
                    placeholder="Share your thoughts about the product..."
                    className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <Button variant="primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Submitting...
                      </span>
                    ) : (
                      "Submit Review"
                    )}
                  </Button>
                  <Button variant="outline" type="button" onClick={onClose}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function ReviewsPageClient() {
  const { user } = useAuthStore();
  const {
    reviews,
    reports,
    reviewableProducts,
    isLoadingReviews,
    fetchReviews,
    fetchReports,
    fetchReviewableProducts,
    addReview,
    deleteReview,
  } = useAccountStore();

  const [activeTab, setActiveTab] = useState<TabType>("reviews");
  const [writeModal, setWriteModal] = useState<{
    isOpen: boolean;
    product: ReviewableProduct | null;
  }>({ isOpen: false, product: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchReviews();
    fetchReports();
    fetchReviewableProducts();
  }, [fetchReviews, fetchReports, fetchReviewableProducts]);

  const stats = {
    totalReviews: reviews.length,
    publishedReviews: reviews.filter((r) => r.status === "published").length,
    totalHelpful: reviews.reduce((acc, r) => acc + r.helpful_count, 0),
    totalReports: reports.length,
    resolvedReports: reports.filter((r) => r.status === "action_taken" || r.status === "reviewed").length,
    pendingReviews: reviewableProducts.length,
  };

  const handleWriteReview = (product: ReviewableProduct) => {
    setWriteModal({ isOpen: true, product });
    setMessage(null);
  };

  const handleSubmitReview = async (data: { rating: number; title: string; content: string }) => {
    if (!user || !writeModal.product) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await addReview({
        user_id: user.id,
        order_item_id: writeModal.product.order_item_id,
        product_id: writeModal.product.product_id,
        product_name: writeModal.product.product_name,
        product_slug: writeModal.product.product_slug,
        product_image: writeModal.product.product_image,
        rating: data.rating,
        title: data.title,
        content: data.content,
        verified_purchase: true,
      });

      if (!result.success) throw new Error(result.error);

      setMessage({ type: "success", text: "Review submitted successfully! It will be visible after moderation." });
      setWriteModal({ isOpen: false, product: null });
      setActiveTab("reviews");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to submit review",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    setDeletingId(id);
    setMessage(null);

    try {
      const result = await deleteReview(id);
      if (!result.success) throw new Error(result.error);
      setMessage({ type: "success", text: "Review deleted successfully!" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to delete review",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <AccountLayout title="Reviews & Reports">
        {/* Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-[var(--color-dark-2)] p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-main-1)]">{stats.totalReviews}</div>
            <div className="text-sm text-white/60">Total Reviews</div>
          </div>
          <div className="bg-[var(--color-dark-2)] p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.publishedReviews}</div>
            <div className="text-sm text-white/60">Published</div>
          </div>
          <div className="bg-[var(--color-dark-2)] p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.totalHelpful}</div>
            <div className="text-sm text-white/60">Helpful Votes</div>
          </div>
          <div className="bg-[var(--color-dark-2)] p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.pendingReviews}</div>
            <div className="text-sm text-white/60">To Review</div>
          </div>
          <div className="bg-[var(--color-dark-2)] p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.totalReports}</div>
            <div className="text-sm text-white/60">Reports Made</div>
          </div>
          <div className="bg-[var(--color-dark-2)] p-4 text-center col-span-2 md:col-span-1">
            <div className="text-2xl font-bold text-teal-400">{stats.resolvedReports}</div>
            <div className="text-sm text-white/60">Resolved</div>
          </div>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`p-4 rounded mb-6 ${
              message.type === "success"
                ? "bg-green-500/10 border border-green-500/30 text-green-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-4 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 font-medium transition-all cursor-pointer",
              activeTab === "reviews"
                ? "bg-[var(--color-main-1)] text-white"
                : "bg-[var(--color-dark-2)] text-white/60 hover:text-white hover:bg-[var(--color-dark-3)]"
            )}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            My Reviews ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 font-medium transition-all cursor-pointer",
              activeTab === "write"
                ? "bg-[var(--color-main-1)] text-white"
                : "bg-[var(--color-dark-2)] text-white/60 hover:text-white hover:bg-[var(--color-dark-3)]"
            )}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Write Review ({reviewableProducts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 font-medium transition-all cursor-pointer",
              activeTab === "reports"
                ? "bg-[var(--color-main-1)] text-white"
                : "bg-[var(--color-dark-2)] text-white/60 hover:text-white hover:bg-[var(--color-dark-3)]"
            )}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            My Reports ({reports.length})
          </button>
        </div>

        {/* Loading State */}
        {isLoadingReviews ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--color-dark-2)] p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-[var(--color-dark-3)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[var(--color-dark-3)] rounded w-1/3" />
                    <div className="h-3 bg-[var(--color-dark-3)] rounded w-1/4" />
                    <div className="h-3 bg-[var(--color-dark-3)] rounded w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <div className="space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onDelete={() => handleDeleteReview(review.id)}
                      isDeleting={deletingId === review.id}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon="star"
                    title="No Reviews Yet"
                    description="You haven't written any reviews yet. Share your experience with products you've purchased!"
                    actionLabel={reviewableProducts.length > 0 ? "Write a Review" : "Browse Products"}
                    actionHref={reviewableProducts.length > 0 ? undefined : "/store"}
                    onAction={reviewableProducts.length > 0 ? () => setActiveTab("write") : undefined}
                  />
                )}
              </div>
            )}

            {/* Write Review Tab */}
            {activeTab === "write" && (
              <div className="space-y-4">
                {reviewableProducts.length > 0 ? (
                  <>
                    <p className="text-white/70 mb-4">
                      You can write reviews for products you&apos;ve purchased and received. Select a product below to share your experience.
                    </p>
                    {reviewableProducts.map((product) => (
                      <div
                        key={product.order_item_id}
                        className="bg-[var(--color-dark-2)] p-5 flex items-center gap-4"
                      >
                        <div className="w-16 h-16 bg-[var(--color-dark-3)] relative flex-shrink-0">
                          {product.product_image ? (
                            <Image
                              src={product.product_image}
                              alt={product.product_name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/20">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{product.product_name}</h4>
                          <p className="text-sm text-white/50">
                            Purchased {new Date(product.order_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleWriteReview(product)}
                        >
                          Write Review
                        </Button>
                      </div>
                    ))}
                  </>
                ) : (
                  <EmptyState
                    icon="check"
                    title="All Caught Up!"
                    description="You've reviewed all your purchased products. Make a new purchase to leave more reviews."
                    actionLabel="Browse Products"
                    actionHref="/store"
                  />
                )}
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === "reports" && (
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 flex items-start gap-3 mb-6">
                  <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm">
                    <p className="text-blue-400 font-medium mb-1">Thank you for helping keep our community safe!</p>
                    <p className="text-white/60">
                      Reports are typically reviewed within 24-48 hours. You&apos;ll see status updates here.
                    </p>
                  </div>
                </div>

                {reports.length > 0 ? (
                  reports.map((report) => (
                    <div
                      key={report.id}
                      className="bg-[var(--color-dark-2)] p-5 border border-[var(--color-dark-4)]"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{reportStatusConfig[report.status].icon}</span>
                          <div>
                            <span className={`text-sm px-2 py-0.5 ${reportStatusConfig[report.status].color}`}>
                              {reportStatusConfig[report.status].label}
                            </span>
                            <p className="text-xs text-white/40 mt-1">
                              Reported on {new Date(report.created_at).toLocaleDateString()}
                              {report.resolved_at && (
                                <> • Resolved {new Date(report.resolved_at).toLocaleDateString()}</>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 bg-[var(--color-dark-3)] text-white/60 capitalize">
                          {report.reason.replace(/_/g, " ")}
                        </span>
                      </div>

                      {report.description && (
                        <p className="text-sm text-white/60 italic">&quot;{report.description}&quot;</p>
                      )}
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon="flag"
                    title="No Reports Yet"
                    description="You haven't reported any reviews. If you see content that violates our community guidelines, you can report it from the product page."
                  />
                )}
              </div>
            )}
          </>
        )}
      </AccountLayout>

      <WriteReviewModal
        isOpen={writeModal.isOpen}
        onClose={() => setWriteModal({ isOpen: false, product: null })}
        product={writeModal.product}
        onSubmit={handleSubmitReview}
        isSubmitting={isSubmitting}
      />
    </>
  );
}

function ReviewCard({
  review,
  onDelete,
  isDeleting,
}: {
  review: ProductReview;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="bg-[var(--color-dark-2)] p-5 border border-[var(--color-dark-4)] hover:border-[var(--color-dark-3)] transition-colors">
      <div className="flex gap-4">
        <Link href={`/store/${review.product_slug || review.product_id}`} className="flex-shrink-0">
          <div className="w-20 h-20 bg-[var(--color-dark-3)] relative overflow-hidden">
            {review.product_image ? (
              <Image
                src={review.product_image}
                alt={review.product_name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/20">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <Link
                href={`/store/${review.product_slug || review.product_id}`}
                className="font-medium hover:text-[var(--color-main-1)] transition-colors line-clamp-1"
              >
                {review.product_name}
              </Link>
              <div className="flex items-center gap-3 mt-1">
                <Rating value={review.rating} size="sm" />
                <span className={`text-xs px-2 py-0.5 ${reviewStatusConfig[review.status].color}`}>
                  {reviewStatusConfig[review.status].label}
                </span>
                {review.verified_purchase && (
                  <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400">
                    ✓ Verified Purchase
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-white/40 flex-shrink-0">
              {new Date(review.created_at).toLocaleDateString()}
            </span>
          </div>

          <h4 className="font-medium text-sm mb-1">{review.title}</h4>
          <p className="text-sm text-white/70 line-clamp-2">{review.content}</p>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-4 text-sm text-white/50">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                {review.helpful_count} helpful
              </span>
            </div>

            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="text-xs px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon: "star" | "check" | "flag";
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  const icons = {
    star: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    ),
    check: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
    ),
    flag: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    ),
  };

  return (
    <div className="text-center py-12 bg-[var(--color-dark-2)]">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-dark-3)] flex items-center justify-center">
        <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icons[icon]}
        </svg>
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-white/60 mb-6 max-w-md mx-auto">{description}</p>
      {actionLabel && (
        actionHref ? (
          <Link href={actionHref}>
            <Button variant="primary">{actionLabel}</Button>
          </Link>
        ) : (
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}

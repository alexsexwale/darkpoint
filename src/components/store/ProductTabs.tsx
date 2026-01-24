"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Rating } from "@/components/ui";
import { ReportReviewModal } from "@/components/ui/ReportReviewModal";
import { ProductDescription } from "./ProductDescription";
import { MiniBadge, type BadgeType } from "@/components/gamification";
import { useReviewsStore, type Review, type ReviewStats } from "@/stores/reviewsStore";
import { useAuthStore, useUIStore } from "@/stores";
import type { Product } from "@/types";

interface ProductTabsProps {
  product: Product;
}

const REVIEWS_PER_PAGE = 5;

// Mock specifications based on product category
const getSpecifications = (product: Product) => {
  const commonSpecs = [
    { label: "Brand", value: "Darkpoint" },
    { label: "SKU", value: product.id.toUpperCase().slice(0, 12) },
  ];

  const categorySpecs: Record<string, { label: string; value: string }[]> = {
    gaming: [
      { label: "Platform", value: "Multi-platform Compatible" },
      { label: "Type", value: "Gaming Accessory" },
      { label: "Connectivity", value: "Wired / Wireless" },
      { label: "Warranty", value: "1 Year" },
    ],
    hardware: [
      { label: "Material", value: "Premium Quality" },
      { label: "Compatibility", value: "Universal" },
      { label: "Dimensions", value: "Standard Size" },
      { label: "Warranty", value: "2 Years" },
    ],
    merchandise: [
      { label: "Material", value: "High Quality Cotton/Polyester" },
      { label: "Size", value: "Multiple sizes available" },
      { label: "Care", value: "Machine washable" },
      { label: "Origin", value: "Imported" },
    ],
    collectibles: [
      { label: "Material", value: "PVC / ABS Plastic" },
      { label: "Scale", value: "Collector's Edition" },
      { label: "Condition", value: "Brand New" },
      { label: "Packaging", value: "Original Box" },
    ],
  };

  return [...commonSpecs, ...(categorySpecs[product.category] || categorySpecs.gaming)];
};

// Calculate rating distribution from stats
const getRatingDistribution = (stats: ReviewStats | null) => {
  if (!stats) {
    return [5, 4, 3, 2, 1].map((star) => ({ star, count: 0, percentage: 0 }));
  }

  const total = stats.total;
  return [5, 4, 3, 2, 1].map((star) => {
    const count = stats.distribution[star.toString() as keyof typeof stats.distribution] || 0;
    return {
      star,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
};

export function ProductTabs({ product }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<"description" | "parameters" | "reviews">("description");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>("recent");

  const { isAuthenticated, user } = useAuthStore();
  const { openSignIn } = useUIStore();
  const {
    reviews,
    stats,
    isLoading,
    isSubmitting,
    canReview,
    totalReviews,
    hasMore,
    fetchProductReviews,
    submitReview,
    checkCanReview,
    voteHelpful,
    reportReview,
  } = useReviewsStore();

  const specifications = getSpecifications(product);
  const ratingDistribution = getRatingDistribution(stats);
  const avgRating = stats?.average || 0;

  // Fetch reviews when tab is active or product changes
  useEffect(() => {
    if (activeTab === "reviews") {
      fetchProductReviews(product.id, {
        limit: REVIEWS_PER_PAGE,
        offset: 0,
        sort: sortBy,
      });
      checkCanReview(product.id);
    }
  }, [activeTab, product.id, fetchProductReviews, checkCanReview, sortBy]);

  // Set author name from user profile
  useEffect(() => {
    if (user?.email) {
      setAuthorName(user.email.split("@")[0]);
    }
  }, [user]);

  const totalPages = Math.ceil(totalReviews / REVIEWS_PER_PAGE);

  const tabs = [
    { id: "description", label: "Description" },
    { id: "parameters", label: "Parameters" },
    { id: "reviews", label: "Reviews", count: totalReviews },
  ] as const;

  const handleHelpful = async (reviewId: string, isHelpful: boolean) => {
    if (!isAuthenticated) {
      openSignIn("login");
      return;
    }

    const result = await voteHelpful(reviewId, isHelpful);
    if (!result.success && result.error) {
      console.error(result.error);
    }
  };

  const handleReport = (reviewId: string) => {
    if (!isAuthenticated) {
      openSignIn("login");
      return;
    }
    setReportingReviewId(reviewId);
    setReportModalOpen(true);
  };

  const handleReportSubmit = async (reason: string) => {
    if (!reportingReviewId) return;
    
    const result = await reportReview(reportingReviewId, reason);
    if (!result.success && result.error) {
      console.error(result.error);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!isAuthenticated) {
      openSignIn("login");
      return;
    }

    if (reviewRating === 0) {
      setSubmitError("Please select a rating");
      return;
    }

    if (!reviewTitle.trim()) {
      setSubmitError("Please enter a review title");
      return;
    }

    if (!reviewContent.trim()) {
      setSubmitError("Please enter your review");
      return;
    }

    const result = await submitReview(product.id, {
      rating: reviewRating,
      title: reviewTitle.trim(),
      content: reviewContent.trim(),
      authorName: authorName.trim() || "Anonymous",
    });

    if (result.success) {
      setSubmitSuccess(`Review submitted successfully! +${result.xpAwarded} XP`);
      setReviewRating(0);
      setReviewTitle("");
      setReviewContent("");
      // Refresh reviews
      fetchProductReviews(product.id, { limit: REVIEWS_PER_PAGE, offset: 0, sort: sortBy });
    } else {
      setSubmitError(result.error || "Failed to submit review");
    }
  };

  const handlePageChange = async (page: number) => {
    setCurrentPage(page);
    await fetchProductReviews(product.id, {
      limit: REVIEWS_PER_PAGE,
      offset: (page - 1) * REVIEWS_PER_PAGE,
      sort: sortBy,
    });
    document.getElementById("customer-reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setCurrentPage(1);
    fetchProductReviews(product.id, {
      limit: REVIEWS_PER_PAGE,
      offset: 0,
      sort: newSort,
    });
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }

    return pages;
  };

  // Render review form based on can_review status
  const renderReviewForm = () => {
    if (!isAuthenticated) {
      return (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🔒</div>
          <h4 className="text-lg font-medium mb-2">Sign in to Write a Review</h4>
          <p className="text-white/60 mb-4 text-sm">
            You must be logged in and have purchased this product to leave a review.
          </p>
          <button
            type="button"
            onClick={() => openSignIn("login")}
            className="nk-btn nk-btn-outline"
          >
            <span className="nk-btn-inner" />
            <span className="nk-btn-content">Sign In</span>
          </button>
        </div>
      );
    }

    if (canReview?.reason === "not_purchased") {
      return (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🛒</div>
          <h4 className="text-lg font-medium mb-2">Purchase Required</h4>
          <p className="text-white/60 text-sm">
            You must purchase this product before you can write a review.
          </p>
        </div>
      );
    }

    if (canReview?.reason === "already_reviewed") {
      return (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">✅</div>
          <h4 className="text-lg font-medium mb-2">Review Submitted</h4>
          <p className="text-white/60 text-sm">
            You have already reviewed this product. Thank you for your feedback!
          </p>
        </div>
      );
    }

    // User can review
    return (
      <form className="nk-review-form space-y-4" onSubmit={handleSubmitReview}>
        {/* Success/Error Messages */}
        {submitSuccess && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded text-sm">
            {submitSuccess}
          </div>
        )}
        {submitError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded text-sm">
            {submitError}
          </div>
        )}

        {/* Rating Input */}
        <div className="nk-rating-input flex justify-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={cn("star", reviewRating >= star && "active")}
              onClick={() => setReviewRating(star)}
              aria-label={`Rate ${star} stars`}
            >
              <svg
                className="w-6 h-6"
                fill={reviewRating >= star ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <input
            type="text"
            placeholder="Name *"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="nk-form-control text-sm sm:text-base"
            required
          />
          <input
            type="text"
            placeholder="Title *"
            value={reviewTitle}
            onChange={(e) => setReviewTitle(e.target.value)}
            className="nk-form-control text-sm sm:text-base"
            required
          />
        </div>

        <textarea
          placeholder="Your Review *"
          value={reviewContent}
          onChange={(e) => setReviewContent(e.target.value)}
          className="nk-form-control nk-form-control-textarea"
          rows={4}
          required
        />

        <p className="text-xs text-white/40 text-center">
          💡 Tip: Write a detailed review (200+ characters) to earn bonus XP!
        </p>

        <div className="text-center pt-2">
          <button
            type="submit"
            className="nk-btn nk-btn-outline"
            disabled={isSubmitting}
          >
            <span className="nk-btn-inner" />
            <span className="nk-btn-content">
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </span>
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="nk-tabs">
      {/* Tab Navigation - Scrollable on mobile */}
      <ul className="nk-tabs-nav overflow-x-auto flex-nowrap pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap" role="tablist">
        {tabs.map((tab) => (
          <li key={tab.id} className="nk-tabs-nav-item shrink-0">
            <button
              type="button"
              role="tab"
              className={cn("nk-tabs-nav-link whitespace-nowrap text-sm sm:text-base", activeTab === tab.id && "active")}
              onClick={() => setActiveTab(tab.id)}
              aria-selected={activeTab === tab.id}
              aria-controls={`tab-${tab.id}`}
            >
              {tab.label}
              {"count" in tab && <small className="ml-1">({tab.count})</small>}
            </button>
          </li>
        ))}
      </ul>

      {/* Tab Content */}
      <div className="nk-tabs-content">
        {/* Description Tab */}
        <div
          id="tab-description"
          role="tabpanel"
          className={cn("nk-tabs-pane", activeTab === "description" && "active")}
        >
          <div className="nk-box-3">
            <ProductDescription description={product.description} maxLength={500} />
          </div>
        </div>

        {/* Parameters/Specifications Tab */}
        <div
          id="tab-parameters"
          role="tabpanel"
          className={cn("nk-tabs-pane", activeTab === "parameters" && "active")}
        >
          <div className="nk-box-3">
            <table className="nk-specs-table">
              <tbody>
                {specifications.map((spec, index) => (
                  <tr key={index}>
                    <td>{spec.label}</td>
                    <td>{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reviews Tab */}
        <div
          id="tab-reviews"
          role="tabpanel"
          className={cn("nk-tabs-pane", activeTab === "reviews" && "active")}
        >
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {/* Reviews Summary */}
            <div className="nk-box-3 p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-heading uppercase tracking-wider text-center mb-4 sm:mb-6">
                Reviews Summary
              </h3>

              <div className="nk-reviews-summary">
                <div className="nk-reviews-rating">
                  <Rating value={avgRating} size="lg" />
                </div>
                <p className="nk-reviews-count">
                  {avgRating.toFixed(1)} out of 5.0
                </p>
              </div>

              <div className="nk-reviews-progress">
                <table>
                  <tbody>
                    {ratingDistribution.map(({ star, percentage }) => (
                      <tr key={star}>
                        <td>{star} Star</td>
                        <td>
                          <div className="flex items-center">
                            <div className="flex-1 nk-progress-bar">
                              <div
                                className="nk-progress-fill"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="nk-progress-percent">{percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalReviews === 0 && (
                <p className="text-center text-white/50 mt-4 text-sm">
                  No reviews yet. Be the first to review this product!
                </p>
              )}
            </div>

            {/* Add Review Form */}
            <div className="nk-box-3 p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-heading uppercase tracking-wider text-center mb-4 sm:mb-6">
                Add a Review
              </h3>
              {renderReviewForm()}
            </div>
          </div>

          {/* Individual Reviews */}
          {reviews.length > 0 && (
            <div className="mt-6 sm:mt-8" id="customer-reviews">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
                <h4 className="text-base sm:text-lg font-heading uppercase tracking-wider">
                  Customer Reviews
                </h4>
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                  {/* Sort Dropdown */}
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white/80 text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded cursor-pointer"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="helpful">Most Helpful</option>
                    <option value="highest">Highest Rated</option>
                    <option value="lowest">Lowest Rated</option>
                  </select>
                  <p className="text-xs sm:text-sm text-white/50">
                    {(currentPage - 1) * REVIEWS_PER_PAGE + 1}-
                    {Math.min(currentPage * REVIEWS_PER_PAGE, totalReviews)} of {totalReviews}
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="nk-box-3 p-6 animate-pulse">
                      <div className="h-4 bg-white/10 rounded w-1/4 mb-2" />
                      <div className="h-3 bg-white/10 rounded w-1/6 mb-4" />
                      <div className="h-3 bg-white/10 rounded w-full mb-2" />
                      <div className="h-3 bg-white/10 rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="nk-box-3 p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-3">
                        <div>
                          <h5 className="font-medium text-sm sm:text-base">{review.title}</h5>
                          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs sm:text-sm text-white/60">
                            <span className="flex items-center gap-1">
                              by {review.author_name}
                              {(review as Review & { reviewer_badge?: string }).reviewer_badge && (
                                <MiniBadge 
                                  badge={(review as Review & { reviewer_badge?: string }).reviewer_badge as BadgeType} 
                                />
                              )}
                            </span>
                            {review.is_verified_purchase && (
                              <span className="text-green-400 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span className="hidden sm:inline">Verified Purchase</span>
                                <span className="sm:hidden">Verified</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <Rating value={review.rating} size="sm" />
                      </div>
                      <p className="text-white/80 text-sm sm:text-base">{review.content}</p>

                      {/* Review Actions */}
                      <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 border-t border-white/10 pt-3 sm:pt-4">
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-white/50">
                          <span>{new Date(review.created_at).toLocaleDateString()}</span>
                          <span>·</span>
                          <span>{review.helpful_count} helpful</span>
                        </div>

                        {!review.is_own_review && (
                          <div className="flex items-center gap-2 sm:gap-3">
                            {/* Helpful Button */}
                            <button
                              type="button"
                              onClick={() => handleHelpful(review.id, true)}
                              className={cn(
                                "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm transition-colors cursor-pointer",
                                review.user_voted === true
                                  ? "bg-[var(--color-main-1)]/20 text-[var(--color-main-1)]"
                                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                              )}
                            >
                              <svg
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                                fill={review.user_voted === true ? "currentColor" : "none"}
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                                />
                              </svg>
                              <span>Helpful</span>
                            </button>

                            {/* Report Button */}
                            <button
                              type="button"
                              onClick={() => handleReport(review.id)}
                              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm bg-white/5 text-white/60 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
                            >
                              <svg
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                                />
                              </svg>
                              <span>Report</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 transition-colors cursor-pointer",
                      currentPage === 1
                        ? "text-white/30 cursor-not-allowed"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    )}
                    aria-label="Previous page"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) =>
                      page === "ellipsis" ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="w-10 h-10 flex items-center justify-center text-white/50"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          type="button"
                          onClick={() => handlePageChange(page)}
                          className={cn(
                            "w-10 h-10 flex items-center justify-center text-sm font-medium transition-colors cursor-pointer",
                            currentPage === page
                              ? "bg-[var(--color-main-1)] text-white"
                              : "text-white/60 hover:text-white hover:bg-white/10"
                          )}
                          aria-label={`Page ${page}`}
                          aria-current={currentPage === page ? "page" : undefined}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 transition-colors cursor-pointer",
                      currentPage === totalPages
                        ? "text-white/30 cursor-not-allowed"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    )}
                    aria-label="Next page"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Empty state when no reviews */}
          {reviews.length === 0 && !isLoading && (
            <div className="mt-8 text-center py-12 bg-[var(--color-dark-2)] border border-[var(--color-dark-3)]">
              <div className="text-6xl mb-4">📝</div>
              <h4 className="text-lg font-heading mb-2">No Reviews Yet</h4>
              <p className="text-white/60 text-sm">
                Be the first to share your experience with this product!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      <ReportReviewModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setReportingReviewId(null);
        }}
        onSubmit={handleReportSubmit}
        reviewId={reportingReviewId || ""}
      />
    </div>
  );
}

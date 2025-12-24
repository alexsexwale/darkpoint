"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Rating } from "@/components/ui";
import { ReportReviewModal } from "@/components/ui/ReportReviewModal";
import { ProductDescription } from "./ProductDescription";
import type { Product, ProductReview } from "@/types";

interface ProductTabsProps {
  product: Product;
  reviews?: ProductReview[];
}

const REVIEWS_PER_PAGE = 5;

// Mock specifications based on product category
const getSpecifications = (product: Product) => {
  const commonSpecs = [
    { label: "Brand", value: "Dark Point" },
    { label: "SKU", value: product.id.toUpperCase() },
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

// Mock reviews for demonstration (expanded for pagination testing)
const getMockReviews = (product: Product): ProductReview[] => [
  {
    id: "1",
    productId: product.id,
    author: "GamerPro2024",
    rating: 5,
    title: "Absolutely amazing!",
    content: "This product exceeded my expectations. The quality is top-notch and it arrived quickly. Highly recommend to all gamers!",
    createdAt: "2024-12-01",
    helpful: 24,
  },
  {
    id: "2",
    productId: product.id,
    author: "TechEnthusiast",
    rating: 4,
    title: "Great value for money",
    content: "Good product overall. Works exactly as described. Would buy again from Dark Point.",
    createdAt: "2024-11-28",
    helpful: 15,
  },
  {
    id: "3",
    productId: product.id,
    author: "StreamerKing",
    rating: 5,
    title: "Perfect for streaming",
    content: "Using this for my streams and it's been fantastic. My viewers love it!",
    createdAt: "2024-11-15",
    helpful: 31,
  },
  {
    id: "4",
    productId: product.id,
    author: "CasualGamer99",
    rating: 4,
    title: "Solid purchase",
    content: "Does what it says on the box. Good quality and fast delivery. Would recommend.",
    createdAt: "2024-11-10",
    helpful: 8,
  },
  {
    id: "5",
    productId: product.id,
    author: "ProPlayer_ZA",
    rating: 5,
    title: "Tournament ready!",
    content: "Been using this in competitive play. No issues whatsoever. Top tier quality!",
    createdAt: "2024-11-05",
    helpful: 42,
  },
  {
    id: "6",
    productId: product.id,
    author: "RetroGamer",
    rating: 4,
    title: "Better than expected",
    content: "I was skeptical at first, but this product really delivers. Great build quality.",
    createdAt: "2024-10-28",
    helpful: 12,
  },
  {
    id: "7",
    productId: product.id,
    author: "NightOwlGaming",
    rating: 5,
    title: "Best purchase this year",
    content: "Absolutely love it! The quality is outstanding and customer service was excellent.",
    createdAt: "2024-10-20",
    helpful: 19,
  },
  {
    id: "8",
    productId: product.id,
    author: "GameDevSA",
    rating: 3,
    title: "Decent product",
    content: "It's okay for the price. Nothing spectacular but gets the job done.",
    createdAt: "2024-10-15",
    helpful: 5,
  },
  {
    id: "9",
    productId: product.id,
    author: "EsportsCoach",
    rating: 5,
    title: "Highly recommended for teams",
    content: "We bought these for our entire esports team. Everyone loves them!",
    createdAt: "2024-10-10",
    helpful: 28,
  },
  {
    id: "10",
    productId: product.id,
    author: "WeekendWarrior",
    rating: 4,
    title: "Great for casual gaming",
    content: "Perfect for my weekend gaming sessions. Good value for the price.",
    createdAt: "2024-10-05",
    helpful: 7,
  },
  {
    id: "11",
    productId: product.id,
    author: "TechReviewer",
    rating: 5,
    title: "Impressive quality",
    content: "As someone who reviews tech products, I can say this is one of the better ones I've tested.",
    createdAt: "2024-09-28",
    helpful: 35,
  },
  {
    id: "12",
    productId: product.id,
    author: "FirstTimeGamer",
    rating: 4,
    title: "Great starter product",
    content: "Perfect for someone new to gaming. Easy to use and great quality.",
    createdAt: "2024-09-20",
    helpful: 11,
  },
];

// Calculate rating distribution
const getRatingDistribution = (reviews: ProductReview[]) => {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((review) => {
    if (review.rating >= 1 && review.rating <= 5) {
      distribution[review.rating as keyof typeof distribution]++;
    }
  });
  
  const total = reviews.length;
  return Object.entries(distribution)
    .reverse()
    .map(([star, count]) => ({
      star: parseInt(star),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
};

export function ProductTabs({ product, reviews: providedReviews }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<"description" | "parameters" | "reviews">("description");
  const [reviewRating, setReviewRating] = useState(0);
  const [helpfulReviews, setHelpfulReviews] = useState<Set<string>>(new Set());
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const specifications = getSpecifications(product);
  const reviews = providedReviews || getMockReviews(product);
  const ratingDistribution = getRatingDistribution(reviews);
  const avgRating = product.rating || 4.0;

  // Pagination calculations
  const totalPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);
  const paginatedReviews = useMemo(() => {
    const startIndex = (currentPage - 1) * REVIEWS_PER_PAGE;
    const endIndex = startIndex + REVIEWS_PER_PAGE;
    return reviews.slice(startIndex, endIndex);
  }, [reviews, currentPage]);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push("ellipsis");
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  const tabs = [
    { id: "description", label: "Description" },
    { id: "parameters", label: "Parameters" },
    { id: "reviews", label: "Reviews", count: product.reviewCount || reviews.length },
  ] as const;

  const handleHelpful = (reviewId: string) => {
    setHelpfulReviews((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const handleReport = (reviewId: string) => {
    setReportingReviewId(reviewId);
    setReportModalOpen(true);
  };

  const handleReportSubmit = (reason: string) => {
    console.log(`Reported review ${reportingReviewId} for reason: ${reason}`);
    // In a real app, this would send to an API
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to reviews section
    document.getElementById("customer-reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="nk-tabs">
      {/* Tab Navigation */}
      <ul className="nk-tabs-nav" role="tablist">
        {tabs.map((tab) => (
          <li key={tab.id} className="nk-tabs-nav-item">
            <button
              type="button"
              role="tab"
              className={cn("nk-tabs-nav-link", activeTab === tab.id && "active")}
              onClick={() => setActiveTab(tab.id)}
              aria-selected={activeTab === tab.id}
              aria-controls={`tab-${tab.id}`}
            >
              {tab.label}
              {"count" in tab && <small>({tab.count})</small>}
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
            {/* Product Description with HTML stripped and Read More */}
            <ProductDescription 
              description={product.description} 
              maxLength={500}
            />
            
            <div className="mt-8 pt-8 border-t border-[var(--color-dark-3)]">
              <h4 className="text-lg font-heading uppercase tracking-wider mb-4">Why Choose Dark Point?</h4>
              <p className="text-[var(--muted-foreground)] mb-4">
                At Dark Point, we pride ourselves on offering only the highest quality gaming products. 
                Each item is carefully selected to ensure it meets the standards that gamers expect and deserve.
              </p>
              <p className="text-[var(--muted-foreground)]">
                This product comes with our satisfaction guarantee. If you&apos;re not completely happy with your 
                purchase, our customer support team is here to help make it right.
              </p>
            </div>
            <ul className="mt-6 space-y-2">
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--color-main-1)]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Premium quality materials</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--color-main-1)]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>1 year warranty included</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--color-main-1)]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Free shipping on orders over R500</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--color-main-1)]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>30-day money-back guarantee</span>
              </li>
            </ul>
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
          <div className="grid md:grid-cols-2 gap-6">
            {/* Reviews Summary */}
            <div className="nk-box-3">
              <h3 className="text-xl font-heading uppercase tracking-wider text-center mb-6">
                Reviews Summary
              </h3>
              
              <div className="nk-reviews-summary">
                <div className="nk-reviews-rating">
                  <Rating value={avgRating} size="lg" />
                </div>
                <p className="nk-reviews-count">{avgRating.toFixed(1)} out of 5.0</p>
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
            </div>

            {/* Add Review Form */}
            <div className="nk-box-3">
              <h3 className="text-xl font-heading uppercase tracking-wider text-center mb-6">
                Add a Review
              </h3>
              
              <form className="nk-review-form space-y-4">
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
                
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Name *"
                    className="nk-form-control"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Title *"
                    className="nk-form-control"
                    required
                  />
                </div>
                
                <textarea
                  placeholder="Your Review *"
                  className="nk-form-control nk-form-control-textarea"
                  rows={4}
                  required
                />
                
                <div className="text-center pt-2">
                  <button type="submit" className="nk-btn nk-btn-outline">
                    <span className="nk-btn-inner" />
                    <span className="nk-btn-content">Submit</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Individual Reviews */}
          {reviews.length > 0 && (
            <div className="mt-8" id="customer-reviews">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-heading uppercase tracking-wider">
                  Customer Reviews
                </h4>
                <p className="text-sm text-white/50">
                  Showing {((currentPage - 1) * REVIEWS_PER_PAGE) + 1}-{Math.min(currentPage * REVIEWS_PER_PAGE, reviews.length)} of {reviews.length} reviews
                </p>
              </div>
              
              <div className="space-y-4">
                {paginatedReviews.map((review) => {
                  const isHelpful = helpfulReviews.has(review.id);
                  const helpfulCount = review.helpful + (isHelpful ? 1 : 0);
                  
                  return (
                    <div key={review.id} className="nk-box-3 p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h5 className="font-medium">{review.title}</h5>
                          <p className="text-sm text-white/60">by {review.author}</p>
                        </div>
                        <Rating value={review.rating} size="sm" />
                      </div>
                      <p className="text-white/80">{review.content}</p>
                      
                      {/* Review Actions */}
                      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                        <div className="flex items-center gap-2 text-sm text-white/50">
                          <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                          <span>·</span>
                          <span>{helpfulCount} found this helpful</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Helpful Button */}
                          <button
                            type="button"
                            onClick={() => handleHelpful(review.id)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors cursor-pointer",
                              isHelpful
                                ? "bg-[var(--color-main-1)]/20 text-[var(--color-main-1)]"
                                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            <svg
                              className="w-4 h-4"
                              fill={isHelpful ? "currentColor" : "none"}
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
                            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm bg-white/5 text-white/60 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <svg
                              className="w-4 h-4"
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
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  {/* Previous Button */}
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

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                      page === "ellipsis" ? (
                        <span key={`ellipsis-${index}`} className="w-10 h-10 flex items-center justify-center text-white/50">
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
                    ))}
                  </div>

                  {/* Next Button */}
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

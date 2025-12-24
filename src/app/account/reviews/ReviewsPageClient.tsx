"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AccountLayout } from "@/components/account";
import { Rating } from "@/components/ui";
import { cn } from "@/lib/utils";

type TabType = "reviews" | "reports";

interface UserReview {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  productSlug: string;
  rating: number;
  title: string;
  content: string;
  createdAt: string;
  status: "published" | "pending" | "rejected";
  helpful: number;
}

interface UserReport {
  id: string;
  reviewId: string;
  productName: string;
  productSlug: string;
  reviewAuthor: string;
  reviewContent: string;
  reason: string;
  status: "pending" | "reviewed" | "action_taken" | "dismissed";
  createdAt: string;
  resolvedAt?: string;
}

// Mock data for user's reviews
const mockUserReviews: UserReview[] = [
  {
    id: "ur-1",
    productId: "prod-1",
    productName: "Wireless Gaming Headset Pro",
    productImage: "/images/products/headset.jpg",
    productSlug: "wireless-gaming-headset-pro",
    rating: 5,
    title: "Best headset I've ever owned!",
    content: "Crystal clear audio and super comfortable for long gaming sessions. The mic quality is also fantastic.",
    createdAt: "2024-12-15",
    status: "published",
    helpful: 12,
  },
  {
    id: "ur-2",
    productId: "prod-2",
    productName: "RGB Mechanical Keyboard",
    productImage: "/images/products/keyboard.jpg",
    productSlug: "rgb-mechanical-keyboard",
    rating: 4,
    title: "Great keyboard with amazing RGB",
    content: "The switches feel great and the RGB effects are stunning. Only wish it had dedicated media keys.",
    createdAt: "2024-12-10",
    status: "published",
    helpful: 8,
  },
  {
    id: "ur-3",
    productId: "prod-3",
    productName: "Gaming Mouse Pad XL",
    productImage: "/images/products/mousepad.jpg",
    productSlug: "gaming-mouse-pad-xl",
    rating: 5,
    title: "Perfect size for my setup",
    content: "Smooth surface, doesn't fray at the edges. Great value for money!",
    createdAt: "2024-11-28",
    status: "pending",
    helpful: 0,
  },
];

// Mock data for user's reports
const mockUserReports: UserReport[] = [
  {
    id: "rp-1",
    reviewId: "rev-456",
    productName: "Wireless Gaming Headset Pro",
    productSlug: "wireless-gaming-headset-pro",
    reviewAuthor: "FakeReviewer123",
    reviewContent: "This product is terrible! Don't buy! [spam link removed]",
    reason: "fake",
    status: "action_taken",
    createdAt: "2024-12-12",
    resolvedAt: "2024-12-13",
  },
  {
    id: "rp-2",
    reviewId: "rev-789",
    productName: "RGB Mechanical Keyboard",
    productSlug: "rgb-mechanical-keyboard",
    reviewAuthor: "AngryUser",
    reviewContent: "The delivery was late so 1 star. Product seems fine though.",
    reason: "off-topic",
    status: "reviewed",
    createdAt: "2024-12-08",
    resolvedAt: "2024-12-10",
  },
  {
    id: "rp-3",
    reviewId: "rev-101",
    productName: "Gaming Chair Deluxe",
    productSlug: "gaming-chair-deluxe",
    reviewAuthor: "Competitor",
    reviewContent: "Buy from XYZ store instead, much better prices!",
    reason: "inappropriate",
    status: "pending",
    createdAt: "2024-12-18",
  },
];

const reviewStatusConfig = {
  published: { label: "Published", color: "text-green-400 bg-green-400/10" },
  pending: { label: "Pending Review", color: "text-yellow-400 bg-yellow-400/10" },
  rejected: { label: "Rejected", color: "text-red-400 bg-red-400/10" },
};

const reportStatusConfig = {
  pending: { label: "Under Review", color: "text-yellow-400 bg-yellow-400/10", icon: "🔍" },
  reviewed: { label: "Reviewed", color: "text-blue-400 bg-blue-400/10", icon: "📋" },
  action_taken: { label: "Action Taken", color: "text-green-400 bg-green-400/10", icon: "✅" },
  dismissed: { label: "Dismissed", color: "text-white/50 bg-white/5", icon: "❌" },
};

const reportReasonLabels: Record<string, string> = {
  "off-topic": "Off Topic",
  "inappropriate": "Inappropriate",
  "fake": "Fake Review",
  "other": "Other",
};

export function ReviewsPageClient() {
  const [activeTab, setActiveTab] = useState<TabType>("reviews");
  const [editingReview, setEditingReview] = useState<string | null>(null);

  const userReviews = mockUserReviews;
  const userReports = mockUserReports;

  const stats = {
    totalReviews: userReviews.length,
    publishedReviews: userReviews.filter((r) => r.status === "published").length,
    totalHelpful: userReviews.reduce((acc, r) => acc + r.helpful, 0),
    totalReports: userReports.length,
    resolvedReports: userReports.filter((r) => r.status === "action_taken" || r.status === "reviewed").length,
  };

  return (
    <AccountLayout title="Reviews & Reports">
      {/* Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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
          <div className="text-2xl font-bold text-yellow-400">{stats.totalReports}</div>
          <div className="text-sm text-white/60">Reports Made</div>
        </div>
        <div className="bg-[var(--color-dark-2)] p-4 text-center col-span-2 md:col-span-1">
          <div className="text-2xl font-bold text-purple-400">{stats.resolvedReports}</div>
          <div className="text-sm text-white/60">Resolved</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
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
          My Reviews ({userReviews.length})
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
          My Reports ({userReports.length})
        </button>
      </div>

      {/* Reviews Tab Content */}
      {activeTab === "reviews" && (
        <div className="space-y-4">
          {userReviews.length > 0 ? (
            userReviews.map((review) => (
              <div
                key={review.id}
                className="bg-[var(--color-dark-2)] p-5 border border-[var(--color-dark-4)] hover:border-[var(--color-dark-3)] transition-colors"
              >
                <div className="flex gap-4">
                  {/* Product Image */}
                  <Link href={`/product/${review.productSlug}`} className="flex-shrink-0">
                    <div className="w-20 h-20 bg-[var(--color-dark-3)] relative overflow-hidden">
                      <Image
                        src={review.productImage}
                        alt={review.productName}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-white/20">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </Link>

                  {/* Review Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <Link
                          href={`/product/${review.productSlug}`}
                          className="font-medium hover:text-[var(--color-main-1)] transition-colors line-clamp-1"
                        >
                          {review.productName}
                        </Link>
                        <div className="flex items-center gap-3 mt-1">
                          <Rating value={review.rating} size="sm" />
                          <span className={`text-xs px-2 py-0.5 ${reviewStatusConfig[review.status].color}`}>
                            {reviewStatusConfig[review.status].label}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-white/40 flex-shrink-0">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="font-medium text-sm mb-1">{review.title}</h4>
                    <p className="text-sm text-white/70 line-clamp-2">{review.content}</p>

                    {/* Review Actions */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                      <div className="flex items-center gap-4 text-sm text-white/50">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                          {review.helpful} helpful
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingReview(editingReview === review.id ? null : review.id)}
                          className="text-xs px-3 py-1.5 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-[var(--color-dark-2)]">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-dark-3)] flex items-center justify-center">
                <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">No Reviews Yet</h3>
              <p className="text-white/60 mb-6">
                Share your gaming experience! Your reviews help other gamers make informed decisions.
              </p>
              <Link
                href="/store"
                className="inline-flex items-center gap-2 px-6 py-2 bg-[var(--color-main-1)] hover:bg-[var(--color-main-1)]/80 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Browse Products
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Reports Tab Content */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 flex items-start gap-3 mb-6">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="text-blue-400 font-medium mb-1">Thank you for helping keep our community safe!</p>
              <p className="text-white/60">
                Reports are typically reviewed within 24-48 hours. You&apos;ll see status updates here as we process them.
              </p>
            </div>
          </div>

          {userReports.length > 0 ? (
            userReports.map((report) => (
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
                        Reported on {new Date(report.createdAt).toLocaleDateString()}
                        {report.resolvedAt && (
                          <> • Resolved {new Date(report.resolvedAt).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-[var(--color-dark-3)] text-white/60">
                    {reportReasonLabels[report.reason] || report.reason}
                  </span>
                </div>

                <div className="bg-[var(--color-dark-3)] p-4 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Link
                      href={`/product/${report.productSlug}`}
                      className="text-sm font-medium hover:text-[var(--color-main-1)] transition-colors"
                    >
                      {report.productName}
                    </Link>
                    <span className="text-xs text-white/40">by {report.reviewAuthor}</span>
                  </div>
                  <p className="text-sm text-white/60 italic">&quot;{report.reviewContent}&quot;</p>
                </div>

                {/* Status-specific messages */}
                {report.status === "action_taken" && (
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    The reported content has been removed or modified. Thank you for your report!
                  </div>
                )}
                {report.status === "reviewed" && (
                  <div className="flex items-center gap-2 text-sm text-blue-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    We&apos;ve reviewed this report and determined no action is needed at this time.
                  </div>
                )}
                {report.status === "pending" && (
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Our team is reviewing this report. We&apos;ll update the status soon.
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-[var(--color-dark-2)]">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-dark-3)] flex items-center justify-center">
                <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">No Reports Yet</h3>
              <p className="text-white/60 mb-4">
                You haven&apos;t reported any reviews. If you see content that violates our{" "}
                <Link href="/community-guidelines" className="text-[var(--color-main-1)] hover:underline">
                  community guidelines
                </Link>
                , you can report it from the product page.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Achievement Section */}
      <div className="mt-8 bg-gradient-to-r from-purple-500/10 to-[var(--color-main-1)]/10 p-6 border border-purple-500/20">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-[var(--color-main-1)] flex items-center justify-center text-3xl">
            🏆
          </div>
          <div className="flex-1">
            <h3 className="font-heading text-lg uppercase tracking-wider mb-1">
              Community Contributor
            </h3>
            <p className="text-sm text-white/60 mb-2">
              You&apos;ve written {stats.totalReviews} reviews and received {stats.totalHelpful} helpful votes!
            </p>
            <div className="w-full bg-[var(--color-dark-4)] rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-[var(--color-main-1)]"
                style={{ width: `${Math.min((stats.totalHelpful / 50) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-white/40 mt-1">
              {Math.max(0, 50 - stats.totalHelpful)} more helpful votes to reach &quot;Top Reviewer&quot; status!
            </p>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}



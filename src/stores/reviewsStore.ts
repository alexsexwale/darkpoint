"use client";

import { create } from "zustand";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface Review {
  id: string;
  created_at: string;
  rating: number;
  title: string;
  content: string;
  author_name: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  images: string[];
  user_voted: boolean | null;
  is_own_review: boolean;
}

export interface ReviewStats {
  total: number;
  average: number;
  distribution: {
    "5": number;
    "4": number;
    "3": number;
    "2": number;
    "1": number;
  };
}

export interface UserReview {
  id: string;
  created_at: string;
  product_id: string;
  rating: number;
  title: string;
  content: string;
  helpful_count: number;
  is_approved: boolean;
  images: string[];
}

interface CanReviewResponse {
  can_review: boolean;
  reason: "not_logged_in" | "not_purchased" | "already_reviewed" | "eligible";
  message: string;
}

interface ReviewsState {
  reviews: Review[];
  stats: ReviewStats | null;
  userReviews: UserReview[];
  isLoading: boolean;
  isSubmitting: boolean;
  canReview: CanReviewResponse | null;
  totalReviews: number;
  hasMore: boolean;
}

interface ReviewsActions {
  fetchProductReviews: (
    productId: string,
    options?: { limit?: number; offset?: number; sort?: string }
  ) => Promise<void>;
  submitReview: (
    productId: string,
    data: {
      rating: number;
      title: string;
      content: string;
      authorName: string;
      images?: string[];
    }
  ) => Promise<{ success: boolean; error?: string; xpAwarded?: number }>;
  checkCanReview: (productId: string) => Promise<CanReviewResponse>;
  voteHelpful: (
    reviewId: string,
    isHelpful: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  reportReview: (
    reviewId: string,
    reason: string,
    details?: string
  ) => Promise<{ success: boolean; error?: string }>;
  fetchUserReviews: (options?: {
    limit?: number;
    offset?: number;
  }) => Promise<void>;
  reset: () => void;
}

type ReviewsStore = ReviewsState & ReviewsActions;

const initialState: ReviewsState = {
  reviews: [],
  stats: null,
  userReviews: [],
  isLoading: false,
  isSubmitting: false,
  canReview: null,
  totalReviews: 0,
  hasMore: false,
};

export const useReviewsStore = create<ReviewsStore>((set, get) => ({
  ...initialState,

  fetchProductReviews: async (productId, options = {}) => {
    if (!isSupabaseConfigured()) return;

    const { limit = 10, offset = 0, sort = "recent" } = options;

    set({ isLoading: true });

    try {
      const { data, error } = await supabase.rpc("get_product_reviews", {
        p_product_id: productId,
        p_limit: limit,
        p_offset: offset,
        p_sort: sort,
      } as never);

      if (error) throw error;

      const result = data as {
        success: boolean;
        reviews: Review[];
        stats: ReviewStats;
        total: number;
        has_more: boolean;
      };

      if (result?.success) {
        set({
          reviews: offset === 0 ? result.reviews : [...get().reviews, ...result.reviews],
          stats: result.stats,
          totalReviews: result.total,
          hasMore: result.has_more,
        });
      }
    } catch {
      // Silently fail - reviews table may not exist yet
    } finally {
      set({ isLoading: false });
    }
  },

  submitReview: async (productId, data) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Service not configured" };
    }

    set({ isSubmitting: true });

    try {
      const { data: result, error } = await supabase.rpc("submit_review", {
        p_product_id: productId,
        p_rating: data.rating,
        p_title: data.title,
        p_content: data.content,
        p_author_name: data.authorName,
        p_images: data.images || [],
      } as never);

      if (error) throw error;

      const response = result as {
        success: boolean;
        error?: string;
        xp_awarded?: number;
        message?: string;
      };

      if (response?.success) {
        // Refresh reviews
        await get().fetchProductReviews(productId);
        // Update can review status
        set({
          canReview: {
            can_review: false,
            reason: "already_reviewed",
            message: "You have already reviewed this product",
          },
        });
        return {
          success: true,
          xpAwarded: response.xp_awarded,
        };
      } else {
        return {
          success: false,
          error: response?.error || "Failed to submit review",
        };
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit review",
      };
    } finally {
      set({ isSubmitting: false });
    }
  },

  checkCanReview: async (productId) => {
    if (!isSupabaseConfigured()) {
      const result: CanReviewResponse = {
        can_review: false,
        reason: "not_logged_in",
        message: "Service not configured",
      };
      set({ canReview: result });
      return result;
    }

    try {
      const { data, error } = await supabase.rpc("can_review_product", {
        p_product_id: productId,
      } as never);

      if (error) throw error;

      const result = data as CanReviewResponse;
      set({ canReview: result });
      return result;
    } catch {
      // Function may not be deployed yet - silently default to not_logged_in
      // This is expected behavior before the migration is run
      const result: CanReviewResponse = {
        can_review: false,
        reason: "not_logged_in",
        message: "Please sign in to write a review",
      };
      set({ canReview: result });
      return result;
    }
  },

  voteHelpful: async (reviewId, isHelpful) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Service not configured" };
    }

    try {
      const { data, error } = await supabase.rpc("vote_review_helpful", {
        p_review_id: reviewId,
        p_is_helpful: isHelpful,
      } as never);

      if (error) throw error;

      const result = data as { success: boolean; error?: string; action?: string };

      if (result?.success) {
        // Update local state
        const reviews = get().reviews.map((review) => {
          if (review.id === reviewId) {
            let newHelpfulCount = review.helpful_count;
            let newUserVoted: boolean | null = review.user_voted;

            if (result.action === "added" && isHelpful) {
              newHelpfulCount += 1;
              newUserVoted = true;
            } else if (result.action === "removed") {
              if (review.user_voted === true) {
                newHelpfulCount -= 1;
              }
              newUserVoted = null;
            } else if (result.action === "changed") {
              if (isHelpful) {
                newHelpfulCount += 1;
                newUserVoted = true;
              } else {
                newHelpfulCount -= 1;
                newUserVoted = false;
              }
            }

            return {
              ...review,
              helpful_count: Math.max(0, newHelpfulCount),
              user_voted: newUserVoted,
            };
          }
          return review;
        });

        set({ reviews });
        return { success: true };
      } else {
        return { success: false, error: result?.error || "Failed to vote" };
      }
    } catch (error) {
      console.error("Error voting:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to vote",
      };
    }
  },

  reportReview: async (reviewId, reason, details) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Service not configured" };
    }

    try {
      // First, save the report to the database
      const { data, error } = await supabase.rpc("report_review", {
        p_review_id: reviewId,
        p_reason: reason,
        p_details: details || null,
      } as never);

      if (error) throw error;

      const result = data as { success: boolean; error?: string };

      if (result?.success) {
        // Find the review details to include in the email
        const review = get().reviews.find((r) => r.id === reviewId);
        
        // Get the current user's email
        const { data: userData } = await supabase.auth.getUser();
        
        // Send email notification to admin (fire and forget)
        fetch("/api/reviews/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewId,
            reason,
            details: details || null,
            reviewTitle: review?.title || null,
            reviewContent: review?.content || null,
            reviewAuthor: review?.author_name || null,
            reporterEmail: userData?.user?.email || null,
          }),
        }).catch((emailError) => {
          // Log but don't fail the report
          console.warn("Failed to send report notification email:", emailError);
        });
      }

      return result;
    } catch (error) {
      console.error("Error reporting review:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to report review",
      };
    }
  },

  fetchUserReviews: async (options = {}) => {
    if (!isSupabaseConfigured()) return;

    const { limit = 20, offset = 0 } = options;

    set({ isLoading: true });

    try {
      const { data, error } = await supabase.rpc("get_user_reviews", {
        p_limit: limit,
        p_offset: offset,
      } as never);

      if (error) throw error;

      const result = data as {
        success: boolean;
        reviews: UserReview[];
        total: number;
        has_more: boolean;
      };

      if (result?.success) {
        set({
          userReviews:
            offset === 0
              ? result.reviews || []
              : [...get().userReviews, ...(result.reviews || [])],
          totalReviews: result.total,
          hasMore: result.has_more,
        });
      }
    } catch (error) {
      console.error("Error fetching user reviews:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () => set(initialState),
}));


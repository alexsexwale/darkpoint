"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ParallaxMouse } from "@/components/effects";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  published_at: string;
  category: string;
  type: string;
  image_url: string | null;
  views: number;
  comment_count?: number;
}

const typeIcons: Record<string, React.ReactNode> = {
  image: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  video: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  ),
  audio: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
      />
    </svg>
  ),
  gallery: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  ),
};

// Skeleton loader for article cards
function ArticleSkeleton({ index }: { index: number }) {
  return (
    <article className="nk-blog-post animate-pulse">
      <div
        className={`flex flex-col ${
          index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
        } gap-8 items-center`}
      >
        {/* Thumbnail skeleton */}
        <div className="relative w-full md:w-1/2 aspect-[4/3] bg-[var(--color-dark-3)] rounded-lg" />

        {/* Content skeleton */}
        <div className="w-full md:w-1/2 space-y-4">
          <div className="space-y-2">
            <div className="h-8 bg-[var(--color-dark-3)] rounded w-3/4" />
            <div className="h-8 bg-[var(--color-dark-3)] rounded w-1/2" />
            <div className="h-5 bg-[var(--color-dark-3)] rounded w-1/4 mt-2" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-[var(--color-dark-3)] rounded w-full" />
            <div className="h-4 bg-[var(--color-dark-3)] rounded w-5/6" />
          </div>
          <div className="flex gap-4">
            <div className="h-4 bg-[var(--color-dark-3)] rounded w-20" />
            <div className="h-4 bg-[var(--color-dark-3)] rounded w-24" />
          </div>
          <div className="h-4 bg-[var(--color-main-1)]/30 rounded w-28" />
        </div>
      </div>
    </article>
  );
}

// Format date nicely
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const ARTICLES_PER_PAGE = 6;

export function NewsPageClient() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch articles from database
  useEffect(() => {
    fetchArticles();
  }, []);

  async function fetchArticles(loadMore = false) {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const currentPage = loadMore ? page + 1 : 1;
      const from = (currentPage - 1) * ARTICLES_PER_PAGE;
      const to = from + ARTICLES_PER_PAGE - 1;

      // Get total count
      const { count } = await supabase
        .from("news_articles")
        .select("*", { count: "exact", head: true })
        .eq("is_published", true);

      setTotalCount(count || 0);

      // Get articles with pagination
      type ArticleRow = {
        id: string;
        slug: string;
        title: string;
        excerpt: string;
        published_at: string;
        category: string;
        type: string;
        image_url: string | null;
        views: number;
      };

      const { data, error } = await supabase
        .from("news_articles")
        .select("id, slug, title, excerpt, published_at, category, type, image_url, views")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error fetching articles:", error);
        return;
      }

      const articlesData = (data || []) as ArticleRow[];

      // Get comment counts for each article
      const articlesWithComments = await Promise.all(
        articlesData.map(async (article) => {
          const { count } = await supabase
            .from("article_comments")
            .select("*", { count: "exact", head: true })
            .eq("article_id", article.id)
            .eq("is_approved", true);

          return {
            ...article,
            comment_count: count || 0,
          };
        })
      );

      if (loadMore) {
        setArticles((prev) => [...prev, ...articlesWithComments]);
        setPage(currentPage);
      } else {
        setArticles(articlesWithComments);
        setPage(1);
      }
    } catch (error) {
      console.error("Error fetching articles:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  const hasMoreArticles = articles.length < totalCount;
  const showLoadMore = totalCount > ARTICLES_PER_PAGE && hasMoreArticles;

  return (
    <ParallaxMouse className="container mx-auto px-4 py-8">
      {/* Page Title */}
      <div className="text-center mb-16 pt-24">
        <h1 className="text-5xl md:text-6xl font-heading uppercase tracking-wider mb-4">
          News & Articles
        </h1>
        <div className="w-24 h-px bg-[var(--color-main-1)] mx-auto" />
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="nk-blog-list space-y-16 max-w-6xl mx-auto">
          {[0, 1, 2].map((i) => (
            <ArticleSkeleton key={i} index={i} />
          ))}
        </div>
      ) : articles.length === 0 ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 max-w-lg mx-auto"
        >
          <div className="text-6xl mb-6">📰</div>
          <h2 className="text-2xl font-heading mb-4">No Articles Yet</h2>
          <p className="text-white/60">
            Check back soon for the latest news, reviews, and updates from Darkpoint.
          </p>
        </motion.div>
      ) : (
        /* News Grid */
        <div className="nk-blog-list space-y-16 max-w-6xl mx-auto">
          {articles.map((article, index) => (
            <motion.article
              key={article.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="nk-blog-post"
              data-mouse-parallax-z="5"
              data-mouse-parallax-speed="1"
            >
              <div
                className={`flex flex-col ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                } gap-8 items-center`}
              >
                {/* Thumbnail with parallax */}
                <div className="nk-post-thumb relative w-full md:w-1/2 aspect-[4/3] overflow-hidden group">
                  {/* Type Icon */}
                  <div className="nk-post-type absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm p-2 rounded">
                    {typeIcons[article.type] || typeIcons.image}
                  </div>

                  {/* Category Badge */}
                  <div className="nk-post-category absolute top-4 right-4 z-10">
                    <span className="bg-[var(--color-main-1)] text-white text-xs font-heading uppercase tracking-wider px-3 py-1">
                      {article.category}
                    </span>
                  </div>

                  {/* Image */}
                  <Link href={`/news/${article.slug}`}>
                    <div className="nk-img-stretch w-full h-full bg-gradient-to-br from-[var(--color-dark-2)] to-[var(--color-dark-3)] flex items-center justify-center transition-transform duration-500 group-hover:scale-105 overflow-hidden">
                      {article.image_url ? (
                        <Image
                          src={article.image_url}
                          alt={article.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="text-6xl opacity-20">📰</div>
                      )}
                    </div>
                  </Link>
                </div>

                {/* Content with parallax on title */}
                <div className="nk-post-content w-full md:w-1/2 space-y-4">
                  <div data-mouse-parallax-z="2" data-mouse-parallax-speed="0.8">
                    <Link href={`/news/${article.slug}`}>
                      <h2 className="nk-post-title text-3xl md:text-4xl font-heading leading-tight hover:text-[var(--color-main-1)] transition-colors">
                        {article.title}
                      </h2>
                    </Link>

                    <p className="nk-post-date text-gray-400 text-lg mt-2">
                      {formatDate(article.published_at)}
                    </p>
                  </div>

                  <p className="text-gray-300 leading-relaxed">{article.excerpt}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      {article.views.toLocaleString()} views
                    </span>
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      {article.comment_count || 0} comments
                    </span>
                  </div>

                  <Link
                    href={`/news/${article.slug}`}
                    className="inline-flex items-center gap-2 text-[var(--color-main-1)] font-heading uppercase tracking-wider text-sm hover:gap-4 transition-all"
                  >
                    Read More
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
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      {/* Load More - Only show if more than 6 articles total */}
      {showLoadMore && (
        <div className="nk-pagination nk-pagination-center text-center mt-16">
          <button
            onClick={() => fetchArticles(true)}
            disabled={isLoadingMore}
            className="nk-btn nk-btn-lg nk-btn-circle px-8 py-4 border border-white/30 text-white font-heading uppercase tracking-wider hover:border-[var(--color-main-1)] hover:text-[var(--color-main-1)] transition-colors rounded-full disabled:opacity-50"
          >
            {isLoadingMore ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </span>
            ) : (
              "Load More ..."
            )}
          </button>
        </div>
      )}

      {/* Spacer */}
      <div className="nk-gap-4 h-20" />
      <div className="nk-gap-3 h-16" />
    </ParallaxMouse>
  );
}

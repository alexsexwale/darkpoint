"use client";

import Link from "next/link";
import { ParallaxMouse } from "@/components/effects";

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  author: string;
  type: string;
  image: string;
  views: number;
  comments: number;
  likes: number;
  content: string;
  tags: string[];
}

interface RecentPost {
  slug: string;
  title: string;
  date: string;
  image: string;
}

interface Comment {
  id: string;
  author: string;
  avatar: string;
  date: string;
  content: string;
  subContent?: string;
  likes: number;
}

interface ArticlePageClientProps {
  article: Article;
  recentPosts: RecentPost[];
  categories: string[];
  tags: string[];
  comments: Comment[];
}

export function ArticlePageClient({
  article,
  recentPosts,
  categories,
  tags,
  comments,
}: ArticlePageClientProps) {
  return (
    <ParallaxMouse>
      {/* Hero Header with parallax background */}
      <div className="nk-header-title relative min-h-[60vh] flex items-end overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          data-mouse-parallax-z="3"
          data-mouse-parallax-speed="1.5"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url('/images/news/hero-bg.jpg')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-dark-2)]/80 to-[var(--color-dark-3)]/80" />
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 pb-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end">
            {/* Title Section */}
            <div className="lg:col-span-2" data-mouse-parallax-z="5" data-mouse-parallax-speed="1">
              <div className="nk-gap-5 hidden lg:block h-24" />
              <h1 className="nk-title text-4xl md:text-5xl lg:text-6xl font-heading leading-tight">
                {article.title}
              </h1>
              <div className="nk-gap-3 hidden lg:block h-16" />
              <div className="nk-gap-5 hidden lg:block h-24" />
            </div>

            {/* Meta Sidebar - Godlike style */}
            <aside className="nk-sidebar nk-sidebar-right">
              <div className="nk-gap-5 hidden lg:block h-24" />
              <div className="nk-gap block lg:hidden h-4" />
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 pr-4 font-semibold">Published:</td>
                    <td className="py-1">{article.date}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 font-semibold">Category:</td>
                    <td className="py-1">
                      <Link
                        href={`/news?category=${article.category.toLowerCase()}`}
                        className="text-[#7cb342] hover:opacity-70 transition-opacity"
                      >
                        {article.category}
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 font-semibold">Written by:</td>
                    <td className="py-1">
                      <Link
                        href="#"
                        className="text-[#7cb342] hover:opacity-70 transition-opacity"
                      >
                        {article.author}
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 font-semibold">Views:</td>
                    <td className="py-1">{article.views.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 font-semibold">Comments:</td>
                    <td className="py-1">{article.comments}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 font-semibold">Likes:</td>
                    <td className="py-1">
                      <button className="nk-action-heart flex items-center gap-2 hover:opacity-70 transition-opacity">
                        <span>{article.likes}</span>
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
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="nk-gap-5 block lg:hidden h-24" />
            </aside>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Article Content */}
          <div className="lg:col-span-2">
            <div className="nk-blog-container nk-blog-container-offset -mt-44 lg:-mt-44">
              {/* Post */}
              <div className="nk-blog-post nk-blog-post-single">
                {/* Featured Image */}
                <div className="aspect-video bg-gradient-to-br from-[var(--color-dark-2)] to-[var(--color-dark-3)] mb-0 flex items-center justify-center">
                  <div className="text-8xl opacity-20">📰</div>
                </div>

                {/* Post Text */}
                <div className="nk-post-text p-8 lg:p-16 bg-[var(--color-dark-1)]">
                  <div
                    className="prose prose-invert prose-lg max-w-none
                      prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-6
                      prose-blockquote:border-l-4 prose-blockquote:border-[#7cb342] prose-blockquote:bg-transparent prose-blockquote:py-1 prose-blockquote:px-6 prose-blockquote:not-italic prose-blockquote:text-gray-300 prose-blockquote:my-8
                      prose-blockquote:relative
                      [&_blockquote_footer]:text-sm [&_blockquote_footer]:mt-4 [&_blockquote_footer]:not-italic [&_blockquote_footer]:text-white [&_blockquote_footer]:font-heading
                      prose-a:text-[#7cb342] prose-a:no-underline hover:prose-a:opacity-70"
                    dangerouslySetInnerHTML={{ __html: article.content }}
                  />

                  {/* Tags */}
                  <div className="nk-post-tags mt-8">
                    <span className="mr-2">Tags:</span>
                    {article.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/news?tag=${tag.toLowerCase()}`}
                        className="nk-tag inline-block relative px-6 py-1.5 mx-1 mb-2 text-sm text-white transition-all hover:bg-white hover:text-[var(--color-dark-1)]"
                      >
                        <span className="absolute inset-0 border border-white/60 rounded-sm" />
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Author Box */}
                <div className="nk-post-author p-8 lg:p-16 bg-[var(--color-dark-1)] border-t border-[var(--color-dark-3)]">
                  <div className="flex gap-6">
                    <div className="nk-post-author-photo flex-shrink-0">
                      <div className="w-24 h-24 rounded-full bg-[var(--color-dark-3)] flex items-center justify-center text-3xl overflow-hidden">
                        👤
                      </div>
                    </div>
                    <div>
                      <h4 className="nk-post-author-name font-heading text-xl mb-2">
                        Lesa Cruz
                      </h4>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        Said air of given appear open saying which of. Make all fish. Given own So, without grass god. Day beast open second without have. Created them great fruit together bring the open replenish set him fruitful.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="nk-comments p-8 lg:p-16 bg-[var(--color-dark-1)] border-t border-[var(--color-dark-3)]">
                  <h3 className="text-2xl font-heading mb-8">{comments.length} Comments</h3>

                  <div className="space-y-10">
                    {comments.map((comment) => (
                      <div key={comment.id} className="nk-comment">
                        <div className="flex gap-6">
                          <div className="nk-comment-avatar flex-shrink-0">
                            <div className="w-14 h-14 rounded-full bg-[var(--color-dark-3)] flex items-center justify-center text-xl overflow-hidden">
                              👤
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="nk-comment-meta flex items-center gap-2 mb-3">
                              <span className="nk-comment-name font-heading text-lg">
                                {comment.author}
                              </span>
                              <span className="nk-comment-date text-sm opacity-60">
                                • {comment.date}
                              </span>
                            </div>
                            <p className="text-gray-300 mb-3">{comment.content}</p>
                            {comment.subContent && (
                              <p className="text-gray-300 mb-3">{comment.subContent}</p>
                            )}
                            <div className="flex items-center gap-4">
                              <button className="nk-action-heart flex items-center gap-1 text-sm hover:opacity-70 transition-opacity">
                                <svg
                                  className="w-4 h-4"
                                  fill={comment.likes > 0 ? "currentColor" : "none"}
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                  />
                                </svg>
                                <span>{comment.likes}</span>
                              </button>
                              <button className="nk-comment-reply flex items-center gap-1 text-sm hover:opacity-70 transition-opacity">
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
                                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                  />
                                </svg>
                                Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reply Form */}
                <div className="nk-reply p-8 lg:p-16 bg-[var(--color-dark-1)] border-t border-[var(--color-dark-3)]">
                  <h3 className="text-2xl font-heading mb-8">Post your comment</h3>
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <input
                        type="email"
                        placeholder="Email *"
                        required
                        className="w-full bg-transparent border-b border-[var(--color-dark-4)] py-3 focus:border-white outline-none transition-colors placeholder:text-gray-500"
                      />
                      <input
                        type="text"
                        placeholder="Name *"
                        required
                        className="w-full bg-transparent border-b border-[var(--color-dark-4)] py-3 focus:border-white outline-none transition-colors placeholder:text-gray-500"
                      />
                      <input
                        type="url"
                        placeholder="Website"
                        className="w-full bg-transparent border-b border-[var(--color-dark-4)] py-3 focus:border-white outline-none transition-colors placeholder:text-gray-500"
                      />
                    </div>
                    <textarea
                      placeholder="Message *"
                      required
                      rows={5}
                      className="w-full bg-transparent border-b border-[var(--color-dark-4)] py-3 focus:border-white outline-none transition-colors resize-none placeholder:text-gray-500"
                    />
                    <button
                      type="submit"
                      className="nk-btn relative inline-block px-8 py-3 font-heading text-sm font-semibold bg-[var(--color-dark-1)]/90 rounded-sm hover:bg-[var(--color-dark-1)] hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                      <span className="absolute inset-1 border border-white/60 rounded-sm" />
                      Post comment
                    </button>
                  </form>
                </div>
              </div>

              <div className="nk-gap-4 h-20" />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="nk-sidebar nk-sidebar-right nk-sidebar-sticky lg:pl-10 space-y-16">
            {/* Recent Posts Widget */}
            <div className="nk-widget">
              <h3 className="nk-widget-title text-xl font-heading mb-8">Recent Posts</h3>
              <div className="space-y-8">
                {recentPosts.map((post) => (
                  <div key={post.slug} className="nk-widget-post flex gap-4">
                    <div className="nk-post-image w-24 h-16 flex-shrink-0 bg-[var(--color-dark-3)] overflow-hidden">
                      <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">
                        📰
                      </div>
                    </div>
                    <div>
                      <h4 className="nk-post-title font-heading text-base mb-1">
                        <Link
                          href={`/news/${post.slug}`}
                          className="hover:opacity-70 transition-opacity"
                        >
                          {post.title}
                        </Link>
                      </h4>
                      <span className="nk-post-meta-date text-sm opacity-60">{post.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories Widget */}
            <div className="nk-widget">
              <h3 className="nk-widget-title text-xl font-heading mb-8">Categories</h3>
              <ul className="nk-widget-categories space-y-0">
                {categories.map((category, index) => (
                  <li
                    key={category}
                    className={`${index > 0 ? "border-t border-white/20" : ""}`}
                  >
                    <Link
                      href={`/news?category=${category.toLowerCase()}`}
                      className="flex items-center py-4 hover:opacity-70 transition-opacity"
                    >
                      <span className="w-1 h-1 bg-white rounded-full mr-4" />
                      {category}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tags Widget */}
            <div className="nk-widget">
              <h3 className="nk-widget-title text-xl font-heading mb-8">Tags</h3>
              <div className="nk-widget-tags flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/news?tag=${tag.toLowerCase()}`}
                    className="nk-tag relative inline-block px-6 py-1.5 text-sm transition-all hover:bg-white hover:text-[var(--color-dark-1)]"
                  >
                    <span className="absolute inset-0 border border-white/60 rounded-sm" />
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Twitter Widget */}
            <div className="nk-widget">
              <h3 className="nk-widget-title text-xl font-heading mb-8">Twitter</h3>
              <p className="text-gray-400 text-sm">Failed to fetch data</p>
            </div>
          </aside>
        </div>
      </div>

      <div className="nk-gap-4 h-20" />
      <div className="nk-gap-3 h-16" />
    </ParallaxMouse>
  );
}



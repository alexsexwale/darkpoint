import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ArticlePageClient } from "./ArticlePageClient";

// Create a server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const { slug } = await params;
  const supabase = getSupabase();
  
  if (!supabase) {
    return { title: "Article | Dark Point" };
  }

  const { data: article } = await supabase
    .from("news_articles")
    .select("title, excerpt")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!article) {
    return { title: "Article Not Found | Dark Point" };
  }

  return {
    title: `${article.title} | Dark Point`,
    description: article.excerpt,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const supabase = getSupabase();
  
  if (!supabase) {
    notFound();
  }

  // Fetch the article
  const { data: article, error } = await supabase
    .from("news_articles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !article) {
    notFound();
  }

  // Increment view count (fire and forget)
  (async () => {
    try {
      await supabase.rpc("increment_article_views", { p_article_id: article.id });
    } catch {
      // Ignore errors
    }
  })();

  // Fetch comments for this article
  const { data: commentsData } = await supabase
    .from("article_comments")
    .select("*")
    .eq("article_id", article.id)
    .eq("is_approved", true)
    .order("created_at", { ascending: true });

  // Fetch recent posts for sidebar
  const { data: recentPostsData } = await supabase
    .from("news_articles")
    .select("slug, title, published_at, image_url")
    .eq("is_published", true)
    .neq("slug", slug)
    .order("published_at", { ascending: false })
    .limit(3);

  // Fetch all categories for sidebar
  const { data: categoriesData } = await supabase
    .from("news_articles")
    .select("category")
    .eq("is_published", true);

  const uniqueCategories = [...new Set((categoriesData || []).map((c) => c.category))];

  // Fetch all tags from articles
  const { data: tagsData } = await supabase
    .from("news_articles")
    .select("tags")
    .eq("is_published", true);

  const allTags = (tagsData || []).flatMap((t) => t.tags || []);
  const uniqueTags = [...new Set(allTags)].slice(0, 10);

  // Format article for client
  const formattedArticle = {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    date: new Date(article.published_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    category: article.category,
    author: article.author,
    type: article.type,
    image: article.image_url || "",
    views: article.views,
    comments: (commentsData || []).length,
    likes: article.likes,
    content: article.content,
    tags: article.tags || [],
  };

  // Format recent posts
  const recentPosts = (recentPostsData || []).map((post) => ({
    slug: post.slug,
    title: post.title,
    date: new Date(post.published_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    image: post.image_url || "",
  }));

  // Format comments
  const comments = (commentsData || []).map((comment) => ({
    id: comment.id,
    author: comment.author_name,
    avatar: "/images/avatars/default.jpg",
    date: new Date(comment.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    content: comment.content,
    likes: comment.likes,
  }));

  return (
    <ArticlePageClient
      article={formattedArticle}
      recentPosts={recentPosts}
      categories={uniqueCategories}
      tags={uniqueTags}
      comments={comments}
    />
  );
}

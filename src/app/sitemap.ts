import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

// Create a server-side Supabase client for sitemap generation
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSupabase();

  // Static pages with their priorities and change frequencies
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/store`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/news`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/games`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/shipping`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/returns`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/community-guidelines`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Dynamic product pages from Supabase
  let productPages: MetadataRoute.Sitemap = [];
  if (supabase) {
    try {
      const { data: products } = await supabase
        .from("admin_products")
        .select("slug, updated_at")
        .eq("is_active", true)
        .not("slug", "is", null);

      if (products) {
        productPages = products.map((product) => ({
          url: `${BASE_URL}/product/${product.slug}`,
          lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }));
      }
    } catch (error) {
      console.error("Error fetching products for sitemap:", error);
    }
  }

  // Dynamic news article pages from Supabase
  let newsPages: MetadataRoute.Sitemap = [];
  if (supabase) {
    try {
      const { data: articles } = await supabase
        .from("news_articles")
        .select("slug, updated_at, published_at")
        .eq("is_published", true);

      if (articles) {
        newsPages = articles.map((article) => ({
          url: `${BASE_URL}/news/${article.slug}`,
          lastModified: article.updated_at
            ? new Date(article.updated_at)
            : article.published_at
              ? new Date(article.published_at)
              : new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }));
      }
    } catch (error) {
      console.error("Error fetching news articles for sitemap:", error);
    }
  }

  // Category pages
  const categories = ["gaming", "hardware", "audio", "merchandise", "gadgets", "peripherals"];
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${BASE_URL}/store?category=${category}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...productPages, ...newsPages];
}


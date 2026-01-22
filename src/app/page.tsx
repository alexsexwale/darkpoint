import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import { HomePageClient } from "./HomePageClient";
import { ProductGridSkeleton } from "@/components/ui";
import type { Product } from "@/types";

// Revalidate homepage data every 60 seconds to pick up featured product changes
export const revalidate = 60;

// Create a server-side Supabase client for SSR
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Transform Supabase product data to our Product type
function transformProduct(dbProduct: {
  id: string;
  cj_product_id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  sell_price: number;
  compare_at_price: number | null;
  category: string | null;
  tags: string[] | null;
  images: unknown;
  is_featured: boolean;
  slug: string | null;
}): Product {
  const images = (dbProduct.images as Array<{ src: string; alt?: string }>) || [];
  
  return {
    id: dbProduct.cj_product_id,
    slug: dbProduct.slug || `${dbProduct.name.toLowerCase().replace(/\s+/g, '-')}-${dbProduct.cj_product_id}`,
    name: dbProduct.name,
    description: dbProduct.description || "",
    shortDescription: dbProduct.short_description || "",
    price: dbProduct.sell_price,
    compareAtPrice: dbProduct.compare_at_price || undefined,
    category: dbProduct.category || "uncategorized",
    tags: dbProduct.tags || [],
    images: images.length > 0 
      ? images.map((img, idx) => ({ id: `${dbProduct.id}-${idx}`, src: img.src, alt: img.alt || dbProduct.name }))
      : [{ id: `${dbProduct.id}-0`, src: "/images/placeholder.png", alt: dbProduct.name }],
    rating: 4.5,
    reviewCount: 0,
    inStock: true,
    featured: dbProduct.is_featured,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Server-side data fetching for SEO
async function getInitialProducts(): Promise<{
  featuredProducts: Product[];
  latestProducts: Product[];
}> {
  const supabase = getSupabase();
  
  if (!supabase) {
    return { featuredProducts: [], latestProducts: [] };
  }

  try {
    // Fetch featured products - get enough for the carousel
    const { data: featuredData } = await supabase
      .from("admin_products")
      .select("id, cj_product_id, name, description, short_description, sell_price, compare_at_price, category, tags, images, is_featured, slug")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("updated_at", { ascending: false })
      .limit(12);

    // Fetch latest products
    const { data: latestData } = await supabase
      .from("admin_products")
      .select("id, cj_product_id, name, description, short_description, sell_price, compare_at_price, category, tags, images, is_featured, slug")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(12);

    return {
      featuredProducts: (featuredData || []).map(transformProduct),
      latestProducts: (latestData || []).map(transformProduct),
    };
  } catch (error) {
    console.error("Error fetching products for homepage:", error);
    return { featuredProducts: [], latestProducts: [] };
  }
}

export default async function HomePage() {
  // Fetch products server-side for SEO
  const { featuredProducts, latestProducts } = await getInitialProducts();

  return (
    <Suspense fallback={<ProductGridSkeleton count={6} columns={3} />}>
      <HomePageClient 
        initialFeaturedProducts={featuredProducts}
        initialLatestProducts={latestProducts}
      />
    </Suspense>
  );
}

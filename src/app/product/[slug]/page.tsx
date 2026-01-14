import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { ProductPageClient } from "./ProductPageClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

// Create a server-side Supabase client
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// Extract product ID from slug (format: product-name-productId)
function extractProductId(slug: string): string {
  const parts = slug.split("-");
  return parts[parts.length - 1];
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSupabase();
  
  // Try to fetch product from Supabase first for accurate metadata
  if (supabase) {
    try {
      // Try by slug first
      let { data: product } = await supabase
        .from("admin_products")
        .select("name, description, short_description, images, sell_price, category")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
      
      // If not found by slug, try by CJ product ID
      if (!product) {
        const productId = extractProductId(slug);
        const { data: productById } = await supabase
          .from("admin_products")
          .select("name, description, short_description, images, sell_price, category")
          .eq("cj_product_id", productId)
          .eq("is_active", true)
          .single();
        product = productById;
      }
      
      if (product) {
        const images = product.images as Array<{ src: string; alt?: string }> | null;
        const firstImage = images?.[0]?.src;
        
        return {
          title: product.name,
          description: product.short_description || product.description?.slice(0, 160) || `Shop ${product.name} at Darkpoint`,
          openGraph: {
            title: product.name,
            description: product.short_description || product.description?.slice(0, 160) || `Shop ${product.name} at Darkpoint`,
            url: `${BASE_URL}/product/${slug}`,
            type: "website",
            images: firstImage ? [
              {
                url: firstImage,
                width: 800,
                height: 800,
                alt: product.name,
              },
            ] : undefined,
          },
          twitter: {
            card: "summary_large_image",
            title: product.name,
            description: product.short_description || product.description?.slice(0, 160) || `Shop ${product.name} at Darkpoint`,
            images: firstImage ? [firstImage] : undefined,
          },
          alternates: {
            canonical: `${BASE_URL}/product/${slug}`,
          },
        };
      }
    } catch {
      // Fall through to slug-based metadata
    }
  }
  
  // Fallback: Extract a readable name from the slug
  const productName = slug
    .split("-")
    .slice(0, -1) // Remove the ID part
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    title: productName || "Product",
    description: `Check out ${productName} at Darkpoint - Your destination for elite gaming gear and tech.`,
    alternates: {
      canonical: `${BASE_URL}/product/${slug}`,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  return <ProductPageClient slug={slug} />;
}

import { Metadata } from "next";
import { StorePageClient } from "./StorePageClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export const metadata: Metadata = {
  title: "Store",
  description: "Browse our collection of gaming gear, tech gadgets, hardware, and merchandise. Find everything you need to level up your setup.",
  openGraph: {
    title: "Store | Darkpoint",
    description: "Browse our collection of gaming gear, tech gadgets, hardware, and merchandise.",
    url: `${BASE_URL}/store`,
  },
  alternates: {
    canonical: `${BASE_URL}/store`,
  },
};

interface StorePageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    featured?: string;
    onSale?: string;
    sort?: string;
    view?: string;
  }>;
}

export default async function StorePage({ searchParams }: StorePageProps) {
  const params = await searchParams;
  
  // Parse filter params
  const minPrice = params.minPrice ? parseFloat(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? parseFloat(params.maxPrice) : undefined;
  const inStockOnly = params.inStock === "true";
  const featuredOnly = params.featured === "true";
  
  return (
    <StorePageClient
      currentCategory={params.category}
      currentSearch={params.search}
      currentMinPrice={minPrice}
      currentMaxPrice={maxPrice}
      currentInStock={inStockOnly}
      currentFeatured={featuredOnly}
      currentOnSale={params.onSale === "true"}
      currentSort={params.sort || "featured"}
      currentView={(params.view as "grid" | "list") || "grid"}
    />
  );
}

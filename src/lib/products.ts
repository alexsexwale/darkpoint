// This file provides client-side functions for working with products.
// For server-side usage, use the API routes directly.

import type { Product } from "@/types";

// Fallback products for when API is unavailable (minimal set for testing)
export const fallbackProducts: Product[] = [];

// Client-side product fetching functions
export async function fetchProducts(params: {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  sortBy?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ products: Product[]; pagination: { page: number; limit: number; total: number; totalPages: number } | null }> {
  try {
    const searchParams = new URLSearchParams();
    
    if (params.category && params.category !== "all") {
      searchParams.set("category", params.category);
    }
    if (params.search) {
      searchParams.set("keywords", params.search);
    }
    if (params.minPrice !== undefined) {
      searchParams.set("minPrice", String(params.minPrice));
    }
    if (params.maxPrice !== undefined) {
      searchParams.set("maxPrice", String(params.maxPrice));
    }
    if (params.inStock) {
      searchParams.set("inStock", "true");
    }
    if (params.featured) {
      searchParams.set("featured", "true");
    }
    if (params.sortBy) {
      searchParams.set("sortBy", params.sortBy);
    }
    if (params.page) {
      searchParams.set("page", String(params.page));
    }
    if (params.limit) {
      searchParams.set("limit", String(params.limit));
    }

    const response = await fetch(`/api/products?${searchParams.toString()}`);
    const data = await response.json();

    if (data.success) {
      return {
        products: data.data || [],
        pagination: data.pagination || null,
      };
    }
    
    return { products: fallbackProducts, pagination: null };
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return { products: fallbackProducts, pagination: null };
  }
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  try {
    // Extract product ID from slug (format: product-name-productId)
    const parts = slug.split("-");
    const productId = parts[parts.length - 1];
    
    const response = await fetch(`/api/products/${productId}`);
    const data = await response.json();

    if (data.success && data.data) {
      return data.data;
    }
    
    return null;
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return null;
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  try {
    if (!query || query.length < 2) {
      return [];
    }

    const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (data.products) {
      return data.products;
    }
    
    return [];
  } catch (error) {
    console.error("Failed to search products:", error);
    return [];
  }
}

// Legacy functions for backward compatibility (these won't work without API)
// These are kept for any components that might still reference them
export function getProducts(filters?: {
  category?: string;
  search?: string;
  inStock?: boolean;
  featured?: boolean;
}): Product[] {
  console.warn("getProducts() is deprecated. Use useProducts hook or fetchProducts() instead.");
  return fallbackProducts.filter((p) => {
    if (filters?.category && filters.category !== "all" && p.category !== filters.category) {
      return false;
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      if (!p.name.toLowerCase().includes(search) && 
          !p.description.toLowerCase().includes(search) &&
          !p.tags.some(t => t.toLowerCase().includes(search))) {
        return false;
      }
    }
    if (filters?.inStock !== undefined && p.inStock !== filters.inStock) {
      return false;
    }
    if (filters?.featured && !p.featured) {
      return false;
    }
    return true;
  });
}

export function getProductBySlug(slug: string): Product | undefined {
  console.warn("getProductBySlug() is deprecated. Use useProduct hook or fetchProductBySlug() instead.");
  return fallbackProducts.find((p) => p.slug === slug);
}

export function getRelatedProducts(productId: string, limit = 4): Product[] {
  console.warn("getRelatedProducts() is deprecated. Fetch related products via API.");
  const product = fallbackProducts.find((p) => p.id === productId);
  if (!product) return [];
  
  return fallbackProducts
    .filter((p) => p.id !== productId && p.category === product.category)
    .slice(0, limit);
}

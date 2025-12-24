"use client";

import { useState, useEffect, useCallback } from "react";
import type { Product } from "@/types";

interface UseProductsParams {
  category?: string;
  keywords?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  sortBy?: string;
  page?: number;
  limit?: number;
}

interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  refetch: () => void;
}

export function useProducts(params: UseProductsParams = {}): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseProductsResult["pagination"]>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      
      if (params.category && params.category !== "all") {
        searchParams.set("category", params.category);
      }
      if (params.keywords) {
        searchParams.set("keywords", params.keywords);
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
        setProducts(data.data || []);
        setPagination(data.pagination || null);
      } else {
        setError(data.error || "Failed to fetch products");
        setProducts([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [
    params.category,
    params.keywords,
    params.minPrice,
    params.maxPrice,
    params.inStock,
    params.featured,
    params.sortBy,
    params.page,
    params.limit,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, pagination, refetch: fetchProducts };
}

interface UseProductResult {
  product: Product | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProduct(productId: string): UseProductResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async (retryCount = 0): Promise<void> => {
    if (!productId) {
      setError("Product ID is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${productId}`);
      const data = await response.json();

      if (data.success) {
        setProduct(data.data);
        setLoading(false);
      } else {
        // Check for rate limit error and retry
        const errorMsg = (data.error || "").toLowerCase();
        if ((response.status === 429 || errorMsg.includes("rate") || errorMsg.includes("too many") || errorMsg.includes("qps")) && retryCount < 3) {
          console.log(`Rate limited, retrying in ${1500 * (retryCount + 1)}ms... (attempt ${retryCount + 1}/3)`);
          await new Promise((resolve) => setTimeout(resolve, 1500 * (retryCount + 1)));
          return fetchProduct(retryCount + 1);
        }
        
        setError(data.error || "Product not found");
        setProduct(null);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch product");
      setProduct(null);
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  return { product, loading, error, refetch: () => fetchProduct() };
}

interface UseSearchResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  total: number;
  search: (query: string) => void;
}

export function useProductSearch(): UseSearchResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setProducts([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.products) {
        setProducts(data.products);
        setTotal(data.total || 0);
      } else {
        setError(data.error || "Search failed");
        setProducts([]);
        setTotal(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  return { products, loading, error, total, search };
}


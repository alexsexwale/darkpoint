import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Product } from '@/types';

// Create a server-side Supabase client
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
  created_at: string;
  updated_at: string;
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
    createdAt: dbProduct.created_at,
    updatedAt: dbProduct.updated_at,
  };
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  
  if (!supabase) {
    return NextResponse.json({
      products: [],
      total: 0,
      error: 'Database not configured.',
    }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '20');
  const page = parseInt(searchParams.get('page') || '1');

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ 
      products: [], 
      total: 0, 
      message: 'Query must be at least 2 characters long' 
    });
  }

  try {
    const searchQuery = query.trim();
    const offset = (page - 1) * limit;

    // Search in name, description, and category
    const { data, error } = await supabase
      .from('admin_products')
      .select('id, cj_product_id, name, description, short_description, sell_price, compare_at_price, category, tags, images, is_featured, slug, created_at, updated_at')
      .eq('is_active', true)
      .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Search query error:', error);
      return NextResponse.json({
        products: [],
        total: 0,
        error: 'Search failed',
      }, { status: 500 });
    }

    const transformed = (data || []).map(transformProduct);
    
    // Calculate relevance score for better sorting
    const scoredProducts = transformed.map((product) => {
      let score = 0;
      const queryLower = searchQuery.toLowerCase();
      const nameLower = product.name.toLowerCase();
      
      // Exact match gets highest score
      if (nameLower === queryLower) score += 100;
      // Starts with query gets high score
      else if (nameLower.startsWith(queryLower)) score += 50;
      // Contains query gets medium score
      else if (nameLower.includes(queryLower)) score += 25;
      
      // Category match bonus
      if (product.category.toLowerCase().includes(queryLower)) score += 10;
      
      // Tag match bonus
      if (product.tags.some(tag => tag.toLowerCase().includes(queryLower))) score += 5;
      
      // Stock availability bonus
      if (product.inStock) score += 5;

      // Featured bonus
      if (product.featured) score += 3;
      
      return { ...product, _score: score };
    });

    // Sort by relevance score
    scoredProducts.sort((a, b) => b._score - a._score);

    // Remove score from final results
    const finalProducts = scoredProducts.map(({ _score, ...product }) => product);

    return NextResponse.json({
      products: finalProducts,
      total: finalProducts.length,
      page,
      limit,
      query: searchQuery,
    });

  } catch (error) {
    console.error('Search API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ 
      products: [], 
      total: 0, 
      error: `Search service error: ${errorMessage}`,
    }, { status: 500 });
  }
}


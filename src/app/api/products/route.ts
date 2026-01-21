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
  is_active: boolean;
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
      success: false,
      error: 'Database not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.',
      data: [],
      configRequired: true,
    }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const keywords = searchParams.get('keywords');
    const sortBy = searchParams.get('sortBy');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const featured = searchParams.get('featured');
    const inStock = searchParams.get('inStock');

    // Build the query
    let query = supabase
      .from('admin_products')
      .select('id, cj_product_id, name, description, short_description, sell_price, compare_at_price, category, tags, images, is_featured, is_active, slug, created_at, updated_at', { count: 'exact' })
      .eq('is_active', true);

    // Apply category filter
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Apply keywords search
    if (keywords) {
      query = query.or(`name.ilike.%${keywords}%,description.ilike.%${keywords}%`);
    }

    // Apply price filters
    if (minPrice) {
      query = query.gte('sell_price', parseFloat(minPrice));
    }
    if (maxPrice) {
      query = query.lte('sell_price', parseFloat(maxPrice));
    }

    // Apply featured filter
    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    // Apply sorting
    switch (sortBy) {
      case 'price-asc':
        query = query.order('sell_price', { ascending: true });
        break;
      case 'price-desc':
        query = query.order('sell_price', { ascending: false });
        break;
      case 'name-asc':
        query = query.order('name', { ascending: true });
        break;
      case 'name-desc':
        query = query.order('name', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'featured':
      default:
        query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
        break;
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        data: [],
      }, { status: 500 });
    }

    const products = (data || []).map(transformProduct);
    const total = count || 0;

    // Filter by inStock on the transformed data (since inStock is derived)
    let filteredProducts = products;
    if (inStock === 'true') {
      filteredProducts = products.filter((p) => p.inStock);
    }

    return NextResponse.json({
      success: true,
      data: filteredProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Products API error:', error);
    const message = (error as Error)?.message || 'Internal server error';
    return NextResponse.json(
      {
        success: false,
        error: message,
        data: [],
      },
      { status: 500 }
    );
  }
}


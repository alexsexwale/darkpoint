import { NextResponse } from 'next/server';
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
  variants: unknown;
  variant_group_name?: string | null;
  variant_dimension_names?: Record<string, string> | null;
}): Product {
  const images = (dbProduct.images as Array<{ src: string; alt?: string }>) || [];
  const allVariants = (dbProduct.variants as Array<{
    id: string;
    name: string;
    value?: string;
    displayName?: string;
    price: number;
    sku?: string;
    image?: string;
    stock?: number;
    inStock?: boolean;
    isHidden?: boolean;
    priceUSD?: number;
    costZAR?: number;
    attributes?: Record<string, string>;
  }>) || [];
  
  // Filter out hidden variants
  const variants = allVariants.filter(v => !v.isHidden);
  
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
    variantGroupName: dbProduct.variant_group_name || undefined,
    variantDimensionNames: dbProduct.variant_dimension_names || undefined,
    variants: variants.length > 0 ? variants.map((v, idx) => ({
      id: v.id || `${dbProduct.id}-variant-${idx}`,
      name: v.name,
      value: v.value,
      displayName: v.displayName,
      price: v.price,
      sku: v.sku,
      image: v.image,
      stock: v.stock,
      inStock: true, // Always in stock - dropshipping fulfillment handles availability
      attributes: v.attributes || {},
    })) : undefined,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  
  if (!supabase) {
    return NextResponse.json({
      success: false,
      error: 'Database not configured.',
    }, { status: 503 });
  }

  try {
    const { id: productIdOrSlug } = await context.params;

    if (!productIdOrSlug) {
      return NextResponse.json({
        success: false,
        error: 'Product ID is required',
      }, { status: 400 });
    }

    // Base fields that always exist
    const baseFields = 'id, cj_product_id, name, description, short_description, sell_price, compare_at_price, category, tags, images, is_featured, is_active, slug, created_at, updated_at, variants, variant_group_name';
    
    // Try to find by CJ product ID first (this is what's passed from the product page)
    // First try with variant_dimension_names, fall back to without if column doesn't exist
    let { data: product, error } = await supabase
      .from('admin_products')
      .select(`${baseFields}, variant_dimension_names`)
      .eq('cj_product_id', productIdOrSlug)
      .eq('is_active', true)
      .single();

    // If error includes column not found, try without variant_dimension_names
    if (error && (error.message?.includes('variant_dimension_names') || error.code === '42703' || error.code === 'PGRST204')) {
      const { data: productFallback } = await supabase
        .from('admin_products')
        .select(baseFields)
        .eq('cj_product_id', productIdOrSlug)
        .eq('is_active', true)
        .single();
      product = productFallback;
    }

    // If not found by CJ ID, try by slug
    if (!product) {
      const { data: productBySlug, error: slugError } = await supabase
        .from('admin_products')
        .select(`${baseFields}, variant_dimension_names`)
        .eq('slug', productIdOrSlug)
        .eq('is_active', true)
        .single();
      
      if (slugError && (slugError.message?.includes('variant_dimension_names') || slugError.code === '42703' || slugError.code === 'PGRST204')) {
        const { data: productBySlugFallback } = await supabase
          .from('admin_products')
          .select(baseFields)
          .eq('slug', productIdOrSlug)
          .eq('is_active', true)
          .single();
        product = productBySlugFallback;
      } else {
        product = productBySlug;
      }
    }

    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Product not found',
      }, { status: 404 });
    }

    const transformedProduct = transformProduct(product);

    return NextResponse.json({
      success: true,
      data: transformedProduct,
    });

  } catch (error) {
    console.error('Product detail API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}


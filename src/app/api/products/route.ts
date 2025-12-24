import { NextRequest, NextResponse } from 'next/server';
import { cjDropshipping, transformCJProduct } from '@/lib/cjdropshipping';
import { env } from '@/config/env';

// Simple in-memory cache for product lists
const productListCache = new Map<string, { data: ReturnType<typeof transformCJProduct>[]; timestamp: number }>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes cache for list

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Search terms for each category that actually return results from CJ
const CATEGORY_SEARCH_TERMS: Record<string, string[]> = {
  all: ['gaming', 'headset', 'keyboard', 'mouse', 'controller', 'LED'],
  gaming: ['gaming', 'controller', 'gamepad', 'joystick', 'game console'],
  hardware: ['keyboard', 'mouse', 'webcam', 'USB hub', 'laptop stand'],
  accessories: ['phone case', 'cable', 'charger', 'stand', 'bag'],
  audio: ['headset', 'earphone', 'headphone', 'speaker', 'microphone'],
  merchandise: ['hoodie', 'tshirt', 'cap', 'mug', 'backpack'],
  gadgets: ['LED', 'ring light', 'smart', 'portable', 'mini'],
  wearables: ['smart watch', 'fitness band', 'bracelet', 'tracker'],
};

// Default gaming/tech focused search terms
const DEFAULT_SEARCH_TERMS = ['gaming', 'headset', 'RGB keyboard', 'mouse', 'controller'];

export async function GET(request: NextRequest) {
  // Check if CJ credentials are configured
  if (!env.cjDropshipping.email || !env.cjDropshipping.password) {
    return NextResponse.json({
      success: false,
      error: 'CJ Dropshipping credentials not configured. Please set CJ_DROPSHIPPING_EMAIL and CJ_DROPSHIPPING_PASSWORD in your .env.local file.',
      data: [],
      configRequired: true,
    }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    let limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const keywords = searchParams.get('keywords');
    const sortBy = searchParams.get('sortBy');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const featured = searchParams.get('featured');
    const inStock = searchParams.get('inStock');

    // CJ has a minimum pageSize of 10
    if (limit < 10) limit = 10;

    const toNumber = (value: unknown): number => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      const n = parseFloat(String(value ?? '0'));
      return Number.isFinite(n) ? n : 0;
    };

    const sortProducts = (list: ReturnType<typeof transformCJProduct>[], sortByParam: string | null): ReturnType<typeof transformCJProduct>[] => {
      const products = [...list];
      switch (sortByParam) {
        case 'price-asc':
          products.sort((a, b) => toNumber(a.price) - toNumber(b.price));
          break;
        case 'price-desc':
          products.sort((a, b) => toNumber(b.price) - toNumber(a.price));
          break;
        case 'name-asc':
          products.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
          break;
        case 'name-desc':
          products.sort((a, b) => String(b.name || '').localeCompare(String(a.name || '')));
          break;
        case 'rating':
          products.sort((a, b) => toNumber(b.rating) - toNumber(a.rating));
          break;
        case 'newest':
          products.sort((a, b) => {
            const aDate = new Date(a.createdAt || a.updatedAt || 0).getTime();
            const bDate = new Date(b.createdAt || b.updatedAt || 0).getTime();
            return bDate - aDate;
          });
          break;
        case 'featured':
        default:
          products.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
          break;
      }
      return products;
    };

    // Determine search terms to use
    let searchTerms: string[] = [];
    
    if (keywords) {
      // User provided specific search keywords
      searchTerms = [keywords];
    } else if (category && category !== 'all') {
      // Use category-specific search terms
      searchTerms = CATEGORY_SEARCH_TERMS[category] || [category];
    } else {
      // Default: fetch gaming/tech products
      searchTerms = DEFAULT_SEARCH_TERMS;
    }

    // Create cache key from search parameters
    const cacheKey = `${searchTerms.join(',')}-${page}-${limit}`;
    const cached = productListCache.get(cacheKey);
    
    let allProducts: ReturnType<typeof transformCJProduct>[] = [];
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Returning cached products for: ${cacheKey}`);
      allProducts = cached.data;
    } else {
      console.log(`Fetching from CJ API: searchTerms=${searchTerms.join(', ')}, page=${page}, limit=${limit}`);
      
      // Fetch products for each search term and combine results
      const seenIds = new Set<string>();
      
      // Calculate how many products to fetch per term to distribute evenly
      const productsPerTerm = Math.ceil(limit / searchTerms.length);
      
      for (let i = 0; i < searchTerms.length; i++) {
        const term = searchTerms[i];
        
        // Add delay between requests to avoid rate limiting
        if (i > 0) {
          await delay(1100);
        }
        
        try {
          const response = await cjDropshipping.getProducts({
            pageNum: page,
            pageSize: Math.max(productsPerTerm, 10), // CJ minimum is 10
            keywords: term,
          });
          
          if (response.success && response.data) {
            const transformed = response.data.map(transformCJProduct);
            for (const product of transformed) {
              // Deduplicate by product ID
              if (!seenIds.has(product.id)) {
                seenIds.add(product.id);
                allProducts.push(product);
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch products for term "${term}":`, error);
          // Continue with other terms
        }
        
        // Stop if we have enough products
        if (allProducts.length >= limit * 2) break;
      }
      
      // Cache the results
      productListCache.set(cacheKey, {
        data: allProducts,
        timestamp: Date.now(),
      });
      
      console.log(`CJ API combined response: ${allProducts.length} unique products`);
    }

    let transformedProducts = allProducts;

    // Apply category-based filtering (map products to our categories)
    if (category && category !== 'all') {
      transformedProducts = transformedProducts.filter((p) => {
        // Check if product matches the category based on name/tags
        const productText = `${p.name} ${p.tags.join(' ')}`.toLowerCase();
        const categoryKeywords: Record<string, string[]> = {
          gaming: ['gaming', 'game', 'controller', 'gamepad', 'joystick', 'console', 'rgb'],
          hardware: ['keyboard', 'mouse', 'monitor', 'webcam', 'laptop', 'computer', 'hub'],
          accessories: ['case', 'cable', 'charger', 'stand', 'holder', 'bag', 'mount'],
          audio: ['headset', 'headphone', 'earphone', 'speaker', 'microphone', 'audio'],
          merchandise: ['hoodie', 'shirt', 'cap', 'hat', 'mug', 'poster', 'backpack'],
          gadgets: ['led', 'light', 'smart', 'portable', 'mini', 'gadget', 'ring light'],
          wearables: ['watch', 'band', 'bracelet', 'fitness', 'tracker', 'wearable'],
        };
        
        const keywords = categoryKeywords[category] || [];
        return keywords.some(kw => productText.includes(kw));
      });
    }

    // Apply price filtering
    if (minPrice || maxPrice) {
      const min = minPrice ? parseFloat(minPrice) : Number.NEGATIVE_INFINITY;
      const max = maxPrice ? parseFloat(maxPrice) : Number.POSITIVE_INFINITY;
      transformedProducts = transformedProducts.filter((p) => {
        const price = typeof p.price === 'string' ? parseFloat(p.price) : p.price;
        if (Number.isNaN(price)) return false;
        return price >= min && price <= max;
      });
    }

    // Apply featured filter
    if (featured === 'true') {
      transformedProducts = transformedProducts.filter((p) => p.featured);
    }

    // Apply in stock filter
    if (inStock === 'true') {
      transformedProducts = transformedProducts.filter((p) => p.inStock);
    }

    // Apply sorting
    transformedProducts = sortProducts(transformedProducts, sortBy);

    // Limit to requested amount
    transformedProducts = transformedProducts.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: transformedProducts,
      pagination: {
        page,
        limit,
        total: transformedProducts.length,
        totalPages: Math.ceil(transformedProducts.length / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Products API error:', error);
    const message =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (error as Error)?.message ||
      'Internal server error';
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


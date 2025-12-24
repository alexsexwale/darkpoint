import { NextRequest, NextResponse } from 'next/server';
import { cjDropshipping, transformCJProduct } from '@/lib/cjdropshipping';
import { env } from '@/config/env';

export async function GET(request: NextRequest) {
  // Check if CJ credentials are configured
  if (!env.cjDropshipping.email || !env.cjDropshipping.password) {
    return NextResponse.json({
      products: [],
      total: 0,
      error: 'CJ Dropshipping credentials not configured.',
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
    const cj = await cjDropshipping.getProducts({
      pageNum: page,
      pageSize: Math.min(limit, 50),
      keywords: query.trim(),
    });

    if (!cj.success) {
      return NextResponse.json({
        products: [],
        total: 0,
        error: cj.error || 'Failed to fetch products',
      }, { status: 500 });
    }

    const transformed = (cj.data || []).map(transformCJProduct);
    
    // Calculate relevance score for better sorting
    const scoredProducts = transformed.map((product) => {
      let score = 0;
      const queryLower = query.toLowerCase();
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
      query: query.trim(),
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


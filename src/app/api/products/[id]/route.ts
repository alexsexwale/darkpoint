import { NextResponse } from 'next/server';
import { cjDropshipping, transformCJProduct, transformCJVariant } from '@/lib/cjdropshipping';
import { env } from '@/config/env';

// Simple in-memory cache for product data (persists during server runtime)
const productCache = new Map<string, { data: ReturnType<typeof transformCJProduct>; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry wrapper for rate-limited API calls
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1200
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Wait before retry (with increasing delay)
        await delay(delayMs * attempt);
      }
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMsg = lastError.message.toLowerCase();
      
      // Only retry on rate limit errors
      if (!errorMsg.includes('too many') && !errorMsg.includes('qps') && !errorMsg.includes('rate')) {
        throw lastError;
      }
      
      console.log(`Rate limited, retrying in ${delayMs * (attempt + 1)}ms... (attempt ${attempt + 1}/${maxRetries})`);
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // Check if CJ credentials are configured
  if (!env.cjDropshipping.email || !env.cjDropshipping.password) {
    return NextResponse.json({
      success: false,
      error: 'CJ Dropshipping credentials not configured.',
    }, { status: 503 });
  }

  try {
    const { id: productId } = await context.params;

    if (!productId) {
      return NextResponse.json({
        success: false,
        error: 'Product ID is required',
      }, { status: 400 });
    }

    // Check cache first
    const cached = productCache.get(productId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Returning cached product ${productId}`);
      return NextResponse.json({
        success: true,
        data: cached.data,
      });
    }

    console.log(`Fetching product ${productId} from CJDropshipping API...`);
    
    // Fetch product with retry logic
    const productResponse = await withRetry(
      () => cjDropshipping.getProduct(productId)
    );

    if (!productResponse.success || !productResponse.data) {
      // Check if it's a rate limit error
      const errorMsg = (productResponse.error || '').toLowerCase();
      if (errorMsg.includes('too many') || errorMsg.includes('qps')) {
        return NextResponse.json({
          success: false,
          error: 'API rate limited. Please try again in a moment.',
        }, { status: 429 });
      }
      
      return NextResponse.json({
        success: false,
        error: productResponse.error || 'Product not found',
      }, { status: 404 });
    }

    // Small delay before fetching variants to avoid rate limiting
    await delay(1100);

    // Fetch product variants with retry logic
    const variantsResponse = await withRetry(
      () => cjDropshipping.getProductVariants(productId)
    ).catch(() => ({ success: false, data: [] as never[] }));
    
    const variants = variantsResponse.success ? variantsResponse.data : [];

    // Transform the product data
    const transformedProduct = transformCJProduct(productResponse.data);
    if (variants && variants.length > 0) {
      transformedProduct.variants = variants.map((variant) => transformCJVariant(variant));
    }

    // Cache the result
    productCache.set(productId, {
      data: transformedProduct,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      data: transformedProduct,
    });

  } catch (error) {
    console.error('Product detail API error:', error);
    
    const errorMsg = error instanceof Error ? error.message.toLowerCase() : '';
    if (errorMsg.includes('too many') || errorMsg.includes('qps') || errorMsg.includes('rate')) {
      return NextResponse.json({
        success: false,
        error: 'API rate limited. Please try again in a moment.',
      }, { status: 429 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}


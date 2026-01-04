import { NextRequest, NextResponse } from "next/server";
import { cjDropshipping, transformCJProduct } from "@/lib/cjdropshipping";

const CJ_EMAIL = process.env.CJ_DROPSHIPPING_EMAIL;
const CJ_PASSWORD = process.env.CJ_DROPSHIPPING_PASSWORD;

// Search terms for gaming products
const GAMING_SEARCH_TERMS = [
  "gaming mouse",
  "gaming keyboard",
  "gaming headset",
  "gaming controller",
  "gaming mousepad",
  "RGB light",
  "gaming desk accessories",
  "gaming chair accessories",
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { minValue, maxValue, boxId, boxName } = body as {
      minValue: number;
      maxValue: number;
      boxId: string;
      boxName: string;
    };

    if (!minValue || !maxValue) {
      return NextResponse.json(
        { error: "minValue and maxValue are required" },
        { status: 400 }
      );
    }

    // Check if CJ credentials are configured
    if (!CJ_EMAIL || !CJ_PASSWORD) {
      // Return a fallback product for development
      return NextResponse.json({
        success: true,
        product: {
          id: `fallback-${Date.now()}`,
          name: "Premium Gaming Accessory",
          description: "A high-quality gaming product selected just for you!",
          price: Math.floor(Math.random() * (maxValue - minValue) + minValue),
          image: "/images/placeholder.png",
          categoryId: "gaming",
        },
        message: "Fallback product (CJ credentials not configured)",
      });
    }

    // Convert ZAR to USD for CJ filtering (approximate rate)
    const zarToUsd = 0.055; // Approximate rate
    const minPriceUsd = Math.floor(minValue * zarToUsd / 2.5); // Divide by markup
    const maxPriceUsd = Math.ceil(maxValue * zarToUsd / 2.5);

    console.log(`[Mystery Box] Selecting product for ${boxName}`);
    console.log(`[Mystery Box] Value range: R${minValue} - R${maxValue}`);
    console.log(`[Mystery Box] USD price range: $${minPriceUsd} - $${maxPriceUsd}`);

    // Fetch products from multiple search terms
    const allProducts: ReturnType<typeof transformCJProduct>[] = [];
    const seenIds = new Set<string>();

    // Randomly select 2-3 search terms to query
    const shuffledTerms = [...GAMING_SEARCH_TERMS].sort(() => Math.random() - 0.5);
    const selectedTerms = shuffledTerms.slice(0, 3);

    for (let i = 0; i < selectedTerms.length; i++) {
      const term = selectedTerms[i];
      
      // Add delay between requests
      if (i > 0) {
        await delay(1100);
      }

      try {
        const response = await cjDropshipping.getProducts({
          pageNum: 1,
          pageSize: 20,
          keywords: term,
        });

        if (response.success && response.data) {
          const transformed = response.data.map(transformCJProduct);
          for (const product of transformed) {
            if (!seenIds.has(product.id)) {
              seenIds.add(product.id);
              allProducts.push(product);
            }
          }
        }
      } catch (error) {
        console.warn(`[Mystery Box] Failed to fetch for term "${term}":`, error);
      }
    }

    console.log(`[Mystery Box] Fetched ${allProducts.length} total products`);

    // Filter products within the value range
    const eligibleProducts = allProducts.filter((product) => {
      return product.price >= minValue && product.price <= maxValue && product.inStock;
    });

    console.log(`[Mystery Box] ${eligibleProducts.length} products in value range`);

    // If no products in exact range, find closest ones
    let selectedProduct;
    if (eligibleProducts.length > 0) {
      // Pick a random product from eligible ones
      selectedProduct = eligibleProducts[Math.floor(Math.random() * eligibleProducts.length)];
    } else {
      // Find products closest to the range
      const sortedByDistance = allProducts
        .filter((p) => p.inStock)
        .map((product) => {
          const distance = product.price < minValue 
            ? minValue - product.price 
            : product.price - maxValue;
          return { product, distance };
        })
        .sort((a, b) => a.distance - b.distance);

      if (sortedByDistance.length > 0) {
        // Pick from top 5 closest products
        const topCandidates = sortedByDistance.slice(0, 5);
        const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
        selectedProduct = selected.product;
      }
    }

    if (!selectedProduct) {
      // Ultimate fallback
      return NextResponse.json({
        success: true,
        product: {
          id: `mystery-${Date.now()}`,
          name: "Premium Gaming Mystery Item",
          description: "A carefully selected gaming product worth more than you paid!",
          price: Math.floor(Math.random() * (maxValue - minValue) + minValue),
          image: "/images/placeholder.png",
          categoryId: "gaming",
        },
        message: "Fallback product selected",
      });
    }

    console.log(`[Mystery Box] Selected: ${selectedProduct.name} at R${selectedProduct.price}`);

    return NextResponse.json({
      success: true,
      product: {
        id: selectedProduct.id,
        name: selectedProduct.name,
        description: selectedProduct.description || selectedProduct.shortDescription,
        price: selectedProduct.price,
        image: selectedProduct.images[0]?.src || "/images/placeholder.png",
        categoryId: selectedProduct.categoryId,
        slug: selectedProduct.slug,
        variants: selectedProduct.variants,
      },
    });
  } catch (error) {
    console.error("[Mystery Box] Error selecting product:", error);
    return NextResponse.json(
      { error: "Failed to select product" },
      { status: 500 }
    );
  }
}


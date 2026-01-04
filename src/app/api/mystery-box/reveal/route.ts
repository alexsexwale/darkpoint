import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cjDropshipping, transformCJProduct } from "@/lib/cjdropshipping";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CJ_EMAIL = process.env.CJ_DROPSHIPPING_EMAIL;
const CJ_PASSWORD = process.env.CJ_DROPSHIPPING_PASSWORD;

// Gaming product search terms for mystery boxes
const GAMING_SEARCH_TERMS = [
  "gaming mouse",
  "gaming keyboard",
  "gaming headset",
  "gaming controller",
  "gaming mousepad",
  "RGB light",
  "gaming desk accessories",
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const { orderNumber } = await request.json();

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: "Order number is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", orderNumber)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Verify it's a mystery box order
    if (!order.is_mystery_box) {
      return NextResponse.json(
        { success: false, error: "This is not a mystery box order" },
        { status: 400 }
      );
    }

    // Check if payment is complete
    if (order.payment_status !== "paid" && order.payment_status !== "completed") {
      return NextResponse.json(
        { success: false, error: "Payment not yet confirmed. Please wait a moment and refresh." },
        { status: 400 }
      );
    }

    // Check if product is already revealed
    if (order.revealed_product_id) {
      // Return the already revealed product
      const { data: orderItem } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id)
        .eq("is_revealed_product", true)
        .single();

      if (orderItem) {
        return NextResponse.json({
          success: true,
          product: {
            id: orderItem.product_id,
            name: orderItem.product_name,
            description: orderItem.variant_name || "Your mystery item",
            price: orderItem.unit_price,
            image: orderItem.product_image || "/images/placeholder.png",
          },
          alreadyRevealed: true,
        });
      }
    }

    // Select a random product within the value range
    const minValue = order.mystery_box_min_value;
    const maxValue = order.mystery_box_max_value;

    let selectedProduct = null;

    // Try to get a product from CJ Dropshipping
    if (CJ_EMAIL && CJ_PASSWORD) {
      const allProducts: ReturnType<typeof transformCJProduct>[] = [];
      const seenIds = new Set<string>();

      // Randomly select search terms
      const shuffledTerms = [...GAMING_SEARCH_TERMS].sort(() => Math.random() - 0.5);
      const selectedTerms = shuffledTerms.slice(0, 2);

      for (let i = 0; i < selectedTerms.length; i++) {
        const term = selectedTerms[i];
        
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

      // Filter products within value range
      const eligibleProducts = allProducts.filter((product) => {
        return product.price >= minValue && product.price <= maxValue && product.inStock;
      });

      if (eligibleProducts.length > 0) {
        selectedProduct = eligibleProducts[Math.floor(Math.random() * eligibleProducts.length)];
      } else {
        // Find closest products
        const sortedByDistance = allProducts
          .filter((p) => p.inStock)
          .sort((a, b) => {
            const distA = Math.abs(a.price - ((minValue + maxValue) / 2));
            const distB = Math.abs(b.price - ((minValue + maxValue) / 2));
            return distA - distB;
          });

        if (sortedByDistance.length > 0) {
          selectedProduct = sortedByDistance[0];
        }
      }
    }

    // Fallback product if CJ fails
    if (!selectedProduct) {
      const randomPrice = Math.floor(Math.random() * (maxValue - minValue) + minValue);
      selectedProduct = {
        id: `mystery-${Date.now()}`,
        name: "Premium Gaming Mystery Item",
        description: "A carefully selected gaming product worth more than you paid!",
        price: randomPrice,
        images: [{ id: "0", src: "/images/placeholder.png", alt: "Mystery Item" }],
        shortDescription: "Premium gaming accessory",
        slug: "mystery-item",
      };
    }

    // Update order with revealed product
    await supabase
      .from("orders")
      .update({
        revealed_product_id: selectedProduct.id,
        revealed_product_name: selectedProduct.name,
        revealed_product_price: selectedProduct.price,
        revealed_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    // Update the order item to reflect the actual product
    await supabase
      .from("order_items")
      .update({
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        product_image: selectedProduct.images?.[0]?.src || "/images/placeholder.png",
        variant_name: `Revealed: ${selectedProduct.name}`,
        unit_price: selectedProduct.price,
        total_price: selectedProduct.price,
        is_revealed_product: true,
      })
      .eq("order_id", order.id);

    return NextResponse.json({
      success: true,
      product: {
        id: selectedProduct.id,
        name: selectedProduct.name,
        description: selectedProduct.description || selectedProduct.shortDescription || "Your mystery item",
        price: selectedProduct.price,
        image: selectedProduct.images?.[0]?.src || "/images/placeholder.png",
        slug: selectedProduct.slug,
      },
    });
  } catch (error) {
    console.error("[Mystery Box] Reveal error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reveal mystery item" },
      { status: 500 }
    );
  }
}


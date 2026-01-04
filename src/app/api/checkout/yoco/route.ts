import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Generate a unique order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DP-${timestamp}-${random}`;
}

// Generate a unique transaction ID
function generateTransactionId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `YOCO_${timestamp}_${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      billing,
      shipping,
      subtotal,
      shippingCost,
      discountAmount,
      total,
      customerNotes,
      appliedRewardId,
      userId,
    } = body;

    // Validate required fields
    if (!items || !items.length || !billing || !total) {
      return NextResponse.json(
        { error: "Missing required checkout data" },
        { status: 400 }
      );
    }

    // Get Yoco credentials
    const yocoSecretKey = process.env.YOCO_SECRET_KEY;
    const yocoApiUrl = process.env.YOCO_API_URL || "https://payments.yoco.com/api";

    if (!yocoSecretKey) {
      console.error("Yoco secret key is not configured");
      return NextResponse.json(
        { error: "Payment service is not configured" },
        { status: 500 }
      );
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate order number and transaction ID
    const orderNumber = generateOrderNumber();
    const transactionId = generateTransactionId();

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId || null,
        order_number: orderNumber,
        status: "pending",
        subtotal: subtotal,
        shipping_cost: shippingCost || 0,
        discount_amount: discountAmount || 0,
        tax_amount: 0,
        total: total,
        currency: "ZAR",
        shipping_name: shipping?.name || billing.firstName + " " + billing.lastName,
        shipping_address_line1: shipping?.address || billing.address,
        shipping_city: shipping?.city || billing.city,
        shipping_province: shipping?.province || billing.province,
        shipping_postal_code: shipping?.postalCode || billing.postalCode,
        shipping_country: shipping?.country || billing.country,
        shipping_phone: shipping?.phone || billing.phone,
        billing_name: billing.firstName + " " + billing.lastName,
        billing_address_line1: billing.address,
        billing_city: billing.city,
        billing_province: billing.province,
        billing_postal_code: billing.postalCode,
        billing_country: billing.country,
        billing_phone: billing.phone,
        customer_notes: customerNotes || null,
        payment_status: "pending",
        payment_method: "yoco",
        payment_reference: transactionId,
        applied_reward_id: appliedRewardId || null,
      } as never)
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      return NextResponse.json(
        { 
          success: false,
          error: orderError.message || "Failed to create order",
          details: orderError
        },
        { status: 500 }
      );
    }

    // Create order items
    const orderItems = items.map((item: {
      productId: string;
      productName: string;
      productSlug?: string;
      productImage?: string;
      variantId?: string;
      variantName?: string;
      quantity: number;
      unitPrice: number;
    }) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      product_slug: item.productSlug || null,
      product_image: item.productImage || null,
      variant_id: item.variantId || null,
      variant_name: item.variantName || null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.unitPrice * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems as never);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      // Rollback order
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: "Failed to create order items" },
        { status: 500 }
      );
    }

    // Get the base URL for callbacks
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://darkpoint.co.za";

    // Create Yoco checkout session
    const yocoData = {
      amount: Math.round(total * 100), // Amount in cents
      currency: "ZAR",
      successUrl: `${baseUrl}/checkout/success?order=${orderNumber}`,
      cancelUrl: `${baseUrl}/checkout/failed?order=${orderNumber}&reason=cancelled`,
      failureUrl: `${baseUrl}/checkout/failed?order=${orderNumber}&reason=failed`,
      metadata: {
        orderId: order.id,
        orderNumber: orderNumber,
        transactionId: transactionId,
        userId: userId || "guest",
      },
    };

    console.log("Creating Yoco checkout:", { orderNumber, total, transactionId });

    const yocoResponse = await fetch(`${yocoApiUrl}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${yocoSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(yocoData),
    });

    if (!yocoResponse.ok) {
      const errorData = await yocoResponse.json().catch(() => ({}));
      console.error("Yoco API error:", errorData);
      
      // Rollback order
      await supabase.from("order_items").delete().eq("order_id", order.id);
      await supabase.from("orders").delete().eq("id", order.id);
      
      return NextResponse.json(
        { error: "Failed to create payment session" },
        { status: 500 }
      );
    }

    const yocoResult = await yocoResponse.json();
    const checkoutUrl = yocoResult.redirectUrl;

    console.log("Yoco checkout created:", { orderNumber, checkoutUrl: checkoutUrl ? "success" : "missing" });

    // Update order with Yoco checkout ID
    await supabase
      .from("orders")
      .update({ 
        yoco_checkout_id: yocoResult.id,
        payment_reference: transactionId,
      } as never)
      .eq("id", order.id);

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutUrl,
      orderNumber: orderNumber,
      orderId: order.id,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}


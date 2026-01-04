import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const yocoSecretKey = process.env.YOCO_SECRET_KEY!;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

interface MysteryBoxCheckoutData {
  mysteryBox: {
    boxId: string;
    boxName: string;
    boxPrice: number;
    minValue: number;
    maxValue: number;
  };
  billing: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
  };
  shipping: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  customerNotes?: string;
  userId?: string | null;
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(4).toUpperCase();
  return `MB-${timestamp}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const checkoutData: MysteryBoxCheckoutData = await request.json();
    const { mysteryBox, billing, shipping, customerNotes, userId } = checkoutData;

    // Validate required fields
    if (!mysteryBox || !billing || !shipping) {
      return NextResponse.json(
        { success: false, error: "Missing required checkout data" },
        { status: 400 }
      );
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create the order in database (marked as mystery box)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: userId || null,
        status: "pending",
        payment_status: "pending",
        subtotal: mysteryBox.boxPrice,
        shipping_cost: 0, // Free shipping for mystery boxes
        discount_amount: 0,
        total: mysteryBox.boxPrice,
        currency: "ZAR",
        // Billing info
        billing_name: `${billing.firstName} ${billing.lastName}`,
        billing_email: billing.email,
        billing_phone: billing.phone,
        billing_address_line1: billing.address,
        billing_city: billing.city,
        billing_province: billing.province,
        billing_postal_code: billing.postalCode,
        billing_country: billing.country,
        // Shipping info
        shipping_name: `${shipping.firstName} ${shipping.lastName}`,
        shipping_address_line1: shipping.address,
        shipping_city: shipping.city,
        shipping_province: shipping.province,
        shipping_postal_code: shipping.postalCode,
        shipping_country: shipping.country,
        // Mystery box specific
        is_mystery_box: true,
        mystery_box_id: mysteryBox.boxId,
        mystery_box_name: mysteryBox.boxName,
        mystery_box_min_value: mysteryBox.minValue,
        mystery_box_max_value: mysteryBox.maxValue,
        // Notes
        customer_notes: customerNotes || null,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Error creating mystery box order:", orderError);
      return NextResponse.json(
        { success: false, error: `Failed to create order: ${orderError?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // Create order item for the mystery box
    const { error: itemError } = await supabase
      .from("order_items")
      .insert({
        order_id: order.id,
        product_id: `mystery-box-${mysteryBox.boxId}`,
        product_name: mysteryBox.boxName,
        product_image: null,
        variant_name: `Value: R${mysteryBox.minValue} - R${mysteryBox.maxValue}`,
        quantity: 1,
        unit_price: mysteryBox.boxPrice,
        total_price: mysteryBox.boxPrice,
      });

    if (itemError) {
      console.error("Error creating order item:", itemError);
      // Rollback order
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { success: false, error: "Failed to create order item" },
        { status: 500 }
      );
    }

    // Create Yoco checkout session
    const yocoResponse = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${yocoSecretKey}`,
      },
      body: JSON.stringify({
        amount: Math.round(mysteryBox.boxPrice * 100), // Convert to cents
        currency: "ZAR",
        successUrl: `${baseUrl}/checkout/mystery-box/reveal?order=${orderNumber}`,
        cancelUrl: `${baseUrl}/checkout/failed?reason=cancelled&order=${orderNumber}`,
        failureUrl: `${baseUrl}/checkout/failed?reason=failed&order=${orderNumber}`,
        metadata: {
          orderId: order.id,
          orderNumber: orderNumber,
          isMysteryBox: true,
          mysteryBoxId: mysteryBox.boxId,
          mysteryBoxName: mysteryBox.boxName,
          minValue: mysteryBox.minValue,
          maxValue: mysteryBox.maxValue,
          customerEmail: billing.email,
        },
      }),
    });

    if (!yocoResponse.ok) {
      const yocoError = await yocoResponse.json();
      console.error("Yoco checkout error:", yocoError);
      // Rollback
      await supabase.from("order_items").delete().eq("order_id", order.id);
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { success: false, error: "Failed to create payment session" },
        { status: 500 }
      );
    }

    const yocoData = await yocoResponse.json();

    // Update order with checkout ID
    await supabase
      .from("orders")
      .update({ checkout_id: yocoData.id })
      .eq("id", order.id);

    return NextResponse.json({
      success: true,
      orderNumber,
      orderId: order.id,
      redirectUrl: yocoData.redirectUrl,
    });
  } catch (error) {
    console.error("Mystery box checkout error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}


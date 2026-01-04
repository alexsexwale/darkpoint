import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Return eligibility window in days
const RETURN_WINDOW_DAYS = 30;

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isEligibleForReturn(orderDate: string, status: string): boolean {
  // Only delivered orders can be returned
  if (status !== "delivered") {
    return false;
  }
  
  const orderTime = new Date(orderDate).getTime();
  const now = Date.now();
  const daysSinceOrder = (now - orderTime) / (1000 * 60 * 60 * 24);
  
  return daysSinceOrder <= RETURN_WINDOW_DAYS;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderNumber, email } = body;

    if (!orderNumber || !email) {
      return NextResponse.json(
        { error: "Order number and email are required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          id,
          product_id,
          product_name,
          product_image,
          variant_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .or(`order_number.eq.${orderNumber},tracking_number.eq.${orderNumber}`)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "No order found with the provided details. Please check your order number and email address." },
        { status: 404 }
      );
    }

    // Verify email matches
    const orderEmail = order.billing_email || order.user_email;
    if (orderEmail && orderEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: "The email address does not match our records for this order." },
        { status: 403 }
      );
    }

    // Check if order status allows returns
    if (order.status === "cancelled" || order.status === "refunded") {
      return NextResponse.json(
        { error: "This order has been cancelled or refunded and is not eligible for returns." },
        { status: 400 }
      );
    }

    if (order.status !== "delivered") {
      return NextResponse.json(
        { error: "Only delivered orders can be returned. Please wait until your order is delivered." },
        { status: 400 }
      );
    }

    // Check if already has a pending return
    const { data: existingReturn } = await supabase
      .from("return_requests")
      .select("id, status")
      .eq("order_id", order.id)
      .in("status", ["pending", "approved", "in_transit"])
      .single();

    if (existingReturn) {
      return NextResponse.json(
        { error: "This order already has a pending return request. Please track your existing return." },
        { status: 400 }
      );
    }

    // Check return eligibility
    const orderIsEligible = isEligibleForReturn(order.created_at, order.status);

    // Get any items that have already been returned
    const { data: returnedItems } = await supabase
      .from("return_request_items")
      .select("order_item_id, quantity")
      .eq("return_request.order_id", order.id)
      .eq("return_request.status", "completed");

    const returnedItemMap = new Map<string, number>();
    if (returnedItems) {
      returnedItems.forEach((item: { order_item_id: string; quantity: number }) => {
        const existing = returnedItemMap.get(item.order_item_id) || 0;
        returnedItemMap.set(item.order_item_id, existing + item.quantity);
      });
    }

    // Map order items with eligibility
    const items = (order.order_items || []).map((item: {
      id: string;
      product_id: string;
      product_name: string;
      product_image: string | null;
      variant_name: string | null;
      quantity: number;
      unit_price: number;
      total_price: number;
    }) => {
      const returnedQty = returnedItemMap.get(item.id) || 0;
      const remainingQty = item.quantity - returnedQty;
      
      return {
        id: item.id,
        productId: item.product_id,
        name: item.product_name,
        image: item.product_image || "/images/placeholder.png",
        variantName: item.variant_name,
        quantity: remainingQty,
        originalQuantity: item.quantity,
        price: item.unit_price,
        totalPrice: item.total_price,
        eligible: orderIsEligible && remainingQty > 0,
        ineligibleReason: !orderIsEligible 
          ? "Past 30-day return window" 
          : remainingQty <= 0 
          ? "Already returned" 
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        orderDate: formatDate(order.created_at),
        deliveredAt: order.delivered_at ? formatDate(order.delivered_at) : null,
        status: order.status,
        items,
        total: order.total,
        currency: order.currency || "ZAR",
        isEligibleForReturn: orderIsEligible,
        returnWindowEnds: orderIsEligible 
          ? formatDate(new Date(new Date(order.created_at).getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000))
          : null,
      },
    });
  } catch (error) {
    console.error("Find order for return error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}


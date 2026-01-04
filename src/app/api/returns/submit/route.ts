import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface ReturnItem {
  orderItemId: string;
  quantity: number;
  reason: string;
}

function generateReturnNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(4).toUpperCase();
  return `RET-${timestamp}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, email, items, additionalInfo } = body as {
      orderId: string;
      email: string;
      items: ReturnItem[];
      additionalInfo?: string;
    };

    if (!orderId || !email || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Order ID, email, and items are required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the order exists and email matches
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, billing_email, user_email, status, user_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const orderEmail = order.billing_email || order.user_email;
    if (orderEmail && orderEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: "Email does not match order" },
        { status: 403 }
      );
    }

    if (order.status !== "delivered") {
      return NextResponse.json(
        { error: "Only delivered orders can be returned" },
        { status: 400 }
      );
    }

    // Check if already has pending return
    const { data: existingReturn } = await supabase
      .from("return_requests")
      .select("id")
      .eq("order_id", orderId)
      .in("status", ["pending", "approved", "in_transit"])
      .single();

    if (existingReturn) {
      return NextResponse.json(
        { error: "This order already has a pending return request" },
        { status: 400 }
      );
    }

    // Calculate total refund amount
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("id, unit_price, quantity")
      .eq("order_id", orderId);

    if (itemsError || !orderItems) {
      return NextResponse.json(
        { error: "Failed to fetch order items" },
        { status: 500 }
      );
    }

    const itemPriceMap = new Map<string, number>();
    orderItems.forEach((item: { id: string; unit_price: number }) => {
      itemPriceMap.set(item.id, item.unit_price);
    });

    let totalRefundAmount = 0;
    for (const item of items) {
      const unitPrice = itemPriceMap.get(item.orderItemId);
      if (unitPrice) {
        totalRefundAmount += unitPrice * item.quantity;
      }
    }

    // Generate return number
    const returnNumber = generateReturnNumber();

    // Create return request
    const { data: returnRequest, error: createError } = await supabase
      .from("return_requests")
      .insert({
        return_number: returnNumber,
        order_id: orderId,
        user_id: order.user_id || null,
        email: email.toLowerCase(),
        status: "pending",
        total_refund_amount: totalRefundAmount,
        additional_info: additionalInfo || null,
      })
      .select("id, return_number")
      .single();

    if (createError || !returnRequest) {
      console.error("Create return request error:", createError);
      return NextResponse.json(
        { error: "Failed to create return request" },
        { status: 500 }
      );
    }

    // Create return request items
    const returnItems = items.map((item) => ({
      return_request_id: returnRequest.id,
      order_item_id: item.orderItemId,
      quantity: item.quantity,
      reason: item.reason,
      refund_amount: (itemPriceMap.get(item.orderItemId) || 0) * item.quantity,
    }));

    const { error: itemsInsertError } = await supabase
      .from("return_request_items")
      .insert(returnItems);

    if (itemsInsertError) {
      console.error("Insert return items error:", itemsInsertError);
      // Rollback: delete the return request
      await supabase.from("return_requests").delete().eq("id", returnRequest.id);
      return NextResponse.json(
        { error: "Failed to create return request items" },
        { status: 500 }
      );
    }

    // TODO: Send email notification about return request

    return NextResponse.json({
      success: true,
      returnNumber: returnRequest.return_number,
      message: "Return request submitted successfully",
    });
  } catch (error) {
    console.error("Submit return request error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}


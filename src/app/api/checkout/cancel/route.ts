import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderNumber } = body;

    if (!orderNumber) {
      return NextResponse.json(
        { error: "Order number is required" },
        { status: 400 }
      );
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the order by order number and check if it's still pending
    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("id, status, payment_status")
      .eq("order_number", orderNumber)
      .single();

    if (findError || !order) {
      console.log("Order not found or already processed:", orderNumber);
      return NextResponse.json({ success: true, message: "Order not found or already processed" });
    }

    // Only delete if the order is still pending
    if (order.status === "pending" && order.payment_status === "pending") {
      // Delete order items first
      const { error: itemsDeleteError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", order.id);

      if (itemsDeleteError) {
        console.error("Error deleting order items:", itemsDeleteError);
      }

      // Delete the order
      const { error: orderDeleteError } = await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      if (orderDeleteError) {
        console.error("Error deleting order:", orderDeleteError);
        return NextResponse.json(
          { error: "Failed to delete cancelled order" },
          { status: 500 }
        );
      }

      console.log("Cancelled order deleted:", orderNumber);
      return NextResponse.json({ success: true, message: "Cancelled order deleted" });
    }

    return NextResponse.json({ success: true, message: "Order status has changed, not deleted" });
  } catch (error) {
    console.error("Cancel order error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}


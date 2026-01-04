import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Status to color mapping
const statusColors: Record<string, string> = {
  pending: "text-yellow-400",
  confirmed: "text-blue-400",
  processing: "text-blue-400",
  shipped: "text-purple-400",
  in_transit: "text-purple-400",
  out_for_delivery: "text-green-400",
  delivered: "text-green-400",
  cancelled: "text-red-400",
  refunded: "text-gray-400",
};

// Status display names
const statusNames: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

// Get status index for timeline
const statusOrder = [
  "pending",
  "confirmed", 
  "processing",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
];

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEstimatedDelivery(createdAt: string, status: string): string {
  if (status === "delivered") {
    return "Delivered";
  }
  if (status === "cancelled" || status === "refunded") {
    return "N/A";
  }
  
  // Estimate 5-7 business days from order date
  const orderDate = new Date(createdAt);
  const estimatedDate = new Date(orderDate);
  estimatedDate.setDate(estimatedDate.getDate() + 7);
  
  return estimatedDate.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the order by order number or tracking number
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          id,
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

    // Verify email matches (case-insensitive)
    const orderEmail = order.billing_email || order.user_email;
    if (orderEmail && orderEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: "The email address does not match our records for this order." },
        { status: 403 }
      );
    }

    // Build timeline based on order status and dates
    const currentStatusIndex = statusOrder.indexOf(order.status);
    const timeline = [];

    // Order placed
    timeline.push({
      date: formatDate(order.created_at),
      status: "Order Placed",
      description: "Your order has been received and is being processed",
      completed: true,
    });

    // Payment status
    if (order.payment_status === "paid" || order.payment_status === "completed") {
      timeline.push({
        date: order.paid_at ? formatDate(order.paid_at) : formatDate(order.created_at),
        status: "Payment Confirmed",
        description: "Payment successfully processed",
        completed: true,
      });
    } else if (order.payment_status === "pending") {
      timeline.push({
        date: "Pending",
        status: "Awaiting Payment",
        description: "Waiting for payment confirmation",
        completed: false,
      });
    }

    // Processing
    if (currentStatusIndex >= statusOrder.indexOf("processing")) {
      timeline.push({
        date: order.processed_at ? formatDate(order.processed_at) : "Completed",
        status: "Processing",
        description: "Your order is being prepared for shipment",
        completed: true,
      });
    } else if (order.payment_status === "paid" || order.payment_status === "completed") {
      timeline.push({
        date: "Pending",
        status: "Processing",
        description: "Your order will be prepared for shipment",
        completed: false,
      });
    }

    // Shipped
    if (currentStatusIndex >= statusOrder.indexOf("shipped")) {
      timeline.push({
        date: order.shipped_at ? formatDate(order.shipped_at) : "Completed",
        status: "Shipped",
        description: order.tracking_number 
          ? `Tracking number: ${order.tracking_number}` 
          : "Package has been handed to the courier",
        completed: true,
      });
    } else if (currentStatusIndex >= statusOrder.indexOf("processing")) {
      timeline.push({
        date: "Pending",
        status: "Shipped",
        description: "Package will be handed to the courier",
        completed: false,
      });
    }

    // In Transit
    if (currentStatusIndex >= statusOrder.indexOf("in_transit")) {
      timeline.push({
        date: order.in_transit_at ? formatDate(order.in_transit_at) : "Completed",
        status: "In Transit",
        description: "Package is on its way to your location",
        completed: true,
      });
    } else if (currentStatusIndex >= statusOrder.indexOf("shipped")) {
      timeline.push({
        date: "Pending",
        status: "In Transit",
        description: "Package will be on its way",
        completed: false,
      });
    }

    // Out for Delivery
    if (currentStatusIndex >= statusOrder.indexOf("out_for_delivery")) {
      timeline.push({
        date: order.out_for_delivery_at ? formatDate(order.out_for_delivery_at) : "Today",
        status: "Out for Delivery",
        description: "Package is out for delivery",
        completed: true,
      });
    } else if (currentStatusIndex >= statusOrder.indexOf("in_transit")) {
      timeline.push({
        date: "Pending",
        status: "Out for Delivery",
        description: "Package will be out for delivery",
        completed: false,
      });
    }

    // Delivered
    if (order.status === "delivered") {
      timeline.push({
        date: order.delivered_at ? formatDate(order.delivered_at) : "Completed",
        status: "Delivered",
        description: "Package delivered successfully",
        completed: true,
      });
    } else if (order.status !== "cancelled" && order.status !== "refunded") {
      timeline.push({
        date: "Pending",
        status: "Delivered",
        description: "Package will be delivered",
        completed: false,
      });
    }

    // Cancelled or Refunded
    if (order.status === "cancelled") {
      timeline.push({
        date: order.cancelled_at ? formatDate(order.cancelled_at) : formatDate(order.updated_at),
        status: "Cancelled",
        description: "Order has been cancelled",
        completed: true,
      });
    }

    if (order.status === "refunded") {
      timeline.push({
        date: order.refunded_at ? formatDate(order.refunded_at) : formatDate(order.updated_at),
        status: "Refunded",
        description: "Order has been refunded",
        completed: true,
      });
    }

    return NextResponse.json({
      success: true,
      order: {
        orderNumber: order.order_number,
        status: statusNames[order.status] || order.status,
        statusColor: statusColors[order.status] || "text-white",
        estimatedDelivery: getEstimatedDelivery(order.created_at, order.status),
        trackingNumber: order.tracking_number || null,
        total: order.total,
        currency: order.currency || "ZAR",
        shippingAddress: {
          name: order.shipping_name,
          address: order.shipping_address_line1,
          city: order.shipping_city,
          province: order.shipping_province,
          postalCode: order.shipping_postal_code,
          country: order.shipping_country,
        },
        items: order.order_items || [],
        timeline,
        createdAt: order.created_at,
      },
    });
  } catch (error) {
    console.error("Track order error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}


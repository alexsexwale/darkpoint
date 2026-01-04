import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Status display configuration
const statusConfig: Record<string, { name: string; color: string; description: string }> = {
  pending: {
    name: "Pending Review",
    color: "text-yellow-400",
    description: "Your return request is being reviewed by our team",
  },
  approved: {
    name: "Approved",
    color: "text-green-400",
    description: "Your return has been approved. Please ship the items back",
  },
  rejected: {
    name: "Rejected",
    color: "text-red-400",
    description: "Your return request has been rejected",
  },
  in_transit: {
    name: "In Transit",
    color: "text-blue-400",
    description: "Your return is on its way back to us",
  },
  received: {
    name: "Received",
    color: "text-purple-400",
    description: "We have received your returned items and are inspecting them",
  },
  completed: {
    name: "Completed",
    color: "text-green-400",
    description: "Your return has been processed and refund has been issued",
  },
  cancelled: {
    name: "Cancelled",
    color: "text-gray-400",
    description: "This return request has been cancelled",
  },
};

const statusOrder = ["pending", "approved", "in_transit", "received", "completed"];

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { returnNumber, email } = body;

    if (!returnNumber || !email) {
      return NextResponse.json(
        { error: "Return number and email are required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the return request
    const { data: returnRequest, error: returnError } = await supabase
      .from("return_requests")
      .select(`
        *,
        orders (
          order_number,
          total
        ),
        return_request_items (
          id,
          quantity,
          reason,
          refund_amount,
          order_items (
            id,
            product_name,
            product_image,
            variant_name,
            unit_price
          )
        )
      `)
      .eq("return_number", returnNumber)
      .single();

    if (returnError || !returnRequest) {
      return NextResponse.json(
        { error: "No return request found with the provided details. Please check your return number." },
        { status: 404 }
      );
    }

    // Verify email
    if (returnRequest.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: "The email address does not match our records for this return." },
        { status: 403 }
      );
    }

    const config = statusConfig[returnRequest.status] || statusConfig.pending;

    // Build timeline
    const timeline = [];
    const currentStatusIndex = statusOrder.indexOf(returnRequest.status);

    // Request Submitted
    timeline.push({
      date: formatDate(returnRequest.created_at),
      status: "Request Submitted",
      description: "Your return request has been submitted",
      completed: true,
    });

    // Under Review / Approved
    if (currentStatusIndex >= statusOrder.indexOf("approved") || returnRequest.status === "rejected") {
      timeline.push({
        date: returnRequest.reviewed_at ? formatDate(returnRequest.reviewed_at) : "Completed",
        status: returnRequest.status === "rejected" ? "Rejected" : "Approved",
        description: returnRequest.status === "rejected" 
          ? returnRequest.rejection_reason || "Return request was rejected"
          : "Your return has been approved",
        completed: true,
      });
    } else if (returnRequest.status === "pending") {
      timeline.push({
        date: "Pending",
        status: "Under Review",
        description: "Our team is reviewing your request",
        completed: false,
      });
    }

    // If rejected, don't show further steps
    if (returnRequest.status !== "rejected" && returnRequest.status !== "cancelled") {
      // Shipped Back
      if (currentStatusIndex >= statusOrder.indexOf("in_transit")) {
        timeline.push({
          date: returnRequest.shipped_at ? formatDate(returnRequest.shipped_at) : "Completed",
          status: "Shipped",
          description: returnRequest.return_tracking_number 
            ? `Return tracking: ${returnRequest.return_tracking_number}`
            : "Return package has been shipped",
          completed: true,
        });
      } else if (currentStatusIndex >= statusOrder.indexOf("approved")) {
        timeline.push({
          date: "Pending",
          status: "Ship Return",
          description: "Please ship the items back using the provided label",
          completed: false,
        });
      }

      // Received
      if (currentStatusIndex >= statusOrder.indexOf("received")) {
        timeline.push({
          date: returnRequest.received_at ? formatDate(returnRequest.received_at) : "Completed",
          status: "Items Received",
          description: "We have received and are inspecting your return",
          completed: true,
        });
      } else if (currentStatusIndex >= statusOrder.indexOf("in_transit")) {
        timeline.push({
          date: "Pending",
          status: "Items Received",
          description: "Waiting for items to arrive",
          completed: false,
        });
      }

      // Completed
      if (returnRequest.status === "completed") {
        timeline.push({
          date: returnRequest.completed_at ? formatDate(returnRequest.completed_at) : "Completed",
          status: "Refund Processed",
          description: `Refund of R${returnRequest.total_refund_amount?.toFixed(2) || "0.00"} has been issued`,
          completed: true,
        });
      } else if (currentStatusIndex >= statusOrder.indexOf("received")) {
        timeline.push({
          date: "Pending",
          status: "Refund Processing",
          description: "Refund will be processed after inspection",
          completed: false,
        });
      }
    }

    // Map items
    const items = (returnRequest.return_request_items || []).map((item: {
      id: string;
      quantity: number;
      reason: string;
      refund_amount: number;
      order_items: {
        id: string;
        product_name: string;
        product_image: string | null;
        variant_name: string | null;
        unit_price: number;
      };
    }) => ({
      id: item.id,
      name: item.order_items?.product_name || "Unknown Item",
      image: item.order_items?.product_image || "/images/placeholder.png",
      variantName: item.order_items?.variant_name,
      quantity: item.quantity,
      price: item.order_items?.unit_price || 0,
      reason: item.reason,
      refundAmount: item.refund_amount,
    }));

    return NextResponse.json({
      success: true,
      returnRequest: {
        returnNumber: returnRequest.return_number,
        orderNumber: returnRequest.orders?.order_number,
        status: config.name,
        statusCode: returnRequest.status,
        statusColor: config.color,
        statusDescription: config.description,
        totalRefundAmount: returnRequest.total_refund_amount,
        returnTrackingNumber: returnRequest.return_tracking_number || null,
        returnLabelUrl: returnRequest.return_label_url || null,
        additionalInfo: returnRequest.additional_info,
        rejectionReason: returnRequest.rejection_reason,
        items,
        timeline,
        createdAt: returnRequest.created_at,
      },
    });
  } catch (error) {
    console.error("Track return error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}


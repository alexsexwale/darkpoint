import { NextRequest, NextResponse } from "next/server";
import { sendEmail, isResendConfigured } from "@/lib/resend";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://darkpoint.co.za");

function buildStatusUpdateHtml(
  customerName: string,
  orderNumber: string,
  statusLabel: string,
  orderId: string
): string {
  const viewOrderUrl = `${baseUrl.replace(/\/$/, "")}/account/orders/${orderId}`;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a;">
    <div style="background: linear-gradient(135deg, #e08821 0%, #c47418 100%); padding: 30px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">
        🎮 Darkpoint
      </h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
        Your Gaming Gear Destination
      </p>
    </div>
    <div style="padding: 40px 20px; background-color: #2a2a2a;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #e08821; margin: 0 0 10px 0; font-size: 24px;">Order Update</h2>
        <p style="color: #ccc; margin: 0;">Hi ${customerName}, your order status has been updated.</p>
      </div>
      <div style="background-color: #3a3a3a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #888; padding: 8px 0;">Order Number:</td>
            <td style="color: #fff; padding: 8px 0; text-align: right; font-family: monospace; font-weight: bold;">${orderNumber}</td>
          </tr>
          <tr>
            <td style="color: #888; padding: 8px 0;">New Status:</td>
            <td style="color: #e08821; padding: 8px 0; text-align: right; font-weight: bold;">${statusLabel}</td>
          </tr>
        </table>
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${viewOrderUrl}"
           style="display: inline-block; background: #e08821; color: white; padding: 14px 30px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
          View Order Details
        </a>
      </div>
    </div>
    <div style="padding: 20px; text-align: center; background-color: #1a1a1a; border-top: 1px solid #3a3a3a;">
      <p style="color: #666; font-size: 12px; margin: 0 0 10px 0;">
        Need help? Contact us at <a href="mailto:support@darkpoint.co.za" style="color: #e08821;">support@darkpoint.co.za</a>
      </p>
      <p style="color: #666; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Darkpoint. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
`;
}

export async function POST(request: NextRequest) {
  const secret =
    process.env.ORDER_STATUS_EMAIL_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || "";
  const provided = request.headers.get("x-order-status-secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    orderId?: string;
    orderNumber?: string;
    newStatus?: string;
    customerEmail?: string;
    customerName?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { orderId, orderNumber, newStatus, customerEmail, customerName } = body;
  if (!orderId || !orderNumber || !newStatus || !customerEmail) {
    return NextResponse.json(
      { error: "Missing orderId, orderNumber, newStatus, or customerEmail" },
      { status: 400 }
    );
  }

  if (!isResendConfigured()) {
    return NextResponse.json({ error: "Email not configured" }, { status: 503 });
  }

  const statusLabel = STATUS_LABELS[newStatus.toLowerCase()] || newStatus;
  const name = (customerName || "Customer").trim() || "Customer";
  const html = buildStatusUpdateHtml(name, orderNumber, statusLabel, orderId);
  const text = `Order ${orderNumber} – ${statusLabel}\n\nHi ${name}, your order status has been updated to ${statusLabel}.\n\nView your order: ${baseUrl.replace(/\/$/, "")}/account/orders/${orderId}\n\nNeed help? support@darkpoint.co.za`;

  const { error } = await sendEmail({
    to: customerEmail,
    subject: `Order ${orderNumber} – ${statusLabel} | Darkpoint`,
    html,
    text,
  });

  if (error) {
    console.error("Order status email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

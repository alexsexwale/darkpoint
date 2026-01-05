import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Postmark email sending
async function sendOrderConfirmationEmail(
  to: string,
  orderNumber: string,
  total: number,
  customerName: string
) {
  const postmarkApiToken = process.env.POSTMARK_SERVER_TOKEN || process.env.POSTMARK_API_TOKEN;
  const postmarkFromEmail = process.env.POSTMARK_FROM_EMAIL || "noreply@darkpoint.co.za";

  if (!postmarkApiToken) {
    console.warn("Postmark not configured, skipping order confirmation email");
    return;
  }

  try {
    await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkApiToken,
      },
      body: JSON.stringify({
        From: postmarkFromEmail,
        To: to,
        Subject: `Order Confirmed - ${orderNumber} | Darkpoint`,
        HtmlBody: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #e08821 0%, #c47418 100%); padding: 30px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">
                  🎮 Darkpoint
                </h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
                  Your Gaming Gear Destination
                </p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 20px; background-color: #2a2a2a;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="font-size: 60px; margin-bottom: 15px;">✅</div>
                  <h2 style="color: #e08821; margin: 0 0 10px 0; font-size: 24px;">Order Confirmed!</h2>
                  <p style="color: #ccc; margin: 0;">Thank you for your purchase, ${customerName}!</p>
                </div>
                
                <div style="background-color: #3a3a3a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="color: #888; padding: 8px 0;">Order Number:</td>
                      <td style="color: #fff; padding: 8px 0; text-align: right; font-family: monospace; font-weight: bold;">${orderNumber}</td>
                    </tr>
                    <tr>
                      <td style="color: #888; padding: 8px 0;">Total Paid:</td>
                      <td style="color: #e08821; padding: 8px 0; text-align: right; font-weight: bold; font-size: 18px;">R${total.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="color: #888; padding: 8px 0;">Payment Method:</td>
                      <td style="color: #fff; padding: 8px 0; text-align: right;">Yoco (Card)</td>
                    </tr>
                  </table>
                </div>
                
                <div style="background-color: #3a3a3a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <h3 style="color: #e08821; margin: 0 0 15px 0; font-size: 16px;">What's Next?</h3>
                  <ul style="color: #ccc; margin: 0; padding-left: 20px; line-height: 1.8;">
                    <li>We're preparing your order for shipment</li>
                    <li>You'll receive a tracking number once shipped</li>
                    <li>Track your order anytime in your account</li>
                  </ul>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://darkpoint.co.za/account/orders" 
                     style="display: inline-block; background: #e08821; color: white; padding: 14px 30px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                    View Order Details
                  </a>
                </div>
              </div>
              
              <!-- Footer -->
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
        `,
        TextBody: `
Order Confirmed - ${orderNumber}

Thank you for your purchase, ${customerName}!

Order Number: ${orderNumber}
Total Paid: R${total.toFixed(2)}
Payment Method: Yoco (Card)

What's Next?
- We're preparing your order for shipment
- You'll receive a tracking number once shipped
- Track your order anytime in your account

View your order: https://darkpoint.co.za/account/orders

Need help? Contact us at support@darkpoint.co.za

© ${new Date().getFullYear()} Darkpoint. All rights reserved.
        `.trim(),
        MessageStream: "outbound",
      }),
    });
    console.log("Order confirmation email sent to:", to);
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
  }
}

// Send notification to admin
async function sendAdminNotification(orderNumber: string, total: number, customerEmail: string) {
  const postmarkApiToken = process.env.POSTMARK_SERVER_TOKEN || process.env.POSTMARK_API_TOKEN;
  const postmarkFromEmail = process.env.POSTMARK_FROM_EMAIL || "noreply@darkpoint.co.za";
  const adminEmail = "support@darkpoint.co.za";

  if (!postmarkApiToken) return;

  try {
    await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkApiToken,
      },
      body: JSON.stringify({
        From: postmarkFromEmail,
        To: adminEmail,
        Subject: `🛒 New Order: ${orderNumber} - R${total.toFixed(2)}`,
        HtmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e08821;">New Order Received!</h2>
            <p><strong>Order Number:</strong> ${orderNumber}</p>
            <p><strong>Total:</strong> R${total.toFixed(2)}</p>
            <p><strong>Customer:</strong> ${customerEmail}</p>
            <p><a href="https://darkpoint.co.za/admin/orders">View in Admin Panel</a></p>
          </div>
        `,
        TextBody: `New Order: ${orderNumber}\nTotal: R${total.toFixed(2)}\nCustomer: ${customerEmail}`,
        MessageStream: "outbound",
      }),
    });
  } catch (error) {
    console.error("Failed to send admin notification:", error);
  }
}

export async function POST(request: NextRequest) {
  console.log("----- Yoco Webhook Received -----");
  
  // Acknowledge immediately (webhook best practice)
  const responsePromise = NextResponse.json({ received: true }, { status: 200 });

  try {
    // Get raw body for signature verification (if needed)
    const rawBody = await request.text();
    const bodyData = JSON.parse(rawBody);

    console.log("Webhook payload:", JSON.stringify(bodyData, null, 2));

    const { type, payload } = bodyData || {};

    // Only process successful payment webhooks
    if (type !== "payment.succeeded" || !payload || payload.status !== "succeeded") {
      console.log("Ignoring non-succeeded webhook:", { type, status: payload?.status });
      return responsePromise;
    }

    const { metadata, amount } = payload;
    
    if (!metadata?.orderId || !metadata?.orderNumber) {
      console.error("Missing metadata in webhook payload");
      return responsePromise;
    }

    console.log("Processing successful payment:", {
      orderId: metadata.orderId,
      orderNumber: metadata.orderNumber,
      amount: amount / 100,
    });

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", metadata.orderId)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", metadata.orderId);
      return responsePromise;
    }

    // Check if already processed (idempotency)
    if (order.payment_status === "paid") {
      console.log("Order already marked as paid:", order.order_number);
      return responsePromise;
    }

    // Verify amount matches
    const expectedCents = Math.round(order.total * 100);
    if (Math.abs(expectedCents - amount) > 1) {
      console.error("Amount mismatch:", { expected: expectedCents, received: amount });
      return responsePromise;
    }

    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "processing",
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        yoco_payment_id: payload.id,
      } as never)
      .eq("id", order.id);

    if (updateError) {
      console.error("Failed to update order:", updateError);
      return responsePromise;
    }

    console.log("Order updated successfully:", order.order_number);

    // Get user email for notification
    let customerEmail = order.billing_email;
    let customerName = order.billing_name || "Customer";

    if (order.user_id) {
      const { data: userData } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("id", order.user_id)
        .single();
      
      if (userData?.email) {
        customerEmail = userData.email;
      }

      // Also get user from auth
      const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
      if (authUser?.user?.email) {
        customerEmail = authUser.user.email;
      }

      // Update user stats
      try {
        await supabase.rpc("update_user_order_stats", {
          p_user_id: order.user_id,
          p_order_total: order.total - (order.discount_amount || 0),
        });
      } catch (err) {
        console.warn("Failed to update user stats:", err);
      }

      // Award XP for purchase
      try {
        const xpAmount = Math.floor((order.total - (order.discount_amount || 0)) / 10); // 1 XP per R10 spent
        await supabase.rpc("add_xp", {
          p_user_id: order.user_id,
          p_action: "purchase",
          p_amount: Math.max(xpAmount, 10), // Minimum 10 XP per purchase
          p_description: `Purchase: Order ${order.order_number}`,
        });
      } catch (err) {
        console.warn("Failed to award XP:", err);
      }

      // Check if user should get bonus spin (R1000+ contribution)
      const contribution = order.total - (order.discount_amount || 0) - (order.shipping_cost || 0);
      if (contribution >= 1000) {
        try {
          await supabase.rpc("grant_bonus_spin", {
            p_user_id: order.user_id,
            p_reason: `Big spender bonus: Order ${order.order_number}`,
          });
        } catch (err) {
          console.warn("Failed to grant bonus spin:", err);
        }
      }

      // If a reward was applied, mark it as used
      if (order.applied_reward_id) {
        await supabase
          .from("user_coupons")
          .update({
            is_used: true,
            used_at: new Date().toISOString(),
            used_on_order_id: order.id,
          } as never)
          .eq("id", order.applied_reward_id);
      }
    }

    // Send order confirmation email
    if (customerEmail) {
      await sendOrderConfirmationEmail(
        customerEmail,
        order.order_number,
        order.total,
        customerName
      );
    }

    // Send admin notification
    await sendAdminNotification(order.order_number, order.total, customerEmail || "Unknown");

    console.log("Payment processing complete:", order.order_number);

  } catch (error) {
    console.error("Webhook processing error:", error);
  }

  return responsePromise;
}

// Handle GET requests (for webhook verification if needed)
export async function GET() {
  return NextResponse.json({ status: "Yoco webhook endpoint active" });
}


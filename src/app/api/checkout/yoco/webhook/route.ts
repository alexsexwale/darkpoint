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
  console.log("Timestamp:", new Date().toISOString());
  
  let bodyData: unknown = null;
  
  try {
    // Get raw body for processing
    const rawBody = await request.text();
    bodyData = JSON.parse(rawBody);

    console.log("Webhook payload:", JSON.stringify(bodyData, null, 2));

    // Handle different webhook payload formats
    let paymentStatus: string = "";
    let metadata: Record<string, string> | null = null;
    let amount: number = 0;
    let paymentId: string = "";
    let checkoutId: string = "";

    const payload = bodyData as Record<string, unknown>;

    // Check if it's the standard Yoco webhook format with type and payload
    if (payload.type && payload.payload) {
      const type = payload.type as string;
      const innerPayload = payload.payload as Record<string, unknown>;
      
      console.log("Webhook type:", type);
      console.log("Inner payload status:", innerPayload?.status);
      
      // Handle payment.succeeded event
      if (type === "payment.succeeded" && innerPayload?.status === "succeeded") {
        paymentStatus = "paid";
        metadata = (innerPayload.metadata || {}) as Record<string, string>;
        amount = (innerPayload.amount || innerPayload.amountInCents || 0) as number;
        paymentId = (innerPayload.id || "") as string;
        checkoutId = (innerPayload.checkoutId || innerPayload.checkout_id || "") as string;
      }
      // Handle checkout.completed event
      else if (type === "checkout.completed" || type === "checkout.succeeded") {
        paymentStatus = "paid";
        metadata = (innerPayload.metadata || {}) as Record<string, string>;
        amount = (innerPayload.amount || innerPayload.amountInCents || 0) as number;
        paymentId = (innerPayload.paymentId || innerPayload.payment_id || "") as string;
        checkoutId = (innerPayload.id || "") as string;
      }
      else {
        console.log("Ignoring webhook type:", type, "with status:", innerPayload?.status);
        return NextResponse.json({ received: true, ignored: true }, { status: 200 });
      }
    } 
    // Check if it's a direct payment/checkout object
    else if (payload.status === "succeeded" || payload.state === "succeeded") {
      paymentStatus = "paid";
      metadata = (payload.metadata || payload.meta || {}) as Record<string, string>;
      amount = (payload.amount || payload.amountInCents || 0) as number;
      paymentId = (payload.id || payload.paymentId || "") as string;
      checkoutId = (payload.checkoutId || payload.checkout_id || "") as string;
    }
    else {
      console.log("Unknown webhook format or non-success status:", payload.type || payload.status);
      return NextResponse.json({ received: true, ignored: true }, { status: 200 });
    }

    console.log("Extracted payment data:", {
      paymentStatus,
      paymentId,
      checkoutId,
      metadata,
      amountInCents: amount,
      amountInRands: amount / 100,
    });

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use the RPC function to find the order
    const { data: findResult, error: findError } = await supabase.rpc("find_order_for_payment", {
      p_order_id: metadata?.orderId || null,
      p_order_number: metadata?.orderNumber || null,
      p_yoco_checkout_id: checkoutId || null,
      p_payment_reference: metadata?.transactionId || null,
    });

    console.log("Find order result:", findResult, "Error:", findError);

    // If RPC doesn't exist yet, fall back to direct queries
    let order: Record<string, unknown> | null = null;
    
    if (findResult?.success && findResult?.order) {
      order = findResult.order;
    } else {
      // Fallback: Direct queries
      console.log("Falling back to direct queries...");
      
      // Try by order ID from metadata
      if (metadata?.orderId) {
        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("id", metadata.orderId)
          .single();
        if (data) order = data;
      }

      // Try by order number from metadata
      if (!order && metadata?.orderNumber) {
        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("order_number", metadata.orderNumber)
          .single();
        if (data) order = data;
      }

      // Try by checkout ID
      if (!order && checkoutId) {
        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("yoco_checkout_id", checkoutId)
          .single();
        if (data) order = data;
      }

      // Try by payment reference
      if (!order && metadata?.transactionId) {
        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("payment_reference", metadata.transactionId)
          .single();
        if (data) order = data;
      }

      // Last resort: Find most recent pending order with matching amount
      if (!order && amount > 0) {
        const expectedRands = amount / 100;
        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("payment_status", "pending")
          .gte("total", expectedRands - 1)
          .lte("total", expectedRands + 1)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (data) {
          order = data;
          console.log("Found order by amount match:", data.order_number);
        }
      }
    }

    if (!order) {
      console.error("Order not found. Search criteria:", {
        orderId: metadata?.orderId,
        orderNumber: metadata?.orderNumber,
        checkoutId,
        transactionId: metadata?.transactionId,
        amount: amount / 100,
      });
      return NextResponse.json({ received: true, error: "Order not found" }, { status: 200 });
    }

    console.log("Found order:", {
      id: order.id,
      order_number: order.order_number,
      current_payment_status: order.payment_status,
      total: order.total,
    });

    // Check if already processed (idempotency)
    if (order.payment_status === "paid") {
      console.log("Order already marked as paid:", order.order_number);
      return NextResponse.json({ received: true, already_processed: true }, { status: 200 });
    }

    // Verify amount matches (within 1 rand tolerance)
    const expectedCents = Math.round((order.total as number) * 100);
    if (Math.abs(expectedCents - amount) > 100) {
      console.error("Amount mismatch:", { expected: expectedCents, received: amount });
      return NextResponse.json({ received: true, error: "Amount mismatch" }, { status: 200 });
    }

    // Try to use the RPC function first
    const { data: updateResult, error: updateRpcError } = await supabase.rpc("update_order_payment_status", {
      p_order_id: order.id as string,
      p_payment_status: paymentStatus,
      p_yoco_payment_id: paymentId || null,
      p_yoco_checkout_id: checkoutId || null,
    });

    console.log("RPC update result:", updateResult, "Error:", updateRpcError);

    // Fallback to direct update if RPC fails
    if (updateRpcError || !updateResult?.success) {
      console.log("RPC failed, falling back to direct update...");
      
      const updateData = {
        status: "processing",
        payment_status: paymentStatus,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        yoco_payment_id: paymentId || order.yoco_payment_id,
        yoco_checkout_id: checkoutId || order.yoco_checkout_id,
      };

      console.log("Direct update data:", updateData);

      const { error: directUpdateError, data: updatedOrder } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", order.id)
        .select()
        .single();

      if (directUpdateError) {
        console.error("Failed to update order:", {
          error: directUpdateError,
          code: directUpdateError.code,
          message: directUpdateError.message,
          details: directUpdateError.details,
          hint: directUpdateError.hint,
          orderId: order.id,
          orderNumber: order.order_number,
        });
        
        // Try raw SQL as last resort
        console.log("Attempting raw SQL update...");
        const { error: rawError } = await supabase.rpc("update_order_payment_status", {
          p_order_id: order.id as string,
          p_payment_status: "paid",
          p_yoco_payment_id: paymentId,
          p_yoco_checkout_id: checkoutId,
        });
        
        if (rawError) {
          console.error("Raw SQL update also failed:", rawError);
          return NextResponse.json({ 
            received: true, 
            error: "Failed to update order",
            details: directUpdateError.message 
          }, { status: 200 });
        }
      } else {
        console.log("Direct update successful:", updatedOrder?.payment_status);
      }
    } else {
      console.log("RPC update successful:", updateResult);
    }

    console.log("Order payment status updated to:", paymentStatus, "for order:", order.order_number);

    // Get user email for notification
    let customerEmail = order.billing_email as string;
    let customerName = (order.billing_name as string) || "Customer";
    const userId = order.user_id as string | null;

    if (userId) {
      // Get user email
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      if (authUser?.user?.email) {
        customerEmail = authUser.user.email;
      }

      const orderTotal = (order.total as number) - ((order.discount_amount as number) || 0);
      const xpAmount = Math.max(Math.floor(orderTotal / 10), 10); // Minimum 10 XP

      // ============================================
      // DIRECT DATABASE OPERATIONS (No RPC functions)
      // ============================================

      // 1. Update user profile stats directly
      console.log("Updating user stats for:", userId);
      const { data: currentProfile, error: profileFetchError } = await supabase
        .from("user_profiles")
        .select("total_xp, total_orders, total_spent")
        .eq("id", userId)
        .single();

      if (profileFetchError) {
        console.error("Failed to fetch user profile:", profileFetchError);
      } else {
        const { error: profileUpdateError } = await supabase
          .from("user_profiles")
          .update({
            total_xp: (currentProfile?.total_xp || 0) + xpAmount,
            total_orders: (currentProfile?.total_orders || 0) + 1,
            total_spent: (currentProfile?.total_spent || 0) + orderTotal,
            last_purchase_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (profileUpdateError) {
          console.error("Failed to update user profile:", profileUpdateError);
        } else {
          console.log("User profile updated: +", xpAmount, "XP, total_orders +1");
        }
      }

      // 2. Log XP transaction directly
      console.log("Logging XP transaction:", xpAmount);
      const { error: xpError } = await supabase
        .from("xp_transactions")
        .insert({
          user_id: userId,
          amount: xpAmount,
          action: "purchase",
          description: `Purchase: Order ${order.order_number} (R${orderTotal.toFixed(2)})`,
          created_at: new Date().toISOString(),
        });

      if (xpError) {
        console.error("Failed to log XP transaction:", xpError);
      } else {
        console.log("XP transaction logged successfully");
      }

      // 3. Award First Timer achievement directly (if this is their first order)
      if ((currentProfile?.total_orders || 0) === 0) {
        console.log("First purchase detected - awarding First Timer achievement");
        
        // Find the First Timer achievement
        const { data: firstTimerAchievement } = await supabase
          .from("achievements")
          .select("id, xp_reward")
          .eq("requirement_type", "purchase_count")
          .eq("requirement_value", 1)
          .single();

        if (firstTimerAchievement) {
          // Check if not already unlocked
          const { data: existingAchievement } = await supabase
            .from("user_achievements")
            .select("id")
            .eq("user_id", userId)
            .eq("achievement_id", firstTimerAchievement.id)
            .single();

          if (!existingAchievement) {
            // Unlock the achievement
            const { error: achievementError } = await supabase
              .from("user_achievements")
              .insert({
                user_id: userId,
                achievement_id: firstTimerAchievement.id,
                progress: 1,
                unlocked_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (!achievementError && firstTimerAchievement.xp_reward > 0) {
              // Award achievement XP
              await supabase.from("user_profiles").update({
                total_xp: (currentProfile?.total_xp || 0) + xpAmount + firstTimerAchievement.xp_reward,
              }).eq("id", userId);

              await supabase.from("xp_transactions").insert({
                user_id: userId,
                amount: firstTimerAchievement.xp_reward,
                action: "achievement",
                description: "Achievement: First Timer",
                created_at: new Date().toISOString(),
              });

              console.log("First Timer achievement unlocked! +", firstTimerAchievement.xp_reward, "XP");
            }
          }
        }
      }

      // 4. Complete referral directly (if this user was referred)
      console.log("Checking for pending referral...");
      const { data: pendingReferral } = await supabase
        .from("referrals")
        .select("id, referrer_id")
        .eq("referred_id", userId)
        .in("status", ["pending", "pending_purchase"])
        .eq("reward_claimed", false)
        .single();

      if (pendingReferral) {
        console.log("Found pending referral! Referrer:", pendingReferral.referrer_id);

        // Get referrer's current stats
        const { data: referrerProfile } = await supabase
          .from("user_profiles")
          .select("total_xp, referral_count, total_referrals")
          .eq("id", pendingReferral.referrer_id)
          .single();

        // Calculate XP based on tier
        const referralCount = referrerProfile?.referral_count || 0;
        let referrerXp = 300; // Bronze
        if (referralCount >= 25) referrerXp = 750; // Diamond
        else if (referralCount >= 10) referrerXp = 500; // Gold
        else if (referralCount >= 5) referrerXp = 400; // Silver

        // Update referrer profile
        await supabase
          .from("user_profiles")
          .update({
            total_xp: (referrerProfile?.total_xp || 0) + referrerXp,
            referral_count: (referrerProfile?.referral_count || 0) + 1,
            total_referrals: (referrerProfile?.total_referrals || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", pendingReferral.referrer_id);

        // Log XP for referrer
        await supabase.from("xp_transactions").insert({
          user_id: pendingReferral.referrer_id,
          amount: referrerXp,
          action: "referral",
          description: `Referral completed! Friend made their first purchase.`,
          created_at: new Date().toISOString(),
        });

        // Update referral status
        await supabase
          .from("referrals")
          .update({
            status: "completed",
            reward_claimed: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", pendingReferral.id);

        console.log("Referral completed! Referrer awarded", referrerXp, "XP");
      } else {
        console.log("No pending referral found for this user");
      }

      // 5. Grant bonus spin for big spenders (R1000+)
      const contribution = orderTotal - ((order.shipping_cost as number) || 0);
      if (contribution >= 1000) {
        console.log("Big spender detected (R" + contribution + ") - granting bonus spin");
        const { data: currentSpins } = await supabase
          .from("user_profiles")
          .select("free_spins")
          .eq("id", userId)
          .single();

        await supabase
          .from("user_profiles")
          .update({
            free_spins: (currentSpins?.free_spins || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        console.log("Bonus spin granted!");
      }

      // 6. Mark reward as used
      if (order.applied_reward_id) {
        console.log("Marking reward as used:", order.applied_reward_id);
        const { error: rewardError } = await supabase
          .from("user_coupons")
          .update({
            is_used: true,
            used_at: new Date().toISOString(),
            used_on_order_id: order.id,
          } as never)
          .eq("id", order.applied_reward_id);
        
        if (rewardError) {
          console.error("Failed to mark reward as used:", rewardError);
        } else {
          console.log("Reward marked as used successfully");
        }
      }

      console.log("=== All purchase rewards processed ===");
    } else {
      console.log("No userId - skipping user rewards (guest checkout)");
    }

    // Send order confirmation email
    if (customerEmail) {
      await sendOrderConfirmationEmail(
        customerEmail,
        order.order_number as string,
        order.total as number,
        customerName
      );
    }

    // Send admin notification
    await sendAdminNotification(order.order_number as string, order.total as number, customerEmail || "Unknown");

    console.log("----- Payment processing complete -----");
    console.log("Order:", order.order_number);
    console.log("Status: paid");

    return NextResponse.json({ 
      received: true, 
      success: true,
      orderNumber: order.order_number 
    }, { status: 200 });

  } catch (error) {
    console.error("Webhook processing error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      bodyData: bodyData ? JSON.stringify(bodyData).substring(0, 1000) : "No body data",
    });
    
    // Still return 200 to prevent Yoco from retrying
    return NextResponse.json({ 
      received: true, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 200 });
  }
}

// Handle GET requests (for webhook verification and debugging)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderNumber = searchParams.get("order");
  const orderId = searchParams.get("orderId");
  const markPaid = searchParams.get("markPaid");

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (orderNumber || orderId) {
    let query = supabase.from("orders").select("*");
    
    if (orderId) {
      query = query.eq("id", orderId);
    } else if (orderNumber) {
      query = query.eq("order_number", orderNumber);
    }
    
    const { data: order, error } = await query.single();
    
    if (error || !order) {
      return NextResponse.json(
        { error: "Order not found", orderNumber, orderId },
        { status: 404 }
      );
    }

    // Debug endpoint to manually mark order as paid
    if (markPaid === "true") {
      const { data: updateResult, error: updateError } = await supabase.rpc("update_order_payment_status", {
        p_order_id: order.id,
        p_payment_status: "paid",
        p_yoco_payment_id: null,
        p_yoco_checkout_id: null,
      });

      if (updateError) {
        // Fallback to direct update
        await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            status: "processing",
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);
      }

      return NextResponse.json({
        success: true,
        message: "Order marked as paid",
        orderNumber: order.order_number,
        updateResult,
      });
    }
    
    return NextResponse.json({
      orderNumber: order.order_number,
      orderId: order.id,
      paymentStatus: order.payment_status,
      status: order.status,
      yocoCheckoutId: order.yoco_checkout_id,
      yocoPaymentId: order.yoco_payment_id,
      paymentReference: order.payment_reference,
      total: order.total,
      createdAt: order.created_at,
      paidAt: order.paid_at,
      updatedAt: order.updated_at,
    });
  }

  return NextResponse.json({ 
    status: "Yoco webhook endpoint active",
    usage: {
      checkOrder: "GET ?order=ORDER_NUMBER or ?orderId=ORDER_ID",
      markPaid: "GET ?order=ORDER_NUMBER&markPaid=true (debug only)",
    }
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, userId } = body;

    if (!orderId || !userId) {
      return NextResponse.json(
        { error: "Missing orderId or userId" },
        { status: 400 }
      );
    }

    // Verify authorization
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the token and user ownership
    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Verify user owns this order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, payment_status, order_number, total, discount_amount, applied_reward_id, rewards_processed")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Only process paid orders
    if (order.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Order has not been paid yet" },
        { status: 400 }
      );
    }

    // Check if already processed FIRST (before any operations)
    if (order.rewards_processed) {
      return NextResponse.json({
        success: false,
        already_processed: true,
        error: "Rewards already processed for this order",
      });
    }

    // Mark as processed IMMEDIATELY to prevent race conditions
    await supabase
      .from("orders")
      .update({ rewards_processed: true, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("rewards_processed", false); // Only update if not already processed (atomic check)

    // Re-check if we successfully claimed the processing
    const { data: claimCheck } = await supabase
      .from("orders")
      .select("rewards_processed")
      .eq("id", orderId)
      .single();

    // If it was already processed by someone else, stop
    if (!claimCheck || claimCheck.rewards_processed === false) {
      return NextResponse.json({
        success: false,
        error: "Another process is handling rewards",
      });
    }

    const results: Record<string, unknown> = {};

    // Get current profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("total_xp, total_orders, total_spent")
      .eq("id", userId)
      .single();

    const orderTotal = order.total - (order.discount_amount || 0);
    const xpAmount = Math.max(Math.floor(orderTotal / 10), 10);

    // Process rewards (we've already claimed exclusivity above)
    {
        // Update profile
        await supabase
          .from("user_profiles")
          .update({
            total_xp: (profile?.total_xp || 0) + xpAmount,
            total_orders: (profile?.total_orders || 0) + 1,
            total_spent: (profile?.total_spent || 0) + orderTotal,
            last_purchase_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        // Log XP
        await supabase.from("xp_transactions").insert({
          user_id: userId,
          amount: xpAmount,
          action: "purchase",
          description: `Purchase: Order ${order.order_number}`,
          created_at: new Date().toISOString(),
        });

        results.xp_awarded = xpAmount;

        // Mark reward as used
        if (order.applied_reward_id) {
          await supabase
            .from("user_coupons")
            .update({
              is_used: true,
              used_at: new Date().toISOString(),
            })
            .eq("id", order.applied_reward_id);
          results.reward_marked_used = true;
        }

        // Complete pending referral
        const { data: pendingReferral } = await supabase
          .from("referrals")
          .select("id, referrer_id")
          .eq("referred_id", userId)
          .in("status", ["pending", "pending_purchase", "signed_up"]) // Include signed_up status
          .eq("reward_claimed", false)
          .single();

        if (pendingReferral) {
          const { data: referrerProfile } = await supabase
            .from("user_profiles")
            .select("total_xp, referral_count, total_referrals")
            .eq("id", pendingReferral.referrer_id)
            .single();

          const referralCount = referrerProfile?.referral_count || 0;
          let referrerXp = 300;
          if (referralCount >= 25) referrerXp = 750;
          else if (referralCount >= 10) referrerXp = 500;
          else if (referralCount >= 5) referrerXp = 400;

          await supabase
            .from("user_profiles")
            .update({
              total_xp: (referrerProfile?.total_xp || 0) + referrerXp,
              referral_count: (referrerProfile?.referral_count || 0) + 1,
              total_referrals: (referrerProfile?.total_referrals || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", pendingReferral.referrer_id);

          await supabase.from("xp_transactions").insert({
            user_id: pendingReferral.referrer_id,
            amount: referrerXp,
            action: "referral",
            description: "Referral completed! Friend made purchase.",
            created_at: new Date().toISOString(),
          });

          await supabase
            .from("referrals")
            .update({
              status: "completed",
              reward_claimed: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", pendingReferral.id);

        results.referral_completed = true;
        results.referrer_xp = referrerXp;
      }

      return NextResponse.json({ success: true, ...results });
    }
  } catch (error) {
    console.error("Process rewards error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}


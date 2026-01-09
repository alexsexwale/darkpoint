import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * This endpoint completes referrals when the referred user has a delivered order.
 * Can be called:
 * 1. When an order status is updated to 'delivered'
 * 2. Manually to sync pending referrals
 * 3. Via a cron job to periodically check
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get optional user_id from body (to check specific user) or check all pending
    let userId: string | null = null;
    try {
      const body = await request.json();
      userId = body.user_id || null;
    } catch {
      // No body provided, will check all pending referrals
    }

    const results: {
      processed: number;
      completed: number;
      errors: string[];
      details: Array<{
        referrer_id: string;
        referred_id: string;
        xp_awarded: number;
        status: string;
      }>;
    } = {
      processed: 0,
      completed: 0,
      errors: [],
      details: [],
    };

    // Find all pending referrals (optionally filtered by referred user)
    // Note: We query ALL referrals that haven't been completed yet
    let query = supabase
      .from("referrals")
      .select("id, referrer_id, referred_id, status, reward_claimed");
    
    // Filter for non-completed referrals
    query = query.neq("status", "completed");
    
    if (userId) {
      query = query.eq("referred_id", userId);
    }

    const { data: pendingReferrals, error: referralError } = await query;

    if (referralError) {
      console.error("Referral query error:", referralError);
      return NextResponse.json({ error: referralError.message }, { status: 500 });
    }

    console.log("Found referrals:", JSON.stringify(pendingReferrals, null, 2));

    if (!pendingReferrals || pendingReferrals.length === 0) {
      return NextResponse.json({ 
        message: "No pending referrals found",
        ...results 
      });
    }

    // Process each pending referral
    for (const referral of pendingReferrals) {
      results.processed++;

      // Skip if already rewarded
      if (referral.reward_claimed) {
        console.log(`Skipping referral ${referral.id} - already rewarded`);
        results.details.push({
          referrer_id: referral.referrer_id,
          referred_id: referral.referred_id,
          xp_awarded: 0,
          status: "already_rewarded",
        });
        continue;
      }

      // Check if the referred user has any DELIVERED orders
      const { data: deliveredOrders, error: orderError } = await supabase
        .from("orders")
        .select("id, order_number, status")
        .eq("user_id", referral.referred_id)
        .eq("status", "delivered")
        .limit(1);

      console.log(`Checking orders for referred user ${referral.referred_id}:`, deliveredOrders);

      if (orderError) {
        console.error(`Order query error for ${referral.referred_id}:`, orderError);
        results.errors.push(`Error checking orders for ${referral.referred_id}: ${orderError.message}`);
        continue;
      }

      // Only complete referral if there's a delivered order
      if (!deliveredOrders || deliveredOrders.length === 0) {
        console.log(`No delivered orders found for referred user ${referral.referred_id}`);
        results.details.push({
          referrer_id: referral.referrer_id,
          referred_id: referral.referred_id,
          xp_awarded: 0,
          status: "no_delivered_orders",
        });
        continue;
      }

      console.log(`Found delivered order for ${referral.referred_id}: ${deliveredOrders[0].order_number}`);

      // Get referrer's profile to calculate XP based on tier
      const { data: referrerProfile } = await supabase
        .from("user_profiles")
        .select("total_xp, referral_count, total_referrals")
        .eq("id", referral.referrer_id)
        .single();

      // Calculate XP based on referral tier
      const referralCount = referrerProfile?.referral_count || 0;
      let referrerXp = 300; // Bronze tier (0-4 referrals)
      if (referralCount >= 25) {
        referrerXp = 750; // Diamond tier (25+ referrals)
      } else if (referralCount >= 10) {
        referrerXp = 500; // Gold tier (10-24 referrals)
      } else if (referralCount >= 5) {
        referrerXp = 400; // Silver tier (5-9 referrals)
      }

      // Update referrer's profile with XP and increment referral count
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          total_xp: (referrerProfile?.total_xp || 0) + referrerXp,
          referral_count: (referrerProfile?.referral_count || 0) + 1,
          total_referrals: (referrerProfile?.total_referrals || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", referral.referrer_id);

      if (updateError) {
        results.errors.push(`Error updating referrer ${referral.referrer_id}: ${updateError.message}`);
        continue;
      }

      // Log XP transaction for referrer
      await supabase.from("xp_transactions").insert({
        user_id: referral.referrer_id,
        amount: referrerXp,
        action: "referral",
        description: `Referral completed - friend made first delivered purchase`,
        created_at: new Date().toISOString(),
      });

      // Update referral status to completed
      const { error: referralUpdateError } = await supabase
        .from("referrals")
        .update({
          status: "completed",
          reward_claimed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", referral.id);

      if (referralUpdateError) {
        results.errors.push(`Error updating referral ${referral.id}: ${referralUpdateError.message}`);
        continue;
      }

      // Check and award referral achievements
      await checkReferralAchievements(supabase, referral.referrer_id, (referrerProfile?.referral_count || 0) + 1);

      results.completed++;
      results.details.push({
        referrer_id: referral.referrer_id,
        referred_id: referral.referred_id,
        xp_awarded: referrerXp,
        status: "completed",
      });
    }

    return NextResponse.json({
      message: `Processed ${results.processed} referrals, completed ${results.completed}`,
      ...results,
    });
  } catch (error) {
    console.error("Error in complete-on-delivery:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Helper function to check and award referral achievements
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkReferralAchievements(
  supabase: any,
  userId: string,
  newReferralCount: number
) {
  const referralAchievements = [
    { id: "referral_1", requirement: 1, name: "Word Spreader" },
    { id: "referral_5", requirement: 5, name: "Community Builder" },
    { id: "referral_10", requirement: 10, name: "Ambassador" },
    { id: "referral_25", requirement: 25, name: "Influencer" },
  ];

  for (const achievement of referralAchievements) {
    if (newReferralCount >= achievement.requirement) {
      // Check if already unlocked
      const { data: existing } = await supabase
        .from("user_achievements")
        .select("id")
        .eq("user_id", userId)
        .eq("achievement_id", achievement.id)
        .single();

      if (!existing) {
        // Unlock achievement
        await supabase.from("user_achievements").insert({
          user_id: userId,
          achievement_id: achievement.id,
          progress: newReferralCount,
          unlocked_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      } else {
        // Update progress
        await supabase
          .from("user_achievements")
          .update({ progress: newReferralCount })
          .eq("user_id", userId)
          .eq("achievement_id", achievement.id);
      }
    }
  }
}

// GET endpoint to manually trigger check for all pending referrals
export async function GET() {
  // Create a POST request internally
  const response = await POST(new Request("http://localhost", { method: "POST" }));
  return response;
}


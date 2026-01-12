import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Get auth token to verify user
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.split(" ")[1];
    
    // Create client with user's token for auth and RPC call
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }
    
    const userId = user.id;

    const body = await request.json();
    const { productId, rating, title, content, authorName, images } = body;

    // Validate input
    if (!productId || !rating || !title || !content || !authorName) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    // Find order for verified purchase badge
    let orderId: string | null = null;
    let isVerifiedPurchase = false;

    const { data: orders } = await userClient
      .from("orders")
      .select("id")
      .eq("user_id", userId);

    if (orders && orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const { data: orderItem } = await userClient
        .from("order_items")
        .select("order_id")
        .in("order_id", orderIds)
        .eq("product_id", productId)
        .limit(1)
        .maybeSingle();

      if (orderItem) {
        orderId = orderItem.order_id;
        isVerifiedPurchase = true;
      }
    }

    // Call the new SECURITY DEFINER function that bypasses RLS
    const { data: result, error: rpcError } = await userClient.rpc("insert_review_bypass_rls", {
      p_user_id: userId,
      p_product_id: productId,
      p_order_id: orderId,
      p_rating: rating,
      p_title: title,
      p_content: content,
      p_author_name: authorName,
      p_is_verified_purchase: isVerifiedPurchase,
      p_images: images || [],
    });

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return NextResponse.json({ 
        success: false, 
        error: rpcError.message || "Failed to submit review" 
      }, { status: 500 });
    }

    if (!result?.success) {
      return NextResponse.json({ 
        success: false, 
        error: result?.error || "Failed to submit review" 
      }, { status: 400 });
    }

    // Use service client to check and award achievements (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    let totalXPAwarded = result.xp_awarded || 25;
    const achievementsUnlocked: string[] = [];

    // Get user's current review count
    const { data: profile } = await serviceClient
      .from("user_profiles")
      .select("total_reviews")
      .eq("id", userId)
      .single();

    const reviewCount = profile?.total_reviews || 1;

    // Define review achievements to check
    const reviewAchievements = [
      { id: "review_1", requirement: 1, name: "First Review", xp: 50 },
      { id: "review_5", requirement: 5, name: "Reviewer", xp: 150 },
      { id: "review_10", requirement: 10, name: "Expert Reviewer", xp: 300 },
    ];

    for (const achievement of reviewAchievements) {
      if (reviewCount >= achievement.requirement) {
        // Check if achievement exists in DB
        const { data: achievementExists } = await serviceClient
          .from("achievements")
          .select("id")
          .eq("id", achievement.id)
          .maybeSingle();

        if (!achievementExists) {
          continue;
        }

        // Check if already unlocked
        const { data: existingUnlock } = await serviceClient
          .from("user_achievements")
          .select("id")
          .eq("user_id", userId)
          .eq("achievement_id", achievement.id)
          .maybeSingle();

        if (!existingUnlock) {
          // Award the achievement
          const { error: insertError } = await serviceClient
            .from("user_achievements")
            .insert({
              user_id: userId,
              achievement_id: achievement.id,
              progress: reviewCount,
              unlocked_at: new Date().toISOString(),
            });

          if (!insertError) {
            // Award achievement XP
            await serviceClient
              .from("user_profiles")
              .update({ 
                total_xp: (profile?.total_reviews || 0) + achievement.xp 
              })
              .eq("id", userId);

            // Get current XP for proper update
            const { data: currentProfile } = await serviceClient
              .from("user_profiles")
              .select("total_xp")
              .eq("id", userId)
              .single();

            if (currentProfile) {
              await serviceClient
                .from("user_profiles")
                .update({ total_xp: currentProfile.total_xp + achievement.xp })
                .eq("id", userId);
            }

            await serviceClient
              .from("xp_transactions")
              .insert({
                user_id: userId,
                amount: achievement.xp,
                action: "achievement",
                description: `Achievement unlocked: ${achievement.name}`,
              });

            achievementsUnlocked.push(achievement.name);
            totalXPAwarded += achievement.xp;
          } else {
            console.error(`Failed to award achievement ${achievement.id}:`, insertError);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      review_id: result.review_id,
      xp_awarded: totalXPAwarded,
      achievements_unlocked: achievementsUnlocked,
      message: `Review submitted! +${totalXPAwarded} XP${achievementsUnlocked.length > 0 ? ` 🏆 ${achievementsUnlocked.join(", ")}` : ""}`,
    });
  } catch (error) {
    console.error("Error in submit review:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

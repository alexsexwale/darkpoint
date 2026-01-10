import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get auth token
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { productId, rating, title, content, authorName, images } = body;

    // Validate input
    if (!productId || !rating || !title || !content || !authorName) {
      console.error("Missing fields:", { productId: !!productId, rating: !!rating, title: !!title, content: !!content, authorName: !!authorName });
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    // Check if user has purchased this product
    // First get the user's paid orders
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .eq("payment_status", "paid");

    if (!orders || orders.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "You must purchase this product before leaving a review" 
      }, { status: 400 });
    }

    // Then check if any of those orders contain this product
    const orderIds = orders.map(o => o.id);
    const { data: orderItem } = await supabase
      .from("order_items")
      .select("order_id")
      .in("order_id", orderIds)
      .eq("product_id", productId)
      .limit(1)
      .single();

    if (!orderItem) {
      return NextResponse.json({ 
        success: false, 
        error: "You must purchase this product before leaving a review" 
      }, { status: 400 });
    }
    
    const orderData = { id: orderItem.order_id };

    // Check if user already reviewed this product
    const { data: existingReview } = await supabase
      .from("product_reviews")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .single();

    if (existingReview) {
      return NextResponse.json({ 
        success: false, 
        error: "You have already reviewed this product" 
      }, { status: 400 });
    }

    // Insert the review
    const { data: review, error: insertError } = await supabase
      .from("product_reviews")
      .insert({
        user_id: user.id,
        product_id: productId,
        order_id: orderData.id,
        rating,
        title,
        content,
        author_name: authorName,
        is_verified_purchase: true,
        verified_purchase: true,
        images: images || [],
        status: "published",
        is_approved: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting review:", insertError);
      return NextResponse.json({ success: false, error: "Failed to submit review" }, { status: 500 });
    }

    // Calculate XP reward
    let xpAwarded = 25; // Base XP for review
    
    // Bonus for detailed review (longer content)
    if (content.length > 200) {
      xpAwarded += 15;
    }
    
    // Bonus for photo review
    if (images && images.length > 0) {
      xpAwarded += 10;
    }

    // Update user profile - increment total_reviews and add XP
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("total_reviews, total_xp")
      .eq("id", user.id)
      .single();

    const newReviewCount = (profile?.total_reviews || 0) + 1;
    const newTotalXP = (profile?.total_xp || 0) + xpAwarded;

    await supabase
      .from("user_profiles")
      .update({
        total_reviews: newReviewCount,
        total_xp: newTotalXP,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // Log XP transaction
    await supabase
      .from("xp_transactions")
      .insert({
        user_id: user.id,
        amount: xpAwarded,
        action: "review",
        description: `Wrote a review (${content.length > 200 ? "detailed" : "standard"}${images?.length > 0 ? " with photos" : ""})`,
      });

    // Check and award review achievements
    const reviewAchievements = [
      { id: "first_review", requirement: 1, name: "First Review", xp: 50 },
      { id: "reviewer_5", requirement: 5, name: "Active Reviewer", xp: 100 },
      { id: "reviewer_10", requirement: 10, name: "Expert Reviewer", xp: 200 },
    ];

    const achievementsUnlocked: string[] = [];

    for (const achievement of reviewAchievements) {
      if (newReviewCount >= achievement.requirement) {
        // Check if already unlocked
        const { data: existing } = await supabase
          .from("user_achievements")
          .select("id")
          .eq("user_id", user.id)
          .eq("achievement_id", achievement.id)
          .single();

        if (!existing) {
          // Unlock achievement
          await supabase
            .from("user_achievements")
            .insert({
              user_id: user.id,
              achievement_id: achievement.id,
              progress: newReviewCount,
              unlocked_at: new Date().toISOString(),
            });

          // Award achievement XP
          await supabase
            .from("user_profiles")
            .update({
              total_xp: newTotalXP + achievement.xp,
            })
            .eq("id", user.id);

          await supabase
            .from("xp_transactions")
            .insert({
              user_id: user.id,
              amount: achievement.xp,
              action: "achievement",
              description: `Achievement unlocked: ${achievement.name}`,
            });

          achievementsUnlocked.push(achievement.name);
          xpAwarded += achievement.xp;
        }
      }
    }

    return NextResponse.json({
      success: true,
      review_id: review.id,
      xp_awarded: xpAwarded,
      achievements_unlocked: achievementsUnlocked,
      message: `Review submitted! +${xpAwarded} XP${achievementsUnlocked.length > 0 ? ` 🏆 ${achievementsUnlocked.join(", ")}` : ""}`,
    });
  } catch (error) {
    console.error("Error in submit review:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}


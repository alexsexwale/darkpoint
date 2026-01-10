import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  console.log("=== Review Submit API Called ===");
  
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
    console.log("User authenticated:", userId);

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

    console.log("Verified purchase:", isVerifiedPurchase, "Order ID:", orderId);

    // Call the new SECURITY DEFINER function that bypasses RLS
    console.log("Calling insert_review_bypass_rls RPC...");
    
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

    console.log("RPC result:", result);
    console.log("RPC error:", rpcError);

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

    return NextResponse.json({
      success: true,
      review_id: result.review_id,
      xp_awarded: result.xp_awarded || 25,
      achievements_unlocked: [],
      message: result.message || `Review submitted! +${result.xp_awarded || 25} XP`,
    });
  } catch (error) {
    console.error("Error in submit review:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

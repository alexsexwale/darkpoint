import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  console.log("=== Add XP API Called ===");
  
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.split(" ")[1];
    
    // Use user's token - the RPC function has SECURITY DEFINER
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User:", user.id);

    const body = await request.json();
    const { amount, action, description } = body;
    
    console.log("Request:", { amount, action, description });

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid XP amount" }, { status: 400 });
    }

    // Call the SECURITY DEFINER function
    console.log("Calling add_xp_direct RPC...");
    
    const { data: result, error: rpcError } = await supabase.rpc("add_xp_direct", {
      p_user_id: user.id,
      p_amount: amount,
      p_action: action,
      p_description: description || `Earned from ${action}`,
    });
    
    if (rpcError) {
      console.error("RPC error:", rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    if (!result?.success) {
      return NextResponse.json({ error: "Failed to add XP" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      xp_awarded: result.xp_awarded,
      base_xp: result.base_xp,
      bonus_xp: result.bonus_xp,
      multiplier: result.multiplier,
      new_total_xp: result.new_total_xp,
      new_level: result.new_level,
      leveled_up: result.leveled_up,
      old_level: result.old_level,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

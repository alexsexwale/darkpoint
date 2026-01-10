import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper to calculate level from XP
function getLevelFromXP(xp: number): number {
  let level = 1;
  while (getXPForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= 4) return (level - 1) * 100;
  if (level <= 9) return 300 + (level - 4) * 200;
  if (level <= 19) return 1300 + (level - 9) * 500;
  if (level <= 34) return 6300 + (level - 19) * 1000;
  if (level <= 49) return 21300 + (level - 34) * 2000;
  return 51300 + (level - 49) * 5000;
}

export async function POST(request: NextRequest) {
  try {
    // Create service role client (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get auth token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized - no token" }, { status: 401 });
    }
    
    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized - invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, action, description } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid XP amount" }, { status: 400 });
    }

    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("total_xp, current_level")
      .eq("id", user.id)
      .single();

    let currentXP = 0;
    let currentLevel = 1;

    if (profileError || !profile) {
      // Create profile if it doesn't exist
      const { error: createError } = await supabase
        .from("user_profiles")
        .insert({
          id: user.id,
          total_xp: 0,
          current_level: 1,
          current_streak: 0,
          longest_streak: 0,
          total_orders: 0,
          total_reviews: 0,
          available_spins: 1,
          store_credit: 0,
          referral_count: 0,
        });

      if (createError) {
        console.error("Failed to create profile:", createError);
        return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
      }
    } else {
      currentXP = profile.total_xp || 0;
      currentLevel = profile.current_level || 1;
    }

    // Check for active XP multiplier
    let multiplier = 1;
    const { data: activeMultiplier } = await supabase
      .from("user_xp_multipliers")
      .select("multiplier_value, id, xp_earned_with_multiplier")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .order("multiplier_value", { ascending: false })
      .limit(1)
      .single();

    if (activeMultiplier) {
      multiplier = activeMultiplier.multiplier_value || 1;
    }

    // Calculate final XP with multiplier
    const baseXP = amount;
    const finalXP = multiplier > 1 ? Math.round(baseXP * multiplier) : baseXP;
    const bonusXP = finalXP - baseXP;

    // Calculate new totals
    const newTotalXP = currentXP + finalXP;
    const newLevel = getLevelFromXP(newTotalXP);
    const leveledUp = newLevel > currentLevel;

    // Build description
    let finalDescription = description || `Earned from ${action}`;
    if (multiplier > 1 && bonusXP > 0) {
      finalDescription = `${finalDescription} [${multiplier}x: ${baseXP} + ${bonusXP} bonus]`;
    }

    // Update profile
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        total_xp: newTotalXP,
        current_level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update profile:", updateError);
      return NextResponse.json({ error: "Failed to update XP" }, { status: 500 });
    }

    // Log XP transaction
    await supabase
      .from("xp_transactions")
      .insert({
        user_id: user.id,
        amount: finalXP,
        action: action,
        description: finalDescription,
      });

    // Update multiplier tracking if applicable
    if (multiplier > 1 && activeMultiplier?.id) {
      await supabase
        .from("user_xp_multipliers")
        .update({
          xp_earned_with_multiplier: (activeMultiplier.xp_earned_with_multiplier || 0) + bonusXP,
        })
        .eq("id", activeMultiplier.id);
    }

    return NextResponse.json({
      success: true,
      xp_awarded: finalXP,
      base_xp: baseXP,
      bonus_xp: bonusXP,
      multiplier: multiplier,
      new_total_xp: newTotalXP,
      new_level: newLevel,
      leveled_up: leveledUp,
      old_level: currentLevel,
    });
  } catch (error) {
    console.error("Error in add-xp:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}


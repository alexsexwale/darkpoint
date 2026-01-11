import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Helper to get week number
function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor(diff / oneWeek) + 1;
}

// Helper to get week end (Sunday at midnight)
function getWeekEnd(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + daysUntilSunday);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

// GET - Fetch current VIP prize status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weekNumber = getWeekNumber();
    const year = new Date().getFullYear();

    const { data, error } = await supabase.rpc("get_vip_prize_status", {
      p_user_id: user.id,
      p_week_number: weekNumber,
      p_year: year,
    });

    if (error) {
      console.error("Error fetching VIP prize status:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      weekNumber,
      year,
      ...data,
    });
  } catch (error) {
    console.error("VIP prize GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Activate VIP prize
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { prize } = body;

    if (!prize) {
      return NextResponse.json({ error: "Prize data required" }, { status: 400 });
    }

    const weekNumber = getWeekNumber();
    const year = new Date().getFullYear();
    const expiresAt = getWeekEnd();

    const { data, error } = await supabase.rpc("activate_vip_prize", {
      p_user_id: user.id,
      p_week_number: weekNumber,
      p_year: year,
      p_prize_id: prize.id,
      p_prize_name: prize.name,
      p_prize_description: prize.description,
      p_prize_icon: prize.icon,
      p_prize_discount_type: prize.discount_type,
      p_prize_discount_value: prize.discount_value,
      p_prize_min_order_value: prize.min_order_value || 0,
      p_expires_at: expiresAt.toISOString(),
    });

    if (error) {
      console.error("Error activating VIP prize:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      weekNumber,
      year,
      ...data,
    });
  } catch (error) {
    console.error("VIP prize POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Mark VIP prize as used
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weekNumber = getWeekNumber();
    const year = new Date().getFullYear();

    const { data, error } = await supabase.rpc("mark_vip_prize_used", {
      p_user_id: user.id,
      p_week_number: weekNumber,
      p_year: year,
    });

    if (error) {
      console.error("Error marking VIP prize as used:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("VIP prize PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


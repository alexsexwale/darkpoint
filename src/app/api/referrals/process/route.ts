import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type Body = {
  referredUserId?: string;
  referralCode?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const referredUserId = body?.referredUserId;
    const referralCode = body?.referralCode;

    if (!referredUserId || !referralCode) {
      return NextResponse.json(
        { success: false, error: "Missing referredUserId or referralCode" },
        { status: 400 }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: "Server is not configured" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Ensure the referred user's profile exists (welcome bonuses etc.)
    // This is safe to call multiple times.
    await supabase.rpc("ensure_user_profile", { p_user_id: referredUserId } as never);

    // Prefer the new function name, fallback to old one
    const res1 = await supabase.rpc(
      "process_referral_signup",
      { p_referred_user_id: referredUserId, p_referral_code: referralCode } as never
    );

    if (res1.error) {
      const res2 = await supabase.rpc(
        "process_referral",
        { p_referred_user_id: referredUserId, p_referral_code: referralCode } as never
      );

      if (res2.error) {
        return NextResponse.json(
          { success: false, error: res2.error.message || "Referral processing failed" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data: res2.data ?? null });
    }

    return NextResponse.json({ success: true, data: res1.data ?? null });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}



import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type Body = {
  referralCode?: string;
};

export async function POST(req: NextRequest) {
  console.log("[Referral API] Processing referral request...");
  
  try {
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.log("[Referral API] Missing env vars");
      return NextResponse.json(
        { success: false, error: "Server is not configured (missing Supabase env vars)" },
        { status: 500 }
      );
    }

    // Require a valid user token to prevent abuse
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (!token) {
      console.log("[Referral API] No auth token");
      return NextResponse.json(
        { success: false, error: "Missing Authorization token" },
        { status: 401 }
      );
    }

    // Verify the token and get the signed-in user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) {
      console.log("[Referral API] Invalid session:", userErr?.message);
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 }
      );
    }

    const referredUserId = userData.user.id;
    const referralCodeFromMeta = (userData.user.user_metadata as { referral_code?: string | null } | null)?.referral_code || null;
    console.log("[Referral API] User:", referredUserId, "referralCodeFromMeta:", referralCodeFromMeta);

    // Some clients/extensions can send an empty body; handle gracefully.
    let body: Body = {};
    try {
      const raw = await req.text();
      if (raw) body = JSON.parse(raw) as Body;
    } catch {
      console.log("[Referral API] Invalid JSON body");
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const referralCode = body?.referralCode || referralCodeFromMeta;
    console.log("[Referral API] referralCode from body:", body?.referralCode, "final:", referralCode);

    if (!referralCode) {
      console.log("[Referral API] No referral code to process");
      // Nothing to process; return success so clients can treat this as a no-op
      return NextResponse.json({ success: true, data: { skipped: true, reason: "no_referral_code" } });
    }

    // Server-side processing using service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Ensure the referred user's profile exists (welcome bonuses etc.)
    // This is safe to call multiple times.
    console.log("[Referral API] Calling ensure_user_profile...");
    const ensureRes = await supabaseAdmin.rpc("ensure_user_profile", { p_user_id: referredUserId } as never);
    if (ensureRes.error) {
      console.log("[Referral API] ensure_user_profile failed:", ensureRes.error.message);
      return NextResponse.json(
        { success: false, error: `ensure_user_profile failed: ${ensureRes.error.message}` },
        { status: 500 }
      );
    }
    console.log("[Referral API] ensure_user_profile result:", ensureRes.data);

    // Prefer the new function name, fallback to old one
    console.log("[Referral API] Calling process_referral_signup with:", { referredUserId, referralCode });
    const res1 = await supabaseAdmin.rpc(
      "process_referral_signup",
      { p_referred_user_id: referredUserId, p_referral_code: referralCode } as never
    );
    console.log("[Referral API] process_referral_signup result:", res1.data, res1.error?.message);

    if (res1.error) {
      console.log("[Referral API] Trying fallback process_referral...");
      const res2 = await supabaseAdmin.rpc(
        "process_referral",
        { p_referred_user_id: referredUserId, p_referral_code: referralCode } as never
      );
      console.log("[Referral API] process_referral result:", res2.data, res2.error?.message);

      if (res2.error) {
        return NextResponse.json(
          { success: false, error: res2.error.message || "Referral processing failed" },
          { status: 500 }
        );
      }

      // Clear referral code metadata so it won't re-run
      await supabaseAdmin.auth.admin.updateUserById(referredUserId, { user_metadata: { referral_code: null } });
      console.log("[Referral API] Success (fallback):", res2.data);
      return NextResponse.json({ success: true, data: res2.data ?? null });
    }

    // Check the result - the RPC might return success:false in the data
    const rpcResult = res1.data as { success?: boolean; error?: string } | null;
    if (rpcResult && rpcResult.success === false) {
      console.log("[Referral API] RPC returned failure:", rpcResult.error);
      return NextResponse.json({ success: false, error: rpcResult.error || "Referral processing failed", data: rpcResult });
    }

    // Clear referral code metadata so it won't re-run
    await supabaseAdmin.auth.admin.updateUserById(referredUserId, { user_metadata: { referral_code: null } });
    console.log("[Referral API] Success:", res1.data);
    return NextResponse.json({ success: true, data: res1.data ?? null });
  } catch (e) {
    console.error("[Referral API] Exception:", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}



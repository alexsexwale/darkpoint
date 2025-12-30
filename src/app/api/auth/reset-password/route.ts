import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create admin Supabase client lazily to ensure env vars are available
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    });
    throw new Error("Supabase configuration is missing");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

interface ResetPasswordRequest {
  token: string;
  password: string;
}

// GET: Validate token
export async function GET(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Reset token is required" },
        { status: 400 }
      );
    }

    // Direct query to password_reset_tokens table (most reliable)
    const { data: tokenData, error: queryError } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("user_id, email, expires_at, used_at")
      .eq("token", token)
      .single();

    if (queryError || !tokenData) {
      console.error("Token query error:", queryError);
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // Check if token is expired or already used
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (tokenData.used_at || expiresAt < now) {
      return NextResponse.json(
        { success: false, error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      email: tokenData.email,
    });
  } catch (error) {
    console.error("Error validating token:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

// POST: Reset password
export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body: ResetPasswordRequest = await request.json();
    const { token, password } = body;

    console.log("Reset password request received for token:", token?.substring(0, 10) + "...");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Reset token is required" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: "New password is required" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Direct query to password_reset_tokens table
    console.log("Querying password_reset_tokens table...");
    const { data: tokenData, error: queryError } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("user_id, email, expires_at, used_at")
      .eq("token", token)
      .single();

    if (queryError) {
      console.error("Token query error:", queryError);
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      );
    }

    if (!tokenData) {
      console.error("No token data found");
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      );
    }

    console.log("Token found for user:", tokenData.user_id);

    // Check if token is expired or already used
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (tokenData.used_at) {
      console.error("Token already used at:", tokenData.used_at);
      return NextResponse.json(
        { success: false, error: "This reset link has already been used. Please request a new one." },
        { status: 400 }
      );
    }

    if (expiresAt < now) {
      console.error("Token expired at:", expiresAt, "Current time:", now);
      return NextResponse.json(
        { success: false, error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const userId = tokenData.user_id;

    // Update the user's password using admin API
    console.log("Updating password for user:", userId);
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (updateError) {
      console.error("Error updating password:", updateError.message, updateError);
      return NextResponse.json(
        { success: false, error: `Failed to update password: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log("Password updated successfully");

    // Mark token as used
    const { error: markUsedError } = await supabaseAdmin
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token);

    if (markUsedError) {
      console.error("Error marking token as used:", markUsedError);
      // Don't fail the request, password was already updated
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `An error occurred: ${errorMessage}` },
      { status: 500 }
    );
  }
}


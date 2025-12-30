import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create admin Supabase client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

interface ValidateTokenRequest {
  token: string;
}

interface ResetPasswordRequest {
  token: string;
  password: string;
}

// GET: Validate token
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Reset token is required" },
        { status: 400 }
      );
    }

    // Validate token
    const { data: result, error } = await supabaseAdmin.rpc(
      "validate_password_reset_token",
      { p_token: token }
    );

    if (error) {
      console.error("Error validating token:", error);
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    if (!result?.success) {
      return NextResponse.json(
        { success: false, error: result?.error || "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      email: result.email,
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
    const body: ResetPasswordRequest = await request.json();
    const { token, password } = body;

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

    // Validate token and get user info
    const { data: tokenResult, error: tokenError } = await supabaseAdmin.rpc(
      "validate_password_reset_token",
      { p_token: token }
    );

    if (tokenError || !tokenResult?.success) {
      return NextResponse.json(
        { success: false, error: tokenResult?.error || "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      );
    }

    const userId = tokenResult.user_id;

    // Update the user's password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update password. Please try again." },
        { status: 500 }
      );
    }

    // Consume the token (mark as used)
    await supabaseAdmin.rpc("consume_password_reset_token", { p_token: token });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}


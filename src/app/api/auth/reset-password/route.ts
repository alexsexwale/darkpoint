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

    // Try RPC first
    const { data: result, error } = await supabaseAdmin.rpc(
      "validate_password_reset_token",
      { p_token: token }
    );

    if (error) {
      console.error("RPC error (trying direct query):", error);
      
      // Fallback: Direct query to password_reset_tokens table
      const { data: tokenData, error: queryError } = await supabaseAdmin
        .from("password_reset_tokens")
        .select("user_id, email, expires_at, used_at")
        .eq("token", token)
        .single();

      if (queryError || !tokenData) {
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

    // First, try to find the token in the database directly (fallback if RPC doesn't exist)
    let userId: string | null = null;
    let tokenEmail: string | null = null;

    // Try RPC first
    const { data: tokenResult, error: tokenError } = await supabaseAdmin.rpc(
      "validate_password_reset_token",
      { p_token: token }
    );

    if (tokenError) {
      console.error("RPC error (trying direct query):", tokenError);
      
      // Fallback: Direct query to password_reset_tokens table
      const { data: tokenData, error: queryError } = await supabaseAdmin
        .from("password_reset_tokens")
        .select("user_id, email, expires_at, used_at")
        .eq("token", token)
        .single();

      if (queryError || !tokenData) {
        console.error("Token query error:", queryError);
        return NextResponse.json(
          { success: false, error: "Invalid or expired reset link. Please request a new one." },
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

      userId = tokenData.user_id;
      tokenEmail = tokenData.email;
    } else {
      if (!tokenResult?.success) {
        return NextResponse.json(
          { success: false, error: tokenResult?.error || "Invalid or expired reset link. Please request a new one." },
          { status: 400 }
        );
      }
      userId = tokenResult.user_id;
      tokenEmail = tokenResult.email;
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Invalid reset token." },
        { status: 400 }
      );
    }

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

    // Mark token as used (try RPC first, then fallback to direct update)
    const { error: consumeError } = await supabaseAdmin.rpc("consume_password_reset_token", { p_token: token });
    
    if (consumeError) {
      // Fallback: Direct update
      await supabaseAdmin
        .from("password_reset_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);
    }

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


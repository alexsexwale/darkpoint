import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Get auth header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create client with user token
    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    
    // Get user from token
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reason, confirmEmail } = body;

    // Verify email confirmation matches
    if (confirmEmail?.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "Email confirmation does not match" },
        { status: 400 }
      );
    }

    // Create admin client for deletion
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Call the delete function
    const { data, error } = await supabaseAdmin.rpc("delete_user_account", {
      p_user_id: user.id,
      p_reason: reason || "user_requested",
    });

    if (error) {
      console.error("Error deleting account:", error);
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 }
      );
    }

    const result = data as { success: boolean; message: string; anonymized: boolean };

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || "Failed to delete account" },
        { status: 400 }
      );
    }

    // Delete the auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      console.error("Error deleting auth user:", deleteAuthError);
      // Continue anyway - profile data is already deleted/anonymized
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      anonymized: result.anonymized,
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}


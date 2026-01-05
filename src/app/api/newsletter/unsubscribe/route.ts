import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // If Supabase is configured, update the subscription status
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Try to update in newsletter_subscriptions table
      const { error: subscriberError } = await supabase
        .from("newsletter_subscriptions")
        .update({ 
          is_subscribed: false,
          unsubscribed_at: new Date().toISOString()
        })
        .eq("email", email.toLowerCase());

      if (subscriberError) {
        console.error("Error updating newsletter_subscriptions:", subscriberError);
      }

      // Also update user profile if exists
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({ 
          newsletter_subscribed: false,
          updated_at: new Date().toISOString()
        })
        .eq("email", email.toLowerCase());

      if (profileError) {
        console.error("Error updating user_profiles:", profileError);
      }
    }

    // Log the unsubscribe for analytics
    console.log(`[Newsletter] Unsubscribed: ${email}`);

    return NextResponse.json({
      success: true,
      message: "You have been successfully unsubscribed from our newsletter. We're sad to see you go!",
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to process unsubscribe request" },
      { status: 500 }
    );
  }
}


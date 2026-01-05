import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const POSTMARK_API_TOKEN = process.env.POSTMARK_SERVER_TOKEN || process.env.POSTMARK_API_TOKEN;
const FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL || "noreply@darkpoint.co.za";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://darkpoint.co.za";

// Create admin Supabase client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

interface ForgotPasswordRequest {
  email: string;
}

function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function buildResetEmailHTML(resetLink: string, displayName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - Darkpoint</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border: 1px solid #333; border-radius: 8px;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 2px solid #c9a227;">
              <h1 style="margin: 0; color: #c9a227; font-size: 32px; letter-spacing: 3px;">⚔️ Darkpoint ⚔️</h1>
              <p style="margin: 10px 0 0; color: #888; font-size: 14px;">Elite Gaming Gear & Tech</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Icon -->
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #c9a227 0%, #8b7355 100%); border-radius: 50%; line-height: 80px; font-size: 36px;">
                  🔐
                </div>
              </div>

              <h2 style="margin: 0 0 20px; color: #fff; font-size: 28px; text-align: center;">
                Password Reset Request
              </h2>
              
              <p style="margin: 0 0 10px; color: #ccc; font-size: 16px; line-height: 1.6; text-align: center;">
                Hey ${displayName},
              </p>
              
              <p style="margin: 0 0 30px; color: #aaa; font-size: 15px; line-height: 1.6; text-align: center;">
                We received a request to reset your password. Click the button below to create a new password. This link will expire in <strong style="color: #c9a227;">1 hour</strong>.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center; padding: 20px 0;">
                    <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #c9a227 0%, #d4af37 100%); color: #0a0a0a; text-decoration: none; padding: 18px 50px; font-size: 16px; font-weight: bold; border-radius: 4px; text-transform: uppercase; letter-spacing: 2px;">
                      🔑 Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <div style="margin: 30px 0; padding: 20px; background: #111; border-left: 4px solid #c9a227; border-radius: 0 8px 8px 0;">
                <p style="margin: 0 0 10px; color: #c9a227; font-size: 14px; font-weight: bold;">
                  🛡️ Security Notice
                </p>
                <p style="margin: 0; color: #888; font-size: 13px; line-height: 1.5;">
                  If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
              </div>

              <!-- Alternative Link -->
              <div style="margin: 20px 0; padding: 15px; background: #0a0a0a; border: 1px dashed #333; border-radius: 4px;">
                <p style="margin: 0 0 10px; color: #666; font-size: 12px; text-align: center;">
                  Button not working? Copy and paste this link:
                </p>
                <p style="margin: 0; color: #c9a227; font-size: 11px; word-break: break-all; text-align: center;">
                  ${resetLink}
                </p>
              </div>

              <!-- Help Section -->
              <div style="text-align: center; margin-top: 30px;">
                <p style="margin: 0; color: #666; font-size: 13px;">
                  Need help? Contact us at 
                  <a href="mailto:support@darkpoint.co.za" style="color: #c9a227; text-decoration: none;">support@darkpoint.co.za</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #333; text-align: center;">
              <p style="margin: 0 0 10px; color: #666; font-size: 12px;">
                This is an automated security email from Darkpoint.
              </p>
              <p style="margin: 0 0 20px;">
                <a href="${SITE_URL}" style="color: #c9a227; text-decoration: none; margin: 0 10px;">Website</a>
                <a href="${SITE_URL}/store" style="color: #c9a227; text-decoration: none; margin: 0 10px;">Store</a>
                <a href="${SITE_URL}/contact" style="color: #c9a227; text-decoration: none; margin: 0 10px;">Support</a>
              </p>
              <p style="margin: 0; color: #444; font-size: 11px;">
                © ${new Date().getFullYear()} Darkpoint. All rights reserved.<br>
                This email was sent because a password reset was requested for your account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function buildResetEmailText(resetLink: string, displayName: string): string {
  return `
Darkpoint - Password Reset Request
====================================

Hey ${displayName},

We received a request to reset your password.

Click this link to create a new password:
${resetLink}

⚠️ This link will expire in 1 hour.

SECURITY NOTICE:
If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.

Need help? Contact us at support@darkpoint.co.za

---
© ${new Date().getFullYear()} Darkpoint. All rights reserved.
  `;
}

export async function POST(request: Request) {
  try {
    const body: ForgotPasswordRequest = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Generate a secure reset token
    const resetToken = generateResetToken();

    let userId: string | null = null;

    // Try RPC first
    const { data: tokenResult, error: tokenError } = await supabaseAdmin.rpc(
      "create_password_reset_token",
      {
        p_email: normalizedEmail,
        p_token: resetToken,
        p_expires_hours: 1,
      }
    );

    if (tokenError) {
      console.error("RPC error (trying direct method):", tokenError);
      
      // Fallback: Find user by email and create token directly
      const { data: userData } = await supabaseAdmin
        .from("user_profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .single();

      if (!userData) {
        // Also try auth.users table
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
        
        if (!authUser) {
          // Don't reveal if email exists
          return NextResponse.json({
            success: true,
            message: "If an account with that email exists, a password reset link has been sent.",
          });
        }
        userId = authUser.id;
      } else {
        userId = userData.id;
      }

      // Invalidate existing tokens for this user
      await supabaseAdmin
        .from("password_reset_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("used_at", null);

      // Create new token directly
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const { error: insertError } = await supabaseAdmin
        .from("password_reset_tokens")
        .insert({
          user_id: userId,
          email: normalizedEmail,
          token: resetToken,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error("Error inserting token:", insertError);
        return NextResponse.json({
          success: true,
          message: "If an account with that email exists, a password reset link has been sent.",
        });
      }
    } else {
      // If no user found via RPC, still return success (don't reveal if email exists)
      if (!tokenResult?.user_id) {
        return NextResponse.json({
          success: true,
          message: "If an account with that email exists, a password reset link has been sent.",
        });
      }
      userId = tokenResult.user_id;
    }

    if (!userId) {
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Get user's display name
    const { data: profileData } = await supabaseAdmin
      .from("user_profiles")
      .select("display_name, username")
      .eq("id", userId)
      .single();

    const displayName = profileData?.display_name || profileData?.username || normalizedEmail.split("@")[0];

    // Build reset link
    const resetLink = `${SITE_URL}/reset-password?token=${resetToken}`;

    // Send email via Postmark
    if (!POSTMARK_API_TOKEN) {
      console.warn("Postmark API token not configured");
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
        // In dev, include the link for testing
        ...(process.env.NODE_ENV === "development" && { resetLink }),
      });
    }

    const emailResponse = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": POSTMARK_API_TOKEN,
      },
      body: JSON.stringify({
        From: FROM_EMAIL,
        To: normalizedEmail,
        Subject: "🔐 Reset Your Darkpoint Password",
        HtmlBody: buildResetEmailHTML(resetLink, displayName),
        TextBody: buildResetEmailText(resetLink, displayName),
        MessageStream: "outbound",
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error("Postmark error:", error);
      // Still return success to not reveal email existence
    }

    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { sendEmail, isResendConfigured, addContact } from "@/lib/resend";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://darkpoint.co.za";

interface WelcomeEmailRequest {
  email: string;
  username?: string;
}

export async function POST(request: Request) {
  try {
    const body: WelcomeEmailRequest = await request.json();
    const { email, username } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    if (!isResendConfigured()) {
      console.warn("Resend API key not configured");
      return NextResponse.json(
        { success: true, message: "Email skipped (not configured)" },
        { status: 200 }
      );
    }

    const displayName = username || email.split("@")[0];
    const spinWheelUrl = `${SITE_URL}/rewards/spin`;
    const storeUrl = `${SITE_URL}/store`;

    // Build the HTML email
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Darkpoint!</title>
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

          <!-- Welcome Message -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #fff; font-size: 28px; text-align: center;">
                🎮 Welcome, ${displayName}! 🎮
              </h2>
              
              <p style="margin: 0 0 20px; color: #ccc; font-size: 16px; line-height: 1.6; text-align: center;">
                You've just joined the most epic gaming community! We're thrilled to have you on board, warrior.
              </p>

              <!-- Rewards Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #c9a227 0%, #8b7355 100%); border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 30px; text-align: center;">
                    <h3 style="margin: 0 0 15px; color: #0a0a0a; font-size: 22px;">🎁 YOUR WELCOME REWARDS 🎁</h3>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 10px 20px; text-align: center;">
                          <div style="font-size: 36px;">⭐</div>
                          <div style="color: #0a0a0a; font-size: 24px; font-weight: bold;">100 XP</div>
                          <div style="color: #333; font-size: 12px;">Bonus Points</div>
                        </td>
                        <td style="padding: 10px 20px; text-align: center;">
                          <div style="font-size: 36px;">🎡</div>
                          <div style="color: #0a0a0a; font-size: 24px; font-weight: bold;">1 FREE SPIN</div>
                          <div style="color: #333; font-size: 12px;">Spin to Win!</div>
                        </td>
                        <td style="padding: 10px 20px; text-align: center;">
                          <div style="font-size: 36px;">💰</div>
                          <div style="color: #0a0a0a; font-size: 24px; font-weight: bold;">10% OFF</div>
                          <div style="color: #333; font-size: 12px;">First Order</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Reward Info -->
              <div style="text-align: center; margin: 20px 0; padding: 15px; background: #111; border-radius: 8px; border-left: 3px solid #c9a227;">
                <p style="color: #c9a227; margin: 0 0 5px; font-size: 14px; font-weight: bold;">💡 HOW TO USE YOUR 10% DISCOUNT</p>
                <p style="color: #888; margin: 0; font-size: 13px;">
                  Your discount is automatically added to your <strong style="color: #fff;">My Rewards</strong> section!<br>
                  Just select it at checkout. Valid for 30 days.
                </p>
              </div>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 30px 0; text-align: center;">
                    <a href="${spinWheelUrl}" style="display: inline-block; background: linear-gradient(135deg, #c9a227 0%, #d4af37 100%); color: #0a0a0a; text-decoration: none; padding: 18px 40px; font-size: 18px; font-weight: bold; border-radius: 4px; text-transform: uppercase; letter-spacing: 2px;">
                      🎡 SPIN THE WHEEL NOW! 🎡
                    </a>
                    <p style="margin: 15px 0 0; color: #888; font-size: 14px;">
                      Use your free spin to win more rewards!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- What You Can Do -->
              <div style="margin: 30px 0; padding: 20px; background: #111; border-radius: 8px;">
                <h3 style="margin: 0 0 15px; color: #c9a227; font-size: 18px; text-align: center;">🎯 LEVEL UP YOUR GAME 🎯</h3>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 10px; text-align: center; width: 33%;">
                      <div style="font-size: 24px;">🛒</div>
                      <div style="color: #fff; font-size: 14px; margin-top: 5px;">Shop Elite Gear</div>
                    </td>
                    <td style="padding: 10px; text-align: center; width: 33%;">
                      <div style="font-size: 24px;">🏆</div>
                      <div style="color: #fff; font-size: 14px; margin-top: 5px;">Earn Achievements</div>
                    </td>
                    <td style="padding: 10px; text-align: center; width: 33%;">
                      <div style="font-size: 24px;">🎁</div>
                      <div style="color: #fff; font-size: 14px; margin-top: 5px;">Unlock Rewards</div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Shop CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center;">
                    <a href="${storeUrl}" style="display: inline-block; background: transparent; color: #c9a227; text-decoration: none; padding: 12px 30px; font-size: 14px; border: 2px solid #c9a227; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">
                      Browse the Store →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #333; text-align: center;">
              <p style="margin: 0 0 10px; color: #666; font-size: 12px;">
                Follow us for exclusive drops and giveaways!
              </p>
              <p style="margin: 0 0 20px;">
                <a href="#" style="color: #c9a227; text-decoration: none; margin: 0 10px;">Discord</a>
                <a href="#" style="color: #c9a227; text-decoration: none; margin: 0 10px;">Twitter</a>
                <a href="#" style="color: #c9a227; text-decoration: none; margin: 0 10px;">Instagram</a>
              </p>
              <p style="margin: 0; color: #444; font-size: 11px;">
                © ${new Date().getFullYear()} Darkpoint. All rights reserved.<br>
                You're receiving this because you signed up at darkpoint.co.za
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

    const textBody = `
Welcome to Darkpoint, ${displayName}! 🎮

You've just joined the most epic gaming community! We're thrilled to have you.

YOUR WELCOME REWARDS:
⭐ 100 XP - Bonus Points to get you started
🎡 1 FREE SPIN - Try your luck on the wheel!
💰 10% OFF - Your first order (automatically added to My Rewards - valid 30 days)

🎡 SPIN THE WHEEL NOW: ${spinWheelUrl}

Use your free spin to win discounts, XP, and more!

HOW TO USE YOUR 10% DISCOUNT:
Your discount is automatically added to your "My Rewards" section! Just select it at checkout.

Ready to gear up? Visit our store: ${storeUrl}

Game on!
The Darkpoint Team
    `;

    const normalizedEmail = email.toLowerCase().trim();
    const { error } = await sendEmail({
      to: normalizedEmail,
      subject: "🎮 Welcome to Darkpoint! Your 100 XP & Free Spin Await!",
      html: htmlBody,
      text: textBody,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to send email" },
        { status: 500 }
      );
    }

    // Add to Resend Audience (signup)
    const [first, ...rest] = (displayName || "").trim().split(/\s+/);
    const { error: contactError } = await addContact({
      email: normalizedEmail,
      firstName: first || undefined,
      lastName: rest.length ? rest.join(" ") : undefined,
    });
    if (contactError) {
      console.warn("Resend contact add (welcome):", contactError.message);
    }

    return NextResponse.json({ success: true, message: "Welcome email sent" });
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}


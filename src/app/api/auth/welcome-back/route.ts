import { NextRequest, NextResponse } from "next/server";
import { sendEmail, isResendConfigured } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, displayName } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!isResendConfigured()) {
      console.error("Resend API key is not configured");
      return NextResponse.json(
        { error: "Email service is not configured" },
        { status: 500 }
      );
    }

    const firstName = displayName?.split(" ")[0] || "Warrior";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a;">
          <!-- Header with gradient -->
          <div style="background: linear-gradient(135deg, #e08821 0%, #c47418 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">
              🎮 Darkpoint
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
              Your Gaming Gear Destination
            </p>
          </div>
          
          <!-- Main content -->
          <div style="padding: 40px 20px; background-color: #2a2a2a;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="font-size: 60px; margin-bottom: 15px;">👋</div>
              <h2 style="color: #e08821; margin: 0 0 10px 0; font-size: 28px;">Welcome Back, ${firstName}!</h2>
              <p style="color: #ccc; margin: 0; font-size: 16px;">We're glad to see you again!</p>
            </div>
            
            <div style="background-color: #3a3a3a; border-radius: 8px; padding: 25px; margin-bottom: 20px; text-align: center;">
              <p style="color: #fff; font-size: 16px; line-height: 1.6; margin: 0;">
                Your account has been successfully created. We noticed you've been with us before, 
                and we're thrilled to have you back in the community!
              </p>
            </div>

            <div style="background-color: #3a3a3a; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
              <h3 style="color: #e08821; margin: 0 0 15px 0; font-size: 18px; text-align: center;">🚀 Start Fresh!</h3>
              <p style="color: #ccc; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0; text-align: center;">
                Since you're starting over, here's how you can earn XP and rewards:
              </p>
              <ul style="color: #ccc; margin: 0; padding-left: 20px; line-height: 2;">
                <li>Login daily to build your streak and earn XP (starting from Day 2)</li>
                <li>Complete daily quests for bonus XP</li>
                <li>Unlock achievements as you explore</li>
                <li>Refer friends to earn XP and bonuses</li>
                <li>Make purchases to level up faster</li>
                <li>Write reviews to help the community</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://darkpoint.co.za/account" 
                 style="display: inline-block; background: linear-gradient(135deg, #e08821 0%, #c47418 100%); color: white; padding: 15px 40px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-radius: 4px;">
                Visit Your Account
              </a>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="https://darkpoint.co.za/store" 
                 style="display: inline-block; background: transparent; color: #e08821; padding: 12px 30px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border: 2px solid #e08821; border-radius: 4px;">
                Browse Store →
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="padding: 20px; text-align: center; background-color: #1a1a1a; border-top: 1px solid #3a3a3a;">
            <p style="color: #666; font-size: 12px; margin: 0 0 10px 0;">
              Need help? Contact us at <a href="mailto:support@darkpoint.co.za" style="color: #e08821;">support@darkpoint.co.za</a>
            </p>
            <p style="color: #666; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Darkpoint. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Welcome Back, ${firstName}!

We're glad to see you again!

Your account has been successfully created. We noticed you've been with us before, and we're thrilled to have you back in the community!

Start Fresh!
Since you're starting over, here's how you can earn XP and rewards:
- Login daily to build your streak and earn XP (starting from Day 2)
- Complete daily quests for bonus XP
- Unlock achievements as you explore
- Refer friends to earn XP and bonuses
- Make purchases to level up faster
- Write reviews to help the community

Visit your account: https://darkpoint.co.za/account
Browse store: https://darkpoint.co.za/store

Need help? Contact us at support@darkpoint.co.za

© ${new Date().getFullYear()} Darkpoint. All rights reserved.
    `.trim();

    const { error } = await sendEmail({
      to: email,
      subject: `👋 Welcome Back to Darkpoint, ${firstName}!`,
      html: emailHtml,
      text: textBody,
    });

    if (error) {
      console.error("Resend API error:", error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Welcome back email error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}


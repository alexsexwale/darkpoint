import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, isResendConfigured } from "@/lib/resend";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Subscribe to newsletter
    const { data, error } = await supabase.rpc("subscribe_newsletter", {
      p_email: email.toLowerCase().trim(),
    });

    if (error) {
      console.error("Newsletter subscription error:", error);
      
      // Fallback: direct insert
      const { error: insertError } = await supabase
        .from("newsletter_subscriptions")
        .upsert({
          email: email.toLowerCase().trim(),
          source: "website",
          is_subscribed: true,
        }, { onConflict: "email" });

      if (insertError) {
        throw insertError;
      }
    }

    // Send welcome email if it's a new subscription
    const isNew = data?.is_new ?? true;
    
    if (isNew && isResendConfigured()) {
      const { error } = await sendEmail({
        to: email,
        subject: "🎮 Welcome to Darkpoint! Your Gaming Journey Starts Here",
        html: generateNewsletterWelcomeEmail(email),
        text: generateNewsletterWelcomeText(email),
      });
      if (error) {
        console.error("Error sending newsletter welcome email:", error);
        // Don't fail the subscription if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to newsletter!",
      isNew,
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe to newsletter" },
      { status: 500 }
    );
  }
}

function generateNewsletterWelcomeEmail(email: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";
  
  return `
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
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border: 1px solid #333; border-radius: 8px;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #333;">
              <img src="${baseUrl}/images/logo.png" alt="Darkpoint" style="max-width: 200px; height: auto;" />
            </td>
          </tr>
          
          <!-- Hero Section -->
          <tr>
            <td style="padding: 40px; text-align: center;">
              <div style="font-size: 60px; margin-bottom: 20px;">🎮✨</div>
              <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 10px; font-weight: bold;">
                You're In, Gamer!
              </h1>
              <p style="color: #c9a227; font-size: 18px; margin: 0; font-weight: bold;">
                Welcome to the Darkpoint Newsletter
              </p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0 0 20px; text-align: center;">
                Thanks for joining our gaming community! You're now on the inside track for:
              </p>
              
              <!-- Benefits -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 15px; background: rgba(201, 162, 39, 0.1); border-left: 3px solid #c9a227; margin-bottom: 10px;">
                    <span style="font-size: 24px;">🎁</span>
                    <span style="color: #ffffff; font-size: 14px; margin-left: 10px;">Exclusive deals & early access to sales</span>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>
                <tr>
                  <td style="padding: 15px; background: rgba(201, 162, 39, 0.1); border-left: 3px solid #c9a227;">
                    <span style="font-size: 24px;">⚡</span>
                    <span style="color: #ffffff; font-size: 14px; margin-left: 10px;">First look at new gaming gear & tech</span>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>
                <tr>
                  <td style="padding: 15px; background: rgba(201, 162, 39, 0.1); border-left: 3px solid #c9a227;">
                    <span style="font-size: 24px;">💡</span>
                    <span style="color: #ffffff; font-size: 14px; margin-left: 10px;">Pro tips & product recommendations</span>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(201, 162, 39, 0.2) 0%, rgba(201, 162, 39, 0.05) 100%); border: 2px solid #c9a227; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 30px; text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 15px;">🎰</div>
                    <h2 style="color: #c9a227; font-size: 22px; margin: 0 0 10px;">
                      Want Even More Rewards?
                    </h2>
                    <p style="color: #ffffff; font-size: 16px; margin: 0 0 20px;">
                      Create a free account and unlock:
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 20px;">
                      <tr>
                        <td style="color: #c9a227; font-size: 16px; padding: 5px 0;">✓ 100 Bonus XP to level up</td>
                      </tr>
                      <tr>
                        <td style="color: #c9a227; font-size: 16px; padding: 5px 0;">✓ 1 FREE Spin on our prize wheel</td>
                      </tr>
                      <tr>
                        <td style="color: #c9a227; font-size: 16px; padding: 5px 0;">✓ 10% OFF your first order</td>
                      </tr>
                    </table>
                    <a href="${baseUrl}/rewards" style="display: inline-block; background: linear-gradient(135deg, #c9a227 0%, #a88b1f 100%); color: #000000; text-decoration: none; padding: 15px 40px; font-size: 16px; font-weight: bold; border-radius: 4px; text-transform: uppercase;">
                      Create Account & Spin Now →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #888888; font-size: 14px; text-align: center; margin: 0;">
                Get ready for legendary deals and epic gaming content!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background: #0a0a0a; border-top: 1px solid #333; text-align: center;">
              <p style="color: #666666; font-size: 12px; margin: 0 0 10px;">
                You're receiving this because you subscribed at ${email}
              </p>
              <p style="color: #666666; font-size: 12px; margin: 0;">
                <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #888888;">Unsubscribe</a> • 
                <a href="${baseUrl}" style="color: #888888;">Darkpoint</a>
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

function generateNewsletterWelcomeText(email: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";
  
  return `
🎮 You're In, Gamer!

Welcome to the Darkpoint Newsletter!

Thanks for joining our gaming community! You're now on the inside track for:

🎁 Exclusive deals & early access to sales
⚡ First look at new gaming gear & tech  
💡 Pro tips & product recommendations

---

🎰 WANT EVEN MORE REWARDS?

Create a free account and unlock:
✓ 100 Bonus XP to level up
✓ 1 FREE Spin on our prize wheel
✓ 10% OFF your first order

Create your account now: ${baseUrl}/rewards

---

Get ready for legendary deals and epic gaming content!

- The Darkpoint Team

Unsubscribe: ${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}
`;
}


import { NextRequest, NextResponse } from "next/server";
import { sendEmail, isResendConfigured } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviewId, reason, details, reviewTitle, reviewContent, reviewAuthor, productId, reporterEmail } = body;

    // Validate required fields
    if (!reviewId || !reason) {
      return NextResponse.json(
        { error: "Review ID and reason are required" },
        { status: 400 }
      );
    }

    if (!isResendConfigured()) {
      console.error("Resend API key is not configured");
      return NextResponse.json(
        { success: true, emailSent: false, message: "Report submitted but email notification failed" },
        { status: 200 }
      );
    }

    // Format reason for display
    const reasonLabels: Record<string, string> = {
      spam: "Spam or Advertising",
      inappropriate: "Inappropriate Content",
      fake: "Fake or Misleading Review",
      offensive: "Offensive Language",
      other: "Other",
    };

    const formattedReason = reasonLabels[reason] || reason;

    const supportEmail = "support@darkpoint.co.za";
    const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #e08821 0%, #c47418 100%); padding: 30px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">
                  🚨 Review Reported
                </h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 30px 20px; background-color: #2a2a2a;">
                <div style="background-color: #3a3a3a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <h2 style="color: #e08821; margin: 0 0 15px 0; font-size: 18px;">Report Details</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="color: #888; padding: 8px 0; vertical-align: top; width: 120px;">Reason:</td>
                      <td style="color: #fff; padding: 8px 0;"><strong style="color: #ff6b6b;">${formattedReason}</strong></td>
                    </tr>
                    ${details ? `
                    <tr>
                      <td style="color: #888; padding: 8px 0; vertical-align: top;">Details:</td>
                      <td style="color: #fff; padding: 8px 0;">${details}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="color: #888; padding: 8px 0; vertical-align: top;">Review ID:</td>
                      <td style="color: #fff; padding: 8px 0; font-family: monospace; font-size: 12px;">${reviewId}</td>
                    </tr>
                    ${productId ? `
                    <tr>
                      <td style="color: #888; padding: 8px 0; vertical-align: top;">Product ID:</td>
                      <td style="color: #fff; padding: 8px 0; font-family: monospace; font-size: 12px;">${productId}</td>
                    </tr>
                    ` : ''}
                    ${reporterEmail ? `
                    <tr>
                      <td style="color: #888; padding: 8px 0; vertical-align: top;">Reported by:</td>
                      <td style="color: #fff; padding: 8px 0;">${reporterEmail}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>

                ${reviewTitle || reviewContent ? `
                <div style="background-color: #3a3a3a; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #ff6b6b;">
                  <h2 style="color: #e08821; margin: 0 0 15px 0; font-size: 18px;">Reported Review</h2>
                  ${reviewAuthor ? `<p style="color: #888; margin: 0 0 10px 0; font-size: 14px;">By: ${reviewAuthor}</p>` : ''}
                  ${reviewTitle ? `<h3 style="color: #fff; margin: 0 0 10px 0; font-size: 16px;">${reviewTitle}</h3>` : ''}
                  ${reviewContent ? `<p style="color: #ccc; margin: 0; line-height: 1.6;">${reviewContent}</p>` : ''}
                </div>
                ` : ''}

                <div style="background-color: #3a3a3a; border-radius: 8px; padding: 20px;">
                  <h2 style="color: #e08821; margin: 0 0 15px 0; font-size: 18px;">Actions Required</h2>
                  <ul style="color: #ccc; margin: 0; padding-left: 20px; line-height: 1.8;">
                    <li>Review the reported content in the Supabase dashboard</li>
                    <li>Decide whether to approve, edit, or remove the review</li>
                    <li>Update the report status in the database</li>
                  </ul>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="padding: 20px; text-align: center; background-color: #1a1a1a;">
                <p style="color: #666; font-size: 12px; margin: 0;">
                  This is an automated notification from Darkpoint Reviews System
                </p>
                <p style="color: #666; font-size: 12px; margin: 10px 0 0 0;">
                  © ${new Date().getFullYear()} Darkpoint. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

    const textBody = `
🚨 REVIEW REPORTED

Report Details
--------------
Reason: ${formattedReason}
${details ? `Details: ${details}` : ''}
Review ID: ${reviewId}
${productId ? `Product ID: ${productId}` : ''}
${reporterEmail ? `Reported by: ${reporterEmail}` : ''}

${reviewTitle || reviewContent ? `
Reported Review
---------------
${reviewAuthor ? `By: ${reviewAuthor}` : ''}
${reviewTitle ? `Title: ${reviewTitle}` : ''}
${reviewContent ? `Content: ${reviewContent}` : ''}
` : ''}

Actions Required
----------------
- Review the reported content in the Supabase dashboard
- Decide whether to approve, edit, or remove the review
- Update the report status in the database

---
This is an automated notification from Darkpoint Reviews System
    `.trim();

    const { error } = await sendEmail({
      to: supportEmail,
      subject: `🚨 Review Report: ${formattedReason}`,
      html,
      text: textBody,
    });

    if (error) {
      console.error("Resend API error:", error);
      return NextResponse.json(
        { success: true, emailSent: false, message: "Report submitted but email notification failed" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        emailSent: true,
        message: "Report submitted and admin notified",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Report review error:", error);
    return NextResponse.json(
      { success: true, emailSent: false, error: "Report submitted but email notification failed" },
      { status: 200 }
    );
  }
}


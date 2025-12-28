import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Get Postmark credentials from environment variables
    const postmarkApiToken = process.env.POSTMARK_SERVER_TOKEN || process.env.POSTMARK_API_TOKEN;
    const postmarkFromEmail = process.env.POSTMARK_FROM_EMAIL || "noreply@darkpoint.co.za";
    const postmarkToEmail = process.env.POSTMARK_TO_EMAIL || "support@darkpoint.co.za";

    if (!postmarkApiToken) {
      console.error("Postmark API token is not configured");
      return NextResponse.json(
        { error: "Email service is not configured. Please try again later." },
        { status: 500 }
      );
    }

    // Send email via Postmark API
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkApiToken,
      },
      body: JSON.stringify({
        From: postmarkFromEmail,
        To: postmarkToEmail,
        Subject: `New Contact Form Submission from ${name}`,
        HtmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e08821; border-bottom: 2px solid #e08821; padding-bottom: 10px;">
              New Contact Form Submission
            </h2>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              <p><strong>Message:</strong></p>
              <div style="background-color: white; padding: 15px; border-left: 3px solid #e08821; margin-top: 10px;">
                ${message.replace(/\n/g, "<br>")}
              </div>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              This email was sent from the Dark Point contact form.
            </p>
          </div>
        `,
        TextBody: `
New Contact Form Submission

Name: ${name}
Email: ${email}

Message:
${message}

---
This email was sent from the Dark Point contact form.
        `.trim(),
        ReplyTo: email,
        MessageStream: "outbound",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Postmark API error:", errorData);
      return NextResponse.json(
        { error: "Failed to send email. Please try again later." },
        { status: 500 }
      );
    }

    const result = await response.json();

    return NextResponse.json(
      {
        success: true,
        message: "Thank you for contacting us! We'll get back to you soon.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}


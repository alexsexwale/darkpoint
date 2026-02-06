import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "support@darkpoint.co.za";

function getResend() {
  if (!RESEND_API_KEY) return null;
  return new Resend(RESEND_API_KEY);
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Send an email via Resend. Returns { data, error }.
 * If Resend is not configured (RESEND_API_KEY missing), returns { data: null, error: 'Resend not configured' }.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ data: { id?: string } | null; error: Error | null }> {
  const resend = getResend();
  if (!resend) {
    return { data: null, error: new Error("Resend not configured") };
  }
  const { to, subject, html, text, replyTo } = options;
  const payload: Parameters<Resend["emails"]["send"]>[0] = {
    from: FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };
  if (text) payload.text = text;
  if (replyTo) payload.replyTo = replyTo;
  const { data, error } = await resend.emails.send(payload);
  return { data, error };
}

export function isResendConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

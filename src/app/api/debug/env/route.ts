import { NextResponse } from 'next/server';

// Debug endpoint to check environment variables (remove after debugging)
export async function GET() {
  return NextResponse.json({
    cjEmail: process.env.CJ_DROPSHIPPING_EMAIL ? 'SET' : 'NOT SET',
    cjEmailAlt: process.env.CJDROPSHIPPING_EMAIL ? 'SET' : 'NOT SET',
    cjPassword: process.env.CJ_DROPSHIPPING_PASSWORD ? 'SET' : 'NOT SET',
    cjPasswordAlt: process.env.CJDROPSHIPPING_PASSWORD ? 'SET' : 'NOT SET',
    cjUserId: process.env.CJ_DROPSHIPPING_USER_ID ? 'SET' : 'NOT SET',
    cjUserIdAlt: process.env.CJDROPSHIPPING_USER_ID ? 'SET' : 'NOT SET',
    cjKey: process.env.CJ_DROPSHIPPING_KEY ? 'SET' : 'NOT SET',
    cjKeyAlt: process.env.CJDROPSHIPPING_KEY ? 'SET' : 'NOT SET',
    cjApiUrl: process.env.CJ_DROPSHIPPING_API_URL || process.env.CJDROPSHIPPING_API_URL || 'DEFAULT',
    nodeEnv: process.env.NODE_ENV,
    // Check if any value is actually empty string
    emailLength: (process.env.CJ_DROPSHIPPING_EMAIL || '').length,
    passwordLength: (process.env.CJ_DROPSHIPPING_PASSWORD || '').length,
  });
}


# Supabase Setup Guide for Dark Point

This guide will help you set up Supabase authentication and database for the Dark Point website.

## 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and sign in or create an account
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: Dark Point (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose the closest to your users
5. Click "Create new project" and wait for it to be ready

## 2. Get Your API Keys

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Add these to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Run Database Migrations

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase/migrations/001_gamification_schema.sql`
4. Paste it into the SQL Editor
5. Click "Run" to execute the migration

This creates all necessary tables:
- `user_profiles` - Extended user data with XP, streaks, etc.
- `levels` - Level definitions and rewards
- `achievements` - Achievement definitions
- `user_achievements` - Unlocked achievements per user
- `daily_logins` - Daily login tracking
- `spin_prizes` - Spin wheel prizes
- `spin_history` - User spin history
- `referrals` - Referral tracking
- `rewards` - Rewards shop items
- `user_rewards` - Claimed rewards
- `mystery_boxes` - Mystery box definitions
- `mystery_box_purchases` - Purchase history
- `xp_transactions` - XP audit log
- `user_coupons` - Generated coupons

## 4. Configure Authentication

### Enable Email Auth (Default)

1. Go to **Authentication** > **Providers**
2. Ensure "Email" is enabled
3. Configure settings:
   - **Confirm email**: Enable for production (optional for development)
   - **Secure email change**: Enable
   - **Enable password recovery**: Enable

### Configure Email Templates

1. Go to **Authentication** > **Email Templates**
2. Customize templates for:
   - **Confirm signup** - Welcome email with verification link
   - **Reset password** - Password reset email
   - **Magic link** - If using magic links

Example templates:

**Confirm Signup:**
```html
<h2>Welcome to Dark Point!</h2>
<p>Thanks for signing up. Click the link below to confirm your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

**Reset Password:**
```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your Dark Point password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

### Enable Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to **APIs & Services** > **Credentials**
4. Click "Create Credentials" > "OAuth 2.0 Client IDs"
5. Configure:
   - **Application type**: Web application
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (development)
     - `https://your-domain.com` (production)
   - **Authorized redirect URIs**:
     - `https://your-project-id.supabase.co/auth/v1/callback`
6. Copy the **Client ID** and **Client Secret**
7. In Supabase, go to **Authentication** > **Providers** > **Google**
8. Enable Google and paste your credentials

### Enable GitHub OAuth (Optional)

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Configure:
   - **Application name**: Dark Point
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://your-project-id.supabase.co/auth/v1/callback`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**
6. In Supabase, go to **Authentication** > **Providers** > **GitHub**
7. Enable GitHub and paste your credentials

## 5. Configure Site URL

1. Go to **Authentication** > **URL Configuration**
2. Set your **Site URL**:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`
   - `http://localhost:3000/reset-password`
   - `https://your-domain.com/reset-password`

## 6. Test Authentication

1. Start your development server: `npm run dev`
2. Click the user icon in the navbar
3. Try registering a new account
4. Check your email for confirmation (if enabled)
5. Try signing in
6. Test "Forgot password" flow
7. Test Google/GitHub OAuth (if configured)

## 7. Production Checklist

- [ ] Enable email confirmation
- [ ] Configure custom SMTP for emails (optional but recommended)
- [ ] Set up custom domain (optional)
- [ ] Enable RLS policies (already included in migration)
- [ ] Configure rate limiting
- [ ] Set up proper redirect URLs for production
- [ ] Test all auth flows in production

## Troubleshooting

### "Invalid login credentials"
- Check if email is confirmed
- Verify password is correct
- Check if user exists

### OAuth redirect errors
- Verify redirect URLs in provider settings
- Check Site URL in Supabase settings
- Ensure callback URL matches exactly

### Email not received
- Check spam folder
- Verify SMTP settings (if using custom)
- Check Supabase logs for email errors

### "User profile not created"
- Check if the `handle_new_user()` trigger is working
- Verify RLS policies allow profile insertion
- Check Supabase logs for trigger errors

## Database Schema Overview

```
auth.users (Supabase managed)
    ↓ (trigger: on_auth_user_created)
user_profiles
    ├── user_achievements
    ├── daily_logins
    ├── spin_history
    ├── referrals
    ├── user_rewards
    ├── mystery_box_purchases
    ├── xp_transactions
    └── user_coupons
```

## Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com/)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)


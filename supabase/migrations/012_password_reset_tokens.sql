-- Migration: Password Reset Tokens
-- Description: Create table for storing password reset tokens (used with custom Resend emails)

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure token is unique
  CONSTRAINT unique_active_token UNIQUE (user_id, token)
);

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- Enable RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only service role can access these
DROP POLICY IF EXISTS "Service role can manage password reset tokens" ON password_reset_tokens;
CREATE POLICY "Service role can manage password reset tokens"
  ON password_reset_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to create a password reset token
CREATE OR REPLACE FUNCTION create_password_reset_token(
  p_email TEXT,
  p_token TEXT,
  p_expires_hours INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = LOWER(p_email);
  
  IF v_user_id IS NULL THEN
    -- Don't reveal if email exists or not (security)
    RETURN json_build_object(
      'success', true,
      'message', 'If an account with that email exists, a reset link has been sent.'
    );
  END IF;
  
  -- Invalidate any existing tokens for this user
  UPDATE password_reset_tokens
  SET used_at = NOW()
  WHERE user_id = v_user_id AND used_at IS NULL;
  
  -- Create new token
  INSERT INTO password_reset_tokens (user_id, email, token, expires_at)
  VALUES (
    v_user_id,
    LOWER(p_email),
    p_token,
    NOW() + (p_expires_hours || ' hours')::INTERVAL
  );
  
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'Reset token created'
  );
END;
$$;

-- Function to validate and consume a password reset token
CREATE OR REPLACE FUNCTION validate_password_reset_token(
  p_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_record RECORD;
BEGIN
  -- Find valid token
  SELECT * INTO v_token_record
  FROM password_reset_tokens
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > NOW();
  
  IF v_token_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired reset link. Please request a new one.'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'user_id', v_token_record.user_id,
    'email', v_token_record.email
  );
END;
$$;

-- Function to consume a password reset token (mark as used)
CREATE OR REPLACE FUNCTION consume_password_reset_token(
  p_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE password_reset_tokens
  SET used_at = NOW()
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > NOW();
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Token already used or expired'
    );
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$;

-- Cleanup function to remove old tokens (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_password_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days'
     OR used_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;


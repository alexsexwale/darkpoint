-- Create table to track VIP prize activations
CREATE TABLE IF NOT EXISTS user_vip_prizes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  prize_id INTEGER NOT NULL, -- Index of the prize in the rotation
  prize_name TEXT NOT NULL,
  prize_description TEXT,
  prize_icon TEXT,
  prize_discount_type TEXT,
  prize_discount_value INTEGER,
  prize_min_order_value INTEGER DEFAULT 0,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each user can only have one prize per week
  UNIQUE(user_id, week_number, year)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_vip_prizes_user_week 
ON user_vip_prizes(user_id, week_number, year);

-- Enable RLS
ALTER TABLE user_vip_prizes ENABLE ROW LEVEL SECURITY;

-- Users can read their own prizes
CREATE POLICY "Users can view their own VIP prizes"
ON user_vip_prizes FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own prizes
CREATE POLICY "Users can activate their own VIP prizes"
ON user_vip_prizes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own prizes (mark as used)
CREATE POLICY "Users can update their own VIP prizes"
ON user_vip_prizes FOR UPDATE
USING (auth.uid() = user_id);

-- Function to activate a VIP prize
CREATE OR REPLACE FUNCTION activate_vip_prize(
  p_user_id UUID,
  p_week_number INTEGER,
  p_year INTEGER,
  p_prize_id INTEGER,
  p_prize_name TEXT,
  p_prize_description TEXT,
  p_prize_icon TEXT,
  p_prize_discount_type TEXT,
  p_prize_discount_value INTEGER,
  p_prize_min_order_value INTEGER,
  p_expires_at TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
  v_existing RECORD;
  v_result RECORD;
BEGIN
  -- Check if already activated this week
  SELECT * INTO v_existing 
  FROM user_vip_prizes 
  WHERE user_id = p_user_id 
    AND week_number = p_week_number 
    AND year = p_year;
  
  IF FOUND THEN
    -- Return existing activation
    RETURN jsonb_build_object(
      'success', true,
      'already_activated', true,
      'prize', jsonb_build_object(
        'id', v_existing.prize_id,
        'name', v_existing.prize_name,
        'description', v_existing.prize_description,
        'icon', v_existing.prize_icon,
        'discount_type', v_existing.prize_discount_type,
        'discount_value', v_existing.prize_discount_value,
        'min_order_value', v_existing.prize_min_order_value
      ),
      'activated_at', v_existing.activated_at,
      'expires_at', v_existing.expires_at,
      'used_at', v_existing.used_at
    );
  END IF;
  
  -- Insert new activation
  INSERT INTO user_vip_prizes (
    user_id, week_number, year, prize_id, prize_name, 
    prize_description, prize_icon, prize_discount_type,
    prize_discount_value, prize_min_order_value, expires_at
  ) VALUES (
    p_user_id, p_week_number, p_year, p_prize_id, p_prize_name,
    p_prize_description, p_prize_icon, p_prize_discount_type,
    p_prize_discount_value, p_prize_min_order_value, p_expires_at
  )
  RETURNING * INTO v_result;
  
  RETURN jsonb_build_object(
    'success', true,
    'already_activated', false,
    'prize', jsonb_build_object(
      'id', v_result.prize_id,
      'name', v_result.prize_name,
      'description', v_result.prize_description,
      'icon', v_result.prize_icon,
      'discount_type', v_result.prize_discount_type,
      'discount_value', v_result.prize_discount_value,
      'min_order_value', v_result.prize_min_order_value
    ),
    'activated_at', v_result.activated_at,
    'expires_at', v_result.expires_at,
    'used_at', v_result.used_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark VIP prize as used
CREATE OR REPLACE FUNCTION mark_vip_prize_used(
  p_user_id UUID,
  p_week_number INTEGER,
  p_year INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_result RECORD;
BEGIN
  UPDATE user_vip_prizes
  SET used_at = NOW()
  WHERE user_id = p_user_id 
    AND week_number = p_week_number 
    AND year = p_year
    AND used_at IS NULL
  RETURNING * INTO v_result;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active prize found');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'used_at', v_result.used_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current VIP prize status
CREATE OR REPLACE FUNCTION get_vip_prize_status(
  p_user_id UUID,
  p_week_number INTEGER,
  p_year INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_prize RECORD;
BEGIN
  SELECT * INTO v_prize 
  FROM user_vip_prizes 
  WHERE user_id = p_user_id 
    AND week_number = p_week_number 
    AND year = p_year;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'activated', false,
      'used', false,
      'prize', null
    );
  END IF;
  
  RETURN jsonb_build_object(
    'activated', true,
    'used', v_prize.used_at IS NOT NULL,
    'prize', jsonb_build_object(
      'id', v_prize.prize_id,
      'name', v_prize.prize_name,
      'description', v_prize.prize_description,
      'icon', v_prize.prize_icon,
      'discount_type', v_prize.prize_discount_type,
      'discount_value', v_prize.prize_discount_value,
      'min_order_value', v_prize.prize_min_order_value
    ),
    'activated_at', v_prize.activated_at,
    'expires_at', v_prize.expires_at,
    'used_at', v_prize.used_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


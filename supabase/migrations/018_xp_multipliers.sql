-- ===========================================
-- XP Multipliers System
-- ===========================================

-- Table to track active XP multipliers for users
CREATE TABLE IF NOT EXISTS user_xp_multipliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.5,
  source VARCHAR(50) NOT NULL, -- 'daily_reward', 'spin_wheel', 'promotion', 'purchase', etc.
  source_description TEXT, -- Human-readable description
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  xp_earned_with_multiplier INTEGER NOT NULL DEFAULT 0, -- Track how much bonus XP was earned
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_xp_multipliers_user_active 
  ON user_xp_multipliers(user_id, is_active, expires_at);

CREATE INDEX IF NOT EXISTS idx_user_xp_multipliers_expires 
  ON user_xp_multipliers(expires_at) WHERE is_active = true;

-- Enable RLS
ALTER TABLE user_xp_multipliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own multipliers" ON user_xp_multipliers;
CREATE POLICY "Users can view their own multipliers" ON user_xp_multipliers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage multipliers" ON user_xp_multipliers;
CREATE POLICY "System can manage multipliers" ON user_xp_multipliers
  FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON user_xp_multipliers TO authenticated;
GRANT ALL ON user_xp_multipliers TO service_role;

-- ===========================================
-- Function to get active XP multiplier for a user
-- ===========================================
CREATE OR REPLACE FUNCTION get_active_xp_multiplier(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  multiplier DECIMAL(3,2),
  source VARCHAR(50),
  source_description TEXT,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  time_remaining_seconds INTEGER,
  xp_earned_with_multiplier INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First, deactivate any expired multipliers
  UPDATE user_xp_multipliers 
  SET is_active = false, updated_at = NOW()
  WHERE user_id = p_user_id 
    AND is_active = true 
    AND expires_at < NOW();

  -- Return the active multiplier (if any)
  RETURN QUERY
  SELECT 
    m.id,
    m.multiplier,
    m.source,
    m.source_description,
    m.starts_at,
    m.expires_at,
    EXTRACT(EPOCH FROM (m.expires_at - NOW()))::INTEGER AS time_remaining_seconds,
    m.xp_earned_with_multiplier
  FROM user_xp_multipliers m
  WHERE m.user_id = p_user_id
    AND m.is_active = true
    AND m.expires_at > NOW()
  ORDER BY m.multiplier DESC
  LIMIT 1;
END;
$$;

-- ===========================================
-- Function to grant XP multiplier to a user
-- ===========================================
CREATE OR REPLACE FUNCTION grant_xp_multiplier(
  p_user_id UUID,
  p_multiplier DECIMAL(3,2),
  p_duration_hours INTEGER,
  p_source VARCHAR(50),
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_multiplier RECORD;
  v_new_multiplier_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Calculate expiration time
  v_expires_at := NOW() + (p_duration_hours || ' hours')::INTERVAL;
  
  -- Check for existing active multiplier
  SELECT * INTO v_existing_multiplier
  FROM user_xp_multipliers
  WHERE user_id = p_user_id
    AND is_active = true
    AND expires_at > NOW()
  ORDER BY multiplier DESC
  LIMIT 1;
  
  -- If there's an existing higher or equal multiplier, extend it instead
  IF v_existing_multiplier IS NOT NULL AND v_existing_multiplier.multiplier >= p_multiplier THEN
    -- Extend the existing multiplier
    UPDATE user_xp_multipliers
    SET expires_at = GREATEST(expires_at, v_expires_at),
        updated_at = NOW()
    WHERE id = v_existing_multiplier.id;
    
    RETURN json_build_object(
      'success', true,
      'action', 'extended',
      'multiplier_id', v_existing_multiplier.id,
      'multiplier', v_existing_multiplier.multiplier,
      'expires_at', GREATEST(v_existing_multiplier.expires_at, v_expires_at)
    );
  END IF;
  
  -- If there's a lower multiplier, deactivate it
  IF v_existing_multiplier IS NOT NULL THEN
    UPDATE user_xp_multipliers
    SET is_active = false, updated_at = NOW()
    WHERE id = v_existing_multiplier.id;
  END IF;
  
  -- Create new multiplier
  INSERT INTO user_xp_multipliers (
    user_id, multiplier, source, source_description, starts_at, expires_at
  )
  VALUES (
    p_user_id, p_multiplier, p_source, COALESCE(p_description, p_source), NOW(), v_expires_at
  )
  RETURNING id INTO v_new_multiplier_id;
  
  RETURN json_build_object(
    'success', true,
    'action', 'created',
    'multiplier_id', v_new_multiplier_id,
    'multiplier', p_multiplier,
    'expires_at', v_expires_at,
    'duration_hours', p_duration_hours
  );
END;
$$;

-- ===========================================
-- Updated add_xp function with multiplier support
-- ===========================================
CREATE OR REPLACE FUNCTION add_xp_with_multiplier(
  p_user_id UUID,
  p_amount INTEGER,
  p_action xp_action,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_multiplier RECORD;
  v_base_amount INTEGER;
  v_bonus_amount INTEGER;
  v_total_amount INTEGER;
  v_old_xp INTEGER;
  v_new_xp INTEGER;
  v_old_level INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Get base amount
  v_base_amount := p_amount;
  v_bonus_amount := 0;
  
  -- Check for active multiplier
  SELECT * INTO v_multiplier
  FROM get_active_xp_multiplier(p_user_id);
  
  -- Apply multiplier if active
  IF v_multiplier IS NOT NULL AND v_multiplier.multiplier > 1 THEN
    v_bonus_amount := FLOOR(v_base_amount * (v_multiplier.multiplier - 1));
    v_total_amount := v_base_amount + v_bonus_amount;
    
    -- Update multiplier stats
    UPDATE user_xp_multipliers
    SET xp_earned_with_multiplier = xp_earned_with_multiplier + v_bonus_amount,
        updated_at = NOW()
    WHERE id = v_multiplier.id;
  ELSE
    v_total_amount := v_base_amount;
  END IF;
  
  -- Get current XP and level
  SELECT total_xp, current_level INTO v_old_xp, v_old_level
  FROM user_profiles
  WHERE id = p_user_id;
  
  IF v_old_xp IS NULL THEN
    v_old_xp := 0;
    v_old_level := 1;
  END IF;
  
  -- Calculate new XP
  v_new_xp := v_old_xp + v_total_amount;
  
  -- Calculate new level (using level thresholds)
  SELECT COALESCE(MAX(level), 1) INTO v_new_level
  FROM levels
  WHERE xp_required <= v_new_xp;
  
  -- Update user profile
  UPDATE user_profiles
  SET total_xp = v_new_xp,
      current_level = v_new_level,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log the transaction
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (
    p_user_id, 
    v_total_amount, 
    p_action, 
    CASE 
      WHEN v_bonus_amount > 0 THEN 
        COALESCE(p_description, p_action::TEXT) || ' (+' || v_bonus_amount || ' bonus from ' || v_multiplier.multiplier || 'x multiplier)'
      ELSE 
        COALESCE(p_description, p_action::TEXT)
    END
  );
  
  RETURN json_build_object(
    'success', true,
    'base_xp', v_base_amount,
    'bonus_xp', v_bonus_amount,
    'total_xp_earned', v_total_amount,
    'multiplier_applied', v_multiplier.multiplier,
    'total_xp', v_new_xp,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'leveled_up', v_new_level > v_old_level
  );
END;
$$;

-- ===========================================
-- Function to get multiplier history for a user
-- ===========================================
CREATE OR REPLACE FUNCTION get_xp_multiplier_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  multiplier DECIMAL(3,2),
  source VARCHAR(50),
  source_description TEXT,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN,
  xp_earned_with_multiplier INTEGER,
  was_fully_used BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.multiplier,
    m.source,
    m.source_description,
    m.starts_at,
    m.expires_at,
    m.is_active AND m.expires_at > NOW() AS is_active,
    m.xp_earned_with_multiplier,
    m.expires_at < NOW() AS was_fully_used
  FROM user_xp_multipliers m
  WHERE m.user_id = p_user_id
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_active_xp_multiplier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_xp_multiplier(UUID, DECIMAL, INTEGER, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_xp_with_multiplier(UUID, INTEGER, xp_action, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_xp_multiplier_history(UUID, INTEGER) TO authenticated;


-- ================================================
-- FIX: XP Multiplier Function - Ambiguous Column Reference
-- ================================================

-- Drop and recreate the function with proper column aliasing
DROP FUNCTION IF EXISTS get_active_xp_multiplier(UUID);

CREATE OR REPLACE FUNCTION get_active_xp_multiplier(p_user_id UUID)
RETURNS TABLE (
  multiplier_id UUID,
  multiplier_value DECIMAL(3,2),
  multiplier_source VARCHAR(50),
  multiplier_description TEXT,
  multiplier_starts_at TIMESTAMPTZ,
  multiplier_expires_at TIMESTAMPTZ,
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
    AND user_xp_multipliers.expires_at < NOW();

  -- Return the active multiplier (if any)
  RETURN QUERY
  SELECT 
    m.id AS multiplier_id,
    m.multiplier AS multiplier_value,
    m.source AS multiplier_source,
    m.source_description AS multiplier_description,
    m.starts_at AS multiplier_starts_at,
    m.expires_at AS multiplier_expires_at,
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

GRANT EXECUTE ON FUNCTION get_active_xp_multiplier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_xp_multiplier(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_active_xp_multiplier(UUID) TO service_role;

-- Also ensure user_xp_multipliers table exists
CREATE TABLE IF NOT EXISTS user_xp_multipliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  source VARCHAR(50) NOT NULL,
  source_description TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  xp_earned_with_multiplier INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_xp_multipliers_user_active ON user_xp_multipliers(user_id, is_active);

SELECT 'XP Multiplier function fixed!' as status;


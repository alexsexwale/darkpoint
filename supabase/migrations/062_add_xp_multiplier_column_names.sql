-- ============================================
-- Migration 062: Fix add_xp multiplier record field names
-- ============================================
-- get_active_xp_multiplier may return columns multiplier_id, multiplier_value
-- (e.g. from fix_xp_multiplier.sql) but add_xp expected id, multiplier.
-- This migration: (1) standardizes get_active_xp_multiplier to return
-- multiplier_id, multiplier_value so frontend and add_xp agree;
-- (2) updates add_xp to use those columns so the API no longer throws
-- "record \"v_multiplier\" has no field \"multiplier\"".

-- Standardize get_active_xp_multiplier return columns (multiplier_id, multiplier_value)
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
SET search_path = public
AS $$
BEGIN
  UPDATE user_xp_multipliers
  SET is_active = false, updated_at = NOW()
  WHERE user_id = p_user_id
    AND is_active = true
    AND expires_at < NOW();

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

-- add_xp: use multiplier_id and multiplier_value from get_active_xp_multiplier
CREATE OR REPLACE FUNCTION add_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_action TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_multiplier RECORD;
  v_mult_val NUMERIC;
  v_mult_id UUID;
  v_base_amount INTEGER;
  v_bonus_amount INTEGER;
  v_total_amount INTEGER;
  v_old_xp INTEGER;
  v_new_xp INTEGER;
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_leveled_up BOOLEAN := FALSE;
  v_levelup_result JSON;
  v_description TEXT;
BEGIN
  v_base_amount := p_amount;
  v_bonus_amount := 0;

  SELECT * INTO v_multiplier FROM get_active_xp_multiplier(p_user_id);

  IF v_multiplier IS NOT NULL THEN
    v_mult_val := v_multiplier.multiplier_value;
    v_mult_id := v_multiplier.multiplier_id;
  ELSE
    v_mult_val := 1;
    v_mult_id := NULL;
  END IF;

  IF v_mult_val > 1 THEN
    v_bonus_amount := FLOOR(v_base_amount * (v_mult_val - 1));
    v_total_amount := v_base_amount + v_bonus_amount;
    IF v_mult_id IS NOT NULL THEN
      UPDATE user_xp_multipliers
      SET xp_earned_with_multiplier = xp_earned_with_multiplier + v_bonus_amount,
          updated_at = NOW()
      WHERE id = v_mult_id;
    END IF;
  ELSE
    v_total_amount := v_base_amount;
  END IF;

  -- Get current XP and level
  SELECT COALESCE(total_xp, 0), COALESCE(current_level, 1)
  INTO v_old_xp, v_old_level
  FROM user_profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  v_new_xp := v_old_xp + v_total_amount;

  -- New level from levels table
  SELECT COALESCE(MAX(level), 1) INTO v_new_level
  FROM levels
  WHERE xp_required <= v_new_xp;

  v_leveled_up := v_new_level > v_old_level;

  -- Update user profile
  UPDATE user_profiles
  SET total_xp = v_new_xp,
      current_level = v_new_level,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Log XP transaction (cast p_action to xp_action; skip log if enum value missing)
  v_description := COALESCE(p_description, 'XP from ' || p_action);
  IF v_bonus_amount > 0 THEN
    v_description := v_description || ' (+' || v_bonus_amount || ' bonus)';
  END IF;
  BEGIN
    INSERT INTO xp_transactions (user_id, amount, action, description)
    VALUES (p_user_id, v_total_amount, p_action::xp_action, v_description);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- e.g. invalid enum value; still award XP
  END;

  -- Level-up reward
  IF v_leveled_up THEN
    BEGIN
      SELECT grant_levelup_reward(p_user_id, v_new_level) INTO v_levelup_result;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'base_xp', v_base_amount,
    'bonus_xp', v_bonus_amount,
    'total_xp_earned', v_total_amount,
    'multiplier_applied', v_mult_val,
    'new_total', v_new_xp,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'leveled_up', v_leveled_up
  );
END;
$$;

GRANT EXECUTE ON FUNCTION add_xp(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_xp(UUID, INTEGER, TEXT, TEXT) TO service_role;

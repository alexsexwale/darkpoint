-- ============================================
-- Migration 061: Fix add_xp RPC overload (PGRST203)
-- ============================================
-- PostgREST cannot choose between multiple add_xp overloads when the API
-- passes (p_user_id, p_amount, p_action text, p_description). This migration
-- drops all overloads and creates a single add_xp(p_user_id, p_amount, p_action text, p_description)
-- so RPC calls from the add-xp API and share/product flows work.

-- Drop all known overloads of add_xp (order doesn't matter for DROP)
DROP FUNCTION IF EXISTS add_xp(UUID, TEXT, INTEGER, TEXT);
DROP FUNCTION IF EXISTS add_xp(UUID, INTEGER, xp_action, TEXT);
DROP FUNCTION IF EXISTS add_xp(UUID, INTEGER, TEXT, TEXT);

-- Single add_xp: (p_user_id, p_amount, p_action text, p_description)
-- Applies XP multiplier, updates profile, logs transaction, grants level-up reward.
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

  -- Check for active XP multiplier
  SELECT * INTO v_multiplier FROM get_active_xp_multiplier(p_user_id);

  IF v_multiplier IS NOT NULL AND v_multiplier.multiplier > 1 THEN
    v_bonus_amount := FLOOR(v_base_amount * (v_multiplier.multiplier - 1));
    v_total_amount := v_base_amount + v_bonus_amount;
    UPDATE user_xp_multipliers
    SET xp_earned_with_multiplier = xp_earned_with_multiplier + v_bonus_amount,
        updated_at = NOW()
    WHERE id = v_multiplier.id;
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
    'multiplier_applied', COALESCE(v_multiplier.multiplier, 1),
    'new_total', v_new_xp,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'leveled_up', v_leveled_up
  );
END;
$$;

GRANT EXECUTE ON FUNCTION add_xp(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_xp(UUID, INTEGER, TEXT, TEXT) TO service_role;

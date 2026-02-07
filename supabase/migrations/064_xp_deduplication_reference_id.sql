-- Migration 064: XP deduplication via reference_id
-- ============================================
-- Ensures users only get XP once per distinct action by:
-- 1. Adding reference_id to xp_transactions (e.g. order_id for purchase, "midnight_2026-02-07" for bonus)
-- 2. Making add_xp skip when the same (user, action, reference_id) was already awarded
-- 3. Unique constraint to prevent duplicate inserts

-- Add reference_id column
ALTER TABLE xp_transactions
  ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- Unique constraint: same user + action + reference can only appear once
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_transactions_reference_dedup
  ON xp_transactions (user_id, action, reference_id)
  WHERE reference_id IS NOT NULL;

-- Single add_xp overload with optional reference_id (drops 4-param so 4-arg callers get default NULL)
DROP FUNCTION IF EXISTS add_xp(UUID, INTEGER, TEXT, TEXT);

-- add_xp: add optional p_reference_id; if provided and already awarded, return success with 0 XP (idempotent)
CREATE OR REPLACE FUNCTION add_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_action TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
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
  -- Idempotency: if reference_id provided and we already awarded for it, return success without adding
  IF p_reference_id IS NOT NULL AND p_reference_id != '' THEN
    IF EXISTS (
      SELECT 1 FROM xp_transactions
      WHERE user_id = p_user_id AND action = p_action::xp_action AND reference_id = p_reference_id
      LIMIT 1
    ) THEN
      RETURN jsonb_build_object(
        'success', true,
        'base_xp', 0,
        'bonus_xp', 0,
        'total_xp_earned', 0,
        'multiplier_applied', 1,
        'new_total', (SELECT COALESCE(total_xp, 0) FROM user_profiles WHERE id = p_user_id),
        'old_level', (SELECT COALESCE(current_level, 1) FROM user_profiles WHERE id = p_user_id),
        'new_level', (SELECT COALESCE(current_level, 1) FROM user_profiles WHERE id = p_user_id),
        'leveled_up', false,
        'duplicate', true
      );
    END IF;
  END IF;

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

  SELECT COALESCE(total_xp, 0), COALESCE(current_level, 1)
  INTO v_old_xp, v_old_level
  FROM user_profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  v_new_xp := v_old_xp + v_total_amount;

  SELECT COALESCE(MAX(level), 1) INTO v_new_level
  FROM levels
  WHERE xp_required <= v_new_xp;

  v_leveled_up := v_new_level > v_old_level;

  UPDATE user_profiles
  SET total_xp = v_new_xp,
      current_level = v_new_level,
      updated_at = NOW()
  WHERE id = p_user_id;

  v_description := COALESCE(p_description, 'XP from ' || p_action);
  IF v_bonus_amount > 0 THEN
    v_description := v_description || ' (+' || v_bonus_amount || ' bonus)';
  END IF;
  BEGIN
    INSERT INTO xp_transactions (user_id, amount, action, description, reference_id)
    VALUES (p_user_id, v_total_amount, p_action::xp_action, v_description, NULLIF(TRIM(p_reference_id), ''));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

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

-- Keep grants for existing signature; new overload gets same
GRANT EXECUTE ON FUNCTION add_xp(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_xp(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;

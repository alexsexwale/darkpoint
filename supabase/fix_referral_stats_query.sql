-- Quick fix: Update get_referral_stats to properly count pending referrals
-- Run this in Supabase SQL editor

DROP FUNCTION IF EXISTS get_referral_stats(UUID);

CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_pending_referrals JSONB;
  v_completed_referrals JSONB;
  v_pending_count INTEGER;
  v_completed_count INTEGER;
  v_tier TEXT;
  v_xp_per_referral INTEGER;
BEGIN
  -- Get user profile
  SELECT referral_code, referral_count, total_referrals, total_xp
  INTO v_profile
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Calculate tier based on completed referral count
  v_xp_per_referral := CASE
    WHEN COALESCE(v_profile.referral_count, 0) >= 25 THEN 750
    WHEN COALESCE(v_profile.referral_count, 0) >= 10 THEN 500
    WHEN COALESCE(v_profile.referral_count, 0) >= 5 THEN 400
    ELSE 300
  END;

  v_tier := CASE
    WHEN COALESCE(v_profile.referral_count, 0) >= 25 THEN 'Diamond'
    WHEN COALESCE(v_profile.referral_count, 0) >= 10 THEN 'Gold'
    WHEN COALESCE(v_profile.referral_count, 0) >= 5 THEN 'Silver'
    ELSE 'Bronze'
  END;

  -- Get pending referrals (signed up but no purchase yet)
  -- Check for both 'pending' and 'pending_purchase' status values
  SELECT 
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'referred_name', COALESCE(u.display_name, u.username, 'Anonymous'),
      'status', 'pending',
      'created_at', r.created_at
    ) ORDER BY r.created_at DESC), '[]'::jsonb),
    COUNT(*)
  INTO v_pending_referrals, v_pending_count
  FROM referrals r
  LEFT JOIN user_profiles u ON r.referred_id = u.id
  WHERE r.referrer_id = p_user_id 
    AND (r.status::text = 'pending' OR r.status::text = 'pending_purchase');

  -- Get completed referrals (made a purchase)
  -- Check for both 'completed' and 'signed_up' (legacy) status values
  SELECT 
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'referred_name', COALESCE(u.display_name, u.username, 'Anonymous'),
      'status', 'completed',
      'created_at', r.created_at,
      'completed_at', r.updated_at
    ) ORDER BY r.updated_at DESC), '[]'::jsonb),
    COUNT(*)
  INTO v_completed_referrals, v_completed_count
  FROM referrals r
  LEFT JOIN user_profiles u ON r.referred_id = u.id
  WHERE r.referrer_id = p_user_id 
    AND (r.status::text = 'completed' OR r.status::text = 'signed_up');

  RETURN jsonb_build_object(
    'success', true,
    'referral_code', v_profile.referral_code,
    'pending_count', v_pending_count,
    'completed_count', v_completed_count,
    'total_referral_count', COALESCE(v_profile.referral_count, 0),
    'tier', v_tier,
    'xp_per_referral', v_xp_per_referral,
    'pending_referrals', v_pending_referrals,
    'completed_referrals', v_completed_referrals
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_referral_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_stats(UUID) TO service_role;

-- Verify: Check what status values exist in your referrals table
SELECT status, COUNT(*) FROM referrals GROUP BY status;


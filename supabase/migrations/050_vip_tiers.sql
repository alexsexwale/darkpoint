-- =====================================================
-- VIP TIER SYSTEM MIGRATION
-- Adds tier-specific VIP rewards and badge tier column
-- =====================================================

-- =====================================================
-- 1. ADD REQUIRED_TIER COLUMN TO REWARDS TABLE
-- =====================================================
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS required_tier TEXT;

-- Update existing badge descriptions with tier info
UPDATE rewards SET 
  description = '🔥 Bronze VIP - Unlocks entry-level VIP perks!',
  required_tier = NULL
WHERE id = 'badge_fire';

UPDATE rewards SET 
  description = '👑 Gold VIP - Unlocks premium rewards & early access!',
  required_tier = NULL
WHERE id = 'badge_crown';

UPDATE rewards SET 
  description = '✨ Platinum VIP - Ultimate tier with all benefits!',
  required_tier = NULL
WHERE id = 'frame_gold';

-- =====================================================
-- 1.5 INSERT NON-VIP XP BOOSTER (different from VIP version)
-- =====================================================
-- Remove any existing 2x XP boost that's not VIP-only (to avoid confusion)
DELETE FROM rewards WHERE id = 'xp_boost_2x' AND (vip_only IS NULL OR vip_only = false);

-- Add non-VIP 1.5x XP boost (different from VIP 2x)
INSERT INTO rewards (id, name, description, category, xp_cost, value, stock, is_active, vip_only, required_tier)
VALUES
  ('xp_boost_1_5x', '1.5x XP Boost', '50% bonus XP for 12 hours', 'xp_booster', 200, '1.5x_12h', NULL, true, false, NULL)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  xp_cost = EXCLUDED.xp_cost,
  vip_only = EXCLUDED.vip_only;

-- =====================================================
-- 2. INSERT BRONZE VIP REWARDS (Fire Badge required)
-- =====================================================
INSERT INTO rewards (id, name, description, category, xp_cost, value, stock, is_active, vip_only, required_tier)
VALUES
  ('vip_discount_20', 'VIP 20% Discount', '20% off your next order - Bronze VIP exclusive!', 'exclusive', 400, '20', NULL, true, true, 'bronze'),
  ('vip_xp_boost_2x', '2x XP Boost', 'Double XP for 24 hours - Bronze VIP perk!', 'exclusive', 300, '2x_24h', NULL, true, true, 'bronze'),
  ('vip_mystery_box_standard', 'VIP Mystery Box', 'Standard VIP mystery box with bonus items', 'exclusive', 600, 'mystery_vip_standard', 100, true, true, 'bronze')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  xp_cost = EXCLUDED.xp_cost,
  required_tier = EXCLUDED.required_tier;

-- =====================================================
-- 3. UPDATE GOLD VIP REWARDS (Crown Badge required)
-- =====================================================
-- Update existing 25% discount to be gold-tier
UPDATE rewards SET 
  xp_cost = 700,
  required_tier = 'gold'
WHERE id = 'vip_discount_25';

-- Update existing 3x XP to be gold-tier
UPDATE rewards SET 
  xp_cost = 500,
  required_tier = 'gold'
WHERE id = 'vip_triple_xp';

-- Add new gold-tier rewards
INSERT INTO rewards (id, name, description, category, xp_cost, value, stock, is_active, vip_only, required_tier)
VALUES
  ('vip_mystery_box_premium', 'Premium Mystery Box', 'Premium VIP mystery box - Higher chance of rare items!', 'exclusive', 800, 'mystery_vip_premium', 50, true, true, 'gold'),
  ('vip_extra_spins_3', '3 Bonus Spins', 'Three extra wheel spins - Gold VIP exclusive!', 'exclusive', 450, '3', NULL, true, true, 'gold')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  xp_cost = EXCLUDED.xp_cost,
  required_tier = EXCLUDED.required_tier;

-- =====================================================
-- 4. ADD PLATINUM VIP REWARDS (Gold Frame required)
-- =====================================================
-- Update existing diamond frame to be platinum-tier
UPDATE rewards SET 
  xp_cost = 2000,
  required_tier = 'platinum'
WHERE id = 'vip_diamond_frame';

-- Update existing VIP mystery box to be platinum elite
UPDATE rewards SET 
  id = 'vip_mystery_box_elite',
  name = 'Elite Mystery Box',
  description = 'Elite VIP mystery box - Guaranteed rare+ items!',
  xp_cost = 1000,
  required_tier = 'platinum'
WHERE id = 'vip_mystery_box';

-- Add new platinum-tier rewards
INSERT INTO rewards (id, name, description, category, xp_cost, value, stock, is_active, vip_only, required_tier)
VALUES
  ('vip_discount_35', 'VIP 35% Discount', 'Maximum 35% off - Platinum VIP exclusive!', 'exclusive', 900, '35', NULL, true, true, 'platinum'),
  ('vip_quad_xp', '4x XP Boost', 'Quadruple XP for 24 hours - Platinum VIP only!', 'exclusive', 600, '4x_24h', NULL, true, true, 'platinum'),
  ('vip_extra_spins_5', '5 Bonus Spins', 'Five extra wheel spins - Platinum VIP exclusive!', 'exclusive', 600, '5', NULL, true, true, 'platinum')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  xp_cost = EXCLUDED.xp_cost,
  required_tier = EXCLUDED.required_tier;

-- =====================================================
-- 5. CREATE FUNCTION TO CHECK VIP TIER ACCESS
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_vip_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_tier TEXT;
BEGIN
  -- Check badges in order of priority (highest first)
  SELECT 
    CASE badge_id
      WHEN 'frame_gold' THEN 'platinum'
      WHEN 'badge_crown' THEN 'gold'
      WHEN 'badge_fire' THEN 'bronze'
      ELSE NULL
    END INTO v_tier
  FROM user_badges
  WHERE user_id = p_user_id
  ORDER BY 
    CASE badge_id
      WHEN 'frame_gold' THEN 1
      WHEN 'badge_crown' THEN 2
      WHEN 'badge_fire' THEN 3
      ELSE 4
    END
  LIMIT 1;
  
  RETURN v_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. CREATE FUNCTION TO CHECK IF USER CAN ACCESS REWARD
-- =====================================================
CREATE OR REPLACE FUNCTION can_access_reward(p_user_id UUID, p_reward_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_tier TEXT;
  v_required_tier TEXT;
  v_tier_order TEXT[];
  v_user_tier_index INT;
  v_required_tier_index INT;
BEGIN
  -- Get user's VIP tier
  v_user_tier := get_user_vip_tier(p_user_id);
  
  -- Get required tier for the reward
  SELECT required_tier INTO v_required_tier
  FROM rewards
  WHERE id = p_reward_id;
  
  -- If no tier required, anyone can access
  IF v_required_tier IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- If user has no tier, they can't access tier-restricted rewards
  IF v_user_tier IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Define tier order (0 = lowest, 2 = highest)
  v_tier_order := ARRAY['bronze', 'gold', 'platinum'];
  
  -- Find indices
  v_user_tier_index := array_position(v_tier_order, v_user_tier);
  v_required_tier_index := array_position(v_tier_order, v_required_tier);
  
  -- User can access if their tier >= required tier
  RETURN v_user_tier_index >= v_required_tier_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_vip_tier(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION can_access_reward(UUID, TEXT) TO authenticated, service_role;

-- =====================================================
-- 7. ADD BADGE PURCHASE REQUIREMENTS (before view creation)
-- =====================================================
-- Add required_orders column to rewards for badge purchases FIRST
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS required_orders INTEGER DEFAULT 0;

-- =====================================================
-- 8. CREATE VIEW FOR TIER-ACCESSIBLE REWARDS
-- =====================================================
-- Drop existing view first to avoid column conflicts
DROP VIEW IF EXISTS user_accessible_rewards;

-- This view shows all rewards a user can access based on their tier
CREATE VIEW user_accessible_rewards AS
SELECT 
  r.*,
  CASE 
    WHEN r.required_tier = 'platinum' THEN '✨ Platinum VIP'
    WHEN r.required_tier = 'gold' THEN '👑 Gold VIP'
    WHEN r.required_tier = 'bronze' THEN '🔥 Bronze VIP'
    ELSE 'Everyone'
  END AS tier_label
FROM rewards r
WHERE r.is_active = true;

-- Update badge purchase requirements
UPDATE rewards SET required_orders = 1 WHERE id = 'badge_fire';
UPDATE rewards SET required_orders = 3 WHERE id = 'badge_crown';
UPDATE rewards SET required_orders = 5 WHERE id = 'frame_gold';

-- Update badge descriptions to include order requirements
UPDATE rewards SET 
  description = '🔥 Bronze VIP - Unlocks entry-level VIP perks! Requires 1+ order.'
WHERE id = 'badge_fire';

UPDATE rewards SET 
  description = '👑 Gold VIP - Unlocks premium rewards & early access! Requires 3+ orders.'
WHERE id = 'badge_crown';

UPDATE rewards SET 
  description = '✨ Platinum VIP - Ultimate tier with all benefits! Requires 5+ orders.'
WHERE id = 'frame_gold';

-- =====================================================
-- 9. FUNCTION TO CHECK IF USER CAN PURCHASE BADGE
-- =====================================================
CREATE OR REPLACE FUNCTION can_purchase_badge(p_user_id UUID, p_badge_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_orders INTEGER;
  v_required_orders INTEGER;
  v_already_owned BOOLEAN;
BEGIN
  -- Get user's order count
  SELECT COALESCE(total_orders, 0) INTO v_user_orders
  FROM user_profiles
  WHERE id = p_user_id;
  
  -- Get required orders for badge
  SELECT COALESCE(required_orders, 0) INTO v_required_orders
  FROM rewards
  WHERE id = p_badge_id;
  
  -- Check if already owned
  SELECT EXISTS (
    SELECT 1 FROM user_badges 
    WHERE user_id = p_user_id AND badge_id = p_badge_id
  ) INTO v_already_owned;
  
  RETURN jsonb_build_object(
    'can_purchase', v_user_orders >= v_required_orders AND NOT v_already_owned,
    'user_orders', v_user_orders,
    'required_orders', v_required_orders,
    'already_owned', v_already_owned,
    'orders_needed', GREATEST(0, v_required_orders - v_user_orders)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_purchase_badge(UUID, TEXT) TO authenticated, service_role;

-- =====================================================
-- SUMMARY OF VIP TIERS WITH ORDER REQUIREMENTS
-- =====================================================
-- 
-- Bronze VIP (Fire Badge - 500 XP, requires 1+ order):
--   - Up to 15% discount coupons
--   - 2x XP boost
--   - Standard VIP mystery boxes
--   - VIP Lounge access
--   - Secret areas unlocked
--
-- Gold VIP (Crown Badge - 1000 XP, requires 3+ orders):
--   - All Bronze benefits, PLUS:
--   - Up to 25% discount coupons
--   - 3x XP boost
--   - Premium VIP mystery boxes
--   - 24-hour early access to sales
--   - Priority support
--   - 3 bonus spins package
--
-- Platinum VIP (Gold Frame - 1500 XP, requires 5+ orders):
--   - All Gold benefits, PLUS:
--   - Up to 35% discount coupons
--   - 4x XP boost
--   - Elite VIP mystery boxes (guaranteed rare+)
--   - 48-hour early access to sales
--   - Diamond Frame available
--   - Monthly 100 XP + 1 free spin
--   - 5 bonus spins package
--
-- ORDER REQUIREMENTS:
--   Fire Badge:  1+ orders  (Entry requirement)
--   Crown Badge: 3+ orders  (Show commitment)
--   Gold Frame:  5+ orders  (Loyal customer)
-- =====================================================


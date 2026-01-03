-- =====================================================
-- BADGE SYSTEM MIGRATION
-- Creates user_badges table and VIP-related features
-- =====================================================

-- =====================================================
-- 1. CREATE USER_BADGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  equipped BOOLEAN DEFAULT FALSE,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each user can only have one of each badge type
  UNIQUE(user_id, badge_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);

-- Enable RLS
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Users can read their own badges
DROP POLICY IF EXISTS "Users can view own badges" ON user_badges;
CREATE POLICY "Users can view own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own badges (for equipping)
DROP POLICY IF EXISTS "Users can update own badges" ON user_badges;
CREATE POLICY "Users can update own badges" ON user_badges
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 2. ADD REVIEWER_BADGE COLUMN TO PRODUCT_REVIEWS
-- =====================================================
-- This allows us to show badges next to reviewer names
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS reviewer_badge TEXT;

-- =====================================================
-- 3. ADD VIP_ONLY COLUMN TO REWARDS TABLE
-- =====================================================
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS vip_only BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 4. INSERT DEFAULT BADGE DEFINITIONS
-- =====================================================
-- Add badges as rewards if not exists
INSERT INTO rewards (id, name, description, category, xp_cost, value, stock, is_active, vip_only)
VALUES
  ('badge_fire', 'Fire Badge', 'Blazing hot profile badge - Unlocks VIP features!', 'cosmetic', 500, 'badge_fire', 100, true, false),
  ('badge_crown', 'Crown Badge', 'Royal profile badge - Unlocks VIP features!', 'cosmetic', 1000, 'badge_crown', 50, true, false),
  ('frame_gold', 'Gold Frame', 'Prestigious gold avatar frame - Unlocks VIP features!', 'cosmetic', 1500, 'frame_gold', 25, true, false)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  xp_cost = EXCLUDED.xp_cost,
  stock = EXCLUDED.stock;

-- Add VIP-exclusive rewards
INSERT INTO rewards (id, name, description, category, xp_cost, value, stock, is_active, vip_only)
VALUES
  ('vip_discount_25', 'VIP 25% Discount', 'Exclusive 25% off - VIP members only!', 'exclusive', 800, '25', NULL, true, true),
  ('vip_triple_xp', 'Triple XP Boost', '3x XP for 24 hours - VIP exclusive!', 'exclusive', 500, '3x_24h', NULL, true, true),
  ('vip_diamond_frame', 'Diamond Frame', 'Ultra-rare diamond avatar frame', 'exclusive', 2500, 'frame_diamond', 10, true, true),
  ('vip_mystery_box', 'VIP Mystery Box', 'Contains rare items only available to VIP members', 'exclusive', 1000, 'mystery_vip', 50, true, true)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  xp_cost = EXCLUDED.xp_cost,
  vip_only = EXCLUDED.vip_only;

-- =====================================================
-- 5. FUNCTION TO GRANT BADGE ON PURCHASE
-- =====================================================
CREATE OR REPLACE FUNCTION grant_badge_on_cosmetic_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is a badge/frame purchase
  IF NEW.category IN ('cosmetic', 'exclusive') AND 
     (NEW.value LIKE 'badge_%' OR NEW.value LIKE 'frame_%') THEN
    
    -- Grant the badge to the user
    INSERT INTO user_badges (user_id, badge_id, equipped)
    VALUES (NEW.user_id, NEW.value, TRUE)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
    
    -- Update user profile to reflect VIP status if this is their first badge
    UPDATE user_profiles 
    SET updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for badge grants
DROP TRIGGER IF EXISTS trigger_grant_badge ON user_rewards;
CREATE TRIGGER trigger_grant_badge
  AFTER INSERT ON user_rewards
  FOR EACH ROW
  EXECUTE FUNCTION grant_badge_on_cosmetic_purchase();

-- =====================================================
-- 6. FUNCTION TO CHECK IF USER HAS ANY BADGE
-- =====================================================
CREATE OR REPLACE FUNCTION has_any_badge(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_badges WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FUNCTION TO GET USER'S HIGHEST BADGE
-- =====================================================
CREATE OR REPLACE FUNCTION get_highest_badge(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_badge TEXT;
BEGIN
  -- Priority: frame_gold > badge_crown > badge_fire
  SELECT badge_id INTO v_badge
  FROM user_badges
  WHERE user_id = p_user_id
  ORDER BY 
    CASE badge_id
      WHEN 'frame_gold' THEN 1
      WHEN 'frame_diamond' THEN 2
      WHEN 'badge_crown' THEN 3
      WHEN 'badge_fire' THEN 4
      ELSE 5
    END
  LIMIT 1;
  
  RETURN v_badge;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FUNCTION TO GET ALL USER BADGES
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_badges(p_user_id UUID)
RETURNS TABLE(badge_id TEXT, equipped BOOLEAN, acquired_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT ub.badge_id, ub.equipped, ub.acquired_at
  FROM user_badges ub
  WHERE ub.user_id = p_user_id
  ORDER BY ub.acquired_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. FUNCTION TO EQUIP/UNEQUIP BADGE
-- =====================================================
CREATE OR REPLACE FUNCTION equip_badge(p_user_id UUID, p_badge_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if user owns this badge
  SELECT EXISTS (
    SELECT 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = p_badge_id
  ) INTO v_exists;
  
  IF NOT v_exists THEN
    RETURN json_build_object('success', false, 'error', 'Badge not owned');
  END IF;
  
  -- Unequip all badges
  UPDATE user_badges SET equipped = FALSE WHERE user_id = p_user_id;
  
  -- Equip the selected badge
  UPDATE user_badges SET equipped = TRUE 
  WHERE user_id = p_user_id AND badge_id = p_badge_id;
  
  RETURN json_build_object('success', true, 'badge_id', p_badge_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. UPDATE PURCHASE_REWARD TO HANDLE BADGES
-- =====================================================
CREATE OR REPLACE FUNCTION purchase_reward(p_user_id UUID, p_reward_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_reward RECORD;
  v_user_xp INTEGER;
  v_user_spins INTEGER;
  v_new_xp INTEGER;
  v_new_spins INTEGER;
  v_coupon_id UUID;
  v_has_badge BOOLEAN;
BEGIN
  -- Get user's current XP and spins
  SELECT total_xp, available_spins INTO v_user_xp, v_user_spins 
  FROM user_profiles WHERE id = p_user_id;
  
  IF v_user_xp IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User profile not found');
  END IF;

  -- Get reward details
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND is_active = true;
  
  IF v_reward IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Reward not found or inactive');
  END IF;

  -- Check VIP requirement
  IF v_reward.vip_only THEN
    SELECT has_any_badge(p_user_id) INTO v_has_badge;
    IF NOT v_has_badge THEN
      RETURN json_build_object('success', false, 'error', 'This reward requires VIP status (badge ownership)');
    END IF;
  END IF;

  -- Check if user has enough XP
  IF v_user_xp < v_reward.xp_cost THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Not enough XP', 
      'required', v_reward.xp_cost, 
      'current', v_user_xp
    );
  END IF;

  -- Check stock if applicable
  IF v_reward.stock IS NOT NULL AND v_reward.stock <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Reward out of stock');
  END IF;

  -- Calculate new XP
  v_new_xp := v_user_xp - v_reward.xp_cost;

  -- Create reward based on category
  CASE v_reward.category
    WHEN 'discount' THEN
      INSERT INTO user_coupons (user_id, code, discount_type, discount_value, min_order_value, source, description, expires_at)
      VALUES (
        p_user_id,
        'REWARD-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
        'percent',
        COALESCE(v_reward.value::INTEGER, 5),
        0,
        'reward',
        '🛒 ' || v_reward.name,
        NOW() + INTERVAL '60 days'
      )
      RETURNING id INTO v_coupon_id;
      UPDATE user_profiles SET total_xp = v_new_xp, updated_at = NOW() WHERE id = p_user_id;

    WHEN 'exclusive' THEN
      -- Handle exclusive rewards (VIP-only discounts, boosts, etc.)
      IF v_reward.value LIKE '%x_%' THEN
        -- XP multiplier
        BEGIN
          PERFORM grant_xp_multiplier(p_user_id, 
            CASE WHEN v_reward.value LIKE '3x%' THEN 3.0 ELSE 2.0 END,
            24, 'reward_shop', v_reward.name);
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Could not grant XP multiplier: %', SQLERRM;
        END;
        UPDATE user_profiles SET total_xp = v_new_xp, updated_at = NOW() WHERE id = p_user_id;
      ELSIF v_reward.value LIKE 'frame_%' OR v_reward.value LIKE 'badge_%' THEN
        -- Badge/frame
        INSERT INTO user_badges (user_id, badge_id, equipped)
        VALUES (p_user_id, v_reward.value, TRUE)
        ON CONFLICT (user_id, badge_id) DO NOTHING;
        UPDATE user_profiles SET total_xp = v_new_xp, updated_at = NOW() WHERE id = p_user_id;
      ELSE
        -- Generic exclusive discount
        INSERT INTO user_coupons (user_id, code, discount_type, discount_value, min_order_value, source, description, expires_at)
        VALUES (
          p_user_id,
          'VIP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
          'percent',
          COALESCE(v_reward.value::INTEGER, 25),
          0,
          'reward',
          '👑 VIP: ' || v_reward.name,
          NOW() + INTERVAL '60 days'
        );
        UPDATE user_profiles SET total_xp = v_new_xp, updated_at = NOW() WHERE id = p_user_id;
      END IF;

    WHEN 'shipping' THEN
      INSERT INTO user_coupons (user_id, code, discount_type, discount_value, min_order_value, source, description, expires_at)
      VALUES (
        p_user_id,
        'SHIP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
        'free_shipping',
        0,
        0,
        'reward',
        '🚚 ' || v_reward.name,
        NOW() + INTERVAL '60 days'
      )
      RETURNING id INTO v_coupon_id;
      UPDATE user_profiles SET total_xp = v_new_xp, updated_at = NOW() WHERE id = p_user_id;

    WHEN 'xp_booster' THEN
      BEGIN
        PERFORM grant_xp_multiplier(p_user_id,
          CASE 
            WHEN v_reward.value LIKE '3x%' THEN 3.0
            WHEN v_reward.value LIKE '1.5x%' THEN 1.5
            ELSE 2.0
          END,
          24, 'reward_shop', v_reward.name);
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not grant XP multiplier: %', SQLERRM;
      END;
      UPDATE user_profiles SET total_xp = v_new_xp, updated_at = NOW() WHERE id = p_user_id;

    WHEN 'spin' THEN
      v_new_spins := COALESCE(v_user_spins, 0) + COALESCE(v_reward.value::INTEGER, 1);
      UPDATE user_profiles 
      SET total_xp = v_new_xp, available_spins = v_new_spins, updated_at = NOW() 
      WHERE id = p_user_id;

    WHEN 'cosmetic' THEN
      -- Grant badge
      INSERT INTO user_badges (user_id, badge_id, equipped)
      VALUES (p_user_id, v_reward.value, TRUE)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
      UPDATE user_profiles SET total_xp = v_new_xp, updated_at = NOW() WHERE id = p_user_id;

    ELSE
      RETURN json_build_object('success', false, 'error', 'Unknown reward category: ' || v_reward.category);
  END CASE;

  -- Log the XP transaction
  BEGIN
    INSERT INTO xp_transactions (user_id, amount, action, description)
    VALUES (p_user_id, -v_reward.xp_cost, 'redeem', 'Redeemed: ' || v_reward.name);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not log XP transaction: %', SQLERRM;
  END;

  -- Decrement stock if applicable
  IF v_reward.stock IS NOT NULL THEN
    UPDATE rewards SET stock = stock - 1 WHERE id = p_reward_id;
  END IF;

  -- Record the reward purchase
  BEGIN
    INSERT INTO user_rewards (user_id, reward_id, category, value)
    VALUES (p_user_id, p_reward_id, v_reward.category, v_reward.value);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not record reward purchase: %', SQLERRM;
  END;

  RETURN json_build_object(
    'success', true,
    'reward', json_build_object('id', v_reward.id, 'name', v_reward.name, 'category', v_reward.category),
    'xp_spent', v_reward.xp_cost,
    'remaining_xp', v_new_xp
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON user_badges TO authenticated;
GRANT UPDATE ON user_badges TO authenticated;
GRANT EXECUTE ON FUNCTION has_any_badge TO authenticated;
GRANT EXECUTE ON FUNCTION get_highest_badge TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_badges TO authenticated;
GRANT EXECUTE ON FUNCTION equip_badge TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_reward TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================


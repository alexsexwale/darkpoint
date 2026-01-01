-- ============================================
-- FIX: XP Booster Purchase - Actually grant the multiplier
-- ============================================

CREATE OR REPLACE FUNCTION purchase_reward(p_user_id UUID, p_reward_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_reward rewards%ROWTYPE;
  v_coupon_id UUID;
  v_coupon_code TEXT;
  v_discount_type discount_type;
  v_discount_value DECIMAL(10,2);
  v_multiplier_value DECIMAL;
  v_result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Get reward
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Reward not found');
  END IF;
  
  -- Check stock
  IF v_reward.stock IS NOT NULL AND v_reward.stock <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Out of stock');
  END IF;
  
  -- Check XP balance
  IF v_profile.total_xp < v_reward.xp_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient XP', 'required', v_reward.xp_cost, 'current', v_profile.total_xp);
  END IF;
  
  -- Deduct XP
  UPDATE user_profiles SET
    total_xp = total_xp - v_reward.xp_cost,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Reduce stock if limited
  IF v_reward.stock IS NOT NULL THEN
    UPDATE rewards SET stock = stock - 1 WHERE id = p_reward_id;
  END IF;
  
  -- Log XP transaction (negative)
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (p_user_id, -v_reward.xp_cost, 'purchase', 'Purchased: ' || v_reward.name);
  
  -- Apply reward based on category
  CASE v_reward.category
    WHEN 'discount' THEN
      -- Determine discount type and value from reward
      v_discount_type := 'percent'::discount_type;
      v_discount_value := COALESCE(v_reward.value::DECIMAL, 0);
      v_coupon_code := 'DISC-' || UPPER(SUBSTRING(MD5(random()::text || NOW()::text) FROM 1 FOR 8));
      
      INSERT INTO user_coupons (user_id, code, discount_type, discount_value, min_order_value, source, expires_at)
      VALUES (
        p_user_id,
        v_coupon_code,
        v_discount_type,
        v_discount_value,
        0, -- No minimum order
        'reward'::coupon_source,
        NOW() + INTERVAL '90 days'
      )
      RETURNING id INTO v_coupon_id;
      
    WHEN 'shipping' THEN
      v_coupon_code := 'SHIP-' || UPPER(SUBSTRING(MD5(random()::text || NOW()::text) FROM 1 FOR 8));
      
      INSERT INTO user_coupons (user_id, code, discount_type, discount_value, min_order_value, source, expires_at)
      VALUES (
        p_user_id,
        v_coupon_code,
        'shipping'::discount_type,
        0, -- Shipping discounts don't have a value (they're free)
        0, -- No minimum order
        'reward'::coupon_source,
        NOW() + INTERVAL '90 days'
      )
      RETURNING id INTO v_coupon_id;
      
    WHEN 'spin' THEN
      UPDATE user_profiles SET available_spins = available_spins + COALESCE(v_reward.value::INTEGER, 1) WHERE id = p_user_id;
      
    WHEN 'xp_booster' THEN
      -- Parse the multiplier value from the reward value (e.g., "2x_24h" -> 2)
      -- Extract the number before 'x'
      v_multiplier_value := COALESCE(
        NULLIF(REGEXP_REPLACE(v_reward.value, '[^0-9.].*', '', 'g'), '')::DECIMAL,
        2.0 -- Default to 2x if parsing fails
      );
      
      -- Actually grant the XP multiplier for 24 hours!
      PERFORM grant_xp_multiplier(
        p_user_id, 
        v_multiplier_value, 
        24, -- hours
        'reward_shop', 
        'Purchased ' || v_reward.name || ' from Rewards Shop'
      );
      
      -- Also record in user_rewards for tracking
      INSERT INTO user_rewards (user_id, reward_id, expires_at)
      VALUES (p_user_id, p_reward_id, NOW() + INTERVAL '24 hours')
      ON CONFLICT (user_id, reward_id) DO UPDATE SET
        expires_at = NOW() + INTERVAL '24 hours',
        purchased_at = NOW();
      
    WHEN 'cosmetic', 'exclusive' THEN
      -- Record cosmetic/exclusive purchase
      INSERT INTO user_rewards (user_id, reward_id)
      VALUES (p_user_id, p_reward_id)
      ON CONFLICT DO NOTHING;
      
    ELSE
      -- Unknown category, just log it
      NULL;
  END CASE;
  
  v_result := json_build_object(
    'success', true,
    'reward', json_build_object(
      'id', v_reward.id,
      'name', v_reward.name,
      'category', v_reward.category,
      'value', v_reward.value
    ),
    'coupon_code', v_coupon_code,
    'coupon_id', v_coupon_id,
    'xp_spent', v_reward.xp_cost,
    'remaining_xp', v_profile.total_xp - v_reward.xp_cost
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION purchase_reward(UUID, TEXT) TO authenticated;


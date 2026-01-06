-- ============================================================
-- FIX: Registration Welcome Reward + Achievements
-- Run this in Supabase SQL Editor
-- ============================================================

-- ========================
-- PART 1: Fix the user registration trigger to give welcome rewards
-- ========================

-- Make code column nullable (welcome coupons don't need codes)
ALTER TABLE user_coupons ALTER COLUMN code DROP NOT NULL;

-- Drop and recreate the handle_new_user function with proper welcome rewards
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_referral_code TEXT;
  v_coupon_code TEXT;
BEGIN
  -- Generate username from email
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1),
    'user_' || LEFT(NEW.id::TEXT, 8)
  );
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    v_username
  );
  v_referral_code := 'DARK-' || UPPER(LEFT(v_username, 4)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  v_coupon_code := 'WELCOME-' || UPPER(LEFT(MD5(NEW.id::TEXT || NOW()::TEXT), 8));
  
  -- Create user profile with welcome bonuses
  INSERT INTO user_profiles (
    id, username, display_name, email, referral_code,
    total_xp, current_level, current_streak, longest_streak,
    available_spins, newsletter_subscribed
  ) VALUES (
    NEW.id, v_username, v_display_name, NEW.email, v_referral_code,
    100, 1, 0, 0,  -- 100 XP welcome bonus
    1, TRUE        -- 1 free spin
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    username = COALESCE(user_profiles.username, EXCLUDED.username);
  
  -- Create welcome XP transaction
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (NEW.id, 100, 'signup', '🎮 Welcome to Darkpoint! Here''s 100 XP to start your journey!')
  ON CONFLICT DO NOTHING;
  
  -- Create welcome 10% discount coupon
  INSERT INTO user_coupons (
    user_id, code, discount_type, discount_value, is_used, source, description, expires_at
  ) VALUES (
    NEW.id, v_coupon_code, 'percent', 10, FALSE, 'welcome', 
    '🎁 Welcome Gift: 10% Off Your First Order',
    NOW() + INTERVAL '30 days'
  )
  ON CONFLICT DO NOTHING;
  
  -- Subscribe to newsletter
  INSERT INTO newsletter_subscriptions (email, user_id, source, is_subscribed)
  VALUES (NEW.email, NEW.id, 'registration', TRUE)
  ON CONFLICT (email) DO UPDATE SET user_id = NEW.id, is_subscribed = TRUE;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user warning for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ========================
-- PART 2: Clear incorrectly unlocked achievements
-- ========================

-- Delete ALL achievements for all users - they'll be recalculated properly
DELETE FROM user_achievements;

-- Recreate check_achievements with STRICT logic
DROP FUNCTION IF EXISTS check_achievements(UUID);

CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement RECORD;
  v_progress INTEGER;
  v_profile user_profiles%ROWTYPE;
  v_unlocked TEXT[] := '{}';
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User profile not found');
  END IF;
  
  -- Loop through all active achievements with valid requirements
  FOR v_achievement IN 
    SELECT * FROM achievements 
    WHERE is_active = TRUE 
    AND requirement_value > 0
    AND requirement_type IS NOT NULL
  LOOP
    v_progress := 0;
    
    -- Calculate ACTUAL progress based on requirement type
    CASE v_achievement.requirement_type
      WHEN 'first_purchase' THEN
        SELECT COALESCE(COUNT(*), 0) INTO v_progress
        FROM orders WHERE user_id = p_user_id AND payment_status = 'paid';
        -- First purchase only needs 1
        IF v_progress > 0 THEN v_progress := 1; END IF;
        
      WHEN 'purchases' THEN
        SELECT COALESCE(COUNT(*), 0) INTO v_progress
        FROM orders WHERE user_id = p_user_id AND payment_status = 'paid';
        
      WHEN 'total_spent' THEN
        SELECT COALESCE(FLOOR(SUM(total)), 0) INTO v_progress
        FROM orders WHERE user_id = p_user_id AND payment_status = 'paid';
        
      WHEN 'wishlist', 'wishlist_items' THEN
        SELECT COALESCE(COUNT(*), 0) INTO v_progress
        FROM user_wishlist WHERE user_id = p_user_id;
        
      WHEN 'reviews' THEN
        SELECT COALESCE(COUNT(*), 0) INTO v_progress
        FROM reviews WHERE user_id = p_user_id AND is_approved = TRUE;
        
      WHEN 'shares', 'social_shares' THEN
        v_progress := COALESCE(v_profile.total_shares, 0);
        
      WHEN 'referrals' THEN
        v_progress := COALESCE(v_profile.referral_count, 0);
        
      WHEN 'streak', 'login_streak' THEN
        v_progress := COALESCE(v_profile.current_streak, 0);
        
      WHEN 'longest_streak' THEN
        v_progress := COALESCE(v_profile.longest_streak, 0);
        
      WHEN 'newsletter' THEN
        v_progress := CASE WHEN v_profile.newsletter_subscribed THEN 1 ELSE 0 END;
        
      WHEN 'xp', 'total_xp' THEN
        v_progress := COALESCE(v_profile.total_xp, 0);
        
      WHEN 'level' THEN
        v_progress := COALESCE(v_profile.current_level, 1);
        
      ELSE
        -- Unknown requirement type - skip
        CONTINUE;
    END CASE;
    
    -- STRICT CHECK: Only unlock if progress >= requirement AND progress > 0
    IF v_progress >= v_achievement.requirement_value AND v_progress > 0 THEN
      -- Check if not already unlocked
      IF NOT EXISTS (
        SELECT 1 FROM user_achievements 
        WHERE user_id = p_user_id 
        AND achievement_id = v_achievement.id 
        AND unlocked_at IS NOT NULL
      ) THEN
        -- Unlock achievement
        INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at, created_at, updated_at)
        VALUES (p_user_id, v_achievement.id, v_progress, NOW(), NOW(), NOW())
        ON CONFLICT (user_id, achievement_id) DO UPDATE SET
          progress = v_progress,
          unlocked_at = NOW(),
          updated_at = NOW();
        
        -- Award XP if applicable
        IF v_achievement.xp_reward > 0 THEN
          UPDATE user_profiles 
          SET total_xp = COALESCE(total_xp, 0) + v_achievement.xp_reward
          WHERE id = p_user_id;
          
          INSERT INTO xp_transactions (user_id, amount, action, description)
          VALUES (p_user_id, v_achievement.xp_reward, 'achievement', 'Achievement: ' || v_achievement.name);
        END IF;
        
        v_unlocked := array_append(v_unlocked, v_achievement.id::TEXT);
      END IF;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'unlocked', v_unlocked,
    'count', COALESCE(array_length(v_unlocked, 1), 0)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO authenticated;

-- ========================
-- PART 3: Fix spin_wheel function to properly handle free spins
-- ========================

CREATE OR REPLACE FUNCTION spin_wheel(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_prize spin_prizes%ROWTYPE;
  v_total_weight INTEGER;
  v_random INTEGER;
  v_current_weight INTEGER := 0;
  v_prize_value INTEGER;
  v_new_spins INTEGER;
  v_new_xp INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF v_profile.available_spins <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'No spins available');
  END IF;
  
  -- Get total weight
  SELECT COALESCE(SUM(probability), 0) INTO v_total_weight
  FROM spin_prizes WHERE is_active = TRUE;
  
  IF v_total_weight = 0 THEN
    RETURN json_build_object('success', false, 'error', 'No prizes available');
  END IF;
  
  -- Random weighted selection
  v_random := FLOOR(RANDOM() * v_total_weight);
  
  FOR v_prize IN SELECT * FROM spin_prizes WHERE is_active = TRUE ORDER BY probability DESC LOOP
    v_current_weight := v_current_weight + v_prize.probability;
    IF v_current_weight > v_random THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Calculate prize value
  v_prize_value := COALESCE(v_prize.prize_value::INTEGER, 0);
  
  -- Calculate new values
  -- Subtract 1 spin, but add back if prize is a free spin
  v_new_spins := v_profile.available_spins - 1;
  IF v_prize.prize_type = 'spin' THEN
    v_new_spins := v_new_spins + v_prize_value;
  END IF;
  
  v_new_xp := v_profile.total_xp;
  IF v_prize.prize_type = 'xp' THEN
    v_new_xp := v_new_xp + v_prize_value;
  END IF;
  
  -- Update profile
  UPDATE user_profiles SET
    available_spins = v_new_spins,
    total_xp = v_new_xp
  WHERE id = p_user_id;
  
  -- Log XP transaction if XP prize
  IF v_prize.prize_type = 'xp' AND v_prize_value > 0 THEN
    INSERT INTO xp_transactions (user_id, amount, action, description)
    VALUES (p_user_id, v_prize_value, 'spin_reward', 'Spin Wheel: ' || v_prize.name);
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'prize', json_build_object(
      'id', v_prize.id,
      'name', v_prize.name,
      'description', v_prize.description,
      'prize_type', v_prize.prize_type,
      'prize_value', v_prize.prize_value,
      'color', v_prize.color,
      'probability', v_prize.probability,
      'is_active', v_prize.is_active
    ),
    'remaining_spins', v_new_spins,
    'total_xp', v_new_xp
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION spin_wheel(UUID) TO authenticated;

-- ========================
-- DONE
-- ========================

SELECT 'All fixes applied!' as status
UNION ALL
SELECT '1. Registration trigger now creates welcome coupon + 100 XP + 1 spin'
UNION ALL
SELECT '2. All user achievements cleared - will recalculate properly'
UNION ALL  
SELECT '3. spin_wheel function fixed for free spin prizes';


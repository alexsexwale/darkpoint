-- ============================================
-- Migration: Review Stats Trigger
-- Updates user_profiles.total_reviews and awards XP when reviews are written
-- ============================================

-- ============================================
-- FUNCTION: Update user stats when review is created
-- ============================================
CREATE OR REPLACE FUNCTION update_user_review_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_review_count INTEGER;
  v_xp_amount INTEGER;
  v_description TEXT;
BEGIN
  -- For INSERT: New review created
  IF TG_OP = 'INSERT' THEN
    -- Update user profile stats
    UPDATE user_profiles SET
      total_reviews = total_reviews + 1,
      updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- Award XP for review (50 XP per review)
    v_xp_amount := 50;
    v_description := 'Review for ' || COALESCE(NEW.product_name, 'product');
    
    BEGIN
      PERFORM add_xp(NEW.user_id, v_xp_amount, 'review', v_description);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Silently fail if add_xp doesn't exist
    END;
    
    -- Get updated review count for achievement check
    SELECT total_reviews INTO v_review_count FROM user_profiles WHERE id = NEW.user_id;
    
    -- Check achievements after review (Critic, Reviewer, Expert Reviewer)
    BEGIN
      PERFORM check_achievements(NEW.user_id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    
    RETURN NEW;
  END IF;
  
  -- For DELETE: Review removed
  IF TG_OP = 'DELETE' THEN
    -- Decrement review count
    UPDATE user_profiles SET
      total_reviews = GREATEST(total_reviews - 1, 0),
      updated_at = NOW()
    WHERE id = OLD.user_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Fire on review insert or delete
-- ============================================
DROP TRIGGER IF EXISTS update_user_stats_on_review ON product_reviews;
CREATE TRIGGER update_user_stats_on_review
  AFTER INSERT OR DELETE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_review_stats();

-- ============================================
-- FUNCTION: Recalculate all user review stats
-- Run this once to fix any existing data
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_all_user_review_stats()
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_review_count INTEGER;
  v_count INTEGER := 0;
BEGIN
  FOR v_user IN SELECT DISTINCT user_id FROM product_reviews LOOP
    -- Count reviews for this user
    SELECT COUNT(*) INTO v_review_count
    FROM product_reviews 
    WHERE user_id = v_user.user_id;
    
    -- Update user profile
    UPDATE user_profiles SET
      total_reviews = v_review_count,
      updated_at = NOW()
    WHERE id = v_user.user_id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'users_updated', v_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION recalculate_all_user_review_stats() TO authenticated;

-- ============================================
-- Add comment explaining the trigger
-- ============================================
COMMENT ON TRIGGER update_user_stats_on_review ON product_reviews IS
'Automatically updates user_profiles.total_reviews when reviews are created or deleted.
Awards 50 XP per review.
Checks achievements like Critic (1st review), Reviewer (5 reviews), Expert Reviewer (10 reviews) after each review.';

-- ============================================
-- Ensure review achievements exist
-- ============================================
INSERT INTO achievements (
  id, name, description, category, icon, 
  xp_reward, rarity, requirement_type, requirement_value,
  is_hidden, is_active
) VALUES 
  ('review_1', 'Critic', 'Write your first review', 'engagement', '📝', 50, 'common', 'reviews', 1, false, true),
  ('review_5', 'Reviewer', 'Write 5 reviews', 'engagement', '✍️', 150, 'common', 'reviews', 5, false, true),
  ('review_10', 'Expert Reviewer', 'Write 10 reviews', 'engagement', '🎓', 300, 'rare', 'reviews', 10, false, true)
ON CONFLICT (id) DO UPDATE SET
  requirement_type = EXCLUDED.requirement_type,
  is_active = EXCLUDED.is_active;


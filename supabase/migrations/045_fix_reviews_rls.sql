-- Fix RLS policy for product_reviews to allow service role inserts
-- The service role should bypass RLS but the current policy is blocking it

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Users can insert their own reviews" ON product_reviews;

-- Create a more permissive insert policy that allows:
-- 1. Users to insert their own reviews (auth.uid() = user_id)
-- 2. Service role to insert any reviews (for API routes)
CREATE POLICY "Allow review inserts" ON product_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    OR auth.role() = 'service_role'
    OR current_setting('role', true) = 'service_role'
  );

-- Also create a function to insert reviews that bypasses RLS completely
CREATE OR REPLACE FUNCTION insert_review_bypass_rls(
  p_user_id UUID,
  p_product_id TEXT,
  p_order_id UUID,
  p_rating INT,
  p_title TEXT,
  p_content TEXT,
  p_author_name TEXT,
  p_is_verified_purchase BOOLEAN,
  p_images TEXT[]
)
RETURNS JSONB AS $$
DECLARE
  v_review_id UUID;
  v_xp_awarded INT := 25;
  v_new_review_count INT;
  v_new_total_xp INT;
BEGIN
  -- Check if already reviewed
  IF EXISTS (SELECT 1 FROM product_reviews WHERE user_id = p_user_id AND product_id = p_product_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already reviewed this product');
  END IF;

  -- Insert the review
  INSERT INTO product_reviews (
    user_id, product_id, order_id, rating, title, content, 
    author_name, is_verified_purchase, verified_purchase, images, status, is_approved
  ) VALUES (
    p_user_id, p_product_id, p_order_id, p_rating, p_title, p_content,
    p_author_name, p_is_verified_purchase, p_is_verified_purchase, p_images, 'published', true
  )
  RETURNING id INTO v_review_id;

  -- Calculate XP bonuses
  IF LENGTH(p_content) > 200 THEN
    v_xp_awarded := v_xp_awarded + 15;
  END IF;
  
  IF array_length(p_images, 1) > 0 THEN
    v_xp_awarded := v_xp_awarded + 10;
  END IF;

  -- Update user profile
  UPDATE user_profiles 
  SET 
    total_reviews = COALESCE(total_reviews, 0) + 1,
    total_xp = COALESCE(total_xp, 0) + v_xp_awarded,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING total_reviews, total_xp INTO v_new_review_count, v_new_total_xp;

  -- Log XP transaction
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (p_user_id, v_xp_awarded, 'review', 'Wrote a review for product');

  -- Check for first review achievement (only if achievement exists)
  IF v_new_review_count = 1 AND EXISTS (SELECT 1 FROM achievements WHERE id = 'first_review') THEN
    BEGIN
      INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
      VALUES (p_user_id, 'first_review', 1, NOW())
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      
      IF FOUND THEN
        UPDATE user_profiles SET total_xp = total_xp + 50 WHERE id = p_user_id;
        INSERT INTO xp_transactions (user_id, amount, action, description)
        VALUES (p_user_id, 50, 'achievement', 'Achievement unlocked: First Review');
        v_xp_awarded := v_xp_awarded + 50;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore achievement errors, review is already submitted
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'review_id', v_review_id,
    'xp_awarded', v_xp_awarded,
    'message', 'Review submitted successfully! +' || v_xp_awarded || ' XP'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION insert_review_bypass_rls TO authenticated;
GRANT EXECUTE ON FUNCTION insert_review_bypass_rls TO service_role;


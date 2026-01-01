-- REVIEWS SYSTEM
-- Complete reviews system with purchase verification and helpful votes

-- Drop existing tables if they exist (to recreate with proper structure)
DROP TABLE IF EXISTS review_reports CASCADE;
DROP TABLE IF EXISTS review_helpful_votes CASCADE;
DROP TABLE IF EXISTS product_reviews CASCADE;

-- Create product_reviews table (main reviews table)
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL,
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  helpful_count INT DEFAULT 0,
  reported_count INT DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  -- Additional fields for account page compatibility
  product_name TEXT,
  product_slug TEXT,
  product_image TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('published', 'pending', 'rejected')),
  verified_purchase BOOLEAN DEFAULT false,
  order_item_id UUID,
  
  -- Ensure one review per user per product
  UNIQUE(user_id, product_id)
);

-- Create review helpful votes table
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  
  -- One vote per user per review
  UNIQUE(user_id, review_id)
);

-- Create review reports table
CREATE TABLE IF NOT EXISTS review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  
  -- One report per user per review
  UNIQUE(user_id, review_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON product_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review_id ON review_helpful_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON review_reports(review_id);

-- Enable RLS
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_reviews
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON product_reviews;
CREATE POLICY "Anyone can view approved reviews" ON product_reviews
  FOR SELECT USING (is_approved = true OR status = 'published');

DROP POLICY IF EXISTS "Users can view their own reviews" ON product_reviews;
CREATE POLICY "Users can view their own reviews" ON product_reviews
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own reviews" ON product_reviews;
CREATE POLICY "Users can insert their own reviews" ON product_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON product_reviews;
CREATE POLICY "Users can update their own reviews" ON product_reviews
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON product_reviews;
CREATE POLICY "Users can delete their own reviews" ON product_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for helpful votes
DROP POLICY IF EXISTS "Anyone can view helpful votes" ON review_helpful_votes;
CREATE POLICY "Anyone can view helpful votes" ON review_helpful_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own votes" ON review_helpful_votes;
CREATE POLICY "Users can manage their own votes" ON review_helpful_votes
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for reports
DROP POLICY IF EXISTS "Users can view their own reports" ON review_reports;
CREATE POLICY "Users can view their own reports" ON review_reports
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create reports" ON review_reports;
CREATE POLICY "Users can create reports" ON review_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to check if user has purchased a product
CREATE OR REPLACE FUNCTION has_purchased_product(p_user_id UUID, p_product_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = p_user_id
      AND o.payment_status = 'paid'
      AND oi.product_id = p_product_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to submit a review
CREATE OR REPLACE FUNCTION submit_review(
  p_product_id TEXT,
  p_rating INT,
  p_title TEXT,
  p_content TEXT,
  p_author_name TEXT,
  p_images TEXT[] DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_has_purchased BOOLEAN;
  v_order_id UUID;
  v_review_id UUID;
  v_xp_awarded INT := 0;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be logged in to submit a review');
  END IF;
  
  -- Check if user has purchased this product
  SELECT EXISTS (
    SELECT 1 
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = v_user_id
      AND o.payment_status = 'paid'
      AND oi.product_id = p_product_id
  ) INTO v_has_purchased;
  
  IF NOT v_has_purchased THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must purchase this product before leaving a review');
  END IF;
  
  -- Get the order ID for verification badge
  SELECT o.id INTO v_order_id
  FROM orders o
  JOIN order_items oi ON o.id = oi.order_id
  WHERE o.user_id = v_user_id
    AND o.payment_status = 'paid'
    AND oi.product_id = p_product_id
  ORDER BY o.created_at DESC
  LIMIT 1;
  
  -- Check if user already reviewed this product
  IF EXISTS (SELECT 1 FROM product_reviews WHERE user_id = v_user_id AND product_id = p_product_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already reviewed this product');
  END IF;
  
  -- Insert the review
  INSERT INTO product_reviews (
    user_id, product_id, order_id, rating, title, content, 
    author_name, is_verified_purchase, verified_purchase, images, status
  ) VALUES (
    v_user_id, p_product_id, v_order_id, p_rating, p_title, p_content,
    p_author_name, true, true, p_images, 'published'
  )
  RETURNING id INTO v_review_id;
  
  -- Update user's total_reviews count
  UPDATE user_profiles 
  SET total_reviews = COALESCE(total_reviews, 0) + 1,
      updated_at = NOW()
  WHERE id = v_user_id;
  
  -- Award XP for writing a review
  v_xp_awarded := 25;
  
  -- Check for detailed review (longer content = bonus XP)
  IF LENGTH(p_content) > 200 THEN
    v_xp_awarded := v_xp_awarded + 15;
  END IF;
  
  -- Check for photo review
  IF array_length(p_images, 1) > 0 THEN
    v_xp_awarded := v_xp_awarded + 10;
  END IF;
  
  -- Add XP
  UPDATE user_profiles 
  SET total_xp = total_xp + v_xp_awarded,
      updated_at = NOW()
  WHERE id = v_user_id;
  
  -- Log XP transaction
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (v_user_id, v_xp_awarded, 'review', 'Wrote a review for product');
  
  -- Check achievements
  PERFORM check_achievements_v4(v_user_id);
  
  RETURN jsonb_build_object(
    'success', true, 
    'review_id', v_review_id,
    'xp_awarded', v_xp_awarded,
    'message', 'Review submitted successfully! +' || v_xp_awarded || ' XP'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get reviews for a product
CREATE OR REPLACE FUNCTION get_product_reviews(
  p_product_id TEXT,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0,
  p_sort TEXT DEFAULT 'recent'
)
RETURNS JSONB AS $$
DECLARE
  v_reviews JSONB;
  v_total INT;
  v_stats JSONB;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Get total count
  SELECT COUNT(*) INTO v_total
  FROM product_reviews
  WHERE product_id = p_product_id AND (is_approved = true OR status = 'published');
  
  -- Get review stats
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'average', COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
    'distribution', jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE rating = 5),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '1', COUNT(*) FILTER (WHERE rating = 1)
    )
  ) INTO v_stats
  FROM product_reviews
  WHERE product_id = p_product_id AND (is_approved = true OR status = 'published');
  
  -- Get reviews with user's vote status
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'created_at', r.created_at,
      'rating', r.rating,
      'title', r.title,
      'content', r.content,
      'author_name', r.author_name,
      'is_verified_purchase', COALESCE(r.is_verified_purchase, r.verified_purchase),
      'helpful_count', r.helpful_count,
      'images', r.images,
      'user_voted', CASE 
        WHEN v_user_id IS NULL THEN NULL
        ELSE (SELECT is_helpful FROM review_helpful_votes WHERE review_id = r.id AND user_id = v_user_id)
      END,
      'is_own_review', r.user_id = v_user_id
    )
    ORDER BY 
      CASE WHEN p_sort = 'recent' THEN r.created_at END DESC,
      CASE WHEN p_sort = 'helpful' THEN r.helpful_count END DESC,
      CASE WHEN p_sort = 'highest' THEN r.rating END DESC,
      CASE WHEN p_sort = 'lowest' THEN r.rating END ASC
  ) INTO v_reviews
  FROM product_reviews r
  WHERE r.product_id = p_product_id AND (r.is_approved = true OR r.status = 'published')
  LIMIT p_limit OFFSET p_offset;
  
  RETURN jsonb_build_object(
    'success', true,
    'reviews', COALESCE(v_reviews, '[]'::jsonb),
    'stats', v_stats,
    'total', v_total,
    'has_more', v_total > (p_offset + p_limit)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to vote on review helpfulness
CREATE OR REPLACE FUNCTION vote_review_helpful(p_review_id UUID, p_is_helpful BOOLEAN)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote BOOLEAN;
  v_review_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be logged in to vote');
  END IF;
  
  -- Check if review exists
  SELECT EXISTS(SELECT 1 FROM product_reviews WHERE id = p_review_id) INTO v_review_exists;
  IF NOT v_review_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Review not found');
  END IF;
  
  -- Check if user is voting on their own review
  IF EXISTS(SELECT 1 FROM product_reviews WHERE id = p_review_id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot vote on your own review');
  END IF;
  
  -- Get existing vote
  SELECT is_helpful INTO v_existing_vote
  FROM review_helpful_votes
  WHERE user_id = v_user_id AND review_id = p_review_id;
  
  IF v_existing_vote IS NOT NULL THEN
    IF v_existing_vote = p_is_helpful THEN
      -- Remove vote (toggle off)
      DELETE FROM review_helpful_votes WHERE user_id = v_user_id AND review_id = p_review_id;
      
      -- Update helpful count
      IF p_is_helpful THEN
        UPDATE product_reviews SET helpful_count = helpful_count - 1 WHERE id = p_review_id;
      END IF;
      
      RETURN jsonb_build_object('success', true, 'action', 'removed');
    ELSE
      -- Change vote
      UPDATE review_helpful_votes 
      SET is_helpful = p_is_helpful, created_at = NOW()
      WHERE user_id = v_user_id AND review_id = p_review_id;
      
      -- Update helpful count
      IF p_is_helpful THEN
        UPDATE product_reviews SET helpful_count = helpful_count + 1 WHERE id = p_review_id;
      ELSE
        UPDATE product_reviews SET helpful_count = helpful_count - 1 WHERE id = p_review_id;
      END IF;
      
      RETURN jsonb_build_object('success', true, 'action', 'changed');
    END IF;
  ELSE
    -- New vote
    INSERT INTO review_helpful_votes (user_id, review_id, is_helpful)
    VALUES (v_user_id, p_review_id, p_is_helpful);
    
    -- Update helpful count
    IF p_is_helpful THEN
      UPDATE product_reviews SET helpful_count = helpful_count + 1 WHERE id = p_review_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'action', 'added');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to report a review
CREATE OR REPLACE FUNCTION report_review(p_review_id UUID, p_reason TEXT, p_details TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be logged in to report a review');
  END IF;
  
  -- Check if already reported
  IF EXISTS(SELECT 1 FROM review_reports WHERE user_id = v_user_id AND review_id = p_review_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already reported this review');
  END IF;
  
  -- Insert report
  INSERT INTO review_reports (user_id, review_id, reason, description, details)
  VALUES (v_user_id, p_review_id, p_reason, p_details, p_details);
  
  -- Increment reported count
  UPDATE product_reviews SET reported_count = reported_count + 1 WHERE id = p_review_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Review reported successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's reviews (for account page)
CREATE OR REPLACE FUNCTION get_user_reviews(p_limit INT DEFAULT 20, p_offset INT DEFAULT 0)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_reviews JSONB;
  v_total INT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get total count
  SELECT COUNT(*) INTO v_total FROM product_reviews WHERE user_id = v_user_id;
  
  -- Get reviews
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'created_at', r.created_at,
      'product_id', r.product_id,
      'rating', r.rating,
      'title', r.title,
      'content', r.content,
      'helpful_count', r.helpful_count,
      'is_approved', r.is_approved,
      'images', r.images
    )
    ORDER BY r.created_at DESC
  ) INTO v_reviews
  FROM product_reviews r
  WHERE r.user_id = v_user_id
  LIMIT p_limit OFFSET p_offset;
  
  RETURN jsonb_build_object(
    'success', true,
    'reviews', COALESCE(v_reviews, '[]'::jsonb),
    'total', v_total,
    'has_more', v_total > (p_offset + p_limit)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can review a product
CREATE OR REPLACE FUNCTION can_review_product(p_product_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_has_purchased BOOLEAN;
  v_has_reviewed BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'can_review', false, 
      'reason', 'not_logged_in',
      'message', 'Please sign in to write a review'
    );
  END IF;
  
  -- Check if user has purchased
  SELECT EXISTS (
    SELECT 1 
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = v_user_id
      AND o.payment_status = 'paid'
      AND oi.product_id = p_product_id
  ) INTO v_has_purchased;
  
  IF NOT v_has_purchased THEN
    RETURN jsonb_build_object(
      'can_review', false, 
      'reason', 'not_purchased',
      'message', 'You must purchase this product before leaving a review'
    );
  END IF;
  
  -- Check if user already reviewed
  SELECT EXISTS (
    SELECT 1 FROM product_reviews WHERE user_id = v_user_id AND product_id = p_product_id
  ) INTO v_has_reviewed;
  
  IF v_has_reviewed THEN
    RETURN jsonb_build_object(
      'can_review', false, 
      'reason', 'already_reviewed',
      'message', 'You have already reviewed this product'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'can_review', true,
    'reason', 'eligible',
    'message', 'You can write a review for this product'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION has_purchased_product(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_review(TEXT, INT, TEXT, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_reviews(TEXT, INT, INT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION vote_review_helpful(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION report_review(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_reviews(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_review_product(TEXT) TO anon, authenticated;

-- Update user_profiles to ensure total_reviews column exists
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0;

-- Create trigger to check achievements after review
CREATE OR REPLACE FUNCTION trigger_check_achievements_on_review()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_achievements_v4(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_achievements_after_review ON product_reviews;
CREATE TRIGGER check_achievements_after_review
  AFTER INSERT ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_achievements_on_review();

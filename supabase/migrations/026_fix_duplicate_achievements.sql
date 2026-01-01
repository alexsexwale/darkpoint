-- FIX DUPLICATE ACHIEVEMENTS
-- This migration permanently removes all duplicate achievements and ensures only ONE unique achievement exists for each type

-- Step 1: Delete ALL achievements first to start fresh
DELETE FROM achievements;

-- Step 2: Reset user_achievements that might have invalid references
DELETE FROM user_achievements WHERE achievement_id NOT IN (SELECT id FROM achievements);

-- Step 3: Insert the DEFINITIVE list of achievements - NO DUPLICATES
-- Each achievement has a unique ID and purpose

INSERT INTO achievements (id, name, description, category, icon, xp_reward, rarity, requirement_type, requirement_value, is_hidden, is_active)
VALUES
  -- SHOPPING ACHIEVEMENTS (unique spending milestones)
  ('first_purchase', 'First Timer', 'Make your first purchase', 'shopping', '🛒', 50, 'common', 'purchases', 1, false, true),
  ('five_purchases', 'Regular Customer', 'Make 5 purchases', 'shopping', '🛍️', 100, 'common', 'purchases', 5, false, true),
  ('ten_purchases', 'Loyal Shopper', 'Make 10 purchases', 'shopping', '💎', 200, 'rare', 'purchases', 10, false, true),
  ('twenty_purchases', 'Shopping Enthusiast', 'Make 20 purchases', 'shopping', '👑', 400, 'epic', 'purchases', 20, false, true),
  ('fifty_purchases', 'Shopping Legend', 'Make 50 purchases', 'shopping', '🏆', 750, 'legendary', 'purchases', 50, true, true),
  
  -- SPENDING MILESTONES
  ('spent_500', 'Supporter', 'Spend R500 total', 'shopping', '💰', 50, 'common', 'total_spent', 500, false, true),
  ('spent_1000', 'Contributor', 'Spend R1,000 total', 'shopping', '💵', 100, 'common', 'total_spent', 1000, false, true),
  ('spent_2500', 'Big Spender', 'Spend R2,500 total', 'shopping', '💸', 200, 'rare', 'total_spent', 2500, false, true),
  ('spent_5000', 'Investor', 'Spend R5,000 total', 'shopping', '📈', 300, 'epic', 'total_spent', 5000, false, true),
  ('spent_10000', 'Whale', 'Spend R10,000 total', 'shopping', '🐳', 500, 'legendary', 'total_spent', 10000, true, true),
  
  -- SINGLE ORDER VALUE
  ('order_250', 'Generous Order', 'Place an order of R250+', 'shopping', '📦', 25, 'common', 'single_order_value', 250, false, true),
  ('order_500', 'Big Order', 'Place an order of R500+', 'shopping', '📦', 50, 'common', 'single_order_value', 500, false, true),
  ('order_1000', 'Premium Order', 'Place an order of R1,000+', 'shopping', '📦', 100, 'rare', 'single_order_value', 1000, false, true),
  ('order_2500', 'VIP Order', 'Place an order of R2,500+', 'shopping', '📦', 250, 'epic', 'single_order_value', 2500, true, true),
  
  -- WISHLIST ACHIEVEMENTS
  ('wishlist_1', 'Window Shopper', 'Add first item to wishlist', 'engagement', '❤️', 15, 'common', 'wishlist', 1, false, true),
  ('wishlist_5', 'Wishful Thinker', 'Add 5 items to wishlist', 'engagement', '💕', 30, 'common', 'wishlist', 5, false, true),
  ('wishlist_10', 'Dream Collector', 'Add 10 items to wishlist', 'engagement', '💖', 50, 'rare', 'wishlist', 10, false, true),
  ('wishlist_25', 'Wish Master', 'Add 25 items to wishlist', 'engagement', '🌟', 100, 'epic', 'wishlist', 25, true, true),
  
  -- REVIEW ACHIEVEMENTS
  ('review_1', 'First Review', 'Write your first review', 'engagement', '✍️', 25, 'common', 'reviews', 1, false, true),
  ('review_5', 'Reviewer', 'Write 5 reviews', 'engagement', '📝', 75, 'common', 'reviews', 5, false, true),
  ('review_10', 'Critic', 'Write 10 reviews', 'engagement', '🎭', 150, 'rare', 'reviews', 10, false, true),
  ('review_25', 'Top Critic', 'Write 25 reviews', 'engagement', '⭐', 300, 'epic', 'reviews', 25, true, true),
  
  -- REFERRAL ACHIEVEMENTS
  ('referral_1', 'Friendly Face', 'Refer your first friend', 'social', '👋', 50, 'common', 'referrals', 1, false, true),
  ('referral_3', 'Social Butterfly', 'Refer 3 friends', 'social', '🦋', 100, 'common', 'referrals', 3, false, true),
  ('referral_5', 'Influencer', 'Refer 5 friends', 'social', '📢', 200, 'rare', 'referrals', 5, false, true),
  ('referral_10', 'Legend Maker', 'Refer 10 friends', 'social', '🌟', 500, 'epic', 'referrals', 10, true, true),
  
  -- STREAK ACHIEVEMENTS
  ('streak_3', 'Getting Warmed Up', '3-day login streak', 'engagement', '🔥', 25, 'common', 'streak', 3, false, true),
  ('streak_7', 'Streak Master', '7-day login streak', 'engagement', '⚡', 100, 'common', 'streak', 7, false, true),
  ('streak_14', 'Dedicated', '14-day login streak', 'engagement', '💪', 200, 'rare', 'streak', 14, false, true),
  ('streak_30', 'Committed', '30-day login streak', 'engagement', '🏅', 500, 'epic', 'streak', 30, true, true),
  ('streak_60', 'Legendary Streak', '60-day login streak', 'engagement', '👑', 1000, 'legendary', 'streak', 60, true, true),
  
  -- LEVEL ACHIEVEMENTS
  ('level_5', 'Rising Star', 'Reach Level 5', 'special', '⭐', 50, 'common', 'level', 5, false, true),
  ('level_10', 'Veteran', 'Reach Level 10', 'special', '🌟', 150, 'rare', 'level', 10, false, true),
  ('level_20', 'Elite', 'Reach Level 20', 'special', '💫', 300, 'epic', 'level', 20, false, true),
  ('level_30', 'Master', 'Reach Level 30', 'special', '👑', 500, 'legendary', 'level', 30, true, true),
  
  -- SPECIAL ACHIEVEMENTS
  ('newsletter', 'Stay Connected', 'Subscribe to newsletter', 'engagement', '📧', 25, 'common', 'newsletter', 1, false, true),
  ('profile_complete', 'Identity Established', 'Complete your profile', 'engagement', '🎭', 30, 'common', 'profile_complete', 1, false, true),
  ('first_spin', 'Lucky Player', 'Use the spin wheel', 'engagement', '🎰', 20, 'common', 'spin', 1, false, true),
  ('product_view_10', 'Browser', 'View 10 different products', 'engagement', '👀', 25, 'common', 'products_viewed', 10, false, true),
  ('product_view_50', 'Explorer', 'View 50 different products', 'engagement', '🔍', 75, 'rare', 'products_viewed', 50, false, true),
  
  -- CATEGORY EXPLORATION
  ('category_3', 'Category Explorer', 'Buy from 3 categories', 'shopping', '🗂️', 50, 'common', 'categories_purchased', 3, false, true),
  ('category_5', 'Diverse Shopper', 'Buy from 5 categories', 'shopping', '📚', 100, 'rare', 'categories_purchased', 5, false, true),
  
  -- SHARING
  ('share_1', 'Sharer', 'Share a product', 'social', '📤', 20, 'common', 'shares', 1, false, true),
  ('share_5', 'Social Sharer', 'Share 5 products', 'social', '🔗', 50, 'common', 'shares', 5, false, true),
  ('share_10', 'Brand Champion', 'Share 10 products', 'social', '📣', 100, 'rare', 'shares', 10, false, true)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  xp_reward = EXCLUDED.xp_reward,
  rarity = EXCLUDED.rarity,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  is_hidden = EXCLUDED.is_hidden,
  is_active = EXCLUDED.is_active;

-- Add unique constraint on name to prevent future duplicates
-- First drop it if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'achievements_name_key') THEN
    ALTER TABLE achievements DROP CONSTRAINT achievements_name_key;
  END IF;
END $$;

ALTER TABLE achievements ADD CONSTRAINT achievements_name_key UNIQUE (name);

-- Also add avatar_url column to user_profiles if it doesn't exist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;


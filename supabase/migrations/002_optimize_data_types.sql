-- Migration: Optimize Data Types
-- Run this AFTER 001_gamification_schema.sql
-- This migration converts TEXT columns to more efficient types

-- ============================================
-- CREATE ENUM TYPES
-- ============================================

-- Achievement category enum
DO $$ BEGIN
    CREATE TYPE achievement_category AS ENUM ('shopping', 'social', 'engagement', 'collector', 'special');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Rarity enum (used in achievements and mystery boxes)
DO $$ BEGIN
    CREATE TYPE rarity_type AS ENUM ('common', 'rare', 'epic', 'legendary', 'mythic');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Prize type enum
DO $$ BEGIN
    CREATE TYPE prize_type AS ENUM ('discount', 'xp', 'shipping', 'credit', 'spin', 'mystery');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Referral status enum
DO $$ BEGIN
    CREATE TYPE referral_status AS ENUM ('pending', 'signed_up', 'converted');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Reward category enum
DO $$ BEGIN
    CREATE TYPE reward_category AS ENUM ('discount', 'shipping', 'xp_booster', 'cosmetic', 'exclusive', 'spin');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Discount type enum
DO $$ BEGIN
    CREATE TYPE discount_type AS ENUM ('percent', 'fixed', 'shipping');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Coupon source enum
DO $$ BEGIN
    CREATE TYPE coupon_source AS ENUM ('spin', 'reward', 'referral', 'achievement', 'promotion', 'manual');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- XP action enum
DO $$ BEGIN
    CREATE TYPE xp_action AS ENUM (
        'signup', 'daily_login', 'first_purchase', 'purchase', 
        'review', 'photo_review', 'share', 'referral', 
        'quest', 'achievement', 'spin_reward', 'bonus', 'admin'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- ALTER user_profiles TABLE
-- ============================================

-- username: max 30 chars is plenty for usernames
ALTER TABLE user_profiles 
    ALTER COLUMN username TYPE VARCHAR(30);

-- display_name: max 50 chars for display names
ALTER TABLE user_profiles 
    ALTER COLUMN display_name TYPE VARCHAR(50);

-- avatar_url: URLs can be long, 512 is reasonable
ALTER TABLE user_profiles 
    ALTER COLUMN avatar_url TYPE VARCHAR(512);

-- referral_code: "DARK-XXXXXX1234" = ~15 chars, use 20 for safety
ALTER TABLE user_profiles 
    ALTER COLUMN referral_code TYPE VARCHAR(20);

-- ============================================
-- ALTER levels TABLE
-- ============================================

-- title: level titles are short ("Noob", "Elite", etc.)
ALTER TABLE levels 
    ALTER COLUMN title TYPE VARCHAR(30);

-- badge_color: hex colors are 7 chars (#FFFFFF)
ALTER TABLE levels 
    ALTER COLUMN badge_color TYPE VARCHAR(10);

-- ============================================
-- ALTER achievements TABLE
-- ============================================

-- id: achievement IDs like "first_blood", "big_spender_100"
ALTER TABLE achievements 
    ALTER COLUMN id TYPE VARCHAR(50);

-- name: achievement names are short
ALTER TABLE achievements 
    ALTER COLUMN name TYPE VARCHAR(100);

-- description: achievement descriptions
ALTER TABLE achievements 
    ALTER COLUMN description TYPE VARCHAR(255);

-- icon: emoji or icon code (emojis can be 4 bytes in UTF-8)
ALTER TABLE achievements 
    ALTER COLUMN icon TYPE VARCHAR(10);

-- requirement_type: like "purchases", "total_spent", etc.
ALTER TABLE achievements 
    ALTER COLUMN requirement_type TYPE VARCHAR(30);

-- Convert category to ENUM (drop constraint first)
ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_category_check;
ALTER TABLE achievements 
    ALTER COLUMN category TYPE achievement_category 
    USING category::achievement_category;

-- Convert rarity to ENUM (need to drop default first, then re-add)
ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_rarity_check;
ALTER TABLE achievements ALTER COLUMN rarity DROP DEFAULT;
ALTER TABLE achievements 
    ALTER COLUMN rarity TYPE rarity_type 
    USING rarity::rarity_type;
ALTER TABLE achievements ALTER COLUMN rarity SET DEFAULT 'common'::rarity_type;

-- ============================================
-- ALTER user_achievements TABLE
-- ============================================

-- achievement_id: matches achievements.id
ALTER TABLE user_achievements 
    ALTER COLUMN achievement_id TYPE VARCHAR(50);

-- ============================================
-- ALTER daily_logins TABLE
-- ============================================

-- bonus_reward: JSON string of reward data, max ~200 chars
ALTER TABLE daily_logins 
    ALTER COLUMN bonus_reward TYPE VARCHAR(255);

-- ============================================
-- ALTER spin_prizes TABLE
-- ============================================

-- id: prize IDs like "discount_5", "xp_50"
ALTER TABLE spin_prizes 
    ALTER COLUMN id TYPE VARCHAR(30);

-- name: prize names
ALTER TABLE spin_prizes 
    ALTER COLUMN name TYPE VARCHAR(50);

-- description: prize descriptions
ALTER TABLE spin_prizes 
    ALTER COLUMN description TYPE VARCHAR(255);

-- prize_value: values like "5", "100", "free", "mystery"
ALTER TABLE spin_prizes 
    ALTER COLUMN prize_value TYPE VARCHAR(20);

-- color: hex color
ALTER TABLE spin_prizes 
    ALTER COLUMN color TYPE VARCHAR(10);

-- Convert prize_type to ENUM
ALTER TABLE spin_prizes DROP CONSTRAINT IF EXISTS spin_prizes_prize_type_check;
ALTER TABLE spin_prizes 
    ALTER COLUMN prize_type TYPE prize_type 
    USING prize_type::prize_type;

-- ============================================
-- ALTER spin_history TABLE
-- ============================================

-- prize_id: matches spin_prizes.id
ALTER TABLE spin_history 
    ALTER COLUMN prize_id TYPE VARCHAR(30);

-- ============================================
-- ALTER referrals TABLE
-- ============================================

-- referral_code: same as user_profiles.referral_code
ALTER TABLE referrals 
    ALTER COLUMN referral_code TYPE VARCHAR(20);

-- Convert status to ENUM (drop default first)
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE referrals ALTER COLUMN status DROP DEFAULT;
ALTER TABLE referrals 
    ALTER COLUMN status TYPE referral_status 
    USING status::referral_status;
ALTER TABLE referrals ALTER COLUMN status SET DEFAULT 'pending'::referral_status;

-- ============================================
-- ALTER rewards TABLE
-- ============================================

-- id: reward IDs like "discount_5", "badge_fire"
ALTER TABLE rewards 
    ALTER COLUMN id TYPE VARCHAR(30);

-- name: reward names
ALTER TABLE rewards 
    ALTER COLUMN name TYPE VARCHAR(100);

-- description: reward descriptions
ALTER TABLE rewards 
    ALTER COLUMN description TYPE VARCHAR(255);

-- value: values like "5", "2x_24h", "badge_fire"
ALTER TABLE rewards 
    ALTER COLUMN value TYPE VARCHAR(30);

-- image_url: URL for reward image
ALTER TABLE rewards 
    ALTER COLUMN image_url TYPE VARCHAR(512);

-- Convert category to ENUM
ALTER TABLE rewards DROP CONSTRAINT IF EXISTS rewards_category_check;
ALTER TABLE rewards 
    ALTER COLUMN category TYPE reward_category 
    USING category::reward_category;

-- ============================================
-- ALTER user_rewards TABLE
-- ============================================

-- reward_id: matches rewards.id
ALTER TABLE user_rewards 
    ALTER COLUMN reward_id TYPE VARCHAR(30);

-- ============================================
-- ALTER mystery_boxes TABLE
-- ============================================

-- id: box IDs like "starter_crate"
ALTER TABLE mystery_boxes 
    ALTER COLUMN id TYPE VARCHAR(30);

-- name: box names
ALTER TABLE mystery_boxes 
    ALTER COLUMN name TYPE VARCHAR(50);

-- description: box descriptions
ALTER TABLE mystery_boxes 
    ALTER COLUMN description TYPE VARCHAR(255);

-- image_url: URL for box image
ALTER TABLE mystery_boxes 
    ALTER COLUMN image_url TYPE VARCHAR(512);

-- ============================================
-- ALTER mystery_box_purchases TABLE
-- ============================================

-- box_id: matches mystery_boxes.id
ALTER TABLE mystery_box_purchases 
    ALTER COLUMN box_id TYPE VARCHAR(30);

-- rarity_rolled: the rarity that was rolled
ALTER TABLE mystery_box_purchases 
    ALTER COLUMN rarity_rolled TYPE rarity_type 
    USING rarity_rolled::rarity_type;

-- product_id: external product ID from CJ Dropshipping or similar
ALTER TABLE mystery_box_purchases 
    ALTER COLUMN product_id TYPE VARCHAR(100);

-- product_name: name of the product won
ALTER TABLE mystery_box_purchases 
    ALTER COLUMN product_name TYPE VARCHAR(255);

-- ============================================
-- ALTER xp_transactions TABLE
-- ============================================

-- action: XP action type
ALTER TABLE xp_transactions 
    ALTER COLUMN action TYPE xp_action 
    USING action::xp_action;

-- description: transaction description
ALTER TABLE xp_transactions 
    ALTER COLUMN description TYPE VARCHAR(255);

-- ============================================
-- ALTER user_coupons TABLE
-- ============================================

-- code: coupon codes like "DARK-ABC123-XYZ"
ALTER TABLE user_coupons 
    ALTER COLUMN code TYPE VARCHAR(30);

-- Convert discount_type to ENUM
ALTER TABLE user_coupons DROP CONSTRAINT IF EXISTS user_coupons_discount_type_check;
ALTER TABLE user_coupons 
    ALTER COLUMN discount_type TYPE discount_type 
    USING discount_type::discount_type;

-- Convert source to ENUM
ALTER TABLE user_coupons 
    ALTER COLUMN source TYPE coupon_source 
    USING source::coupon_source;

-- ============================================
-- UPDATE FUNCTIONS TO USE NEW TYPES
-- ============================================

-- Drop and recreate generate_referral_code function (can't change return type)
DROP FUNCTION IF EXISTS generate_referral_code(TEXT);
CREATE FUNCTION generate_referral_code(username TEXT)
RETURNS VARCHAR(20) AS $$
DECLARE
  code VARCHAR(20);
BEGIN
  code := 'DARK-' || UPPER(LEFT(COALESCE(username, 'USER'), 6)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Update handle_new_user function to use new types
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  ref_code VARCHAR(20);
BEGIN
  -- Generate referral code
  ref_code := generate_referral_code(COALESCE(NEW.raw_user_meta_data->>'username', LEFT(NEW.email, 6)));
  
  -- Create user profile
  INSERT INTO user_profiles (id, username, display_name, referral_code, total_xp)
  VALUES (
    NEW.id,
    LEFT(NEW.raw_user_meta_data->>'username', 30), -- Ensure username fits
    LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username'), 50), -- Ensure display_name fits
    ref_code,
    100 -- Signup bonus XP
  );
  
  -- Log XP transaction
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (NEW.id, 100, 'signup'::xp_action, 'Welcome bonus XP');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TYPE achievement_category IS 'Categories for achievements: shopping, social, engagement, collector, special';
COMMENT ON TYPE rarity_type IS 'Rarity levels: common, rare, epic, legendary, mythic';
COMMENT ON TYPE prize_type IS 'Types of spin wheel prizes';
COMMENT ON TYPE referral_status IS 'Status of a referral: pending, signed_up, converted';
COMMENT ON TYPE reward_category IS 'Categories for rewards shop items';
COMMENT ON TYPE discount_type IS 'Types of discounts: percent, fixed amount, or free shipping';
COMMENT ON TYPE coupon_source IS 'Source of coupon generation';
COMMENT ON TYPE xp_action IS 'Types of actions that award XP';

-- ============================================
-- VERIFY CHANGES (run manually to check)
-- ============================================
-- SELECT column_name, data_type, character_maximum_length, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'achievements';

-- Gamification System Database Schema
-- Run this migration in your Supabase SQL editor

-- ============================================
-- USER PROFILES (Extended user data)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  
  -- XP & Leveling
  total_xp INTEGER DEFAULT 0 NOT NULL,
  current_level INTEGER DEFAULT 1 NOT NULL,
  
  -- Streaks
  current_streak INTEGER DEFAULT 0 NOT NULL,
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  last_login_date DATE,
  
  -- Stats
  total_spent DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  total_orders INTEGER DEFAULT 0 NOT NULL,
  total_reviews INTEGER DEFAULT 0 NOT NULL,
  
  -- Referral
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES user_profiles(id),
  referral_count INTEGER DEFAULT 0 NOT NULL,
  
  -- Rewards
  available_spins INTEGER DEFAULT 1 NOT NULL,
  store_credit DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- LEVEL DEFINITIONS
-- ============================================
CREATE TABLE IF NOT EXISTS levels (
  level INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  xp_required INTEGER NOT NULL,
  perks JSONB DEFAULT '[]'::jsonb,
  discount_percent INTEGER DEFAULT 0,
  badge_color TEXT DEFAULT '#e08821'
);

-- Insert default levels
INSERT INTO levels (level, title, xp_required, perks, discount_percent, badge_color) VALUES
  (1, 'Noob', 0, '["Welcome 5% discount"]', 5, '#6b7280'),
  (2, 'Noob', 100, '["Welcome 5% discount"]', 5, '#6b7280'),
  (3, 'Noob', 200, '["Welcome 5% discount"]', 5, '#6b7280'),
  (4, 'Noob', 300, '["Welcome 5% discount"]', 5, '#6b7280'),
  (5, 'Casual', 500, '["Free shipping on R500+"]', 5, '#22c55e'),
  (6, 'Casual', 700, '["Free shipping on R500+"]', 5, '#22c55e'),
  (7, 'Casual', 1000, '["Free shipping on R500+"]', 5, '#22c55e'),
  (8, 'Casual', 1300, '["Free shipping on R500+"]', 5, '#22c55e'),
  (9, 'Casual', 1600, '["Free shipping on R500+"]', 5, '#22c55e'),
  (10, 'Gamer', 2000, '["Early sale access", "Free shipping on R500+"]', 5, '#3b82f6'),
  (15, 'Gamer', 5000, '["Early sale access", "Free shipping on R500+"]', 5, '#3b82f6'),
  (20, 'Pro', 10000, '["7% permanent discount", "Early sale access", "Free shipping"]', 7, '#8b5cf6'),
  (25, 'Pro', 15000, '["7% permanent discount", "Early sale access", "Free shipping"]', 7, '#8b5cf6'),
  (30, 'Pro', 22000, '["7% permanent discount", "Early sale access", "Free shipping"]', 7, '#8b5cf6'),
  (35, 'Legend', 30000, '["10% permanent discount", "Exclusive items", "Free shipping"]', 10, '#f59e0b'),
  (40, 'Legend', 45000, '["10% permanent discount", "Exclusive items", "Free shipping"]', 10, '#f59e0b'),
  (45, 'Legend', 60000, '["10% permanent discount", "Exclusive items", "Free shipping"]', 10, '#f59e0b'),
  (50, 'Elite', 75000, '["15% permanent discount", "VIP support", "Monthly gifts", "All perks"]', 15, '#ef4444')
ON CONFLICT (level) DO NOTHING;

-- ============================================
-- ACHIEVEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('shopping', 'social', 'engagement', 'collector', 'special')),
  icon TEXT NOT NULL,
  xp_reward INTEGER DEFAULT 50 NOT NULL,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER DEFAULT 1 NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default achievements
INSERT INTO achievements (id, name, description, category, icon, xp_reward, rarity, requirement_type, requirement_value, is_hidden) VALUES
  -- Shopping achievements
  ('first_blood', 'First Blood', 'Make your first purchase', 'shopping', '🎯', 100, 'common', 'purchases', 1, false),
  ('big_spender_100', 'Getting Started', 'Spend R100 total', 'shopping', '💸', 50, 'common', 'total_spent', 100, false),
  ('big_spender_1000', 'Supporter', 'Spend R1,000 total', 'shopping', '💰', 150, 'rare', 'total_spent', 1000, false),
  ('big_spender_5000', 'Investor', 'Spend R5,000 total', 'shopping', '🏦', 300, 'epic', 'total_spent', 5000, false),
  ('big_spender_10000', 'Whale', 'Spend R10,000 total', 'shopping', '🐋', 500, 'legendary', 'total_spent', 10000, false),
  ('order_5', 'Regular', '5 orders completed', 'shopping', '📦', 100, 'common', 'orders', 5, false),
  ('order_10', 'Loyal Customer', '10 orders completed', 'shopping', '🏆', 200, 'rare', 'orders', 10, false),
  ('order_25', 'VIP Shopper', '25 orders completed', 'shopping', '👑', 400, 'epic', 'orders', 25, false),
  
  -- Social achievements
  ('share_1', 'Sharing is Caring', 'Share your first product', 'social', '🔗', 25, 'common', 'shares', 1, false),
  ('share_5', 'Social Butterfly', 'Share 5 products', 'social', '🦋', 75, 'common', 'shares', 5, false),
  ('share_20', 'Influencer', 'Share 20 products', 'social', '⭐', 200, 'rare', 'shares', 20, false),
  ('refer_1', 'Recruiter', 'Refer your first friend', 'social', '🤝', 100, 'common', 'referrals', 1, false),
  ('refer_5', 'Ambassador', 'Refer 5 friends', 'social', '🎖️', 300, 'rare', 'referrals', 5, false),
  ('refer_10', 'Legend Maker', 'Refer 10 friends', 'social', '🏅', 500, 'epic', 'referrals', 10, false),
  
  -- Engagement achievements
  ('review_1', 'Critic', 'Write your first review', 'engagement', '📝', 50, 'common', 'reviews', 1, false),
  ('review_5', 'Reviewer', 'Write 5 reviews', 'engagement', '✍️', 150, 'common', 'reviews', 5, false),
  ('review_10', 'Expert Reviewer', 'Write 10 reviews', 'engagement', '🎓', 300, 'rare', 'reviews', 10, false),
  ('streak_3', 'Getting Warmed Up', '3-day login streak', 'engagement', '🔥', 30, 'common', 'streak', 3, false),
  ('streak_7', 'Streak Master', '7-day login streak', 'engagement', '🔥', 100, 'common', 'streak', 7, false),
  ('streak_14', 'Dedicated', '14-day login streak', 'engagement', '💪', 200, 'rare', 'streak', 14, false),
  ('streak_30', 'Unstoppable', '30-day login streak', 'engagement', '⚡', 500, 'epic', 'streak', 30, false),
  
  -- Collector achievements
  ('wishlist_1', 'Window Shopper', 'Add first item to wishlist', 'collector', '💝', 15, 'common', 'wishlist', 1, false),
  ('wishlist_10', 'Collector', 'Add 10 items to wishlist', 'collector', '📋', 50, 'common', 'wishlist', 10, false),
  ('wishlist_25', 'Curator', 'Add 25 items to wishlist', 'collector', '🗃️', 100, 'rare', 'wishlist', 25, false),
  ('category_explorer', 'Explorer', 'Browse all categories', 'collector', '🧭', 75, 'common', 'categories_viewed', 8, false),
  
  -- Special achievements
  ('night_owl', 'Night Owl', 'Shop between midnight and 4am', 'special', '🦉', 50, 'rare', 'special', 1, true),
  ('speed_runner', 'Speed Runner', 'Checkout in under 2 minutes', 'special', '⚡', 75, 'rare', 'special', 1, true),
  ('early_bird', 'Early Bird', 'Be first to buy a new product', 'special', '🐦', 100, 'epic', 'special', 1, true),
  ('birthday', 'Birthday Bonus', 'Shop on your birthday', 'special', '🎂', 200, 'rare', 'special', 1, true),
  ('founder', 'Founding Member', 'Join during launch month', 'special', '🏛️', 500, 'legendary', 'special', 1, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- USER ACHIEVEMENTS (Unlocked achievements)
-- ============================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  progress INTEGER DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

-- ============================================
-- DAILY LOGINS
-- ============================================
CREATE TABLE IF NOT EXISTS daily_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  day_of_streak INTEGER NOT NULL,
  xp_earned INTEGER NOT NULL,
  bonus_reward TEXT,
  claimed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, login_date)
);

-- ============================================
-- SPIN WHEEL PRIZES
-- ============================================
CREATE TABLE IF NOT EXISTS spin_prizes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  prize_type TEXT NOT NULL CHECK (prize_type IN ('discount', 'xp', 'shipping', 'credit', 'spin', 'mystery')),
  prize_value TEXT NOT NULL,
  probability DECIMAL(5, 2) NOT NULL,
  color TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert default spin prizes
INSERT INTO spin_prizes (id, name, description, prize_type, prize_value, probability, color) VALUES
  ('discount_5', '5% Off', '5% discount on next order', 'discount', '5', 30, '#22c55e'),
  ('discount_10', '10% Off', '10% discount on next order', 'discount', '10', 20, '#3b82f6'),
  ('xp_50', '50 XP', 'Bonus 50 XP', 'xp', '50', 20, '#8b5cf6'),
  ('xp_100', '100 XP', 'Bonus 100 XP', 'xp', '100', 10, '#a855f7'),
  ('free_shipping', 'Free Shipping', 'Free shipping on next order', 'shipping', 'free', 15, '#f59e0b'),
  ('mystery', 'Mystery Gift', 'A surprise awaits!', 'mystery', 'mystery', 4, '#ec4899'),
  ('grand_prize', 'R500 Credit', 'R500 store credit!', 'credit', '500', 1, '#ef4444')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SPIN HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS spin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  prize_id TEXT NOT NULL REFERENCES spin_prizes(id),
  spun_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMPTZ
);

-- ============================================
-- REFERRALS
-- ============================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'converted')),
  reward_claimed BOOLEAN DEFAULT FALSE,
  reward_amount DECIMAL(10, 2),
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  converted_at TIMESTAMPTZ
);

-- ============================================
-- REWARDS SHOP ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('discount', 'shipping', 'xp_booster', 'cosmetic', 'exclusive', 'spin')),
  xp_cost INTEGER NOT NULL,
  value TEXT NOT NULL,
  image_url TEXT,
  stock INTEGER, -- NULL means unlimited
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default rewards
INSERT INTO rewards (id, name, description, category, xp_cost, value, stock) VALUES
  ('discount_5', '5% Discount', '5% off your next order', 'discount', 100, '5', NULL),
  ('discount_10', '10% Discount', '10% off your next order', 'discount', 250, '10', NULL),
  ('discount_15', '15% Discount', '15% off your next order', 'discount', 500, '15', NULL),
  ('free_shipping', 'Free Shipping', 'Free shipping on any order', 'shipping', 150, 'free', NULL),
  ('xp_boost_2x', '2x XP Boost', 'Double XP for 24 hours', 'xp_booster', 300, '2x_24h', NULL),
  ('extra_spin', 'Bonus Spin', 'One extra wheel spin', 'spin', 200, '1', NULL),
  ('badge_fire', 'Fire Badge', 'Exclusive profile badge', 'cosmetic', 500, 'badge_fire', 100),
  ('badge_crown', 'Crown Badge', 'Royal profile badge', 'cosmetic', 1000, 'badge_crown', 50),
  ('frame_gold', 'Gold Frame', 'Gold avatar frame', 'cosmetic', 1500, 'frame_gold', 25)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- USER REWARDS (Claimed rewards)
-- ============================================
CREATE TABLE IF NOT EXISTS user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL REFERENCES rewards(id),
  claimed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- ============================================
-- MYSTERY BOXES
-- ============================================
CREATE TABLE IF NOT EXISTS mystery_boxes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  min_value DECIMAL(10, 2) NOT NULL,
  max_value DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  rarity_weights JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default mystery boxes
INSERT INTO mystery_boxes (id, name, description, price, min_value, max_value, rarity_weights) VALUES
  ('starter_crate', 'Starter Crate', 'Perfect for beginners - guaranteed value!', 199, 200, 400, '{"common": 60, "rare": 30, "epic": 10}'),
  ('pro_crate', 'Pro Crate', 'Higher stakes, better rewards', 499, 500, 1000, '{"common": 40, "rare": 40, "epic": 18, "legendary": 2}'),
  ('elite_crate', 'Elite Crate', 'Premium loot for serious collectors', 999, 1000, 2500, '{"rare": 20, "epic": 50, "legendary": 25, "mythic": 5}')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- MYSTERY BOX PURCHASE HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS mystery_box_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  box_id TEXT NOT NULL REFERENCES mystery_boxes(id),
  rarity_rolled TEXT NOT NULL,
  product_id TEXT, -- The actual product won
  product_name TEXT,
  product_value DECIMAL(10, 2),
  purchased_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  opened BOOLEAN DEFAULT FALSE,
  opened_at TIMESTAMPTZ
);

-- ============================================
-- XP TRANSACTIONS (Audit log)
-- ============================================
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- USER COUPONS (Generated from rewards/spins)
-- ============================================
CREATE TABLE IF NOT EXISTS user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed', 'shipping')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_order_value DECIMAL(10, 2) DEFAULT 0,
  source TEXT NOT NULL, -- 'spin', 'reward', 'referral', 'achievement'
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE spin_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE mystery_box_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

-- User profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Public read for leaderboards (limited fields)
CREATE POLICY "Public can view basic profile info" ON user_profiles
  FOR SELECT USING (true);

-- User achievements
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily logins
CREATE POLICY "Users can view own logins" ON daily_logins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logins" ON daily_logins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Spin history
CREATE POLICY "Users can view own spins" ON spin_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spins" ON spin_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spins" ON spin_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Referrals
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can insert referrals" ON referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Users can update own referrals" ON referrals
  FOR UPDATE USING (auth.uid() = referrer_id);

-- User rewards
CREATE POLICY "Users can view own rewards" ON user_rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rewards" ON user_rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rewards" ON user_rewards
  FOR UPDATE USING (auth.uid() = user_id);

-- Mystery box purchases
CREATE POLICY "Users can view own purchases" ON mystery_box_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases" ON mystery_box_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchases" ON mystery_box_purchases
  FOR UPDATE USING (auth.uid() = user_id);

-- XP transactions
CREATE POLICY "Users can view own xp transactions" ON xp_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own xp transactions" ON xp_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User coupons
CREATE POLICY "Users can view own coupons" ON user_coupons
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coupons" ON user_coupons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own coupons" ON user_coupons
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- PUBLIC READ POLICIES (for lookups)
-- ============================================
CREATE POLICY "Anyone can view levels" ON levels FOR SELECT USING (true);
CREATE POLICY "Anyone can view achievements" ON achievements FOR SELECT USING (true);
CREATE POLICY "Anyone can view spin prizes" ON spin_prizes FOR SELECT USING (true);
CREATE POLICY "Anyone can view rewards" ON rewards FOR SELECT USING (true);
CREATE POLICY "Anyone can view mystery boxes" ON mystery_boxes FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update user level based on XP
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Find the highest level the user qualifies for
  SELECT level INTO NEW.current_level
  FROM levels
  WHERE xp_required <= NEW.total_xp
  ORDER BY level DESC
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update level on XP change
CREATE TRIGGER trigger_update_level
  BEFORE UPDATE OF total_xp ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_level();

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(username TEXT)
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'DARK-' || UPPER(LEFT(COALESCE(username, 'USER'), 6)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  ref_code TEXT;
BEGIN
  -- Generate referral code
  ref_code := generate_referral_code(COALESCE(NEW.raw_user_meta_data->>'username', LEFT(NEW.email, 6)));
  
  -- Create user profile
  INSERT INTO user_profiles (id, username, display_name, referral_code, total_xp)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username'),
    ref_code,
    100 -- Signup bonus XP
  );
  
  -- Log XP transaction
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (NEW.id, 100, 'signup', 'Welcome bonus XP');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_xp ON user_profiles(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral ON user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logins_user_date ON daily_logins(user_id, login_date);
CREATE INDEX IF NOT EXISTS idx_spin_history_user ON spin_history(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_code ON user_coupons(code);


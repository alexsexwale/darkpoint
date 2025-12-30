-- ============================================
-- MIGRATION 010: Fix Quest XP and Add Missing Enum Values
-- ============================================
-- Run this in Supabase SQL Editor to enable quest XP tracking

-- Add 'read_article' to xp_action enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'read_article' AND enumtypid = 'xp_action'::regtype) THEN
    ALTER TYPE xp_action ADD VALUE IF NOT EXISTS 'read_article';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Enum might not exist yet, that's OK
  NULL;
END $$;

-- ============================================
-- TABLE: Daily Quest Progress (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_awarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, quest_id, quest_date)
);

-- Enable RLS
ALTER TABLE daily_quest_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own quest progress" ON daily_quest_progress;
DROP POLICY IF EXISTS "Users can insert own quest progress" ON daily_quest_progress;
DROP POLICY IF EXISTS "Users can update own quest progress" ON daily_quest_progress;

CREATE POLICY "Users can view own quest progress" ON daily_quest_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quest progress" ON daily_quest_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quest progress" ON daily_quest_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_quest_progress_user_date ON daily_quest_progress(user_id, quest_date);

-- ============================================
-- TABLE: User Activity Log (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own activity" ON user_activity_log;
DROP POLICY IF EXISTS "Users can insert own activity" ON user_activity_log;

CREATE POLICY "Users can view own activity" ON user_activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON user_activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON user_activity_log(user_id, activity_date, activity_type);

-- ============================================
-- FUNCTION: Add XP (Core function)
-- ============================================
CREATE OR REPLACE FUNCTION add_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_action TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_new_xp INTEGER;
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_leveled_up BOOLEAN := false;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  v_old_level := v_profile.current_level;
  v_new_xp := v_profile.total_xp + p_amount;
  
  -- Calculate new level
  SELECT level INTO v_new_level
  FROM levels
  WHERE xp_required <= v_new_xp
  ORDER BY level DESC
  LIMIT 1;
  
  IF v_new_level IS NULL THEN
    v_new_level := 1;
  END IF;
  
  v_leveled_up := v_new_level > v_old_level;
  
  -- Update user profile
  UPDATE user_profiles SET
    total_xp = v_new_xp,
    current_level = v_new_level,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log XP transaction (cast action to xp_action enum)
  BEGIN
    INSERT INTO xp_transactions (user_id, amount, action, description)
    VALUES (p_user_id, p_amount, p_action::xp_action, COALESCE(p_description, 'XP earned from ' || p_action));
  EXCEPTION WHEN OTHERS THEN
    -- If enum cast fails, skip the transaction log but still award XP
    NULL;
  END;
  
  RETURN json_build_object(
    'success', true,
    'xp_earned', p_amount,
    'total_xp', v_new_xp,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'leveled_up', v_leveled_up
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Update Quest Progress
-- ============================================
CREATE OR REPLACE FUNCTION update_quest_progress(
  p_user_id UUID,
  p_quest_id TEXT,
  p_progress_to_add INTEGER DEFAULT 1,
  p_quest_requirement INTEGER DEFAULT 1,
  p_xp_reward INTEGER DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
  v_existing daily_quest_progress%ROWTYPE;
  v_new_progress INTEGER;
  v_completed BOOLEAN;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Check if quest progress exists for today
  SELECT * INTO v_existing
  FROM daily_quest_progress
  WHERE user_id = p_user_id
    AND quest_id = p_quest_id
    AND quest_date = v_today;

  IF FOUND THEN
    -- Quest already completed, don't add more progress
    IF v_existing.completed THEN
      RETURN json_build_object(
        'success', true,
        'progress', v_existing.progress,
        'completed', true,
        'already_completed', true
      );
    END IF;

    -- Update existing progress
    v_new_progress := LEAST(v_existing.progress + p_progress_to_add, p_quest_requirement);
    v_completed := v_new_progress >= p_quest_requirement;

    UPDATE daily_quest_progress SET
      progress = v_new_progress,
      completed = v_completed,
      completed_at = CASE WHEN v_completed AND NOT v_existing.completed THEN NOW() ELSE completed_at END,
      updated_at = NOW()
    WHERE id = v_existing.id;

    -- Award XP if just completed
    IF v_completed AND NOT v_existing.completed AND NOT v_existing.xp_awarded AND p_xp_reward > 0 THEN
      BEGIN
        PERFORM add_xp(p_user_id, p_xp_reward, 'quest', 'Daily quest: ' || p_quest_id);
        UPDATE daily_quest_progress SET xp_awarded = true WHERE id = v_existing.id;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;

    RETURN json_build_object(
      'success', true,
      'progress', v_new_progress,
      'completed', v_completed,
      'just_completed', v_completed AND NOT v_existing.completed
    );
  ELSE
    -- Create new progress entry
    v_new_progress := LEAST(p_progress_to_add, p_quest_requirement);
    v_completed := v_new_progress >= p_quest_requirement;

    INSERT INTO daily_quest_progress (user_id, quest_id, quest_date, progress, completed, completed_at, xp_awarded)
    VALUES (p_user_id, p_quest_id, v_today, v_new_progress, v_completed, 
            CASE WHEN v_completed THEN NOW() ELSE NULL END,
            false);

    -- Award XP if completed on first action
    IF v_completed AND p_xp_reward > 0 THEN
      BEGIN
        PERFORM add_xp(p_user_id, p_xp_reward, 'quest', 'Daily quest: ' || p_quest_id);
        UPDATE daily_quest_progress SET xp_awarded = true 
        WHERE user_id = p_user_id AND quest_id = p_quest_id AND quest_date = v_today;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;

    RETURN json_build_object(
      'success', true,
      'progress', v_new_progress,
      'completed', v_completed,
      'just_completed', v_completed
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Log User Activity
-- ============================================
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_count INTEGER;
BEGIN
  -- Check if this exact activity was already logged today
  IF p_reference_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM user_activity_log
    WHERE user_id = p_user_id
      AND activity_type = p_activity_type
      AND activity_date = v_today
      AND reference_id = p_reference_id;

    IF v_count > 0 THEN
      RETURN json_build_object('success', true, 'duplicate', true);
    END IF;
  END IF;

  -- Log the activity
  INSERT INTO user_activity_log (user_id, activity_type, activity_date, reference_id, metadata)
  VALUES (p_user_id, p_activity_type, v_today, p_reference_id, p_metadata);

  RETURN json_build_object('success', true, 'duplicate', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get Daily Quest Progress
-- ============================================
CREATE OR REPLACE FUNCTION get_daily_quest_progress(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_progress JSON;
BEGIN
  SELECT json_agg(json_build_object(
    'quest_id', quest_id,
    'progress', progress,
    'completed', completed,
    'completed_at', completed_at
  ))
  INTO v_progress
  FROM daily_quest_progress
  WHERE user_id = p_user_id
    AND quest_date = CURRENT_DATE;

  RETURN json_build_object(
    'success', true,
    'date', CURRENT_DATE,
    'quests', COALESCE(v_progress, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION add_xp(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_quest_progress(UUID, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity(UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_quest_progress(UUID) TO authenticated;


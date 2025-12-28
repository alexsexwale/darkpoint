-- ============================================
-- MIGRATION 008: Daily Quest Progress Tracking
-- ============================================
-- This migration adds database persistence for daily quest progress

-- ============================================
-- TABLE: Daily Quest Progress
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

-- RLS Policies
CREATE POLICY "Users can view own quest progress" ON daily_quest_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quest progress" ON daily_quest_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quest progress" ON daily_quest_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_quest_progress_user_date ON daily_quest_progress(user_id, quest_date);

-- ============================================
-- TABLE: User Activity Log (for tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'product_view', 'wishlist_add', 'news_read', etc.
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_id TEXT, -- product_id, article_id, etc.
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own activity" ON user_activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON user_activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON user_activity_log(user_id, activity_date, activity_type);

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
    IF v_completed AND NOT v_existing.completed AND p_xp_reward > 0 THEN
      -- Try to add XP (will use add_xp function if available)
      BEGIN
        PERFORM add_xp(p_user_id, p_xp_reward, 'quest', 'Daily quest: ' || p_quest_id);
        UPDATE daily_quest_progress SET xp_awarded = true WHERE id = v_existing.id;
      EXCEPTION WHEN OTHERS THEN
        -- add_xp function might not exist, that's OK
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

    INSERT INTO daily_quest_progress (user_id, quest_id, quest_date, progress, completed, completed_at)
    VALUES (p_user_id, p_quest_id, v_today, v_new_progress, v_completed, 
            CASE WHEN v_completed THEN NOW() ELSE NULL END);

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
-- FUNCTION: Get User's Quest Progress for Today
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
  -- Check if this exact activity was already logged today (for deduplication)
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
-- FUNCTION: Get Activity Count for Today
-- ============================================
CREATE OR REPLACE FUNCTION get_activity_count(
  p_user_id UUID,
  p_activity_type TEXT
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT reference_id)
    FROM user_activity_log
    WHERE user_id = p_user_id
      AND activity_type = p_activity_type
      AND activity_date = CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


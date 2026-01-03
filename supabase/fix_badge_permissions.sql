-- Quick fix for badge permissions
-- Run this in Supabase SQL Editor

-- Ensure RLS is enabled
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can update own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can insert own badges" ON user_badges;

-- Allow users to read their own badges
CREATE POLICY "Users can view own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to update their own badges
CREATE POLICY "Users can update own badges" ON user_badges
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow system to insert badges (via service role)
CREATE POLICY "System can insert badges" ON user_badges
  FOR INSERT WITH CHECK (true);

-- Ensure grants
GRANT SELECT ON user_badges TO authenticated;
GRANT UPDATE ON user_badges TO authenticated;
GRANT INSERT ON user_badges TO authenticated;
GRANT SELECT ON user_badges TO anon;

-- Verify get_user_badges function exists and works
CREATE OR REPLACE FUNCTION get_user_badges(p_user_id UUID)
RETURNS TABLE(badge_id TEXT, equipped BOOLEAN, acquired_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT ub.badge_id, ub.equipped, ub.acquired_at
  FROM user_badges ub
  WHERE ub.user_id = p_user_id
  ORDER BY ub.acquired_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on the function
GRANT EXECUTE ON FUNCTION get_user_badges(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_badges(UUID) TO anon;

-- Test query - this should return your badges
-- SELECT * FROM get_user_badges('YOUR-USER-ID-HERE');

-- Alternative: Direct query test
-- SELECT * FROM user_badges WHERE user_id = auth.uid();


-- Fix user levels based on total_xp using the correct level calculation formula
-- This should be run once to correct any incorrect level values

-- Create a helper function to calculate level from XP
CREATE OR REPLACE FUNCTION calculate_level_from_xp(xp INTEGER) RETURNS INTEGER AS $$
DECLARE
  level INTEGER := 1;
  next_level_xp INTEGER;
BEGIN
  LOOP
    -- Calculate XP required for next level using the same formula as the app
    IF level + 1 <= 1 THEN
      next_level_xp := 0;
    ELSIF level + 1 <= 4 THEN
      next_level_xp := (level + 1 - 1) * 100;
    ELSIF level + 1 <= 9 THEN
      next_level_xp := 300 + (level + 1 - 4) * 200;
    ELSIF level + 1 <= 19 THEN
      next_level_xp := 1300 + (level + 1 - 9) * 500;
    ELSIF level + 1 <= 34 THEN
      next_level_xp := 6300 + (level + 1 - 19) * 1000;
    ELSIF level + 1 <= 49 THEN
      next_level_xp := 21300 + (level + 1 - 34) * 2000;
    ELSE
      next_level_xp := 51300 + (level + 1 - 49) * 5000;
    END IF;
    
    EXIT WHEN next_level_xp > xp;
    level := level + 1;
  END LOOP;
  
  RETURN level;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update all users with the correct level
UPDATE user_profiles
SET 
  current_level = calculate_level_from_xp(COALESCE(total_xp, 0)),
  updated_at = NOW()
WHERE calculate_level_from_xp(COALESCE(total_xp, 0)) != current_level;

-- Show results
SELECT 
  id,
  display_name,
  total_xp,
  current_level as new_level
FROM user_profiles
ORDER BY total_xp DESC;


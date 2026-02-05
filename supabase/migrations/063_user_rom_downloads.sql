-- Migration 063: user_rom_downloads table for tracking ROM library downloads
-- Enables "My Downloaded ROMs" and re-download

CREATE TABLE IF NOT EXISTS user_rom_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  size TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  region TEXT NOT NULL,
  download_url TEXT NOT NULL,
  console TEXT NOT NULL,
  platform TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, download_url)
);

CREATE INDEX IF NOT EXISTS idx_user_rom_downloads_user_id ON user_rom_downloads(user_id);

ALTER TABLE user_rom_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own rom downloads" ON user_rom_downloads;
CREATE POLICY "Users can view own rom downloads" ON user_rom_downloads
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own rom downloads" ON user_rom_downloads;
CREATE POLICY "Users can insert own rom downloads" ON user_rom_downloads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own rom downloads" ON user_rom_downloads;
CREATE POLICY "Users can update own rom downloads" ON user_rom_downloads
  FOR UPDATE USING (auth.uid() = user_id);

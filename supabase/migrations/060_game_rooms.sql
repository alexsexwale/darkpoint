-- ============================================
-- GAME ROOMS FOR ONLINE MULTIPLAYER CARD GAMES
-- ============================================

-- Create enums for game rooms
CREATE TYPE game_type AS ENUM ('crazy_eights', 'hearts');
CREATE TYPE room_status AS ENUM ('waiting', 'playing', 'finished');
CREATE TYPE room_visibility AS ENUM ('private', 'public');

-- Create game_rooms table
CREATE TABLE game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  game_type game_type NOT NULL,
  visibility room_visibility NOT NULL DEFAULT 'private',
  host_id UUID NOT NULL,  -- Can be user ID or guest ID
  host_name VARCHAR(50) NOT NULL,
  status room_status NOT NULL DEFAULT 'waiting',
  max_players INTEGER NOT NULL DEFAULT 4,
  current_players JSONB NOT NULL DEFAULT '[]',
  game_state JSONB,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- Index for finding public games in lobby
CREATE INDEX idx_game_rooms_public_lobby ON game_rooms(game_type, visibility, status, created_at DESC) 
  WHERE visibility = 'public' AND status = 'waiting';

-- Index for looking up by code
CREATE INDEX idx_game_rooms_code ON game_rooms(code);

-- Index for host's rooms
CREATE INDEX idx_game_rooms_host ON game_rooms(host_id, status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER game_rooms_updated_at
  BEFORE UPDATE ON game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_game_room_timestamp();

-- Enable RLS
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view public waiting rooms (for lobby)
CREATE POLICY "Anyone can view public waiting rooms"
  ON game_rooms FOR SELECT
  USING (visibility = 'public' AND status = 'waiting');

-- Anyone can view room by code (for joining)
CREATE POLICY "Anyone can view room by code"
  ON game_rooms FOR SELECT
  USING (true);

-- Authenticated users can create rooms
CREATE POLICY "Authenticated users can create rooms"
  ON game_rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = host_id::text);

-- Anyone can update room (for game state sync)
-- In production, you'd want more restrictive policies
CREATE POLICY "Players can update rooms they're in"
  ON game_rooms FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Host can delete room
CREATE POLICY "Host can delete room"
  ON game_rooms FOR DELETE
  USING (host_id::text = auth.uid()::text);

-- Enable realtime for game_rooms
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;

-- Function to clean up old/abandoned rooms (run via cron)
CREATE OR REPLACE FUNCTION cleanup_abandoned_game_rooms()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM game_rooms
  WHERE 
    -- Delete rooms that have been waiting for more than 1 hour
    (status = 'waiting' AND created_at < NOW() - INTERVAL '1 hour')
    OR
    -- Delete finished rooms older than 1 hour
    (status = 'finished' AND finished_at < NOW() - INTERVAL '1 hour')
    OR
    -- Delete playing rooms with no updates for 2 hours (abandoned)
    (status = 'playing' AND updated_at < NOW() - INTERVAL '2 hours');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role for cron jobs
GRANT EXECUTE ON FUNCTION cleanup_abandoned_game_rooms() TO service_role;

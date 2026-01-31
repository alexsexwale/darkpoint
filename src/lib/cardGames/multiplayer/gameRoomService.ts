import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { GameType, RoomVisibility } from "@/types/database";
import { GameRoom, RoomPlayer, CreateRoomOptions, JoinRoomOptions } from "./types";

// Type for game_rooms table operations (until types are regenerated)
type GameRoomRow = {
  id: string;
  code: string;
  game_type: GameType;
  visibility: RoomVisibility;
  host_id: string;
  host_name: string;
  status: "waiting" | "playing" | "finished";
  max_players: number;
  current_players: RoomPlayer[];
  game_state: unknown;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gameRoomsTable = () => supabase.from("game_rooms" as any) as any;

// Generate a 6-character alphanumeric room code
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars (0,O,1,I)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Convert database row to GameRoom
function rowToGameRoom(row: Record<string, unknown>): GameRoom {
  return {
    id: row.id as string,
    code: row.code as string,
    gameType: row.game_type as GameType,
    visibility: row.visibility as RoomVisibility,
    hostId: row.host_id as string,
    hostName: row.host_name as string,
    status: row.status as "waiting" | "playing" | "finished",
    maxPlayers: row.max_players as number,
    players: (row.current_players as RoomPlayer[]) || [],
    gameState: row.game_state,
    settings: (row.settings as Record<string, unknown>) || {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    startedAt: row.started_at as string | null,
    finishedAt: row.finished_at as string | null,
  };
}

// Create a new game room
export async function createRoom(options: CreateRoomOptions): Promise<GameRoom> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const code = generateRoomCode();
  const hostPlayer: RoomPlayer = {
    id: options.hostId,
    name: options.hostName,
    isHost: true,
    isReady: false,
    isConnected: true,
    joinedAt: new Date().toISOString(),
  };

  const { data, error } = await gameRoomsTable()
    .insert({
      code,
      game_type: options.gameType,
      visibility: options.visibility,
      host_id: options.hostId,
      host_name: options.hostName,
      max_players: options.maxPlayers || 4,
      current_players: [hostPlayer],
      settings: options.settings || {},
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating room:", error);
    throw new Error(error.message);
  }

  return rowToGameRoom(data);
}

// Get room by code
export async function getRoomByCode(code: string): Promise<GameRoom | null> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await gameRoomsTable()
    .select()
    .eq("code", code.toUpperCase())
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    console.error("Error getting room:", error);
    throw new Error(error.message);
  }

  return rowToGameRoom(data);
}

// Get room by ID
export async function getRoomById(id: string): Promise<GameRoom | null> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await gameRoomsTable()
    .select()
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error getting room:", error);
    throw new Error(error.message);
  }

  return rowToGameRoom(data);
}

// Join a room
export async function joinRoom(
  roomId: string,
  options: JoinRoomOptions
): Promise<GameRoom> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  // Get current room state
  const room = await getRoomById(roomId);
  if (!room) {
    throw new Error("Room not found");
  }

  if (room.status !== "waiting") {
    throw new Error("Game has already started");
  }

  if (room.players.length >= room.maxPlayers) {
    throw new Error("Room is full");
  }

  // Check if player is already in room
  if (room.players.some(p => p.id === options.playerId)) {
    // Update connection status
    const updatedPlayers = room.players.map(p =>
      p.id === options.playerId ? { ...p, isConnected: true } : p
    );
    
    const { data, error } = await gameRoomsTable()
      .update({ current_players: updatedPlayers })
      .eq("id", roomId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return rowToGameRoom(data);
  }

  // Add new player
  const newPlayer: RoomPlayer = {
    id: options.playerId,
    name: options.playerName,
    isHost: false,
    isReady: false,
    isConnected: true,
    joinedAt: new Date().toISOString(),
  };

  const updatedPlayers = [...room.players, newPlayer];

  const { data, error } = await gameRoomsTable()
    .update({ current_players: updatedPlayers })
    .eq("id", roomId)
    .select()
    .single();

  if (error) {
    console.error("Error joining room:", error);
    throw new Error(error.message);
  }

  return rowToGameRoom(data);
}

// Leave a room
export async function leaveRoom(roomId: string, playerId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const room = await getRoomById(roomId);
  if (!room) return;

  const updatedPlayers = room.players.filter(p => p.id !== playerId);

  // If no players left, delete room
  if (updatedPlayers.length === 0) {
    await gameRoomsTable().delete().eq("id", roomId);
    return;
  }

  // If host left, transfer to next player
  let newHostId = room.hostId;
  if (playerId === room.hostId && updatedPlayers.length > 0) {
    newHostId = updatedPlayers[0].id;
    updatedPlayers[0] = { ...updatedPlayers[0], isHost: true };
  }

  const { error } = await gameRoomsTable()
    .update({
      current_players: updatedPlayers,
      host_id: newHostId,
      host_name: updatedPlayers.find(p => p.id === newHostId)?.name || room.hostName,
    })
    .eq("id", roomId);

  if (error) {
    console.error("Error leaving room:", error);
    throw new Error(error.message);
  }
}

// Set player ready status
export async function setPlayerReady(
  roomId: string,
  playerId: string,
  isReady: boolean
): Promise<GameRoom> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const room = await getRoomById(roomId);
  if (!room) {
    throw new Error("Room not found");
  }

  const updatedPlayers = room.players.map(p =>
    p.id === playerId ? { ...p, isReady } : p
  );

  const { data, error } = await gameRoomsTable()
    .update({ current_players: updatedPlayers })
    .eq("id", roomId)
    .select()
    .single();

  if (error) {
    console.error("Error setting ready:", error);
    throw new Error(error.message);
  }

  return rowToGameRoom(data);
}

// Start the game
export async function startGame(
  roomId: string,
  initialGameState: unknown
): Promise<GameRoom> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await gameRoomsTable()
    .update({
      status: "playing",
      game_state: initialGameState,
      started_at: new Date().toISOString(),
    })
    .eq("id", roomId)
    .select()
    .single();

  if (error) {
    console.error("Error starting game:", error);
    throw new Error(error.message);
  }

  return rowToGameRoom(data);
}

// Update game state
export async function updateGameState(
  roomId: string,
  gameState: unknown
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const { error } = await gameRoomsTable()
    .update({ game_state: gameState })
    .eq("id", roomId);

  if (error) {
    console.error("Error updating game state:", error);
    throw new Error(error.message);
  }
}

// End the game
export async function endGame(roomId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const { error } = await gameRoomsTable()
    .update({
      status: "finished",
      finished_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  if (error) {
    console.error("Error ending game:", error);
    throw new Error(error.message);
  }
}

// Get public rooms for lobby
export async function getPublicRooms(gameType?: GameType): Promise<GameRoom[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  let query = gameRoomsTable()
    .select()
    .eq("visibility", "public")
    .eq("status", "waiting")
    .order("created_at", { ascending: false })
    .limit(50);

  if (gameType) {
    query = query.eq("game_type", gameType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error getting public rooms:", error);
    throw new Error(error.message);
  }

  return (data || []).map(rowToGameRoom);
}

// Update player connection status
export async function updatePlayerConnection(
  roomId: string,
  playerId: string,
  isConnected: boolean
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const room = await getRoomById(roomId);
  if (!room) return;

  const updatedPlayers = room.players.map(p =>
    p.id === playerId ? { ...p, isConnected } : p
  );

  await gameRoomsTable()
    .update({ current_players: updatedPlayers })
    .eq("id", roomId);
}

// Delete a room (host only)
export async function deleteRoom(roomId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const { error } = await gameRoomsTable()
    .delete()
    .eq("id", roomId);

  if (error) {
    console.error("Error deleting room:", error);
    throw new Error(error.message);
  }
}

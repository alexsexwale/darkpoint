import { GameType, RoomStatus, RoomVisibility } from "@/types/database";

// Room player info
export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  joinedAt: string;
}

// Game room
export interface GameRoom {
  id: string;
  code: string;
  gameType: GameType;
  visibility: RoomVisibility;
  hostId: string;
  hostName: string;
  status: RoomStatus;
  maxPlayers: number;
  players: RoomPlayer[];
  gameState: unknown | null;
  settings: GameRoomSettings;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

// Game room settings
export interface GameRoomSettings {
  turnTimeLimit?: number; // seconds, 0 = no limit
}

// Realtime broadcast message types
export type BroadcastEventType = 
  | "player_joined"
  | "player_left"
  | "player_ready"
  | "game_started"
  | "game_action"
  | "game_state_sync"
  | "chat_message";

export interface BroadcastMessage {
  type: BroadcastEventType;
  payload: unknown;
  senderId: string;
  senderName: string;
  timestamp: string;
}

// Player join event
export interface PlayerJoinedPayload {
  player: RoomPlayer;
}

// Player left event
export interface PlayerLeftPayload {
  playerId: string;
  newHostId?: string;
}

// Player ready event
export interface PlayerReadyPayload {
  playerId: string;
  isReady: boolean;
}

// Game started event
export interface GameStartedPayload {
  gameState: unknown;
  startedAt: string;
}

// Game action event (card played, turn passed, etc.)
export interface GameActionPayload {
  action: string;
  data: unknown;
}

// Full game state sync event
export interface GameStateSyncPayload {
  gameState: unknown;
}

// Chat message event
export interface ChatMessagePayload {
  message: string;
}

// Presence state for tracking online players
export interface PresenceState {
  odlerId: string;
  playerName: string;
  onlineAt: string;
}

// Create room options
export interface CreateRoomOptions {
  gameType: GameType;
  visibility: RoomVisibility;
  hostId: string;
  hostName: string;
  maxPlayers?: number;
  settings?: GameRoomSettings;
}

// Join room options
export interface JoinRoomOptions {
  playerId: string;
  playerName: string;
}

// Guest player info (stored in localStorage)
export interface GuestPlayer {
  id: string;
  name: string;
  createdAt: string;
}

// Hook return type
export interface UseMultiplayerGameReturn {
  room: GameRoom | null;
  players: RoomPlayer[];
  gameState: unknown | null;
  isConnected: boolean;
  isHost: boolean;
  myPlayer: RoomPlayer | null;
  error: string | null;
  loading: boolean;
  // Actions
  setReady: (ready: boolean) => Promise<void>;
  startGame: (initialState: unknown) => Promise<void>;
  sendAction: (action: string, data: unknown) => void;
  syncGameState: (state: unknown) => Promise<void>;
  leaveRoom: () => Promise<void>;
}

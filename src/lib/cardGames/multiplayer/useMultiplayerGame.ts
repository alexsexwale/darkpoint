"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  GameRoom,
  RoomPlayer,
  UseMultiplayerGameReturn,
  BroadcastMessage,
  BroadcastEventType,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  PlayerReadyPayload,
  GameStartedPayload,
  GameActionPayload,
  GameStateSyncPayload,
} from "./types";
import {
  getRoomByCode,
  getRoomById,
  setPlayerReady,
  startGame as startGameService,
  updateGameState,
  leaveRoom as leaveRoomService,
  updatePlayerConnection,
} from "./gameRoomService";

interface UseMultiplayerGameOptions {
  roomCode: string;
  playerId: string;
  playerName: string;
  onGameAction?: (action: string, data: unknown, senderId: string) => void;
  onGameStateSync?: (state: unknown) => void;
  onPlayerJoined?: (player: RoomPlayer) => void;
  onPlayerLeft?: (playerId: string) => void;
  onGameStarted?: (state: unknown) => void;
}

export function useMultiplayerGame(
  options: UseMultiplayerGameOptions
): UseMultiplayerGameReturn {
  const { roomCode, playerId, playerName, onGameAction, onGameStateSync, onPlayerJoined, onPlayerLeft, onGameStarted } = options;

  const [room, setRoom] = useState<GameRoom | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const roomIdRef = useRef<string | null>(null);

  // Derived state
  const players = room?.players || [];
  const gameState = room?.gameState || null;
  const isHost = room?.hostId === playerId;
  const myPlayer = players.find(p => p.id === playerId) || null;

  // Broadcast a message to all players
  const broadcast = useCallback(
    (type: BroadcastEventType, payload: unknown) => {
      if (!channelRef.current) return;

      const message: BroadcastMessage = {
        type,
        payload,
        senderId: playerId,
        senderName: playerName,
        timestamp: new Date().toISOString(),
      };

      channelRef.current.send({
        type: "broadcast",
        event: "game_event",
        payload: message,
      });
    },
    [playerId, playerName]
  );

  // Handle incoming broadcast messages
  const handleBroadcast = useCallback(
    (message: BroadcastMessage) => {
      // Ignore own messages
      if (message.senderId === playerId) return;

      switch (message.type) {
        case "player_joined": {
          const payload = message.payload as PlayerJoinedPayload;
          setRoom(prev => {
            if (!prev) return prev;
            // Only add if not already in list
            if (prev.players.some(p => p.id === payload.player.id)) {
              return prev;
            }
            return { ...prev, players: [...prev.players, payload.player] };
          });
          onPlayerJoined?.(payload.player);
          break;
        }

        case "player_left": {
          const payload = message.payload as PlayerLeftPayload;
          setRoom(prev => {
            if (!prev) return prev;
            const updatedPlayers = prev.players.filter(p => p.id !== payload.playerId);
            return {
              ...prev,
              players: updatedPlayers,
              hostId: payload.newHostId || prev.hostId,
            };
          });
          onPlayerLeft?.(payload.playerId);
          break;
        }

        case "player_ready": {
          const payload = message.payload as PlayerReadyPayload;
          setRoom(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.map(p =>
                p.id === payload.playerId ? { ...p, isReady: payload.isReady } : p
              ),
            };
          });
          break;
        }

        case "game_started": {
          const payload = message.payload as GameStartedPayload;
          setRoom(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              status: "playing",
              gameState: payload.gameState,
              startedAt: payload.startedAt,
            };
          });
          onGameStarted?.(payload.gameState);
          break;
        }

        case "game_action": {
          const payload = message.payload as GameActionPayload;
          onGameAction?.(payload.action, payload.data, message.senderId);
          break;
        }

        case "game_state_sync": {
          const payload = message.payload as GameStateSyncPayload;
          setRoom(prev => {
            if (!prev) return prev;
            return { ...prev, gameState: payload.gameState };
          });
          onGameStateSync?.(payload.gameState);
          break;
        }
      }
    },
    [playerId, onGameAction, onGameStateSync, onPlayerJoined, onPlayerLeft, onGameStarted]
  );

  // Set ready status
  const setReady = useCallback(
    async (ready: boolean) => {
      if (!roomIdRef.current) return;

      try {
        await setPlayerReady(roomIdRef.current, playerId, ready);
        broadcast("player_ready", { playerId, isReady: ready } as PlayerReadyPayload);
        
        setRoom(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            players: prev.players.map(p =>
              p.id === playerId ? { ...p, isReady: ready } : p
            ),
          };
        });
      } catch (err) {
        console.error("Error setting ready:", err);
        setError("Failed to update ready status");
      }
    },
    [playerId, broadcast]
  );

  // Start the game (host only)
  const startGameAction = useCallback(
    async (initialState: unknown) => {
      if (!roomIdRef.current || !isHost) return;

      try {
        const updatedRoom = await startGameService(roomIdRef.current, initialState);
        setRoom(updatedRoom);
        
        broadcast("game_started", {
          gameState: initialState,
          startedAt: updatedRoom.startedAt,
        } as GameStartedPayload);
      } catch (err) {
        console.error("Error starting game:", err);
        setError("Failed to start game");
      }
    },
    [isHost, broadcast]
  );

  // Send a game action
  const sendAction = useCallback(
    (action: string, data: unknown) => {
      broadcast("game_action", { action, data } as GameActionPayload);
    },
    [broadcast]
  );

  // Sync full game state
  const syncGameState = useCallback(
    async (state: unknown) => {
      if (!roomIdRef.current) return;

      try {
        await updateGameState(roomIdRef.current, state);
        broadcast("game_state_sync", { gameState: state } as GameStateSyncPayload);
        
        setRoom(prev => {
          if (!prev) return prev;
          return { ...prev, gameState: state };
        });
      } catch (err) {
        console.error("Error syncing game state:", err);
      }
    },
    [broadcast]
  );

  // Leave the room
  const leaveRoomAction = useCallback(async () => {
    if (!roomIdRef.current) return;

    try {
      // Notify others
      broadcast("player_left", { playerId } as PlayerLeftPayload);
      
      // Leave via service
      await leaveRoomService(roomIdRef.current, playerId);
      
      // Cleanup
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      setRoom(null);
      setIsConnected(false);
    } catch (err) {
      console.error("Error leaving room:", err);
    }
  }, [playerId, broadcast]);

  // Initialize connection
  useEffect(() => {
    if (!isSupabaseConfigured() || !roomCode) {
      setLoading(false);
      setError("Invalid configuration");
      return;
    }

    let mounted = true;

    const initialize = async () => {
      try {
        // Get room data
        const roomData = await getRoomByCode(roomCode);
        if (!roomData) {
          setError("Room not found");
          setLoading(false);
          return;
        }

        if (!mounted) return;

        roomIdRef.current = roomData.id;
        setRoom(roomData);

        // Subscribe to realtime channel
        const channel = supabase.channel(`game_room:${roomData.id}`, {
          config: {
            broadcast: { self: false },
            presence: { key: playerId },
          },
        });

        channel
          .on("broadcast", { event: "game_event" }, ({ payload }) => {
            handleBroadcast(payload as BroadcastMessage);
          })
          .on("presence", { event: "sync" }, () => {
            // Could track online status here
          })
          .on("presence", { event: "join" }, ({ newPresences }) => {
            console.log("Player joined presence:", newPresences);
          })
          .on("presence", { event: "leave" }, ({ leftPresences }) => {
            console.log("Player left presence:", leftPresences);
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              setIsConnected(true);
              
              // Track presence
              await channel.track({
                odlerId: playerId,
                playerName,
                onlineAt: new Date().toISOString(),
              });

              // Update connection status in DB
              await updatePlayerConnection(roomData.id, playerId, true);
            }
          });

        channelRef.current = channel;

        // Also subscribe to database changes for room updates
        const dbChannel = supabase
          .channel(`game_room_db:${roomData.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "game_rooms",
              filter: `id=eq.${roomData.id}`,
            },
            (payload) => {
              const newData = payload.new;
              if (newData) {
                setRoom(prev => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    status: newData.status,
                    players: newData.current_players as RoomPlayer[],
                    gameState: newData.game_state,
                    hostId: newData.host_id,
                    hostName: newData.host_name,
                    startedAt: newData.started_at,
                    finishedAt: newData.finished_at,
                  };
                });
              }
            }
          )
          .subscribe();

        setLoading(false);

        // Cleanup
        return () => {
          supabase.removeChannel(channel);
          supabase.removeChannel(dbChannel);
        };
      } catch (err) {
        console.error("Error initializing multiplayer:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to connect");
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomCode, playerId, playerName, handleBroadcast]);

  // Update connection status on unmount
  useEffect(() => {
    return () => {
      if (roomIdRef.current) {
        updatePlayerConnection(roomIdRef.current, playerId, false);
      }
    };
  }, [playerId]);

  return {
    room,
    players,
    gameState,
    isConnected,
    isHost,
    myPlayer,
    error,
    loading,
    setReady,
    startGame: startGameAction,
    sendAction,
    syncGameState,
    leaveRoom: leaveRoomAction,
  };
}

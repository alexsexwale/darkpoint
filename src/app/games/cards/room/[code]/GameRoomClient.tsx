"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useAuthStore, useMultiplayerStore } from "@/stores";
import { GameType } from "@/types/database";
import {
  GameRoom,
  RoomPlayer,
  getRoomByCode,
  joinRoom,
  useMultiplayerGame,
} from "@/lib/cardGames/multiplayer";
import { CrazyEightsOnline } from "../../crazy-eights/CrazyEightsOnline";
import { HeartsOnline } from "../../hearts/HeartsOnline";
import { GuestNicknameModal } from "@/components/games/GuestNicknameModal";

const GAME_INFO: Record<GameType, { name: string; icon: string; minPlayers: number }> = {
  crazy_eights: { name: "Crazy Eights", icon: "🎱", minPlayers: 2 },
  hearts: { name: "Hearts", icon: "💜", minPlayers: 4 },
};

interface GameRoomClientProps {
  roomCode: string;
}

export function GameRoomClient({ roomCode }: GameRoomClientProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { guestPlayer, getPlayerId, getPlayerName, setCurrentRoom, createGuestPlayer } = useMultiplayerStore();

  const [initialRoom, setInitialRoom] = useState<GameRoom | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  const playerId = getPlayerId(user?.id || null);
  const playerName = getPlayerName(user?.user_metadata?.display_name || user?.user_metadata?.username || null);
  const needsNickname = !user && !guestPlayer;
  const isInRoom = initialRoom?.players.some(p => p.id === playerId) || false;

  // Multiplayer hook (only active when in room)
  const multiplayer = useMultiplayerGame({
    roomCode: isInRoom ? roomCode : "",
    playerId,
    playerName,
    onGameStarted: (state) => {
      console.log("Game started with state:", state);
    },
    onPlayerJoined: (player) => {
      console.log("Player joined:", player);
    },
    onPlayerLeft: (leftPlayerId) => {
      console.log("Player left:", leftPlayerId);
    },
  });

  // Use multiplayer room data when connected, otherwise initial data
  const room = multiplayer.room || initialRoom;
  const players = multiplayer.players.length > 0 ? multiplayer.players : (initialRoom?.players || []);
  const isHost = multiplayer.isHost || (room?.hostId === playerId);
  const gameInfo = room ? GAME_INFO[room.gameType] : null;

  // Fetch initial room data
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const data = await getRoomByCode(roomCode);
        if (!data) {
          setInitialError("Room not found");
        } else {
          setInitialRoom(data);
          setCurrentRoom(data.code, data.gameType);
        }
      } catch (err) {
        console.error("Error fetching room:", err);
        setInitialError("Failed to load room");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchRoom();
  }, [roomCode, setCurrentRoom]);

  // Auto-show nickname modal for guests
  useEffect(() => {
    if (!initialLoading && initialRoom && needsNickname && !isInRoom) {
      setShowNicknameModal(true);
    }
  }, [initialLoading, initialRoom, needsNickname, isInRoom]);

  // Handle joining the room
  const handleJoin = useCallback(async () => {
    if (!initialRoom) return;

    setJoining(true);
    try {
      await joinRoom(initialRoom.id, { playerId, playerName });
      // Refresh room data
      const updated = await getRoomByCode(roomCode);
      if (updated) setInitialRoom(updated);
    } catch (err) {
      console.error("Error joining room:", err);
      setInitialError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setJoining(false);
    }
  }, [initialRoom, playerId, playerName, roomCode]);

  // Handle leaving the room
  const handleLeave = async () => {
    await multiplayer.leaveRoom();
    router.push("/games/cards");
  };

  // Copy room code
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Copy invite link
  const copyInviteLink = () => {
    const link = `${window.location.origin}/games/cards/room/${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if can start game
  const canStartGame = isHost && 
    players.length >= (gameInfo?.minPlayers || 2) &&
    players.every(p => p.isReady || p.isHost);

  // Loading state
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--color-main-1)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[var(--muted-foreground)]">Loading room...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (initialError || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-heading mb-2">Room Not Found</h1>
          <p className="text-[var(--muted-foreground)] mb-6">
            {initialError || "This game room doesn't exist or has expired."}
          </p>
          <Link href="/games/cards">
            <Button variant="primary">Back to Card Games</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Game in progress - render game component
  if (room.status === "playing") {
    if (room.gameType === "crazy_eights") {
      return (
        <CrazyEightsOnline
          roomCode={roomCode}
          playerId={playerId}
          playerName={playerName}
          initialGameState={room.gameState}
          players={players}
          isHost={isHost}
          multiplayer={multiplayer}
          onLeave={handleLeave}
        />
      );
    }
    if (room.gameType === "hearts") {
      return (
        <HeartsOnline
          roomCode={roomCode}
          playerId={playerId}
          playerName={playerName}
          initialGameState={room.gameState}
          players={players}
          isHost={isHost}
          multiplayer={multiplayer}
          onLeave={handleLeave}
        />
      );
    }
  }

  // Waiting room UI
  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] py-8">
      <div className="container max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/games/cards"
              className="text-[var(--muted-foreground)] hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{gameInfo?.icon}</span>
                <h1 className="text-2xl font-heading">{gameInfo?.name}</h1>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                {room.visibility === "private" ? "Private Game" : "Public Game"}
              </p>
            </div>
          </div>
        </div>

        {/* Room Code */}
        <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] rounded-xl p-6 mb-6 text-center">
          <p className="text-sm text-[var(--muted-foreground)] mb-2">Room Code</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-mono tracking-widest">{roomCode}</span>
            <button
              onClick={copyRoomCode}
              className="p-2 hover:bg-[var(--color-dark-3)] rounded-lg transition-colors"
              title="Copy code"
            >
              {copied ? (
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
          <button
            onClick={copyInviteLink}
            className="mt-3 text-sm text-[var(--color-main-1)] hover:underline"
          >
            Copy Invite Link
          </button>
        </div>

        {/* Players List */}
        <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading">Players</h2>
            <span className="text-sm text-[var(--muted-foreground)]">
              {players.length}/{room.maxPlayers}
            </span>
          </div>

          <div className="space-y-3">
            {players.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.id === playerId
                    ? "bg-[var(--color-main-1)]/10 border border-[var(--color-main-1)]/30"
                    : "bg-[var(--color-dark-3)]/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    player.isConnected ? "bg-green-400" : "bg-gray-500"
                  }`} />
                  <span className="font-medium">{player.name}</span>
                  {player.isHost && (
                    <span className="text-xs bg-[var(--color-main-1)] px-2 py-0.5 rounded">Host</span>
                  )}
                  {player.id === playerId && (
                    <span className="text-xs text-[var(--muted-foreground)]">(You)</span>
                  )}
                </div>
                {!player.isHost && (
                  <span className={`text-sm ${player.isReady ? "text-green-400" : "text-yellow-400"}`}>
                    {player.isReady ? "Ready" : "Not Ready"}
                  </span>
                )}
              </motion.div>
            ))}

            {/* Empty slots */}
            {Array(room.maxPlayers - players.length).fill(0).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center p-3 rounded-lg bg-[var(--color-dark-3)]/30 border border-dashed border-[var(--color-dark-4)]"
              >
                <span className="text-[var(--muted-foreground)]">Waiting for player...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4">
          {!isInRoom ? (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleJoin}
              disabled={joining || players.length >= room.maxPlayers}
            >
              {joining ? "Joining..." : players.length >= room.maxPlayers ? "Room Full" : "Join Game"}
            </Button>
          ) : (
            <>
              {!isHost && (
                <Button
                  variant={multiplayer.myPlayer?.isReady ? "outline" : "primary"}
                  size="lg"
                  className="w-full"
                  onClick={() => multiplayer.setReady(!multiplayer.myPlayer?.isReady)}
                >
                  {multiplayer.myPlayer?.isReady ? "Not Ready" : "Ready"}
                </Button>
              )}

              {isHost && (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    // Create initial game state and start
                    const initialState = createInitialGameState(room.gameType, players);
                    multiplayer.startGame(initialState);
                  }}
                  disabled={!canStartGame}
                >
                  {players.length < (gameInfo?.minPlayers || 2)
                    ? `Need ${(gameInfo?.minPlayers || 2) - players.length} more player(s)`
                    : !players.every(p => p.isReady || p.isHost)
                    ? "Waiting for players to ready up"
                    : "Start Game"}
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={handleLeave}
              >
                Leave Room
              </Button>
            </>
          )}
        </div>

        {/* Connection status */}
        {isInRoom && (
          <div className="mt-4 text-center">
            <span className={`text-sm ${multiplayer.isConnected ? "text-green-400" : "text-yellow-400"}`}>
              {multiplayer.isConnected ? "● Connected" : "○ Connecting..."}
            </span>
          </div>
        )}

        {/* Nickname Modal for Guests */}
        <GuestNicknameModal
          isOpen={showNicknameModal}
          onClose={() => router.push("/games/cards")}
          onNicknameSet={(name) => {
            setShowNicknameModal(false);
            // Join after a short delay to let state update
            setTimeout(() => {
              handleJoin();
            }, 100);
          }}
          title="Join as Guest"
          description="Enter a nickname to join this game"
        />
      </div>
    </div>
  );
}

// Helper to create initial game state
function createInitialGameState(gameType: GameType, players: RoomPlayer[]): unknown {
  // This will be properly initialized by the game components
  return {
    gameType,
    playerIds: players.map(p => p.id),
    playerNames: players.map(p => p.name),
    startedAt: new Date().toISOString(),
  };
}

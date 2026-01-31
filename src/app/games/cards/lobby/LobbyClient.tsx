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
  getPublicRooms,
  createRoom,
  joinRoom,
} from "@/lib/cardGames/multiplayer";
import { GuestNicknameModal } from "@/components/games/GuestNicknameModal";

const GAME_INFO: Record<GameType, { name: string; icon: string; maxPlayers: number }> = {
  crazy_eights: { name: "Crazy Eights", icon: "🎱", maxPlayers: 4 },
  hearts: { name: "Hearts", icon: "💜", maxPlayers: 4 },
};

export function LobbyClient() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { guestPlayer, getPlayerId, getPlayerName, setCurrentRoom } = useMultiplayerStore();

  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterGameType, setFilterGameType] = useState<GameType | "all">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: "create" | "join"; gameType?: GameType; room?: GameRoom } | null>(null);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const playerId = getPlayerId(user?.id || null);
  const playerName = getPlayerName(user?.user_metadata?.display_name || user?.user_metadata?.username || null);
  const needsNickname = !user && !guestPlayer;

  // Handle nickname set for guests
  const handleNicknameSet = async (name: string) => {
    setShowNicknameModal(false);
    
    if (pendingAction?.type === "join" && pendingAction.room) {
      // Now join the game with the new guest name
      const newPlayerId = getPlayerId(null);
      setJoiningRoomId(pendingAction.room.id);
      try {
        await joinRoom(pendingAction.room.id, { playerId: newPlayerId, playerName: name });
        setCurrentRoom(pendingAction.room.code, pendingAction.room.gameType);
        router.push(`/games/cards/room/${pendingAction.room.code}`);
      } catch (err) {
        console.error("Error joining game:", err);
        setError(err instanceof Error ? err.message : "Failed to join game");
      } finally {
        setJoiningRoomId(null);
      }
    }
    
    setPendingAction(null);
  };

  // Fetch public rooms
  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const gameType = filterGameType === "all" ? undefined : filterGameType;
      const publicRooms = await getPublicRooms(gameType);
      setRooms(publicRooms);
      setError(null);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setError("Failed to load games. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filterGameType]);

  useEffect(() => {
    fetchRooms();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  // Handle create public game
  const handleCreateGame = async (gameType: GameType) => {
    if (needsNickname) {
      setPendingAction({ type: "create", gameType });
      setShowNicknameModal(true);
      return;
    }

    if (!user) {
      // Guests can't host - show login prompt
      router.push("/auth/login?redirect=/games/cards/lobby");
      return;
    }

    setCreating(true);
    try {
      const room = await createRoom({
        gameType,
        visibility: "public",
        hostId: playerId,
        hostName: playerName,
        maxPlayers: GAME_INFO[gameType].maxPlayers,
      });
      
      setCurrentRoom(room.code, gameType);
      router.push(`/games/cards/room/${room.code}`);
    } catch (err) {
      console.error("Error creating game:", err);
      setError("Failed to create game. Please try again.");
    } finally {
      setCreating(false);
      setShowCreateModal(false);
    }
  };

  // Handle join game
  const handleJoinGame = async (room: GameRoom) => {
    if (needsNickname) {
      setPendingAction({ type: "join", room, gameType: room.gameType });
      setShowNicknameModal(true);
      return;
    }

    setJoiningRoomId(room.id);
    try {
      await joinRoom(room.id, { playerId, playerName });
      setCurrentRoom(room.code, room.gameType);
      router.push(`/games/cards/room/${room.code}`);
    } catch (err) {
      console.error("Error joining game:", err);
      setError(err instanceof Error ? err.message : "Failed to join game");
    } finally {
      setJoiningRoomId(null);
    }
  };

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] py-8">
      <div className="container max-w-4xl">
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
              <h1 className="text-2xl font-heading">Game Lobby</h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Find and join public games
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchRooms} disabled={loading}>
              {loading ? "..." : "Refresh"}
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
              Create Game
            </Button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilterGameType("all")}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filterGameType === "all"
                ? "bg-[var(--color-main-1)] text-white"
                : "bg-[var(--color-dark-3)] text-[var(--muted-foreground)] hover:text-white"
            }`}
          >
            All Games
          </button>
          {(Object.keys(GAME_INFO) as GameType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilterGameType(type)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                filterGameType === type
                  ? "bg-[var(--color-main-1)] text-white"
                  : "bg-[var(--color-dark-3)] text-[var(--muted-foreground)] hover:text-white"
              }`}
            >
              <span>{GAME_INFO[type].icon}</span>
              {GAME_INFO[type].name}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Rooms List */}
        <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] rounded-xl overflow-hidden">
          {loading && rooms.length === 0 ? (
            <div className="p-12 text-center text-[var(--muted-foreground)]">
              Loading games...
            </div>
          ) : rooms.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">🎴</div>
              <p className="text-[var(--muted-foreground)] mb-4">
                No public games available right now
              </p>
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                Create a Game
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-dark-3)]">
              {rooms.map((room) => {
                const gameInfo = GAME_INFO[room.gameType];
                const isFull = room.players.length >= room.maxPlayers;
                const isJoining = joiningRoomId === room.id;

                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 flex items-center justify-between hover:bg-[var(--color-dark-3)]/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-[var(--color-dark-3)] flex items-center justify-center text-2xl">
                        {gameInfo.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{gameInfo.name}</span>
                          <span className="text-xs text-[var(--muted-foreground)] bg-[var(--color-dark-3)] px-2 py-0.5 rounded">
                            {room.code}
                          </span>
                        </div>
                        <div className="text-sm text-[var(--muted-foreground)]">
                          Hosted by {room.hostName} • {formatTimeAgo(room.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className={isFull ? "text-red-400" : "text-green-400"}>
                          {room.players.length}/{room.maxPlayers}
                        </span>
                        <span className="text-[var(--muted-foreground)]"> players</span>
                      </div>
                      <Button
                        variant={isFull ? "outline" : "primary"}
                        size="sm"
                        onClick={() => handleJoinGame(room)}
                        disabled={isFull || isJoining}
                      >
                        {isJoining ? "Joining..." : isFull ? "Full" : "Join"}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Join by Code Section */}
        <div className="mt-8">
          <JoinByCode
            onJoin={(code) => {
              setCurrentRoom(code, null);
              router.push(`/games/cards/room/${code}`);
            }}
          />
        </div>

        {/* Create Game Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-heading mb-4 text-center">Create Public Game</h2>
                {!user && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 text-yellow-400 text-sm">
                    You need to log in to host a game
                  </div>
                )}
                <div className="space-y-3">
                  {(Object.keys(GAME_INFO) as GameType[]).map((type) => {
                    const info = GAME_INFO[type];
                    return (
                      <button
                        key={type}
                        className="w-full p-4 bg-[var(--color-dark-3)]/50 hover:bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg transition-colors text-left flex items-center gap-4 disabled:opacity-50"
                        onClick={() => handleCreateGame(type)}
                        disabled={creating || !user}
                      >
                        <span className="text-3xl">{info.icon}</span>
                        <div>
                          <div className="font-medium">{info.name}</div>
                          <div className="text-sm text-[var(--muted-foreground)]">
                            {info.maxPlayers} players
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  className="mt-4 w-full text-sm text-[var(--muted-foreground)] hover:text-white transition-colors"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nickname Modal for Guests */}
        <GuestNicknameModal
          isOpen={showNicknameModal}
          onClose={() => {
            setShowNicknameModal(false);
            setPendingAction(null);
          }}
          onNicknameSet={handleNicknameSet}
          title="Join as Guest"
          description="Enter a nickname to join this game"
        />
      </div>
    </div>
  );
}

// Join by Code Component
function JoinByCode({ onJoin }: { onJoin: (code: string) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError("Code must be 6 characters");
      return;
    }
    setError("");
    onJoin(trimmed);
  };

  return (
    <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] rounded-xl p-6">
      <h3 className="font-heading text-lg mb-4">Join Private Game</h3>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="Enter room code"
            className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg text-white placeholder-[var(--muted-foreground)] uppercase tracking-widest text-center font-mono text-lg focus:outline-none focus:border-[var(--color-main-1)]"
            maxLength={6}
          />
          {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
        </div>
        <Button type="submit" variant="primary" disabled={code.length !== 6}>
          Join
        </Button>
      </form>
    </div>
  );
}

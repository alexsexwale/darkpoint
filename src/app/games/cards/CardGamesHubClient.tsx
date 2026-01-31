"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useAuthStore, useMultiplayerStore } from "@/stores";
import { GameType } from "@/types/database";
import { createRoom } from "@/lib/cardGames/multiplayer";

interface CardGame {
  id: string;
  name: string;
  description: string;
  icon: string;
  players: string;
  difficulty: "Easy" | "Medium" | "Hard";
  path: string;
  color: string;
  features: string[];
  supportsMultiplayer?: boolean;
  gameType?: GameType;
}

const CARD_GAMES: CardGame[] = [
  {
    id: "solitaire",
    name: "Solitaire",
    description: "The classic single-player card game. Arrange cards in foundation piles from Ace to King.",
    icon: "🃏",
    players: "1 Player",
    difficulty: "Easy",
    path: "/games/cards/solitaire",
    color: "from-green-500 to-emerald-600",
    features: ["Drag & Drop", "Undo Moves", "Auto-Complete", "Timer"],
  },
  {
    id: "spider",
    name: "Spider Solitaire",
    description: "Build sequences of cards from King to Ace. Choose from 1, 2, or 4 suit difficulty.",
    icon: "🕷️",
    players: "1 Player",
    difficulty: "Medium",
    path: "/games/cards/spider-solitaire",
    color: "from-purple-500 to-violet-600",
    features: ["3 Difficulties", "Hint System", "Score Tracking", "Statistics"],
  },
  {
    id: "crazy-eights",
    name: "Crazy Eights",
    description: "Match cards by suit or rank. Play 8s as wild cards to change the suit!",
    icon: "🎱",
    players: "2-4 Players",
    difficulty: "Easy",
    path: "/games/cards/crazy-eights",
    color: "from-orange-500 to-red-500",
    features: ["AI Opponents", "Online Multiplayer", "Wild Cards", "Quick Games"],
    supportsMultiplayer: true,
    gameType: "crazy_eights",
  },
  {
    id: "hearts",
    name: "Hearts",
    description: "Avoid hearts and the Queen of Spades. Or shoot the moon for a dramatic win!",
    icon: "💜",
    players: "4 Players",
    difficulty: "Hard",
    path: "/games/cards/hearts",
    color: "from-pink-500 to-rose-600",
    features: ["AI Opponents", "Online Multiplayer", "Shoot the Moon", "Score Tracking"],
    supportsMultiplayer: true,
    gameType: "hearts",
  },
];

const DIFFICULTY_COLORS = {
  Easy: "bg-green-500/20 text-green-400",
  Medium: "bg-yellow-500/20 text-yellow-400",
  Hard: "bg-red-500/20 text-red-400",
};

export function CardGamesHubClient() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { getPlayerId, getPlayerName, setCurrentRoom } = useMultiplayerStore();
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);
  const [showMultiplayerModal, setShowMultiplayerModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<CardGame | null>(null);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const playerId = getPlayerId(user?.id || null);
  const playerName = getPlayerName(user?.user_metadata?.display_name || user?.user_metadata?.username || null);

  const handleCreateGame = async (visibility: "private" | "public") => {
    if (!selectedGame?.gameType) return;
    if (!user) {
      router.push("/auth/login?redirect=/games/cards");
      return;
    }

    setCreating(true);
    try {
      const room = await createRoom({
        gameType: selectedGame.gameType,
        visibility,
        hostId: playerId,
        hostName: playerName,
        maxPlayers: selectedGame.gameType === "hearts" ? 4 : 4,
      });
      
      setCurrentRoom(room.code, selectedGame.gameType);
      router.push(`/games/cards/room/${room.code}`);
    } catch (err) {
      console.error("Error creating game:", err);
    } finally {
      setCreating(false);
      setShowMultiplayerModal(false);
    }
  };

  const handleJoinByCode = () => {
    if (joinCode.length === 6) {
      router.push(`/games/cards/room/${joinCode.toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-main-1)]/5 via-transparent to-transparent" />
          <motion.div
            className="absolute top-20 left-10 w-64 h-64 bg-[var(--color-main-1)]/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          
          {/* Floating cards decoration */}
          <motion.div
            className="absolute top-1/4 right-1/4 text-6xl opacity-20"
            animate={{ 
              y: [0, -20, 0], 
              rotate: [0, 10, 0],
            }}
            transition={{ duration: 5, repeat: Infinity }}
          >
            🂡
          </motion.div>
          <motion.div
            className="absolute bottom-1/4 left-1/4 text-6xl opacity-20"
            animate={{ 
              y: [0, 20, 0], 
              rotate: [0, -10, 0],
            }}
            transition={{ duration: 6, repeat: Infinity, delay: 1 }}
          >
            🂱
          </motion.div>
          <motion.div
            className="absolute top-1/3 left-1/5 text-5xl opacity-15"
            animate={{ 
              y: [0, -15, 0], 
              rotate: [0, 5, 0],
            }}
            transition={{ duration: 7, repeat: Infinity, delay: 2 }}
          >
            🃁
          </motion.div>
        </div>

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Animated Icon */}
            <motion.div
              className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[var(--color-main-1)] to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--color-main-1)]/30"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <span className="text-5xl">🃏</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading uppercase tracking-wider mb-4 bg-gradient-to-r from-white via-[var(--color-main-1)] to-purple-400 bg-clip-text text-transparent">
              Card Games
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-[var(--color-main-1)] to-purple-600 mx-auto mb-6 rounded-full" />
            <p className="text-[var(--muted-foreground)] text-lg max-w-2xl mx-auto leading-relaxed">
              Play classic card games right in your browser. From relaxing solitaire 
              to competitive multiplayer - we&apos;ve got something for everyone!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Games Grid */}
      <section className="py-12">
        <div className="container max-w-6xl">
          <div className="grid md:grid-cols-2 gap-6">
            {CARD_GAMES.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onMouseEnter={() => setHoveredGame(game.id)}
                onMouseLeave={() => setHoveredGame(null)}
              >
                <Link href={game.path}>
                  <div className="relative group h-full">
                    {/* Glow effect on hover */}
                    <motion.div
                      className={`absolute -inset-1 bg-gradient-to-r ${game.color} rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`}
                      animate={hoveredGame === game.id ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    
                    <div className="relative bg-[var(--color-dark-2)]/80 backdrop-blur border border-[var(--color-dark-3)] rounded-xl p-6 h-full transition-all duration-300 group-hover:border-[var(--color-dark-4)] group-hover:bg-[var(--color-dark-2)]">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <motion.div
                            className={`w-14 h-14 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center shadow-lg`}
                            whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                            transition={{ duration: 0.3 }}
                          >
                            <span className="text-3xl">{game.icon}</span>
                          </motion.div>
                          <div>
                            <h3 className="text-xl font-heading group-hover:text-[var(--color-main-1)] transition-colors">
                              {game.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-[var(--muted-foreground)]">
                                {game.players}
                              </span>
                              <span className="text-[var(--color-dark-4)]">•</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[game.difficulty]}`}>
                                {game.difficulty}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow */}
                        <motion.div
                          className="text-[var(--muted-foreground)] group-hover:text-[var(--color-main-1)] transition-colors"
                          animate={hoveredGame === game.id ? { x: [0, 5, 0] } : {}}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </motion.div>
                      </div>
                      
                      {/* Description */}
                      <p className="text-[var(--muted-foreground)] text-sm mb-4 leading-relaxed">
                        {game.description}
                      </p>
                      
                      {/* Features */}
                      <div className="flex flex-wrap gap-2">
                        {game.features.map((feature) => (
                          <span
                            key={feature}
                            className="text-xs px-2 py-1 bg-[var(--color-dark-3)]/50 rounded-lg text-[var(--muted-foreground)]"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Online Multiplayer Section */}
      <section className="py-12 bg-gradient-to-b from-transparent to-[var(--color-dark-2)]/30">
        <div className="container max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-heading mb-2">Play Online</h2>
            <div className="w-16 h-0.5 bg-[var(--color-main-1)] mx-auto rounded-full mb-4" />
            <p className="text-[var(--muted-foreground)]">
              Play with friends or join public games
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Create/Join Private Game */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] p-6 rounded-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-main-1)] to-purple-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading text-lg">Private Game</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">Invite friends with a code</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="Enter code"
                    className="flex-1 px-4 py-2 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg text-white placeholder-[var(--muted-foreground)] uppercase tracking-widest font-mono text-center focus:outline-none focus:border-[var(--color-main-1)]"
                    maxLength={6}
                  />
                  <Button
                    variant="outline"
                    onClick={handleJoinByCode}
                    disabled={joinCode.length !== 6}
                  >
                    Join
                  </Button>
                </div>
                <div className="text-center text-xs text-[var(--muted-foreground)]">or</div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => {
                      setSelectedGame(CARD_GAMES.find(g => g.gameType === "crazy_eights") || null);
                      setShowMultiplayerModal(true);
                    }}
                  >
                    <span className="mr-2">🎱</span> Create Crazy Eights
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => {
                      setSelectedGame(CARD_GAMES.find(g => g.gameType === "hearts") || null);
                      setShowMultiplayerModal(true);
                    }}
                  >
                    <span className="mr-2">💜</span> Create Hearts
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Browse Public Games */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] p-6 rounded-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading text-lg">Public Games</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">Join games with other players</p>
                </div>
              </div>
              
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Browse available public games or create your own for anyone to join.
              </p>
              
              <Link href="/games/cards/lobby">
                <Button variant="outline" className="w-full">
                  Browse Game Lobby
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Multiplayer Modal */}
      {showMultiplayerModal && selectedGame && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowMultiplayerModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{selectedGame.icon}</span>
              <div>
                <h2 className="text-xl font-heading">Create {selectedGame.name}</h2>
                <p className="text-sm text-[var(--muted-foreground)]">Choose game visibility</p>
              </div>
            </div>

            {!user && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 text-yellow-400 text-sm">
                You need to log in to host a game
              </div>
            )}

            <div className="space-y-3">
              <button
                className="w-full p-4 bg-[var(--color-dark-3)]/50 hover:bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg transition-colors text-left disabled:opacity-50"
                onClick={() => handleCreateGame("private")}
                disabled={creating || !user}
              >
                <div className="font-medium">Private Game</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Share a code with friends to join
                </div>
              </button>
              <button
                className="w-full p-4 bg-[var(--color-dark-3)]/50 hover:bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg transition-colors text-left disabled:opacity-50"
                onClick={() => handleCreateGame("public")}
                disabled={creating || !user}
              >
                <div className="font-medium">Public Game</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  Anyone can join from the lobby
                </div>
              </button>
            </div>

            <button
              className="mt-4 w-full text-sm text-[var(--muted-foreground)] hover:text-white transition-colors"
              onClick={() => setShowMultiplayerModal(false)}
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* How to Play Section */}
      <section className="py-16 bg-gradient-to-b from-[var(--color-dark-2)]/30 to-transparent">
        <div className="container max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl font-heading mb-2">Quick Start</h2>
            <div className="w-16 h-0.5 bg-[var(--color-main-1)] mx-auto rounded-full" />
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                icon: "👆",
                title: "Choose a Game",
                description: "Pick from our collection of classic card games above",
              },
              {
                step: "2",
                icon: "⚙️",
                title: "Set Up",
                description: "Choose your difficulty, number of players, or game mode",
              },
              {
                step: "3",
                icon: "🎉",
                title: "Play & Win",
                description: "Enjoy the game! Track your stats and beat your best scores",
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] p-6 rounded-xl text-center"
              >
                <div className="w-12 h-12 mx-auto mb-4 bg-[var(--color-main-1)] rounded-full flex items-center justify-center text-lg font-bold text-white">
                  {item.step}
                </div>
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h3 className="font-heading text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Back to Arcade Link */}
      <section className="py-8">
        <div className="container text-center">
          <Link
            href="/games"
            className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Retro Arcade
          </Link>
        </div>
      </section>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

interface BoardGame {
  id: string;
  name: string;
  description: string;
  icon: string;
  players: string;
  difficulty: "Easy" | "Medium" | "Hard";
  path: string;
  color: string;
  features: string[];
}

const BOARD_GAMES: BoardGame[] = [
  {
    id: "checkers",
    name: "Checkers",
    description: "The classic game of strategy. Jump over your opponent's pieces to capture them and become a King!",
    icon: "🔴",
    players: "vs AI",
    difficulty: "Easy",
    path: "/games/board/checkers",
    color: "from-red-500 to-orange-600",
    features: ["4 Difficulty Levels", "Mandatory Jumps", "King Pieces", "Undo Moves"],
  },
  {
    id: "chess",
    name: "Chess",
    description: "The ultimate game of strategy. Plan your moves carefully to checkmate your opponent's King!",
    icon: "♟️",
    players: "vs AI",
    difficulty: "Hard",
    path: "/games/board/chess",
    color: "from-slate-600 to-slate-800",
    features: ["4 Difficulty Levels", "All Special Moves", "Move Hints", "Undo Moves"],
  },
  {
    id: "connect-four",
    name: "Connect Four",
    description: "Drop your colored discs to connect four in a row - horizontally, vertically, or diagonally!",
    icon: "🔴",
    players: "vs AI",
    difficulty: "Medium",
    path: "/games/board/connect-four",
    color: "from-blue-500 to-blue-700",
    features: ["4 Difficulty Levels", "Drop Mechanics", "Win Detection", "Undo Moves"],
  },
  {
    id: "tic-tac-toe",
    name: "Tic-Tac-Toe",
    description: "The classic game of X's and O's. Get three in a row to win!",
    icon: "❌",
    players: "vs AI",
    difficulty: "Easy",
    path: "/games/board/tic-tac-toe",
    color: "from-blue-400 to-pink-500",
    features: ["4 Difficulty Levels", "Perfect AI Play", "Quick Games", "Undo Moves"],
  },
  {
    id: "reversi",
    name: "Reversi",
    description: "Flip your opponent's pieces by surrounding them. Control the most squares to win!",
    icon: "⚫",
    players: "vs AI",
    difficulty: "Medium",
    path: "/games/board/reversi",
    color: "from-green-600 to-green-800",
    features: ["4 Difficulty Levels", "Flip Mechanics", "Strategic Corners", "Undo Moves"],
  },
  {
    id: "backgammon",
    name: "Backgammon",
    description: "Roll the dice and race your pieces around the board. Bear off all 15 pieces to win!",
    icon: "🎲",
    players: "vs AI",
    difficulty: "Medium",
    path: "/games/board/backgammon",
    color: "from-amber-600 to-amber-800",
    features: ["4 Difficulty Levels", "Dice Rolling", "Bearing Off", "Hit & Block"],
  },
];

const DIFFICULTY_COLORS = {
  Easy: "bg-green-500/20 text-green-400",
  Medium: "bg-yellow-500/20 text-yellow-400",
  Hard: "bg-red-500/20 text-red-400",
};

export function BoardGamesHubClient() {
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

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
            className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          
          {/* Floating chess pieces decoration */}
          <motion.div
            className="absolute top-1/4 right-1/4 text-6xl opacity-20"
            animate={{ 
              y: [0, -20, 0], 
              rotate: [0, 10, 0],
            }}
            transition={{ duration: 5, repeat: Infinity }}
          >
            ♛
          </motion.div>
          <motion.div
            className="absolute bottom-1/4 left-1/4 text-6xl opacity-20"
            animate={{ 
              y: [0, 20, 0], 
              rotate: [0, -10, 0],
            }}
            transition={{ duration: 6, repeat: Infinity, delay: 1 }}
          >
            ♜
          </motion.div>
          <motion.div
            className="absolute top-1/3 left-1/5 text-5xl opacity-15"
            animate={{ 
              y: [0, -15, 0], 
              rotate: [0, 5, 0],
            }}
            transition={{ duration: 7, repeat: Infinity, delay: 2 }}
          >
            ⬤
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
              className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <span className="text-5xl">♟️</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading uppercase tracking-wider mb-4 bg-gradient-to-r from-white via-amber-400 to-orange-400 bg-clip-text text-transparent">
              Board Games
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-orange-600 mx-auto mb-6 rounded-full" />
            <p className="text-[var(--muted-foreground)] text-lg max-w-2xl mx-auto leading-relaxed">
              Challenge yourself against AI opponents in classic board games.
              Choose your difficulty level and sharpen your strategic skills!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Games Grid */}
      <section className="py-12">
        <div className="container max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BOARD_GAMES.map((game, index) => (
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
                            <h3 className="text-xl font-heading group-hover:text-amber-400 transition-colors">
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
                          className="text-[var(--muted-foreground)] group-hover:text-amber-400 transition-colors"
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

      {/* Difficulty Levels Info */}
      <section className="py-12 bg-gradient-to-b from-[var(--color-dark-2)]/30 to-transparent">
        <div className="container max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl font-heading mb-2">AI Difficulty Levels</h2>
            <div className="w-16 h-0.5 bg-amber-500 mx-auto rounded-full" />
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                level: "Easy",
                icon: "🌱",
                description: "Perfect for beginners learning the game",
                color: "bg-green-500/10 border-green-500/30",
              },
              {
                level: "Medium",
                icon: "🎯",
                description: "A balanced challenge for casual players",
                color: "bg-yellow-500/10 border-yellow-500/30",
              },
              {
                level: "Hard",
                icon: "🔥",
                description: "Strategic AI that plans ahead",
                color: "bg-orange-500/10 border-orange-500/30",
              },
              {
                level: "Master",
                icon: "👑",
                description: "Near-perfect play for experts only",
                color: "bg-red-500/10 border-red-500/30",
              },
            ].map((item, index) => (
              <motion.div
                key={item.level}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`${item.color} border rounded-xl p-4 text-center`}
              >
                <span className="text-3xl mb-2 block">{item.icon}</span>
                <h3 className="font-heading text-lg mb-1">{item.level}</h3>
                <p className="text-xs text-[var(--muted-foreground)]">{item.description}</p>
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

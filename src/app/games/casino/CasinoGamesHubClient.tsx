"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

interface CasinoGame {
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

const CASINO_GAMES: CasinoGame[] = [
  {
    id: "blackjack",
    name: "Blackjack",
    description: "Beat the dealer by getting as close to 21 as possible without going over. Classic casino card game!",
    icon: "🃏",
    players: "vs Dealer",
    difficulty: "Easy",
    path: "/games/casino/blackjack",
    color: "from-emerald-600 to-emerald-800",
    features: ["4 Difficulty Levels", "Double Down", "Split Pairs", "Insurance"],
  },
  {
    id: "poker",
    name: "Texas Hold'em",
    description: "The world's most popular poker game. Bluff, bet, and outplay AI opponents to win the pot!",
    icon: "♠️",
    players: "vs 3-5 AI",
    difficulty: "Hard",
    path: "/games/casino/poker",
    color: "from-red-600 to-red-800",
    features: ["4 Difficulty Levels", "No-Limit Betting", "All-In Showdowns", "Hand Rankings"],
  },
  {
    id: "roulette",
    name: "Roulette",
    description: "Spin the wheel and bet on where the ball lands. European and American variants available!",
    icon: "🎡",
    players: "vs House",
    difficulty: "Easy",
    path: "/games/casino/roulette",
    color: "from-amber-600 to-amber-800",
    features: ["European/American", "Multiple Bet Types", "Animated Wheel", "Betting History"],
  },
  {
    id: "slots",
    name: "Slot Machine",
    description: "Spin the reels and match symbols to win! Features wilds, scatters, and bonus rounds.",
    icon: "🎰",
    players: "Solo",
    difficulty: "Easy",
    path: "/games/casino/slots",
    color: "from-purple-600 to-purple-800",
    features: ["Multiple Paylines", "Wild Symbols", "Free Spins", "Autoplay"],
  },
  {
    id: "baccarat",
    name: "Baccarat",
    description: "The elegant card game of chance. Bet on Player, Banker, or Tie!",
    icon: "🎴",
    players: "vs House",
    difficulty: "Easy",
    path: "/games/casino/baccarat",
    color: "from-blue-600 to-blue-800",
    features: ["Punto Banco Rules", "Natural Wins", "Banker Commission", "Score Display"],
  },
  {
    id: "video-poker",
    name: "Video Poker",
    description: "Classic Jacks or Better draw poker. Hold your best cards and draw for a winning hand!",
    icon: "🃏",
    players: "Solo",
    difficulty: "Medium",
    path: "/games/casino/video-poker",
    color: "from-cyan-600 to-cyan-800",
    features: ["Jacks or Better", "5-Coin Max Bet", "Paytable Display", "Hold & Draw"],
  },
];

const DIFFICULTY_COLORS = {
  Easy: "bg-green-500/20 text-green-400",
  Medium: "bg-yellow-500/20 text-yellow-400",
  Hard: "bg-red-500/20 text-red-400",
};

export function CasinoGamesHubClient() {
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 via-transparent to-transparent" />
          <motion.div
            className="absolute top-20 left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          
          {/* Floating casino decorations */}
          <motion.div
            className="absolute top-1/4 right-1/4 text-6xl opacity-20"
            animate={{ 
              y: [0, -20, 0], 
              rotate: [0, 10, 0],
            }}
            transition={{ duration: 5, repeat: Infinity }}
          >
            🎰
          </motion.div>
          <motion.div
            className="absolute bottom-1/4 left-1/4 text-6xl opacity-20"
            animate={{ 
              y: [0, 20, 0], 
              rotate: [0, -10, 0],
            }}
            transition={{ duration: 6, repeat: Infinity, delay: 1 }}
          >
            🃏
          </motion.div>
          <motion.div
            className="absolute top-1/3 left-1/5 text-5xl opacity-15"
            animate={{ 
              y: [0, -15, 0], 
              rotate: [0, 5, 0],
            }}
            transition={{ duration: 7, repeat: Infinity, delay: 2 }}
          >
            💰
          </motion.div>
          <motion.div
            className="absolute bottom-1/3 right-1/5 text-5xl opacity-15"
            animate={{ 
              y: [0, 15, 0], 
              rotate: [0, -5, 0],
            }}
            transition={{ duration: 6, repeat: Infinity, delay: 0.5 }}
          >
            🎲
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
              className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <span className="text-5xl">🎰</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading uppercase tracking-wider mb-4 bg-gradient-to-r from-white via-yellow-400 to-emerald-400 bg-clip-text text-transparent">
              Casino Games
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-yellow-500 mx-auto mb-6 rounded-full" />
            <p className="text-[var(--muted-foreground)] text-lg max-w-2xl mx-auto leading-relaxed mb-4">
              Test your luck and skill against AI dealers and opponents.
              Play classic casino games with virtual chips - no real money involved!
            </p>
            
            {/* Play for Fun Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-2"
            >
              <span className="text-emerald-400 text-sm font-medium">Play for Fun Only</span>
              <span className="text-emerald-500">•</span>
              <span className="text-[var(--muted-foreground)] text-sm">No Real Money</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Games Grid */}
      <section className="py-12">
        <div className="container max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            {CASINO_GAMES.map((game, index) => (
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
                            <h3 className="text-xl font-heading group-hover:text-emerald-400 transition-colors">
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
                          className="text-[var(--muted-foreground)] group-hover:text-emerald-400 transition-colors"
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

      {/* How to Play Section */}
      <section className="py-12 bg-gradient-to-b from-[var(--color-dark-2)]/30 to-transparent">
        <div className="container max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl font-heading mb-2">How It Works</h2>
            <div className="w-16 h-0.5 bg-emerald-500 mx-auto rounded-full" />
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                icon: "🎮",
                title: "Choose a Game",
                description: "Pick Blackjack or Poker and select your difficulty level",
              },
              {
                step: "2",
                icon: "💰",
                title: "Place Your Bets",
                description: "Use virtual chips to bet - start with 1,000 free chips",
              },
              {
                step: "3",
                icon: "🏆",
                title: "Win Big",
                description: "Beat the AI and build your chip stack!",
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-[var(--color-dark-2)]/50 border border-[var(--color-dark-3)] rounded-xl p-6 text-center"
              >
                <div className="w-12 h-12 mx-auto mb-4 bg-emerald-500 rounded-full flex items-center justify-center text-lg font-bold text-white">
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

      {/* AI Difficulty Info */}
      <section className="py-12">
        <div className="container max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl font-heading mb-2">AI Difficulty Levels</h2>
            <div className="w-16 h-0.5 bg-emerald-500 mx-auto rounded-full" />
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                level: "Easy",
                icon: "🌱",
                description: "AI makes mistakes, perfect for learning",
                color: "bg-green-500/10 border-green-500/30",
              },
              {
                level: "Medium",
                icon: "🎯",
                description: "Balanced play with basic strategy",
                color: "bg-yellow-500/10 border-yellow-500/30",
              },
              {
                level: "Hard",
                icon: "🔥",
                description: "Smart AI that plays optimally",
                color: "bg-orange-500/10 border-orange-500/30",
              },
              {
                level: "Master",
                icon: "👑",
                description: "Near-perfect strategy, experts only",
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

      {/* Disclaimer */}
      <section className="py-8">
        <div className="container max-w-2xl">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
            <span className="text-2xl mb-2 block">⚠️</span>
            <p className="text-sm text-[var(--muted-foreground)]">
              <span className="text-yellow-400 font-medium">Disclaimer:</span>{" "}
              These are free-to-play games for entertainment purposes only. No real money is involved. 
              Virtual chips have no cash value and cannot be exchanged for real currency.
            </p>
          </div>
        </div>
      </section>

      {/* Back Link */}
      <section className="py-8">
        <div className="container text-center">
          <Link
            href="/games"
            className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Game Zone
          </Link>
        </div>
      </section>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

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
    features: ["AI Opponents", "Local Multiplayer", "Wild Cards", "Quick Games"],
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
    features: ["AI Opponents", "Card Passing", "Shoot the Moon", "Score Tracking"],
  },
];

const DIFFICULTY_COLORS = {
  Easy: "bg-green-500/20 text-green-400",
  Medium: "bg-yellow-500/20 text-yellow-400",
  Hard: "bg-red-500/20 text-red-400",
};

export function CardGamesHubClient() {
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

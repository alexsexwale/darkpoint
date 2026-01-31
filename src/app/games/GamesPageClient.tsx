"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface GameCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  color: string;
  gradient: string;
  features: string[];
  gameCount: string;
  highlight?: string;
}

const GAME_CATEGORIES: GameCategory[] = [
  {
    id: "arcade",
    name: "Retro Arcade",
    description: "Relive the classics! Play NES, SNES, PlayStation, Game Boy, and 30+ more consoles directly in your browser.",
    icon: "🎮",
    path: "/arcade",
    color: "from-purple-500 to-pink-600",
    gradient: "from-purple-500/20 to-pink-500/20",
    features: ["30+ Consoles", "Save States", "Instant Play", "No Downloads"],
    gameCount: "Unlimited ROMs",
    highlight: "MOST POPULAR",
  },
  {
    id: "casino",
    name: "Casino Games",
    description: "Test your luck and skill! Play Blackjack and Texas Hold'em Poker against AI opponents.",
    icon: "🎰",
    path: "/games/casino",
    color: "from-emerald-500 to-emerald-700",
    gradient: "from-emerald-500/20 to-emerald-700/20",
    features: ["Blackjack", "Texas Hold'em", "Virtual Chips", "4 AI Levels"],
    gameCount: "2 Games",
    highlight: "NEW",
  },
  {
    id: "board",
    name: "Board Games",
    description: "Challenge your mind with classic strategy games. Play against AI opponents with 4 difficulty levels.",
    icon: "♟️",
    path: "/games/board",
    color: "from-amber-500 to-orange-600",
    gradient: "from-amber-500/20 to-orange-500/20",
    features: ["Chess", "Checkers", "Connect Four", "Backgammon", "Reversi", "Tic-Tac-Toe"],
    gameCount: "6 Games",
  },
  {
    id: "cards",
    name: "Card Games",
    description: "Enjoy timeless card games. Play solo against AI or challenge friends in online multiplayer!",
    icon: "🃏",
    path: "/games/cards",
    color: "from-red-500 to-pink-600",
    gradient: "from-red-500/20 to-pink-500/20",
    features: ["Crazy Eights", "Hearts", "Go Fish", "FreeCell", "Solitaire", "Online Play"],
    gameCount: "6 Games",
    highlight: "MULTIPLAYER",
  },
];

export function GamesPageClient() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-main-1)]/5 via-transparent to-transparent" />
          
          {/* Floating game icons */}
          <motion.div
            className="absolute top-1/4 left-[10%] text-5xl opacity-20"
            animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
          >
            🎮
          </motion.div>
          <motion.div
            className="absolute top-1/3 right-[15%] text-4xl opacity-15"
            animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 7, repeat: Infinity, delay: 1 }}
          >
            🃏
          </motion.div>
          <motion.div
            className="absolute bottom-1/4 left-[20%] text-5xl opacity-20"
            animate={{ y: [0, -15, 0], rotate: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
          >
            ♟️
          </motion.div>
          <motion.div
            className="absolute bottom-1/3 right-[10%] text-4xl opacity-15"
            animate={{ y: [0, 20, 0], rotate: [0, 15, 0] }}
            transition={{ duration: 8, repeat: Infinity, delay: 2 }}
          >
            🎲
          </motion.div>
          
          {/* Glow effects */}
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-main-1)]/5 rounded-full blur-3xl"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 12, repeat: Infinity }}
          />
        </div>

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Main Icon */}
            <motion.div
              className="w-24 h-24 mx-auto mb-8 relative"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-main-1)] to-purple-600 rounded-2xl blur-xl opacity-50" />
              <div className="relative w-full h-full bg-gradient-to-br from-[var(--color-main-1)] to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <span className="text-5xl">🕹️</span>
              </div>
            </motion.div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading uppercase tracking-wider mb-6">
              <span className="bg-gradient-to-r from-white via-[var(--color-main-1)] to-purple-400 bg-clip-text text-transparent">
                Game Zone
              </span>
            </h1>
            
            <div className="w-32 h-1 bg-gradient-to-r from-transparent via-[var(--color-main-1)] to-transparent mx-auto mb-8 rounded-full" />
            
            <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto leading-relaxed">
              Your ultimate gaming destination. Choose your adventure from retro classics, 
              strategic board games, or timeless card games.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Game Categories */}
      <section className="py-12 pb-24">
        <div className="container max-w-6xl">
          {/* Section Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-heading mb-2">Choose Your Game</h2>
            <div className="w-16 h-0.5 bg-[var(--color-main-1)] mx-auto rounded-full" />
            <p className="text-[var(--muted-foreground)] mt-4">
              Pick a category and start playing instantly - no account required!
            </p>
          </motion.div>

          {/* Category Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {GAME_CATEGORIES.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onMouseEnter={() => setHoveredCard(category.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <Link href={category.path} className="block h-full">
                  <div className="group relative h-full">
                    {/* Glow effect */}
                    <motion.div
                      className={`absolute -inset-1 bg-gradient-to-r ${category.color} rounded-2xl blur-xl transition-opacity duration-500 ${
                        hoveredCard === category.id ? "opacity-40" : "opacity-0"
                      }`}
                      animate={hoveredCard === category.id ? { scale: [1, 1.02, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    />

                    {/* Card */}
                    <div className={`relative h-full bg-gradient-to-br ${category.gradient} backdrop-blur-sm border border-[var(--color-dark-3)] rounded-xl p-6 transition-all duration-300 group-hover:border-opacity-50 group-hover:bg-[var(--color-dark-2)]/90 overflow-hidden`}>
                      {/* Highlight Badge */}
                      {category.highlight && (
                        <div className="absolute top-4 right-4">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full bg-gradient-to-r ${category.color} text-white uppercase tracking-wider`}>
                            {category.highlight}
                          </span>
                        </div>
                      )}

                      {/* Icon */}
                      <motion.div
                        className={`w-16 h-16 mb-6 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg`}
                        whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.3 }}
                      >
                        <span className="text-4xl">{category.icon}</span>
                      </motion.div>

                      {/* Title & Game Count */}
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-2xl font-heading group-hover:text-white transition-colors">
                          {category.name}
                        </h3>
                        <span className="text-xs text-[var(--muted-foreground)] bg-[var(--color-dark-3)]/50 px-2 py-1 rounded-full">
                          {category.gameCount}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-[var(--muted-foreground)] text-sm mb-6 leading-relaxed">
                        {category.description}
                      </p>

                      {/* Features */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {category.features.slice(0, 4).map((feature) => (
                          <span
                            key={feature}
                            className="text-xs px-2 py-1 bg-[var(--color-dark-3)]/50 rounded-lg text-[var(--muted-foreground)]"
                          >
                            {feature}
                          </span>
                        ))}
                        {category.features.length > 4 && (
                          <span className="text-xs px-2 py-1 bg-[var(--color-dark-3)]/50 rounded-lg text-[var(--muted-foreground)]">
                            +{category.features.length - 4} more
                          </span>
                        )}
                      </div>

                      {/* CTA */}
                      <div className="flex items-center text-sm font-medium group-hover:text-white transition-colors">
                        <span>Play Now</span>
                        <motion.svg
                          className="w-5 h-5 ml-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          animate={hoveredCard === category.id ? { x: [0, 5, 0] } : {}}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </motion.svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-16 bg-gradient-to-b from-[var(--color-dark-2)]/50 to-transparent">
        <div className="container max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "30+", label: "Retro Consoles", icon: "🎮" },
              { value: "14+", label: "Classic Games", icon: "🎯" },
              { value: "4", label: "AI Difficulty Levels", icon: "🤖" },
              { value: "Free", label: "To Play", icon: "✨" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-4"
              >
                <span className="text-3xl mb-2 block">{stat.icon}</span>
                <div className="text-3xl font-heading text-[var(--color-main-1)] mb-1">{stat.value}</div>
                <div className="text-sm text-[var(--muted-foreground)]">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Play Section */}
      <section className="py-16">
        <div className="container max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-heading mb-2">Why Play on Darkpoint?</h2>
            <div className="w-16 h-0.5 bg-[var(--color-main-1)] mx-auto rounded-full" />
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "🌐",
                title: "100% Browser-Based",
                description: "No downloads, no installs. Just click and play instantly on any device.",
              },
              {
                icon: "🎯",
                title: "Skill-Based AI",
                description: "Challenge yourself with 4 difficulty levels from beginner to master.",
              },
              {
                icon: "👥",
                title: "Multiplayer Ready",
                description: "Play card games with friends online in real-time.",
              },
              {
                icon: "💾",
                title: "Save Your Progress",
                description: "Save states for retro games let you continue where you left off.",
              },
              {
                icon: "📱",
                title: "Play Anywhere",
                description: "Works on desktop, tablet, and mobile devices.",
              },
              {
                icon: "🆓",
                title: "Completely Free",
                description: "All games are free to play with no hidden fees.",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-[var(--color-dark-2)]/30 border border-[var(--color-dark-3)] rounded-xl p-6 text-center hover:border-[var(--color-main-1)]/30 transition-colors"
              >
                <span className="text-3xl mb-4 block">{feature.icon}</span>
                <h3 className="font-heading text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 pb-24">
        <div className="container max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-[var(--color-main-1)]/10 to-purple-500/10 border border-[var(--color-main-1)]/30 rounded-2xl p-8"
          >
            <span className="text-5xl mb-4 block">🎉</span>
            <h2 className="text-2xl font-heading mb-4">Ready to Play?</h2>
            <p className="text-[var(--muted-foreground)] mb-6">
              Jump right in! No account needed to start playing. Pick a game category above and enjoy!
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/arcade">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg font-medium text-white shadow-lg shadow-purple-500/30"
                >
                  Launch Retro Arcade
                </motion.button>
              </Link>
              <Link href="/games/board">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg font-medium hover:bg-[var(--color-dark-4)] transition-colors"
                >
                  Play Board Games
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

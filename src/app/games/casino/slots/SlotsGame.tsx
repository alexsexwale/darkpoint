"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";

type Difficulty = "easy" | "medium" | "hard" | "master";
type GamePhase = "idle" | "ready" | "spinning" | "result";

interface Symbol {
  id: string;
  emoji: string;
  name: string;
  value: number;
  isWild?: boolean;
  isScatter?: boolean;
}

interface WinLine {
  line: number;
  symbols: string;
  count: number;
  payout: number;
}

interface GameState {
  credits: number;
  bet: number;
  totalBet: number;
  reels: string[][];
  phase: GamePhase;
  message: string;
  winAmount: number;
  winLines: WinLine[];
  freeSpins: number;
  difficulty: Difficulty;
  autoplay: boolean;
}

const SYMBOLS: Symbol[] = [
  { id: "seven", emoji: "7️⃣", name: "Lucky 7", value: 100 },
  { id: "bar", emoji: "🎰", name: "BAR", value: 50 },
  { id: "diamond", emoji: "💎", name: "Diamond", value: 40 },
  { id: "bell", emoji: "🔔", name: "Bell", value: 30 },
  { id: "cherry", emoji: "🍒", name: "Cherry", value: 20 },
  { id: "lemon", emoji: "🍋", name: "Lemon", value: 15 },
  { id: "orange", emoji: "🍊", name: "Orange", value: 10 },
  { id: "wild", emoji: "⭐", name: "Wild", value: 150, isWild: true },
  { id: "scatter", emoji: "💫", name: "Scatter", value: 0, isScatter: true },
];

const REELS = 5;
const ROWS = 3;

// Paylines (positions on each reel: 0=top, 1=middle, 2=bottom)
const PAYLINES = [
  [1, 1, 1, 1, 1], // Middle row
  [0, 0, 0, 0, 0], // Top row
  [2, 2, 2, 2, 2], // Bottom row
  [0, 1, 2, 1, 0], // V shape
  [2, 1, 0, 1, 2], // Inverted V
  [0, 0, 1, 2, 2], // Diagonal down
  [2, 2, 1, 0, 0], // Diagonal up
  [1, 0, 0, 0, 1], // Top corners
  [1, 2, 2, 2, 1], // Bottom corners
];

const INITIAL_CREDITS: Record<Difficulty, number> = {
  easy: 10000,
  medium: 5000,
  hard: 2500,
  master: 1000,
};

// RTP (Return to Player) affects symbol weights
const RTP_WEIGHTS: Record<Difficulty, number> = {
  easy: 1.2,    // More generous
  medium: 1.0,  // Standard
  hard: 0.85,   // Tighter
  master: 0.7,  // Hardest
};

const DIFFICULTY_LABELS: Record<Difficulty, { label: string; icon: string; description: string }> = {
  easy: { label: "Easy", icon: "🌱", description: "10,000 credits, generous" },
  medium: { label: "Medium", icon: "🎯", description: "5,000 credits, standard" },
  hard: { label: "Hard", icon: "🔥", description: "2,500 credits, tight" },
  master: { label: "Master", icon: "💀", description: "1,000 credits, brutal" },
};

// Generate weighted random symbol
function getRandomSymbol(difficulty: Difficulty): string {
  const weight = RTP_WEIGHTS[difficulty];
  const random = Math.random();
  
  // Weighted distribution (higher value symbols less likely)
  if (random < 0.02 * weight) return "wild";
  if (random < 0.05 * weight) return "scatter";
  if (random < 0.08 * weight) return "seven";
  if (random < 0.12 * weight) return "bar";
  if (random < 0.18 * weight) return "diamond";
  if (random < 0.28 * weight) return "bell";
  if (random < 0.42 * weight) return "cherry";
  if (random < 0.65) return "lemon";
  return "orange";
}

// Generate a reel strip
function generateReel(difficulty: Difficulty): string[] {
  return Array.from({ length: ROWS }, () => getRandomSymbol(difficulty));
}

// Check for wins on a payline
function checkPayline(reels: string[][], payline: number[]): { symbol: string; count: number } | null {
  const symbols: string[] = payline.map((row, col) => reels[col][row]);
  
  // Get first non-wild symbol
  let targetSymbol = symbols.find(s => s !== "wild" && s !== "scatter");
  if (!targetSymbol) targetSymbol = "wild";
  
  let count = 0;
  for (const symbol of symbols) {
    if (symbol === targetSymbol || symbol === "wild") {
      count++;
    } else {
      break;
    }
  }
  
  // Need at least 3 matching
  if (count >= 3) {
    return { symbol: targetSymbol, count };
  }
  
  return null;
}

// Count scatter symbols
function countScatters(reels: string[][]): number {
  let count = 0;
  for (const reel of reels) {
    for (const symbol of reel) {
      if (symbol === "scatter") count++;
    }
  }
  return count;
}

const createInitialState = (): GameState => ({
  credits: 5000,
  bet: 1,
  totalBet: 9, // bet * paylines
  reels: Array(REELS).fill(null).map(() => Array(ROWS).fill("cherry")),
  phase: "idle",
  message: "",
  winAmount: 0,
  winLines: [],
  freeSpins: 0,
  difficulty: "medium",
  autoplay: false,
});

export function SlotsGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [spinningReels, setSpinningReels] = useState<boolean[]>([false, false, false, false, false]);
  const spinningRef = useRef(false);
  const autoplayRef = useRef(false);

  const totalBet = gameState.bet * PAYLINES.length;

  // Start new game
  const startGame = useCallback((difficulty: Difficulty) => {
    setGameState({
      ...createInitialState(),
      credits: INITIAL_CREDITS[difficulty],
      difficulty,
      phase: "ready",
      message: "Spin to play!",
    });
    setShowSetupModal(false);
  }, []);

  // Change bet
  const changeBet = useCallback((delta: number) => {
    setGameState(prev => {
      const newBet = Math.max(1, Math.min(10, prev.bet + delta));
      return { ...prev, bet: newBet };
    });
  }, []);

  // Max bet
  const maxBet = useCallback(() => {
    setGameState(prev => ({ ...prev, bet: 10 }));
  }, []);

  // Spin the reels
  const spin = useCallback(() => {
    if (spinningRef.current) return;
    if (gameState.phase !== "ready" && gameState.phase !== "result") return;
    
    const cost = gameState.freeSpins > 0 ? 0 : totalBet;
    if (cost > gameState.credits) return;

    spinningRef.current = true;
    
    setGameState(prev => ({
      ...prev,
      credits: prev.credits - cost,
      freeSpins: Math.max(0, prev.freeSpins - 1),
      phase: "spinning",
      winAmount: 0,
      winLines: [],
      message: prev.freeSpins > 0 ? `Free Spin! (${prev.freeSpins - 1} left)` : "Spinning...",
    }));

    // Generate new reels
    const newReels = Array(REELS).fill(null).map(() => generateReel(gameState.difficulty));

    // Animate reels stopping one by one
    const stopTimes = [500, 800, 1100, 1400, 1700];
    
    setSpinningReels([true, true, true, true, true]);

    stopTimes.forEach((time, index) => {
      setTimeout(() => {
        setSpinningReels(prev => {
          const next = [...prev];
          next[index] = false;
          return next;
        });

        setGameState(prev => {
          const updatedReels = [...prev.reels];
          updatedReels[index] = newReels[index];
          return { ...prev, reels: updatedReels };
        });

        // After last reel stops, calculate wins
        if (index === REELS - 1) {
          setTimeout(() => {
            calculateWins(newReels);
            spinningRef.current = false;
          }, 200);
        }
      }, time);
    });
  }, [gameState.phase, gameState.credits, gameState.freeSpins, gameState.difficulty, totalBet]);

  // Calculate wins
  const calculateWins = (reels: string[][]) => {
    const wins: WinLine[] = [];
    let totalWin = 0;

    // Check each payline
    PAYLINES.forEach((payline, index) => {
      const result = checkPayline(reels, payline);
      if (result) {
        const symbol = SYMBOLS.find(s => s.id === result.symbol);
        if (symbol) {
          const payout = symbol.value * result.count * gameState.bet;
          wins.push({
            line: index + 1,
            symbols: result.symbol,
            count: result.count,
            payout,
          });
          totalWin += payout;
        }
      }
    });

    // Check scatters
    const scatterCount = countScatters(reels);
    let newFreeSpins = 0;
    if (scatterCount >= 3) {
      newFreeSpins = scatterCount * 5;
      totalWin += gameState.bet * 50 * scatterCount;
    }

    setGameState(prev => ({
      ...prev,
      phase: "result",
      winAmount: totalWin,
      winLines: wins,
      credits: prev.credits + totalWin,
      freeSpins: prev.freeSpins + newFreeSpins,
      message: totalWin > 0
        ? `WIN! +${totalWin} credits${newFreeSpins > 0 ? ` + ${newFreeSpins} Free Spins!` : ""}`
        : "No win - try again!",
    }));
  };

  // Toggle autoplay
  const toggleAutoplay = useCallback(() => {
    autoplayRef.current = !autoplayRef.current;
    setGameState(prev => ({ ...prev, autoplay: !prev.autoplay }));
  }, []);

  // Autoplay effect
  useEffect(() => {
    if (!autoplayRef.current || spinningRef.current) return;
    if (gameState.phase !== "result") return;
    if (gameState.credits < totalBet && gameState.freeSpins === 0) {
      autoplayRef.current = false;
      setGameState(prev => ({ ...prev, autoplay: false }));
      return;
    }

    const timer = setTimeout(() => {
      if (autoplayRef.current) spin();
    }, 1500);

    return () => clearTimeout(timer);
  }, [gameState.phase, gameState.credits, gameState.freeSpins, totalBet, spin]);

  const getSymbolEmoji = (id: string) => SYMBOLS.find(s => s.id === id)?.emoji || "❓";

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 to-[var(--color-dark-1)]">
      {/* Header: title, then Paytable/New Game, then Credits/Bet */}
      <div className="container px-4 sm:px-6 pt-6 sm:pt-8 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link href="/games/casino" className="flex-shrink-0 text-[var(--muted-foreground)] hover:text-white transition-colors p-1 -m-1" aria-label="Back to casino">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl sm:text-2xl font-heading truncate">Slot Machine</h1>
          </div>
          
          <div className="flex items-center justify-end gap-4 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => setShowRulesModal(true)}
              className="text-sm text-[var(--muted-foreground)] hover:text-white transition-colors py-2 px-1 min-h-[44px] flex items-center sm:min-h-0 sm:py-0"
            >
              Paytable
            </button>
            <Button variant="primary" size="sm" onClick={() => setShowSetupModal(true)} className="min-h-[44px]">
              New Game
            </Button>
          </div>
        </div>

        {/* Spacer so New Game button doesn't touch content below */}
        <div className="h-5 sm:h-4" aria-hidden />

        {/* Credits / Bet row — below Paytable & New Game */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          <div className="bg-black/30 backdrop-blur rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-[var(--muted-foreground)]">CREDITS</div>
            <div className="text-xl font-bold text-yellow-400">{gameState.credits}</div>
          </div>
          <div className="bg-black/30 backdrop-blur rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-[var(--muted-foreground)]">BET</div>
            <div className="text-xl font-bold text-purple-400">{totalBet}</div>
          </div>
          {gameState.freeSpins > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-green-500/20 backdrop-blur rounded-lg px-4 py-2 text-center border border-green-500/50"
            >
              <div className="text-xs text-green-400">FREE SPINS</div>
              <div className="text-xl font-bold text-green-400">{gameState.freeSpins}</div>
            </motion.div>
          )}
          {gameState.winAmount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-yellow-500/20 backdrop-blur rounded-lg px-4 py-2 text-center border border-yellow-500/50"
            >
              <div className="text-xs text-yellow-400">WIN</div>
              <div className="text-xl font-bold text-yellow-400">{gameState.winAmount}</div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Game Area */}
      <div className="container px-4 sm:px-6 pt-2 pb-4">
        <div className="max-w-3xl mx-auto">
          {gameState.phase === "idle" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-6">🎰</div>
              <h1 className="text-4xl font-heading mb-4 text-white">Slot Machine</h1>
              <p className="text-[var(--muted-foreground)] mb-8 max-w-md mx-auto">
                Spin the reels and match symbols to win! Features wilds, scatters, and free spins!
              </p>
              <Button variant="primary" size="lg" onClick={() => setShowSetupModal(true)}>
                Start Game
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Slot Machine */}
              <div className="bg-gradient-to-b from-purple-900 to-purple-950 rounded-2xl p-6 border-4 border-yellow-500 shadow-2xl">
                {/* Reels */}
                <div className="bg-black/50 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-5 gap-2">
                    {gameState.reels.map((reel, reelIndex) => (
                      <div
                        key={reelIndex}
                        className="bg-white/10 rounded-lg overflow-hidden"
                      >
                        {reel.map((symbolId, rowIndex) => (
                          <motion.div
                            key={`${reelIndex}-${rowIndex}`}
                            className={`h-20 flex items-center justify-center text-4xl ${
                              gameState.winLines.some(w => 
                                PAYLINES[w.line - 1][reelIndex] === rowIndex
                              ) ? "bg-yellow-500/30" : ""
                            }`}
                            animate={spinningReels[reelIndex] ? {
                              y: [0, -20, 0, 20, 0],
                              opacity: [1, 0.5, 1, 0.5, 1],
                            } : {}}
                            transition={spinningReels[reelIndex] ? {
                              duration: 0.1,
                              repeat: Infinity,
                            } : {}}
                          >
                            {spinningReels[reelIndex] ? (
                              <span className="blur-sm">{getSymbolEmoji(symbolId)}</span>
                            ) : (
                              <motion.span
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 500 }}
                              >
                                {getSymbolEmoji(symbolId)}
                              </motion.span>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div className="text-center mb-4">
                  <motion.div
                    key={gameState.message}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`inline-block px-6 py-2 rounded-lg font-bold ${
                      gameState.winAmount > 0
                        ? "bg-yellow-500 text-black"
                        : "bg-black/30 text-white"
                    }`}
                  >
                    {gameState.message}
                  </motion.div>
                </div>

                {/* Controls - two rows on mobile (bet row, then spin + auto) so nothing is cut off */}
                <div className="w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  {/* Bet Controls - full width on mobile */}
                  <div className="flex items-center justify-center gap-1 sm:gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeBet(-1)}
                      disabled={gameState.bet <= 1 || gameState.phase === "spinning"}
                      className="min-w-[44px] sm:min-w-0"
                    >
                      -
                    </Button>
                    <span className="px-2 sm:px-3 text-sm sm:text-base text-white font-bold whitespace-nowrap">Bet: {gameState.bet}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeBet(1)}
                      disabled={gameState.bet >= 10 || gameState.phase === "spinning"}
                      className="min-w-[44px] sm:min-w-0"
                    >
                      +
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={maxBet}
                      disabled={gameState.phase === "spinning"}
                      className="min-w-[44px] sm:min-w-0"
                    >
                      Max
                    </Button>
                  </div>

                  {/* Spin + Auto - second row on mobile, touch-friendly */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3 flex-shrink-0">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={spin}
                      disabled={
                        gameState.phase === "spinning" ||
                        (gameState.credits < totalBet && gameState.freeSpins === 0)
                      }
                      className="px-8 sm:px-12 min-h-[44px]"
                    >
                      {gameState.freeSpins > 0 ? "FREE SPIN" : "SPIN"}
                    </Button>
                    <Button
                      variant={gameState.autoplay ? "primary" : "outline"}
                      size="sm"
                      onClick={toggleAutoplay}
                      disabled={gameState.phase === "spinning"}
                      className="min-h-[44px] min-w-[80px] sm:min-w-0"
                    >
                      Auto {gameState.autoplay ? "ON" : "OFF"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Win Lines Display */}
              {gameState.winLines.length > 0 && (
                <div className="bg-[var(--color-dark-2)]/50 backdrop-blur rounded-xl p-4 border border-[var(--color-dark-3)]">
                  <div className="text-sm text-[var(--muted-foreground)] mb-2">Winning Lines:</div>
                  <div className="flex flex-wrap gap-2">
                    {gameState.winLines.map((win, i) => (
                      <div
                        key={i}
                        className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg px-3 py-1 text-sm"
                      >
                        <span className="text-yellow-400">Line {win.line}:</span>{" "}
                        <span className="text-white">{win.count}x {getSymbolEmoji(win.symbols)}</span>{" "}
                        <span className="text-green-400">+{win.payout}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Game Over */}
              {gameState.credits < totalBet && gameState.freeSpins === 0 && gameState.phase === "result" && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400 mb-4">Game Over!</div>
                  <Button variant="primary" onClick={() => setShowSetupModal(true)}>
                    Play Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Setup Modal */}
      <AnimatePresence>
        {showSetupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSetupModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-heading mb-6 text-center">New Game</h2>
              
              <div className="mb-6">
                <label className="block text-sm text-[var(--muted-foreground)] mb-3">
                  Select Difficulty
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map(diff => {
                    const info = DIFFICULTY_LABELS[diff];
                    return (
                      <button
                        key={diff}
                        onClick={() => startGame(diff)}
                        className="p-4 bg-[var(--color-dark-3)]/50 hover:bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg transition-colors text-center"
                      >
                        <div className="text-2xl mb-1">{info.icon}</div>
                        <div className="font-bold text-white">{info.label}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">{info.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <Button variant="outline" className="w-full" onClick={() => setShowSetupModal(false)}>
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules/Paytable Modal */}
      <AnimatePresence>
        {showRulesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRulesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl max-w-lg w-full max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-heading p-6 pb-0 flex-shrink-0">Paytable &amp; Rules</h2>
              
              <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4">
                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="font-bold text-white mb-2">Symbol Values (per bet)</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {SYMBOLS.filter(s => !s.isScatter).map(symbol => (
                        <div key={symbol.id} className="flex items-center gap-2 bg-[var(--color-dark-3)]/50 rounded px-3 py-2">
                          <span className="text-2xl">{symbol.emoji}</span>
                          <div>
                            <div className="text-white font-medium">{symbol.name}</div>
                            <div className="text-[var(--muted-foreground)] text-xs">
                              {symbol.isWild ? "Wild - Substitutes any" : `3x = ${symbol.value * 3}, 4x = ${symbol.value * 4}, 5x = ${symbol.value * 5}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-white mb-1">Scatter Bonus</h3>
                    <p className="text-[var(--muted-foreground)]">
                      💫 3+ Scatters anywhere triggers Free Spins! (5 spins per scatter)
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-white mb-1">Paylines</h3>
                    <p className="text-[var(--muted-foreground)]">
                      9 paylines including horizontals, diagonals, and V-shapes. Match 3+ symbols from left to right.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-white mb-1">Wild Symbol</h3>
                    <p className="text-[var(--muted-foreground)]">
                      ⭐ Wild substitutes for any symbol except Scatter. 5 Wilds = Jackpot!
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 pt-4 flex-shrink-0 border-t border-[var(--color-dark-3)]">
                <Button variant="primary" className="w-full min-h-[44px]" onClick={() => setShowRulesModal(false)}>
                  Got It
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

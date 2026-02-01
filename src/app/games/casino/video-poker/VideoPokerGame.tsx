"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import { PlayingCard } from "@/lib/cardGames/cardRenderer";
import { Card } from "@/lib/cardGames/types";
import { createDeck, shuffleDeck } from "@/lib/cardGames/deck";

type Difficulty = "easy" | "medium" | "hard" | "master";
type GamePhase = "idle" | "betting" | "dealt" | "result";
type HandRank = 
  | "royal_flush"
  | "straight_flush"
  | "four_kind"
  | "full_house"
  | "flush"
  | "straight"
  | "three_kind"
  | "two_pair"
  | "jacks_better"
  | "nothing";

interface GameState {
  deck: Card[];
  hand: Card[];
  heldCards: boolean[];
  chips: number;
  bet: number;
  phase: GamePhase;
  message: string;
  handRank: HandRank | null;
  winAmount: number;
  difficulty: Difficulty;
}

// Paytable multipliers (based on coins bet)
const PAYTABLE: Record<HandRank, number[]> = {
  royal_flush: [250, 500, 750, 1000, 4000], // Jackpot on max bet
  straight_flush: [50, 100, 150, 200, 250],
  four_kind: [25, 50, 75, 100, 125],
  full_house: [9, 18, 27, 36, 45],
  flush: [6, 12, 18, 24, 30],
  straight: [4, 8, 12, 16, 20],
  three_kind: [3, 6, 9, 12, 15],
  two_pair: [2, 4, 6, 8, 10],
  jacks_better: [1, 2, 3, 4, 5],
  nothing: [0, 0, 0, 0, 0],
};

const HAND_NAMES: Record<HandRank, string> = {
  royal_flush: "Royal Flush",
  straight_flush: "Straight Flush",
  four_kind: "Four of a Kind",
  full_house: "Full House",
  flush: "Flush",
  straight: "Straight",
  three_kind: "Three of a Kind",
  two_pair: "Two Pair",
  jacks_better: "Jacks or Better",
  nothing: "No Win",
};

const INITIAL_CHIPS: Record<Difficulty, number> = {
  easy: 1000,
  medium: 500,
  hard: 250,
  master: 100,
};

const DIFFICULTY_LABELS: Record<Difficulty, { label: string; icon: string; description: string }> = {
  easy: { label: "Easy", icon: "🌱", description: "1000 credits" },
  medium: { label: "Medium", icon: "🎯", description: "500 credits" },
  hard: { label: "Hard", icon: "🔥", description: "250 credits" },
  master: { label: "Master", icon: "💀", description: "100 credits" },
};

// Hand evaluation functions
function getRankCounts(hand: Card[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const card of hand) {
    counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
  }
  return counts;
}

function isFlush(hand: Card[]): boolean {
  const suit = hand[0].suit;
  return hand.every(card => card.suit === suit);
}

function isStraight(hand: Card[]): boolean {
  const ranks = hand.map(c => c.rank).sort((a, b) => a - b);
  
  // Check for A-2-3-4-5 (wheel)
  if (ranks[0] === 1 && ranks[1] === 2 && ranks[2] === 3 && ranks[3] === 4 && ranks[4] === 5) {
    return true;
  }
  
  // Check for 10-J-Q-K-A (broadway)
  if (ranks[0] === 1 && ranks[1] === 10 && ranks[2] === 11 && ranks[3] === 12 && ranks[4] === 13) {
    return true;
  }
  
  // Check for regular straight
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  return true;
}

function isRoyalFlush(hand: Card[]): boolean {
  if (!isFlush(hand)) return false;
  const ranks = hand.map(c => c.rank).sort((a, b) => a - b);
  return ranks[0] === 1 && ranks[1] === 10 && ranks[2] === 11 && ranks[3] === 12 && ranks[4] === 13;
}

function evaluateHand(hand: Card[]): HandRank {
  const flush = isFlush(hand);
  const straight = isStraight(hand);
  const counts = getRankCounts(hand);
  const countValues = Array.from(counts.values()).sort((a, b) => b - a);
  
  // Royal Flush
  if (isRoyalFlush(hand)) return "royal_flush";
  
  // Straight Flush
  if (flush && straight) return "straight_flush";
  
  // Four of a Kind
  if (countValues[0] === 4) return "four_kind";
  
  // Full House
  if (countValues[0] === 3 && countValues[1] === 2) return "full_house";
  
  // Flush
  if (flush) return "flush";
  
  // Straight
  if (straight) return "straight";
  
  // Three of a Kind
  if (countValues[0] === 3) return "three_kind";
  
  // Two Pair
  if (countValues[0] === 2 && countValues[1] === 2) return "two_pair";
  
  // Jacks or Better (pair of J, Q, K, or A)
  if (countValues[0] === 2) {
    for (const [rank, count] of counts) {
      if (count === 2 && (rank >= 11 || rank === 1)) {
        return "jacks_better";
      }
    }
  }
  
  return "nothing";
}

const createInitialState = (): GameState => ({
  deck: [],
  hand: [],
  heldCards: [false, false, false, false, false],
  chips: 500,
  bet: 1,
  phase: "idle",
  message: "",
  handRank: null,
  winAmount: 0,
  difficulty: "medium",
});

export function VideoPokerGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Start new game
  const startGame = useCallback((difficulty: Difficulty) => {
    setGameState({
      ...createInitialState(),
      chips: INITIAL_CHIPS[difficulty],
      difficulty,
      phase: "betting",
      message: "Select bet and deal",
    });
    setShowSetupModal(false);
  }, []);

  // Change bet
  const changeBet = useCallback((delta: number) => {
    setGameState(prev => {
      const newBet = Math.max(1, Math.min(5, prev.bet + delta));
      if (newBet > prev.chips) return prev;
      return { ...prev, bet: newBet };
    });
  }, []);

  // Set max bet
  const maxBet = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      bet: Math.min(5, prev.chips),
    }));
  }, []);

  // Deal cards
  const deal = useCallback(() => {
    if (gameState.phase !== "betting" || gameState.bet > gameState.chips) return;
    
    const deck = shuffleDeck(createDeck(true));
    const hand = deck.splice(0, 5).map(c => ({ ...c, faceUp: true }));
    
    setGameState(prev => ({
      ...prev,
      deck,
      hand,
      heldCards: [false, false, false, false, false],
      chips: prev.chips - prev.bet,
      phase: "dealt",
      message: "Hold cards and draw",
      handRank: null,
      winAmount: 0,
    }));
  }, [gameState.phase, gameState.bet, gameState.chips]);

  // Toggle hold on a card
  const toggleHold = useCallback((index: number) => {
    if (gameState.phase !== "dealt") return;
    
    setGameState(prev => {
      const newHeld = [...prev.heldCards];
      newHeld[index] = !newHeld[index];
      return { ...prev, heldCards: newHeld };
    });
  }, [gameState.phase]);

  // Draw new cards
  const draw = useCallback(() => {
    if (gameState.phase !== "dealt") return;
    
    const newDeck = [...gameState.deck];
    const newHand = gameState.hand.map((card, i) => {
      if (gameState.heldCards[i]) return card;
      const newCard = newDeck.pop()!;
      return { ...newCard, faceUp: true };
    });
    
    const rank = evaluateHand(newHand);
    const winAmount = PAYTABLE[rank][gameState.bet - 1];
    
    setGameState(prev => ({
      ...prev,
      deck: newDeck,
      hand: newHand,
      phase: "result",
      handRank: rank,
      winAmount,
      chips: prev.chips + winAmount,
      message: winAmount > 0 
        ? `${HAND_NAMES[rank]}! Win ${winAmount} credits!`
        : "No win. Try again!",
    }));
  }, [gameState.phase, gameState.deck, gameState.hand, gameState.heldCards, gameState.bet]);

  // New round
  const newRound = useCallback(() => {
    if (gameState.chips < 1) {
      setGameState(prev => ({
        ...prev,
        phase: "idle",
        message: "Game Over - Out of credits!",
      }));
      return;
    }
    
    setGameState(prev => ({
      ...prev,
      hand: [],
      heldCards: [false, false, false, false, false],
      phase: "betting",
      handRank: null,
      winAmount: 0,
      message: "Select bet and deal",
    }));
  }, [gameState.chips]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-950 to-[var(--color-dark-1)]">
      {/* Header */}
      <div className="container pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/games/casino" className="text-[var(--muted-foreground)] hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-heading">Video Poker</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRulesModal(true)}
              className="text-sm text-[var(--muted-foreground)] hover:text-white transition-colors"
            >
              Paytable
            </button>
            <Button variant="primary" size="sm" onClick={() => setShowSetupModal(true)}>
              New Game
            </Button>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Credit Display */}
          <div className="flex justify-center gap-6 mb-6">
            <div className="bg-black/30 backdrop-blur rounded-lg px-4 py-2 text-center">
              <div className="text-xs text-[var(--muted-foreground)]">CREDITS</div>
              <div className="text-xl font-bold text-yellow-400">{gameState.chips}</div>
            </div>
            <div className="bg-black/30 backdrop-blur rounded-lg px-4 py-2 text-center">
              <div className="text-xs text-[var(--muted-foreground)]">BET</div>
              <div className="text-xl font-bold text-cyan-400">{gameState.bet}</div>
            </div>
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

          {gameState.phase === "idle" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-6">🎴</div>
              <h1 className="text-4xl font-heading mb-4 text-white">Video Poker</h1>
              <p className="text-[var(--muted-foreground)] mb-8 max-w-md mx-auto">
                {gameState.message || "Jacks or Better - Hold your best cards and draw for a winning hand!"}
              </p>
              <Button variant="primary" size="lg" onClick={() => setShowSetupModal(true)}>
                Start Game
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Paytable Display */}
              <div className="bg-[var(--color-dark-2)]/50 backdrop-blur rounded-xl p-4 border border-[var(--color-dark-3)] overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[var(--muted-foreground)]">
                      <th className="text-left py-1">Hand</th>
                      {[1, 2, 3, 4, 5].map(n => (
                        <th key={n} className={`text-center py-1 px-2 ${gameState.bet === n ? "text-yellow-400" : ""}`}>
                          {n}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.keys(PAYTABLE) as HandRank[]).filter(h => h !== "nothing").map(hand => (
                      <tr
                        key={hand}
                        className={`${
                          gameState.handRank === hand
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "text-white"
                        }`}
                      >
                        <td className="py-1 font-medium">{HAND_NAMES[hand]}</td>
                        {PAYTABLE[hand].map((payout, i) => (
                          <td
                            key={i}
                            className={`text-center py-1 px-2 ${gameState.bet === i + 1 ? "font-bold" : ""}`}
                          >
                            {payout}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards */}
              <div className="flex justify-center gap-3">
                {gameState.hand.length > 0 ? (
                  gameState.hand.map((card, i) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: -50, rotateY: 180 }}
                      animate={{ opacity: 1, y: 0, rotateY: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="relative"
                    >
                      <div
                        onClick={() => toggleHold(i)}
                        className={`cursor-pointer transition-transform ${
                          gameState.heldCards[i] ? "-translate-y-4" : ""
                        }`}
                      >
                        <PlayingCard card={card} size="lg" />
                      </div>
                      {gameState.phase === "dealt" && (
                        <div
                          className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold px-2 py-1 rounded ${
                            gameState.heldCards[i]
                              ? "bg-yellow-500 text-black"
                              : "bg-[var(--color-dark-3)] text-[var(--muted-foreground)]"
                          }`}
                        >
                          {gameState.heldCards[i] ? "HELD" : "HOLD"}
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  [0, 1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="w-[91px] h-[130px] border-2 border-dashed border-white/20 rounded-lg"
                    />
                  ))
                )}
              </div>

              {/* Message */}
              <div className="text-center mt-8">
                <motion.div
                  key={gameState.message}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`inline-block backdrop-blur rounded-lg px-6 py-3 ${
                    gameState.winAmount > 0
                      ? "bg-yellow-500/20 border border-yellow-500/50"
                      : "bg-black/40"
                  }`}
                >
                  <span className={`text-lg font-medium ${gameState.winAmount > 0 ? "text-yellow-400" : "text-white"}`}>
                    {gameState.message}
                  </span>
                </motion.div>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-4 mt-8">
                {gameState.phase === "betting" && (
                  <>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changeBet(-1)}
                        disabled={gameState.bet <= 1}
                      >
                        -
                      </Button>
                      <span className="px-4 text-lg font-bold text-white">Bet: {gameState.bet}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changeBet(1)}
                        disabled={gameState.bet >= 5 || gameState.bet >= gameState.chips}
                      >
                        +
                      </Button>
                    </div>
                    <Button variant="outline" onClick={maxBet} disabled={gameState.chips < 5}>
                      Max Bet
                    </Button>
                    <Button variant="primary" size="lg" onClick={deal}>
                      Deal
                    </Button>
                  </>
                )}

                {gameState.phase === "dealt" && (
                  <Button variant="primary" size="lg" onClick={draw}>
                    Draw
                  </Button>
                )}

                {gameState.phase === "result" && (
                  <Button variant="primary" size="lg" onClick={newRound}>
                    {gameState.chips >= 1 ? "Deal Again" : "Game Over"}
                  </Button>
                )}
              </div>
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
                  Select Starting Credits
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

      {/* Rules Modal */}
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
              className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-heading mb-4">How to Play Video Poker</h2>
              
              <div className="space-y-4 text-sm text-[var(--muted-foreground)]">
                <div>
                  <h3 className="font-bold text-white mb-1">Objective</h3>
                  <p>Get the best possible 5-card poker hand to win credits based on the paytable.</p>
                </div>
                
                <div>
                  <h3 className="font-bold text-white mb-1">How to Play</h3>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Select your bet (1-5 credits)</li>
                    <li>Click DEAL to receive 5 cards</li>
                    <li>Click cards to HOLD the ones you want to keep</li>
                    <li>Click DRAW to replace unheld cards</li>
                    <li>Win based on your final hand!</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="font-bold text-white mb-1">Winning Hands (Low to High)</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Jacks or Better:</strong> Pair of J, Q, K, or A</li>
                    <li><strong>Two Pair:</strong> Two different pairs</li>
                    <li><strong>Three of a Kind:</strong> Three matching cards</li>
                    <li><strong>Straight:</strong> Five sequential cards</li>
                    <li><strong>Flush:</strong> Five cards of same suit</li>
                    <li><strong>Full House:</strong> Three of a kind + pair</li>
                    <li><strong>Four of a Kind:</strong> Four matching cards</li>
                    <li><strong>Straight Flush:</strong> Straight + Flush</li>
                    <li><strong>Royal Flush:</strong> 10-J-Q-K-A of same suit</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-bold text-white mb-1">Tips</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Bet 5 credits for the Royal Flush jackpot bonus!</li>
                    <li>Always hold pairs of Jacks or higher</li>
                    <li>Hold 4 to a flush or straight</li>
                  </ul>
                </div>
              </div>
              
              <Button variant="primary" className="w-full mt-6" onClick={() => setShowRulesModal(false)}>
                Got It
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

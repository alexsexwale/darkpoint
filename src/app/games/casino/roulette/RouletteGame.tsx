"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";

type Difficulty = "easy" | "medium" | "hard" | "master";
type WheelType = "european" | "american";
type GamePhase = "betting" | "spinning" | "result" | "idle";
type BetType = 
  | "straight" // Single number
  | "red" | "black"
  | "odd" | "even"
  | "low" | "high" // 1-18, 19-36
  | "dozen1" | "dozen2" | "dozen3" // 1-12, 13-24, 25-36
  | "col1" | "col2" | "col3"; // Columns

interface Bet {
  type: BetType;
  numbers: number[];
  amount: number;
}

interface GameState {
  chips: number;
  bets: Bet[];
  currentBetAmount: number;
  phase: GamePhase;
  wheelType: WheelType;
  result: number | null;
  message: string;
  history: number[];
  difficulty: Difficulty;
  totalBet: number;
  winAmount: number;
}

// European wheel order
const EUROPEAN_WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

// American wheel order (includes 00 represented as 37)
const AMERICAN_WHEEL = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
  37, 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2
];

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

const INITIAL_CHIPS: Record<Difficulty, number> = {
  easy: 5000,
  medium: 2500,
  hard: 1000,
  master: 500,
};

const MIN_BET: Record<Difficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 25,
  master: 50,
};

const DIFFICULTY_LABELS: Record<Difficulty, { label: string; icon: string; description: string }> = {
  easy: { label: "Easy", icon: "🌱", description: "$5000 chips, $5 min" },
  medium: { label: "Medium", icon: "🎯", description: "$2500 chips, $10 min" },
  hard: { label: "Hard", icon: "🔥", description: "$1000 chips, $25 min" },
  master: { label: "Master", icon: "💀", description: "$500 chips, $50 min" },
};

const CHIP_VALUES = [5, 10, 25, 100, 500];

// Payout multipliers
const PAYOUTS: Record<BetType, number> = {
  straight: 35,
  red: 1, black: 1,
  odd: 1, even: 1,
  low: 1, high: 1,
  dozen1: 2, dozen2: 2, dozen3: 2,
  col1: 2, col2: 2, col3: 2,
};

function getColor(num: number): "red" | "black" | "green" {
  if (num === 0 || num === 37) return "green";
  return RED_NUMBERS.includes(num) ? "red" : "black";
}

function checkWin(bet: Bet, result: number): boolean {
  return bet.numbers.includes(result);
}

const createInitialState = (): GameState => ({
  chips: 2500,
  bets: [],
  currentBetAmount: 10,
  phase: "idle",
  wheelType: "european",
  result: null,
  message: "",
  history: [],
  difficulty: "medium",
  totalBet: 0,
  winAmount: 0,
});

export function RouletteGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const spinningRef = useRef(false);

  const minBet = MIN_BET[gameState.difficulty];

  // Start new game
  const startGame = useCallback((difficulty: Difficulty, wheelType: WheelType) => {
    setGameState({
      ...createInitialState(),
      chips: INITIAL_CHIPS[difficulty],
      difficulty,
      wheelType,
      currentBetAmount: MIN_BET[difficulty],
      phase: "betting",
      message: "Place your bets",
    });
    setWheelRotation(0);
    setShowSetupModal(false);
  }, []);

  // Place a bet
  const placeBet = useCallback((type: BetType, numbers: number[]) => {
    if (gameState.phase !== "betting") return;
    if (gameState.currentBetAmount > gameState.chips - gameState.totalBet) return;

    setGameState(prev => {
      // Check if same bet type already exists
      const existingBetIndex = prev.bets.findIndex(
        b => b.type === type && JSON.stringify(b.numbers) === JSON.stringify(numbers)
      );

      let newBets: Bet[];
      if (existingBetIndex >= 0) {
        // Add to existing bet
        newBets = [...prev.bets];
        newBets[existingBetIndex] = {
          ...newBets[existingBetIndex],
          amount: newBets[existingBetIndex].amount + prev.currentBetAmount,
        };
      } else {
        // New bet
        newBets = [...prev.bets, { type, numbers, amount: prev.currentBetAmount }];
      }

      const newTotalBet = newBets.reduce((sum, b) => sum + b.amount, 0);

      return {
        ...prev,
        bets: newBets,
        totalBet: newTotalBet,
      };
    });
  }, [gameState.phase, gameState.currentBetAmount, gameState.chips, gameState.totalBet]);

  // Clear all bets
  const clearBets = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      bets: [],
      totalBet: 0,
    }));
  }, []);

  // Spin the wheel
  const spin = useCallback(() => {
    if (gameState.phase !== "betting" || gameState.bets.length === 0 || spinningRef.current) return;

    spinningRef.current = true;
    const wheel = gameState.wheelType === "european" ? EUROPEAN_WHEEL : AMERICAN_WHEEL;
    const resultIndex = Math.floor(Math.random() * wheel.length);
    const result = wheel[resultIndex];
    const totalBetThisSpin = gameState.totalBet;
    const betsThisSpin = [...gameState.bets];

    // Rotation: CSS rotate(X) moves the wheel clockwise. The segment at top after rotation is the one
    // with i*segmentAngle ≡ -X (mod 360). We want segment resultIndex at top, so X ≡ 360 - resultIndex*segmentAngle (mod 360).
    // Use absolute target (not cumulative) so the wheel always lands on the correct number regardless of previous spins.
    const segmentAngle = 360 / wheel.length;
    const targetMod360 = (360 - resultIndex * segmentAngle + 360) % 360;
    // Spin at least 5 full rotations from current position, then land at targetMod360
    setWheelRotation(prev => {
      const minSpins = prev + 360 * 5;
      const currentMod = minSpins % 360;
      const diff = (targetMod360 - currentMod + 360) % 360;
      return minSpins + diff;
    });

    setGameState(prev => ({
      ...prev,
      phase: "spinning",
      chips: prev.chips - prev.totalBet,
      message: "Spinning...",
    }));

    // After spin completes - use captured result and bets to avoid stale closure
    setTimeout(() => {
      let totalWin = 0;
      for (const bet of betsThisSpin) {
        if (checkWin(bet, result)) {
          totalWin += bet.amount * (PAYOUTS[bet.type] + 1);
        }
      }

      setGameState(prev => ({
        ...prev,
        phase: "result",
        result,
        chips: prev.chips + totalWin,
        winAmount: totalWin,
        history: [result, ...prev.history].slice(0, 20),
        message: totalWin > 0
          ? `${result === 37 ? "00" : result} - You win $${totalWin - totalBetThisSpin}!`
          : `${result === 37 ? "00" : result} - No win`,
      }));

      spinningRef.current = false;
    }, 4000);
  }, [gameState.phase, gameState.bets, gameState.wheelType, gameState.totalBet]);

  // New round
  const newRound = useCallback(() => {
    if (gameState.chips < minBet) {
      setGameState(prev => ({
        ...prev,
        phase: "idle",
        message: "Game Over - Out of chips!",
      }));
      return;
    }

    setGameState(prev => ({
      ...prev,
      bets: [],
      totalBet: 0,
      phase: "betting",
      result: null,
      winAmount: 0,
      message: "Place your bets",
    }));
  }, [gameState.chips, minBet]);

  const wheel = gameState.wheelType === "european" ? EUROPEAN_WHEEL : AMERICAN_WHEEL;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 to-[var(--color-dark-1)]">
      {/* Header */}
      <div className="container pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/games/casino" className="text-[var(--muted-foreground)] hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-heading">Roulette</h1>
            <span className="text-xs bg-[var(--color-dark-3)] px-2 py-1 rounded">
              {gameState.wheelType === "european" ? "European" : "American"}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRulesModal(true)}
              className="text-sm text-[var(--muted-foreground)] hover:text-white transition-colors"
            >
              How to Play
            </button>
            <Button variant="primary" size="sm" onClick={() => setShowSetupModal(true)}>
              New Game
            </Button>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="container py-4">
        <div className="max-w-6xl mx-auto">
          {/* Chip Display */}
          <div className="flex justify-center gap-6 mb-4">
            <div className="bg-black/30 backdrop-blur rounded-lg px-4 py-2 text-center">
              <div className="text-xs text-[var(--muted-foreground)]">CHIPS</div>
              <div className="text-xl font-bold text-yellow-400">${gameState.chips}</div>
            </div>
            <div className="bg-black/30 backdrop-blur rounded-lg px-4 py-2 text-center">
              <div className="text-xs text-[var(--muted-foreground)]">BET</div>
              <div className="text-xl font-bold text-amber-400">${gameState.totalBet}</div>
            </div>
            {gameState.winAmount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-yellow-500/20 backdrop-blur rounded-lg px-4 py-2 text-center border border-yellow-500/50"
              >
                <div className="text-xs text-yellow-400">WIN</div>
                <div className="text-xl font-bold text-yellow-400">${gameState.winAmount}</div>
              </motion.div>
            )}
          </div>

          {gameState.phase === "idle" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-6">🎡</div>
              <h1 className="text-4xl font-heading mb-4 text-white">Roulette</h1>
              <p className="text-[var(--muted-foreground)] mb-8 max-w-md mx-auto">
                {gameState.message || "Spin the wheel and bet on where the ball lands!"}
              </p>
              <Button variant="primary" size="lg" onClick={() => setShowSetupModal(true)}>
                Start Game
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Wheel Section */}
              <div className="flex flex-col items-center">
                {/* Roulette Wheel */}
                <div className="relative w-64 h-64 mb-4">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-amber-900 to-amber-950 border-4 border-amber-700" />
                  
                  {/* Wheel */}
                  <motion.div
                    className="absolute inset-2 rounded-full overflow-hidden"
                    animate={{ rotate: wheelRotation }}
                    transition={{ duration: 4, ease: [0.2, 0.8, 0.2, 1] }}
                  >
                    {wheel.map((num, i) => {
                      const angle = (i * 360) / wheel.length;
                      const color = getColor(num);
                      return (
                        <div
                          key={i}
                          className="absolute w-full h-full"
                          style={{
                            transform: `rotate(${angle}deg)`,
                          }}
                        >
                          <div
                            className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1/2 origin-bottom ${
                              color === "green"
                                ? "bg-green-600"
                                : color === "red"
                                ? "bg-red-600"
                                : "bg-gray-900"
                            }`}
                            style={{
                              clipPath: "polygon(30% 0, 70% 0, 55% 100%, 45% 100%)",
                            }}
                          >
                            <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white">
                              {num === 37 ? "00" : num}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>

                  {/* Center */}
                  <div className="absolute inset-[30%] rounded-full bg-gradient-to-b from-amber-700 to-amber-900 border-2 border-amber-600" />

                  {/* Ball indicator */}
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg z-10" />
                </div>

                {/* Result Display */}
                {gameState.result !== null && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`text-4xl font-bold px-6 py-3 rounded-xl ${
                      getColor(gameState.result) === "green"
                        ? "bg-green-600"
                        : getColor(gameState.result) === "red"
                        ? "bg-red-600"
                        : "bg-gray-900"
                    }`}
                  >
                    {gameState.result === 37 ? "00" : gameState.result}
                  </motion.div>
                )}

                {/* History */}
                {gameState.history.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-[var(--muted-foreground)] mb-2 text-center">Recent Numbers</div>
                    <div className="flex gap-1 flex-wrap justify-center max-w-[200px]">
                      {gameState.history.slice(0, 10).map((num, i) => (
                        <div
                          key={i}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            getColor(num) === "green"
                              ? "bg-green-600"
                              : getColor(num) === "red"
                              ? "bg-red-600"
                              : "bg-gray-900"
                          }`}
                        >
                          {num === 37 ? "00" : num}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message */}
                <div className="mt-4 text-center">
                  <motion.div
                    key={gameState.message}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-block bg-black/40 backdrop-blur rounded-lg px-4 py-2"
                  >
                    <span className="text-sm font-medium text-white">{gameState.message}</span>
                  </motion.div>
                </div>
              </div>

              {/* Betting Board */}
              <div className="bg-[var(--color-dark-2)]/50 backdrop-blur rounded-xl p-4 border border-[var(--color-dark-3)]">
                {/* Chip Selector */}
                <div className="flex justify-center gap-2 mb-4">
                  {CHIP_VALUES.filter(v => v <= gameState.chips).map(value => (
                    <button
                      key={value}
                      onClick={() => setGameState(prev => ({ ...prev, currentBetAmount: value }))}
                      disabled={gameState.phase !== "betting"}
                      className={`w-12 h-12 rounded-full font-bold text-sm transition-all ${
                        gameState.currentBetAmount === value
                          ? "bg-yellow-500 text-black scale-110"
                          : "bg-[var(--color-dark-3)] text-white hover:bg-[var(--color-dark-4)]"
                      }`}
                    >
                      ${value}
                    </button>
                  ))}
                </div>

                {/* Number Grid */}
                <div className="grid grid-cols-13 gap-1 mb-4">
                  {/* Zero */}
                  <button
                    onClick={() => placeBet("straight", [0])}
                    disabled={gameState.phase !== "betting"}
                    className="col-span-1 row-span-3 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded text-sm disabled:opacity-50"
                  >
                    0
                  </button>

                  {/* Numbers 1-36 */}
                  {[1, 2, 3].map(row => (
                    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].map(start => {
                      const num = start + (3 - row);
                      return (
                        <button
                          key={num}
                          onClick={() => placeBet("straight", [num])}
                          disabled={gameState.phase !== "betting"}
                          className={`aspect-square flex items-center justify-center text-white font-bold text-xs rounded disabled:opacity-50 ${
                            RED_NUMBERS.includes(num)
                              ? "bg-red-600 hover:bg-red-500"
                              : "bg-gray-800 hover:bg-gray-700"
                          } ${gameState.bets.some(b => b.type === "straight" && b.numbers.includes(num)) ? "ring-2 ring-yellow-400" : ""}`}
                        >
                          {num}
                        </button>
                      );
                    })
                  ))}
                </div>

                {/* Outside Bets */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button
                    onClick={() => placeBet("dozen1", Array.from({ length: 12 }, (_, i) => i + 1))}
                    disabled={gameState.phase !== "betting"}
                    className={`py-2 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] text-white text-xs font-bold rounded disabled:opacity-50 ${
                      gameState.bets.some(b => b.type === "dozen1") ? "ring-2 ring-yellow-400" : ""
                    }`}
                  >
                    1st 12
                  </button>
                  <button
                    onClick={() => placeBet("dozen2", Array.from({ length: 12 }, (_, i) => i + 13))}
                    disabled={gameState.phase !== "betting"}
                    className={`py-2 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] text-white text-xs font-bold rounded disabled:opacity-50 ${
                      gameState.bets.some(b => b.type === "dozen2") ? "ring-2 ring-yellow-400" : ""
                    }`}
                  >
                    2nd 12
                  </button>
                  <button
                    onClick={() => placeBet("dozen3", Array.from({ length: 12 }, (_, i) => i + 25))}
                    disabled={gameState.phase !== "betting"}
                    className={`py-2 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] text-white text-xs font-bold rounded disabled:opacity-50 ${
                      gameState.bets.some(b => b.type === "dozen3") ? "ring-2 ring-yellow-400" : ""
                    }`}
                  >
                    3rd 12
                  </button>
                </div>

                <div className="grid grid-cols-6 gap-2 mb-4">
                  <button
                    onClick={() => placeBet("low", Array.from({ length: 18 }, (_, i) => i + 1))}
                    disabled={gameState.phase !== "betting"}
                    className={`py-2 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] text-white text-xs font-bold rounded disabled:opacity-50 ${
                      gameState.bets.some(b => b.type === "low") ? "ring-2 ring-yellow-400" : ""
                    }`}
                  >
                    1-18
                  </button>
                  <button
                    onClick={() => placeBet("even", [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36])}
                    disabled={gameState.phase !== "betting"}
                    className={`py-2 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] text-white text-xs font-bold rounded disabled:opacity-50 ${
                      gameState.bets.some(b => b.type === "even") ? "ring-2 ring-yellow-400" : ""
                    }`}
                  >
                    Even
                  </button>
                  <button
                    onClick={() => placeBet("red", RED_NUMBERS)}
                    disabled={gameState.phase !== "betting"}
                    className={`py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded disabled:opacity-50 ${
                      gameState.bets.some(b => b.type === "red") ? "ring-2 ring-yellow-400" : ""
                    }`}
                  >
                    Red
                  </button>
                  <button
                    onClick={() => placeBet("black", BLACK_NUMBERS)}
                    disabled={gameState.phase !== "betting"}
                    className={`py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded disabled:opacity-50 ${
                      gameState.bets.some(b => b.type === "black") ? "ring-2 ring-yellow-400" : ""
                    }`}
                  >
                    Black
                  </button>
                  <button
                    onClick={() => placeBet("odd", [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35])}
                    disabled={gameState.phase !== "betting"}
                    className={`py-2 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] text-white text-xs font-bold rounded disabled:opacity-50 ${
                      gameState.bets.some(b => b.type === "odd") ? "ring-2 ring-yellow-400" : ""
                    }`}
                  >
                    Odd
                  </button>
                  <button
                    onClick={() => placeBet("high", Array.from({ length: 18 }, (_, i) => i + 19))}
                    disabled={gameState.phase !== "betting"}
                    className={`py-2 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] text-white text-xs font-bold rounded disabled:opacity-50 ${
                      gameState.bets.some(b => b.type === "high") ? "ring-2 ring-yellow-400" : ""
                    }`}
                  >
                    19-36
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-4">
                  {gameState.phase === "betting" && (
                    <>
                      <Button variant="outline" onClick={clearBets} disabled={gameState.bets.length === 0}>
                        Clear Bets
                      </Button>
                      <Button variant="primary" onClick={spin} disabled={gameState.bets.length === 0}>
                        Spin
                      </Button>
                    </>
                  )}
                  {gameState.phase === "result" && (
                    <Button variant="primary" onClick={newRound}>
                      {gameState.chips >= minBet ? "New Round" : "Game Over"}
                    </Button>
                  )}
                </div>
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
                  Wheel Type
                </label>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {(["european", "american"] as WheelType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setGameState(prev => ({ ...prev, wheelType: type }))}
                      className={`p-4 border rounded-lg transition-colors text-center ${
                        gameState.wheelType === type
                          ? "bg-amber-500/20 border-amber-500"
                          : "bg-[var(--color-dark-3)]/50 border-[var(--color-dark-4)] hover:border-amber-500/50"
                      }`}
                    >
                      <div className="font-bold text-white capitalize">{type}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {type === "european" ? "Single 0 (2.7% edge)" : "0 and 00 (5.26% edge)"}
                      </div>
                    </button>
                  ))}
                </div>

                <label className="block text-sm text-[var(--muted-foreground)] mb-3">
                  Select Difficulty
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map(diff => {
                    const info = DIFFICULTY_LABELS[diff];
                    return (
                      <button
                        key={diff}
                        onClick={() => startGame(diff, gameState.wheelType)}
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
              <h2 className="text-2xl font-heading mb-4">How to Play Roulette</h2>
              
              <div className="space-y-4 text-sm text-[var(--muted-foreground)]">
                <div>
                  <h3 className="font-bold text-white mb-1">Objective</h3>
                  <p>Predict which number or group of numbers the ball will land on when the wheel stops spinning.</p>
                </div>
                
                <div>
                  <h3 className="font-bold text-white mb-1">How to Play</h3>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Select your chip value</li>
                    <li>Click on the betting board to place bets</li>
                    <li>Click SPIN when ready</li>
                    <li>Win if the ball lands on your bet!</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="font-bold text-white mb-1">Bet Types &amp; Payouts</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Straight (single number):</strong> 35:1</li>
                    <li><strong>Red/Black:</strong> 1:1</li>
                    <li><strong>Odd/Even:</strong> 1:1</li>
                    <li><strong>1-18/19-36:</strong> 1:1</li>
                    <li><strong>Dozens (1-12, 13-24, 25-36):</strong> 2:1</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-bold text-white mb-1">Wheel Types</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>European:</strong> Single 0 (better odds)</li>
                    <li><strong>American:</strong> 0 and 00 (higher house edge)</li>
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

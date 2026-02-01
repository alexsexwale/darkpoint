"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useGamificationStore, useAuthStore } from "@/stores";
import { useBadgeSound } from "@/hooks";
import { getHighestVIPTier, hasVIPAccess, VIP_TIERS, type VIPTier } from "@/types/vip";

// Game type definitions
type GameType =
  | "memory"
  | "slots"
  | "trivia" // Bronze tier (all VIPs)
  | "reaction"
  | "whack"
  | "word" // Gold tier
  | "pattern"
  | "simon"
  | "coinflip"; // Platinum tier

// All games configuration
interface GameConfig {
  id: GameType;
  name: string;
  icon: string;
  description: string;
  maxXP: number;
  dailyPlays: number;
  requiredTier: Exclude<VIPTier, null>;
}

const ALL_GAMES: GameConfig[] = [
  // Bronze tier
  { id: "memory", name: "Memory Match", icon: "🧠", description: "Match pairs to win XP", maxXP: 50, dailyPlays: 3, requiredTier: "bronze" },
  { id: "slots", name: "Lucky Slots", icon: "🎰", description: "Spin to win prizes", maxXP: 100, dailyPlays: 3, requiredTier: "bronze" },
  { id: "trivia", name: "Trivia Challenge", icon: "📝", description: "200 random questions", maxXP: 50, dailyPlays: 3, requiredTier: "bronze" },
  // Gold tier
  { id: "reaction", name: "Reaction Test", icon: "⚡", description: "Test your reflexes", maxXP: 50, dailyPlays: 3, requiredTier: "gold" },
  { id: "whack", name: "Whack-a-Mole", icon: "🔨", description: "Whack moles for points", maxXP: 50, dailyPlays: 3, requiredTier: "gold" },
  { id: "word", name: "Word Scramble", icon: "🔤", description: "Unscramble 5 words", maxXP: 50, dailyPlays: 3, requiredTier: "gold" },
  // Platinum tier
  { id: "pattern", name: "Pattern Match", icon: "🔢", description: "Complete sequences", maxXP: 50, dailyPlays: 3, requiredTier: "platinum" },
  { id: "simon", name: "Simon Says", icon: "🎵", description: "Repeat color sequences", maxXP: 50, dailyPlays: 3, requiredTier: "platinum" },
  { id: "coinflip", name: "Coin Flip Streak", icon: "🪙", description: "Predict heads or tails", maxXP: 50, dailyPlays: 3, requiredTier: "platinum" },
];

function getAvailableGames(tier: VIPTier): GameType[] {
  if (!tier) return [];
  return ALL_GAMES.filter((g) => hasVIPAccess(tier, g.requiredTier)).map((g) => g.id);
}

// Memory Match Game
interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const MEMORY_EMOJIS = ["🎮", "🕹️", "💎", "⚡", "🔥", "👑", "🏆", "✨"];
const MAX_MEMORY_GAMES_PER_DAY = 3;

function MemoryGame({ onWin, onGameComplete }: { onWin: (xp: number) => void; onGameComplete?: () => void }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [dailyGamesLeft, setDailyGamesLeft] = useState(MAX_MEMORY_GAMES_PER_DAY);
  const [canPlay, setCanPlay] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const savedDate = localStorage.getItem("memoryGamesDate");
    const savedGames = localStorage.getItem("memoryGamesPlayed");

    let gamesPlayed = 0;
    if (savedDate === today) {
      gamesPlayed = parseInt(savedGames || "0");
    } else {
      localStorage.setItem("memoryGamesDate", today);
      localStorage.setItem("memoryGamesPlayed", "0");
    }

    const remaining = MAX_MEMORY_GAMES_PER_DAY - gamesPlayed;
    setDailyGamesLeft(remaining);
    setCanPlay(remaining > 0);

    if (remaining > 0) {
      initializeCards();
    }
  }, []);

  const initializeCards = () => {
    const shuffled = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffled);
  };

  const handleCardClick = (id: number) => {
    if (isLocked || cards[id].isFlipped || cards[id].isMatched || !canPlay) return;

    const newCards = [...cards];
    newCards[id].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      setIsLocked(true);

      const [first, second] = newFlipped;
      if (cards[first].emoji === cards[second].emoji) {
        setTimeout(() => {
          const matched = [...cards];
          matched[first].isMatched = true;
          matched[second].isMatched = true;
          setCards(matched);
          setFlippedCards([]);
          setIsLocked(false);

          const totalMatched = matched.filter((c) => c.isMatched).length;
          if (totalMatched === matched.length) {
            setGameComplete(true);
            const currentMoves = moves + 1;
            const xpReward = Math.max(50 - currentMoves * 2, 10);
            onWin(xpReward);

            const gamesPlayed = parseInt(localStorage.getItem("memoryGamesPlayed") || "0") + 1;
            localStorage.setItem("memoryGamesPlayed", gamesPlayed.toString());
            setDailyGamesLeft(MAX_MEMORY_GAMES_PER_DAY - gamesPlayed);

            if (onGameComplete) onGameComplete();
          }
        }, 500);
      } else {
        setTimeout(() => {
          const reset = [...cards];
          reset[first].isFlipped = false;
          reset[second].isFlipped = false;
          setCards(reset);
          setFlippedCards([]);
          setIsLocked(false);
        }, 1000);
      }
    }
  };

  const resetGame = () => {
    const gamesPlayed = parseInt(localStorage.getItem("memoryGamesPlayed") || "0");
    const remaining = MAX_MEMORY_GAMES_PER_DAY - gamesPlayed;

    if (remaining <= 0) {
      setCanPlay(false);
      return;
    }

    initializeCards();
    setFlippedCards([]);
    setMoves(0);
    setIsLocked(false);
    setGameComplete(false);
  };

  if (!canPlay) {
    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <h3 className="font-heading text-xl mb-4">Daily Limit Reached</h3>
        <p className="text-4xl mb-4">⏰</p>
        <p className="text-white/60 mb-4">You&apos;ve played all {MAX_MEMORY_GAMES_PER_DAY} memory games for today.</p>
        <p className="text-purple-400 text-sm">Come back tomorrow for more!</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl">Memory Match</h3>
        <div className="text-right">
          <span className="text-white/60 text-sm block">Moves: {moves}</span>
          <span className="text-white/40 text-xs">{dailyGamesLeft} game{dailyGamesLeft !== 1 ? "s" : ""} left today</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {cards.map((card) => (
          <motion.button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            className={`aspect-square rounded-lg text-2xl flex items-center justify-center cursor-pointer transition-colors ${
              card.isFlipped || card.isMatched ? "bg-[var(--color-main-1)]/20 border-2 border-[var(--color-main-1)]" : "bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)]"
            }`}
            whileHover={!card.isFlipped && !card.isMatched ? { scale: 1.05 } : {}}
            whileTap={{ scale: 0.95 }}
          >
            {(card.isFlipped || card.isMatched) && card.emoji}
          </motion.button>
        ))}
      </div>

      {gameComplete && (
        <div className="text-center p-4 bg-green-500/20 rounded-lg">
          <p className="text-green-400 font-semibold">🎉 You won in {moves} moves!</p>
          <p className="text-white/40 text-sm mt-1">
            {dailyGamesLeft > 0 ? `${dailyGamesLeft} game${dailyGamesLeft !== 1 ? "s" : ""} left today` : "No games left today"}
          </p>
          {dailyGamesLeft > 0 ? (
            <Button variant="outline" size="sm" onClick={resetGame} className="mt-2">
              Play Again
            </Button>
          ) : (
            <p className="text-purple-400 text-sm mt-2">Come back tomorrow!</p>
          )}
        </div>
      )}
    </div>
  );
}

// Slot Machine Game
function SlotMachine({ onWin }: { onWin: (xp: number) => void }) {
  const SYMBOLS = ["🎮", "💎", "⚡", "🔥", "👑", "7️⃣"];
  const [reels, setReels] = useState(["❓", "❓", "❓"]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [dailySpins, setDailySpins] = useState(3);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const saved = localStorage.getItem("slotSpinsDate");
    const savedSpins = localStorage.getItem("slotSpinsRemaining");

    if (saved !== today) {
      localStorage.setItem("slotSpinsDate", today);
      localStorage.setItem("slotSpinsRemaining", "3");
      setDailySpins(3);
    } else {
      setDailySpins(parseInt(savedSpins || "0"));
    }
  }, []);

  const spin = () => {
    if (isSpinning || dailySpins <= 0) return;

    setIsSpinning(true);
    setResult(null);

    const newSpins = dailySpins - 1;
    setDailySpins(newSpins);
    localStorage.setItem("slotSpinsRemaining", newSpins.toString());

    let spinCount = 0;
    const spinInterval = setInterval(() => {
      setReels([
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ]);
      spinCount++;

      if (spinCount > 20) {
        clearInterval(spinInterval);

        const finalReels = [
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        ];
        setReels(finalReels);
        setIsSpinning(false);

        if (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) {
          const xp = finalReels[0] === "7️⃣" ? 100 : 50;
          setResult(`JACKPOT! +${xp} XP`);
          onWin(xp);
        } else if (finalReels[0] === finalReels[1] || finalReels[1] === finalReels[2]) {
          setResult("Two of a kind! +10 XP");
          onWin(10);
        } else {
          setResult("Try again!");
        }
      }
    }, 100);
  };

  return (
    <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl">Lucky Slots</h3>
        <span className="text-white/60 text-sm">{dailySpins} spins left today</span>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        {reels.map((symbol, i) => (
          <motion.div
            key={i}
            className="w-20 h-20 bg-[var(--color-dark-3)] rounded-lg flex items-center justify-center text-4xl"
            animate={isSpinning ? { y: [0, -10, 0] } : {}}
            transition={{ duration: 0.1, repeat: isSpinning ? Infinity : 0 }}
          >
            {symbol}
          </motion.div>
        ))}
      </div>

      {result && (
        <div
          className={`text-center mb-4 p-2 rounded ${
            result.includes("JACKPOT") ? "bg-amber-500/20 text-amber-400" : result.includes("Two") ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/60"
          }`}
        >
          {result}
        </div>
      )}

      <Button variant="primary" onClick={spin} disabled={isSpinning || dailySpins <= 0} className="w-full">
        {isSpinning ? "Spinning..." : dailySpins > 0 ? "SPIN!" : "Come back tomorrow!"}
      </Button>
    </div>
  );
}

// Trivia - condensed question set (subset for file size; full 200 in original)
const TRIVIA_SUBSET = [
  { question: "What does XP stand for?", options: ["Extra Points", "Experience Points", "Extreme Power", "eXtra Perks"], correct: 1 },
  { question: "How many days in a login streak cycle?", options: ["5", "7", "10", "14"], correct: 1 },
  { question: "Which VIP tier is the highest?", options: ["Bronze Tier", "Gold Tier", "Platinum Tier", "Diamond Tier"], correct: 2 },
  { question: "What code unlocks a secret easter egg?", options: ["UP UP DOWN DOWN", "LEFT LEFT RIGHT RIGHT", "A B A B", "1 2 3 4"], correct: 0 },
  { question: "Where can VIP badge holders access secret games?", options: ["Home page", "Hidden Arcade", "Store page", "Profile"], correct: 1 },
  { question: "What year was the first PlayStation released?", options: ["1992", "1994", "1996", "1998"], correct: 1 },
  { question: "Which company created the Mario character?", options: ["Sony", "Sega", "Nintendo", "Atari"], correct: 2 },
  { question: "What does CPU stand for?", options: ["Central Processing Unit", "Computer Personal Unit", "Core Power Unit", "Central Power Utility"], correct: 0 },
  { question: "What planet is known as the Red Planet?", options: ["Venus", "Jupiter", "Mars", "Saturn"], correct: 2 },
  { question: "What is the currency of South Africa?", options: ["Dollar", "Rand", "Pound", "Euro"], correct: 1 },
];

const QUESTIONS_PER_GAME = 5;
const MAX_TRIVIA_GAMES_PER_DAY = 3;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function TriviaGame({ onWin, onGameComplete }: { onWin: (xp: number) => void; onGameComplete?: () => void }) {
  const [questions, setQuestions] = useState<typeof TRIVIA_SUBSET>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [dailyGamesLeft, setDailyGamesLeft] = useState(MAX_TRIVIA_GAMES_PER_DAY);
  const [canPlay, setCanPlay] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const savedDate = localStorage.getItem("triviaGamesDate");
    const savedGames = localStorage.getItem("triviaGamesPlayed");

    let gamesPlayed = 0;
    if (savedDate === today) {
      gamesPlayed = parseInt(savedGames || "0");
    } else {
      localStorage.setItem("triviaGamesDate", today);
      localStorage.setItem("triviaGamesPlayed", "0");
    }

    const remaining = MAX_TRIVIA_GAMES_PER_DAY - gamesPlayed;
    setDailyGamesLeft(remaining);
    setCanPlay(remaining > 0);

    if (remaining > 0) {
      const randomQuestions = shuffleArray(TRIVIA_SUBSET).slice(0, QUESTIONS_PER_GAME);
      const questionsWithShuffledOptions = randomQuestions.map((q) => {
        const shuffledOptions = [...q.options];
        const correctAnswer = q.options[q.correct];
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
        }
        const newCorrect = shuffledOptions.indexOf(correctAnswer);
        return { ...q, options: shuffledOptions, correct: newCorrect };
      });
      setQuestions(questionsWithShuffledOptions);
    }
  }, []);

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null || questions.length === 0) return;

    setSelectedAnswer(index);
    setShowResult(true);

    const isCorrect = index === questions[currentQuestion].correct;
    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(newScore);

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((q) => q + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        setGameOver(true);
        const xpReward = newScore * 10;
        if (xpReward > 0) onWin(xpReward);

        const gamesPlayed = parseInt(localStorage.getItem("triviaGamesPlayed") || "0") + 1;
        localStorage.setItem("triviaGamesPlayed", gamesPlayed.toString());
        setDailyGamesLeft(MAX_TRIVIA_GAMES_PER_DAY - gamesPlayed);

        if (onGameComplete) onGameComplete();
      }
    }, 1500);
  };

  const resetGame = () => {
    const gamesPlayed = parseInt(localStorage.getItem("triviaGamesPlayed") || "0");
    const remaining = MAX_TRIVIA_GAMES_PER_DAY - gamesPlayed;

    if (remaining <= 0) {
      setCanPlay(false);
      return;
    }

    const randomQuestions = shuffleArray(TRIVIA_SUBSET).slice(0, QUESTIONS_PER_GAME);
    const questionsWithShuffledOptions = randomQuestions.map((q) => {
      const shuffledOptions = [...q.options];
      const correctAnswer = q.options[q.correct];
      for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
      }
      const newCorrect = shuffledOptions.indexOf(correctAnswer);
      return { ...q, options: shuffledOptions, correct: newCorrect };
    });
    setQuestions(questionsWithShuffledOptions);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameOver(false);
  };

  if (!canPlay) {
    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <h3 className="font-heading text-xl mb-4">Daily Limit Reached</h3>
        <p className="text-4xl mb-4">⏰</p>
        <p className="text-white/60 mb-4">You&apos;ve played all {MAX_TRIVIA_GAMES_PER_DAY} trivia games for today.</p>
        <p className="text-purple-400 text-sm">Come back tomorrow for more!</p>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <h3 className="font-heading text-xl mb-4">Game Over!</h3>
        <p className="text-4xl mb-4">{score === QUESTIONS_PER_GAME ? "🏆" : score >= 3 ? "⭐" : "📝"}</p>
        <p className="text-white/60 mb-4">You got {score}/{QUESTIONS_PER_GAME} correct!</p>
        <p className="text-[var(--color-main-1)] font-semibold mb-4">+{score * 10} XP earned!</p>
        <p className="text-white/40 text-sm mb-4">
          {dailyGamesLeft > 0 ? `${dailyGamesLeft} game${dailyGamesLeft !== 1 ? "s" : ""} left today` : "No games left today"}
        </p>
        {dailyGamesLeft > 0 ? (
          <Button variant="outline" onClick={resetGame}>
            Play Again
          </Button>
        ) : (
          <p className="text-purple-400 text-sm">Come back tomorrow!</p>
        )}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-main-1)] border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl">Darkpoint Trivia</h3>
        <div className="text-right">
          <span className="text-white/60 text-sm block">
            {currentQuestion + 1}/{QUESTIONS_PER_GAME}
          </span>
          <span className="text-white/40 text-xs">{dailyGamesLeft} game{dailyGamesLeft !== 1 ? "s" : ""} left today</span>
        </div>
      </div>

      <p className="text-lg mb-4">{question.question}</p>

      <div className="space-y-2">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            disabled={selectedAnswer !== null}
            className={`w-full p-3 rounded-lg text-left transition-colors ${
              showResult
                ? index === question.correct
                  ? "bg-green-500/20 border-2 border-green-500"
                  : selectedAnswer === index
                    ? "bg-red-500/20 border-2 border-red-500"
                    : "bg-[var(--color-dark-3)]"
                : "bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] cursor-pointer"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-white/60">
        <span>Score: {score}</span>
        <span>+10 XP per correct answer</span>
      </div>
    </div>
  );
}

// Reaction Test
const MAX_REACTION_GAMES_PER_DAY = 3;

function ReactionGame({ onWin, onGameComplete }: { onWin: (xp: number) => void; onGameComplete?: () => void }) {
  const [gameState, setGameState] = useState<"waiting" | "ready" | "go" | "result" | "too_early">("waiting");
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [dailyGamesLeft, setDailyGamesLeft] = useState(MAX_REACTION_GAMES_PER_DAY);
  const [canPlay, setCanPlay] = useState(true);
  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const savedDate = localStorage.getItem("reactionGamesDate");
    const savedGames = localStorage.getItem("reactionGamesPlayed");

    let gamesPlayed = 0;
    if (savedDate === today) {
      gamesPlayed = parseInt(savedGames || "0");
    } else {
      localStorage.setItem("reactionGamesDate", today);
      localStorage.setItem("reactionGamesPlayed", "0");
    }

    const remaining = MAX_REACTION_GAMES_PER_DAY - gamesPlayed;
    setDailyGamesLeft(remaining);
    setCanPlay(remaining > 0);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const startGame = () => {
    if (!canPlay) return;
    setGameState("ready");
    setReactionTime(null);

    const delay = 1000 + Math.random() * 3000;
    timeoutRef.current = setTimeout(() => {
      setGameState("go");
      startTimeRef.current = Date.now();
    }, delay);
  };

  const handleClick = () => {
    if (gameState === "ready") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setGameState("too_early");
    } else if (gameState === "go") {
      const time = Date.now() - startTimeRef.current;
      setReactionTime(time);
      setGameState("result");

      let xp = 10;
      if (time < 200) xp = 50;
      else if (time < 300) xp = 40;
      else if (time < 400) xp = 30;
      else if (time < 500) xp = 20;

      onWin(xp);

      const gamesPlayed = parseInt(localStorage.getItem("reactionGamesPlayed") || "0") + 1;
      localStorage.setItem("reactionGamesPlayed", gamesPlayed.toString());
      setDailyGamesLeft(MAX_REACTION_GAMES_PER_DAY - gamesPlayed);

      if (onGameComplete) onGameComplete();
    }
  };

  const resetGame = () => {
    const gamesPlayed = parseInt(localStorage.getItem("reactionGamesPlayed") || "0");
    const remaining = MAX_REACTION_GAMES_PER_DAY - gamesPlayed;
    if (remaining <= 0) {
      setCanPlay(false);
      return;
    }
    setGameState("waiting");
    setReactionTime(null);
  };

  if (!canPlay) {
    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <h3 className="font-heading text-xl mb-4">Daily Limit Reached</h3>
        <p className="text-4xl mb-4">⏰</p>
        <p className="text-white/60 mb-4">You&apos;ve played all {MAX_REACTION_GAMES_PER_DAY} reaction games for today.</p>
        <p className="text-purple-400 text-sm">Come back tomorrow for more!</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl">Reaction Test</h3>
        <span className="text-white/40 text-xs">{dailyGamesLeft} game{dailyGamesLeft !== 1 ? "s" : ""} left today</span>
      </div>

      <motion.button
        onClick={gameState === "waiting" ? startGame : handleClick}
        className={`w-full aspect-video rounded-xl flex items-center justify-center text-xl font-semibold transition-colors cursor-pointer ${
          gameState === "waiting" ? "bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)]" : gameState === "ready" ? "bg-red-500" : gameState === "go" ? "bg-green-500" : gameState === "too_early" ? "bg-orange-500" : "bg-[var(--color-main-1)]/20"
        }`}
        whileTap={{ scale: 0.98 }}
      >
        {gameState === "waiting" && "Click to Start"}
        {gameState === "ready" && "Wait for green..."}
        {gameState === "go" && "CLICK NOW!"}
        {gameState === "too_early" && "Too early! 😅"}
        {gameState === "result" && reactionTime && (
          <div className="text-center">
            <div className="text-3xl mb-2">{reactionTime}ms</div>
            <div className="text-sm opacity-80">
              {reactionTime < 200 ? "Lightning fast! ⚡" : reactionTime < 300 ? "Great reflexes! 🎯" : reactionTime < 400 ? "Nice! 👍" : reactionTime < 500 ? "Good try! 💪" : "Keep practicing! 🎮"}
            </div>
          </div>
        )}
      </motion.button>

      {(gameState === "result" || gameState === "too_early") && dailyGamesLeft > 0 && (
        <Button variant="outline" size="sm" onClick={resetGame} className="w-full mt-4">
          Play Again
        </Button>
      )}
    </div>
  );
}

// Whack-a-Mole
const MAX_WHACK_GAMES_PER_DAY = 3;
const WHACK_DURATION = 30000;
const MOLE_GRID = 9;

function WhackMoleGame({ onWin, onGameComplete }: { onWin: (xp: number) => void; onGameComplete?: () => void }) {
  const [score, setScore] = useState(0);
  const [activeMole, setActiveMole] = useState<number | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [dailyGamesLeft, setDailyGamesLeft] = useState(MAX_WHACK_GAMES_PER_DAY);
  const [canPlay, setCanPlay] = useState(true);
  const [gameComplete, setGameComplete] = useState(false);
  const moleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const savedDate = localStorage.getItem("whackGamesDate");
    const savedGames = localStorage.getItem("whackGamesPlayed");

    let gamesPlayed = 0;
    if (savedDate === today) {
      gamesPlayed = parseInt(savedGames || "0");
    } else {
      localStorage.setItem("whackGamesDate", today);
      localStorage.setItem("whackGamesPlayed", "0");
    }

    const remaining = MAX_WHACK_GAMES_PER_DAY - gamesPlayed;
    setDailyGamesLeft(remaining);
    setCanPlay(remaining > 0);

    return () => {
      if (moleTimeoutRef.current) clearTimeout(moleTimeoutRef.current);
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    };
  }, []);

  const showRandomMole = useCallback(() => {
    const randomHole = Math.floor(Math.random() * MOLE_GRID);
    setActiveMole(randomHole);
    moleTimeoutRef.current = setTimeout(() => setActiveMole(null), 600 + Math.random() * 400);
  }, []);

  const startGame = () => {
    if (!canPlay) return;
    setScore(0);
    setTimeLeft(30);
    setGameActive(true);
    setGameComplete(false);

    const moleInterval = setInterval(showRandomMole, 800);
    moleTimeoutRef.current = moleInterval as unknown as ReturnType<typeof setTimeout>;

    gameIntervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(gameIntervalRef.current!);
          clearInterval(moleTimeoutRef.current as unknown as ReturnType<typeof setInterval>);
          setGameActive(false);
          setActiveMole(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    setTimeout(() => {
      setGameActive(false);
      setGameComplete(true);
    }, WHACK_DURATION);
  };

  useEffect(() => {
    if (gameComplete && !gameActive) {
      const xp = Math.min(score * 5, 50);
      if (xp > 0) onWin(xp);
      const gamesPlayed = parseInt(localStorage.getItem("whackGamesPlayed") || "0") + 1;
      localStorage.setItem("whackGamesPlayed", gamesPlayed.toString());
      setDailyGamesLeft(MAX_WHACK_GAMES_PER_DAY - gamesPlayed);
      if (onGameComplete) onGameComplete();
    }
  }, [gameComplete, gameActive, score, onWin, onGameComplete]);

  const whackMole = (index: number) => {
    if (index === activeMole && gameActive) {
      setScore((s) => s + 1);
      setActiveMole(null);
    }
  };

  if (!canPlay) {
    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <h3 className="font-heading text-xl mb-4">Daily Limit Reached</h3>
        <p className="text-4xl mb-4">⏰</p>
        <p className="text-white/60 mb-4">You&apos;ve played all {MAX_WHACK_GAMES_PER_DAY} whack games for today.</p>
        <p className="text-purple-400 text-sm">Come back tomorrow for more!</p>
      </div>
    );
  }

  if (gameComplete && !gameActive) {
    const xpEarned = Math.min(score * 5, 50);
    const gamesPlayed = parseInt(localStorage.getItem("whackGamesPlayed") || "0");
    const remaining = MAX_WHACK_GAMES_PER_DAY - gamesPlayed;

    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <h3 className="font-heading text-xl mb-4">Game Over!</h3>
        <p className="text-4xl mb-4">{score >= 8 ? "🏆" : score >= 5 ? "⭐" : "🔨"}</p>
        <p className="text-white/60 mb-2">You whacked {score} moles!</p>
        <p className="text-[var(--color-main-1)] font-semibold mb-4">+{xpEarned} XP earned!</p>
        {remaining > 0 ? (
          <Button variant="outline" onClick={() => { setGameComplete(false); startGame(); }}>
            Play Again ({remaining} left)
          </Button>
        ) : (
          <p className="text-purple-400 text-sm">Come back tomorrow!</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl">Whack-a-Mole</h3>
        <div className="text-right">
          <span className="text-white/60 text-sm block">Score: {score}</span>
          {gameActive && <span className="text-white/40 text-xs">{timeLeft}s left</span>}
        </div>
      </div>

      {!gameActive ? (
        <Button variant="primary" onClick={startGame} className="w-full mb-4">
          Start Game
        </Button>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: MOLE_GRID }).map((_, i) => (
          <motion.button
            key={i}
            onClick={() => whackMole(i)}
            className={`aspect-square rounded-lg flex items-center justify-center text-3xl transition-colors cursor-pointer ${activeMole === i ? "bg-amber-500" : "bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)]"}`}
            whileTap={{ scale: 0.9 }}
            animate={activeMole === i ? { y: [10, 0] } : {}}
          >
            {activeMole === i ? "🐹" : "🕳️"}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// Word Scramble
const WORD_LIST = ["ARCADE", "GAMING", "PLAYER", "REWARD", "POINTS", "STREAK", "LEVEL", "BADGE", "QUEST", "BONUS", "PRIZE", "SCORE", "WINNER", "CHAMP", "POWER", "BOOST", "COINS", "STARS", "GEMS", "GOLD", "SPIN", "LUCKY", "MEGA", "ULTRA", "SUPER", "EPIC", "RARE", "FIRE", "CROWN", "ROYAL", "ELITE", "MASTER"];
const MAX_WORD_GAMES_PER_DAY = 3;
const WORDS_PER_GAME = 5;
const WORD_TIME_LIMIT = 60;

function WordScrambleGame({ onWin, onGameComplete }: { onWin: (xp: number) => void; onGameComplete?: () => void }) {
  const [currentWord, setCurrentWord] = useState("");
  const [scrambledWord, setScrambledWord] = useState("");
  const [userInput, setUserInput] = useState("");
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(WORD_TIME_LIMIT);
  const [gameActive, setGameActive] = useState(false);
  const [dailyGamesLeft, setDailyGamesLeft] = useState(MAX_WORD_GAMES_PER_DAY);
  const [canPlay, setCanPlay] = useState(true);
  const [gameComplete, setGameComplete] = useState(false);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const savedDate = localStorage.getItem("wordGamesDate");
    const savedGames = localStorage.getItem("wordGamesPlayed");

    let gamesPlayed = 0;
    if (savedDate === today) {
      gamesPlayed = parseInt(savedGames || "0");
    } else {
      localStorage.setItem("wordGamesDate", today);
      localStorage.setItem("wordGamesPlayed", "0");
    }

    const remaining = MAX_WORD_GAMES_PER_DAY - gamesPlayed;
    setDailyGamesLeft(remaining);
    setCanPlay(remaining > 0);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const scrambleWord = (word: string): string => {
    const arr = word.split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join("") === word ? scrambleWord(word) : arr.join("");
  };

  const getNextWord = useCallback(() => {
    const available = WORD_LIST.filter((w) => !usedWords.includes(w));
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }, [usedWords]);

  const startGame = () => {
    if (!canPlay) return;
    setScore(0);
    setWordsCompleted(0);
    setTimeLeft(WORD_TIME_LIMIT);
    setGameActive(true);
    setGameComplete(false);
    setUsedWords([]);
    setUserInput("");

    const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    setCurrentWord(word);
    setScrambledWord(scrambleWord(word));
    setUsedWords([word]);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setGameActive(false);
          setGameComplete(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.toUpperCase() === currentWord) {
      const newScore = score + 1;
      setScore(newScore);
      setWordsCompleted((w) => w + 1);
      setUserInput("");

      if (newScore >= WORDS_PER_GAME) {
        if (timerRef.current) clearInterval(timerRef.current);
        setGameActive(false);
        setGameComplete(true);
      } else {
        const nextWord = getNextWord();
        if (nextWord) {
          setCurrentWord(nextWord);
          setScrambledWord(scrambleWord(nextWord));
          setUsedWords((prev) => [...prev, nextWord]);
        }
      }
    }
  };

  useEffect(() => {
    if (gameComplete) {
      const xp = Math.min(score * 10, 50);
      if (xp > 0) onWin(xp);
      const gamesPlayed = parseInt(localStorage.getItem("wordGamesPlayed") || "0") + 1;
      localStorage.setItem("wordGamesPlayed", gamesPlayed.toString());
      setDailyGamesLeft(MAX_WORD_GAMES_PER_DAY - gamesPlayed);
      if (onGameComplete) onGameComplete();
    }
  }, [gameComplete, score, onWin, onGameComplete]);

  if (!canPlay) {
    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <h3 className="font-heading text-xl mb-4">Daily Limit Reached</h3>
        <p className="text-4xl mb-4">⏰</p>
        <p className="text-white/60 mb-4">You&apos;ve played all {MAX_WORD_GAMES_PER_DAY} word games for today.</p>
        <p className="text-purple-400 text-sm">Come back tomorrow for more!</p>
      </div>
    );
  }

  if (gameComplete) {
    const xpEarned = Math.min(score * 10, 50);
    const gamesPlayed = parseInt(localStorage.getItem("wordGamesPlayed") || "0");
    const remaining = MAX_WORD_GAMES_PER_DAY - gamesPlayed;

    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <h3 className="font-heading text-xl mb-4">Game Over!</h3>
        <p className="text-4xl mb-4">{score >= 5 ? "🏆" : score >= 3 ? "⭐" : "🔤"}</p>
        <p className="text-white/60 mb-2">You unscrambled {score}/{WORDS_PER_GAME} words!</p>
        <p className="text-[var(--color-main-1)] font-semibold mb-4">+{xpEarned} XP earned!</p>
        {remaining > 0 ? (
          <Button variant="outline" onClick={startGame}>
            Play Again ({remaining} left)
          </Button>
        ) : (
          <p className="text-purple-400 text-sm">Come back tomorrow!</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl">Word Scramble</h3>
        <div className="text-right">
          <span className="text-white/60 text-sm block">{wordsCompleted}/{WORDS_PER_GAME}</span>
          {gameActive && <span className="text-white/40 text-xs">{timeLeft}s left</span>}
        </div>
      </div>

      {!gameActive ? (
        <Button variant="primary" onClick={startGame} className="w-full">
          Start Game
        </Button>
      ) : (
        <>
          <div className="text-center mb-4">
            <p className="text-3xl font-mono tracking-widest text-[var(--color-main-1)]">{scrambledWord}</p>
          </div>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value.toUpperCase())}
              className="w-full p-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg text-center font-mono text-xl tracking-widest focus:outline-none focus:border-[var(--color-main-1)]"
              placeholder="Type the word..."
              autoFocus
            />
            <Button variant="primary" type="submit" className="w-full mt-3">
              Submit
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

// Pattern Match - simplified
const MAX_PATTERN_GAMES_PER_DAY = 3;
const PATTERNS_PER_GAME = 5;
const SHAPES = ["●", "■", "▲", "◆", "★"];

function PatternMatchGame({ onWin, onGameComplete }: { onWin: (xp: number) => void; onGameComplete?: () => void }) {
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [sequence, setSequence] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dailyGamesLeft, setDailyGamesLeft] = useState(MAX_PATTERN_GAMES_PER_DAY);
  const [canPlay, setCanPlay] = useState(true);
  const [gameComplete, setGameComplete] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const savedDate = localStorage.getItem("patternGamesDate");
    const savedGames = localStorage.getItem("patternGamesPlayed");
    let gamesPlayed = 0;
    if (savedDate === today) gamesPlayed = parseInt(savedGames || "0");
    else {
      localStorage.setItem("patternGamesDate", today);
      localStorage.setItem("patternGamesPlayed", "0");
    }
    const remaining = MAX_PATTERN_GAMES_PER_DAY - gamesPlayed;
    setDailyGamesLeft(remaining);
    setCanPlay(remaining > 0);
  }, []);

  const nextRound = useCallback(() => {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const seq = Array.from({ length: 4 }, () => SHAPES[Math.floor(Math.random() * SHAPES.length)]);
    seq.push(shape);
    const opts = [shape, ...SHAPES.filter((s) => s !== shape).slice(0, 3)].sort(() => Math.random() - 0.5);
    setSequence(seq.slice(0, 4));
    setAnswer(shape);
    setOptions(opts);
    setSelected(null);
  }, []);

  const startGame = () => {
    if (!canPlay) return;
    setScore(0);
    setRound(0);
    setGameComplete(false);
    nextRound();
  };

  const handleAnswer = (opt: string) => {
    if (selected || !answer) return;
    setSelected(opt);
    const correct = opt === answer;
    const newScore = score + (correct ? 1 : 0);
    if (correct) setScore(newScore);
    const newRound = round + 1;
    setRound(newRound);
    if (newRound >= PATTERNS_PER_GAME) {
      setScore(newScore);
      setGameComplete(true);
      const xp = Math.min(newScore * 10, 50);
      if (xp > 0) onWin(xp);
      const gamesPlayed = parseInt(localStorage.getItem("patternGamesPlayed") || "0") + 1;
      localStorage.setItem("patternGamesPlayed", gamesPlayed.toString());
      setDailyGamesLeft(MAX_PATTERN_GAMES_PER_DAY - gamesPlayed);
      if (onGameComplete) onGameComplete();
    } else {
      setScore(newScore);
      setTimeout(nextRound, 800);
    }
  };

  if (!canPlay) {
    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <h3 className="font-heading text-xl mb-4">Daily Limit Reached</h3>
        <p className="text-4xl mb-4">⏰</p>
        <p className="text-white/60 mb-4">You&apos;ve played all {MAX_PATTERN_GAMES_PER_DAY} pattern games for today.</p>
        <p className="text-purple-400 text-sm">Come back tomorrow for more!</p>
      </div>
    );
  }

  if (gameComplete) {
    const xpEarned = Math.min(score * 10, 50);
    const gamesPlayed = parseInt(localStorage.getItem("patternGamesPlayed") || "0");
    const remaining = MAX_PATTERN_GAMES_PER_DAY - gamesPlayed;
    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <h3 className="font-heading text-xl mb-4">Game Over!</h3>
        <p className="text-4xl mb-4">{score >= 5 ? "🏆" : score >= 3 ? "⭐" : "🔢"}</p>
        <p className="text-white/60 mb-2">You got {score}/{PATTERNS_PER_GAME} patterns correct!</p>
        <p className="text-[var(--color-main-1)] font-semibold mb-4">+{xpEarned} XP earned!</p>
        {remaining > 0 ? (
          <Button variant="outline" onClick={startGame}>
            Play Again ({remaining} left)
          </Button>
        ) : (
          <p className="text-purple-400 text-sm">Come back tomorrow!</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl">Pattern Match</h3>
        <span className="text-white/60 text-sm">{round}/{PATTERNS_PER_GAME}</span>
      </div>
      {sequence.length ? (
        <>
          <div className="text-center mb-4">
            <p className="text-2xl font-mono tracking-widest">
              {sequence.join(" → ")} → <span className="text-[var(--color-main-1)]">?</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                disabled={!!selected}
                className={`p-4 rounded-lg text-xl font-semibold transition-colors cursor-pointer ${
                  selected ? (opt === answer ? "bg-green-500/20 border-2 border-green-500" : selected === opt ? "bg-red-500/20 border-2 border-red-500" : "bg-[var(--color-dark-3)]") : "bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      ) : (
        <Button variant="primary" onClick={startGame} className="w-full">
          Start Game
        </Button>
      )}
    </div>
  );
}

// Simon Says
const MAX_SIMON_GAMES_PER_DAY = 3;
const SIMON_COLORS = ["red", "blue", "green", "yellow"];

function SimonSaysGame({ onWin, onGameComplete }: { onWin: (xp: number) => void; onGameComplete?: () => void }) {
  const [sequence, setSequence] = useState<string[]>([]);
  const [playerSequence, setPlayerSequence] = useState<string[]>([]);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [dailyGamesLeft, setDailyGamesLeft] = useState(MAX_SIMON_GAMES_PER_DAY);
  const [canPlay, setCanPlay] = useState(true);
  const [gameComplete, setGameComplete] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const savedDate = localStorage.getItem("simonGamesDate");
    const savedGames = localStorage.getItem("simonGamesPlayed");
    let gamesPlayed = 0;
    if (savedDate === today) gamesPlayed = parseInt(savedGames || "0");
    else {
      localStorage.setItem("simonGamesDate", today);
      localStorage.setItem("simonGamesPlayed", "0");
    }
    setDailyGamesLeft(MAX_SIMON_GAMES_PER_DAY - gamesPlayed);
    setCanPlay(MAX_SIMON_GAMES_PER_DAY - gamesPlayed > 0);
  }, []);

  const showSequence = useCallback(async (seq: string[]) => {
    setIsShowingSequence(true);
    for (const color of seq) {
      setActiveColor(color);
      await new Promise((r) => setTimeout(r, 500));
      setActiveColor(null);
      await new Promise((r) => setTimeout(r, 200));
    }
    setIsShowingSequence(false);
  }, []);

  const startGame = useCallback(() => {
    if (!canPlay) return;
    setRound(1);
    setGameActive(true);
    setGameComplete(false);
    setIsGameOver(false);
    setPlayerSequence([]);
    const firstColor = SIMON_COLORS[Math.floor(Math.random() * SIMON_COLORS.length)];
    setSequence([firstColor]);
    setTimeout(() => showSequence([firstColor]), 500);
  }, [canPlay, showSequence]);

  const handleColorClick = (color: string) => {
    if (isShowingSequence || !gameActive) return;
    const newPlayerSequence = [...playerSequence, color];
    setPlayerSequence(newPlayerSequence);
    setActiveColor(color);
    setTimeout(() => setActiveColor(null), 200);

    const currentIndex = newPlayerSequence.length - 1;
    if (newPlayerSequence[currentIndex] !== sequence[currentIndex]) {
      setGameActive(false);
      setIsGameOver(true);
      setGameComplete(true);
      const xp = Math.min(round * 5, 50);
      if (xp > 0) onWin(xp);
      const gamesPlayed = parseInt(localStorage.getItem("simonGamesPlayed") || "0") + 1;
      localStorage.setItem("simonGamesPlayed", gamesPlayed.toString());
      setDailyGamesLeft(MAX_SIMON_GAMES_PER_DAY - gamesPlayed);
      if (onGameComplete) onGameComplete();
      return;
    }

    if (newPlayerSequence.length === sequence.length) {
      const newRound = round + 1;
      setRound(newRound);
      setPlayerSequence([]);
      const nextColor = SIMON_COLORS[Math.floor(Math.random() * SIMON_COLORS.length)];
      const newSequence = [...sequence, nextColor];
      setSequence(newSequence);
      setTimeout(() => showSequence(newSequence), 1000);
    }
  };

  const getColorClasses = (color: string, isActive: boolean) => {
    const base = "aspect-square rounded-xl transition-all cursor-pointer ";
    const activeClass = isActive ? "scale-95 brightness-150" : "";
    switch (color) {
      case "red": return base + `bg-red-500 hover:bg-red-400 ${activeClass}`;
      case "blue": return base + `bg-blue-500 hover:bg-blue-400 ${activeClass}`;
      case "green": return base + `bg-green-500 hover:bg-green-400 ${activeClass}`;
      case "yellow": return base + `bg-yellow-500 hover:bg-yellow-400 ${activeClass}`;
      default: return base;
    }
  };

  if (!canPlay) {
    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <h3 className="font-heading text-xl mb-4">Daily Limit Reached</h3>
        <p className="text-4xl mb-4">⏰</p>
        <p className="text-white/60 mb-4">You&apos;ve played all {MAX_SIMON_GAMES_PER_DAY} Simon games for today.</p>
        <p className="text-purple-400 text-sm">Come back tomorrow for more!</p>
      </div>
    );
  }

  if (gameComplete && isGameOver) {
    const xpEarned = Math.min(round * 5, 50);
    const gamesPlayed = parseInt(localStorage.getItem("simonGamesPlayed") || "0");
    const remaining = MAX_SIMON_GAMES_PER_DAY - gamesPlayed;
    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <h3 className="font-heading text-xl mb-4">Game Over!</h3>
        <p className="text-4xl mb-4">{round >= 8 ? "🏆" : round >= 5 ? "⭐" : "🎵"}</p>
        <p className="text-white/60 mb-2">You reached round {round}!</p>
        <p className="text-[var(--color-main-1)] font-semibold mb-4">+{xpEarned} XP earned!</p>
        {remaining > 0 ? (
          <Button variant="outline" onClick={startGame}>
            Play Again ({remaining} left)
          </Button>
        ) : (
          <p className="text-purple-400 text-sm">Come back tomorrow!</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl">Simon Says</h3>
        {gameActive && <span className="text-white/60 text-sm">Round {round}</span>}
      </div>
      {!gameActive ? (
        <Button variant="primary" onClick={startGame} className="w-full">
          Start Game
        </Button>
      ) : (
        <>
          <p className="text-center text-white/60 mb-4">{isShowingSequence ? "Watch the sequence..." : "Your turn!"}</p>
          <div className="grid grid-cols-2 gap-3">
            {SIMON_COLORS.map((color) => (
              <button key={color} onClick={() => handleColorClick(color)} disabled={isShowingSequence} className={getColorClasses(color, activeColor === color)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Coin Flip Streak
const MAX_COINFLIP_GAMES_PER_DAY = 3;
const COINFLIP_ROUNDS = 10;

function CoinFlipGame({ onWin, onGameComplete }: { onWin: (xp: number) => void; onGameComplete?: () => void }) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<"heads" | "tails" | null>(null);
  const [prediction, setPrediction] = useState<"heads" | "tails" | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [round, setRound] = useState(0);
  const [dailyGamesLeft, setDailyGamesLeft] = useState(MAX_COINFLIP_GAMES_PER_DAY);
  const [canPlay, setCanPlay] = useState(true);
  const [gameComplete, setGameComplete] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const savedDate = localStorage.getItem("coinflipGamesDate");
    const savedGames = localStorage.getItem("coinflipGamesPlayed");
    let gamesPlayed = 0;
    if (savedDate === today) gamesPlayed = parseInt(savedGames || "0");
    else {
      localStorage.setItem("coinflipGamesDate", today);
      localStorage.setItem("coinflipGamesPlayed", "0");
    }
    setDailyGamesLeft(MAX_COINFLIP_GAMES_PER_DAY - gamesPlayed);
    setCanPlay(MAX_COINFLIP_GAMES_PER_DAY - gamesPlayed > 0);
  }, []);

  const flipCoin = (guess: "heads" | "tails") => {
    if (isFlipping) return;
    setPrediction(guess);
    setIsFlipping(true);
    setResult(null);

    setTimeout(() => {
      const coinResult: "heads" | "tails" = Math.random() > 0.5 ? "heads" : "tails";
      setResult(coinResult);
      setIsFlipping(false);

      const newRound = round + 1;
      setRound(newRound);

      if (coinResult === guess) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > bestStreak) setBestStreak(newStreak);
      } else {
        setStreak(0);
      }

      if (newRound >= COINFLIP_ROUNDS) {
        setGameComplete(true);
        const finalBest = Math.max(bestStreak, coinResult === guess ? streak + 1 : bestStreak);
        const xp = Math.min(finalBest * 10, 50);
        if (xp > 0) onWin(xp);
        const gamesPlayed = parseInt(localStorage.getItem("coinflipGamesPlayed") || "0") + 1;
        localStorage.setItem("coinflipGamesPlayed", gamesPlayed.toString());
        setDailyGamesLeft(MAX_COINFLIP_GAMES_PER_DAY - gamesPlayed);
        if (onGameComplete) onGameComplete();
      }
    }, 1000);
  };

  const resetGame = () => {
    setStreak(0);
    setBestStreak(0);
    setRound(0);
    setResult(null);
    setPrediction(null);
    setGameComplete(false);
  };

  if (!canPlay) {
    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <h3 className="font-heading text-xl mb-4">Daily Limit Reached</h3>
        <p className="text-4xl mb-4">⏰</p>
        <p className="text-white/60 mb-4">You&apos;ve played all {MAX_COINFLIP_GAMES_PER_DAY} coin games for today.</p>
        <p className="text-purple-400 text-sm">Come back tomorrow for more!</p>
      </div>
    );
  }

  if (gameComplete) {
    const xpEarned = Math.min(bestStreak * 10, 50);
    const gamesPlayed = parseInt(localStorage.getItem("coinflipGamesPlayed") || "0");
    const remaining = MAX_COINFLIP_GAMES_PER_DAY - gamesPlayed;
    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <h3 className="font-heading text-xl mb-4">Game Over!</h3>
        <p className="text-4xl mb-4">{bestStreak >= 5 ? "🏆" : bestStreak >= 3 ? "⭐" : "🪙"}</p>
        <p className="text-white/60 mb-2">Best streak: {bestStreak} in a row!</p>
        <p className="text-[var(--color-main-1)] font-semibold mb-4">+{xpEarned} XP earned!</p>
        {remaining > 0 ? (
          <Button variant="outline" onClick={resetGame}>
            Play Again ({remaining} left)
          </Button>
        ) : (
          <p className="text-purple-400 text-sm">Come back tomorrow!</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl">Coin Flip Streak</h3>
        <div className="text-right">
          <span className="text-white/60 text-sm block">Round {round}/{COINFLIP_ROUNDS}</span>
          <span className="text-white/40 text-xs">Streak: {streak} | Best: {bestStreak}</span>
        </div>
      </div>

      <div className="text-center mb-6">
        <motion.div className="text-7xl mx-auto w-24 h-24 flex items-center justify-center" animate={isFlipping ? { rotateY: [0, 1800] } : {}} transition={{ duration: 1, ease: "easeOut" }}>
          {result ? (result === "heads" ? "😀" : "🔴") : "🪙"}
        </motion.div>
        {result && (
          <p className={`mt-2 font-semibold ${result === prediction ? "text-green-400" : "text-red-400"}`}>
            {result.toUpperCase()}! {result === prediction ? "Correct! ✓" : "Wrong!"}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => flipCoin("heads")} disabled={isFlipping} className="py-4">
          😀 Heads
        </Button>
        <Button variant="outline" onClick={() => flipCoin("tails")} disabled={isFlipping} className="py-4">
          🔴 Tails
        </Button>
      </div>
    </div>
  );
}

// Main VIP Arcade Page
export function VIPArcadePageClient() {
  const router = useRouter();
  const { isAuthenticated, isInitialized: authInitialized } = useAuthStore();
  const { hasAnyBadge, addXP, addNotification, isInitialized: gamificationInitialized, userBadges } = useGamificationStore();
  const { playEasterEgg } = useBadgeSound();

  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [totalXPEarned, setTotalXPEarned] = useState(0);
  const [accessChecked, setAccessChecked] = useState(false);

  const fullyInitialized = authInitialized && gamificationInitialized;
  const userVIPTier = getHighestVIPTier(userBadges.map((b) => b.badge_id));
  const availableGames = getAvailableGames(userVIPTier);

  useEffect(() => {
    if (!fullyInitialized) return;
    if (accessChecked) return;
    setAccessChecked(true);

    if (!isAuthenticated || !hasAnyBadge()) {
      router.replace("/404");
    } else {
      playEasterEgg();
    }
  }, [fullyInitialized, accessChecked, isAuthenticated, hasAnyBadge, router, playEasterEgg]);

  const handleWin = useCallback(
    (xp: number) => {
      addXP(xp, "bonus", "Arcade game reward");
      setTotalXPEarned((prev) => prev + xp);
      addNotification({
        type: "reward",
        title: "🎮 Arcade Win!",
        message: `You earned ${xp} XP!`,
        xpAmount: xp,
      });
    },
    [addXP, addNotification]
  );

  if (!fullyInitialized || !accessChecked || !isAuthenticated || !hasAnyBadge()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-main-1)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-[var(--color-dark-1)] to-[var(--color-dark-1)]" />
        <motion.div
          className="absolute top-1/3 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, delay: 2 }}
        />
      </div>

      <div className="container py-12">
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full mb-6">
            <span className="text-purple-400 text-sm font-semibold tracking-wider">🕹️ SECRET ARCADE 🕹️</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-heading uppercase tracking-wider mb-4">
            <span className="text-purple-400">Hidden</span> Arcade
          </h1>

          <p className="text-white/60 max-w-xl mx-auto">
            Welcome to the secret arcade! Play mini-games to earn bonus XP. Only VIP badge holders know this place exists.
          </p>

          {totalXPEarned > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 inline-block px-4 py-2 bg-[var(--color-main-1)]/20 rounded-full">
              <span className="text-[var(--color-main-1)] font-semibold">Session XP: +{totalXPEarned}</span>
            </motion.div>
          )}
        </motion.div>

        {userVIPTier && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center gap-4 mb-8 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full">
              <span>🔥</span>
              <span className="text-sm text-orange-400">Bronze</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
              <span>👑</span>
              <span className="text-sm text-yellow-400">Gold</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-400/10 border border-amber-400/30 rounded-full">
              <span>✨</span>
              <span className="text-sm text-amber-300">Platinum</span>
            </div>
          </motion.div>
        )}

        {!selectedGame ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {ALL_GAMES.map((game) => {
              const isLocked = !availableGames.includes(game.id);
              const requiredTier = game.requiredTier;
              const tierConfig = VIP_TIERS[requiredTier];

              return (
                <motion.button
                  key={game.id}
                  whileHover={!isLocked ? { scale: 1.03 } : {}}
                  whileTap={!isLocked ? { scale: 0.98 } : {}}
                  onClick={() => !isLocked && setSelectedGame(game.id)}
                  className={`relative bg-[var(--color-dark-2)] border p-6 rounded-xl text-center transition-colors ${
                    isLocked ? "border-[var(--color-dark-3)] opacity-60 cursor-not-allowed" : "border-[var(--color-dark-3)] hover:border-purple-500/50 cursor-pointer"
                  }`}
                >
                  <div
                    className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      requiredTier === "platinum" ? "bg-amber-400/20 text-amber-300" : requiredTier === "gold" ? "bg-yellow-500/20 text-yellow-400" : "bg-orange-500/20 text-orange-400"
                    }`}
                  >
                    {tierConfig.icon}
                  </div>

                  {isLocked && (
                    <div className="absolute inset-0 bg-[var(--color-dark-1)]/80 rounded-xl flex flex-col items-center justify-center z-10">
                      <span className="text-3xl mb-2">🔒</span>
                      <span className="text-sm text-white/60">Requires {tierConfig.name}</span>
                      <span className="text-xs text-white/40 mt-1">Upgrade in Rewards Shop</span>
                    </div>
                  )}

                  <div className="text-5xl mb-4">{game.icon}</div>
                  <h3 className="font-heading text-xl mb-2">{game.name}</h3>
                  <p className="text-sm text-white/60">{game.description}</p>
                  <div className="mt-2 text-xs text-white/40">{game.dailyPlays} plays per day</div>
                  <div className="mt-2 text-xs text-purple-400">Up to {game.maxXP} XP</div>
                </motion.button>
              );
            })}
          </motion.div>
        ) : (
          <div className="max-w-md mx-auto">
            <button onClick={() => setSelectedGame(null)} className="mb-4 text-white/60 hover:text-white transition-colors flex items-center gap-2 cursor-pointer">
              ← Back to Games
            </button>

            <AnimatePresence mode="wait">
              <motion.div key={selectedGame} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                {selectedGame === "memory" && <MemoryGame onWin={handleWin} />}
                {selectedGame === "slots" && <SlotMachine onWin={handleWin} />}
                {selectedGame === "trivia" && <TriviaGame onWin={handleWin} />}
                {selectedGame === "reaction" && <ReactionGame onWin={handleWin} />}
                {selectedGame === "whack" && <WhackMoleGame onWin={handleWin} />}
                {selectedGame === "word" && <WordScrambleGame onWin={handleWin} />}
                {selectedGame === "pattern" && <PatternMatchGame onWin={handleWin} />}
                {selectedGame === "simon" && <SimonSaysGame onWin={handleWin} />}
                {selectedGame === "coinflip" && <CoinFlipGame onWin={handleWin} />}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        <div className="text-center mt-12">
          <Link href="/vip" className="text-purple-400 hover:underline text-sm">
            ← Back to VIP Lounge
          </Link>
        </div>
      </div>
    </div>
  );
}

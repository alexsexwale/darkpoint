"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ParticleEmitter } from "@/components/effects";
import { useGamificationStore, useAuthStore } from "@/stores";
import { useBadgeSound } from "@/hooks";

// Memory Match Game
interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const MEMORY_EMOJIS = ["🎮", "🕹️", "💎", "⚡", "🔥", "👑", "🏆", "✨"];

function MemoryGame({ onWin }: { onWin: (xp: number) => void }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  // Initialize game
  useEffect(() => {
    const shuffled = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffled);
  }, []);

  const handleCardClick = (id: number) => {
    if (isLocked || cards[id].isFlipped || cards[id].isMatched) return;

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
        // Match!
        setTimeout(() => {
          const matched = [...cards];
          matched[first].isMatched = true;
          matched[second].isMatched = true;
          setCards(matched);
          setFlippedCards([]);
          setIsLocked(false);

          // Check win
          if (matched.every((c) => c.isMatched)) {
            setGameComplete(true);
            const xpReward = Math.max(50 - moves * 2, 10); // Less moves = more XP
            onWin(xpReward);
          }
        }, 500);
      } else {
        // No match
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
    const shuffled = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setIsLocked(false);
    setGameComplete(false);
  };

  return (
    <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl">Memory Match</h3>
        <span className="text-white/60 text-sm">Moves: {moves}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {cards.map((card) => (
          <motion.button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            className={`aspect-square rounded-lg text-2xl flex items-center justify-center cursor-pointer transition-colors ${
              card.isFlipped || card.isMatched
                ? "bg-[var(--color-main-1)]/20 border-2 border-[var(--color-main-1)]"
                : "bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)]"
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
          <Button variant="outline" size="sm" onClick={resetGame} className="mt-2">
            Play Again
          </Button>
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

  // Check daily spins from localStorage
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

    // Decrement spins
    const newSpins = dailySpins - 1;
    setDailySpins(newSpins);
    localStorage.setItem("slotSpinsRemaining", newSpins.toString());

    // Animate reels
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
        
        // Final result
        const finalReels = [
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        ];
        setReels(finalReels);
        setIsSpinning(false);

        // Check win
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
        <div className={`text-center mb-4 p-2 rounded ${
          result.includes("JACKPOT") ? "bg-amber-500/20 text-amber-400" :
          result.includes("Two") ? "bg-green-500/20 text-green-400" :
          "bg-white/10 text-white/60"
        }`}>
          {result}
        </div>
      )}

      <Button
        variant="primary"
        onClick={spin}
        disabled={isSpinning || dailySpins <= 0}
        className="w-full"
      >
        {isSpinning ? "Spinning..." : dailySpins > 0 ? "SPIN!" : "Come back tomorrow!"}
      </Button>
    </div>
  );
}

// Trivia Game
const TRIVIA_QUESTIONS = [
  {
    question: "What does XP stand for?",
    options: ["Extra Points", "Experience Points", "Extreme Power", "eXtra Perks"],
    correct: 1,
  },
  {
    question: "How many days in a login streak cycle?",
    options: ["5", "7", "10", "14"],
    correct: 1,
  },
  {
    question: "What do you get for reaching Level 10?",
    options: ["Free shipping", "Special badge", "Bonus XP", "All of the above"],
    correct: 3,
  },
  {
    question: "Which badge is the rarest?",
    options: ["Fire Badge", "Crown Badge", "Gold Frame", "All equal"],
    correct: 2,
  },
  {
    question: "What code unlocks a secret easter egg?",
    options: ["UP UP DOWN DOWN", "LEFT LEFT RIGHT RIGHT", "A B A B", "1 2 3 4"],
    correct: 0,
  },
];

function TriviaGame({ onWin }: { onWin: (xp: number) => void }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(index);
    setShowResult(true);

    if (index === TRIVIA_QUESTIONS[currentQuestion].correct) {
      setScore((s) => s + 1);
    }

    setTimeout(() => {
      if (currentQuestion < TRIVIA_QUESTIONS.length - 1) {
        setCurrentQuestion((q) => q + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        setGameOver(true);
        const xpReward = score * 10 + (index === TRIVIA_QUESTIONS[currentQuestion].correct ? 10 : 0);
        if (xpReward > 0) onWin(xpReward);
      }
    }, 1500);
  };

  const resetGame = () => {
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameOver(false);
  };

  if (gameOver) {
    const finalScore = score + (selectedAnswer === TRIVIA_QUESTIONS[TRIVIA_QUESTIONS.length - 1].correct ? 1 : 0);
    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <h3 className="font-heading text-xl mb-4">Game Over!</h3>
        <p className="text-4xl mb-4">
          {finalScore === TRIVIA_QUESTIONS.length ? "🏆" : finalScore >= 3 ? "⭐" : "📝"}
        </p>
        <p className="text-white/60 mb-4">
          You got {finalScore}/{TRIVIA_QUESTIONS.length} correct!
        </p>
        <p className="text-[var(--color-main-1)] font-semibold mb-4">
          +{finalScore * 10} XP earned!
        </p>
        <Button variant="outline" onClick={resetGame}>
          Play Again
        </Button>
      </div>
    );
  }

  const question = TRIVIA_QUESTIONS[currentQuestion];

  return (
    <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl">Dark Point Trivia</h3>
        <span className="text-white/60 text-sm">
          {currentQuestion + 1}/{TRIVIA_QUESTIONS.length}
        </span>
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

      <div className="mt-4 flex items-center justify-between text-sm text-white/40">
        <span>Score: {score}</span>
        <span>+10 XP per correct answer</span>
      </div>
    </div>
  );
}

// Main Arcade Page
export function ArcadePageClient() {
  const router = useRouter();
  const { isAuthenticated, isInitialized: authInitialized } = useAuthStore();
  const { hasAnyBadge, addXP, addNotification, isInitialized: gamificationInitialized } = useGamificationStore();
  const { playEasterEgg } = useBadgeSound();

  const [selectedGame, setSelectedGame] = useState<"memory" | "slots" | "trivia" | null>(null);
  const [totalXPEarned, setTotalXPEarned] = useState(0);
  const [accessChecked, setAccessChecked] = useState(false);

  // Both auth and gamification must be initialized before checking access
  const fullyInitialized = authInitialized && gamificationInitialized;

  // Check VIP access - only after both stores are initialized
  useEffect(() => {
    if (!fullyInitialized) return;
    
    // Only check access once
    if (accessChecked) return;
    setAccessChecked(true);
    
    if (!isAuthenticated || !hasAnyBadge()) {
      router.replace("/404");
    } else {
      playEasterEgg();
    }
  }, [fullyInitialized, accessChecked, isAuthenticated, hasAnyBadge, router, playEasterEgg]);

  const handleWin = useCallback((xp: number) => {
    addXP(xp, "bonus", "Arcade game reward");
    setTotalXPEarned((prev) => prev + xp);
    addNotification({
      type: "reward",
      title: "🎮 Arcade Win!",
      message: `You earned ${xp} XP!`,
      xpAmount: xp,
    });
  }, [addXP, addNotification]);

  if (!fullyInitialized || !accessChecked || !isAuthenticated || !hasAnyBadge()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-main-1)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full mb-6">
            <span className="text-purple-400 text-sm font-semibold tracking-wider">
              🕹️ SECRET ARCADE 🕹️
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-heading uppercase tracking-wider mb-4">
            <span className="text-purple-400">Hidden</span> Arcade
          </h1>

          <p className="text-white/60 max-w-xl mx-auto">
            Welcome to the secret arcade! Play mini-games to earn bonus XP. 
            Only VIP badge holders know this place exists.
          </p>

          {totalXPEarned > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 inline-block px-4 py-2 bg-[var(--color-main-1)]/20 rounded-full"
            >
              <span className="text-[var(--color-main-1)] font-semibold">
                Session XP: +{totalXPEarned}
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Game Selection */}
        {!selectedGame ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedGame("memory")}
              className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 rounded-xl text-center hover:border-purple-500/50 transition-colors cursor-pointer"
            >
              <div className="text-5xl mb-4">🧠</div>
              <h3 className="font-heading text-xl mb-2">Memory Match</h3>
              <p className="text-sm text-white/60">Match pairs to win XP</p>
              <div className="mt-4 text-xs text-purple-400">Up to 50 XP</div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedGame("slots")}
              className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 rounded-xl text-center hover:border-purple-500/50 transition-colors cursor-pointer"
            >
              <div className="text-5xl mb-4">🎰</div>
              <h3 className="font-heading text-xl mb-2">Lucky Slots</h3>
              <p className="text-sm text-white/60">3 daily spins for prizes</p>
              <div className="mt-4 text-xs text-purple-400">Up to 100 XP</div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedGame("trivia")}
              className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 rounded-xl text-center hover:border-purple-500/50 transition-colors cursor-pointer"
            >
              <div className="text-5xl mb-4">📝</div>
              <h3 className="font-heading text-xl mb-2">Trivia Challenge</h3>
              <p className="text-sm text-white/60">Test your knowledge</p>
              <div className="mt-4 text-xs text-purple-400">Up to 50 XP</div>
            </motion.button>
          </motion.div>
        ) : (
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setSelectedGame(null)}
              className="mb-4 text-white/60 hover:text-white transition-colors flex items-center gap-2"
            >
              ← Back to Games
            </button>

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedGame}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {selectedGame === "memory" && <MemoryGame onWin={handleWin} />}
                {selectedGame === "slots" && <SlotMachine onWin={handleWin} />}
                {selectedGame === "trivia" && <TriviaGame onWin={handleWin} />}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Back to VIP */}
        <div className="text-center mt-12">
          <Link href="/vip" className="text-purple-400 hover:underline text-sm">
            ← Back to VIP Lounge
          </Link>
        </div>
      </div>
    </div>
  );
}


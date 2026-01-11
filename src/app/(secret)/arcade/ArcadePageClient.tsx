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
const MAX_MEMORY_GAMES_PER_DAY = 3;

function MemoryGame({ onWin, onGameComplete }: { onWin: (xp: number) => void; onGameComplete?: () => void }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [dailyGamesLeft, setDailyGamesLeft] = useState(MAX_MEMORY_GAMES_PER_DAY);
  const [canPlay, setCanPlay] = useState(true);

  // Initialize game and check daily limit
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
        // Match!
        setTimeout(() => {
          const matched = [...cards];
          matched[first].isMatched = true;
          matched[second].isMatched = true;
          setCards(matched);
          setFlippedCards([]);
          setIsLocked(false);

          // Check win - need to include the 2 cards we just matched
          const totalMatched = matched.filter(c => c.isMatched).length;
          if (totalMatched === matched.length) {
            setGameComplete(true);
            const currentMoves = moves + 1; // Include this move
            const xpReward = Math.max(50 - currentMoves * 2, 10); // Less moves = more XP
            onWin(xpReward);
            
            // Update games played
            const gamesPlayed = parseInt(localStorage.getItem("memoryGamesPlayed") || "0") + 1;
            localStorage.setItem("memoryGamesPlayed", gamesPlayed.toString());
            setDailyGamesLeft(MAX_MEMORY_GAMES_PER_DAY - gamesPlayed);
            
            if (onGameComplete) onGameComplete();
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
        <p className="text-white/60 mb-4">
          You&apos;ve played all {MAX_MEMORY_GAMES_PER_DAY} memory games for today.
        </p>
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
          <span className="text-white/40 text-xs">
            {dailyGamesLeft} game{dailyGamesLeft !== 1 ? 's' : ''} left today
          </span>
        </div>
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
          <p className="text-white/40 text-sm mt-1">
            {dailyGamesLeft > 0 ? `${dailyGamesLeft} game${dailyGamesLeft !== 1 ? 's' : ''} left today` : "No games left today"}
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

// Trivia Game - Large question pool for randomization
const ALL_TRIVIA_QUESTIONS = [
  // Darkpoint specific questions
  { question: "What does XP stand for?", options: ["Extra Points", "Experience Points", "Extreme Power", "eXtra Perks"], correct: 1 },
  { question: "How many days in a login streak cycle?", options: ["5", "7", "10", "14"], correct: 1 },
  { question: "What do you get for reaching Level 10?", options: ["Free shipping", "Special badge", "Bonus XP", "All of the above"], correct: 3 },
  { question: "Which VIP tier is the highest?", options: ["Bronze Tier", "Gold Tier", "Platinum Tier", "Diamond Tier"], correct: 2 },
  { question: "What code unlocks a secret easter egg?", options: ["UP UP DOWN DOWN", "LEFT LEFT RIGHT RIGHT", "A B A B", "1 2 3 4"], correct: 0 },
  { question: "How much XP do you get for writing a review?", options: ["10 XP", "15 XP", "25 XP", "50 XP"], correct: 2 },
  { question: "What is the minimum order for free shipping?", options: ["R300", "R400", "R500", "R600"], correct: 2 },
  { question: "How many referrals do you need for the 'Referral Champion' achievement?", options: ["5", "10", "15", "20"], correct: 1 },
  { question: "What multiplier does a 1.5x XP boost give?", options: ["1.25x", "1.5x", "1.75x", "2x"], correct: 1 },
  { question: "How many daily quests are available each day?", options: ["2", "3", "4", "5"], correct: 2 },
  
  // Gaming & Tech trivia
  { question: "What year was the first PlayStation released?", options: ["1992", "1994", "1996", "1998"], correct: 1 },
  { question: "What does RGB stand for in computing?", options: ["Really Good Brightness", "Red Green Blue", "Random Generated Bits", "Rapid Graphic Board"], correct: 1 },
  { question: "Which company created the Mario character?", options: ["Sony", "Sega", "Nintendo", "Atari"], correct: 2 },
  { question: "What was the first commercially successful video game?", options: ["Pong", "Pac-Man", "Space Invaders", "Tetris"], correct: 0 },
  { question: "What does CPU stand for?", options: ["Central Processing Unit", "Computer Personal Unit", "Core Power Unit", "Central Power Utility"], correct: 0 },
  { question: "In what year was Minecraft officially released?", options: ["2009", "2011", "2013", "2015"], correct: 1 },
  { question: "What is the best-selling video game console of all time?", options: ["PlayStation 4", "Nintendo Wii", "PlayStation 2", "Nintendo Switch"], correct: 2 },
  { question: "What does SSD stand for?", options: ["Super Speed Drive", "Solid State Drive", "System Storage Device", "Sequential Serial Drive"], correct: 1 },
  { question: "Which game popularized the battle royale genre?", options: ["Fortnite", "PUBG", "Apex Legends", "H1Z1"], correct: 1 },
  { question: "What is the name of Zelda's main character?", options: ["Zelda", "Link", "Ganon", "Epona"], correct: 1 },
  
  // Pop culture & general knowledge
  { question: "What planet is known as the Red Planet?", options: ["Venus", "Jupiter", "Mars", "Saturn"], correct: 2 },
  { question: "How many continents are there?", options: ["5", "6", "7", "8"], correct: 2 },
  { question: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3 },
  { question: "In what year did the Titanic sink?", options: ["1905", "1912", "1918", "1923"], correct: 1 },
  { question: "What is the chemical symbol for Gold?", options: ["Go", "Gd", "Au", "Ag"], correct: 2 },
  { question: "Which country invented pizza?", options: ["France", "Spain", "Italy", "Greece"], correct: 2 },
  { question: "What is the hardest natural substance?", options: ["Titanium", "Diamond", "Platinum", "Quartz"], correct: 1 },
  { question: "How many bones are in the human body?", options: ["186", "206", "226", "246"], correct: 1 },
  { question: "What is the largest mammal?", options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"], correct: 1 },
  { question: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Perth"], correct: 2 },
  
  // Math & Logic
  { question: "What is 15% of 200?", options: ["25", "30", "35", "40"], correct: 1 },
  { question: "What is the next number: 2, 4, 8, 16, ?", options: ["24", "28", "32", "36"], correct: 2 },
  { question: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], correct: 1 },
  { question: "What is the square root of 144?", options: ["10", "11", "12", "14"], correct: 2 },
  { question: "If you have 3 apples and take away 2, how many do you have?", options: ["1", "2", "3", "5"], correct: 1 },
  
  // South Africa specific
  { question: "What is the currency of South Africa?", options: ["Dollar", "Rand", "Pound", "Euro"], correct: 1 },
  { question: "How many provinces does South Africa have?", options: ["7", "8", "9", "10"], correct: 2 },
  { question: "What is the largest city in South Africa?", options: ["Cape Town", "Durban", "Pretoria", "Johannesburg"], correct: 3 },
  { question: "Which ocean borders South Africa's west coast?", options: ["Indian", "Pacific", "Atlantic", "Arctic"], correct: 2 },
  { question: "What year did South Africa host the FIFA World Cup?", options: ["2006", "2010", "2014", "2018"], correct: 1 },
];

const QUESTIONS_PER_GAME = 5;
const MAX_TRIVIA_GAMES_PER_DAY = 3;

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function TriviaGame({ onWin, onGameComplete }: { onWin: (xp: number) => void; onGameComplete?: () => void }) {
  const [questions, setQuestions] = useState<typeof ALL_TRIVIA_QUESTIONS>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [dailyGamesLeft, setDailyGamesLeft] = useState(MAX_TRIVIA_GAMES_PER_DAY);
  const [canPlay, setCanPlay] = useState(true);

  // Initialize game with random questions and check daily limit
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
      // Pick random questions
      const randomQuestions = shuffleArray(ALL_TRIVIA_QUESTIONS).slice(0, QUESTIONS_PER_GAME);
      // Also shuffle answer options for each question
      const questionsWithShuffledOptions = randomQuestions.map(q => {
        const shuffledOptions = [...q.options];
        const correctAnswer = q.options[q.correct];
        // Shuffle options
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
        }
        // Find new correct index
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
    if (isCorrect) {
      setScore(newScore);
    }

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((q) => q + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        setGameOver(true);
        // Award XP based on final score (already includes this answer)
        const xpReward = newScore * 10; // 10 XP per correct answer
        if (xpReward > 0) onWin(xpReward);
        
        // Update games played
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
    
    // Pick new random questions
    const randomQuestions = shuffleArray(ALL_TRIVIA_QUESTIONS).slice(0, QUESTIONS_PER_GAME);
    const questionsWithShuffledOptions = randomQuestions.map(q => {
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
        <p className="text-white/60 mb-4">
          You&apos;ve played all {MAX_TRIVIA_GAMES_PER_DAY} trivia games for today.
        </p>
        <p className="text-purple-400 text-sm">Come back tomorrow for more!</p>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-6 rounded-xl text-center">
        <h3 className="font-heading text-xl mb-4">Game Over!</h3>
        <p className="text-4xl mb-4">
          {score === QUESTIONS_PER_GAME ? "🏆" : score >= 3 ? "⭐" : "📝"}
        </p>
        <p className="text-white/60 mb-4">
          You got {score}/{QUESTIONS_PER_GAME} correct!
        </p>
        <p className="text-[var(--color-main-1)] font-semibold mb-4">
          +{score * 10} XP earned!
        </p>
        <p className="text-white/40 text-sm mb-4">
          {dailyGamesLeft > 0 ? `${dailyGamesLeft} game${dailyGamesLeft !== 1 ? 's' : ''} left today` : "No games left today"}
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
          <span className="text-white/40 text-xs">
            {dailyGamesLeft} game{dailyGamesLeft !== 1 ? 's' : ''} left today
          </span>
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
              <div className="mt-2 text-xs text-white/40">{MAX_MEMORY_GAMES_PER_DAY} games per day</div>
              <div className="mt-2 text-xs text-purple-400">Up to 50 XP per game</div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedGame("slots")}
              className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 rounded-xl text-center hover:border-purple-500/50 transition-colors cursor-pointer"
            >
              <div className="text-5xl mb-4">🎰</div>
              <h3 className="font-heading text-xl mb-2">Lucky Slots</h3>
              <p className="text-sm text-white/60">Spin to win prizes</p>
              <div className="mt-2 text-xs text-white/40">3 spins per day</div>
              <div className="mt-2 text-xs text-purple-400">Up to 100 XP per spin</div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedGame("trivia")}
              className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] p-8 rounded-xl text-center hover:border-purple-500/50 transition-colors cursor-pointer"
            >
              <div className="text-5xl mb-4">📝</div>
              <h3 className="font-heading text-xl mb-2">Trivia Challenge</h3>
              <p className="text-sm text-white/60">40 random questions</p>
              <div className="mt-2 text-xs text-white/40">{MAX_TRIVIA_GAMES_PER_DAY} games per day</div>
              <div className="mt-2 text-xs text-purple-400">Up to 50 XP per game</div>
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


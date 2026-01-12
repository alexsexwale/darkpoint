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
  | "memory" | "slots" | "trivia"  // Bronze tier (all VIPs)
  | "reaction" | "whack" | "word"    // Gold tier
  | "pattern" | "simon" | "coinflip"; // Platinum tier

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
  return ALL_GAMES.filter(g => hasVIPAccess(tier, g.requiredTier)).map(g => g.id);
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

// Trivia Game - 200 questions for maximum variety
const ALL_TRIVIA_QUESTIONS = [
  // ===== DARKPOINT SPECIFIC (15 questions) =====
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
  { question: "What happens when you reach a new level?", options: ["Nothing", "You get rewards", "You lose XP", "Game resets"], correct: 1 },
  { question: "Where can VIP badge holders access secret games?", options: ["Home page", "Hidden Arcade", "Store page", "Profile"], correct: 1 },
  { question: "What do you earn by completing daily quests?", options: ["Money", "XP", "Free products", "Nothing"], correct: 1 },
  { question: "How do you get a VIP badge?", options: ["Buy it", "Earn XP", "Rewards Shop", "Random"], correct: 2 },
  { question: "What's the benefit of the spin wheel?", options: ["Free shipping", "Random rewards", "Discount only", "XP only"], correct: 1 },

  // ===== GAMING (40 questions) =====
  { question: "What year was the first PlayStation released?", options: ["1992", "1994", "1996", "1998"], correct: 1 },
  { question: "Which company created the Mario character?", options: ["Sony", "Sega", "Nintendo", "Atari"], correct: 2 },
  { question: "What was the first commercially successful video game?", options: ["Pong", "Pac-Man", "Space Invaders", "Tetris"], correct: 0 },
  { question: "In what year was Minecraft officially released?", options: ["2009", "2011", "2013", "2015"], correct: 1 },
  { question: "What is the best-selling video game console of all time?", options: ["PlayStation 4", "Nintendo Wii", "PlayStation 2", "Nintendo Switch"], correct: 2 },
  { question: "Which game popularized the battle royale genre?", options: ["Fortnite", "PUBG", "Apex Legends", "H1Z1"], correct: 1 },
  { question: "What is the name of Zelda's main character?", options: ["Zelda", "Link", "Ganon", "Epona"], correct: 1 },
  { question: "What year was Fortnite released?", options: ["2015", "2016", "2017", "2018"], correct: 2 },
  { question: "Who is Mario's brother?", options: ["Wario", "Luigi", "Toad", "Bowser"], correct: 1 },
  { question: "What game features a character named Master Chief?", options: ["Call of Duty", "Halo", "Gears of War", "Destiny"], correct: 1 },
  { question: "Which company makes the Xbox?", options: ["Sony", "Nintendo", "Microsoft", "Sega"], correct: 2 },
  { question: "What is the highest-selling video game of all time?", options: ["Tetris", "Minecraft", "GTA V", "Wii Sports"], correct: 1 },
  { question: "In what year was the Nintendo Switch released?", options: ["2015", "2016", "2017", "2018"], correct: 2 },
  { question: "What color is Sonic the Hedgehog?", options: ["Red", "Green", "Blue", "Yellow"], correct: 2 },
  { question: "Which game series features Kratos?", options: ["Devil May Cry", "God of War", "Dark Souls", "Mortal Kombat"], correct: 1 },
  { question: "What is the name of the princess Mario rescues?", options: ["Zelda", "Peach", "Daisy", "Rosalina"], correct: 1 },
  { question: "Which game has a character called Steve?", options: ["Fortnite", "Minecraft", "Roblox", "Terraria"], correct: 1 },
  { question: "What year was the original Game Boy released?", options: ["1985", "1987", "1989", "1991"], correct: 2 },
  { question: "What is the name of the ghost in Pac-Man?", options: ["Blinky", "All of these", "Pinky", "Inky"], correct: 1 },
  { question: "Which company created Pokémon?", options: ["Nintendo", "Game Freak", "Sega", "Capcom"], correct: 1 },
  { question: "What is the main currency in Fortnite?", options: ["Coins", "V-Bucks", "Gems", "Credits"], correct: 1 },
  { question: "What year was Roblox released?", options: ["2004", "2006", "2008", "2010"], correct: 1 },
  { question: "Which game features the Creeper enemy?", options: ["Terraria", "Minecraft", "Roblox", "Fortnite"], correct: 1 },
  { question: "What does 'GG' stand for in gaming?", options: ["Good Going", "Good Game", "Great Game", "Get Good"], correct: 1 },
  { question: "What is the name of Link's horse?", options: ["Shadowfax", "Epona", "Roach", "Agro"], correct: 1 },
  { question: "Which game studio made The Last of Us?", options: ["Rockstar", "Naughty Dog", "Bethesda", "BioWare"], correct: 1 },
  { question: "What year was Grand Theft Auto V released?", options: ["2011", "2012", "2013", "2014"], correct: 2 },
  { question: "Which game has a Battle Pass system?", options: ["Minecraft", "Mario Kart", "Fortnite", "Tetris"], correct: 2 },
  { question: "What is Pikachu's main attack?", options: ["Fire Blast", "Thunderbolt", "Water Gun", "Vine Whip"], correct: 1 },
  { question: "Which game features the Ender Dragon?", options: ["Terraria", "Minecraft", "Roblox", "ARK"], correct: 1 },
  { question: "What does NPC stand for?", options: ["New Player Character", "Non-Player Character", "Normal Play Control", "No Points Counted"], correct: 1 },
  { question: "Which console introduced motion controls first?", options: ["PlayStation 3", "Xbox 360", "Nintendo Wii", "Nintendo DS"], correct: 2 },
  { question: "What game is set in Night City?", options: ["Watch Dogs", "Cyberpunk 2077", "Deus Ex", "Fallout"], correct: 1 },
  { question: "What is the name of the sword in Halo?", options: ["Plasma Sword", "Energy Sword", "Light Blade", "Power Saber"], correct: 1 },
  { question: "Which game has players building with LEGO-like blocks?", options: ["Fortnite", "Minecraft", "Roblox", "All of these"], correct: 3 },
  { question: "What year was League of Legends released?", options: ["2007", "2009", "2011", "2013"], correct: 1 },
  { question: "What does FPS stand for in gaming?", options: ["Fast Player Speed", "First Person Shooter", "Free Play System", "Full Performance Score"], correct: 1 },
  { question: "Which game features Nathan Drake?", options: ["Tomb Raider", "Uncharted", "Far Cry", "Just Cause"], correct: 1 },
  { question: "What is the max level in most Pokémon games?", options: ["50", "75", "100", "150"], correct: 2 },
  { question: "Which game has the Wither boss?", options: ["Terraria", "Minecraft", "Dark Souls", "Elden Ring"], correct: 1 },

  // ===== TECHNOLOGY (30 questions) =====
  { question: "What does RGB stand for in computing?", options: ["Really Good Brightness", "Red Green Blue", "Random Generated Bits", "Rapid Graphic Board"], correct: 1 },
  { question: "What does CPU stand for?", options: ["Central Processing Unit", "Computer Personal Unit", "Core Power Unit", "Central Power Utility"], correct: 0 },
  { question: "What does SSD stand for?", options: ["Super Speed Drive", "Solid State Drive", "System Storage Device", "Sequential Serial Drive"], correct: 1 },
  { question: "What does USB stand for?", options: ["Universal Serial Bus", "Ultra Speed Byte", "United System Board", "Universal System Backup"], correct: 0 },
  { question: "What does RAM stand for?", options: ["Random Access Memory", "Read All Memory", "Rapid Action Module", "Real Active Memory"], correct: 0 },
  { question: "Who founded Apple?", options: ["Bill Gates", "Steve Jobs", "Elon Musk", "Mark Zuckerberg"], correct: 1 },
  { question: "What does GPU stand for?", options: ["General Power Unit", "Graphics Processing Unit", "Game Play Utility", "Global Performance Update"], correct: 1 },
  { question: "What year was the iPhone first released?", options: ["2005", "2006", "2007", "2008"], correct: 2 },
  { question: "What does Wi-Fi stand for?", options: ["Wireless Fidelity", "Wide Frequency", "Wire-Free", "Nothing specific"], correct: 3 },
  { question: "What company makes Android?", options: ["Apple", "Microsoft", "Google", "Samsung"], correct: 2 },
  { question: "What does HTML stand for?", options: ["Hyper Text Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlink Text Main Language"], correct: 0 },
  { question: "What does VPN stand for?", options: ["Virtual Private Network", "Very Personal Network", "Visual Processing Node", "Verified Protection Net"], correct: 0 },
  { question: "What is the most used web browser?", options: ["Safari", "Firefox", "Chrome", "Edge"], correct: 2 },
  { question: "What does PDF stand for?", options: ["Portable Document Format", "Print Document File", "Personal Data Format", "Public Document Folder"], correct: 0 },
  { question: "What company owns Instagram?", options: ["Google", "Microsoft", "Meta", "Twitter"], correct: 2 },
  { question: "What does OLED stand for?", options: ["Organic Light Emitting Diode", "Optical LED Display", "Original Light Emission Device", "Open LED"], correct: 0 },
  { question: "What year was YouTube founded?", options: ["2003", "2004", "2005", "2006"], correct: 2 },
  { question: "What does URL stand for?", options: ["Universal Resource Locator", "Uniform Resource Locator", "United Reference Link", "User Request Location"], correct: 1 },
  { question: "What company makes the Kindle?", options: ["Apple", "Google", "Amazon", "Microsoft"], correct: 2 },
  { question: "What does iOS stand for?", options: ["Internet Operating System", "iPhone Operating System", "Integrated OS", "Intelligent OS"], correct: 1 },
  { question: "What is the world's largest social network?", options: ["Twitter", "Instagram", "Facebook", "TikTok"], correct: 2 },
  { question: "What does HDMI stand for?", options: ["High Definition Media Interface", "High Definition Multimedia Interface", "HD Media Input", "High Digital Media Interface"], correct: 1 },
  { question: "Who founded Microsoft?", options: ["Steve Jobs", "Bill Gates", "Mark Zuckerberg", "Jeff Bezos"], correct: 1 },
  { question: "What year was Twitter founded?", options: ["2004", "2005", "2006", "2007"], correct: 2 },
  { question: "What does AI stand for?", options: ["Automated Intelligence", "Artificial Intelligence", "Advanced Integration", "Auto Input"], correct: 1 },
  { question: "What company makes the Surface tablet?", options: ["Apple", "Microsoft", "Google", "Samsung"], correct: 1 },
  { question: "What does LCD stand for?", options: ["Light Crystal Display", "Liquid Crystal Display", "LED Crystal Display", "Low Cost Display"], correct: 1 },
  { question: "What year was Facebook founded?", options: ["2002", "2003", "2004", "2005"], correct: 2 },
  { question: "What does HTTP stand for?", options: ["HyperText Transfer Protocol", "High Tech Transfer Process", "Hyper Transfer Text Protocol", "Home Text Transfer Protocol"], correct: 0 },
  { question: "What company makes the Galaxy phones?", options: ["Apple", "Google", "Samsung", "Huawei"], correct: 2 },

  // ===== SCIENCE & NATURE (30 questions) =====
  { question: "What planet is known as the Red Planet?", options: ["Venus", "Jupiter", "Mars", "Saturn"], correct: 2 },
  { question: "What is the chemical symbol for Gold?", options: ["Go", "Gd", "Au", "Ag"], correct: 2 },
  { question: "What is the hardest natural substance?", options: ["Titanium", "Diamond", "Platinum", "Quartz"], correct: 1 },
  { question: "What is the largest mammal?", options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"], correct: 1 },
  { question: "What is the chemical symbol for water?", options: ["H2O", "CO2", "NaCl", "O2"], correct: 0 },
  { question: "How many planets are in our solar system?", options: ["7", "8", "9", "10"], correct: 1 },
  { question: "What is the largest organ in the human body?", options: ["Heart", "Liver", "Brain", "Skin"], correct: 3 },
  { question: "What gas do plants absorb?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], correct: 1 },
  { question: "What is the fastest land animal?", options: ["Lion", "Cheetah", "Horse", "Gazelle"], correct: 1 },
  { question: "How many teeth does an adult human have?", options: ["28", "30", "32", "34"], correct: 2 },
  { question: "What is the closest star to Earth?", options: ["Alpha Centauri", "Sirius", "The Sun", "Proxima Centauri"], correct: 2 },
  { question: "What is the chemical symbol for Silver?", options: ["Si", "Sv", "Ag", "Sr"], correct: 2 },
  { question: "How many chromosomes do humans have?", options: ["23", "46", "48", "52"], correct: 1 },
  { question: "What type of animal is a dolphin?", options: ["Fish", "Reptile", "Mammal", "Amphibian"], correct: 2 },
  { question: "What is the largest planet in our solar system?", options: ["Saturn", "Jupiter", "Neptune", "Uranus"], correct: 1 },
  { question: "What element does 'O' represent?", options: ["Gold", "Osmium", "Oxygen", "Oganesson"], correct: 2 },
  { question: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi body"], correct: 2 },
  { question: "How many hearts does an octopus have?", options: ["1", "2", "3", "4"], correct: 2 },
  { question: "What is the hottest planet in our solar system?", options: ["Mercury", "Venus", "Mars", "Jupiter"], correct: 1 },
  { question: "What gas makes up most of Earth's atmosphere?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], correct: 2 },
  { question: "What is the smallest bone in the human body?", options: ["Toe bone", "Stapes", "Finger bone", "Coccyx"], correct: 1 },
  { question: "How long does it take Earth to orbit the Sun?", options: ["365 days", "30 days", "24 hours", "7 days"], correct: 0 },
  { question: "What animal has the longest lifespan?", options: ["Elephant", "Tortoise", "Whale", "Parrot"], correct: 1 },
  { question: "What is the speed of light?", options: ["300,000 km/s", "150,000 km/s", "500,000 km/s", "1,000,000 km/s"], correct: 0 },
  { question: "What is the main gas in the Sun?", options: ["Oxygen", "Nitrogen", "Hydrogen", "Helium"], correct: 2 },
  { question: "How many legs does a spider have?", options: ["6", "8", "10", "12"], correct: 1 },
  { question: "What is the largest bird?", options: ["Eagle", "Ostrich", "Condor", "Albatross"], correct: 1 },
  { question: "What planet has the most moons?", options: ["Jupiter", "Saturn", "Uranus", "Neptune"], correct: 1 },
  { question: "What is table salt made of?", options: ["NaCl", "H2O", "CO2", "CaCO3"], correct: 0 },
  { question: "What animal can change its color?", options: ["Frog", "Chameleon", "Gecko", "Snake"], correct: 1 },

  // ===== GEOGRAPHY (25 questions) =====
  { question: "How many continents are there?", options: ["5", "6", "7", "8"], correct: 2 },
  { question: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3 },
  { question: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Perth"], correct: 2 },
  { question: "What is the longest river in the world?", options: ["Amazon", "Nile", "Mississippi", "Yangtze"], correct: 1 },
  { question: "What is the smallest country in the world?", options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], correct: 1 },
  { question: "What is the largest country by area?", options: ["China", "USA", "Canada", "Russia"], correct: 3 },
  { question: "What is the capital of Japan?", options: ["Osaka", "Kyoto", "Tokyo", "Hiroshima"], correct: 2 },
  { question: "What is the highest mountain in the world?", options: ["K2", "Kilimanjaro", "Mount Everest", "Denali"], correct: 2 },
  { question: "What country has the most people?", options: ["India", "China", "USA", "Indonesia"], correct: 0 },
  { question: "What is the capital of France?", options: ["Lyon", "Marseille", "Nice", "Paris"], correct: 3 },
  { question: "What is the largest desert in the world?", options: ["Sahara", "Antarctic", "Arabian", "Gobi"], correct: 1 },
  { question: "What ocean is between Africa and Australia?", options: ["Pacific", "Atlantic", "Indian", "Arctic"], correct: 2 },
  { question: "What is the capital of Brazil?", options: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"], correct: 2 },
  { question: "What country is the Great Barrier Reef in?", options: ["USA", "Brazil", "Australia", "Indonesia"], correct: 2 },
  { question: "What is the capital of Canada?", options: ["Toronto", "Vancouver", "Montreal", "Ottawa"], correct: 3 },
  { question: "What country has the most islands?", options: ["Indonesia", "Philippines", "Japan", "Sweden"], correct: 3 },
  { question: "What is the capital of Italy?", options: ["Milan", "Venice", "Rome", "Florence"], correct: 2 },
  { question: "What is the largest lake in Africa?", options: ["Lake Chad", "Lake Victoria", "Lake Tanganyika", "Lake Malawi"], correct: 1 },
  { question: "What country is the Eiffel Tower in?", options: ["Italy", "Spain", "France", "Germany"], correct: 2 },
  { question: "What is the capital of Germany?", options: ["Munich", "Frankfurt", "Hamburg", "Berlin"], correct: 3 },
  { question: "What continent is Egypt in?", options: ["Asia", "Europe", "Africa", "Middle East"], correct: 2 },
  { question: "What is the capital of Spain?", options: ["Barcelona", "Madrid", "Seville", "Valencia"], correct: 1 },
  { question: "What country has the shape of a boot?", options: ["Spain", "Portugal", "Italy", "Greece"], correct: 2 },
  { question: "What is the smallest continent?", options: ["Europe", "Antarctica", "Australia", "South America"], correct: 2 },
  { question: "What is the capital of Egypt?", options: ["Alexandria", "Cairo", "Luxor", "Giza"], correct: 1 },

  // ===== SOUTH AFRICA (20 questions) =====
  { question: "What is the currency of South Africa?", options: ["Dollar", "Rand", "Pound", "Euro"], correct: 1 },
  { question: "How many provinces does South Africa have?", options: ["7", "8", "9", "10"], correct: 2 },
  { question: "What is the largest city in South Africa?", options: ["Cape Town", "Durban", "Pretoria", "Johannesburg"], correct: 3 },
  { question: "Which ocean borders South Africa's west coast?", options: ["Indian", "Pacific", "Atlantic", "Arctic"], correct: 2 },
  { question: "What year did South Africa host the FIFA World Cup?", options: ["2006", "2010", "2014", "2018"], correct: 1 },
  { question: "What is the legislative capital of South Africa?", options: ["Johannesburg", "Pretoria", "Cape Town", "Bloemfontein"], correct: 2 },
  { question: "What is Table Mountain located near?", options: ["Johannesburg", "Durban", "Cape Town", "Pretoria"], correct: 2 },
  { question: "What is South Africa's national animal?", options: ["Lion", "Springbok", "Elephant", "Rhino"], correct: 1 },
  { question: "How many official languages does South Africa have?", options: ["5", "7", "9", "11"], correct: 3 },
  { question: "What is the Kruger National Park famous for?", options: ["Beaches", "Wildlife", "Mountains", "Forests"], correct: 1 },
  { question: "What is 'braai' in South Africa?", options: ["A dance", "A BBQ", "A sport", "A drink"], correct: 1 },
  { question: "What is the judicial capital of South Africa?", options: ["Cape Town", "Pretoria", "Bloemfontein", "Johannesburg"], correct: 2 },
  { question: "Which South African city is known as the 'City of Gold'?", options: ["Cape Town", "Durban", "Johannesburg", "Pretoria"], correct: 2 },
  { question: "What sport is the Springboks team for?", options: ["Cricket", "Soccer", "Rugby", "Tennis"], correct: 2 },
  { question: "What is 'biltong'?", options: ["A bread", "Dried meat", "A vegetable", "A sauce"], correct: 1 },
  { question: "What is the Garden Route famous for?", options: ["Deserts", "Scenic beauty", "Snow", "Skyscrapers"], correct: 1 },
  { question: "Which province is Durban in?", options: ["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape"], correct: 2 },
  { question: "What river forms part of SA's border with Zimbabwe?", options: ["Orange", "Vaal", "Limpopo", "Tugela"], correct: 2 },
  { question: "What is South Africa's national flower?", options: ["Rose", "Protea", "Sunflower", "Lily"], correct: 1 },
  { question: "Which South African won the Nobel Peace Prize in 1993?", options: ["Desmond Tutu", "Nelson Mandela", "F.W. de Klerk", "Both B and C"], correct: 3 },

  // ===== HISTORY (20 questions) =====
  { question: "In what year did the Titanic sink?", options: ["1905", "1912", "1918", "1923"], correct: 1 },
  { question: "Who was the first person to walk on the moon?", options: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "John Glenn"], correct: 1 },
  { question: "What year did World War II end?", options: ["1943", "1944", "1945", "1946"], correct: 2 },
  { question: "Who painted the Mona Lisa?", options: ["Michelangelo", "Raphael", "Leonardo da Vinci", "Donatello"], correct: 2 },
  { question: "What ancient wonder was in Egypt?", options: ["Hanging Gardens", "Colossus", "Great Pyramid", "Lighthouse"], correct: 2 },
  { question: "Who discovered America in 1492?", options: ["Amerigo Vespucci", "Christopher Columbus", "Ferdinand Magellan", "Leif Erikson"], correct: 1 },
  { question: "What year did the Berlin Wall fall?", options: ["1987", "1988", "1989", "1990"], correct: 2 },
  { question: "Who was the first President of the USA?", options: ["Thomas Jefferson", "Abraham Lincoln", "George Washington", "John Adams"], correct: 2 },
  { question: "What empire built the Colosseum?", options: ["Greek", "Roman", "Egyptian", "Persian"], correct: 1 },
  { question: "In what year did man first land on the moon?", options: ["1967", "1968", "1969", "1970"], correct: 2 },
  { question: "Who wrote the play 'Romeo and Juliet'?", options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"], correct: 1 },
  { question: "What ship brought pilgrims to America in 1620?", options: ["Santa Maria", "Mayflower", "Endeavour", "Beagle"], correct: 1 },
  { question: "Who was known as the 'Iron Lady'?", options: ["Queen Elizabeth", "Margaret Thatcher", "Angela Merkel", "Indira Gandhi"], correct: 1 },
  { question: "What year was the Declaration of Independence signed?", options: ["1774", "1775", "1776", "1777"], correct: 2 },
  { question: "Who built the Great Wall of China?", options: ["Mongols", "Japanese", "Chinese", "Koreans"], correct: 2 },
  { question: "What year did Nelson Mandela become president?", options: ["1990", "1992", "1994", "1996"], correct: 2 },
  { question: "What civilization built Machu Picchu?", options: ["Aztec", "Maya", "Inca", "Olmec"], correct: 2 },
  { question: "Who was the Egyptian queen known for beauty?", options: ["Nefertiti", "Cleopatra", "Hatshepsut", "Isis"], correct: 1 },
  { question: "What year did the French Revolution begin?", options: ["1776", "1789", "1799", "1812"], correct: 1 },
  { question: "Who invented the telephone?", options: ["Thomas Edison", "Alexander Graham Bell", "Nikola Tesla", "Guglielmo Marconi"], correct: 1 },

  // ===== MATH & LOGIC (15 questions) =====
  { question: "What is 15% of 200?", options: ["25", "30", "35", "40"], correct: 1 },
  { question: "What is the next number: 2, 4, 8, 16, ?", options: ["24", "28", "32", "36"], correct: 2 },
  { question: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], correct: 1 },
  { question: "What is the square root of 144?", options: ["10", "11", "12", "14"], correct: 2 },
  { question: "If you have 3 apples and take away 2, how many do you have?", options: ["1", "2", "3", "5"], correct: 1 },
  { question: "What is 7 x 8?", options: ["54", "56", "58", "64"], correct: 1 },
  { question: "How many degrees in a triangle?", options: ["90", "180", "270", "360"], correct: 1 },
  { question: "What is 25% as a fraction?", options: ["1/2", "1/3", "1/4", "1/5"], correct: 2 },
  { question: "What is the next prime number after 7?", options: ["8", "9", "10", "11"], correct: 3 },
  { question: "How many zeros in one million?", options: ["4", "5", "6", "7"], correct: 2 },
  { question: "What is 12 squared?", options: ["124", "132", "144", "156"], correct: 2 },
  { question: "What is 100 divided by 4?", options: ["20", "25", "30", "35"], correct: 1 },
  { question: "How many sides does an octagon have?", options: ["6", "7", "8", "9"], correct: 2 },
  { question: "What is 3 cubed?", options: ["9", "18", "27", "36"], correct: 2 },
  { question: "What is the Roman numeral for 50?", options: ["C", "L", "D", "M"], correct: 1 },

  // ===== POP CULTURE & ENTERTAINMENT (20 questions) =====
  { question: "Which country invented pizza?", options: ["France", "Spain", "Italy", "Greece"], correct: 2 },
  { question: "How many bones are in the human body?", options: ["186", "206", "226", "246"], correct: 1 },
  { question: "What is the main ingredient in guacamole?", options: ["Tomato", "Avocado", "Onion", "Lime"], correct: 1 },
  { question: "What color are emeralds?", options: ["Red", "Blue", "Green", "Purple"], correct: 2 },
  { question: "What is the most popular sport in the world?", options: ["Cricket", "Basketball", "Soccer", "Tennis"], correct: 2 },
  { question: "How many players on a soccer team?", options: ["9", "10", "11", "12"], correct: 2 },
  { question: "What is the superhero Batman's real name?", options: ["Clark Kent", "Bruce Wayne", "Peter Parker", "Tony Stark"], correct: 1 },
  { question: "What movie features a character named Woody?", options: ["Cars", "Finding Nemo", "Toy Story", "Shrek"], correct: 2 },
  { question: "Who played Iron Man in the Marvel movies?", options: ["Chris Evans", "Robert Downey Jr.", "Chris Hemsworth", "Mark Ruffalo"], correct: 1 },
  { question: "What is the name of Harry Potter's owl?", options: ["Errol", "Pigwidgeon", "Hedwig", "Scabbers"], correct: 2 },
  { question: "What country did sushi originate from?", options: ["China", "Korea", "Japan", "Thailand"], correct: 2 },
  { question: "What is the highest-grossing film of all time?", options: ["Avengers: Endgame", "Avatar", "Titanic", "Star Wars"], correct: 1 },
  { question: "Who is the author of Harry Potter?", options: ["Stephen King", "J.K. Rowling", "George R.R. Martin", "Tolkien"], correct: 1 },
  { question: "What does the 'S' stand for in Superman's logo?", options: ["Super", "Strength", "Hope (Kryptonian)", "Son of Krypton"], correct: 2 },
  { question: "What animated movie features Elsa and Anna?", options: ["Tangled", "Frozen", "Moana", "Brave"], correct: 1 },
  { question: "What sport does LeBron James play?", options: ["Football", "Baseball", "Basketball", "Soccer"], correct: 2 },
  { question: "What is the name of Shrek's wife?", options: ["Fiona", "Rapunzel", "Cinderella", "Aurora"], correct: 0 },
  { question: "What superhero is from Wakanda?", options: ["Iron Man", "Black Panther", "Thor", "Spider-Man"], correct: 1 },
  { question: "What Netflix show features Eleven?", options: ["The Witcher", "Stranger Things", "Dark", "Black Mirror"], correct: 1 },
  { question: "What is the name of SpongeBob's best friend?", options: ["Squidward", "Mr. Krabs", "Patrick", "Sandy"], correct: 2 },

  // ===== FOOD & DRINK (15 questions) =====
  { question: "What fruit is used to make wine?", options: ["Apples", "Oranges", "Grapes", "Berries"], correct: 2 },
  { question: "What is the main ingredient in hummus?", options: ["Lentils", "Chickpeas", "Beans", "Peas"], correct: 1 },
  { question: "What nut is used to make marzipan?", options: ["Walnut", "Cashew", "Almond", "Peanut"], correct: 2 },
  { question: "What country is Parmesan cheese from?", options: ["France", "Italy", "Switzerland", "Spain"], correct: 1 },
  { question: "What is the spiciest part of a chili pepper?", options: ["Skin", "Seeds", "Flesh", "Stem"], correct: 1 },
  { question: "What is tofu made from?", options: ["Rice", "Wheat", "Soybeans", "Corn"], correct: 2 },
  { question: "What drink is Scotland famous for?", options: ["Wine", "Beer", "Whisky", "Vodka"], correct: 2 },
  { question: "What is the most consumed beverage in the world?", options: ["Coffee", "Tea", "Water", "Soda"], correct: 2 },
  { question: "What vitamin do you get from the sun?", options: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin E"], correct: 2 },
  { question: "What type of pasta is shaped like bow ties?", options: ["Penne", "Farfalle", "Rigatoni", "Fusilli"], correct: 1 },
  { question: "What gives bread its rise?", options: ["Salt", "Sugar", "Yeast", "Flour"], correct: 2 },
  { question: "What country is Feta cheese from?", options: ["Italy", "Greece", "Turkey", "Spain"], correct: 1 },
  { question: "What is the main ingredient in a traditional Caesar salad dressing?", options: ["Mayonnaise", "Anchovies", "Mustard", "Ketchup"], correct: 1 },
  { question: "What bean is chocolate made from?", options: ["Coffee bean", "Cocoa bean", "Vanilla bean", "Kidney bean"], correct: 1 },
  { question: "What fruit has its seeds on the outside?", options: ["Raspberry", "Strawberry", "Blueberry", "Blackberry"], correct: 1 },
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

      <div className="mt-4 flex items-center justify-between text-sm text-white/60">
        <span>Score: {score}</span>
        <span>+10 XP per correct answer</span>
      </div>
    </div>
  );
}

// ============ GOLD TIER GAMES ============

// Reaction Test Game
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
    
    // Random delay between 1-4 seconds
    const delay = 1000 + Math.random() * 3000;
    timeoutRef.current = setTimeout(() => {
      setGameState("go");
      startTimeRef.current = Date.now();
    }, delay);
  };

  const handleClick = () => {
    if (gameState === "ready") {
      // Clicked too early
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setGameState("too_early");
    } else if (gameState === "go") {
      const time = Date.now() - startTimeRef.current;
      setReactionTime(time);
      setGameState("result");
      
      // Calculate XP: faster = more XP (50 XP for <200ms, 10 XP for >600ms)
      let xp = 10;
      if (time < 200) xp = 50;
      else if (time < 300) xp = 40;
      else if (time < 400) xp = 30;
      else if (time < 500) xp = 20;
      
      onWin(xp);
      
      // Update games played
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
          gameState === "waiting" ? "bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)]" :
          gameState === "ready" ? "bg-red-500" :
          gameState === "go" ? "bg-green-500" :
          gameState === "too_early" ? "bg-orange-500" :
          "bg-[var(--color-main-1)]/20"
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
              {reactionTime < 200 ? "Lightning fast! ⚡" :
               reactionTime < 300 ? "Great reflexes! 🎯" :
               reactionTime < 400 ? "Nice! 👍" :
               reactionTime < 500 ? "Good try! 💪" : "Keep practicing! 🎮"}
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

// Whack-a-Mole Game
const MAX_WHACK_GAMES_PER_DAY = 3;
const WHACK_DURATION = 30000; // 30 seconds
const MOLE_GRID = 9; // 3x3 grid

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
    
    // Hide mole after 600-1000ms
    moleTimeoutRef.current = setTimeout(() => {
      setActiveMole(null);
    }, 600 + Math.random() * 400);
  }, []);

  const startGame = () => {
    if (!canPlay) return;
    setScore(0);
    setTimeLeft(30);
    setGameActive(true);
    setGameComplete(false);
    
    // Start showing moles
    const moleInterval = setInterval(showRandomMole, 800);
    moleTimeoutRef.current = moleInterval as unknown as ReturnType<typeof setTimeout>;
    
    // Countdown timer
    gameIntervalRef.current = setInterval(() => {
      setTimeLeft(t => {
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
    
    // End game after duration
    setTimeout(() => {
      setGameActive(false);
      setGameComplete(true);
    }, WHACK_DURATION);
  };

  useEffect(() => {
    if (gameComplete && !gameActive) {
      // Calculate XP: 5 XP per hit, max 50
      const xp = Math.min(score * 5, 50);
      if (xp > 0) onWin(xp);
      
      // Update games played
      const gamesPlayed = parseInt(localStorage.getItem("whackGamesPlayed") || "0") + 1;
      localStorage.setItem("whackGamesPlayed", gamesPlayed.toString());
      setDailyGamesLeft(MAX_WHACK_GAMES_PER_DAY - gamesPlayed);
      
      if (onGameComplete) onGameComplete();
    }
  }, [gameComplete, gameActive, score, onWin, onGameComplete]);

  const whackMole = (index: number) => {
    if (index === activeMole && gameActive) {
      setScore(s => s + 1);
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
            className={`aspect-square rounded-lg flex items-center justify-center text-3xl transition-colors cursor-pointer ${
              activeMole === i
                ? "bg-amber-500"
                : "bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)]"
            }`}
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

// Word Scramble Game
const WORD_LIST = [
  "ARCADE", "GAMING", "PLAYER", "REWARD", "POINTS", "STREAK", "LEVEL", "BADGE",
  "QUEST", "BONUS", "PRIZE", "SCORE", "WINNER", "CHAMP", "POWER", "BOOST",
  "COINS", "STARS", "GEMS", "GOLD", "SPIN", "LUCKY", "MEGA", "ULTRA",
  "SUPER", "EPIC", "RARE", "FIRE", "CROWN", "ROYAL", "ELITE", "MASTER"
];
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
    // Make sure it's actually scrambled
    return arr.join("") === word ? scrambleWord(word) : arr.join("");
  };

  const getNextWord = useCallback(() => {
    const available = WORD_LIST.filter(w => !usedWords.includes(w));
    if (available.length === 0) return null;
    const word = available[Math.floor(Math.random() * available.length)];
    return word;
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
      setTimeLeft(t => {
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
      setWordsCompleted(w => w + 1);
      setUserInput("");
      
      if (newScore >= WORDS_PER_GAME) {
        // Won the game!
        if (timerRef.current) clearInterval(timerRef.current);
        setGameActive(false);
        setGameComplete(true);
      } else {
        // Next word
        const nextWord = getNextWord();
        if (nextWord) {
          setCurrentWord(nextWord);
          setScrambledWord(scrambleWord(nextWord));
          setUsedWords(prev => [...prev, nextWord]);
        }
      }
    }
  };

  useEffect(() => {
    if (gameComplete) {
      // 10 XP per word, max 50
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
          <Button variant="outline" onClick={startGame}>Play Again ({remaining} left)</Button>
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
        <Button variant="primary" onClick={startGame} className="w-full">Start Game</Button>
      ) : (
        <>
          <div className="text-center mb-4">
            <p className="text-3xl font-mono tracking-widest text-[var(--color-main-1)]">
              {scrambledWord}
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={userInput}
              onChange={e => setUserInput(e.target.value.toUpperCase())}
              className="w-full p-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg text-center font-mono text-xl tracking-widest focus:outline-none focus:border-[var(--color-main-1)]"
              placeholder="Type the word..."
              autoFocus
            />
            <Button variant="primary" type="submit" className="w-full mt-3">Submit</Button>
          </form>
        </>
      )}
    </div>
  );
}

// ============ PLATINUM TIER GAMES ============

// Pattern Match Game
const MAX_PATTERN_GAMES_PER_DAY = 3;
const PATTERNS_PER_GAME = 5;

type PatternType = "number" | "shape";

interface Pattern {
  type: PatternType;
  sequence: (number | string)[];
  answer: number | string;
  options: (number | string)[];
}

const SHAPES = ["●", "■", "▲", "◆", "★", "♥", "♦", "♣"];

function generatePattern(): Pattern {
  const type: PatternType = Math.random() > 0.5 ? "number" : "shape";
  
  if (type === "number") {
    // Number patterns: +2, +3, *2, etc.
    const patterns = [
      { start: 2, step: (n: number) => n + 2 },  // 2, 4, 6, 8, ?
      { start: 1, step: (n: number) => n + 3 },  // 1, 4, 7, 10, ?
      { start: 1, step: (n: number) => n * 2 },  // 1, 2, 4, 8, ?
      { start: 3, step: (n: number) => n + 5 },  // 3, 8, 13, 18, ?
      { start: 100, step: (n: number) => n - 10 }, // 100, 90, 80, 70, ?
    ];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    const sequence: number[] = [pattern.start];
    for (let i = 0; i < 3; i++) {
      sequence.push(pattern.step(sequence[sequence.length - 1]));
    }
    const answer = pattern.step(sequence[sequence.length - 1]);
    
    // Generate wrong options
    const options = [answer];
    while (options.length < 4) {
      const wrong = answer + (Math.floor(Math.random() * 10) - 5);
      if (wrong !== answer && !options.includes(wrong) && wrong > 0) {
        options.push(wrong);
      }
    }
    options.sort(() => Math.random() - 0.5);
    
    return { type: "number", sequence, answer, options };
  } else {
    // Shape patterns: AABB, ABAB, ABC, etc.
    const shape1 = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const shape2 = SHAPES.filter(s => s !== shape1)[Math.floor(Math.random() * (SHAPES.length - 1))];
    const patternTypes = [
      [shape1, shape1, shape2, shape2, shape1], // AABBA -> A
      [shape1, shape2, shape1, shape2, shape1], // ABABA -> B
      [shape1, shape1, shape1, shape2, shape1], // AAABA -> A
    ];
    const selected = patternTypes[Math.floor(Math.random() * patternTypes.length)];
    const sequence = selected.slice(0, 4);
    const answer = selected[4];
    
    const options = [answer];
    const wrongShapes = SHAPES.filter(s => s !== answer);
    while (options.length < 4) {
      const wrong = wrongShapes[Math.floor(Math.random() * wrongShapes.length)];
      if (!options.includes(wrong)) options.push(wrong);
    }
    options.sort(() => Math.random() - 0.5);
    
    return { type: "shape", sequence, answer, options };
  }
}

function PatternMatchGame({ onWin, onGameComplete }: { onWin: (xp: number) => void; onGameComplete?: () => void }) {
  const [currentPattern, setCurrentPattern] = useState<Pattern | null>(null);
  const [patternsCompleted, setPatternsCompleted] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [dailyGamesLeft, setDailyGamesLeft] = useState(MAX_PATTERN_GAMES_PER_DAY);
  const [canPlay, setCanPlay] = useState(true);
  const [gameComplete, setGameComplete] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const savedDate = localStorage.getItem("patternGamesDate");
    const savedGames = localStorage.getItem("patternGamesPlayed");
    
    let gamesPlayed = 0;
    if (savedDate === today) {
      gamesPlayed = parseInt(savedGames || "0");
    } else {
      localStorage.setItem("patternGamesDate", today);
      localStorage.setItem("patternGamesPlayed", "0");
    }
    
    const remaining = MAX_PATTERN_GAMES_PER_DAY - gamesPlayed;
    setDailyGamesLeft(remaining);
    setCanPlay(remaining > 0);
  }, []);

  const startGame = () => {
    if (!canPlay) return;
    setScore(0);
    setPatternsCompleted(0);
    setGameActive(true);
    setGameComplete(false);
    setCurrentPattern(generatePattern());
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleAnswer = (answer: number | string) => {
    if (showResult || !currentPattern) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    
    const isCorrect = answer === currentPattern.answer;
    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(newScore);
    
    setTimeout(() => {
      const newCompleted = patternsCompleted + 1;
      setPatternsCompleted(newCompleted);
      
      if (newCompleted >= PATTERNS_PER_GAME) {
        setGameActive(false);
        setGameComplete(true);
        
        const xp = Math.min(newScore * 10, 50);
        if (xp > 0) onWin(xp);
        
        const gamesPlayed = parseInt(localStorage.getItem("patternGamesPlayed") || "0") + 1;
        localStorage.setItem("patternGamesPlayed", gamesPlayed.toString());
        setDailyGamesLeft(MAX_PATTERN_GAMES_PER_DAY - gamesPlayed);
        
        if (onGameComplete) onGameComplete();
      } else {
        setCurrentPattern(generatePattern());
        setSelectedAnswer(null);
        setShowResult(false);
      }
    }, 1000);
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
          <Button variant="outline" onClick={startGame}>Play Again ({remaining} left)</Button>
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
        <span className="text-white/60 text-sm">{patternsCompleted}/{PATTERNS_PER_GAME}</span>
      </div>

      {!gameActive ? (
        <Button variant="primary" onClick={startGame} className="w-full">Start Game</Button>
      ) : currentPattern && (
        <>
          <div className="text-center mb-4">
            <p className="text-2xl font-mono tracking-widest">
              {currentPattern.sequence.join(" → ")} → <span className="text-[var(--color-main-1)]">?</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {currentPattern.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                disabled={showResult}
                className={`p-4 rounded-lg text-xl font-semibold transition-colors cursor-pointer ${
                  showResult
                    ? opt === currentPattern.answer
                      ? "bg-green-500/20 border-2 border-green-500"
                      : selectedAnswer === opt
                      ? "bg-red-500/20 border-2 border-red-500"
                      : "bg-[var(--color-dark-3)]"
                    : "bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Simon Says Game
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
    if (savedDate === today) {
      gamesPlayed = parseInt(savedGames || "0");
    } else {
      localStorage.setItem("simonGamesDate", today);
      localStorage.setItem("simonGamesPlayed", "0");
    }
    
    const remaining = MAX_SIMON_GAMES_PER_DAY - gamesPlayed;
    setDailyGamesLeft(remaining);
    setCanPlay(remaining > 0);
  }, []);

  const showSequence = useCallback(async (seq: string[]) => {
    setIsShowingSequence(true);
    for (const color of seq) {
      setActiveColor(color);
      await new Promise(r => setTimeout(r, 500));
      setActiveColor(null);
      await new Promise(r => setTimeout(r, 200));
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
    
    // Check if correct
    const currentIndex = newPlayerSequence.length - 1;
    if (newPlayerSequence[currentIndex] !== sequence[currentIndex]) {
      // Wrong! Game over
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
    
    // Check if completed sequence
    if (newPlayerSequence.length === sequence.length) {
      const newRound = round + 1;
      setRound(newRound);
      setPlayerSequence([]);
      
      // Add new color to sequence
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
          <Button variant="outline" onClick={startGame}>Play Again ({remaining} left)</Button>
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
        <Button variant="primary" onClick={startGame} className="w-full">Start Game</Button>
      ) : (
        <>
          <p className="text-center text-white/60 mb-4">
            {isShowingSequence ? "Watch the sequence..." : "Your turn!"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {SIMON_COLORS.map(color => (
              <button
                key={color}
                onClick={() => handleColorClick(color)}
                disabled={isShowingSequence}
                className={getColorClasses(color, activeColor === color)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Coin Flip Streak Game
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
    if (savedDate === today) {
      gamesPlayed = parseInt(savedGames || "0");
    } else {
      localStorage.setItem("coinflipGamesDate", today);
      localStorage.setItem("coinflipGamesPlayed", "0");
    }
    
    const remaining = MAX_COINFLIP_GAMES_PER_DAY - gamesPlayed;
    setDailyGamesLeft(remaining);
    setCanPlay(remaining > 0);
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
          <Button variant="outline" onClick={resetGame}>Play Again ({remaining} left)</Button>
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
        <motion.div
          className="text-7xl mx-auto w-24 h-24 flex items-center justify-center"
          animate={isFlipping ? { rotateY: [0, 1800] } : {}}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {result ? (result === "heads" ? "😀" : "🔴") : "🪙"}
        </motion.div>
        {result && (
          <p className={`mt-2 font-semibold ${result === prediction ? "text-green-400" : "text-red-400"}`}>
            {result.toUpperCase()}! {result === prediction ? "Correct! ✓" : "Wrong!"}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => flipCoin("heads")}
          disabled={isFlipping}
          className="py-4"
        >
          😀 Heads
        </Button>
        <Button
          variant="outline"
          onClick={() => flipCoin("tails")}
          disabled={isFlipping}
          className="py-4"
        >
          🔴 Tails
        </Button>
      </div>
    </div>
  );
}

// Main Arcade Page
export function ArcadePageClient() {
  const router = useRouter();
  const { isAuthenticated, isInitialized: authInitialized } = useAuthStore();
  const { hasAnyBadge, addXP, addNotification, isInitialized: gamificationInitialized, userBadges } = useGamificationStore();
  const { playEasterEgg } = useBadgeSound();

  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [totalXPEarned, setTotalXPEarned] = useState(0);
  const [accessChecked, setAccessChecked] = useState(false);

  // Both auth and gamification must be initialized before checking access
  const fullyInitialized = authInitialized && gamificationInitialized;
  
  // Get user's VIP tier from badges
  const userVIPTier = getHighestVIPTier(userBadges.map(b => b.badge_id));
  const availableGames = getAvailableGames(userVIPTier);

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

        {/* Tier Legend */}
        {userVIPTier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center gap-4 mb-8 flex-wrap"
          >
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

        {/* Game Selection */}
        {!selectedGame ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
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
                    isLocked 
                      ? "border-[var(--color-dark-3)] opacity-60 cursor-not-allowed" 
                      : "border-[var(--color-dark-3)] hover:border-purple-500/50 cursor-pointer"
                  }`}
                >
                  {/* Tier badge */}
                  <div 
                    className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      requiredTier === "platinum" ? "bg-amber-400/20 text-amber-300" :
                      requiredTier === "gold" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-orange-500/20 text-orange-400"
                    }`}
                  >
                    {tierConfig.icon}
                  </div>
                  
                  {/* Lock overlay */}
                  {isLocked && (
                    <div className="absolute inset-0 bg-[var(--color-dark-1)]/80 rounded-xl flex flex-col items-center justify-center z-10">
                      <span className="text-3xl mb-2">🔒</span>
                      <span className="text-sm text-white/60">
                        Requires {tierConfig.name}
                      </span>
                      <span className="text-xs text-white/40 mt-1">
                        Upgrade in Rewards Shop
                      </span>
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
            <button
              onClick={() => setSelectedGame(null)}
              className="mb-4 text-white/60 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
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
                {/* Bronze Tier Games */}
                {selectedGame === "memory" && <MemoryGame onWin={handleWin} />}
                {selectedGame === "slots" && <SlotMachine onWin={handleWin} />}
                {selectedGame === "trivia" && <TriviaGame onWin={handleWin} />}
                {/* Gold Tier Games */}
                {selectedGame === "reaction" && <ReactionGame onWin={handleWin} />}
                {selectedGame === "whack" && <WhackMoleGame onWin={handleWin} />}
                {selectedGame === "word" && <WordScrambleGame onWin={handleWin} />}
                {/* Platinum Tier Games */}
                {selectedGame === "pattern" && <PatternMatchGame onWin={handleWin} />}
                {selectedGame === "simon" && <SimonSaysGame onWin={handleWin} />}
                {selectedGame === "coinflip" && <CoinFlipGame onWin={handleWin} />}
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


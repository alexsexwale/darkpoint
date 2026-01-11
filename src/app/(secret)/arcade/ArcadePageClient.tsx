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
              <p className="text-sm text-white/60">200 random questions</p>
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


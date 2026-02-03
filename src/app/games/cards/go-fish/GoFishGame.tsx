"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Confetti from "react-confetti";
import { Button } from "@/components/ui";
import {
  Card,
  Player,
  Rank,
  createDeck,
  shuffleDeck,
  drawCards,
  RANK_DISPLAY,
} from "@/lib/cardGames";
import {
  PlayingCard,
} from "@/lib/cardGames/cardRenderer";
import {
  createHumanPlayer,
  createAIPlayer,
  delay,
} from "@/lib/cardGames/utils";

type GameStatus = "idle" | "playing" | "gameEnd";

interface GoFishPlayer extends Player {
  books: number[][]; // Arrays of 4 cards with same rank
}

interface TurnLogEntry {
  asker: string;
  target: string;
  rank: string;
  result: string;
}

interface GoFishState {
  players: GoFishPlayer[];
  deck: Card[];
  currentPlayerIndex: number;
  status: GameStatus;
  message: string;
  lastAction: string;
  turnLog: TurnLogEntry[];
}

/** When AI asked human for cards and human had none – human must click "Go Fish" to draw */
interface PendingHumanGoFish {
  askerIndex: number;
  askedRank: number;
}

const createInitialState = (): GoFishState => ({
  players: [],
  deck: [],
  currentPlayerIndex: 0,
  status: "idle",
  message: "",
  lastAction: "",
  turnLog: [],
});

// AI helper: choose which rank to ask for
function aiChooseRank(hand: Card[]): number {
  // Count ranks in hand
  const rankCounts: Record<number, number> = {};
  hand.forEach(card => {
    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
  });
  
  // Prioritize ranks we have 2-3 of (closer to completing a book)
  const ranksBy3 = Object.entries(rankCounts).filter(([_, count]) => count === 3);
  if (ranksBy3.length > 0) {
    return parseInt(ranksBy3[Math.floor(Math.random() * ranksBy3.length)][0]);
  }
  
  const ranksBy2 = Object.entries(rankCounts).filter(([_, count]) => count === 2);
  if (ranksBy2.length > 0) {
    return parseInt(ranksBy2[Math.floor(Math.random() * ranksBy2.length)][0]);
  }
  
  // Otherwise pick random rank from hand
  const ranks = Object.keys(rankCounts).map(Number);
  return ranks[Math.floor(Math.random() * ranks.length)];
}

// AI helper: choose which player to ask
function aiChooseTarget(players: GoFishPlayer[], myIndex: number): number {
  // Pick random opponent (exclude self)
  const opponents = players.map((_, i) => i).filter(i => i !== myIndex && players[i].hand.length > 0);
  if (opponents.length === 0) return -1;
  return opponents[Math.floor(Math.random() * opponents.length)];
}

export function GoFishGame() {
  const [gameState, setGameState] = useState<GoFishState>(createInitialState());
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showRankPicker, setShowRankPicker] = useState(false);
  const [pendingHumanGoFish, setPendingHumanGoFish] = useState<PendingHumanGoFish | null>(null);
  const [showWinConfetti, setShowWinConfetti] = useState(false);
  const [confettiSize, setConfettiSize] = useState({ width: 0, height: 0 });
  const aiThinkingRef = useRef(false);

  // Confetti when human wins (has most books at game end)
  useEffect(() => {
    if (gameState.status !== "gameEnd" || gameState.players.length === 0) return;
    const maxBooks = Math.max(...gameState.players.map(p => p.books.length));
    const humanPlayer = gameState.players.find(p => p.type === "human");
    if (humanPlayer && humanPlayer.books.length === maxBooks) {
      setConfettiSize({ width: typeof window !== "undefined" ? window.innerWidth : 0, height: typeof window !== "undefined" ? window.innerHeight : 0 });
      setShowWinConfetti(true);
    }
  }, [gameState.status, gameState.players]);

  useEffect(() => {
    if (!showWinConfetti) return;
    const t = setTimeout(() => setShowWinConfetti(false), 5000);
    return () => clearTimeout(t);
  }, [showWinConfetti]);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = currentPlayer?.type === "human";
  const humanPlayer = gameState.players.find(p => p.type === "human");

  // Get ranks in player's hand
  const getHandRanks = (hand: Card[]): number[] => {
    const ranks = new Set(hand.map(c => c.rank));
    return Array.from(ranks).sort((a, b) => a - b);
  };

  // Check for books (4 of a kind)
  const checkForBooks = useCallback((playerIndex: number) => {
    setGameState(prev => {
      const player = prev.players[playerIndex];
      const rankCounts: Record<number, Card[]> = {};
      
      player.hand.forEach(card => {
        if (!rankCounts[card.rank]) rankCounts[card.rank] = [];
        rankCounts[card.rank].push(card);
      });

      let newBooks = [...player.books];
      let newHand = [...player.hand];
      let bookMade = false;

      Object.entries(rankCounts).forEach(([rank, cards]) => {
        if (cards.length === 4) {
          newBooks.push(cards.map(c => c.rank));
          newHand = newHand.filter(c => c.rank !== parseInt(rank));
          bookMade = true;
        }
      });

      if (!bookMade) return prev;

      const newPlayers = prev.players.map((p, i) => 
        i === playerIndex ? { ...p, hand: newHand, books: newBooks } : p
      );

      return {
        ...prev,
        players: newPlayers,
        message: `${player.name} completed a book!`,
      };
    });
  }, []);

  // Draw cards when hand is empty
  const drawNewHand = useCallback((playerIndex: number) => {
    setGameState(prev => {
      const player = prev.players[playerIndex];
      if (player.hand.length > 0 || prev.deck.length === 0) return prev;

      const numCards = prev.players.length === 2 ? 7 : prev.players.length === 3 ? 6 : 5;
      const cardsToDraw = Math.min(numCards, prev.deck.length);
      const { drawn, remaining } = drawCards(prev.deck, cardsToDraw);

      const newPlayers = prev.players.map((p, i) =>
        i === playerIndex ? { ...p, hand: drawn } : p
      );

      return {
        ...prev,
        players: newPlayers,
        deck: remaining,
      };
    });
  }, []);

  // Check for game end
  useEffect(() => {
    if (gameState.status !== "playing") return;

    // Game ends when all 13 books are made
    const totalBooks = gameState.players.reduce((sum, p) => sum + p.books.length, 0);
    if (totalBooks === 13) {
      const maxBooks = Math.max(...gameState.players.map(p => p.books.length));
      const winners = gameState.players.filter(p => p.books.length === maxBooks);
      
      setGameState(prev => ({
        ...prev,
        status: "gameEnd",
        message: winners.length === 1 
          ? `${winners[0].name} wins with ${maxBooks} books!`
          : `It's a tie with ${maxBooks} books each!`,
      }));
    }
  }, [gameState.players, gameState.status]);

  // AI turn logic
  useEffect(() => {
    if (
      gameState.status !== "playing" ||
      !currentPlayer ||
      currentPlayer.type !== "ai" ||
      aiThinkingRef.current ||
      currentPlayer.hand.length === 0 ||
      pendingHumanGoFish !== null // waiting for human to click "Go Fish"
    ) {
      return;
    }

    const playAITurn = async () => {
      aiThinkingRef.current = true;
      
      await delay(1000);

      const targetIndex = aiChooseTarget(gameState.players, gameState.currentPlayerIndex);
      if (targetIndex === -1) {
        aiThinkingRef.current = false;
        return;
      }

      const rank = aiChooseRank(currentPlayer.hand);
      const target = gameState.players[targetIndex];
      const rankLabel = RANK_DISPLAY[rank as Rank];

      setGameState(prev => ({
        ...prev,
        message: `${currentPlayer.name} asks ${target.name} for ${rankLabel}s...`,
        turnLog: [...prev.turnLog.slice(-19), { asker: currentPlayer.name, target: target.name, rank: rankLabel, result: "..." }],
      }));

      await delay(1500);

      // Check if target has the rank
      const matchingCards = target.hand.filter(c => c.rank === rank);

      if (matchingCards.length > 0) {
        // Got cards!
        setGameState(prev => {
          const newPlayers = prev.players.map((p, i) => {
            if (i === gameState.currentPlayerIndex) {
              return { ...p, hand: [...p.hand, ...matchingCards] };
            }
            if (i === targetIndex) {
              return { ...p, hand: p.hand.filter(c => c.rank !== rank) };
            }
            return p;
          });
          const result = `${currentPlayer.name} got ${matchingCards.length} ${rankLabel}${matchingCards.length > 1 ? "s" : ""} from ${target.name}`;
          return {
            ...prev,
            players: newPlayers,
            lastAction: result + "!",
            turnLog: prev.turnLog.length
              ? [...prev.turnLog.slice(0, -1), { ...prev.turnLog[prev.turnLog.length - 1], result }]
              : prev.turnLog,
          };
        });

        await delay(1000);
        checkForBooks(gameState.currentPlayerIndex);

        // AI gets another turn
        aiThinkingRef.current = false;
      } else {
        // Go Fish! – person who was asked draws (in standard rules)
        setGameState(prev => ({
          ...prev,
          lastAction: `${target.name} says "Go Fish!"`,
          turnLog: prev.turnLog.length
            ? [...prev.turnLog.slice(0, -1), { ...prev.turnLog[prev.turnLog.length - 1], result: "Go Fish!" }]
            : prev.turnLog,
        }));

        await delay(1000);

        // When AI asked the human and human has no cards: wait for human to click "Go Fish"
        if (target.type === "human") {
          setPendingHumanGoFish({ askerIndex: gameState.currentPlayerIndex, askedRank: rank });
          aiThinkingRef.current = false;
          return;
        }

        // When AI asked another AI: that AI (target) draws
        if (gameState.deck.length > 0) {
          const { drawn, remaining } = drawCards(gameState.deck, 1);
          const drawnCard = drawn[0];

          setGameState(prev => {
            const newPlayers = prev.players.map((p, i) =>
              i === targetIndex ? { ...p, hand: [...p.hand, drawnCard] } : p
            );
            const gotAskedRank = drawnCard.rank === rank;
            const result = gotAskedRank
              ? `${target.name} drew a ${rankLabel}!`
              : `${target.name} drew a card.`;
            return {
              ...prev,
              players: newPlayers,
              deck: remaining,
              lastAction: result,
            };
          });

          await delay(500);
          checkForBooks(targetIndex);

          // If target drew the asked rank, target gets another turn
          if (drawn[0].rank === rank) {
            setGameState(prev => ({
              ...prev,
              currentPlayerIndex: targetIndex,
              message: "",
            }));
            aiThinkingRef.current = false;
            return;
          }
        }

        // Next player's turn (after asker)
        setGameState(prev => ({
          ...prev,
          currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length,
          message: "",
        }));

        aiThinkingRef.current = false;
      }
    };

    playAITurn();
  }, [gameState.currentPlayerIndex, gameState.status, currentPlayer, checkForBooks, gameState.players, gameState.deck, pendingHumanGoFish]);

  // Start game
  const startGame = useCallback((numPlayers: number) => {
    const players: GoFishPlayer[] = [
      { ...createHumanPlayer("You"), books: [] } as GoFishPlayer,
    ];
    
    for (let i = 1; i < numPlayers; i++) {
      players.push({ ...createAIPlayer(i), books: [] } as GoFishPlayer);
    }

    let deck = shuffleDeck(createDeck(true));
    const cardsPerPlayer = numPlayers === 2 ? 7 : numPlayers === 3 ? 6 : 5;

    for (const player of players) {
      const { drawn, remaining } = drawCards(deck, cardsPerPlayer);
      player.hand = drawn;
      deck = remaining;
    }

    setGameState({
      players,
      deck,
      currentPlayerIndex: 0,
      status: "playing",
      message: "Your turn! Select a rank and ask an opponent.",
      lastAction: "",
      turnLog: [],
    });
    setShowSetupModal(false);
    setPendingHumanGoFish(null);
  }, []);

  // Human asks for a rank
  const askForRank = useCallback(async () => {
    if (selectedRank === null || selectedTarget === null) return;

    const target = gameState.players[selectedTarget];
    const matchingCards = target.hand.filter(c => c.rank === selectedRank);
    const rankLabel = RANK_DISPLAY[selectedRank as Rank];

    setGameState(prev => ({
      ...prev,
      message: `You ask ${target.name} for ${rankLabel}s...`,
      turnLog: [...prev.turnLog, { asker: "You", target: target.name, rank: rankLabel, result: "..." }],
    }));

    await delay(1000);

    if (matchingCards.length > 0) {
      // Got cards!
      setGameState(prev => {
        const newPlayers = prev.players.map((p, i) => {
          if (i === gameState.currentPlayerIndex) {
            return { ...p, hand: [...p.hand, ...matchingCards] };
          }
          if (i === selectedTarget) {
            return { ...p, hand: p.hand.filter(c => c.rank !== selectedRank) };
          }
          return p;
        });
        const result = `You got ${matchingCards.length} ${rankLabel}${matchingCards.length > 1 ? "s" : ""}!`;
        return {
          ...prev,
          players: newPlayers,
          lastAction: result,
          message: "You get another turn!",
          turnLog: prev.turnLog.length
            ? [...prev.turnLog.slice(0, -1), { ...prev.turnLog[prev.turnLog.length - 1], result }]
            : prev.turnLog,
        };
      });

      checkForBooks(gameState.currentPlayerIndex);
    } else {
      // Go Fish!
      setGameState(prev => ({
        ...prev,
        lastAction: `${target.name} says "Go Fish!"`,
        turnLog: prev.turnLog.length
          ? [...prev.turnLog.slice(0, -1), { ...prev.turnLog[prev.turnLog.length - 1], result: "Go Fish!" }]
          : prev.turnLog,
      }));

      await delay(1000);

      if (gameState.deck.length > 0) {
        const { drawn, remaining } = drawCards(gameState.deck, 1);
        const drawnCard = drawn[0];

        setGameState(prev => {
          const newPlayers = prev.players.map((p, i) =>
            i === gameState.currentPlayerIndex ? { ...p, hand: [...p.hand, drawnCard] } : p
          );

          const gotAskedRank = drawnCard.rank === selectedRank;

          return {
            ...prev,
            players: newPlayers,
            deck: remaining,
            lastAction: `You drew a ${RANK_DISPLAY[drawnCard.rank]}!`,
            message: gotAskedRank ? "You drew what you asked for! Go again!" : "",
            currentPlayerIndex: gotAskedRank
              ? prev.currentPlayerIndex
              : (prev.currentPlayerIndex + 1) % prev.players.length,
          };
        });

        checkForBooks(gameState.currentPlayerIndex);
      } else {
        setGameState(prev => ({
          ...prev,
          currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length,
          message: "",
        }));
      }
    }

    setSelectedRank(null);
    setSelectedTarget(null);
    setShowRankPicker(false);
  }, [selectedRank, selectedTarget, gameState, checkForBooks]);

  // Human clicks "Go Fish" when an AI asked them and they had no cards
  const handleHumanGoFish = useCallback(() => {
    if (!pendingHumanGoFish || gameState.deck.length === 0) return;

    const humanIndex = gameState.players.findIndex(p => p.type === "human");
    if (humanIndex === -1) return;

    const { drawn, remaining } = drawCards(gameState.deck, 1);
    const drawnCard = drawn[0];
    const rankLabel = RANK_DISPLAY[pendingHumanGoFish.askedRank as Rank];

    setGameState(prev => {
      const newPlayers = prev.players.map((p, i) =>
        i === humanIndex ? { ...p, hand: [...p.hand, drawnCard] } : p
      );
      const result = drawnCard.rank === pendingHumanGoFish.askedRank
        ? `You drew a ${rankLabel}!`
        : "You drew a card.";
      return {
        ...prev,
        players: newPlayers,
        deck: remaining,
        lastAction: result,
        message: "",
        currentPlayerIndex: (pendingHumanGoFish.askerIndex + 1) % prev.players.length,
      };
    });

    setPendingHumanGoFish(null);
    checkForBooks(humanIndex);
  }, [pendingHumanGoFish, gameState.deck, gameState.players, checkForBooks]);

  // Handle hand empty
  useEffect(() => {
    if (gameState.status !== "playing") return;
    gameState.players.forEach((_, i) => drawNewHand(i));
  }, [gameState.players, gameState.status, drawNewHand]);

  const handRanks = humanPlayer ? getHandRanks(humanPlayer.hand) : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] py-8 relative">
      <div className="container max-w-4xl">
        {/* Header - stack on mobile so title and buttons don't squash */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/games/cards" className="text-[var(--muted-foreground)] hover:text-white transition-colors flex-shrink-0" aria-label="Back to card games">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-heading truncate">Go Fish</h1>
              <p className="text-sm text-[var(--muted-foreground)]">Collect books of four!</p>
            </div>
          </div>
          <div className="flex-shrink-0 self-end sm:self-auto">
            <Button variant="primary" size="sm" onClick={() => setShowSetupModal(true)}>
              New Game
            </Button>
          </div>
        </div>

        {/* Game Board */}
        <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] rounded-xl p-6">
          {gameState.status === "idle" ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <div className="text-6xl mb-6">🐟</div>
              <h2 className="text-2xl font-heading mb-4">Go Fish</h2>
              <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                Collect books of four cards by asking opponents for specific ranks.
                The player with the most books wins!
              </p>
              <Button variant="primary" size="lg" onClick={() => setShowSetupModal(true)}>
                Start Game
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Opponents */}
              <div className="flex justify-center gap-8 mb-6 flex-wrap">
                {gameState.players.map((player, idx) => {
                  if (player.type === "human") return null;
                  const isCurrent = idx === gameState.currentPlayerIndex;
                  const isSelected = selectedTarget === idx;

                  return (
                    <div
                      key={player.id}
                      className={`text-center cursor-pointer p-3 rounded-lg transition-all ${
                        isSelected ? "bg-[var(--color-main-1)]/20 ring-2 ring-[var(--color-main-1)]" : 
                        isHumanTurn && player.hand.length > 0 ? "hover:bg-[var(--color-dark-3)]/50" : ""
                      }`}
                      onClick={() => {
                        if (isHumanTurn && player.hand.length > 0) {
                          setSelectedTarget(idx);
                        }
                      }}
                    >
                      <div className={`text-sm mb-2 ${isCurrent ? "text-[var(--color-main-1)]" : "text-[var(--muted-foreground)]"}`}>
                        {player.name} {isCurrent && "⬅"}
                      </div>
                      <div className="flex justify-center mb-2">
                        {Array(Math.min(player.hand.length, 7)).fill(0).map((_, i) => (
                          <div key={i} className="w-8 h-12 bg-gradient-to-br from-[var(--color-main-1)] to-purple-700 rounded border border-[var(--color-dark-4)] -ml-4 first:ml-0" />
                        ))}
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {player.hand.length} cards • {player.books.length} books
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Turn log – what each player asked for */}
              {gameState.turnLog.length > 0 && (
                <div className="mb-4 p-3 bg-[var(--color-dark-3)]/30 rounded-lg border border-[var(--color-dark-4)] max-h-32 overflow-y-auto">
                  <div className="text-xs font-medium text-[var(--muted-foreground)] mb-2">Turn history</div>
                  <ul className="text-sm space-y-1">
                    {gameState.turnLog.map((entry, i) => (
                      <li key={i} className="flex flex-wrap gap-x-1 gap-y-0.5 items-baseline">
                        <span className="text-white/90">{entry.asker}</span>
                        <span className="text-[var(--muted-foreground)]">asked</span>
                        <span className="text-white/90">{entry.target}</span>
                        <span className="text-[var(--muted-foreground)]">for</span>
                        <span className="font-medium text-[var(--color-main-1)]">{entry.rank}s</span>
                        <span className="text-[var(--muted-foreground)]">→</span>
                        <span className={entry.result === "Go Fish!" ? "text-amber-400" : "text-green-400/90"}>
                          {entry.result}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Center - Deck and Messages */}
              <div className="flex justify-center items-center gap-8 mb-6">
                <div className="text-center">
                  <div className="w-[70px] h-[100px] bg-gradient-to-br from-[var(--color-main-1)] to-purple-700 rounded-lg border-2 border-[var(--color-dark-4)] flex items-center justify-center">
                    <span className="text-white/70 text-sm font-medium">{gameState.deck.length}</span>
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-1">Draw Pile</div>
                </div>

                <div className="text-center max-w-xs">
                  {gameState.lastAction && (
                    <motion.div
                      key={gameState.lastAction}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-lg mb-2"
                    >
                      {gameState.lastAction.includes("Go Fish") && "🐟 "}
                      {gameState.lastAction}
                    </motion.div>
                  )}
                  {gameState.message && (
                    <div className="text-sm text-[var(--muted-foreground)]">
                      {gameState.message}
                    </div>
                  )}
                </div>
              </div>

              {/* Human player hand */}
              {humanPlayer && (
                <div className="border-t border-[var(--color-dark-3)] pt-6">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-sm text-[var(--muted-foreground)]">
                      Your Hand ({humanPlayer.hand.length} cards)
                    </div>
                    <div className="text-sm text-[var(--color-main-1)]">
                      {humanPlayer.books.length} books
                    </div>
                  </div>
                  <div className="flex justify-center flex-wrap gap-2 mb-4">
                    {humanPlayer.hand.map((card) => (
                      <PlayingCard key={card.id} card={card} />
                    ))}
                  </div>

                  {/* Go Fish button – when an AI asked you for cards and you had none */}
                  {pendingHumanGoFish && (
                    <div className="flex flex-col items-center gap-3 mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                      <p className="text-sm text-amber-200 text-center">
                        You don&apos;t have any {RANK_DISPLAY[pendingHumanGoFish.askedRank as Rank]}s. Draw a card!
                      </p>
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleHumanGoFish}
                        disabled={gameState.deck.length === 0}
                        className="text-lg px-8"
                      >
                        🐟 Go Fish
                      </Button>
                    </div>
                  )}

                  {/* Action buttons – only when it's your turn and no pending Go Fish */}
                  {isHumanTurn && humanPlayer.hand.length > 0 && !pendingHumanGoFish && (
                    <div className="flex justify-center gap-3">
                      {selectedTarget !== null ? (
                        <Button variant="primary" onClick={() => setShowRankPicker(true)}>
                          Ask {gameState.players[selectedTarget].name} for a card
                        </Button>
                      ) : (
                        <div className="text-sm text-[var(--muted-foreground)]">
                          Click on an opponent to ask them for cards
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Rank Picker Modal */}
        <AnimatePresence>
          {showRankPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowRankPicker(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-heading mb-4 text-center">
                  What rank do you want to ask for?
                </h3>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {handRanks.map(rank => (
                    <button
                      key={rank}
                      className={`p-3 rounded-lg text-lg font-bold transition-colors ${
                        selectedRank === rank 
                          ? "bg-[var(--color-main-1)] text-white" 
                          : "bg-[var(--color-dark-3)]/50 hover:bg-[var(--color-dark-3)]"
                      }`}
                      onClick={() => setSelectedRank(rank)}
                    >
                      {RANK_DISPLAY[rank as Rank]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowRankPicker(false)}>
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    className="flex-1" 
                    onClick={askForRank}
                    disabled={selectedRank === null}
                  >
                    Ask!
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Setup Modal */}
        <AnimatePresence>
          {showSetupModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowSetupModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-heading mb-4 text-center">New Game</h2>
                <div className="grid grid-cols-3 gap-3">
                  {[2, 3, 4].map(num => (
                    <button
                      key={num}
                      className="p-4 bg-[var(--color-dark-3)]/50 hover:bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg transition-colors"
                      onClick={() => startGame(num)}
                    >
                      <div className="text-2xl mb-1">👥</div>
                      <div className="font-medium">{num} Players</div>
                      <div className="text-xs text-[var(--muted-foreground)]">You vs {num - 1} AI</div>
                    </button>
                  ))}
                </div>
                <button
                  className="mt-4 w-full text-sm text-[var(--muted-foreground)] hover:text-white transition-colors"
                  onClick={() => setShowSetupModal(false)}
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game End Modal */}
        <AnimatePresence>
          {gameState.status === "gameEnd" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
              {showWinConfetti && confettiSize.width > 0 && confettiSize.height > 0 && (
                <div className="absolute inset-0 pointer-events-none z-[1]">
                  <Confetti
                    width={confettiSize.width}
                    height={confettiSize.height}
                    recycle={false}
                    numberOfPieces={200}
                    colors={["#e87b35", "#22c55e", "#fbbf24", "#a855f7", "#ec4899"]}
                    style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
                  />
                </div>
              )}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative z-[2] bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-8 max-w-md w-full text-center"
              >
                <motion.div
                  className="text-6xl mb-4"
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, repeat: 3 }}
                >
                  🏆
                </motion.div>
                <h2 className="text-2xl font-heading mb-4">Game Over!</h2>
                <div className="space-y-2 mb-6">
                  {gameState.players
                    .sort((a, b) => b.books.length - a.books.length)
                    .map((player, idx) => (
                      <div key={player.id} className="flex justify-between p-2 bg-[var(--color-dark-3)]/50 rounded">
                        <span>{idx === 0 ? "👑 " : ""}{player.name}</span>
                        <span>{player.books.length} books</span>
                      </div>
                    ))}
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">What would you like to do?</p>
                <div className="flex flex-col gap-3">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      setGameState(prev => ({ ...prev, status: "idle" }));
                      setShowSetupModal(true);
                    }}
                  >
                    Change Settings
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => startGame(gameState.players.length)}
                  >
                    Play Again
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setGameState(createInitialState())}
                  >
                    Main Menu
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

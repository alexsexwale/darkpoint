"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Confetti from "react-confetti";
import { Button } from "@/components/ui";
import {
  Card,
  Suit,
  createDeckWithSuits,
  shuffleDeck,
  flipCard,
  isValidRun,
  isCompleteRun,
} from "@/lib/cardGames";
import {
  PlayingCard,
  CardSlot,
  DeckPile,
  CARD_WIDTH,
  CARD_HEIGHT,
} from "@/lib/cardGames/cardRenderer";
import { formatTime, deepClone } from "@/lib/cardGames/utils";

type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTY_CONFIG: Record<Difficulty, { suits: Suit[]; label: string; description: string }> = {
  easy: { suits: ["spades"], label: "1 Suit", description: "Beginner - All Spades" },
  medium: { suits: ["spades", "hearts"], label: "2 Suits", description: "Intermediate - Spades & Hearts" },
  hard: { suits: ["spades", "hearts", "diamonds", "clubs"], label: "4 Suits", description: "Expert - All Suits" },
};

interface SpiderState {
  tableaus: Card[][];
  stock: Card[];
  completed: number; // Number of completed sequences (0-8)
  moves: number;
  score: number;
  startTime: number | null;
  status: "idle" | "playing" | "won";
  difficulty: Difficulty;
}

interface DragData {
  cards: Card[];
  tableauIndex: number;
  cardIndex: number;
}

interface SelectionData {
  tableauIndex: number;
  cardIndex: number;
  cards: Card[];
}

const createInitialState = (): SpiderState => ({
  tableaus: Array(10).fill([]).map(() => []),
  stock: [],
  completed: 0,
  moves: 0,
  score: 500,
  startTime: null,
  status: "idle",
  difficulty: "easy",
});

export function SpiderSolitaireGame() {
  const [gameState, setGameState] = useState<SpiderState>(createInitialState());
  const [history, setHistory] = useState<SpiderState[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [dragData, setDragData] = useState<DragData | null>(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [selection, setSelection] = useState<SelectionData | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showWinConfetti, setShowWinConfetti] = useState(false);
  const [confettiSize, setConfettiSize] = useState({ width: 0, height: 0 });

  // Confetti when user wins
  useEffect(() => {
    if (gameState.status === "won") {
      setConfettiSize({ width: typeof window !== "undefined" ? window.innerWidth : 0, height: typeof window !== "undefined" ? window.innerHeight : 0 });
      setShowWinConfetti(true);
    }
  }, [gameState.status]);

  useEffect(() => {
    if (!showWinConfetti) return;
    const t = setTimeout(() => setShowWinConfetti(false), 5000);
    return () => clearTimeout(t);
  }, [showWinConfetti]);

  useEffect(() => {
    const checkMobile = () => {
      // Portrait phone (narrow), landscape phone (short height), or any touch device
      const narrow = window.matchMedia("(max-width: 768px)").matches;
      const landscapePhone = window.matchMedia("(max-height: 500px)").matches;
      const touchDevice = "ontouchstart" in window;
      setIsMobile(narrow || landscapePhone || touchDevice);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    window.addEventListener("orientationchange", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("orientationchange", checkMobile);
    };
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (gameState.status === "playing" && gameState.startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - gameState.startTime!) / 1000));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState.status, gameState.startTime]);

  // Check for win
  useEffect(() => {
    if (gameState.status === "playing" && gameState.completed === 8) {
      setGameState(prev => ({ ...prev, status: "won" }));
      setShowWinModal(true);
    }
  }, [gameState.completed, gameState.status]);

  // Deal new game
  const dealNewGame = useCallback((difficulty: Difficulty) => {
    const config = DIFFICULTY_CONFIG[difficulty];
    // Need 104 cards (8 complete decks worth in terms of sequences)
    const deckCount = 8 / config.suits.length;
    const deck = shuffleDeck(createDeckWithSuits(config.suits, deckCount));
    
    const tableaus: Card[][] = Array(10).fill(null).map(() => []);
    let cardIndex = 0;

    // Deal 54 cards to tableaus
    // First 4 columns get 6 cards, last 6 columns get 5 cards
    for (let col = 0; col < 10; col++) {
      const numCards = col < 4 ? 6 : 5;
      for (let row = 0; row < numCards; row++) {
        const card = deck[cardIndex++];
        // Top card is face up
        tableaus[col].push({
          ...card,
          faceUp: row === numCards - 1,
        });
      }
    }

    // Remaining 50 cards go to stock
    const stock = deck.slice(cardIndex).map(c => ({ ...c, faceUp: false }));

    setGameState({
      tableaus,
      stock,
      completed: 0,
      moves: 0,
      score: 500,
      startTime: Date.now(),
      status: "playing",
      difficulty,
    });
    setHistory([]);
    setElapsedTime(0);
    setShowWinModal(false);
    setShowDifficultyModal(false);
  }, []);

  // Save state for undo
  const saveState = useCallback(() => {
    setHistory(prev => [...prev.slice(-50), deepClone(gameState)]);
  }, [gameState]);

  // Undo last move
  const undo = useCallback(() => {
    if (history.length > 0) {
      const prevState = history[history.length - 1];
      setGameState(prevState);
      setHistory(prev => prev.slice(0, -1));
    }
  }, [history]);

  // Deal from stock (10 cards, one to each column)
  const dealFromStock = useCallback(() => {
    if (gameState.status !== "playing") return;
    if (gameState.stock.length === 0) return;
    
    // Check if all tableaus have at least one card
    if (gameState.tableaus.some(t => t.length === 0)) {
      return; // Can't deal if any tableau is empty
    }

    saveState();

    setGameState(prev => {
      const newStock = [...prev.stock];
      const newTableaus = prev.tableaus.map(tableau => {
        if (newStock.length > 0) {
          const card = newStock.shift()!;
          return [...tableau, { ...card, faceUp: true }];
        }
        return tableau;
      });

      return {
        ...prev,
        tableaus: newTableaus,
        stock: newStock,
        moves: prev.moves + 1,
        score: prev.score - 1,
      };
    });
  }, [gameState.status, gameState.stock.length, gameState.tableaus, saveState]);

  // Check and remove complete sequences
  const checkAndRemoveSequences = useCallback((tableaus: Card[][]): { tableaus: Card[][], removed: number } => {
    let removed = 0;
    const newTableaus = tableaus.map(tableau => {
      if (tableau.length < 13) return tableau;
      
      // Check if last 13 cards form a complete sequence
      const last13 = tableau.slice(-13);
      if (isCompleteRun(last13) && last13.every(c => c.faceUp)) {
        removed++;
        const remaining = tableau.slice(0, -13);
        // Flip new top card if needed
        if (remaining.length > 0 && !remaining[remaining.length - 1].faceUp) {
          remaining[remaining.length - 1] = flipCard(remaining[remaining.length - 1], true);
        }
        return remaining;
      }
      return tableau;
    });

    return { tableaus: newTableaus, removed };
  }, []);

  // Move cards between tableaus
  const moveCards = useCallback((
    sourceIndex: number,
    cardIndex: number,
    targetIndex: number
  ) => {
    if (gameState.status !== "playing") return false;
    if (sourceIndex === targetIndex) return false;

    const sourceTableau = gameState.tableaus[sourceIndex];
    const targetTableau = gameState.tableaus[targetIndex];
    const cardsToMove = sourceTableau.slice(cardIndex);

    // Check if cards form a valid run (same suit, descending)
    if (!isValidRun(cardsToMove)) return false;

    // Check if move is valid
    if (targetTableau.length > 0) {
      const targetTop = targetTableau[targetTableau.length - 1];
      if (cardsToMove[0].rank !== targetTop.rank - 1) return false;
    }

    saveState();

    setGameState(prev => {
      let newTableaus = prev.tableaus.map((tableau, i) => {
        if (i === sourceIndex) {
          const remaining = tableau.slice(0, cardIndex);
          // Flip new top card
          if (remaining.length > 0 && !remaining[remaining.length - 1].faceUp) {
            remaining[remaining.length - 1] = flipCard(remaining[remaining.length - 1], true);
          }
          return remaining;
        }
        if (i === targetIndex) {
          return [...tableau, ...cardsToMove];
        }
        return tableau;
      });

      // Check for completed sequences
      const { tableaus: finalTableaus, removed } = checkAndRemoveSequences(newTableaus);

      return {
        ...prev,
        tableaus: finalTableaus,
        moves: prev.moves + 1,
        score: prev.score - 1 + (removed * 100),
        completed: prev.completed + removed,
      };
    });

    return true;
  }, [gameState.status, gameState.tableaus, saveState, checkAndRemoveSequences]);

  // Check if a run of cards can be moved (must be same suit and sequential)
  const getMovableCardsFromIndex = (tableau: Card[], fromIndex: number): Card[] | null => {
    const cards = tableau.slice(fromIndex);
    if (cards.length === 0) return null;
    if (!cards.every(c => c.faceUp)) return null;
    if (!isValidRun(cards)) return null;
    return cards;
  };

  // Drag handlers
  const handleDragStart = (tableauIndex: number, cardIndex: number) => {
    const cards = getMovableCardsFromIndex(gameState.tableaus[tableauIndex], cardIndex);
    if (cards) {
      setDragData({ cards, tableauIndex, cardIndex });
    }
  };

  const handleDrop = (targetIndex: number) => {
    if (!dragData) return;
    moveCards(dragData.tableauIndex, dragData.cardIndex, targetIndex);
    setDragData(null);
  };

  // Mobile tap-to-select handlers
  const handleCardSelect = (tableauIndex: number, cardIndex: number) => {
    if (!isMobile) return;
    const cards = getMovableCardsFromIndex(gameState.tableaus[tableauIndex], cardIndex);
    if (!cards) return;
    if (selection?.tableauIndex === tableauIndex && selection?.cardIndex === cardIndex) {
      setSelection(null);
      return;
    }
    setSelection({ tableauIndex, cardIndex, cards });
  };

  const handleTableauTap = (targetIndex: number) => {
    if (!isMobile || !selection) return;
    const moved = moveCards(selection.tableauIndex, selection.cardIndex, targetIndex);
    if (moved) setSelection(null);
  };

  const isCardSelected = (tableauIndex: number, cardIndex: number) => {
    return selection?.tableauIndex === tableauIndex && selection?.cardIndex === cardIndex;
  };

  const clearSelection = () => setSelection(null);

  // Can deal from stock?
  const canDeal = gameState.stock.length > 0 && !gameState.tableaus.some(t => t.length === 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] py-8 relative">
      {showWinConfetti && confettiSize.width > 0 && confettiSize.height > 0 && (
        <Confetti
          width={confettiSize.width}
          height={confettiSize.height}
          recycle={false}
          numberOfPieces={200}
          colors={["#e87b35", "#22c55e", "#fbbf24", "#a855f7", "#ec4899"]}
          style={{ position: "fixed", pointerEvents: "none" }}
        />
      )}
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="flex flex-col gap-3 mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/games/cards"
                className="text-[var(--muted-foreground)] hover:text-white transition-colors"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-heading">Spider Solitaire</h1>
                {gameState.status !== "idle" && (
                  <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">
                    {DIFFICULTY_CONFIG[gameState.difficulty].label}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {gameState.status === "playing" && (
                <Button variant="outline" size="sm" onClick={undo} disabled={history.length === 0} className="text-xs sm:text-sm px-2 sm:px-3">
                  Undo
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={() => setShowDifficultyModal(true)} className="text-xs sm:text-sm px-2 sm:px-3">
                New Game
              </Button>
            </div>
          </div>
          {gameState.status !== "idle" && (
            <div className="flex items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
              <span><span className="text-[var(--muted-foreground)]">Time:</span> {formatTime(elapsedTime)}</span>
              <span><span className="text-[var(--muted-foreground)]">Score:</span> {gameState.score}</span>
              <span><span className="text-[var(--muted-foreground)]">Completed:</span> {gameState.completed}/8</span>
            </div>
          )}
        </div>

        {/* Mobile selection hint */}
        {isMobile && selection && gameState.status === "playing" && (
          <div className="bg-[var(--color-main-1)]/20 border border-[var(--color-main-1)] rounded-lg p-3 mb-4 text-center">
            <p className="text-sm text-[var(--color-main-1)]">
              Card selected! Tap a column to move, or tap the card again to deselect.
            </p>
          </div>
        )}

        {/* Game Board - z-10 so cards stay above fixed side elements in landscape */}
        <div
          className="relative z-10 bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] rounded-xl p-3 sm:p-4 touch-manipulation"
          onClick={clearSelection}
          style={{ touchAction: "manipulation" }}
        >
          {gameState.status === "idle" ? (
            // Start screen
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8 sm:py-16"
            >
              <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">🕷️</div>
              <h2 className="text-xl sm:text-2xl font-heading mb-3 sm:mb-4">Spider Solitaire</h2>
              <p className="text-[var(--muted-foreground)] mb-4 sm:mb-6 max-w-md mx-auto text-sm sm:text-base px-4">
                {isMobile
                  ? "Tap a card to select it, then tap a column to move. Build sequences King to Ace in the same suit!"
                  : "Build sequences from King to Ace in the same suit. Complete 8 sequences to win!"}
              </p>
              <Button variant="primary" size="lg" onClick={() => setShowDifficultyModal(true)}>
                Choose Difficulty
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Top row: Stock and Completed piles indicator */}
              <div className="flex justify-between items-center mb-3 sm:mb-4 px-1">
                <div style={{ width: CARD_WIDTH * (isMobile ? 0.5 : 0.85), height: CARD_HEIGHT * (isMobile ? 0.5 : 0.85) }}>
                  <div className="transform scale-[0.5] sm:scale-[0.85] origin-top-left">
                    <DeckPile
                      cardsRemaining={gameState.stock.length}
                      onClick={dealFromStock}
                      disabled={!canDeal}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm text-[var(--muted-foreground)]">Completed:</span>
                  <div className="flex gap-0.5 sm:gap-1">
                    {Array(8).fill(0).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-4 sm:w-4 sm:h-6 rounded-sm border ${
                          i < gameState.completed
                            ? "bg-green-500/30 border-green-500"
                            : "bg-[var(--color-dark-3)]/30 border-[var(--color-dark-4)]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Tableaus - scale to fit 10 columns on mobile; touch-manipulation for responsive taps in landscape */}
              <div
                className="flex gap-0.5 sm:gap-2 justify-center w-full relative z-10"
                style={isMobile ? { maxWidth: "100vw", overflow: "hidden", touchAction: "manipulation" } : undefined}
              >
                {gameState.tableaus.map((tableau, tableauIndex) => {
                  const cardScale = isMobile ? 0.5 : 0.85;
                  const colWidth = CARD_WIDTH * cardScale;
                  return (
                    <div
                      key={tableauIndex}
                      className="relative shrink-0"
                      style={{
                        width: colWidth,
                        minHeight: (isMobile ? CARD_HEIGHT * 0.5 : CARD_HEIGHT) + (isMobile ? 180 : 300),
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(tableauIndex)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (tableau.length === 0 && selection) {
                          handleTableauTap(tableauIndex);
                        }
                      }}
                    >
                      {tableau.length === 0 ? (
                        <div className="transform scale-[0.5] sm:scale-[0.85] origin-top-left">
                          <CardSlot />
                        </div>
                      ) : (
                        tableau.map((card, cardIndex) => {
                          const movableCards = card.faceUp ? getMovableCardsFromIndex(tableau, cardIndex) : null;
                          const canDrag = !isMobile && movableCards !== null;
                          const cardOffset = card.faceUp ? (isMobile ? 18 : 22) : (isMobile ? 6 : 8);
                          return (
                            <motion.div
                              key={card.id}
                              className="absolute cursor-pointer touch-manipulation"
                              initial={{ y: -30, opacity: 0 }}
                              animate={{ y: cardIndex * cardOffset, opacity: 1 }}
                              transition={{ delay: cardIndex * 0.01 }}
                              style={{ zIndex: cardIndex, touchAction: "manipulation" }}
                            >
                              <div className="transform scale-[0.5] sm:scale-[0.85] origin-top-left pointer-events-auto">
                                <PlayingCard
                                  card={card}
                                  small
                                  draggable={canDrag}
                                  selected={isCardSelected(tableauIndex, cardIndex)}
                                  onDragStart={() => {
                                    if (canDrag) handleDragStart(tableauIndex, cardIndex);
                                  }}
                                  onClick={() => {
                                    if (!card.faceUp && cardIndex === tableau.length - 1) {
                                      setGameState(prev => ({
                                        ...prev,
                                        tableaus: prev.tableaus.map((t, i) =>
                                          i === tableauIndex
                                            ? t.map((c, ci) => (ci === cardIndex ? flipCard(c, true) : c))
                                            : t
                                        ),
                                      }));
                                      return;
                                    }
                                    if (isMobile && card.faceUp) {
                                      if (selection && (selection.tableauIndex !== tableauIndex || selection.cardIndex !== cardIndex)) {
                                        handleTableauTap(tableauIndex);
                                      } else {
                                        handleCardSelect(tableauIndex, cardIndex);
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Hint if can't deal */}
              {gameState.stock.length > 0 && !canDeal && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-xs sm:text-sm text-yellow-400 mt-3 sm:mt-4"
                >
                  Fill all empty columns before dealing more cards
                </motion.p>
              )}
            </>
          )}
        </div>

        {/* Difficulty Selection Modal */}
        <AnimatePresence>
          {showDifficultyModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowDifficultyModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-heading mb-4 text-center">Choose Difficulty</h2>
                <div className="space-y-3">
                  {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((diff) => {
                    const config = DIFFICULTY_CONFIG[diff];
                    return (
                      <button
                        key={diff}
                        className="w-full p-4 bg-[var(--color-dark-3)]/50 hover:bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg text-left transition-colors"
                        onClick={() => dealNewGame(diff)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{config.label}</div>
                            <div className="text-sm text-[var(--muted-foreground)]">{config.description}</div>
                          </div>
                          <div className={`text-xs px-2 py-1 rounded ${
                            diff === "easy" ? "bg-green-500/20 text-green-400" :
                            diff === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-red-500/20 text-red-400"
                          }`}>
                            {diff === "easy" ? "Beginner" : diff === "medium" ? "Intermediate" : "Expert"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  className="mt-4 w-full text-sm text-[var(--muted-foreground)] hover:text-white transition-colors"
                  onClick={() => setShowDifficultyModal(false)}
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Win Modal */}
        <AnimatePresence>
          {showWinModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowWinModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-8 max-w-md w-full text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  className="text-6xl mb-4"
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, repeat: 3 }}
                >
                  🏆
                </motion.div>
                <h2 className="text-2xl font-heading mb-2">Congratulations!</h2>
                <p className="text-[var(--muted-foreground)] mb-6">
                  You completed Spider Solitaire on {DIFFICULTY_CONFIG[gameState.difficulty].label}!
                </p>
                <div className="flex justify-center gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--color-main-1)]">
                      {gameState.score}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--color-main-1)]">
                      {formatTime(elapsedTime)}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--color-main-1)]">
                      {gameState.moves}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">Moves</div>
                  </div>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setShowWinModal(false)}>
                    Close
                  </Button>
                  <Button variant="primary" onClick={() => setShowDifficultyModal(true)}>
                    Play Again
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

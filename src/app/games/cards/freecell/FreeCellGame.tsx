"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Confetti from "react-confetti";
import { Button } from "@/components/ui";
import {
  Card,
  Suit,
  createDeck,
  shuffleDeck,
  SUIT_SYMBOLS,
  SUIT_COLORS,
} from "@/lib/cardGames";
import {
  PlayingCard,
} from "@/lib/cardGames/cardRenderer";

type GameStatus = "idle" | "playing" | "won";

interface FreeCellState {
  freeCells: (Card | null)[]; // 4 free cells
  foundations: Record<Suit, Card[]>; // 4 foundation piles
  tableau: Card[][]; // 8 tableau columns
  status: GameStatus;
  moves: number;
  selectedCard: { source: string; index: number; card: Card } | null;
  startTime: number | null;
}

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];

const createInitialState = (): FreeCellState => ({
  freeCells: [null, null, null, null],
  foundations: {
    hearts: [],
    diamonds: [],
    clubs: [],
    spades: [],
  },
  tableau: [[], [], [], [], [], [], [], []],
  status: "idle",
  moves: 0,
  selectedCard: null,
  startTime: null,
});

// Check if card can go on foundation
const canPlaceOnFoundation = (card: Card, foundation: Card[]): boolean => {
  if (foundation.length === 0) {
    return card.rank === 1; // Ace
  }
  const topCard = foundation[foundation.length - 1];
  return card.suit === topCard.suit && card.rank === topCard.rank + 1;
};

// Check if card can go on tableau pile
const canPlaceOnTableau = (card: Card, pile: Card[]): boolean => {
  if (pile.length === 0) return true;
  const topCard = pile[pile.length - 1];
  const cardColor = SUIT_COLORS[card.suit];
  const topColor = SUIT_COLORS[topCard.suit];
  return cardColor !== topColor && card.rank === topCard.rank - 1;
};

// Get max cards that can be moved at once
const getMaxMovableCards = (freeCells: (Card | null)[], tableau: Card[][]): number => {
  const emptyFreeCells = freeCells.filter(c => c === null).length;
  const emptyTableaus = tableau.filter(col => col.length === 0).length;
  return (emptyFreeCells + 1) * Math.pow(2, emptyTableaus);
};

// Check if a sequence of cards is valid (alternating colors, descending)
const isValidSequence = (cards: Card[]): boolean => {
  for (let i = 0; i < cards.length - 1; i++) {
    const current = cards[i];
    const next = cards[i + 1];
    const currentColor = SUIT_COLORS[current.suit];
    const nextColor = SUIT_COLORS[next.suit];
    if (currentColor === nextColor || current.rank !== next.rank + 1) {
      return false;
    }
  }
  return true;
};

export function FreeCellGame() {
  const [gameState, setGameState] = useState<FreeCellState>(createInitialState());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [undoStack, setUndoStack] = useState<FreeCellState[]>([]);
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

  // Timer
  useEffect(() => {
    if (gameState.status !== "playing" || !gameState.startTime) return;
    
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - gameState.startTime!) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.status, gameState.startTime]);

  // Check for win
  useEffect(() => {
    if (gameState.status !== "playing") return;
    
    const totalFoundation = SUITS.reduce(
      (sum, suit) => sum + gameState.foundations[suit].length,
      0
    );
    
    if (totalFoundation === 52) {
      setGameState(prev => ({ ...prev, status: "won" }));
    }
  }, [gameState.foundations, gameState.status]);

  // Auto-move to foundation
  const autoMoveToFoundation = useCallback(() => {
    setGameState(prev => {
      let changed = false;
      let newState = { ...prev };

      // Check all sources for cards that can go to foundation
      const checkAndMove = () => {
        // Check free cells
        for (let i = 0; i < 4; i++) {
          const card = newState.freeCells[i];
          if (card && canPlaceOnFoundation(card, newState.foundations[card.suit])) {
            // Check if safe to auto-move (all lower cards of opposite color are on foundations)
            const minRed = Math.min(
              newState.foundations.hearts.length,
              newState.foundations.diamonds.length
            );
            const minBlack = Math.min(
              newState.foundations.clubs.length,
              newState.foundations.spades.length
            );
            const cardColor = SUIT_COLORS[card.suit];
            const oppositeMin = cardColor === "red" ? minBlack : minRed;
            
            if (card.rank <= oppositeMin + 2) {
              newState = {
                ...newState,
                freeCells: newState.freeCells.map((c, idx) => idx === i ? null : c),
                foundations: {
                  ...newState.foundations,
                  [card.suit]: [...newState.foundations[card.suit], card],
                },
                moves: newState.moves + 1,
              };
              changed = true;
              return true;
            }
          }
        }

        // Check tableau
        for (let i = 0; i < 8; i++) {
          const pile = newState.tableau[i];
          if (pile.length === 0) continue;
          const card = pile[pile.length - 1];
          if (canPlaceOnFoundation(card, newState.foundations[card.suit])) {
            const minRed = Math.min(
              newState.foundations.hearts.length,
              newState.foundations.diamonds.length
            );
            const minBlack = Math.min(
              newState.foundations.clubs.length,
              newState.foundations.spades.length
            );
            const cardColor = SUIT_COLORS[card.suit];
            const oppositeMin = cardColor === "red" ? minBlack : minRed;
            
            if (card.rank <= oppositeMin + 2) {
              newState = {
                ...newState,
                tableau: newState.tableau.map((col, idx) => 
                  idx === i ? col.slice(0, -1) : col
                ),
                foundations: {
                  ...newState.foundations,
                  [card.suit]: [...newState.foundations[card.suit], card],
                },
                moves: newState.moves + 1,
              };
              changed = true;
              return true;
            }
          }
        }

        return false;
      };

      // Keep checking until no more moves
      while (checkAndMove()) {}

      return changed ? newState : prev;
    });
  }, []);

  // Run auto-move after each state change
  useEffect(() => {
    if (gameState.status === "playing") {
      const timeout = setTimeout(autoMoveToFoundation, 300);
      return () => clearTimeout(timeout);
    }
  }, [gameState.tableau, gameState.freeCells, autoMoveToFoundation, gameState.status]);

  // Start new game
  const startGame = useCallback((gameNumber?: number) => {
    const deck = shuffleDeck(createDeck(true));
    const tableau: Card[][] = [[], [], [], [], [], [], [], []];

    // Deal cards to tableau (4 columns of 7, 4 columns of 6)
    deck.forEach((card, i) => {
      tableau[i % 8].push({ ...card, faceUp: true });
    });

    setGameState({
      freeCells: [null, null, null, null],
      foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
      tableau,
      status: "playing",
      moves: 0,
      selectedCard: null,
      startTime: Date.now(),
    });
    setElapsedTime(0);
    setUndoStack([]);
  }, []);

  // Handle card click
  const handleCardClick = useCallback((source: string, index: number, card: Card, cardIndex?: number) => {
    setGameState(prev => {
      // If no card selected, select this one
      if (!prev.selectedCard) {
        // Can only select face-up cards
        if (!card.faceUp) return prev;
        
        return {
          ...prev,
          selectedCard: { source, index, card },
        };
      }

      // Same card - deselect
      if (prev.selectedCard.source === source && prev.selectedCard.index === index) {
        return { ...prev, selectedCard: null };
      }

      // Try to move
      const saveState = { ...prev, selectedCard: null };
      
      // Move to free cell
      if (source === "freecell") {
        if (prev.freeCells[index] === null) {
          // Can only move single card to free cell
          if (prev.selectedCard.source === "tableau") {
            const pile = prev.tableau[prev.selectedCard.index];
            if (pile[pile.length - 1].id === prev.selectedCard.card.id) {
              setUndoStack(stack => [...stack, saveState]);
              return {
                ...prev,
                freeCells: prev.freeCells.map((c, i) => i === index ? prev.selectedCard!.card : c),
                tableau: prev.tableau.map((col, i) => 
                  i === prev.selectedCard!.index ? col.slice(0, -1) : col
                ),
                moves: prev.moves + 1,
                selectedCard: null,
              };
            }
          } else if (prev.selectedCard.source === "freecell") {
            setUndoStack(stack => [...stack, saveState]);
            return {
              ...prev,
              freeCells: prev.freeCells.map((c, i) => {
                if (i === index) return prev.selectedCard!.card;
                if (i === prev.selectedCard!.index) return null;
                return c;
              }),
              moves: prev.moves + 1,
              selectedCard: null,
            };
          }
        }
        return { ...prev, selectedCard: null };
      }

      // Move to foundation
      if (source === "foundation") {
        const suit = SUITS[index];
        if (canPlaceOnFoundation(prev.selectedCard.card, prev.foundations[suit])) {
          // Check it's the top card
          if (prev.selectedCard.source === "tableau") {
            const pile = prev.tableau[prev.selectedCard.index];
            if (pile[pile.length - 1].id === prev.selectedCard.card.id) {
              setUndoStack(stack => [...stack, saveState]);
              return {
                ...prev,
                tableau: prev.tableau.map((col, i) => 
                  i === prev.selectedCard!.index ? col.slice(0, -1) : col
                ),
                foundations: {
                  ...prev.foundations,
                  [suit]: [...prev.foundations[suit], prev.selectedCard.card],
                },
                moves: prev.moves + 1,
                selectedCard: null,
              };
            }
          } else if (prev.selectedCard.source === "freecell") {
            setUndoStack(stack => [...stack, saveState]);
            return {
              ...prev,
              freeCells: prev.freeCells.map((c, i) => 
                i === prev.selectedCard!.index ? null : c
              ),
              foundations: {
                ...prev.foundations,
                [suit]: [...prev.foundations[suit], prev.selectedCard.card],
              },
              moves: prev.moves + 1,
              selectedCard: null,
            };
          }
        }
        return { ...prev, selectedCard: null };
      }

      // Move to tableau
      if (source === "tableau") {
        const targetPile = prev.tableau[index];
        
        if (canPlaceOnTableau(prev.selectedCard.card, targetPile)) {
          if (prev.selectedCard.source === "freecell") {
            setUndoStack(stack => [...stack, saveState]);
            return {
              ...prev,
              freeCells: prev.freeCells.map((c, i) => 
                i === prev.selectedCard!.index ? null : c
              ),
              tableau: prev.tableau.map((col, i) => 
                i === index ? [...col, prev.selectedCard!.card] : col
              ),
              moves: prev.moves + 1,
              selectedCard: null,
            };
          } else if (prev.selectedCard.source === "tableau") {
            const sourcePile = prev.tableau[prev.selectedCard.index];
            const cardIdx = sourcePile.findIndex(c => c.id === prev.selectedCard!.card.id);
            
            if (cardIdx !== -1) {
              const cardsToMove = sourcePile.slice(cardIdx);
              
              // Check if valid sequence and can move that many
              if (isValidSequence(cardsToMove)) {
                const maxMovable = getMaxMovableCards(prev.freeCells, prev.tableau);
                if (cardsToMove.length <= maxMovable) {
                  setUndoStack(stack => [...stack, saveState]);
                  return {
                    ...prev,
                    tableau: prev.tableau.map((col, i) => {
                      if (i === prev.selectedCard!.index) return col.slice(0, cardIdx);
                      if (i === index) return [...col, ...cardsToMove];
                      return col;
                    }),
                    moves: prev.moves + 1,
                    selectedCard: null,
                  };
                }
              }
            }
          }
        }
        return { ...prev, selectedCard: null };
      }

      return { ...prev, selectedCard: null };
    });
  }, []);

  // Undo
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const lastState = undoStack[undoStack.length - 1];
    setUndoStack(stack => stack.slice(0, -1));
    setGameState({ ...lastState, moves: gameState.moves + 1 });
  }, [undoStack, gameState.moves]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
      <div className="container max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/games/cards" className="text-[var(--muted-foreground)] hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-heading">FreeCell</h1>
              <p className="text-sm text-[var(--muted-foreground)]">Strategic Solitaire</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {gameState.status === "playing" && (
              <>
                <div className="text-sm text-[var(--muted-foreground)]">
                  {formatTime(elapsedTime)} | {gameState.moves} moves
                </div>
                <Button variant="outline" size="sm" onClick={undo} disabled={undoStack.length === 0}>
                  Undo
                </Button>
              </>
            )}
            <Button variant="primary" size="sm" onClick={() => startGame()}>
              New Game
            </Button>
          </div>
        </div>

        {/* Game Board */}
        <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] rounded-xl p-6">
          {gameState.status === "idle" ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <div className="text-6xl mb-6">🃏</div>
              <h2 className="text-2xl font-heading mb-4">FreeCell</h2>
              <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                Move all cards to the foundation piles, sorted by suit from Ace to King.
                Use the four free cells to temporarily hold cards.
              </p>
              <Button variant="primary" size="lg" onClick={() => startGame()}>
                Start Game
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Top row: Free Cells and Foundations */}
              <div className="flex justify-between mb-6">
                {/* Free Cells */}
                <div className="flex gap-2">
                  {gameState.freeCells.map((card, i) => (
                    <div
                      key={`fc-${i}`}
                      className={`w-[70px] h-[100px] rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
                        gameState.selectedCard?.source === "freecell" && gameState.selectedCard.index === i
                          ? "border-[var(--color-main-1)] bg-[var(--color-main-1)]/20"
                          : "border-[var(--color-dark-4)] hover:border-[var(--color-dark-3)]"
                      }`}
                      onClick={() => card 
                        ? handleCardClick("freecell", i, card)
                        : gameState.selectedCard && handleCardClick("freecell", i, gameState.selectedCard.card)
                      }
                    >
                      {card ? (
                        <PlayingCard card={card} />
                      ) : (
                        <span className="text-[var(--muted-foreground)] text-xs">FREE</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Foundations */}
                <div className="flex gap-2">
                  {SUITS.map((suit, i) => {
                    const pile = gameState.foundations[suit];
                    const topCard = pile[pile.length - 1];
                    return (
                      <div
                        key={suit}
                        className={`w-[70px] h-[100px] rounded-lg border-2 flex items-center justify-center cursor-pointer transition-colors ${
                          topCard ? "border-transparent" : "border-dashed border-[var(--color-dark-4)]"
                        }`}
                        onClick={() => topCard 
                          ? handleCardClick("foundation", i, topCard)
                          : gameState.selectedCard && handleCardClick("foundation", i, gameState.selectedCard.card)
                        }
                      >
                        {topCard ? (
                          <PlayingCard card={topCard} />
                        ) : (
                          <span 
                            className="text-2xl opacity-30"
                            style={{ color: SUIT_COLORS[suit] === "red" ? "#dc2626" : "#fff" }}
                          >
                            {SUIT_SYMBOLS[suit]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tableau */}
              <div className="flex gap-2 justify-center">
                {gameState.tableau.map((pile, colIndex) => (
                  <div
                    key={`col-${colIndex}`}
                    className="w-[70px] min-h-[300px]"
                    onClick={() => pile.length === 0 && gameState.selectedCard && handleCardClick("tableau", colIndex, gameState.selectedCard.card)}
                  >
                    {pile.length === 0 ? (
                      <div className="w-[70px] h-[100px] rounded-lg border-2 border-dashed border-[var(--color-dark-4)]" />
                    ) : (
                      <div className="relative">
                        {pile.map((card, cardIndex) => {
                          const isSelected = 
                            gameState.selectedCard?.source === "tableau" &&
                            gameState.selectedCard.index === colIndex &&
                            pile.findIndex(c => c.id === gameState.selectedCard!.card.id) <= cardIndex;
                          
                          return (
                            <div
                              key={card.id}
                              className={`absolute cursor-pointer transition-transform ${isSelected ? "ring-2 ring-[var(--color-main-1)] rounded-lg" : ""}`}
                              style={{ top: cardIndex * 25 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick("tableau", colIndex, card, cardIndex);
                              }}
                            >
                              <PlayingCard card={card} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Win Modal */}
        <AnimatePresence>
          {gameState.status === "won" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-8 max-w-md w-full text-center"
              >
                <motion.div
                  className="text-6xl mb-4"
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, repeat: 3 }}
                >
                  🎉
                </motion.div>
                <h2 className="text-2xl font-heading mb-2">You Win!</h2>
                <p className="text-[var(--muted-foreground)] mb-6">
                  Completed in {formatTime(elapsedTime)} with {gameState.moves} moves
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setGameState(createInitialState())}>
                    Menu
                  </Button>
                  <Button variant="primary" className="flex-1" onClick={() => startGame()}>
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

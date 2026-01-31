"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  Card,
  Suit,
  SUITS,
  createDeck,
  shuffleDeck,
  flipCard,
  canStackInTableau,
  canStackOnFoundation,
  areOppositeColors,
} from "@/lib/cardGames";
import {
  PlayingCard,
  CardPile,
  CardSlot,
  DeckPile,
  CARD_WIDTH,
  CARD_HEIGHT,
} from "@/lib/cardGames/cardRenderer";
import { formatTime, deepClone } from "@/lib/cardGames/utils";

// Game state interfaces
interface SolitaireState {
  stock: Card[];
  waste: Card[];
  foundations: Record<Suit, Card[]>;
  tableaus: Card[][];
  moves: number;
  startTime: number | null;
  status: "idle" | "playing" | "won";
}

interface DragData {
  cards: Card[];
  source: "waste" | "foundation" | "tableau";
  sourceIndex?: number;
  cardIndex?: number;
}

// Initial empty state
const createInitialState = (): SolitaireState => ({
  stock: [],
  waste: [],
  foundations: {
    hearts: [],
    diamonds: [],
    clubs: [],
    spades: [],
  },
  tableaus: [[], [], [], [], [], [], []],
  moves: 0,
  startTime: null,
  status: "idle",
});

export function SolitaireGame() {
  const [gameState, setGameState] = useState<SolitaireState>(createInitialState());
  const [history, setHistory] = useState<SolitaireState[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [dragData, setDragData] = useState<DragData | null>(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const [autoCompleting, setAutoCompleting] = useState(false);

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
    if (gameState.status === "playing") {
      const totalInFoundations = Object.values(gameState.foundations).reduce(
        (sum, pile) => sum + pile.length,
        0
      );
      if (totalInFoundations === 52) {
        setGameState(prev => ({ ...prev, status: "won" }));
        setShowWinModal(true);
      }
    }
  }, [gameState.foundations, gameState.status]);

  // Deal new game
  const dealNewGame = useCallback(() => {
    const deck = shuffleDeck(createDeck());
    const tableaus: Card[][] = [[], [], [], [], [], [], []];
    let cardIndex = 0;

    // Deal tableau cards
    for (let col = 0; col < 7; col++) {
      for (let row = col; row < 7; row++) {
        const card = deck[cardIndex++];
        // Top card of each column is face up
        tableaus[row].push({
          ...card,
          faceUp: row === col,
        });
      }
    }

    // Remaining cards go to stock
    const stock = deck.slice(cardIndex).map(c => ({ ...c, faceUp: false }));

    setGameState({
      stock,
      waste: [],
      foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
      tableaus,
      moves: 0,
      startTime: Date.now(),
      status: "playing",
    });
    setHistory([]);
    setElapsedTime(0);
    setShowWinModal(false);
    setAutoCompleting(false);
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

  // Draw from stock
  const drawFromStock = useCallback(() => {
    if (gameState.status !== "playing") return;
    saveState();

    setGameState(prev => {
      if (prev.stock.length === 0) {
        // Reset waste to stock
        return {
          ...prev,
          stock: prev.waste.map(c => ({ ...c, faceUp: false })).reverse(),
          waste: [],
          moves: prev.moves + 1,
        };
      }

      // Draw one card
      const [drawn, ...remaining] = prev.stock;
      return {
        ...prev,
        stock: remaining,
        waste: [{ ...drawn, faceUp: true }, ...prev.waste],
        moves: prev.moves + 1,
      };
    });
  }, [gameState.status, saveState]);

  // Move card to foundation
  const moveToFoundation = useCallback((card: Card, fromWaste = false, tableauIndex?: number, cardIndex?: number) => {
    if (gameState.status !== "playing") return false;

    const foundation = gameState.foundations[card.suit];
    const topCard = foundation.length > 0 ? foundation[foundation.length - 1] : null;

    if (!canStackOnFoundation(card, topCard)) {
      return false;
    }

    saveState();

    setGameState(prev => {
      const newState = { ...prev };
      newState.foundations = { ...prev.foundations };
      newState.foundations[card.suit] = [...prev.foundations[card.suit], card];

      if (fromWaste) {
        newState.waste = prev.waste.slice(1);
      } else if (tableauIndex !== undefined && cardIndex !== undefined) {
        newState.tableaus = prev.tableaus.map((tableau, i) => {
          if (i === tableauIndex) {
            const newTableau = tableau.slice(0, cardIndex);
            // Flip the new top card
            if (newTableau.length > 0 && !newTableau[newTableau.length - 1].faceUp) {
              newTableau[newTableau.length - 1] = flipCard(newTableau[newTableau.length - 1], true);
            }
            return newTableau;
          }
          return tableau;
        });
      }

      newState.moves = prev.moves + 1;
      return newState;
    });

    return true;
  }, [gameState.status, gameState.foundations, saveState]);

  // Move cards to tableau
  const moveToTableau = useCallback((
    cards: Card[],
    targetIndex: number,
    source: "waste" | "foundation" | "tableau",
    sourceIndex?: number,
    cardIndex?: number
  ) => {
    if (gameState.status !== "playing") return false;

    const targetTableau = gameState.tableaus[targetIndex];
    const targetTop = targetTableau.length > 0 ? targetTableau[targetTableau.length - 1] : null;
    const cardToPlace = cards[0];

    // Check if move is valid
    if (targetTop) {
      if (!canStackInTableau(cardToPlace, targetTop)) {
        return false;
      }
    } else {
      // Empty tableau - only Kings can go there
      if (cardToPlace.rank !== 13) {
        return false;
      }
    }

    saveState();

    setGameState(prev => {
      const newState = { ...prev };
      
      // Add cards to target
      newState.tableaus = prev.tableaus.map((tableau, i) => {
        if (i === targetIndex) {
          return [...tableau, ...cards.map(c => ({ ...c, faceUp: true }))];
        }
        return tableau;
      });

      // Remove from source
      if (source === "waste") {
        newState.waste = prev.waste.slice(1);
      } else if (source === "foundation") {
        const suit = cards[0].suit;
        newState.foundations = { ...prev.foundations };
        newState.foundations[suit] = prev.foundations[suit].slice(0, -1);
      } else if (source === "tableau" && sourceIndex !== undefined && cardIndex !== undefined) {
        newState.tableaus = newState.tableaus.map((tableau, i) => {
          if (i === sourceIndex) {
            const newTableau = prev.tableaus[i].slice(0, cardIndex);
            // Flip the new top card
            if (newTableau.length > 0 && !newTableau[newTableau.length - 1].faceUp) {
              newTableau[newTableau.length - 1] = flipCard(newTableau[newTableau.length - 1], true);
            }
            return newTableau;
          }
          return newState.tableaus[i];
        });
      }

      newState.moves = prev.moves + 1;
      return newState;
    });

    return true;
  }, [gameState.status, gameState.tableaus, saveState]);

  // Auto complete (move all possible cards to foundation)
  const autoComplete = useCallback(async () => {
    if (autoCompleting) return;
    setAutoCompleting(true);

    const tryMove = (): boolean => {
      // Try moving from waste
      if (gameState.waste.length > 0) {
        const card = gameState.waste[0];
        const foundation = gameState.foundations[card.suit];
        const topCard = foundation.length > 0 ? foundation[foundation.length - 1] : null;
        if (canStackOnFoundation(card, topCard)) {
          moveToFoundation(card, true);
          return true;
        }
      }

      // Try moving from tableaus
      for (let i = 0; i < 7; i++) {
        const tableau = gameState.tableaus[i];
        if (tableau.length > 0) {
          const card = tableau[tableau.length - 1];
          if (card.faceUp) {
            const foundation = gameState.foundations[card.suit];
            const topCard = foundation.length > 0 ? foundation[foundation.length - 1] : null;
            if (canStackOnFoundation(card, topCard)) {
              moveToFoundation(card, false, i, tableau.length - 1);
              return true;
            }
          }
        }
      }

      return false;
    };

    // Keep trying until no more moves
    while (tryMove()) {
      await new Promise(r => setTimeout(r, 100));
    }

    setAutoCompleting(false);
  }, [autoCompleting, gameState, moveToFoundation]);

  // Handle card double click (auto-move to foundation)
  const handleCardDoubleClick = useCallback((
    card: Card,
    source: "waste" | "tableau",
    tableauIndex?: number,
    cardIndex?: number
  ) => {
    if (!card.faceUp) return;
    
    if (source === "waste") {
      moveToFoundation(card, true);
    } else if (tableauIndex !== undefined && cardIndex !== undefined) {
      // Only allow double-click on top card
      const tableau = gameState.tableaus[tableauIndex];
      if (cardIndex === tableau.length - 1) {
        moveToFoundation(card, false, tableauIndex, cardIndex);
      }
    }
  }, [gameState.tableaus, moveToFoundation]);

  // Drag handlers
  const handleDragStart = (
    cards: Card[],
    source: "waste" | "foundation" | "tableau",
    sourceIndex?: number,
    cardIndex?: number
  ) => {
    setDragData({ cards, source, sourceIndex, cardIndex });
  };

  const handleDrop = (targetIndex: number) => {
    if (!dragData) return;
    
    moveToTableau(
      dragData.cards,
      targetIndex,
      dragData.source,
      dragData.sourceIndex,
      dragData.cardIndex
    );
    setDragData(null);
  };

  const handleFoundationDrop = (suit: Suit) => {
    if (!dragData || dragData.cards.length !== 1) return;
    
    const card = dragData.cards[0];
    if (card.suit !== suit) return;
    
    if (dragData.source === "waste") {
      moveToFoundation(card, true);
    } else if (dragData.source === "tableau" && dragData.sourceIndex !== undefined && dragData.cardIndex !== undefined) {
      moveToFoundation(card, false, dragData.sourceIndex, dragData.cardIndex);
    }
    setDragData(null);
  };

  // Check if all face-down cards are revealed (for auto-complete hint)
  const canAutoComplete = gameState.status === "playing" && 
    gameState.tableaus.every(t => t.every(c => c.faceUp)) &&
    gameState.stock.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] py-8">
      <div className="container max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/games/cards"
              className="text-[var(--muted-foreground)] hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-heading">Solitaire</h1>
              <p className="text-sm text-[var(--muted-foreground)]">Klondike</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-[var(--muted-foreground)]">Time:</span>
                <span className="font-mono">{formatTime(elapsedTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--muted-foreground)]">Moves:</span>
                <span className="font-mono">{gameState.moves}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={history.length === 0 || gameState.status !== "playing"}
              >
                Undo
              </Button>
              <Button variant="primary" size="sm" onClick={dealNewGame}>
                New Game
              </Button>
            </div>
          </div>
        </div>

        {/* Game Board */}
        <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] rounded-xl p-6">
          {gameState.status === "idle" ? (
            // Start screen
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="text-6xl mb-6">🃏</div>
              <h2 className="text-2xl font-heading mb-4">Ready to Play?</h2>
              <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                Click the button below to deal a new game of Solitaire. 
                Stack cards from King to Ace in alternating colors!
              </p>
              <Button variant="primary" size="lg" onClick={dealNewGame}>
                Deal Cards
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Top row: Stock, Waste, and Foundations */}
              <div className="flex justify-between mb-8">
                {/* Stock and Waste */}
                <div className="flex gap-4">
                  <DeckPile
                    cardsRemaining={gameState.stock.length}
                    onClick={drawFromStock}
                  />
                  <div 
                    style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
                    className="relative"
                  >
                    {gameState.waste.length > 0 ? (
                      <PlayingCard
                        card={gameState.waste[0]}
                        draggable
                        onDragStart={() => handleDragStart([gameState.waste[0]], "waste")}
                        onDoubleClick={() => handleCardDoubleClick(gameState.waste[0], "waste")}
                      />
                    ) : (
                      <CardSlot />
                    )}
                  </div>
                </div>

                {/* Foundations */}
                <div className="flex gap-3">
                  {SUITS.map(suit => (
                    <div
                      key={suit}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleFoundationDrop(suit)}
                    >
                      {gameState.foundations[suit].length > 0 ? (
                        <PlayingCard
                          card={gameState.foundations[suit][gameState.foundations[suit].length - 1]}
                          draggable
                          onDragStart={() => {
                            const topCard = gameState.foundations[suit][gameState.foundations[suit].length - 1];
                            handleDragStart([topCard], "foundation");
                          }}
                        />
                      ) : (
                        <CardSlot suit={suit} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tableaus */}
              <div className="flex justify-center gap-4">
                {gameState.tableaus.map((tableau, tableauIndex) => (
                  <div
                    key={tableauIndex}
                    className="relative"
                    style={{
                      width: CARD_WIDTH,
                      minHeight: CARD_HEIGHT + 200,
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(tableauIndex)}
                  >
                    {tableau.length === 0 ? (
                      <CardSlot label="K" />
                    ) : (
                      tableau.map((card, cardIndex) => {
                        const canDrag = card.faceUp;
                        const offset = card.faceUp ? 25 : 12;
                        
                        return (
                          <motion.div
                            key={card.id}
                            className="absolute"
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: cardIndex * offset, opacity: 1 }}
                            transition={{ delay: cardIndex * 0.02 }}
                            style={{ zIndex: cardIndex }}
                          >
                            <PlayingCard
                              card={card}
                              draggable={canDrag}
                              onDragStart={() => {
                                if (canDrag) {
                                  const cardsToMove = tableau.slice(cardIndex);
                                  handleDragStart(cardsToMove, "tableau", tableauIndex, cardIndex);
                                }
                              }}
                              onDoubleClick={() => handleCardDoubleClick(card, "tableau", tableauIndex, cardIndex)}
                              onClick={() => {
                                // Flip face-down card
                                if (!card.faceUp && cardIndex === tableau.length - 1) {
                                  setGameState(prev => ({
                                    ...prev,
                                    tableaus: prev.tableaus.map((t, i) => 
                                      i === tableauIndex
                                        ? t.map((c, ci) => ci === cardIndex ? flipCard(c, true) : c)
                                        : t
                                    ),
                                  }));
                                }
                              }}
                            />
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                ))}
              </div>

              {/* Auto-complete button */}
              {canAutoComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mt-8"
                >
                  <Button
                    variant="primary"
                    onClick={autoComplete}
                    disabled={autoCompleting}
                  >
                    {autoCompleting ? "Auto-completing..." : "Auto Complete"}
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </div>

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
                  🎉
                </motion.div>
                <h2 className="text-2xl font-heading mb-2">Congratulations!</h2>
                <p className="text-[var(--muted-foreground)] mb-6">
                  You won the game!
                </p>
                <div className="flex justify-center gap-6 mb-6">
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
                  <Button variant="primary" onClick={dealNewGame}>
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

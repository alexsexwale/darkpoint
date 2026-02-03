"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Confetti from "react-confetti";
import { Button } from "@/components/ui";
import {
  Card,
  Suit,
  SUITS,
  SUIT_SYMBOLS,
  SUIT_COLORS,
  Player,
  createDeck,
  shuffleDeck,
  drawCards,
} from "@/lib/cardGames";
import {
  PlayingCard,
  CardHand,
  CARD_WIDTH,
} from "@/lib/cardGames/cardRenderer";
import {
  createHumanPlayer,
  createAIPlayer,
  delay,
} from "@/lib/cardGames/utils";
import {
  findPlayableCrazyEights,
  crazyEightsAIChooseCard,
  AI_THINK_DELAY,
} from "@/lib/cardGames/ai";

type GameMode = "ai";
type GameStatus = "idle" | "setup" | "playing" | "roundEnd" | "gameEnd";

interface CrazyEightsState {
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  currentSuit: Suit;
  currentPlayerIndex: number;
  direction: 1 | -1;
  drawCount: number; // How many cards current player has drawn this turn
  status: GameStatus;
  mode: GameMode;
  winner: Player | null;
  message: string;
}

const createInitialState = (): CrazyEightsState => ({
  players: [],
  deck: [],
  discardPile: [],
  currentSuit: "spades",
  currentPlayerIndex: 0,
  direction: 1,
  drawCount: 0,
  status: "idle",
  mode: "ai",
  winner: null,
  message: "",
});

export function CrazyEightsGame() {
  const [gameState, setGameState] = useState<CrazyEightsState>(createInitialState());
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [pendingPlay, setPendingPlay] = useState<Card[] | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showWinConfetti, setShowWinConfetti] = useState(false);
  const [confettiSize, setConfettiSize] = useState({ width: 0, height: 0 });
  const aiThinkingRef = useRef(false);

  // Confetti when human wins the round
  useEffect(() => {
    if (gameState.status === "roundEnd" && gameState.winner?.type === "human") {
      setConfettiSize({ width: typeof window !== "undefined" ? window.innerWidth : 0, height: typeof window !== "undefined" ? window.innerHeight : 0 });
      setShowWinConfetti(true);
    }
  }, [gameState.status, gameState.winner?.type]);

  useEffect(() => {
    if (!showWinConfetti) return;
    const t = setTimeout(() => setShowWinConfetti(false), 5000);
    return () => clearTimeout(t);
  }, [showWinConfetti]);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const topCard = gameState.discardPile[0];
  const isHumanTurn = currentPlayer?.type === "human";

  // AI turn logic
  useEffect(() => {
    if (
      gameState.status !== "playing" ||
      !currentPlayer ||
      currentPlayer.type !== "ai" ||
      aiThinkingRef.current
    ) {
      return;
    }

    const playAITurn = async () => {
      aiThinkingRef.current = true;
      setGameState(prev => ({ ...prev, message: `${currentPlayer.name} is thinking...` }));
      
      await delay(AI_THINK_DELAY.medium);

      const choice = crazyEightsAIChooseCard(
        currentPlayer.hand,
        topCard,
        gameState.currentSuit,
        "medium"
      );

      if (choice) {
        // AI plays a card
        playCards([choice.card], choice.newSuit);
      } else {
        // AI needs to draw
        if (gameState.drawCount < 3 && gameState.deck.length > 0) {
          drawCard();
        } else {
          // AI passes
          passTurn();
        }
      }

      aiThinkingRef.current = false;
    };

    playAITurn();
  }, [gameState.currentPlayerIndex, gameState.status, currentPlayer]);

  // Check for round end
  useEffect(() => {
    if (gameState.status !== "playing") return;

    const winningPlayer = gameState.players.find(p => p.hand.length === 0);
    if (winningPlayer) {
      setGameState(prev => ({
        ...prev,
        status: "roundEnd",
        winner: winningPlayer,
        message: `${winningPlayer.name} wins!`,
      }));
    }
  }, [gameState.players, gameState.status]);

  // Start a new game
  const startGame = useCallback((mode: GameMode, numPlayers: number) => {
    const players: Player[] = [];
    
    players.push(createHumanPlayer("You"));
    for (let i = 1; i < numPlayers; i++) {
      players.push(createAIPlayer(i));
    }

    // Create and shuffle deck
    let deck = shuffleDeck(createDeck(true));

    // Deal 7 cards to each player (5 if 4+ players)
    const cardsPerPlayer = numPlayers >= 4 ? 5 : 7;
    for (const player of players) {
      const { drawn, remaining } = drawCards(deck, cardsPerPlayer);
      player.hand = drawn;
      deck = remaining;
    }

    // Draw starting card (redraw if it's an 8)
    let startCard: Card;
    do {
      const { drawn, remaining } = drawCards(deck, 1);
      startCard = drawn[0];
      if (startCard.rank === 8) {
        deck = [...remaining, startCard];
        deck = shuffleDeck(deck);
      } else {
        deck = remaining;
      }
    } while (startCard.rank === 8);

    setGameState({
      players,
      deck,
      discardPile: [startCard],
      currentSuit: startCard.suit,
      currentPlayerIndex: 0,
      direction: 1,
      drawCount: 0,
      status: "playing",
      mode,
      winner: null,
      message: mode === "ai" ? "Your turn!" : "Player 1's turn!",
    });
    setSelectedCards([]);
    setShowSetupModal(false);
  }, []);

  // Check if a card can be played
  const canPlayCard = useCallback((card: Card): boolean => {
    if (!topCard) return true;
    if (card.rank === 8) return true;
    return card.suit === gameState.currentSuit || card.rank === topCard.rank;
  }, [topCard, gameState.currentSuit]);

  // Play selected cards
  const playCards = useCallback((cards: Card[], newSuit?: Suit) => {
    if (cards.length === 0) return;
    if (!canPlayCard(cards[0])) return;

    const playedCard = cards[0];
    const isEight = playedCard.rank === 8;

    // If playing an 8 and no suit chosen yet, show picker
    if (isEight && !newSuit) {
      setPendingPlay(cards);
      setShowSuitPicker(true);
      return;
    }

    setGameState(prev => {
      const newPlayers = prev.players.map((player, idx) => {
        if (idx === prev.currentPlayerIndex) {
          return {
            ...player,
            hand: player.hand.filter(c => !cards.some(pc => pc.id === c.id)),
          };
        }
        return player;
      });

      const nextPlayerIndex = (prev.currentPlayerIndex + prev.direction + prev.players.length) % prev.players.length;
      const nextPlayer = newPlayers[nextPlayerIndex];
      const nextMessage = nextPlayer.type === "ai"
        ? `${nextPlayer.name}'s turn...`
        : "Your turn!";

      return {
        ...prev,
        players: newPlayers,
        discardPile: [...cards, ...prev.discardPile],
        currentSuit: newSuit || playedCard.suit,
        currentPlayerIndex: nextPlayerIndex,
        drawCount: 0,
        message: nextMessage,
      };
    });

    setSelectedCards([]);
    setPendingPlay(null);
    setShowSuitPicker(false);
  }, [canPlayCard]);

  // Handle suit selection for 8s
  const handleSuitSelect = (suit: Suit) => {
    if (pendingPlay) {
      playCards(pendingPlay, suit);
    }
    setShowSuitPicker(false);
  };

  // Draw a card
  const drawCard = useCallback(() => {
    if (gameState.deck.length === 0) return;
    if (gameState.drawCount >= 3) return;

    setGameState(prev => {
      const { drawn, remaining } = drawCards(prev.deck, 1);
      const newPlayers = prev.players.map((player, idx) => {
        if (idx === prev.currentPlayerIndex) {
          return {
            ...player,
            hand: [...player.hand, ...drawn],
          };
        }
        return player;
      });

      // Check if new card can be played
      const drawnCard = drawn[0];
      const canPlay = drawnCard.rank === 8 || drawnCard.suit === prev.currentSuit || drawnCard.rank === topCard?.rank;

      return {
        ...prev,
        players: newPlayers,
        deck: remaining,
        drawCount: prev.drawCount + 1,
        message: canPlay 
          ? "You drew a playable card!" 
          : prev.drawCount >= 2 
          ? "Max draws reached. Pass or play." 
          : "Card drawn. Draw more or play.",
      };
    });
  }, [gameState.deck.length, gameState.drawCount, topCard]);

  // Pass turn (when can't play after drawing)
  const passTurn = useCallback(() => {
    setGameState(prev => {
      const nextPlayerIndex = (prev.currentPlayerIndex + prev.direction + prev.players.length) % prev.players.length;
      const nextPlayer = prev.players[nextPlayerIndex];
      const nextMessage = nextPlayer.type === "ai"
        ? `${nextPlayer.name}'s turn...`
        : "Your turn!";

      return {
        ...prev,
        currentPlayerIndex: nextPlayerIndex,
        drawCount: 0,
        message: nextMessage,
      };
    });
  }, []);

  // Handle card click for selection
  const handleCardClick = (card: Card) => {
    if (!isHumanTurn || gameState.status !== "playing") return;

    if (selectedCards.some(c => c.id === card.id)) {
      // Deselect
      setSelectedCards(prev => prev.filter(c => c.id !== card.id));
    } else if (canPlayCard(card)) {
      // Select (for now, only single card selection)
      setSelectedCards([card]);
    }
  };

  // Play selected cards button
  const handlePlaySelected = () => {
    if (selectedCards.length > 0) {
      playCards(selectedCards);
    }
  };

  // Get playable cards count
  const playableCards = currentPlayer 
    ? findPlayableCrazyEights(currentPlayer.hand, topCard, gameState.currentSuit)
    : [];
  const canDrawMore = gameState.drawCount < 3 && gameState.deck.length > 0;
  const mustPass = !canDrawMore && playableCards.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] py-8 relative">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
              <h1 className="text-2xl font-heading">Crazy Eights</h1>
              <p className="text-sm text-[var(--muted-foreground)]">vs AI</p>
            </div>
          </div>

          <Button variant="primary" size="sm" onClick={() => setShowSetupModal(true)}>
            New Game
          </Button>
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
              <div className="text-6xl mb-6">🎱</div>
              <h2 className="text-2xl font-heading mb-4">Crazy Eights</h2>
              <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                Match cards by suit or rank. Play 8s as wild cards to change the suit.
                First player to empty their hand wins!
              </p>
              <Button variant="primary" size="lg" onClick={() => setShowSetupModal(true)}>
                Start Game
              </Button>
            </motion.div>
          ) : (
            <>
              {/* AI Opponent hands */}
              <div className="mb-6">
                <div className="flex justify-center gap-8 flex-wrap">
                  {gameState.players.map((player, idx) => {
                    if (player.type === "human") return null;
                    
                    const isCurrentTurn = idx === gameState.currentPlayerIndex;
                    
                    return (
                      <div key={player.id} className="text-center">
                        <div className={`text-sm mb-2 ${isCurrentTurn ? "text-[var(--color-main-1)]" : "text-[var(--muted-foreground)]"}`}>
                          {player.name} {isCurrentTurn && "⬅"}
                        </div>
                        <div className="flex justify-center">
                          {Array(Math.min(player.hand.length, 7)).fill(0).map((_, i) => (
                            <motion.div
                              key={i}
                              className="w-8 h-12 bg-gradient-to-br from-[var(--color-main-1)] to-purple-700 rounded border border-[var(--color-dark-4)] -ml-4 first:ml-0"
                              initial={{ y: -20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: i * 0.05 }}
                            />
                          ))}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)] mt-1">
                          {player.hand.length} cards
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Center area: Deck and Discard pile */}
              <div className="flex justify-center items-center gap-8 mb-6">
                {/* Deck */}
                <div
                  className={`relative cursor-pointer ${!canDrawMore || !isHumanTurn ? "opacity-50" : ""}`}
                  onClick={() => {
                    if (isHumanTurn && canDrawMore) {
                      drawCard();
                    }
                  }}
                >
                  <div className="w-[70px] h-[100px] bg-gradient-to-br from-[var(--color-main-1)] to-purple-700 rounded-lg border-2 border-[var(--color-dark-4)] flex items-center justify-center">
                    <span className="text-white/70 text-sm font-medium">{gameState.deck.length}</span>
                  </div>
                  <div className="text-xs text-center mt-1 text-[var(--muted-foreground)]">Draw</div>
                </div>

                {/* Discard pile */}
                <div className="text-center">
                  {topCard && (
                    <PlayingCard card={topCard} />
                  )}
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <span className="text-xs text-[var(--muted-foreground)]">Current suit:</span>
                    <span 
                      className="text-lg"
                      style={{ color: SUIT_COLORS[gameState.currentSuit] === "red" ? "#dc2626" : "#fff" }}
                    >
                      {SUIT_SYMBOLS[gameState.currentSuit]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Message */}
              <motion.div
                key={gameState.message}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-sm text-[var(--muted-foreground)] mb-4"
              >
                {gameState.message}
              </motion.div>

              {/* Current player's hand */}
              {gameState.mode === "ai" && currentPlayer?.type === "human" && (
                <div className="border-t border-[var(--color-dark-3)] pt-6">
                  <div className="text-sm text-[var(--muted-foreground)] text-center mb-3">Your Hand</div>
                  <div className="flex justify-center flex-wrap gap-2">
                    {currentPlayer.hand.map((card) => {
                      const isPlayable = canPlayCard(card);
                      const isSelected = selectedCards.some(c => c.id === card.id);
                      
                      return (
                        <motion.div
                          key={card.id}
                          whileHover={isPlayable ? { y: -8 } : {}}
                          className={!isPlayable ? "opacity-50" : "cursor-pointer"}
                        >
                          <PlayingCard
                            card={card}
                            selected={isSelected}
                            onClick={() => handleCardClick(card)}
                            disabled={!isPlayable}
                          />
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-center gap-3 mt-4">
                    {selectedCards.length > 0 && (
                      <Button variant="primary" onClick={handlePlaySelected}>
                        Play Card
                      </Button>
                    )}
                    {playableCards.length === 0 && canDrawMore && (
                      <Button variant="outline" onClick={drawCard}>
                        Draw Card ({3 - gameState.drawCount} left)
                      </Button>
                    )}
                    {mustPass && (
                      <Button variant="outline" onClick={passTurn}>
                        Pass Turn
                      </Button>
                    )}
                  </div>
                </div>
              )}

            </>
          )}
        </div>

        {/* Suit Picker Modal */}
        <AnimatePresence>
          {showSuitPicker && (
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
                className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-6"
              >
                <h3 className="text-lg font-heading mb-4 text-center">Choose a Suit</h3>
                <div className="grid grid-cols-2 gap-3">
                  {SUITS.map(suit => (
                    <button
                      key={suit}
                      className="p-4 bg-[var(--color-dark-3)]/50 hover:bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg transition-colors text-center"
                      onClick={() => handleSuitSelect(suit)}
                    >
                      <span 
                        className="text-4xl"
                        style={{ color: SUIT_COLORS[suit] === "red" ? "#dc2626" : "#fff" }}
                      >
                        {SUIT_SYMBOLS[suit]}
                      </span>
                      <div className="text-xs text-[var(--muted-foreground)] mt-1 capitalize">
                        {suit}
                      </div>
                    </button>
                  ))}
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
                
                <div className="space-y-4">
                  {/* AI Mode */}
                  <div>
                    <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-2">Play vs AI</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[2, 3, 4].map(num => (
                        <button
                          key={num}
                          className="p-3 bg-[var(--color-dark-3)]/50 hover:bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg transition-colors"
                          onClick={() => startGame("ai", num)}
                        >
                          <div className="text-lg font-medium">{num} Players</div>
                          <div className="text-xs text-[var(--muted-foreground)]">
                            You vs {num - 1} AI
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Online Mode Link */}
                  <div className="pt-4 border-t border-[var(--color-dark-3)]">
                    <p className="text-sm text-[var(--muted-foreground)] text-center mb-3">
                      Want to play with friends online?
                    </p>
                    <Link href="/games/cards" className="block">
                      <Button variant="outline" className="w-full">
                        Create Online Game
                      </Button>
                    </Link>
                  </div>
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

        {/* Round End Modal */}
        <AnimatePresence>
          {gameState.status === "roundEnd" && gameState.winner && (
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
                  🎉
                </motion.div>
                <h2 className="text-2xl font-heading mb-2">
                  {gameState.winner.name} Wins!
                </h2>
                <p className="text-[var(--muted-foreground)] mb-6">
                  {gameState.winner.type === "human" 
                    ? "Congratulations! You got rid of all your cards!" 
                    : `${gameState.winner.name} got rid of all their cards first.`}
                </p>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">What would you like to do?</p>
                <div className="flex flex-col gap-3">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      setGameState(prev => ({ ...prev, status: "idle", winner: null }));
                      setShowSetupModal(true);
                    }}
                  >
                    Change Difficulty
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => startGame(gameState.mode, gameState.players.length)}
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

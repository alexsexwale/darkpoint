"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui";
import {
  Card,
  Suit,
  SUITS,
  SUIT_SYMBOLS,
  SUIT_COLORS,
  createDeck,
  shuffleDeck,
  drawCards,
} from "@/lib/cardGames";
import {
  PlayingCard,
} from "@/lib/cardGames/cardRenderer";
import {
  RoomPlayer,
  UseMultiplayerGameReturn,
  findPlayableCrazyEights,
} from "@/lib/cardGames/multiplayer";

interface OnlinePlayer {
  id: string;
  name: string;
  hand: Card[];
  isConnected: boolean;
}

interface CrazyEightsOnlineState {
  players: OnlinePlayer[];
  deck: Card[];
  discardPile: Card[];
  currentSuit: Suit;
  currentPlayerIndex: number;
  drawCount: number;
  status: "playing" | "finished";
  winnerId: string | null;
}

interface CrazyEightsOnlineProps {
  roomCode: string;
  playerId: string;
  playerName: string;
  initialGameState: unknown;
  players: RoomPlayer[];
  isHost: boolean;
  multiplayer: UseMultiplayerGameReturn;
  onLeave: () => void;
}

export function CrazyEightsOnline({
  roomCode,
  playerId,
  playerName,
  initialGameState,
  players: roomPlayers,
  isHost,
  multiplayer,
  onLeave,
}: CrazyEightsOnlineProps) {
  const [gameState, setGameState] = useState<CrazyEightsOnlineState | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [pendingCard, setPendingCard] = useState<Card | null>(null);
  const initializedRef = useRef(false);

  // Initialize game state (host only)
  useEffect(() => {
    if (!isHost || initializedRef.current || !roomPlayers.length) return;
    initializedRef.current = true;

    // Create initial game state
    const playerIds = roomPlayers.map(p => p.id);
    const playerNames = roomPlayers.map(p => p.name);
    
    let deck = shuffleDeck(createDeck(true));
    const gamePlayers: OnlinePlayer[] = [];

    // Deal cards to each player
    const cardsPerPlayer = playerIds.length >= 4 ? 5 : 7;
    for (let i = 0; i < playerIds.length; i++) {
      const { drawn, remaining } = drawCards(deck, cardsPerPlayer);
      gamePlayers.push({
        id: playerIds[i],
        name: playerNames[i],
        hand: drawn,
        isConnected: true,
      });
      deck = remaining;
    }

    // Draw starting card (avoid 8s)
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

    const newState: CrazyEightsOnlineState = {
      players: gamePlayers,
      deck,
      discardPile: [startCard],
      currentSuit: startCard.suit,
      currentPlayerIndex: 0,
      drawCount: 0,
      status: "playing",
      winnerId: null,
    };

    setGameState(newState);
    
    // Sync to all players
    multiplayer.syncGameState(newState);
  }, [isHost, roomPlayers, multiplayer]);

  // Listen for game state updates
  useEffect(() => {
    if (multiplayer.gameState && !isHost) {
      setGameState(multiplayer.gameState as CrazyEightsOnlineState);
    }
  }, [multiplayer.gameState, isHost]);

  // Listen for game actions
  useEffect(() => {
    const handleAction = (action: string, data: unknown, senderId: string) => {
      if (!gameState) return;

      switch (action) {
        case "play_card": {
          const { card, newSuit } = data as { card: Card; newSuit?: Suit };
          handleCardPlayed(senderId, card, newSuit);
          break;
        }
        case "draw_card": {
          const { drawnCard } = data as { drawnCard: Card };
          handleCardDrawn(senderId, drawnCard);
          break;
        }
        case "pass_turn": {
          handleTurnPassed(senderId);
          break;
        }
      }
    };

    // This would be called by the multiplayer hook's onGameAction callback
    // For now, we'll handle it through state updates
  }, [gameState]);

  // Check for winner
  useEffect(() => {
    if (!gameState || gameState.status !== "playing") return;

    const winner = gameState.players.find(p => p.hand.length === 0);
    if (winner) {
      setGameState(prev => prev ? { ...prev, status: "finished", winnerId: winner.id } : null);
      if (isHost) {
        multiplayer.syncGameState({ ...gameState, status: "finished", winnerId: winner.id });
      }
    }
  }, [gameState?.players, isHost, multiplayer]);

  // Handle card played by any player
  const handleCardPlayed = useCallback((senderId: string, card: Card, newSuit?: Suit) => {
    setGameState(prev => {
      if (!prev) return null;
      
      const playerIndex = prev.players.findIndex(p => p.id === senderId);
      if (playerIndex === -1) return prev;

      const newPlayers = prev.players.map((player, idx) => {
        if (idx === playerIndex) {
          return {
            ...player,
            hand: player.hand.filter(c => c.id !== card.id),
          };
        }
        return player;
      });

      const nextPlayerIndex = (playerIndex + 1) % prev.players.length;

      return {
        ...prev,
        players: newPlayers,
        discardPile: [card, ...prev.discardPile],
        currentSuit: newSuit || card.suit,
        currentPlayerIndex: nextPlayerIndex,
        drawCount: 0,
      };
    });
  }, []);

  // Handle card drawn by any player
  const handleCardDrawn = useCallback((senderId: string, drawnCard: Card) => {
    setGameState(prev => {
      if (!prev) return null;
      
      const playerIndex = prev.players.findIndex(p => p.id === senderId);
      if (playerIndex === -1) return prev;

      const newPlayers = prev.players.map((player, idx) => {
        if (idx === playerIndex) {
          return {
            ...player,
            hand: [...player.hand, drawnCard],
          };
        }
        return player;
      });

      return {
        ...prev,
        players: newPlayers,
        deck: prev.deck.slice(1),
        drawCount: prev.drawCount + 1,
      };
    });
  }, []);

  // Handle turn passed
  const handleTurnPassed = useCallback((senderId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      
      const playerIndex = prev.players.findIndex(p => p.id === senderId);
      if (playerIndex === -1) return prev;

      const nextPlayerIndex = (playerIndex + 1) % prev.players.length;

      return {
        ...prev,
        currentPlayerIndex: nextPlayerIndex,
        drawCount: 0,
      };
    });
  }, []);

  // Play a card
  const playCard = useCallback((card: Card, newSuit?: Suit) => {
    if (!gameState) return;

    const isEight = card.rank === 8;
    if (isEight && !newSuit) {
      setPendingCard(card);
      setShowSuitPicker(true);
      return;
    }

    // Broadcast action
    multiplayer.sendAction("play_card", { card, newSuit });
    
    // Update local state immediately
    handleCardPlayed(playerId, card, newSuit);
    
    // Sync state if host
    if (isHost) {
      setTimeout(() => {
        if (gameState) {
          multiplayer.syncGameState(gameState);
        }
      }, 100);
    }

    setSelectedCard(null);
    setPendingCard(null);
    setShowSuitPicker(false);
  }, [gameState, multiplayer, playerId, isHost, handleCardPlayed]);

  // Draw a card
  const drawCard = useCallback(() => {
    if (!gameState || gameState.deck.length === 0 || gameState.drawCount >= 3) return;

    const drawnCard = gameState.deck[0];
    
    // Broadcast action
    multiplayer.sendAction("draw_card", { drawnCard });
    
    // Update local state
    handleCardDrawn(playerId, drawnCard);

    // Sync state if host
    if (isHost) {
      setTimeout(() => {
        if (gameState) {
          multiplayer.syncGameState(gameState);
        }
      }, 100);
    }
  }, [gameState, multiplayer, playerId, isHost, handleCardDrawn]);

  // Pass turn
  const passTurn = useCallback(() => {
    if (!gameState) return;

    // Broadcast action
    multiplayer.sendAction("pass_turn", {});
    
    // Update local state
    handleTurnPassed(playerId);

    // Sync state if host
    if (isHost) {
      setTimeout(() => {
        if (gameState) {
          multiplayer.syncGameState(gameState);
        }
      }, 100);
    }
  }, [gameState, multiplayer, playerId, isHost, handleTurnPassed]);

  // Handle suit selection for 8s
  const handleSuitSelect = (suit: Suit) => {
    if (pendingCard) {
      playCard(pendingCard, suit);
    }
    setShowSuitPicker(false);
  };

  // Check if card can be played
  const canPlayCard = useCallback((card: Card): boolean => {
    if (!gameState || gameState.discardPile.length === 0) return true;
    const topCard = gameState.discardPile[0];
    if (card.rank === 8) return true;
    return card.suit === gameState.currentSuit || card.rank === topCard.rank;
  }, [gameState]);

  // Get current game info
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--color-main-1)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[var(--muted-foreground)]">Setting up game...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const myPlayer = gameState.players.find(p => p.id === playerId);
  const isMyTurn = currentPlayer?.id === playerId;
  const topCard = gameState.discardPile[0];
  const playableCards = myPlayer ? findPlayableCrazyEights(myPlayer.hand, topCard, gameState.currentSuit) : [];
  const canDrawMore = gameState.drawCount < 3 && gameState.deck.length > 0;
  const mustPass = isMyTurn && !canDrawMore && playableCards.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] py-8">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading">Crazy Eights</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Room: {roomCode} • Online
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onLeave}>
            Leave Game
          </Button>
        </div>

        {/* Game Board */}
        <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] rounded-xl p-6">
          {gameState.status === "finished" ? (
            <div className="text-center py-12">
              <motion.div
                className="text-6xl mb-4"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                🎉
              </motion.div>
              <h2 className="text-2xl font-heading mb-2">
                {gameState.winnerId === playerId ? "You Win!" : `${gameState.players.find(p => p.id === gameState.winnerId)?.name} Wins!`}
              </h2>
              <p className="text-[var(--muted-foreground)] mb-6">
                {gameState.winnerId === playerId 
                  ? "Congratulations! You got rid of all your cards!" 
                  : "Better luck next time!"}
              </p>
              <Button variant="primary" onClick={onLeave}>
                Back to Lobby
              </Button>
            </div>
          ) : (
            <>
              {/* Other players */}
              <div className="mb-6">
                <div className="flex justify-center gap-6 flex-wrap">
                  {gameState.players.map((player, idx) => {
                    if (player.id === playerId) return null;
                    const isCurrent = idx === gameState.currentPlayerIndex;
                    
                    return (
                      <div key={player.id} className="text-center">
                        <div className={`text-sm mb-2 ${isCurrent ? "text-[var(--color-main-1)]" : "text-[var(--muted-foreground)]"}`}>
                          {player.name} {isCurrent && "⬅"}
                        </div>
                        <div className="flex justify-center">
                          {Array(Math.min(player.hand.length, 7)).fill(0).map((_, i) => (
                            <div
                              key={i}
                              className="w-8 h-12 bg-gradient-to-br from-[var(--color-main-1)] to-purple-700 rounded border border-[var(--color-dark-4)] -ml-4 first:ml-0"
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

              {/* Center: Deck and discard */}
              <div className="flex justify-center items-center gap-8 mb-6">
                <div
                  className={`relative ${!canDrawMore || !isMyTurn ? "opacity-50" : "cursor-pointer"}`}
                  onClick={() => isMyTurn && canDrawMore && drawCard()}
                >
                  <div className="w-[70px] h-[100px] bg-gradient-to-br from-[var(--color-main-1)] to-purple-700 rounded-lg border-2 border-[var(--color-dark-4)] flex items-center justify-center">
                    <span className="text-white/70 text-sm font-medium">{gameState.deck.length}</span>
                  </div>
                  <div className="text-xs text-center mt-1 text-[var(--muted-foreground)]">Draw</div>
                </div>

                <div className="text-center">
                  {topCard && <PlayingCard card={topCard} />}
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

              {/* Turn indicator */}
              <div className="text-center text-sm text-[var(--muted-foreground)] mb-4">
                {isMyTurn ? (
                  <span className="text-[var(--color-main-1)]">Your turn!</span>
                ) : (
                  <span>Waiting for {currentPlayer?.name}...</span>
                )}
              </div>

              {/* My hand */}
              {myPlayer && (
                <div className="border-t border-[var(--color-dark-3)] pt-6">
                  <div className="text-sm text-[var(--muted-foreground)] text-center mb-3">Your Hand</div>
                  <div className="flex justify-center flex-wrap gap-2">
                    {myPlayer.hand.map((card) => {
                      const isPlayable = isMyTurn && canPlayCard(card);
                      const isSelected = selectedCard?.id === card.id;
                      
                      return (
                        <motion.div
                          key={card.id}
                          whileHover={isPlayable ? { y: -8 } : {}}
                          className={!isPlayable ? "opacity-50" : "cursor-pointer"}
                        >
                          <PlayingCard
                            card={card}
                            selected={isSelected}
                            onClick={() => {
                              if (isPlayable) {
                                setSelectedCard(isSelected ? null : card);
                              }
                            }}
                            disabled={!isPlayable}
                          />
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  {isMyTurn && (
                    <div className="flex justify-center gap-3 mt-4">
                      {selectedCard && (
                        <Button variant="primary" onClick={() => playCard(selectedCard)}>
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
                  )}
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
      </div>
    </div>
  );
}

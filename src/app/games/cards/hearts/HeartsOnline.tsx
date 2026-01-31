"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui";
import {
  Card,
  Suit,
  createDeck,
  shuffleDeck,
  sortCards,
  getHeartsPointValue,
} from "@/lib/cardGames";
import {
  PlayingCard,
} from "@/lib/cardGames/cardRenderer";
import {
  RoomPlayer,
  UseMultiplayerGameReturn,
} from "@/lib/cardGames/multiplayer";

interface OnlineHeartsPlayer {
  id: string;
  name: string;
  hand: Card[];
  collectedCards: Card[];
  passedCards: Card[];
  score: number;
  roundScore: number;
  isConnected: boolean;
}

type PassDirection = "left" | "right" | "across" | "none";
type GamePhase = "passing" | "playing" | "trickEnd" | "roundEnd" | "gameEnd";

interface HeartsOnlineState {
  players: OnlineHeartsPlayer[];
  currentTrick: { playerId: string; card: Card }[];
  leadSuit: Suit | null;
  currentPlayerId: string;
  heartsBroken: boolean;
  isFirstTrick: boolean;
  phase: GamePhase;
  passDirection: PassDirection;
  roundNumber: number;
}

interface HeartsOnlineProps {
  roomCode: string;
  playerId: string;
  playerName: string;
  initialGameState: unknown;
  players: RoomPlayer[];
  isHost: boolean;
  multiplayer: UseMultiplayerGameReturn;
  onLeave: () => void;
}

const PASS_DIRECTIONS: PassDirection[] = ["left", "right", "across", "none"];

export function HeartsOnline({
  roomCode,
  playerId,
  playerName,
  initialGameState,
  players: roomPlayers,
  isHost,
  multiplayer,
  onLeave,
}: HeartsOnlineProps) {
  const [gameState, setGameState] = useState<HeartsOnlineState | null>(null);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const initializedRef = useRef(false);

  // Initialize game state (host only)
  useEffect(() => {
    if (!isHost || initializedRef.current || roomPlayers.length !== 4) return;
    initializedRef.current = true;

    // Create and shuffle deck
    const deck = shuffleDeck(createDeck(true));
    const gamePlayers: OnlineHeartsPlayer[] = [];

    // Deal 13 cards to each player
    for (let i = 0; i < 4; i++) {
      const hand = sortCards(deck.slice(i * 13, (i + 1) * 13));
      gamePlayers.push({
        id: roomPlayers[i].id,
        name: roomPlayers[i].name,
        hand,
        collectedCards: [],
        passedCards: [],
        score: 0,
        roundScore: 0,
        isConnected: true,
      });
    }

    const newState: HeartsOnlineState = {
      players: gamePlayers,
      currentTrick: [],
      leadSuit: null,
      currentPlayerId: gamePlayers[0].id,
      heartsBroken: false,
      isFirstTrick: true,
      phase: "passing",
      passDirection: "left",
      roundNumber: 1,
    };

    setGameState(newState);
    multiplayer.syncGameState(newState);
  }, [isHost, roomPlayers, multiplayer]);

  // Listen for game state updates
  useEffect(() => {
    if (multiplayer.gameState && !isHost) {
      setGameState(multiplayer.gameState as HeartsOnlineState);
    }
  }, [multiplayer.gameState, isHost]);

  // Check if card can be played
  const canPlayCard = useCallback((card: Card): boolean => {
    if (!gameState) return false;
    
    const myPlayer = gameState.players.find(p => p.id === playerId);
    if (!myPlayer) return false;
    
    const isLeading = gameState.currentTrick.length === 0;
    
    // First trick - must play 2 of clubs
    if (gameState.isFirstTrick && isLeading) {
      return card.suit === "clubs" && card.rank === 2;
    }

    // Must follow suit if possible
    if (!isLeading && gameState.leadSuit) {
      const hasSuit = myPlayer.hand.some(c => c.suit === gameState.leadSuit);
      if (hasSuit) {
        return card.suit === gameState.leadSuit;
      }
      // Can't follow suit - can play anything except hearts/QoS on first trick
      if (gameState.isFirstTrick) {
        const hasNonPenalty = myPlayer.hand.some(c => getHeartsPointValue(c) === 0);
        if (hasNonPenalty && getHeartsPointValue(card) > 0) {
          return false;
        }
      }
      return true;
    }

    // Leading - can't lead hearts until broken
    if (isLeading && !gameState.heartsBroken && card.suit === "hearts") {
      const hasNonHearts = myPlayer.hand.some(c => c.suit !== "hearts");
      return !hasNonHearts;
    }

    return true;
  }, [gameState, playerId]);

  // Play a card
  const playCard = useCallback((card: Card) => {
    if (!gameState) return;

    multiplayer.sendAction("play_card", { card, playerId });

    // Update local state
    setGameState(prev => {
      if (!prev) return null;
      
      const isLeading = prev.currentTrick.length === 0;
      const newLeadSuit = isLeading ? card.suit : prev.leadSuit;
      const newHeartsBroken = prev.heartsBroken || card.suit === "hearts";

      const newPlayers = prev.players.map(player => {
        if (player.id === playerId) {
          return {
            ...player,
            hand: player.hand.filter(c => c.id !== card.id),
          };
        }
        return player;
      });

      const newTrick = [...prev.currentTrick, { playerId, card }];

      // Check if trick is complete
      if (newTrick.length === 4) {
        // Determine winner
        let winningPlay = newTrick[0];
        for (const play of newTrick) {
          if (play.card.suit === newLeadSuit && play.card.rank > winningPlay.card.rank) {
            winningPlay = play;
          }
        }

        // Award cards to winner
        const trickCards = newTrick.map(t => t.card);
        const finalPlayers = newPlayers.map(player => {
          if (player.id === winningPlay.playerId) {
            return {
              ...player,
              collectedCards: [...player.collectedCards, ...trickCards],
            };
          }
          return player;
        });

        // Check if round is over
        const roundOver = finalPlayers.every(p => p.hand.length === 0);
        
        if (roundOver) {
          // Calculate scores
          const scoredPlayers = finalPlayers.map(player => {
            let roundScore = 0;
            for (const c of player.collectedCards) {
              roundScore += getHeartsPointValue(c);
            }
            return { ...player, roundScore };
          });

          // Check for shoot the moon
          const moonShooter = scoredPlayers.find(p => p.roundScore === 26);
          if (moonShooter) {
            return {
              ...prev,
              players: scoredPlayers.map(p => ({
                ...p,
                roundScore: p.id === moonShooter.id ? 0 : 26,
                score: p.score + (p.id === moonShooter.id ? 0 : 26),
              })),
              currentTrick: [],
              leadSuit: null,
              phase: scoredPlayers.some(p => p.score >= 100) ? "gameEnd" : "roundEnd",
            };
          }

          return {
            ...prev,
            players: scoredPlayers.map(p => ({
              ...p,
              score: p.score + p.roundScore,
            })),
            currentTrick: [],
            leadSuit: null,
            phase: scoredPlayers.some(p => p.score + p.roundScore >= 100) ? "gameEnd" : "roundEnd",
          };
        }

        return {
          ...prev,
          players: finalPlayers,
          currentTrick: [],
          leadSuit: null,
          currentPlayerId: winningPlay.playerId,
          isFirstTrick: false,
          heartsBroken: newHeartsBroken,
        };
      }

      // Get next player
      const currentIndex = prev.players.findIndex(p => p.id === playerId);
      const nextIndex = (currentIndex + 1) % 4;

      return {
        ...prev,
        players: newPlayers,
        currentTrick: newTrick,
        leadSuit: newLeadSuit,
        currentPlayerId: prev.players[nextIndex].id,
        isFirstTrick: prev.isFirstTrick && newTrick.length < 4,
        heartsBroken: newHeartsBroken,
      };
    });

    setSelectedCards([]);

    // Sync state if host
    if (isHost) {
      setTimeout(() => {
        if (gameState) {
          multiplayer.syncGameState(gameState);
        }
      }, 100);
    }
  }, [gameState, playerId, multiplayer, isHost]);

  // Pass cards
  const passCards = useCallback(() => {
    if (!gameState || selectedCards.length !== 3) return;

    multiplayer.sendAction("pass_cards", { cards: selectedCards, playerId });

    setGameState(prev => {
      if (!prev) return null;
      
      const newPlayers = prev.players.map(player => {
        if (player.id === playerId) {
          return { ...player, passedCards: selectedCards };
        }
        return player;
      });

      // Check if all players have passed
      const allPassed = newPlayers.every(p => p.passedCards.length === 3);
      
      if (allPassed) {
        // Exchange cards
        const exchangedPlayers = newPlayers.map((player, idx) => {
          const targetIdx = getPassTargetIndex(idx, prev.passDirection);
          const receivedFrom = newPlayers.findIndex((_, i) => 
            getPassTargetIndex(i, prev.passDirection) === idx
          );
          
          const newHand = sortCards([
            ...player.hand.filter(c => !player.passedCards.some(pc => pc.id === c.id)),
            ...newPlayers[receivedFrom].passedCards,
          ]);

          return {
            ...player,
            hand: newHand,
            passedCards: [],
          };
        });

        // Find player with 2 of clubs
        const startingPlayer = exchangedPlayers.find(p => 
          p.hand.some(c => c.suit === "clubs" && c.rank === 2)
        );

        return {
          ...prev,
          players: exchangedPlayers,
          phase: "playing",
          currentPlayerId: startingPlayer?.id || exchangedPlayers[0].id,
        };
      }

      return { ...prev, players: newPlayers };
    });

    setSelectedCards([]);
  }, [gameState, selectedCards, playerId, multiplayer]);

  // Get pass target index
  const getPassTargetIndex = (fromIndex: number, direction: PassDirection): number => {
    switch (direction) {
      case "left": return (fromIndex + 1) % 4;
      case "right": return (fromIndex + 3) % 4;
      case "across": return (fromIndex + 2) % 4;
      default: return fromIndex;
    }
  };

  // Start new round
  const startNewRound = useCallback(() => {
    if (!isHost) return;

    const deck = shuffleDeck(createDeck(true));
    const nextDirection = PASS_DIRECTIONS[(gameState?.roundNumber || 0) % 4];

    setGameState(prev => {
      if (!prev) return null;

      const newPlayers = prev.players.map((player, idx) => ({
        ...player,
        hand: sortCards(deck.slice(idx * 13, (idx + 1) * 13)),
        collectedCards: [],
        passedCards: [],
        roundScore: 0,
      }));

      return {
        ...prev,
        players: newPlayers,
        currentTrick: [],
        leadSuit: null,
        heartsBroken: false,
        isFirstTrick: true,
        phase: nextDirection === "none" ? "playing" : "passing",
        passDirection: nextDirection,
        roundNumber: prev.roundNumber + 1,
      };
    });

    setShowScoreModal(false);
  }, [isHost, gameState?.roundNumber]);

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

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const isMyTurn = gameState.currentPlayerId === playerId;
  const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] py-8">
      <div className="container max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading">Hearts</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Room: {roomCode} • Round {gameState.roundNumber}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowScoreModal(true)}>
              Scores
            </Button>
            <Button variant="outline" size="sm" onClick={onLeave}>
              Leave
            </Button>
          </div>
        </div>

        {/* Game Board */}
        <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] rounded-xl p-6 min-h-[500px]">
          {gameState.phase === "gameEnd" ? (
            <div className="text-center py-12">
              <motion.div
                className="text-6xl mb-4"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                🏆
              </motion.div>
              <h2 className="text-2xl font-heading mb-4">Game Over!</h2>
              <div className="space-y-2 mb-6 max-w-sm mx-auto">
                {gameState.players
                  .sort((a, b) => a.score - b.score)
                  .map((player, idx) => (
                    <div
                      key={player.id}
                      className="flex justify-between items-center p-3 bg-[var(--color-dark-3)]/50 rounded-lg"
                    >
                      <span>{idx === 0 ? "👑" : `${idx + 1}.`} {player.name}</span>
                      <span className="font-mono">{player.score}</span>
                    </div>
                  ))}
              </div>
              <Button variant="primary" onClick={onLeave}>
                Back to Lobby
              </Button>
            </div>
          ) : (
            <>
              {/* Other players */}
              <div className="flex justify-between items-start mb-4">
                {gameState.players.map((player) => {
                  if (player.id === playerId) return null;
                  const isCurrent = player.id === gameState.currentPlayerId;
                  
                  return (
                    <div key={player.id} className="text-center">
                      <div className={`text-sm mb-2 ${isCurrent ? "text-[var(--color-main-1)]" : "text-[var(--muted-foreground)]"}`}>
                        {player.name} ({player.score} pts) {isCurrent && "⬅"}
                      </div>
                      <div className="flex justify-center">
                        {Array(Math.min(player.hand.length, 7)).fill(0).map((_, i) => (
                          <div
                            key={i}
                            className="w-6 h-10 bg-gradient-to-br from-[var(--color-main-1)] to-purple-700 rounded border border-[var(--color-dark-4)] -ml-3 first:ml-0"
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

              {/* Current trick */}
              <div className="flex justify-center items-center h-40 mb-4">
                <div className="relative w-48 h-32">
                  {gameState.currentTrick.map((play, idx) => {
                    const playerIndex = gameState.players.findIndex(p => p.id === play.playerId);
                    const positions = [
                      { bottom: 0, left: "50%", transform: "translateX(-50%)" },
                      { top: "50%", left: 0, transform: "translateY(-50%)" },
                      { top: 0, left: "50%", transform: "translateX(-50%)" },
                      { top: "50%", right: 0, transform: "translateY(-50%)" },
                    ];
                    const pos = positions[playerIndex];
                    
                    return (
                      <motion.div
                        key={play.card.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute"
                        style={pos as React.CSSProperties}
                      >
                        <PlayingCard card={play.card} small />
                      </motion.div>
                    );
                  })}
                  
                  {gameState.heartsBroken && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-red-400">
                      💔 Hearts Broken
                    </div>
                  )}
                </div>
              </div>

              {/* Status message */}
              <div className="text-center text-sm text-[var(--muted-foreground)] mb-4">
                {gameState.phase === "passing" ? (
                  myPlayer?.passedCards.length === 3 
                    ? "Waiting for others to pass..." 
                    : `Select 3 cards to pass ${gameState.passDirection}`
                ) : isMyTurn ? (
                  <span className="text-[var(--color-main-1)]">Your turn!</span>
                ) : (
                  `Waiting for ${currentPlayer?.name}...`
                )}
              </div>

              {/* My hand */}
              {myPlayer && (
                <div className="border-t border-[var(--color-dark-3)] pt-4">
                  <div className="text-sm text-center mb-2">
                    <span className="text-[var(--muted-foreground)]">Your Hand</span>
                    <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                      ({myPlayer.score} pts)
                    </span>
                  </div>
                  <div className="flex justify-center flex-wrap gap-2">
                    {myPlayer.hand.map((card) => {
                      const isPlayable = gameState.phase === "playing" && isMyTurn && canPlayCard(card);
                      const isSelected = selectedCards.some(c => c.id === card.id);
                      const isPassable = gameState.phase === "passing" && myPlayer.passedCards.length === 0;
                      
                      return (
                        <motion.div
                          key={card.id}
                          whileHover={isPlayable || isPassable ? { y: -8 } : {}}
                          className={(!isPlayable && gameState.phase === "playing") ? "opacity-50" : "cursor-pointer"}
                        >
                          <PlayingCard
                            card={card}
                            selected={isSelected}
                            onClick={() => {
                              if (gameState.phase === "passing" && myPlayer.passedCards.length === 0) {
                                if (isSelected) {
                                  setSelectedCards(prev => prev.filter(c => c.id !== card.id));
                                } else if (selectedCards.length < 3) {
                                  setSelectedCards(prev => [...prev, card]);
                                }
                              } else if (gameState.phase === "playing" && isMyTurn && isPlayable) {
                                playCard(card);
                              }
                            }}
                            disabled={gameState.phase === "playing" && !isPlayable}
                          />
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  {gameState.phase === "passing" && myPlayer.passedCards.length === 0 && (
                    <div className="flex justify-center mt-4">
                      <Button
                        variant="primary"
                        onClick={passCards}
                        disabled={selectedCards.length !== 3}
                      >
                        Pass {selectedCards.length}/3 Cards
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Score Modal */}
        <AnimatePresence>
          {showScoreModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowScoreModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-heading mb-4 text-center">Scores</h2>
                <div className="space-y-2">
                  {gameState.players
                    .sort((a, b) => a.score - b.score)
                    .map((player, idx) => (
                      <div
                        key={player.id}
                        className="flex justify-between items-center p-3 bg-[var(--color-dark-3)]/50 rounded-lg"
                      >
                        <span>{idx === 0 ? "👑" : `${idx + 1}.`} {player.name}</span>
                        <div className="text-right">
                          <span className="font-mono text-lg">{player.score}</span>
                          {player.roundScore > 0 && (
                            <span className="text-red-400 ml-2">(+{player.roundScore})</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
                <button
                  className="mt-4 w-full text-sm text-[var(--muted-foreground)] hover:text-white transition-colors"
                  onClick={() => setShowScoreModal(false)}
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Round End Modal */}
        <AnimatePresence>
          {gameState.phase === "roundEnd" && (
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
                className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-6 max-w-md w-full"
              >
                <h2 className="text-xl font-heading mb-4 text-center">
                  Round {gameState.roundNumber} Complete
                </h2>
                <div className="space-y-2 mb-6">
                  {gameState.players
                    .sort((a, b) => a.score - b.score)
                    .map((player) => (
                      <div
                        key={player.id}
                        className="flex justify-between items-center p-3 bg-[var(--color-dark-3)]/50 rounded-lg"
                      >
                        <span>{player.name}</span>
                        <div className="text-right">
                          <span className="font-mono">{player.score}</span>
                          {player.roundScore > 0 && (
                            <span className="text-red-400 ml-2">(+{player.roundScore})</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
                {isHost && (
                  <Button variant="primary" className="w-full" onClick={startNewRound}>
                    Next Round
                  </Button>
                )}
                {!isHost && (
                  <p className="text-center text-sm text-[var(--muted-foreground)]">
                    Waiting for host to start next round...
                  </p>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

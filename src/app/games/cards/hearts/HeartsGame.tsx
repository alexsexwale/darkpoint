"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  Card,
  Suit,
  Player,
  createDeck,
  shuffleDeck,
  sortCards,
  getHeartsPointValue,
  isQueenOfSpades,
} from "@/lib/cardGames";
import {
  PlayingCard,
  CARD_WIDTH,
} from "@/lib/cardGames/cardRenderer";
import {
  createHumanPlayer,
  createAIPlayer,
  delay,
} from "@/lib/cardGames/utils";
import {
  heartsAIChoosePassCards,
  heartsAIPlayCard,
  AI_THINK_DELAY,
} from "@/lib/cardGames/ai";

type GameMode = "ai";
type GamePhase = "idle" | "passing" | "playing" | "trickEnd" | "roundEnd" | "gameEnd";
type PassDirection = "left" | "right" | "across" | "none";

const PASS_DIRECTIONS: PassDirection[] = ["left", "right", "across", "none"];

interface HeartsPlayer extends Player {
  collectedCards: Card[];
  passedCards: Card[];
  receivedCards: Card[];
  roundScore: number;
}

interface HeartsState {
  players: HeartsPlayer[];
  currentTrick: { playerIndex: number; card: Card }[];
  leadSuit: Suit | null;
  currentPlayerIndex: number;
  startingPlayerIndex: number;
  heartsBroken: boolean;
  isFirstTrick: boolean;
  phase: GamePhase;
  mode: GameMode;
  passDirection: PassDirection;
  roundNumber: number;
  message: string;
  trickWinner: number | null;
}

const createInitialState = (): HeartsState => ({
  players: [],
  currentTrick: [],
  leadSuit: null,
  currentPlayerIndex: 0,
  startingPlayerIndex: 0,
  heartsBroken: false,
  isFirstTrick: true,
  phase: "idle",
  mode: "ai",
  passDirection: "left",
  roundNumber: 1,
  message: "",
  trickWinner: null,
});

export function HeartsGame() {
  const [gameState, setGameState] = useState<HeartsState>(createInitialState());
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const aiThinkingRef = useRef(false);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = currentPlayer?.type === "human";

  // AI turn logic for playing cards
  useEffect(() => {
    if (
      gameState.phase !== "playing" ||
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

      const card = heartsAIPlayCard(
        currentPlayer.hand,
        gameState.currentTrick.map(t => t.card),
        gameState.leadSuit,
        gameState.heartsBroken,
        gameState.isFirstTrick,
        "medium"
      );

      playCard(card);
      aiThinkingRef.current = false;
    };

    playAITurn();
  }, [gameState.currentPlayerIndex, gameState.phase, currentPlayer]);

  // AI logic for passing cards
  useEffect(() => {
    if (
      gameState.phase !== "passing" ||
      gameState.passDirection === "none"
    ) {
      return;
    }

    // Auto-pass for AI players
    const passAICards = async () => {
      for (let i = 0; i < gameState.players.length; i++) {
        const player = gameState.players[i];
        if (player.type === "ai" && player.passedCards.length === 0) {
          await delay(500);
          const cardsToPass = heartsAIChoosePassCards(player.hand, "medium");
          
          setGameState(prev => ({
            ...prev,
            players: prev.players.map((p, idx) => 
              idx === i 
                ? { ...p, passedCards: cardsToPass }
                : p
            ),
          }));
        }
      }
    };

    passAICards();
  }, [gameState.phase, gameState.passDirection, gameState.players]);

  // Check if all players have passed
  useEffect(() => {
    if (gameState.phase !== "passing") return;
    if (gameState.passDirection === "none") {
      // Skip passing phase
      startPlaying();
      return;
    }

    const allPassed = gameState.players.every(p => p.passedCards.length === 3);
    if (allPassed) {
      // Exchange cards
      exchangePassedCards();
    }
  }, [gameState.players, gameState.phase, gameState.passDirection]);

  // Check for trick completion
  useEffect(() => {
    if (gameState.phase !== "playing") return;
    if (gameState.currentTrick.length !== 4) return;

    // Determine trick winner
    const leadSuit = gameState.leadSuit!;
    let winningPlay = gameState.currentTrick[0];
    
    for (const play of gameState.currentTrick) {
      if (play.card.suit === leadSuit && play.card.rank > winningPlay.card.rank) {
        winningPlay = play;
      }
    }

    setGameState(prev => ({
      ...prev,
      phase: "trickEnd",
      trickWinner: winningPlay.playerIndex,
      message: `${prev.players[winningPlay.playerIndex].name} takes the trick!`,
    }));

    // Auto-advance after delay
    setTimeout(() => collectTrick(winningPlay.playerIndex), 1500);
  }, [gameState.currentTrick, gameState.phase]);

  // Exchange passed cards
  const exchangePassedCards = useCallback(() => {
    setGameState(prev => {
      const newPlayers = prev.players.map((player, idx) => {
        const passToIndex = getPassTargetIndex(idx, prev.passDirection);
        const receivedFrom = prev.players.findIndex((_, i) => 
          getPassTargetIndex(i, prev.passDirection) === idx
        );
        
        return {
          ...player,
          receivedCards: prev.players[receivedFrom].passedCards,
        };
      });

      // Update hands
      const finalPlayers = newPlayers.map(player => ({
        ...player,
        hand: sortCards([
          ...player.hand.filter(c => !player.passedCards.some(pc => pc.id === c.id)),
          ...player.receivedCards,
        ]),
        passedCards: [],
        receivedCards: [],
      }));

      return {
        ...prev,
        players: finalPlayers,
        message: "Cards exchanged!",
      };
    });

    setTimeout(() => startPlaying(), 1000);
  }, []);

  // Get pass target index
  const getPassTargetIndex = (fromIndex: number, direction: PassDirection): number => {
    switch (direction) {
      case "left": return (fromIndex + 1) % 4;
      case "right": return (fromIndex + 3) % 4;
      case "across": return (fromIndex + 2) % 4;
      default: return fromIndex;
    }
  };

  // Start playing phase
  const startPlaying = useCallback(() => {
    // Find player with 2 of clubs
    const startingIndex = gameState.players.findIndex(p => 
      p.hand.some(c => c.suit === "clubs" && c.rank === 2)
    );

    setGameState(prev => ({
      ...prev,
      phase: "playing",
      currentPlayerIndex: startingIndex,
      startingPlayerIndex: startingIndex,
      isFirstTrick: true,
      message: prev.mode === "ai" && prev.players[startingIndex].type === "human"
        ? "Your turn! Play the 2 of Clubs"
        : `${prev.players[startingIndex].name} leads with 2 of Clubs`,
    }));
  }, [gameState.players]);

  // Start a new game
  const startGame = useCallback((mode: GameMode) => {
    const players: HeartsPlayer[] = [];
    
    if (mode === "ai") {
      players.push({ ...createHumanPlayer("You"), collectedCards: [], passedCards: [], receivedCards: [], roundScore: 0 });
      for (let i = 1; i < 4; i++) {
        players.push({ ...createAIPlayer(i), collectedCards: [], passedCards: [], receivedCards: [], roundScore: 0 });
      }
    } else {
      for (let i = 0; i < 4; i++) {
        players.push({ ...createHumanPlayer(`Player ${i + 1}`), collectedCards: [], passedCards: [], receivedCards: [], roundScore: 0 });
      }
    }

    // Deal cards
    const deck = shuffleDeck(createDeck(true));
    for (let i = 0; i < 52; i++) {
      players[i % 4].hand.push(deck[i]);
    }
    
    // Sort hands
    for (const player of players) {
      player.hand = sortCards(player.hand);
    }

    setGameState({
      players,
      currentTrick: [],
      leadSuit: null,
      currentPlayerIndex: 0,
      startingPlayerIndex: 0,
      heartsBroken: false,
      isFirstTrick: true,
      phase: "passing",
      mode,
      passDirection: "left",
      roundNumber: 1,
      message: "Select 3 cards to pass",
      trickWinner: null,
    });
    setSelectedCards([]);
    setShowSetupModal(false);
  }, []);

  // Start a new round
  const startNewRound = useCallback(() => {
    const deck = shuffleDeck(createDeck(true));
    
    setGameState(prev => {
      const newPlayers = prev.players.map((player, idx) => ({
        ...player,
        hand: sortCards(deck.slice(idx * 13, (idx + 1) * 13)),
        collectedCards: [],
        passedCards: [],
        receivedCards: [],
        roundScore: 0,
      }));

      const nextDirection = PASS_DIRECTIONS[(prev.roundNumber) % 4];

      return {
        ...prev,
        players: newPlayers,
        currentTrick: [],
        leadSuit: null,
        heartsBroken: false,
        isFirstTrick: true,
        phase: "passing",
        passDirection: nextDirection,
        roundNumber: prev.roundNumber + 1,
        message: nextDirection === "none" ? "No passing this round" : `Pass 3 cards ${nextDirection}`,
        trickWinner: null,
      };
    });
    setSelectedCards([]);
    setShowScoreModal(false);
  }, []);

  // Play a card
  const playCard = useCallback((card: Card) => {
    setGameState(prev => {
      const isLeading = prev.currentTrick.length === 0;
      const newLeadSuit = isLeading ? card.suit : prev.leadSuit;
      
      // Check if hearts broken
      const newHeartsBroken = prev.heartsBroken || card.suit === "hearts";

      const newPlayers = prev.players.map((player, idx) => {
        if (idx === prev.currentPlayerIndex) {
          return {
            ...player,
            hand: player.hand.filter(c => c.id !== card.id),
          };
        }
        return player;
      });

      const newTrick = [...prev.currentTrick, { playerIndex: prev.currentPlayerIndex, card }];
      const nextPlayerIndex = newTrick.length < 4 
        ? (prev.currentPlayerIndex + 1) % 4 
        : prev.currentPlayerIndex;

      const nextPlayer = newPlayers[nextPlayerIndex];
      let nextMessage = "";
      
      if (newTrick.length < 4) {
        nextMessage = prev.mode === "ai" && nextPlayer.type === "human"
          ? "Your turn!"
          : `${nextPlayer.name}'s turn...`;
      }

      return {
        ...prev,
        players: newPlayers,
        currentTrick: newTrick,
        leadSuit: newLeadSuit,
        heartsBroken: newHeartsBroken,
        currentPlayerIndex: nextPlayerIndex,
        isFirstTrick: prev.isFirstTrick && newTrick.length < 4 ? true : false,
        message: nextMessage,
      };
    });
    setSelectedCards([]);
  }, []);

  // Collect trick
  const collectTrick = useCallback((winnerIndex: number) => {
    setGameState(prev => {
      const collectedCards = prev.currentTrick.map(t => t.card);
      
      const newPlayers = prev.players.map((player, idx) => {
        if (idx === winnerIndex) {
          return {
            ...player,
            collectedCards: [...player.collectedCards, ...collectedCards],
          };
        }
        return player;
      });

      // Check if round is over
      const roundOver = newPlayers.every(p => p.hand.length === 0);

      if (roundOver) {
        // Calculate scores
        return handleRoundEnd(prev, newPlayers);
      }

      const nextPlayer = newPlayers[winnerIndex];
      const nextMessage = prev.mode === "ai" && nextPlayer.type === "human"
        ? "Your turn to lead!"
        : `${nextPlayer.name} leads...`;

      return {
        ...prev,
        players: newPlayers,
        currentTrick: [],
        leadSuit: null,
        currentPlayerIndex: winnerIndex,
        startingPlayerIndex: winnerIndex,
        isFirstTrick: false,
        phase: "playing",
        trickWinner: null,
        message: nextMessage,
      };
    });
  }, []);

  // Handle round end
  const handleRoundEnd = (prev: HeartsState, players: HeartsPlayer[]): HeartsState => {
    // Calculate round scores
    const roundScores = players.map(player => {
      let score = 0;
      for (const card of player.collectedCards) {
        score += getHeartsPointValue(card);
      }
      return score;
    });

    // Check for shoot the moon
    const moonShooterIndex = roundScores.findIndex(s => s === 26);
    
    let finalPlayers: HeartsPlayer[];
    if (moonShooterIndex >= 0) {
      // Shooter gets 0, everyone else gets 26
      finalPlayers = players.map((player, idx) => ({
        ...player,
        roundScore: idx === moonShooterIndex ? 0 : 26,
        score: player.score + (idx === moonShooterIndex ? 0 : 26),
      }));
    } else {
      finalPlayers = players.map((player, idx) => ({
        ...player,
        roundScore: roundScores[idx],
        score: player.score + roundScores[idx],
      }));
    }

    // Check for game end
    const gameOver = finalPlayers.some(p => p.score >= 100);
    
    return {
      ...prev,
      players: finalPlayers,
      phase: gameOver ? "gameEnd" : "roundEnd",
      currentTrick: [],
      trickWinner: null,
      message: moonShooterIndex >= 0 
        ? `${players[moonShooterIndex].name} shot the moon!`
        : "Round complete!",
    };
  };

  // Check if card can be played
  const canPlayCard = useCallback((card: Card): boolean => {
    if (!currentPlayer) return false;
    
    const isLeading = gameState.currentTrick.length === 0;
    
    // First trick - must play 2 of clubs
    if (gameState.isFirstTrick && isLeading) {
      return card.suit === "clubs" && card.rank === 2;
    }

    // Must follow suit if possible
    if (!isLeading && gameState.leadSuit) {
      const hasSuit = currentPlayer.hand.some(c => c.suit === gameState.leadSuit);
      if (hasSuit) {
        return card.suit === gameState.leadSuit;
      }
      // Can't follow suit - can play anything except:
      // Hearts or Queen of Spades on first trick (if have other cards)
      if (gameState.isFirstTrick) {
        const hasNonPenalty = currentPlayer.hand.some(c => getHeartsPointValue(c) === 0);
        if (hasNonPenalty && getHeartsPointValue(card) > 0) {
          return false;
        }
      }
      return true;
    }

    // Leading - can't lead hearts until broken (unless only have hearts)
    if (isLeading && !gameState.heartsBroken && card.suit === "hearts") {
      const hasNonHearts = currentPlayer.hand.some(c => c.suit !== "hearts");
      return !hasNonHearts;
    }

    return true;
  }, [currentPlayer, gameState.currentTrick.length, gameState.leadSuit, gameState.isFirstTrick, gameState.heartsBroken]);

  // Handle card selection for passing
  const handlePassCardSelect = (card: Card) => {
    if (selectedCards.some(c => c.id === card.id)) {
      setSelectedCards(prev => prev.filter(c => c.id !== card.id));
    } else if (selectedCards.length < 3) {
      setSelectedCards(prev => [...prev, card]);
    }
  };

  // Confirm pass selection
  const confirmPass = () => {
    if (selectedCards.length !== 3) return;
    
    const humanIndex = gameState.players.findIndex(p => p.type === "human");
    
    setGameState(prev => ({
      ...prev,
      players: prev.players.map((p, idx) => 
        idx === humanIndex 
          ? { ...p, passedCards: selectedCards }
          : p
      ),
      message: "Waiting for others to pass...",
    }));
    setSelectedCards([]);
  };

  // Handle card click for playing
  const handlePlayCardClick = (card: Card) => {
    if (!isHumanTurn || gameState.phase !== "playing") return;
    if (canPlayCard(card)) {
      playCard(card);
    }
  };

  // Get winner(s)
  const getWinners = (): HeartsPlayer[] => {
    const minScore = Math.min(...gameState.players.map(p => p.score));
    return gameState.players.filter(p => p.score === minScore);
  };

  // Current player for local multiplayer
  const localCurrentPlayer = gameState.mode === "local" ? currentPlayer : null;
  const humanPlayer = gameState.players.find(p => p.type === "human");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] py-8">
      <div className="container max-w-5xl">
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
              <h1 className="text-2xl font-heading">Hearts</h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                vs AI 
                {gameState.phase !== "idle" && ` • Round ${gameState.roundNumber}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {gameState.phase !== "idle" && (
              <Button variant="outline" size="sm" onClick={() => setShowScoreModal(true)}>
                Scores
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => setShowSetupModal(true)}>
              New Game
            </Button>
          </div>
        </div>

        {/* Game Board */}
        <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] rounded-xl p-6 min-h-[500px]">
          {gameState.phase === "idle" ? (
            // Start screen
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="text-6xl mb-6">💜</div>
              <h2 className="text-2xl font-heading mb-4">Hearts</h2>
              <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                Avoid hearts and the Queen of Spades. Or collect them all to shoot the moon!
                First to 100 points loses.
              </p>
              <Button variant="primary" size="lg" onClick={() => setShowSetupModal(true)}>
                Start Game
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Opponents */}
              <div className="flex justify-between items-start mb-4">
                {gameState.players.map((player, idx) => {
                  if (gameState.mode === "ai" && player.type === "human") return null;
                  if (gameState.mode === "local" && idx === gameState.currentPlayerIndex && gameState.phase === "playing") return null;
                  
                  const isCurrentTurn = idx === gameState.currentPlayerIndex;
                  const position = idx === 0 ? "bottom" : idx === 1 ? "left" : idx === 2 ? "top" : "right";
                  
                  return (
                    <div key={player.id} className={`text-center ${idx === 2 ? "mx-auto" : ""}`}>
                      <div className={`text-sm mb-2 ${isCurrentTurn ? "text-[var(--color-main-1)]" : "text-[var(--muted-foreground)]"}`}>
                        {player.name} ({player.score} pts)
                        {isCurrentTurn && " ⬅"}
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

              {/* Center: Current trick */}
              <div className="flex justify-center items-center h-40 mb-4">
                <div className="relative w-48 h-32">
                  {gameState.currentTrick.map((play, idx) => {
                    const positions = [
                      { bottom: 0, left: "50%", transform: "translateX(-50%)" },
                      { top: "50%", left: 0, transform: "translateY(-50%)" },
                      { top: 0, left: "50%", transform: "translateX(-50%)" },
                      { top: "50%", right: 0, transform: "translateY(-50%)" },
                    ];
                    const pos = positions[play.playerIndex];
                    
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
                  
                  {/* Hearts broken indicator */}
                  {gameState.heartsBroken && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-red-400 flex items-center gap-1">
                      <span>💔</span> Hearts Broken
                    </div>
                  )}
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

              {/* Passing phase - Human player */}
              {gameState.phase === "passing" && gameState.passDirection !== "none" && humanPlayer && humanPlayer.passedCards.length === 0 && (
                <div className="border-t border-[var(--color-dark-3)] pt-4">
                  <div className="text-sm text-center mb-2 text-[var(--muted-foreground)]">
                    Select 3 cards to pass {gameState.passDirection}
                  </div>
                  <div className="flex justify-center flex-wrap gap-2">
                    {humanPlayer.hand.map((card) => {
                      const isSelected = selectedCards.some(c => c.id === card.id);
                      return (
                        <motion.div
                          key={card.id}
                          whileHover={{ y: -8 }}
                          className="cursor-pointer"
                        >
                          <PlayingCard
                            card={card}
                            selected={isSelected}
                            onClick={() => handlePassCardSelect(card)}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="primary"
                      onClick={confirmPass}
                      disabled={selectedCards.length !== 3}
                    >
                      Pass {selectedCards.length}/3 Cards
                    </Button>
                  </div>
                </div>
              )}

              {/* Playing phase - Human player's hand */}
              {gameState.phase === "playing" && gameState.mode === "ai" && humanPlayer && (
                <div className="border-t border-[var(--color-dark-3)] pt-4">
                  <div className="text-sm text-center mb-2">
                    <span className="text-[var(--muted-foreground)]">Your Hand</span>
                    <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                      ({humanPlayer.collectedCards.filter(c => getHeartsPointValue(c) > 0).length} pts collected)
                    </span>
                  </div>
                  <div className="flex justify-center flex-wrap gap-2">
                    {humanPlayer.hand.map((card) => {
                      const canPlay = isHumanTurn && canPlayCard(card);
                      return (
                        <motion.div
                          key={card.id}
                          whileHover={canPlay ? { y: -8 } : {}}
                          className={!canPlay && isHumanTurn ? "opacity-50" : canPlay ? "cursor-pointer" : ""}
                        >
                          <PlayingCard
                            card={card}
                            onClick={() => handlePlayCardClick(card)}
                            disabled={!canPlay}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Playing phase - Local multiplayer */}
              {gameState.phase === "playing" && gameState.mode === "local" && localCurrentPlayer && (
                <div className="border-t border-[var(--color-dark-3)] pt-4">
                  <div className="text-sm text-center mb-2 text-[var(--color-main-1)]">
                    {localCurrentPlayer.name}&apos;s Turn
                  </div>
                  <div className="flex justify-center flex-wrap gap-2">
                    {localCurrentPlayer.hand.map((card) => {
                      const canPlay = canPlayCard(card);
                      return (
                        <motion.div
                          key={card.id}
                          whileHover={canPlay ? { y: -8 } : {}}
                          className={!canPlay ? "opacity-50" : "cursor-pointer"}
                        >
                          <PlayingCard
                            card={card}
                            onClick={() => {
                              if (canPlay) playCard(card);
                            }}
                            disabled={!canPlay}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

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
                <div className="space-y-3">
                  <button
                    className="w-full p-4 bg-[var(--color-dark-3)]/50 hover:bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg transition-colors text-left"
                    onClick={() => startGame("ai")}
                  >
                    <div className="font-medium">Play vs AI</div>
                    <div className="text-sm text-[var(--muted-foreground)]">
                      You against 3 computer opponents
                    </div>
                  </button>
                  <div className="pt-3 border-t border-[var(--color-dark-3)]">
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
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{idx === 0 ? "👑" : `${idx + 1}.`}</span>
                          <span>{player.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-lg">{player.score}</div>
                          {player.roundScore > 0 && (
                            <div className="text-xs text-red-400">+{player.roundScore}</div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
                <div className="text-xs text-center text-[var(--muted-foreground)] mt-4">
                  Game ends when someone reaches 100 points. Lowest score wins!
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
                <h2 className="text-xl font-heading mb-4 text-center">Round {gameState.roundNumber} Complete</h2>
                
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
                          {player.roundScore === 0 && gameState.message.includes("moon") && (
                            <span className="text-green-400 ml-2">🌙</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                <Button variant="primary" className="w-full" onClick={startNewRound}>
                  Next Round
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game End Modal */}
        <AnimatePresence>
          {gameState.phase === "gameEnd" && (
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
                  🏆
                </motion.div>
                <h2 className="text-2xl font-heading mb-2">Game Over!</h2>
                <p className="text-[var(--muted-foreground)] mb-6">
                  {getWinners().map(w => w.name).join(" & ")} wins with {getWinners()[0]?.score} points!
                </p>
                
                <div className="space-y-2 mb-6 text-left">
                  {gameState.players
                    .sort((a, b) => a.score - b.score)
                    .map((player, idx) => (
                      <div
                        key={player.id}
                        className="flex justify-between items-center p-3 bg-[var(--color-dark-3)]/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span>{idx === 0 ? "👑" : `${idx + 1}.`}</span>
                          <span>{player.name}</span>
                        </div>
                        <span className="font-mono">{player.score}</span>
                      </div>
                    ))}
                </div>

                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setGameState(createInitialState())}>
                    Back to Menu
                  </Button>
                  <Button variant="primary" onClick={() => startGame(gameState.mode)}>
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

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  Card,
  createDeck,
  shuffleDeck,
} from "@/lib/cardGames";
import { PlayingCard } from "@/lib/cardGames/cardRenderer";

type Difficulty = "easy" | "medium" | "hard" | "master";
type GamePhase = "idle" | "betting" | "dealing" | "playerTurn" | "dealerTurn" | "result" | "insurance";

interface Hand {
  cards: Card[];
  bet: number;
  isDoubled: boolean;
  isStanding: boolean;
  isBusted: boolean;
  isBlackjack: boolean;
}

interface GameState {
  deck: Card[];
  playerHands: Hand[];
  activeHandIndex: number;
  dealerHand: Card[];
  dealerRevealed: boolean;
  phase: GamePhase;
  chips: number;
  currentBet: number;
  message: string;
  difficulty: Difficulty;
  insuranceBet: number;
  showInsurance: boolean;
  resultCalculated: boolean;
}

const INITIAL_CHIPS = 1000;
const MIN_BET = 10;
const MAX_BET = 500;

const BET_AMOUNTS = [10, 25, 50, 100, 250, 500];

// Calculate hand value (Ace = 1 or 11)
const calculateHandValue = (cards: Card[]): { value: number; soft: boolean } => {
  let value = 0;
  let aces = 0;

  for (const card of cards) {
    if (!card.faceUp) continue;
    
    if (card.rank === 1) {
      aces++;
      value += 11;
    } else if (card.rank >= 10) {
      value += 10;
    } else {
      value += card.rank;
    }
  }

  // Convert aces from 11 to 1 if busting
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return { value, soft: aces > 0 };
};

// Calculate hand value including face-down cards (for dealer decisions)
const calculateFullHandValue = (cards: Card[]): number => {
  let value = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === 1) {
      aces++;
      value += 11;
    } else if (card.rank >= 10) {
      value += 10;
    } else {
      value += card.rank;
    }
  }

  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
};

// Check if hand is blackjack (21 with 2 cards)
const isBlackjack = (cards: Card[]): boolean => {
  if (cards.length !== 2) return false;
  return calculateFullHandValue(cards) === 21;
};

// Check if hand can be split
const canSplit = (cards: Card[]): boolean => {
  if (cards.length !== 2) return false;
  const rank1 = cards[0].rank >= 10 ? 10 : cards[0].rank;
  const rank2 = cards[1].rank >= 10 ? 10 : cards[1].rank;
  return rank1 === rank2;
};

const createInitialState = (): GameState => ({
  deck: [],
  playerHands: [],
  activeHandIndex: 0,
  dealerHand: [],
  dealerRevealed: false,
  phase: "idle",
  chips: INITIAL_CHIPS,
  currentBet: MIN_BET,
  message: "",
  difficulty: "medium",
  insuranceBet: 0,
  showInsurance: false,
  resultCalculated: false,
});

export function BlackjackGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const dealerTurnRef = useRef(false);

  const activeHand = gameState.playerHands[gameState.activeHandIndex];
  const playerValue = activeHand ? calculateHandValue(activeHand.cards) : { value: 0, soft: false };
  const dealerValue = calculateHandValue(gameState.dealerHand);

  // Start new game
  const startGame = useCallback((difficulty: Difficulty) => {
    const deck = shuffleDeck(createDeck(true));
    setGameState({
      ...createInitialState(),
      deck,
      difficulty,
      phase: "betting",
      chips: INITIAL_CHIPS,
      message: "Place your bet!",
    });
    setShowSetupModal(false);
  }, []);

  // Place bet and deal cards
  const placeBet = useCallback(() => {
    if (gameState.currentBet > gameState.chips) return;

    let deck = [...gameState.deck];
    
    // Reshuffle if deck is low
    if (deck.length < 15) {
      deck = shuffleDeck(createDeck(true));
    }

    // Deal 2 cards to player, 2 to dealer (one face down)
    const playerCards = [deck.pop()!, deck.pop()!];
    const dealerCards = [
      { ...deck.pop()!, faceUp: true },
      { ...deck.pop()!, faceUp: false }, // Hole card
    ];

    const playerBlackjack = isBlackjack(playerCards);
    const dealerShowsAce = dealerCards[0].rank === 1;

    const newHand: Hand = {
      cards: playerCards,
      bet: gameState.currentBet,
      isDoubled: false,
      isStanding: false,
      isBusted: false,
      isBlackjack: playerBlackjack,
    };

    setGameState(prev => ({
      ...prev,
      deck,
      playerHands: [newHand],
      activeHandIndex: 0,
      dealerHand: dealerCards,
      dealerRevealed: false,
      chips: prev.chips - prev.currentBet,
      phase: dealerShowsAce ? "insurance" : (playerBlackjack ? "dealerTurn" : "playerTurn"),
      showInsurance: dealerShowsAce,
      message: dealerShowsAce 
        ? "Insurance?" 
        : (playerBlackjack ? "Blackjack!" : "Your turn - Hit or Stand?"),
    }));
  }, [gameState.currentBet, gameState.chips, gameState.deck]);

  // Handle insurance decision
  const handleInsurance = useCallback((takeInsurance: boolean) => {
    const insuranceAmount = takeInsurance ? Math.floor(gameState.currentBet / 2) : 0;
    
    setGameState(prev => {
      const playerBlackjack = prev.playerHands[0]?.isBlackjack;
      return {
        ...prev,
        insuranceBet: insuranceAmount,
        chips: prev.chips - insuranceAmount,
        showInsurance: false,
        phase: playerBlackjack ? "dealerTurn" : "playerTurn",
        message: playerBlackjack ? "Blackjack!" : "Your turn - Hit or Stand?",
      };
    });
  }, [gameState.currentBet]);

  // Hit - draw a card
  const hit = useCallback(() => {
    if (gameState.phase !== "playerTurn" || !activeHand) return;

    const deck = [...gameState.deck];
    const newCard = deck.pop()!;
    
    setGameState(prev => {
      const hands = [...prev.playerHands];
      const hand = { ...hands[prev.activeHandIndex] };
      hand.cards = [...hand.cards, newCard];
      
      const value = calculateFullHandValue(hand.cards);
      hand.isBusted = value > 21;
      
      hands[prev.activeHandIndex] = hand;

      // If busted, move to next hand or dealer turn
      let nextPhase = prev.phase;
      let nextHandIndex = prev.activeHandIndex;
      let message = prev.message;

      if (hand.isBusted) {
        message = "Busted!";
        // Check if there are more hands to play
        if (prev.activeHandIndex < hands.length - 1) {
          nextHandIndex = prev.activeHandIndex + 1;
          message = `Playing hand ${nextHandIndex + 1}`;
        } else {
          nextPhase = "dealerTurn";
        }
      }

      return {
        ...prev,
        deck,
        playerHands: hands,
        activeHandIndex: nextHandIndex,
        phase: nextPhase,
        message,
      };
    });
  }, [gameState.phase, gameState.deck, activeHand]);

  // Stand - end player turn
  const stand = useCallback(() => {
    if (gameState.phase !== "playerTurn" || !activeHand) return;

    setGameState(prev => {
      const hands = [...prev.playerHands];
      hands[prev.activeHandIndex] = { ...hands[prev.activeHandIndex], isStanding: true };

      // Check if there are more hands to play
      if (prev.activeHandIndex < hands.length - 1) {
        return {
          ...prev,
          playerHands: hands,
          activeHandIndex: prev.activeHandIndex + 1,
          message: `Playing hand ${prev.activeHandIndex + 2}`,
        };
      }

      return {
        ...prev,
        playerHands: hands,
        phase: "dealerTurn",
        message: "Dealer's turn",
      };
    });
  }, [gameState.phase, activeHand]);

  // Double down
  const doubleDown = useCallback(() => {
    if (gameState.phase !== "playerTurn" || !activeHand) return;
    if (activeHand.cards.length !== 2) return;
    if (gameState.chips < activeHand.bet) return;

    const deck = [...gameState.deck];
    const newCard = deck.pop()!;

    setGameState(prev => {
      const hands = [...prev.playerHands];
      const hand = { ...hands[prev.activeHandIndex] };
      hand.cards = [...hand.cards, newCard];
      hand.bet *= 2;
      hand.isDoubled = true;
      hand.isStanding = true;
      
      const value = calculateFullHandValue(hand.cards);
      hand.isBusted = value > 21;
      
      hands[prev.activeHandIndex] = hand;

      // Check if there are more hands to play
      let nextPhase: GamePhase = "dealerTurn";
      let nextHandIndex = prev.activeHandIndex;
      let message = hand.isBusted ? "Busted!" : "Dealer's turn";

      if (prev.activeHandIndex < hands.length - 1) {
        nextPhase = "playerTurn";
        nextHandIndex = prev.activeHandIndex + 1;
        message = hand.isBusted ? `Busted! Playing hand ${nextHandIndex + 1}` : `Playing hand ${nextHandIndex + 1}`;
      }

      return {
        ...prev,
        deck,
        playerHands: hands,
        activeHandIndex: nextHandIndex,
        chips: prev.chips - (hand.bet / 2), // Deduct the additional bet
        phase: nextPhase,
        message,
      };
    });
  }, [gameState.phase, gameState.chips, gameState.deck, activeHand]);

  // Split hand
  const split = useCallback(() => {
    if (gameState.phase !== "playerTurn" || !activeHand) return;
    if (!canSplit(activeHand.cards)) return;
    if (gameState.chips < activeHand.bet) return;

    const deck = [...gameState.deck];
    const card1 = deck.pop()!;
    const card2 = deck.pop()!;

    setGameState(prev => {
      const hands = [...prev.playerHands];
      const originalHand = hands[prev.activeHandIndex];
      
      // Create two new hands from the split
      const hand1: Hand = {
        cards: [originalHand.cards[0], card1],
        bet: originalHand.bet,
        isDoubled: false,
        isStanding: false,
        isBusted: false,
        isBlackjack: false, // Split blackjacks don't count as blackjack
      };
      
      const hand2: Hand = {
        cards: [originalHand.cards[1], card2],
        bet: originalHand.bet,
        isDoubled: false,
        isStanding: false,
        isBusted: false,
        isBlackjack: false,
      };

      hands.splice(prev.activeHandIndex, 1, hand1, hand2);

      return {
        ...prev,
        deck,
        playerHands: hands,
        chips: prev.chips - originalHand.bet, // Deduct bet for second hand
        message: "Playing hand 1",
      };
    });
  }, [gameState.phase, gameState.chips, gameState.deck, activeHand]);

  // Dealer turn logic
  useEffect(() => {
    if (gameState.phase !== "dealerTurn") {
      dealerTurnRef.current = false;
      return;
    }
    if (dealerTurnRef.current) return;
    dealerTurnRef.current = true;

    // Check if all player hands are busted
    const allBusted = gameState.playerHands.every(h => h.isBusted);
    const currentDeck = [...gameState.deck];
    const currentDealerHand = [...gameState.dealerHand];
    const difficulty = gameState.difficulty;
    
    const playDealer = async () => {
      // Reveal dealer's hole card
      setGameState(prev => ({
        ...prev,
        dealerHand: prev.dealerHand.map(c => ({ ...c, faceUp: true })),
        dealerRevealed: true,
      }));

      if (allBusted) {
        // Skip dealer play if all hands busted
        await new Promise(r => setTimeout(r, 500));
        setGameState(prev => ({ ...prev, phase: "result", resultCalculated: false }));
        return;
      }

      // Check for dealer blackjack first
      const hasBlackjack = isBlackjack(currentDealerHand);
      if (hasBlackjack) {
        await new Promise(r => setTimeout(r, 500));
        setGameState(prev => ({ ...prev, phase: "result", resultCalculated: false, message: "Dealer has Blackjack!" }));
        return;
      }

      await new Promise(r => setTimeout(r, 1000));

      // Dealer draws until 17 or higher
      let deck = currentDeck;
      let dealerCards = currentDealerHand.map(c => ({ ...c, faceUp: true }));
      let dealerTotal = calculateFullHandValue(dealerCards);

      // Determine stand threshold based on difficulty
      const standOn17 = difficulty === "easy" ? 16 : 17;
      
      while (dealerTotal < standOn17 && deck.length > 0) {
        await new Promise(r => setTimeout(r, 700));
        const newCard = { ...deck.pop()!, faceUp: true };
        dealerCards = [...dealerCards, newCard];
        dealerTotal = calculateFullHandValue(dealerCards);
        
        setGameState(prev => ({
          ...prev,
          deck: [...deck],
          dealerHand: dealerCards,
          message: `Dealer draws... (${dealerTotal})`,
        }));
      }

      await new Promise(r => setTimeout(r, 500));
      setGameState(prev => ({
        ...prev,
        deck: [...deck],
        dealerHand: dealerCards,
        phase: "result",
        resultCalculated: false,
        message: dealerTotal > 21 ? "Dealer busts!" : `Dealer stands on ${dealerTotal}`,
      }));
    };

    playDealer();
  }, [gameState.phase]);

  // Calculate results
  useEffect(() => {
    if (gameState.phase !== "result") return;
    if (gameState.resultCalculated) return;

    const dealerTotal = calculateFullHandValue(gameState.dealerHand);
    const dealerBlackjack = isBlackjack(gameState.dealerHand);
    const dealerBusted = dealerTotal > 21;

    let totalWinnings = 0;
    let message = "";

    // Check insurance first
    if (gameState.insuranceBet > 0) {
      if (dealerBlackjack) {
        totalWinnings += gameState.insuranceBet * 3; // Insurance pays 2:1
        message = "Insurance wins! ";
      }
    }

    // Calculate winnings for each hand
    for (const hand of gameState.playerHands) {
      const playerTotal = calculateFullHandValue(hand.cards);
      const playerBlackjack = hand.isBlackjack;

      if (hand.isBusted) {
        // Player loses
        continue;
      } else if (playerBlackjack && !dealerBlackjack) {
        // Player blackjack pays 3:2
        totalWinnings += hand.bet * 2.5;
        message += "Blackjack! ";
      } else if (dealerBlackjack && !playerBlackjack) {
        // Dealer blackjack, player loses (already lost bet)
        continue;
      } else if (dealerBusted) {
        // Dealer busts, player wins
        totalWinnings += hand.bet * 2;
        message += "Dealer busts! ";
      } else if (playerTotal > dealerTotal) {
        // Player wins
        totalWinnings += hand.bet * 2;
        message += "You win! ";
      } else if (playerTotal === dealerTotal) {
        // Push
        totalWinnings += hand.bet;
        message += "Push. ";
      }
      // Player loses if dealerTotal > playerTotal
    }

    if (!message) {
      message = "Dealer wins.";
    }

    setGameState(prev => ({
      ...prev,
      chips: prev.chips + totalWinnings,
      message: message.trim(),
      resultCalculated: true,
    }));
  }, [gameState.phase, gameState.resultCalculated, gameState.dealerHand, gameState.playerHands, gameState.insuranceBet]);

  // Start new round
  const newRound = useCallback(() => {
    if (gameState.chips < MIN_BET) {
      // Game over - no more chips
      setGameState(prev => ({
        ...prev,
        phase: "idle",
        message: "Game Over! You're out of chips.",
      }));
      return;
    }

    let deck = [...gameState.deck];
    if (deck.length < 15) {
      deck = shuffleDeck(createDeck(true));
    }

    setGameState(prev => ({
      ...prev,
      deck,
      playerHands: [],
      dealerHand: [],
      dealerRevealed: false,
      phase: "betting",
      currentBet: Math.min(prev.currentBet, prev.chips),
      insuranceBet: 0,
      showInsurance: false,
      resultCalculated: false,
      message: "Place your bet!",
    }));
  }, [gameState.chips, gameState.deck]);

  // Adjust bet
  const setBet = (amount: number) => {
    setGameState(prev => ({
      ...prev,
      currentBet: Math.min(Math.max(MIN_BET, amount), Math.min(MAX_BET, prev.chips)),
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 to-[var(--color-dark-1)]">
      {/* Header */}
      <div className="container pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/games/casino" className="text-[var(--muted-foreground)] hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-heading">Blackjack</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRulesModal(true)}
              className="text-sm text-[var(--muted-foreground)] hover:text-white transition-colors"
            >
              How to Play
            </button>
            <Button variant="primary" size="sm" onClick={() => setShowSetupModal(true)}>
              New Game
            </Button>
          </div>
        </div>
      </div>

      {/* Game Table */}
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Chip Count */}
          <div className="flex justify-center mb-6">
            <div className="bg-black/30 backdrop-blur rounded-full px-6 py-2 flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <span className="text-xl font-bold text-yellow-400">${gameState.chips}</span>
            </div>
          </div>

          {/* Game Area */}
          {gameState.phase === "idle" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-6">🃏</div>
              <h1 className="text-4xl font-heading mb-4 text-white">Blackjack</h1>
              <p className="text-[var(--muted-foreground)] mb-8 max-w-md mx-auto">
                Beat the dealer by getting as close to 21 as possible without going over.
              </p>
              <Button variant="primary" size="lg" onClick={() => setShowSetupModal(true)}>
                Start Game
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-8">
              {/* Dealer Area */}
              <div className="text-center">
                <div className="text-sm text-[var(--muted-foreground)] mb-2">
                  Dealer {gameState.dealerRevealed && `(${calculateFullHandValue(gameState.dealerHand)})`}
                </div>
                <div className="flex justify-center gap-2 min-h-[140px] items-center">
                  <AnimatePresence mode="popLayout">
                    {gameState.dealerHand.map((card, i) => (
                      <motion.div
                        key={card.id + i}
                        initial={{ opacity: 0, y: -50, rotateY: 180 }}
                        animate={{ opacity: 1, y: 0, rotateY: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <PlayingCard card={card} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {gameState.dealerHand.length === 0 && (
                    <div className="w-[90px] h-[126px] border-2 border-dashed border-white/20 rounded-lg" />
                  )}
                </div>
              </div>

              {/* Message */}
              <div className="text-center">
                <motion.div
                  key={gameState.message}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-block bg-black/40 backdrop-blur rounded-lg px-6 py-3"
                >
                  <span className="text-lg font-medium text-white">{gameState.message}</span>
                </motion.div>
              </div>

              {/* Insurance Modal */}
              <AnimatePresence>
                {gameState.showInsurance && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex justify-center"
                  >
                    <div className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-6 text-center">
                      <p className="text-[var(--muted-foreground)] mb-4">
                        Dealer shows an Ace. Take insurance? (Cost: ${Math.floor(gameState.currentBet / 2)})
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button variant="outline" onClick={() => handleInsurance(false)}>
                          No Thanks
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() => handleInsurance(true)}
                          disabled={gameState.chips < Math.floor(gameState.currentBet / 2)}
                        >
                          Take Insurance
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Player Hands */}
              <div className="space-y-4">
                {gameState.playerHands.map((hand, handIndex) => (
                  <div key={handIndex} className="text-center">
                    <div className="text-sm text-[var(--muted-foreground)] mb-2 flex items-center justify-center gap-2">
                      {gameState.playerHands.length > 1 && (
                        <span className={handIndex === gameState.activeHandIndex ? "text-emerald-400" : ""}>
                          Hand {handIndex + 1}
                        </span>
                      )}
                      <span>
                        ({calculateFullHandValue(hand.cards)}
                        {hand.isBusted && " - BUST"}
                        {hand.isBlackjack && " - BLACKJACK"})
                      </span>
                      <span className="text-yellow-400">Bet: ${hand.bet}</span>
                    </div>
                    <div className="flex justify-center gap-2 min-h-[140px] items-center">
                      <AnimatePresence mode="popLayout">
                        {hand.cards.map((card, i) => (
                          <motion.div
                            key={card.id + i}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ 
                              opacity: 1, 
                              y: 0,
                              scale: handIndex === gameState.activeHandIndex && gameState.phase === "playerTurn" ? 1 : 0.9,
                            }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ delay: i * 0.1 }}
                          >
                            <PlayingCard card={card} />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}

                {gameState.playerHands.length === 0 && gameState.phase === "betting" && (
                  <div className="flex justify-center">
                    <div className="w-[90px] h-[126px] border-2 border-dashed border-white/20 rounded-lg" />
                  </div>
                )}
              </div>

              {/* Betting Controls */}
              {gameState.phase === "betting" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-black/30 backdrop-blur rounded-xl p-6"
                >
                  <div className="text-center mb-4">
                    <span className="text-[var(--muted-foreground)]">Current Bet: </span>
                    <span className="text-2xl font-bold text-yellow-400">${gameState.currentBet}</span>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {BET_AMOUNTS.filter(amount => amount <= gameState.chips).map(amount => (
                      <button
                        key={amount}
                        onClick={() => setBet(amount)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          gameState.currentBet === amount
                            ? "bg-yellow-500 text-black"
                            : "bg-[var(--color-dark-3)] text-white hover:bg-[var(--color-dark-4)]"
                        }`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-center">
                    <Button variant="primary" size="lg" onClick={placeBet}>
                      Deal Cards
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Player Actions */}
              {gameState.phase === "playerTurn" && activeHand && !activeHand.isStanding && !activeHand.isBusted && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap justify-center gap-3"
                >
                  <Button variant="primary" onClick={hit}>
                    Hit
                  </Button>
                  <Button variant="outline" onClick={stand}>
                    Stand
                  </Button>
                  {activeHand.cards.length === 2 && (
                    <>
                      <Button
                        variant="outline"
                        onClick={doubleDown}
                        disabled={gameState.chips < activeHand.bet}
                      >
                        Double Down
                      </Button>
                      {canSplit(activeHand.cards) && (
                        <Button
                          variant="outline"
                          onClick={split}
                          disabled={gameState.chips < activeHand.bet || gameState.playerHands.length >= 4}
                        >
                          Split
                        </Button>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {/* Result Actions */}
              {gameState.phase === "result" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center gap-3"
                >
                  <Button variant="primary" onClick={newRound} disabled={gameState.chips < MIN_BET}>
                    {gameState.chips >= MIN_BET ? "Play Again" : "Game Over"}
                  </Button>
                  {gameState.chips < MIN_BET && (
                    <Button variant="outline" onClick={() => startGame(gameState.difficulty)}>
                      New Game ($1000)
                    </Button>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Setup Modal */}
      <AnimatePresence>
        {showSetupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSetupModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-heading mb-6 text-center">New Game</h2>
              
              <div className="mb-6">
                <label className="block text-sm text-[var(--muted-foreground)] mb-3">
                  Select Difficulty
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["easy", "medium", "hard", "master"] as Difficulty[]).map(diff => (
                    <button
                      key={diff}
                      onClick={() => startGame(diff)}
                      className="p-4 rounded-lg border border-[var(--color-dark-3)] hover:border-emerald-500 transition-colors text-center"
                    >
                      <span className="text-2xl mb-1 block">
                        {diff === "easy" ? "🌱" : diff === "medium" ? "🎯" : diff === "hard" ? "🔥" : "👑"}
                      </span>
                      <span className="capitalize font-medium">{diff}</span>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        {diff === "easy" && "Dealer stands on 16"}
                        {diff === "medium" && "Standard rules"}
                        {diff === "hard" && "Optimal play"}
                        {diff === "master" && "Perfect strategy"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={() => setShowSetupModal(false)}>
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules Modal */}
      <AnimatePresence>
        {showRulesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRulesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-heading mb-4">How to Play Blackjack</h2>
              
              <div className="space-y-4 text-sm text-[var(--muted-foreground)]">
                <div>
                  <h3 className="text-white font-medium mb-1">Objective</h3>
                  <p>Beat the dealer by getting a hand value closer to 21 without going over.</p>
                </div>

                <div>
                  <h3 className="text-white font-medium mb-1">Card Values</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Number cards (2-10): Face value</li>
                    <li>Face cards (J, Q, K): 10</li>
                    <li>Ace: 1 or 11 (whichever is better)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-white font-medium mb-1">Actions</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong className="text-white">Hit:</strong> Draw another card</li>
                    <li><strong className="text-white">Stand:</strong> Keep your current hand</li>
                    <li><strong className="text-white">Double Down:</strong> Double your bet, get one more card, then stand</li>
                    <li><strong className="text-white">Split:</strong> Split matching cards into two hands (costs another bet)</li>
                    <li><strong className="text-white">Insurance:</strong> Side bet when dealer shows Ace (pays 2:1 if dealer has blackjack)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-white font-medium mb-1">Payouts</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Win: 1:1 (double your bet)</li>
                    <li>Blackjack (21 with 2 cards): 3:2</li>
                    <li>Push (tie): Bet returned</li>
                  </ul>
                </div>
              </div>

              <Button variant="primary" className="w-full mt-6" onClick={() => setShowRulesModal(false)}>
                Got It!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  Card,
  Rank,
  createDeck,
  shuffleDeck,
} from "@/lib/cardGames";
import { PlayingCard } from "@/lib/cardGames/cardRenderer";

type Difficulty = "easy" | "medium" | "hard" | "master";
type GamePhase = "idle" | "preflop" | "flop" | "turn" | "river" | "showdown" | "roundEnd";
type PlayerAction = "fold" | "check" | "call" | "raise" | "allin";

interface PokerPlayer {
  id: number;
  name: string;
  chips: number;
  hand: Card[];
  currentBet: number;
  totalBet: number;
  hasFolded: boolean;
  hasActed: boolean;
  isAllIn: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isHuman: boolean;
  lastAction?: PlayerAction;
}

interface HandRank {
  rank: number; // 1-10, 10 being royal flush
  name: string;
  highCards: number[]; // For tiebreakers
}

interface GameState {
  deck: Card[];
  communityCards: Card[];
  players: PokerPlayer[];
  pot: number;
  sidePots: { amount: number; eligiblePlayers: number[] }[];
  currentPlayerIndex: number;
  dealerIndex: number;
  phase: GamePhase;
  currentBet: number;
  minRaise: number;
  difficulty: Difficulty;
  smallBlind: number;
  bigBlind: number;
  message: string;
  winners: { playerId: number; amount: number; handName: string }[];
  lastRaiseIndex: number;
}

const INITIAL_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const AI_THINK_DELAY = 800;

const AI_NAMES = ["Alex", "Sam", "Jordan", "Casey", "Riley"];

// Hand Rankings (1 = High Card, 10 = Royal Flush)
const HAND_RANKINGS = {
  HIGH_CARD: 1,
  ONE_PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10,
};

const HAND_NAMES: Record<number, string> = {
  1: "High Card",
  2: "One Pair",
  3: "Two Pair",
  4: "Three of a Kind",
  5: "Straight",
  6: "Flush",
  7: "Full House",
  8: "Four of a Kind",
  9: "Straight Flush",
  10: "Royal Flush",
};

// Evaluate a 5-card hand
const evaluateHand = (cards: Card[]): HandRank => {
  if (cards.length < 5) {
    return { rank: 0, name: "Invalid", highCards: [] };
  }

  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  
  // Check for flush
  const isFlush = suits.every(s => s === suits[0]);
  
  // Check for straight (including A-2-3-4-5)
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
  let isStraight = false;
  let straightHigh = 0;
  
  if (uniqueRanks.length >= 5) {
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
        isStraight = true;
        straightHigh = uniqueRanks[i];
        break;
      }
    }
    // Check for A-2-3-4-5 (wheel)
    if (!isStraight && uniqueRanks.includes(1) && uniqueRanks.includes(2) && 
        uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  // Count rank occurrences
  const rankCounts: Record<number, number> = {};
  for (const r of ranks) {
    rankCounts[r] = (rankCounts[r] || 0) + 1;
  }
  
  const counts = Object.entries(rankCounts)
    .map(([r, c]) => ({ rank: parseInt(r), count: c }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  // Royal Flush
  if (isFlush && isStraight && straightHigh === 1 && ranks.includes(13)) {
    return { rank: 10, name: "Royal Flush", highCards: [14] };
  }

  // Straight Flush
  if (isFlush && isStraight) {
    return { rank: 9, name: "Straight Flush", highCards: [straightHigh === 1 ? 14 : straightHigh] };
  }

  // Four of a Kind
  if (counts[0].count === 4) {
    const kicker = counts.find(c => c.count !== 4)?.rank || 0;
    return { rank: 8, name: "Four of a Kind", highCards: [counts[0].rank === 1 ? 14 : counts[0].rank, kicker === 1 ? 14 : kicker] };
  }

  // Full House
  if (counts[0].count === 3 && counts[1]?.count >= 2) {
    return { 
      rank: 7, 
      name: "Full House", 
      highCards: [counts[0].rank === 1 ? 14 : counts[0].rank, counts[1].rank === 1 ? 14 : counts[1].rank] 
    };
  }

  // Flush
  if (isFlush) {
    return { rank: 6, name: "Flush", highCards: ranks.map(r => r === 1 ? 14 : r).sort((a, b) => b - a).slice(0, 5) };
  }

  // Straight
  if (isStraight) {
    return { rank: 5, name: "Straight", highCards: [straightHigh === 1 ? 14 : straightHigh] };
  }

  // Three of a Kind
  if (counts[0].count === 3) {
    const kickers = counts.filter(c => c.count !== 3).slice(0, 2).map(c => c.rank === 1 ? 14 : c.rank);
    return { rank: 4, name: "Three of a Kind", highCards: [counts[0].rank === 1 ? 14 : counts[0].rank, ...kickers] };
  }

  // Two Pair
  if (counts[0].count === 2 && counts[1]?.count === 2) {
    const kicker = counts.find(c => c.count === 1)?.rank || 0;
    const pairs = [counts[0].rank, counts[1].rank].map(r => r === 1 ? 14 : r).sort((a, b) => b - a);
    return { rank: 3, name: "Two Pair", highCards: [...pairs, kicker === 1 ? 14 : kicker] };
  }

  // One Pair
  if (counts[0].count === 2) {
    const kickers = counts.filter(c => c.count === 1).slice(0, 3).map(c => c.rank === 1 ? 14 : c.rank);
    return { rank: 2, name: "One Pair", highCards: [counts[0].rank === 1 ? 14 : counts[0].rank, ...kickers] };
  }

  // High Card
  return { rank: 1, name: "High Card", highCards: ranks.map(r => r === 1 ? 14 : r).sort((a, b) => b - a).slice(0, 5) };
};

// Get best 5-card hand from 7 cards
const getBestHand = (holeCards: Card[], communityCards: Card[]): HandRank => {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) {
    return { rank: 0, name: "Invalid", highCards: [] };
  }

  let bestHand: HandRank = { rank: 0, name: "", highCards: [] };

  // Generate all 5-card combinations
  const combinations: Card[][] = [];
  for (let i = 0; i < allCards.length - 4; i++) {
    for (let j = i + 1; j < allCards.length - 3; j++) {
      for (let k = j + 1; k < allCards.length - 2; k++) {
        for (let l = k + 1; l < allCards.length - 1; l++) {
          for (let m = l + 1; m < allCards.length; m++) {
            combinations.push([allCards[i], allCards[j], allCards[k], allCards[l], allCards[m]]);
          }
        }
      }
    }
  }

  for (const combo of combinations) {
    const hand = evaluateHand(combo);
    if (hand.rank > bestHand.rank || 
        (hand.rank === bestHand.rank && compareHighCards(hand.highCards, bestHand.highCards) > 0)) {
      bestHand = hand;
    }
  }

  return bestHand;
};

// Compare high cards for tiebreaker
const compareHighCards = (a: number[], b: number[]): number => {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
};

// Compare two hands
const compareHands = (hand1: HandRank, hand2: HandRank): number => {
  if (hand1.rank !== hand2.rank) return hand1.rank - hand2.rank;
  return compareHighCards(hand1.highCards, hand2.highCards);
};

const createInitialState = (): GameState => ({
  deck: [],
  communityCards: [],
  players: [],
  pot: 0,
  sidePots: [],
  currentPlayerIndex: 0,
  dealerIndex: 0,
  phase: "idle",
  currentBet: 0,
  minRaise: BIG_BLIND,
  difficulty: "medium",
  smallBlind: SMALL_BLIND,
  bigBlind: BIG_BLIND,
  message: "",
  winners: [],
  lastRaiseIndex: -1,
});

export function PokerGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);
  const aiThinkingRef = useRef(false);
  const showdownProcessedRef = useRef(false);
  const lastProcessedPlayerIndex = useRef(-1);

  const humanPlayer = gameState.players.find(p => p.isHuman);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = currentPlayer?.isHuman && !currentPlayer?.hasFolded && !currentPlayer?.isAllIn;
  const activePlayers = gameState.players.filter(p => !p.hasFolded && p.chips > 0);

  // Start new game
  const startGame = useCallback((difficulty: Difficulty, playerCount: number) => {
    const deck = shuffleDeck(createDeck(true));
    
    // Create players
    const players: PokerPlayer[] = [];
    const shuffledNames = [...AI_NAMES].sort(() => Math.random() - 0.5);
    
    // Human player
    players.push({
      id: 0,
      name: "You",
      chips: INITIAL_CHIPS,
      hand: [],
      currentBet: 0,
      totalBet: 0,
      hasFolded: false,
      hasActed: false,
      isAllIn: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      isHuman: true,
    });

    // AI players
    for (let i = 1; i < playerCount; i++) {
      players.push({
        id: i,
        name: shuffledNames[i - 1] || `Player ${i}`,
        chips: INITIAL_CHIPS,
        hand: [],
        currentBet: 0,
        totalBet: 0,
        hasFolded: false,
        hasActed: false,
        isAllIn: false,
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
        isHuman: false,
      });
    }

    // Assign dealer button randomly
    const dealerIndex = Math.floor(Math.random() * playerCount);
    players[dealerIndex].isDealer = true;
    
    const sbIndex = (dealerIndex + 1) % playerCount;
    const bbIndex = (dealerIndex + 2) % playerCount;
    players[sbIndex].isSmallBlind = true;
    players[bbIndex].isBigBlind = true;

    setGameState({
      ...createInitialState(),
      deck,
      players,
      difficulty,
      dealerIndex,
      phase: "preflop",
    });
    setShowSetupModal(false);

    // Start the round
    setTimeout(() => dealCards(deck, players, dealerIndex), 500);
  }, []);

  // Deal hole cards
  const dealCards = (deck: Card[], players: PokerPlayer[], dealerIndex: number) => {
    const newDeck = [...deck];
    const newPlayers = players.map((p, i) => {
      const card1 = { ...newDeck.pop()!, faceUp: p.isHuman };
      const card2 = { ...newDeck.pop()!, faceUp: p.isHuman };
      return { ...p, hand: [card1, card2] };
    });

    // Post blinds
    const sbIndex = (dealerIndex + 1) % newPlayers.length;
    const bbIndex = (dealerIndex + 2) % newPlayers.length;
    
    const sbAmount = Math.min(SMALL_BLIND, newPlayers[sbIndex].chips);
    const bbAmount = Math.min(BIG_BLIND, newPlayers[bbIndex].chips);

    newPlayers[sbIndex].chips -= sbAmount;
    newPlayers[sbIndex].currentBet = sbAmount;
    newPlayers[sbIndex].totalBet = sbAmount;
    if (newPlayers[sbIndex].chips === 0) newPlayers[sbIndex].isAllIn = true;

    newPlayers[bbIndex].chips -= bbAmount;
    newPlayers[bbIndex].currentBet = bbAmount;
    newPlayers[bbIndex].totalBet = bbAmount;
    if (newPlayers[bbIndex].chips === 0) newPlayers[bbIndex].isAllIn = true;

    const pot = sbAmount + bbAmount;
    const currentPlayerIndex = (bbIndex + 1) % newPlayers.length;

    setGameState(prev => ({
      ...prev,
      deck: newDeck,
      players: newPlayers,
      pot,
      currentBet: BIG_BLIND,
      minRaise: BIG_BLIND,
      currentPlayerIndex,
      lastRaiseIndex: bbIndex,
      message: "Your turn",
    }));
  };

  // Player actions
  const handleFold = useCallback(() => {
    if (!isHumanTurn) return;

    setGameState(prev => {
      const players = [...prev.players];
      players[prev.currentPlayerIndex] = {
        ...players[prev.currentPlayerIndex],
        hasFolded: true,
        hasActed: true,
        lastAction: "fold",
      };
      return {
        ...prev,
        players,
        message: "You folded",
      };
    });
  }, [isHumanTurn]);

  const handleCheck = useCallback(() => {
    if (!isHumanTurn) return;
    if (gameState.currentBet > (currentPlayer?.currentBet || 0)) return;

    setGameState(prev => {
      const players = [...prev.players];
      players[prev.currentPlayerIndex] = {
        ...players[prev.currentPlayerIndex],
        hasActed: true,
        lastAction: "check",
      };
      return {
        ...prev,
        players,
        message: "You checked",
      };
    });
  }, [isHumanTurn, gameState.currentBet, currentPlayer]);

  const handleCall = useCallback(() => {
    if (!isHumanTurn || !currentPlayer) return;

    const callAmount = Math.min(gameState.currentBet - currentPlayer.currentBet, currentPlayer.chips);
    const isAllIn = callAmount >= currentPlayer.chips;

    setGameState(prev => {
      const players = [...prev.players];
      players[prev.currentPlayerIndex] = {
        ...players[prev.currentPlayerIndex],
        chips: players[prev.currentPlayerIndex].chips - callAmount,
        currentBet: players[prev.currentPlayerIndex].currentBet + callAmount,
        totalBet: players[prev.currentPlayerIndex].totalBet + callAmount,
        hasActed: true,
        isAllIn,
        lastAction: isAllIn ? "allin" : "call",
      };
      return {
        ...prev,
        players,
        pot: prev.pot + callAmount,
        message: isAllIn ? "You're all in!" : "You called",
      };
    });
  }, [isHumanTurn, currentPlayer, gameState.currentBet]);

  const handleRaise = useCallback((amount: number) => {
    if (!isHumanTurn || !currentPlayer) return;

    const totalBet = gameState.currentBet + amount;
    const toCall = totalBet - currentPlayer.currentBet;
    const actualAmount = Math.min(toCall, currentPlayer.chips);
    const isAllIn = actualAmount >= currentPlayer.chips;

    setGameState(prev => {
      const players = [...prev.players];
      players[prev.currentPlayerIndex] = {
        ...players[prev.currentPlayerIndex],
        chips: players[prev.currentPlayerIndex].chips - actualAmount,
        currentBet: players[prev.currentPlayerIndex].currentBet + actualAmount,
        totalBet: players[prev.currentPlayerIndex].totalBet + actualAmount,
        hasActed: true,
        isAllIn,
        lastAction: isAllIn ? "allin" : "raise",
      };

      // Reset hasActed for others when raising
      players.forEach((p, i) => {
        if (i !== prev.currentPlayerIndex && !p.hasFolded && !p.isAllIn) {
          players[i] = { ...players[i], hasActed: false };
        }
      });

      return {
        ...prev,
        players,
        pot: prev.pot + actualAmount,
        currentBet: isAllIn ? players[prev.currentPlayerIndex].currentBet : totalBet,
        minRaise: amount,
        lastRaiseIndex: prev.currentPlayerIndex,
        message: isAllIn ? "You're all in!" : `You raised to $${totalBet}`,
      };
    });
    setShowRaiseSlider(false);
  }, [isHumanTurn, currentPlayer, gameState.currentBet]);

  const handleAllIn = useCallback(() => {
    if (!isHumanTurn || !currentPlayer) return;

    const amount = currentPlayer.chips;
    const newBet = currentPlayer.currentBet + amount;

    setGameState(prev => {
      const players = [...prev.players];
      players[prev.currentPlayerIndex] = {
        ...players[prev.currentPlayerIndex],
        chips: 0,
        currentBet: newBet,
        totalBet: players[prev.currentPlayerIndex].totalBet + amount,
        hasActed: true,
        isAllIn: true,
        lastAction: "allin",
      };

      const isRaise = newBet > prev.currentBet;
      if (isRaise) {
        players.forEach((p, i) => {
          if (i !== prev.currentPlayerIndex && !p.hasFolded && !p.isAllIn) {
            players[i] = { ...players[i], hasActed: false };
          }
        });
      }

      return {
        ...prev,
        players,
        pot: prev.pot + amount,
        currentBet: Math.max(prev.currentBet, newBet),
        lastRaiseIndex: isRaise ? prev.currentPlayerIndex : prev.lastRaiseIndex,
        message: "You're all in!",
      };
    });
  }, [isHumanTurn, currentPlayer]);

  // AI turn logic
  useEffect(() => {
    if (gameState.phase === "idle" || gameState.phase === "roundEnd" || gameState.phase === "showdown") return;
    if (!currentPlayer || currentPlayer.isHuman || currentPlayer.hasFolded || currentPlayer.isAllIn) return;
    if (aiThinkingRef.current) return;

    const playAI = async () => {
      aiThinkingRef.current = true;
      await new Promise(r => setTimeout(r, AI_THINK_DELAY));

      // AI decision making
      const decision = makeAIDecision(
        currentPlayer,
        gameState.communityCards,
        gameState.currentBet,
        gameState.pot,
        gameState.difficulty,
        gameState.phase
      );

      setGameState(prev => {
        const players = [...prev.players];
        const player = { ...players[prev.currentPlayerIndex] };

        switch (decision.action) {
          case "fold":
            player.hasFolded = true;
            player.lastAction = "fold";
            break;
          case "check":
            player.lastAction = "check";
            break;
          case "call": {
            const callAmount = Math.min(prev.currentBet - player.currentBet, player.chips);
            player.chips -= callAmount;
            player.currentBet += callAmount;
            player.totalBet += callAmount;
            player.isAllIn = player.chips === 0;
            player.lastAction = player.isAllIn ? "allin" : "call";
            break;
          }
          case "raise": {
            const raiseTotal = decision.amount!;
            const toAdd = raiseTotal - player.currentBet;
            const actualAdd = Math.min(toAdd, player.chips);
            player.chips -= actualAdd;
            player.currentBet += actualAdd;
            player.totalBet += actualAdd;
            player.isAllIn = player.chips === 0;
            player.lastAction = player.isAllIn ? "allin" : "raise";
            
            // Reset hasActed for others
            players.forEach((p, i) => {
              if (i !== prev.currentPlayerIndex && !p.hasFolded && !p.isAllIn) {
                players[i] = { ...players[i], hasActed: false };
              }
            });
            break;
          }
          case "allin": {
            const amount = player.chips;
            player.currentBet += amount;
            player.totalBet += amount;
            player.chips = 0;
            player.isAllIn = true;
            player.lastAction = "allin";
            
            if (player.currentBet > prev.currentBet) {
              players.forEach((p, i) => {
                if (i !== prev.currentPlayerIndex && !p.hasFolded && !p.isAllIn) {
                  players[i] = { ...players[i], hasActed: false };
                }
              });
            }
            break;
          }
        }

        player.hasActed = true;
        players[prev.currentPlayerIndex] = player;

        const newPot = players.reduce((sum, p) => sum + p.totalBet, 0);
        const newCurrentBet = Math.max(...players.map(p => p.currentBet));

        return {
          ...prev,
          players,
          pot: newPot,
          currentBet: newCurrentBet,
          message: `${player.name} ${decision.action === "allin" ? "goes all-in" : decision.action}s${decision.action === "raise" ? ` to $${decision.amount}` : ""}`,
        };
      });

      aiThinkingRef.current = false;
    };

    playAI();
  }, [gameState.currentPlayerIndex, gameState.phase, currentPlayer, gameState.communityCards, gameState.currentBet, gameState.pot, gameState.difficulty]);

  // AI Decision Making
  const makeAIDecision = (
    player: PokerPlayer,
    communityCards: Card[],
    currentBet: number,
    pot: number,
    difficulty: Difficulty,
    phase: GamePhase
  ): { action: PlayerAction; amount?: number } => {
    const toCall = currentBet - player.currentBet;
    const canCheck = toCall === 0;

    // Calculate hand strength
    let handStrength = 0;
    if (communityCards.length >= 3) {
      const hand = getBestHand(player.hand, communityCards);
      handStrength = hand.rank / 10;
    } else {
      // Pre-flop hand strength (simplified)
      const [card1, card2] = player.hand;
      const r1 = card1.rank === 1 ? 14 : card1.rank;
      const r2 = card2.rank === 1 ? 14 : card2.rank;
      const isPair = r1 === r2;
      const isSuited = card1.suit === card2.suit;
      const highCard = Math.max(r1, r2);
      
      if (isPair) {
        handStrength = 0.5 + (r1 / 28);
      } else if (highCard >= 12 && Math.min(r1, r2) >= 10) {
        handStrength = 0.6;
      } else if (isSuited && Math.abs(r1 - r2) <= 4) {
        handStrength = 0.4;
      } else if (highCard === 14) {
        handStrength = 0.35;
      } else {
        handStrength = 0.2;
      }
    }

    // Adjust based on difficulty
    let aggression = 0.5;
    let bluffChance = 0.1;
    
    switch (difficulty) {
      case "easy":
        aggression = 0.3;
        bluffChance = 0.05;
        // Easy AI is more predictable
        handStrength *= 0.8;
        break;
      case "medium":
        aggression = 0.5;
        bluffChance = 0.15;
        break;
      case "hard":
        aggression = 0.6;
        bluffChance = 0.2;
        break;
      case "master":
        aggression = 0.7;
        bluffChance = 0.25;
        // Master AI considers pot odds
        const potOdds = toCall / (pot + toCall);
        if (handStrength < potOdds * 0.8) {
          handStrength *= 0.7;
        }
        break;
    }

    // Decision logic
    const randomFactor = Math.random();

    // Bluff sometimes
    if (randomFactor < bluffChance && player.chips > currentBet * 2) {
      if (Math.random() < aggression) {
        const raiseAmount = Math.min(
          currentBet + Math.floor(pot * 0.5),
          player.chips + player.currentBet
        );
        return { action: "raise", amount: raiseAmount };
      }
    }

    // Strong hand - raise
    if (handStrength > 0.7) {
      if (player.chips > currentBet * 2) {
        const raiseAmount = Math.min(
          currentBet + Math.floor(pot * (0.5 + handStrength * 0.5)),
          player.chips + player.currentBet
        );
        return { action: "raise", amount: raiseAmount };
      }
      return toCall > 0 ? { action: "call" } : { action: "check" };
    }

    // Medium hand
    if (handStrength > 0.4) {
      if (toCall === 0) {
        if (randomFactor < aggression * 0.5 && player.chips > currentBet * 2) {
          const raiseAmount = Math.min(
            currentBet + Math.floor(pot * 0.3),
            player.chips + player.currentBet
          );
          return { action: "raise", amount: raiseAmount };
        }
        return { action: "check" };
      }
      if (toCall < player.chips * 0.3) {
        return { action: "call" };
      }
      return randomFactor < 0.3 ? { action: "call" } : { action: "fold" };
    }

    // Weak hand
    if (canCheck) {
      return { action: "check" };
    }
    if (toCall < player.chips * 0.1 && randomFactor < 0.3) {
      return { action: "call" };
    }
    return { action: "fold" };
  };

  // Move to next player or phase
  useEffect(() => {
    if (gameState.phase === "idle" || gameState.phase === "roundEnd" || gameState.phase === "showdown") {
      lastProcessedPlayerIndex.current = -1;
      return;
    }
    if (!currentPlayer) return;
    if (currentPlayer.isHuman && !currentPlayer.hasActed && !currentPlayer.hasFolded && !currentPlayer.isAllIn) return;
    if (!currentPlayer.hasActed && !currentPlayer.hasFolded && !currentPlayer.isAllIn) return;
    
    // Prevent processing the same player index twice
    if (lastProcessedPlayerIndex.current === gameState.currentPlayerIndex && currentPlayer.hasActed) {
      // Only proceed if we need to advance
    } else if (lastProcessedPlayerIndex.current === gameState.currentPlayerIndex) {
      return;
    }

    // Count active players
    const activePlayers = gameState.players.filter(p => !p.hasFolded);
    const playersWhoCanAct = gameState.players.filter(p => !p.hasFolded && !p.isAllIn);

    // Check if only one player left
    if (activePlayers.length === 1) {
      // Award pot to winner
      const winner = activePlayers[0];
      lastProcessedPlayerIndex.current = -1;
      setGameState(prev => ({
        ...prev,
        phase: "roundEnd",
        winners: [{ playerId: winner.id, amount: prev.pot, handName: "Everyone folded" }],
        message: `${winner.name} wins $${prev.pot}!`,
      }));
      return;
    }

    // Check if betting round is complete
    const allActed = playersWhoCanAct.every(p => p.hasActed);
    const allMatched = playersWhoCanAct.every(p => p.currentBet === gameState.currentBet || p.isAllIn);

    if (allActed && allMatched) {
      // Move to next phase
      lastProcessedPlayerIndex.current = -1;
      advancePhase();
      return;
    }

    // Move to next player
    let nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    while (gameState.players[nextIndex].hasFolded || gameState.players[nextIndex].isAllIn) {
      nextIndex = (nextIndex + 1) % gameState.players.length;
      if (nextIndex === gameState.currentPlayerIndex) break;
    }

    if (nextIndex !== gameState.currentPlayerIndex) {
      lastProcessedPlayerIndex.current = gameState.currentPlayerIndex;
      setGameState(prev => ({
        ...prev,
        currentPlayerIndex: nextIndex,
      }));
    }
  }, [gameState.players, gameState.currentPlayerIndex, gameState.phase, gameState.currentBet, currentPlayer]);

  // Advance to next phase
  const advancePhase = () => {
    setGameState(prev => {
      let newDeck = [...prev.deck];
      let newCommunity = [...prev.communityCards];
      let newPhase = prev.phase;
      
      // Reset player bets for new round
      const newPlayers = prev.players.map(p => ({
        ...p,
        currentBet: 0,
        hasActed: p.hasFolded || p.isAllIn,
      }));

      // Deal community cards
      switch (prev.phase) {
        case "preflop":
          // Deal flop (3 cards)
          newCommunity = [
            { ...newDeck.pop()!, faceUp: true },
            { ...newDeck.pop()!, faceUp: true },
            { ...newDeck.pop()!, faceUp: true },
          ];
          newPhase = "flop";
          break;
        case "flop":
          // Deal turn (1 card)
          newCommunity = [...prev.communityCards, { ...newDeck.pop()!, faceUp: true }];
          newPhase = "turn";
          break;
        case "turn":
          // Deal river (1 card)
          newCommunity = [...prev.communityCards, { ...newDeck.pop()!, faceUp: true }];
          newPhase = "river";
          break;
        case "river":
          // Go to showdown
          newPhase = "showdown";
          break;
      }

      // Find first player after dealer who can act
      let firstActor = (prev.dealerIndex + 1) % prev.players.length;
      while (newPlayers[firstActor].hasFolded || newPlayers[firstActor].isAllIn) {
        firstActor = (firstActor + 1) % prev.players.length;
      }

      return {
        ...prev,
        deck: newDeck,
        communityCards: newCommunity,
        players: newPlayers,
        phase: newPhase,
        currentBet: 0,
        currentPlayerIndex: firstActor,
      };
    });
  };

  // Handle showdown
  useEffect(() => {
    if (gameState.phase !== "showdown") {
      showdownProcessedRef.current = false;
      return;
    }
    if (showdownProcessedRef.current) return;
    showdownProcessedRef.current = true;

    const activePlayers = gameState.players.filter(p => !p.hasFolded);
    
    // Reveal all hands
    const revealedPlayers = gameState.players.map(p => ({
      ...p,
      hand: p.hand.map(c => ({ ...c, faceUp: true })),
    }));

    // Evaluate hands
    const playerHands = activePlayers.map(p => ({
      player: p,
      hand: getBestHand(p.hand, gameState.communityCards),
    }));

    // Sort by hand strength
    playerHands.sort((a, b) => compareHands(b.hand, a.hand));

    // Find winners (could be ties)
    const bestHand = playerHands[0].hand;
    const winners = playerHands.filter(ph => compareHands(ph.hand, bestHand) === 0);

    const winAmount = Math.floor(gameState.pot / winners.length);
    const winnerResults = winners.map(w => ({
      playerId: w.player.id,
      amount: winAmount,
      handName: w.hand.name,
    }));

    setGameState(prev => ({
      ...prev,
      players: revealedPlayers,
      phase: "roundEnd",
      winners: winnerResults,
      message: winners.length === 1
        ? `${winners[0].player.name} wins with ${winners[0].hand.name}!`
        : `Split pot! ${winners.map(w => w.player.name).join(" and ")} win with ${bestHand.name}`,
    }));
  }, [gameState.phase]);

  // Apply winnings and start new round
  const startNewRound = () => {
    setGameState(prev => {
      // Apply winnings
      let players = prev.players.map(p => {
        const winnings = prev.winners.filter(w => w.playerId === p.id).reduce((sum, w) => sum + w.amount, 0);
        return { ...p, chips: p.chips + winnings };
      });

      // Remove busted players
      players = players.filter(p => p.chips > 0 || p.isHuman);

      // Check if game over
      if (players.filter(p => p.chips > 0).length <= 1) {
        const winner = players.find(p => p.chips > 0);
        return {
          ...prev,
          phase: "idle",
          message: winner?.isHuman ? "Congratulations! You win!" : `Game Over! ${winner?.name || "AI"} wins!`,
        };
      }

      // Move dealer button
      let newDealerIndex = (prev.dealerIndex + 1) % players.length;
      while (players[newDealerIndex].chips === 0) {
        newDealerIndex = (newDealerIndex + 1) % players.length;
      }

      // Reset players for new round
      players = players.map((p, i) => ({
        ...p,
        hand: [],
        currentBet: 0,
        totalBet: 0,
        hasFolded: p.chips === 0,
        hasActed: false,
        isAllIn: false,
        isDealer: i === newDealerIndex,
        isSmallBlind: i === (newDealerIndex + 1) % players.length,
        isBigBlind: i === (newDealerIndex + 2) % players.length,
        lastAction: undefined,
      }));

      const newDeck = shuffleDeck(createDeck(true));

      return {
        ...prev,
        deck: newDeck,
        communityCards: [],
        players,
        pot: 0,
        sidePots: [],
        currentBet: 0,
        dealerIndex: newDealerIndex,
        phase: "preflop",
        winners: [],
        message: "",
      };
    });

    // Deal after state update
    setTimeout(() => {
      setGameState(prev => {
        if (prev.phase !== "preflop") return prev;
        
        const newDeck = [...prev.deck];
        const newPlayers = prev.players.map((p) => {
          if (p.hasFolded) return p;
          const card1 = { ...newDeck.pop()!, faceUp: p.isHuman };
          const card2 = { ...newDeck.pop()!, faceUp: p.isHuman };
          return { ...p, hand: [card1, card2] };
        });

        // Post blinds
        const sbIndex = newPlayers.findIndex(p => p.isSmallBlind);
        const bbIndex = newPlayers.findIndex(p => p.isBigBlind);
        
        const sbAmount = Math.min(SMALL_BLIND, newPlayers[sbIndex].chips);
        const bbAmount = Math.min(BIG_BLIND, newPlayers[bbIndex].chips);

        newPlayers[sbIndex].chips -= sbAmount;
        newPlayers[sbIndex].currentBet = sbAmount;
        newPlayers[sbIndex].totalBet = sbAmount;
        if (newPlayers[sbIndex].chips === 0) newPlayers[sbIndex].isAllIn = true;

        newPlayers[bbIndex].chips -= bbAmount;
        newPlayers[bbIndex].currentBet = bbAmount;
        newPlayers[bbIndex].totalBet = bbAmount;
        if (newPlayers[bbIndex].chips === 0) newPlayers[bbIndex].isAllIn = true;

        const pot = sbAmount + bbAmount;
        let currentPlayerIndex = (bbIndex + 1) % newPlayers.length;
        while (newPlayers[currentPlayerIndex].hasFolded || newPlayers[currentPlayerIndex].isAllIn) {
          currentPlayerIndex = (currentPlayerIndex + 1) % newPlayers.length;
        }

        return {
          ...prev,
          deck: newDeck,
          players: newPlayers,
          pot,
          currentBet: BIG_BLIND,
          minRaise: BIG_BLIND,
          currentPlayerIndex,
          message: "Your turn",
        };
      });
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950 to-[var(--color-dark-1)]">
      {/* Header */}
      <div className="container py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/games/casino"
            className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Casino
          </Link>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowRulesModal(true)}
              className="text-sm text-[var(--muted-foreground)] hover:text-white transition-colors"
            >
              Hand Rankings
            </button>
            {gameState.phase !== "idle" && (
              <Button variant="outline" size="sm" onClick={() => setShowSetupModal(true)}>
                New Game
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Game Table */}
      <div className="container py-4">
        <div className="max-w-5xl mx-auto">
          {gameState.phase === "idle" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-6">🎰</div>
              <h1 className="text-4xl font-heading mb-4 text-white">Texas Hold&apos;em</h1>
              <p className="text-[var(--muted-foreground)] mb-8 max-w-md mx-auto">
                {gameState.message || "The world's most popular poker game. Bluff, bet, and outplay AI opponents!"}
              </p>
              <Button variant="primary" size="lg" onClick={() => setShowSetupModal(true)}>
                Start Game
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Pot Display */}
              <div className="flex justify-center">
                <div className="bg-black/40 backdrop-blur rounded-full px-6 py-2 flex items-center gap-3">
                  <span className="text-lg">💰</span>
                  <span className="text-xl font-bold text-yellow-400">Pot: ${gameState.pot}</span>
                </div>
              </div>

              {/* Community Cards */}
              <div className="flex justify-center gap-2 min-h-[100px] items-center">
                {gameState.communityCards.length > 0 ? (
                  <AnimatePresence mode="popLayout">
                    {gameState.communityCards.map((card, i) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: -30, rotateY: 180 }}
                        animate={{ opacity: 1, y: 0, rotateY: 0 }}
                        transition={{ delay: i * 0.15 }}
                      >
                        <PlayingCard card={card} size="sm" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : (
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} className="w-[60px] h-[84px] border border-dashed border-white/20 rounded-lg" />
                    ))}
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="text-center">
                <motion.div
                  key={gameState.message}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-block bg-black/40 backdrop-blur rounded-lg px-4 py-2"
                >
                  <span className="text-sm font-medium text-white">{gameState.message}</span>
                </motion.div>
              </div>

              {/* AI Players */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {gameState.players.filter(p => !p.isHuman).map((player, i) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`bg-[var(--color-dark-2)]/80 rounded-lg p-3 border ${
                      player.id === currentPlayer?.id && !player.hasFolded
                        ? "border-yellow-500"
                        : player.hasFolded
                        ? "border-red-500/30 opacity-50"
                        : "border-[var(--color-dark-3)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm flex items-center gap-1">
                        {player.isDealer && <span title="Dealer">🔘</span>}
                        {player.name}
                      </span>
                      <span className="text-xs text-yellow-400">${player.chips}</span>
                    </div>
                    
                    <div className="flex gap-1 justify-center mb-2 min-h-[56px]">
                      {player.hand.map((card, ci) => (
                        <PlayingCard key={ci} card={card} size="xs" />
                      ))}
                    </div>

                    {player.currentBet > 0 && (
                      <div className="text-center text-xs text-[var(--muted-foreground)]">
                        Bet: ${player.currentBet}
                      </div>
                    )}
                    {player.lastAction && (
                      <div className="text-center text-xs text-yellow-400 capitalize">
                        {player.lastAction}
                      </div>
                    )}
                    {player.hasFolded && (
                      <div className="text-center text-xs text-red-400">Folded</div>
                    )}
                    {player.isAllIn && !player.hasFolded && (
                      <div className="text-center text-xs text-yellow-400">All-In</div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Winners Display */}
              {gameState.phase === "roundEnd" && gameState.winners.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 text-center"
                >
                  {gameState.winners.map((w, i) => {
                    const winner = gameState.players.find(p => p.id === w.playerId);
                    return (
                      <div key={i} className="text-yellow-400">
                        <span className="font-bold">{winner?.name}</span> wins ${w.amount} with {w.handName}!
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {/* Human Player */}
              {humanPlayer && (
                <div className="bg-[var(--color-dark-2)]/80 rounded-xl p-4 border border-[var(--color-dark-3)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-heading text-lg">Your Hand</span>
                      {humanPlayer.isDealer && <span title="Dealer">🔘</span>}
                      {humanPlayer.currentBet > 0 && (
                        <span className="text-sm text-[var(--muted-foreground)]">
                          Current bet: ${humanPlayer.currentBet}
                        </span>
                      )}
                    </div>
                    <div className="text-yellow-400 font-bold">${humanPlayer.chips}</div>
                  </div>

                  <div className="flex justify-center gap-2 mb-4">
                    {humanPlayer.hand.map((card, i) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <PlayingCard card={{ ...card, faceUp: true }} size="md" />
                      </motion.div>
                    ))}
                  </div>

                  {/* Hand strength indicator */}
                  {gameState.communityCards.length >= 3 && humanPlayer.hand.length === 2 && (
                    <div className="text-center text-sm text-[var(--muted-foreground)] mb-4">
                      {getBestHand(humanPlayer.hand, gameState.communityCards).name}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {isHumanTurn && gameState.phase !== "roundEnd" && gameState.phase !== "showdown" && (
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button variant="outline" onClick={handleFold}>
                        Fold
                      </Button>
                      
                      {gameState.currentBet === humanPlayer.currentBet && (
                        <Button variant="outline" onClick={handleCheck}>
                          Check
                        </Button>
                      )}
                      
                      {gameState.currentBet > humanPlayer.currentBet && (
                        <Button variant="primary" onClick={handleCall}>
                          Call ${Math.min(gameState.currentBet - humanPlayer.currentBet, humanPlayer.chips)}
                        </Button>
                      )}
                      
                      {humanPlayer.chips > gameState.currentBet - humanPlayer.currentBet && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setRaiseAmount(gameState.currentBet + gameState.minRaise);
                              setShowRaiseSlider(true);
                            }}
                          >
                            Raise
                          </Button>
                          <Button variant="outline" onClick={handleAllIn}>
                            All-In (${humanPlayer.chips})
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Round End Actions */}
                  {gameState.phase === "roundEnd" && (
                    <div className="flex justify-center">
                      <Button variant="primary" onClick={startNewRound}>
                        {humanPlayer.chips > 0 ? "Next Hand" : "Game Over"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Raise Modal */}
      <AnimatePresence>
        {showRaiseSlider && humanPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRaiseSlider(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-heading mb-4 text-center">Raise Amount</h3>
              
              <div className="text-center mb-4">
                <span className="text-3xl font-bold text-yellow-400">${raiseAmount}</span>
              </div>

              <input
                type="range"
                min={gameState.currentBet + gameState.minRaise}
                max={humanPlayer.chips + humanPlayer.currentBet}
                value={raiseAmount}
                onChange={e => setRaiseAmount(parseInt(e.target.value))}
                className="w-full mb-4"
              />

              <div className="flex justify-between text-xs text-[var(--muted-foreground)] mb-6">
                <span>Min: ${gameState.currentBet + gameState.minRaise}</span>
                <span>Max: ${humanPlayer.chips + humanPlayer.currentBet}</span>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowRaiseSlider(false)}>
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1" onClick={() => handleRaise(raiseAmount - gameState.currentBet)}>
                  Raise to ${raiseAmount}
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
                  Number of Players
                </label>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[4, 5, 6].map(count => (
                    <button
                      key={count}
                      onClick={() => {
                        // Store player count and show difficulty selection
                        const btn = document.querySelector(`[data-count="${count}"]`) as HTMLButtonElement;
                        document.querySelectorAll("[data-count]").forEach(b => b.classList.remove("border-red-500"));
                        btn?.classList.add("border-red-500");
                      }}
                      data-count={count}
                      className="p-3 rounded-lg border border-[var(--color-dark-3)] hover:border-red-500 transition-colors text-center"
                    >
                      <span className="text-xl mb-1 block">👥</span>
                      <span className="font-medium">{count} Players</span>
                    </button>
                  ))}
                </div>

                <label className="block text-sm text-[var(--muted-foreground)] mb-3">
                  AI Difficulty
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["easy", "medium", "hard", "master"] as Difficulty[]).map(diff => (
                    <button
                      key={diff}
                      onClick={() => {
                        const selectedCount = document.querySelector("[data-count].border-red-500");
                        const count = selectedCount ? parseInt(selectedCount.getAttribute("data-count") || "4") : 4;
                        startGame(diff, count);
                      }}
                      className="p-3 rounded-lg border border-[var(--color-dark-3)] hover:border-red-500 transition-colors text-center"
                    >
                      <span className="text-xl mb-1 block">
                        {diff === "easy" ? "🌱" : diff === "medium" ? "🎯" : diff === "hard" ? "🔥" : "👑"}
                      </span>
                      <span className="capitalize font-medium">{diff}</span>
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

      {/* Rules/Hand Rankings Modal */}
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
              <h2 className="text-2xl font-heading mb-4">Hand Rankings</h2>
              
              <div className="space-y-3 text-sm">
                {[
                  { name: "Royal Flush", desc: "A, K, Q, J, 10 of same suit", rank: 10 },
                  { name: "Straight Flush", desc: "5 sequential cards of same suit", rank: 9 },
                  { name: "Four of a Kind", desc: "4 cards of same rank", rank: 8 },
                  { name: "Full House", desc: "3 of a kind + a pair", rank: 7 },
                  { name: "Flush", desc: "5 cards of same suit", rank: 6 },
                  { name: "Straight", desc: "5 sequential cards", rank: 5 },
                  { name: "Three of a Kind", desc: "3 cards of same rank", rank: 4 },
                  { name: "Two Pair", desc: "2 different pairs", rank: 3 },
                  { name: "One Pair", desc: "2 cards of same rank", rank: 2 },
                  { name: "High Card", desc: "Highest card wins", rank: 1 },
                ].map((hand, i) => (
                  <div key={hand.name} className="flex items-center justify-between bg-[var(--color-dark-3)]/30 rounded-lg p-3">
                    <div>
                      <span className="font-medium text-white">{hand.name}</span>
                      <p className="text-xs text-[var(--muted-foreground)]">{hand.desc}</p>
                    </div>
                    <span className="text-yellow-400 font-bold">#{11 - hand.rank}</span>
                  </div>
                ))}
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

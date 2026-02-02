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

// Player Card Component for AI players
function PlayerCard({ player, isActive }: { player: PokerPlayer; isActive: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-[var(--color-dark-2)]/90 rounded-lg p-2 border transition-all ${
        isActive
          ? "border-yellow-500 shadow-lg shadow-yellow-500/20"
          : player.hasFolded
          ? "border-red-500/30 opacity-50"
          : "border-[var(--color-dark-3)]"
      }`}
    >
      <div className="flex items-center justify-between mb-1 gap-1">
        <span className="font-medium text-xs flex items-center gap-1 min-w-0 flex-1">
          {player.isDealer && <span title="Dealer" className="flex-shrink-0">🔘</span>}
          <span className="truncate">{player.name}</span>
          {player.isSmallBlind && (
            <span className="flex-shrink-0 text-[9px] font-semibold uppercase px-1 py-0.5 rounded bg-amber-500/30 text-amber-400 border border-amber-500/50" title="Small Blind">SB</span>
          )}
          {player.isBigBlind && (
            <span className="flex-shrink-0 text-[9px] font-semibold uppercase px-1 py-0.5 rounded bg-amber-600/40 text-amber-300 border border-amber-500/60" title="Big Blind">BB</span>
          )}
        </span>
        <span className="text-xs text-yellow-400 font-bold flex-shrink-0">${player.chips}</span>
      </div>
      
      <div className="flex gap-1 justify-center mb-1 overflow-hidden">
        {player.hand.map((card, ci) => (
          <PlayingCard key={ci} card={card} size="xs" />
        ))}
      </div>

      <div className="text-center text-[10px] leading-tight relative z-10 bg-[var(--color-dark-2)]/95 rounded px-0.5 py-0.5 min-h-[1.25rem] flex flex-col justify-center">
        {player.currentBet > 0 && (
          <div className="text-[var(--muted-foreground)]">Bet: ${player.currentBet}</div>
        )}
        {player.lastAction && !player.hasFolded && (
          <div className="text-yellow-400 capitalize">{player.lastAction}</div>
        )}
        {player.hasFolded && (
          <div className="text-red-400">Folded</div>
        )}
        {player.isAllIn && !player.hasFolded && (
          <div className="text-yellow-400 font-bold">ALL-IN</div>
        )}
      </div>
    </motion.div>
  );
}

const GAME_OVER_MODAL_DELAY_MS = 1500;

export function PokerGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);
  const aiThinkingRef = useRef(false);
  const showdownProcessedRef = useRef(false);

  const humanPlayer = gameState.players.find(p => p.isHuman);

  // Delay Game Over modal by 1.5s after losing so the result can be seen.
  // Only show when the hand has ENDED (roundEnd), human has 0 chips, and they did NOT win — never when they're just all-in during the hand.
  useEffect(() => {
    const handEndedHumanLost =
      humanPlayer &&
      humanPlayer.chips === 0 &&
      gameState.phase === "roundEnd" &&
      !gameState.winners.some(w => w.playerId === humanPlayer.id);
    if (handEndedHumanLost) {
      const t = setTimeout(() => setShowGameOverModal(true), GAME_OVER_MODAL_DELAY_MS);
      return () => {
        clearTimeout(t);
        setShowGameOverModal(false);
      };
    }
    setShowGameOverModal(false);
  }, [humanPlayer?.chips, humanPlayer?.id, gameState.phase, gameState.winners]);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

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
    setTimeout(() => dealCards(), 500);
  }, []);

  // Deal hole cards (reads deck, players, blinds from state)
  const dealCards = () => {
    setGameState(prev => {
      const newDeck = [...prev.deck];
      const newPlayers = prev.players.map((p) => {
        const card1 = { ...newDeck.pop()!, faceUp: p.isHuman };
        const card2 = { ...newDeck.pop()!, faceUp: p.isHuman };
        return { ...p, hand: [card1, card2] };
      });

      // Post blinds using current state amounts
      const sbIndex = (prev.dealerIndex + 1) % newPlayers.length;
      const bbIndex = (prev.dealerIndex + 2) % newPlayers.length;
      const sbAmount = Math.min(prev.smallBlind, newPlayers[sbIndex].chips);
      const bbAmount = Math.min(prev.bigBlind, newPlayers[bbIndex].chips);

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

      return {
        ...prev,
        deck: newDeck,
        players: newPlayers,
        pot,
        currentBet: prev.bigBlind,
        minRaise: prev.bigBlind,
        currentPlayerIndex,
        lastRaiseIndex: bbIndex,
        message: "Your turn",
      };
    });
  };

  // Determine if it's the human's turn (computed, not state)
  const isHumanTurn = (() => {
    if (gameState.phase === "idle" || gameState.phase === "roundEnd" || gameState.phase === "showdown") {
      return false;
    }
    const player = gameState.players[gameState.currentPlayerIndex];
    if (!player) return false;
    const canAct = !player.hasFolded && !player.isAllIn;
    const needsToAct = canAct && !player.hasActed;
    return player.isHuman && needsToAct;
  })();

  // Process game state and move to next player/phase if needed
  const processGameState = useCallback((state: GameState): GameState => {
    if (state.phase === "idle" || state.phase === "roundEnd" || state.phase === "showdown") {
      return state;
    }

    const player = state.players[state.currentPlayerIndex];
    if (!player) return state;

    // Current player has acted - check game state
    const activePlayers = state.players.filter(p => !p.hasFolded);
    const playersWhoCanAct = state.players.filter(p => !p.hasFolded && !p.isAllIn);

    // Only one player left - they win
    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      return {
        ...state,
        phase: "roundEnd",
        winners: [{ playerId: winner.id, amount: state.pot, handName: "Everyone folded" }],
        message: `${winner.name} wins $${state.pot}!`,
      };
    }

    // If no one can act (everyone all-in or folded), go to showdown
    if (playersWhoCanAct.length === 0) {
      // Deal remaining community cards and go to showdown
      let newDeck = [...state.deck];
      let newCommunity = [...state.communityCards];
      
      // Deal remaining cards
      while (newCommunity.length < 5) {
        newCommunity.push({ ...newDeck.pop()!, faceUp: true });
      }
      
      return {
        ...state,
        deck: newDeck,
        communityCards: newCommunity,
        phase: "showdown",
        message: "Showdown!",
      };
    }

    // If current player needs to act, don't process further
    const canAct = !player.hasFolded && !player.isAllIn;
    const needsToAct = canAct && !player.hasActed;
    if (needsToAct) return state;

    // Check if betting round is complete
    const allActed = playersWhoCanAct.every(p => p.hasActed);
    const allMatched = playersWhoCanAct.every(p => p.currentBet === state.currentBet || p.isAllIn);

    if (allActed && allMatched) {
      // Advance to next phase
      let newDeck = [...state.deck];
      let newCommunity = [...state.communityCards];
      let newPhase: GamePhase = state.phase;

      const newPlayers = state.players.map(p => ({
        ...p,
        currentBet: 0,
        hasActed: p.hasFolded || p.isAllIn,
      }));

      switch (state.phase) {
        case "preflop":
          newCommunity = [
            { ...newDeck.pop()!, faceUp: true },
            { ...newDeck.pop()!, faceUp: true },
            { ...newDeck.pop()!, faceUp: true },
          ];
          newPhase = "flop";
          break;
        case "flop":
          newCommunity = [...state.communityCards, { ...newDeck.pop()!, faceUp: true }];
          newPhase = "turn";
          break;
        case "turn":
          newCommunity = [...state.communityCards, { ...newDeck.pop()!, faceUp: true }];
          newPhase = "river";
          break;
        case "river":
          newPhase = "showdown";
          break;
      }

      let firstActor = (state.dealerIndex + 1) % state.players.length;
      let loopCount = 0;
      while (loopCount < state.players.length) {
        if (!newPlayers[firstActor].hasFolded && !newPlayers[firstActor].isAllIn) break;
        firstActor = (firstActor + 1) % state.players.length;
        loopCount++;
      }

      return {
        ...state,
        deck: newDeck,
        communityCards: newCommunity,
        players: newPlayers,
        phase: newPhase,
        currentBet: 0,
        currentPlayerIndex: firstActor,
        message: newPhase === "showdown" ? "Showdown!" : `${newPlayers[firstActor].isHuman ? "Your turn" : newPlayers[firstActor].name + "'s turn"}`,
      };
    }

    // Find next player who can act
    let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    let loopCount = 0;
    while (loopCount < state.players.length) {
      if (!state.players[nextIndex].hasFolded && !state.players[nextIndex].isAllIn) break;
      nextIndex = (nextIndex + 1) % state.players.length;
      loopCount++;
    }

    if (nextIndex !== state.currentPlayerIndex) {
      const nextPlayer = state.players[nextIndex];
      return {
        ...state,
        currentPlayerIndex: nextIndex,
        message: nextPlayer.isHuman ? "Your turn" : `${nextPlayer.name}'s turn`,
      };
    }

    return state;
  }, []);

  // Player actions
  const handleFold = () => {
    if (!isHumanTurn) return;
    
    setGameState(prev => {
      const players = [...prev.players];
      const playerIndex = prev.currentPlayerIndex;
      const player = players[playerIndex];
      
      if (!player || !player.isHuman || player.hasActed) {
        return prev;
      }
      
      players[playerIndex] = {
        ...player,
        hasFolded: true,
        hasActed: true,
        lastAction: "fold",
      };
      
      const newState = {
        ...prev,
        players,
        message: "You folded",
      };
      
      return processGameState(newState);
    });
  };

  const handleCheck = () => {
    if (!isHumanTurn) return;
    
    setGameState(prev => {
      const players = [...prev.players];
      const playerIndex = prev.currentPlayerIndex;
      const player = players[playerIndex];
      
      if (!player || !player.isHuman || player.hasActed) {
        return prev;
      }
      
      if (prev.currentBet > player.currentBet) {
        return prev;
      }

      players[playerIndex] = {
        ...player,
        hasActed: true,
        lastAction: "check",
      };
      
      const newState = {
        ...prev,
        players,
        message: "You checked",
      };
      
      return processGameState(newState);
    });
  };

  const handleCall = () => {
    if (!isHumanTurn) return;
    
    setGameState(prev => {
      const players = [...prev.players];
      const playerIndex = prev.currentPlayerIndex;
      const player = players[playerIndex];
      
      if (!player || !player.isHuman || player.hasActed) {
        return prev;
      }

      const callAmount = Math.min(prev.currentBet - player.currentBet, player.chips);
      const isAllIn = callAmount >= player.chips;

      players[playerIndex] = {
        ...player,
        chips: player.chips - callAmount,
        currentBet: player.currentBet + callAmount,
        totalBet: player.totalBet + callAmount,
        hasActed: true,
        isAllIn,
        lastAction: isAllIn ? "allin" : "call",
      };
      
      const newState = {
        ...prev,
        players,
        pot: prev.pot + callAmount,
        message: isAllIn ? "You're all in!" : "You called",
      };
      
      return processGameState(newState);
    });
  };

  const handleRaise = (amount: number) => {
    if (!isHumanTurn) return;
    
    setGameState(prev => {
      const players = [...prev.players];
      const playerIndex = prev.currentPlayerIndex;
      const player = players[playerIndex];
      
      if (!player || !player.isHuman || player.hasActed) {
        return prev;
      }

      const totalBet = prev.currentBet + amount;
      const toCall = totalBet - player.currentBet;
      const actualAmount = Math.min(toCall, player.chips);
      const isAllIn = actualAmount >= player.chips;

      players[playerIndex] = {
        ...player,
        chips: player.chips - actualAmount,
        currentBet: player.currentBet + actualAmount,
        totalBet: player.totalBet + actualAmount,
        hasActed: true,
        isAllIn,
        lastAction: isAllIn ? "allin" : "raise",
      };

      // Reset hasActed for others when raising
      players.forEach((p, i) => {
        if (i !== playerIndex && !p.hasFolded && !p.isAllIn) {
          players[i] = { ...players[i], hasActed: false };
        }
      });

      const newState = {
        ...prev,
        players,
        pot: prev.pot + actualAmount,
        currentBet: isAllIn ? players[playerIndex].currentBet : totalBet,
        minRaise: amount,
        lastRaiseIndex: playerIndex,
        message: isAllIn ? "You're all in!" : `You raised to $${totalBet}`,
      };
      
      return processGameState(newState);
    });
    setShowRaiseSlider(false);
  };

  const handleAllIn = () => {
    if (!isHumanTurn) return;
    
    setGameState(prev => {
      const players = [...prev.players];
      const playerIndex = prev.currentPlayerIndex;
      const player = players[playerIndex];
      
      if (!player || !player.isHuman || player.hasActed) {
        return prev;
      }

      const amount = player.chips;
      const newBet = player.currentBet + amount;

      players[playerIndex] = {
        ...player,
        chips: 0,
        currentBet: newBet,
        totalBet: player.totalBet + amount,
        hasActed: true,
        isAllIn: true,
        lastAction: "allin",
      };

      const isRaise = newBet > prev.currentBet;
      if (isRaise) {
        players.forEach((p, i) => {
          if (i !== playerIndex && !p.hasFolded && !p.isAllIn) {
            players[i] = { ...players[i], hasActed: false };
          }
        });
      }

      const newState = {
        ...prev,
        players,
        pot: prev.pot + amount,
        currentBet: Math.max(prev.currentBet, newBet),
        lastRaiseIndex: isRaise ? playerIndex : prev.lastRaiseIndex,
        message: "You're all in!",
      };
      
      return processGameState(newState);
    });
  };

  // Check if everyone is all-in and advance to showdown
  useEffect(() => {
    if (gameState.phase === "idle" || gameState.phase === "roundEnd" || gameState.phase === "showdown") return;
    
    const activePlayers = gameState.players.filter(p => !p.hasFolded);
    const playersWhoCanAct = gameState.players.filter(p => !p.hasFolded && !p.isAllIn);
    
    // If multiple active players but no one can act (all are all-in), go to showdown
    if (activePlayers.length > 1 && playersWhoCanAct.length === 0) {
      setGameState(prev => processGameState(prev));
    }
  }, [gameState.phase, gameState.players, processGameState]);

  // AI turn logic
  useEffect(() => {
    if (gameState.phase === "idle" || gameState.phase === "roundEnd" || gameState.phase === "showdown") return;
    if (!currentPlayer || currentPlayer.isHuman || currentPlayer.hasFolded || currentPlayer.isAllIn) return;
    if (!currentPlayer.hand || currentPlayer.hand.length < 2) return; // Wait for cards to be dealt
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

        const newState = {
          ...prev,
          players,
          pot: newPot,
          currentBet: newCurrentBet,
          message: `${player.name} ${decision.action === "allin" ? "goes all-in" : decision.action}s${decision.action === "raise" ? ` to $${decision.amount}` : ""}`,
        };
        
        return processGameState(newState);
      });

      aiThinkingRef.current = false;
    };

    playAI();
  }, [gameState.currentPlayerIndex, gameState.phase, currentPlayer, gameState.communityCards, gameState.currentBet, gameState.pot, gameState.difficulty, processGameState]);

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

    // Safety check - if player has no cards, just check or fold
    if (!player.hand || player.hand.length < 2) {
      return canCheck ? { action: "check" } : { action: "fold" };
    }

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

      // Remove busted players (keep human in so we can show game over modal)
      const playerCountBefore = prev.players.length;
      players = players.filter(p => p.chips > 0 || p.isHuman);
      const playerEliminated = players.length < playerCountBefore;

      // Increase blinds when a player is eliminated
      const newSmallBlind = playerEliminated ? prev.smallBlind * 2 : prev.smallBlind;
      const newBigBlind = playerEliminated ? prev.bigBlind * 2 : prev.bigBlind;

      // Human is out of chips — stay in roundEnd so Game Over modal shows; don't start new round
      if (players.find(p => p.isHuman)?.chips === 0) {
        return { ...prev, players, phase: "roundEnd", winners: prev.winners, message: prev.message };
      }

      // Check if game over (only one player with chips left)
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
        smallBlind: newSmallBlind,
        bigBlind: newBigBlind,
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

        // Post blinds using current state amounts
        const sbIndex = newPlayers.findIndex(p => p.isSmallBlind);
        const bbIndex = newPlayers.findIndex(p => p.isBigBlind);
        const sbAmount = Math.min(prev.smallBlind, newPlayers[sbIndex].chips);
        const bbAmount = Math.min(prev.bigBlind, newPlayers[bbIndex].chips);

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
          currentBet: prev.bigBlind,
          minRaise: prev.bigBlind,
          currentPlayerIndex,
          message: "Your turn",
        };
      });
    }, 500);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-red-950 to-[var(--color-dark-1)]">
      {/* Header */}
      <div className="flex-shrink-0 px-8 md:px-16 py-2">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/games/casino" className="text-[var(--muted-foreground)] hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-heading">Texas Hold&apos;em</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRulesModal(true)}
              className="text-xs text-[var(--muted-foreground)] hover:text-white transition-colors"
            >
              Hand Rankings
            </button>
            <Button variant="primary" size="sm" onClick={() => setShowSetupModal(true)}>
              New Game
            </Button>
          </div>
        </div>
      </div>

      {/* Game Table */}
      <div className="flex-1 flex flex-col min-h-0 px-8 md:px-16 pb-2 relative">
        {gameState.phase === "idle" ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center w-full max-w-lg px-4"
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
          <div className="flex-1 flex gap-4 min-h-0 max-w-6xl mx-auto w-full items-start pt-4">
            {/* Left Side - AI Players - slightly down from top */}
            <div className="w-40 flex flex-col gap-3 justify-start flex-shrink-0 mt-16">
              {gameState.players.filter(p => !p.isHuman).slice(0, Math.ceil((gameState.players.length - 1) / 2)).map((player) => (
                <PlayerCard key={player.id} player={player} isActive={player.id === currentPlayer?.id && !player.hasFolded} />
              ))}
            </div>

            {/* Center - Table: stretch to full height so content stays vertically centered (unchanged from before) */}
            <div className="flex-1 flex flex-col min-h-0 justify-center self-stretch">
              {/* Table Center - Pot, Cards, Message - generous spacing, centered, slightly higher */}
              <div className="flex flex-col items-center flex-shrink-0 py-6 px-4 -mt-20">
                {/* Blind amounts - visible throughout the game (this block only renders when not idle) */}
                <div className="mb-3 text-sm text-[var(--muted-foreground)]">
                  <span className="text-amber-400/90 font-medium">Blinds:</span>{" "}
                  <span>SB ${gameState.smallBlind}</span>
                  <span className="mx-1.5 text-white/50">/</span>
                  <span>BB ${gameState.bigBlind}</span>
                </div>
                {/* Pot Display */}
                <div className="mb-5">
                  <div className="bg-black/40 backdrop-blur rounded-full px-3 py-1 flex items-center gap-2">
                    <span className="text-xs">💰</span>
                    <span className="text-base font-bold text-yellow-400">Pot: ${gameState.pot}</span>
                  </div>
                </div>

                {/* Community Cards - isolated stacking so they don't cover text below */}
                <div className="flex justify-center gap-1.5 mb-5 relative z-0">
                  {gameState.communityCards.length > 0 ? (
                    <AnimatePresence mode="popLayout">
                      {gameState.communityCards.map((card, i) => (
                        <motion.div
                          key={card.id}
                          initial={{ opacity: 0, y: -20, rotateY: 180 }}
                          animate={{ opacity: 1, y: 0, rotateY: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="overflow-hidden rounded-lg"
                        >
                          <PlayingCard card={card} size="sm" />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  ) : (
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="w-[45px] h-[63px] border border-dashed border-white/20 rounded-lg" />
                      ))}
                    </div>
                  )}
                </div>

                {/* Message / Winner Display - above cards in stacking order */}
                <div className="pointer-events-none relative z-10 mt-4">
                  {gameState.phase === "roundEnd" && gameState.winners.length > 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-4 py-2 text-center shadow-lg"
                    >
                      {gameState.winners.map((w, i) => {
                        const winner = gameState.players.find(p => p.id === w.playerId);
                        return (
                          <div key={i} className="text-yellow-400 text-sm font-medium">
                            <span className="font-bold">{winner?.name}</span> wins ${w.amount} with {w.handName}!
                          </div>
                        );
                      })}
                    </motion.div>
                  ) : (
                    <motion.div
                      key={gameState.message}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-black/40 backdrop-blur rounded-lg px-4 py-2 shadow-lg"
                    >
                      <span className="text-sm font-medium text-white">{gameState.message}</span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Human Player Section - spaced from table center */}
              {humanPlayer && (
                <div className="flex-shrink-0 mt-6">
                  <div className="bg-[var(--color-dark-2)]/80 rounded-lg p-3 border border-[var(--color-dark-3)]">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-heading">Your Hand</span>
                        {humanPlayer.isDealer && <span title="Dealer" className="text-sm">🔘</span>}
                        {humanPlayer.isSmallBlind && (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-400 border border-amber-500/50" title="Small Blind">SB</span>
                        )}
                        {humanPlayer.isBigBlind && (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-600/40 text-amber-300 border border-amber-500/60" title="Big Blind">BB</span>
                        )}
                        {humanPlayer.currentBet > 0 && (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            Bet: ${humanPlayer.currentBet}
                          </span>
                        )}
                      </div>
                      <div className="text-yellow-400 font-bold flex-shrink-0">${humanPlayer.chips}</div>
                    </div>

                    {/* Cards and Actions Row */}
                    <div className="flex items-center justify-center gap-6">
                      {/* Your Cards */}
                      <div className="flex gap-2">
                        {humanPlayer.hand.map((card, i) => (
                          <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                          >
                            <PlayingCard card={{ ...card, faceUp: true }} size="sm" />
                          </motion.div>
                        ))}
                      </div>

                      {/* Hand Strength */}
                      {gameState.communityCards.length >= 3 && humanPlayer.hand.length === 2 && (
                        <div className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">
                          {getBestHand(humanPlayer.hand, gameState.communityCards).name}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {isHumanTurn && (
                        <div className="flex gap-2 relative z-10">
                          <Button variant="outline" size="sm" onClick={() => handleFold()}>
                            Fold
                          </Button>
                          
                          {gameState.currentBet === humanPlayer.currentBet && (
                            <Button variant="outline" size="sm" onClick={() => handleCheck()}>
                              Check
                            </Button>
                          )}
                          
                          {gameState.currentBet > humanPlayer.currentBet && (
                            <Button variant="primary" size="sm" onClick={() => handleCall()}>
                              Call ${Math.min(gameState.currentBet - humanPlayer.currentBet, humanPlayer.chips)}
                            </Button>
                          )}
                          
                          {humanPlayer.chips > gameState.currentBet - humanPlayer.currentBet && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRaiseAmount(gameState.currentBet + gameState.minRaise);
                                  setShowRaiseSlider(true);
                                }}
                              >
                                Raise
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleAllIn()}>
                                All-In
                              </Button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Round End Actions */}
                      {gameState.phase === "roundEnd" && (
                        <div className="relative z-10">
                          <Button variant="primary" size="sm" onClick={startNewRound}>
                            {humanPlayer.chips > 0 || gameState.winners.some(w => w.playerId === humanPlayer.id) ? "Next Hand" : "Game Over"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side - AI Players - slightly down from top */}
            <div className="w-40 flex flex-col gap-3 justify-start flex-shrink-0 mt-16">
              {gameState.players.filter(p => !p.isHuman).slice(Math.ceil((gameState.players.length - 1) / 2)).map((player) => (
                <PlayerCard key={player.id} player={player} isActive={player.id === currentPlayer?.id && !player.hasFolded} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Raise Modal */}
      <AnimatePresence>
        {showRaiseSlider && humanPlayer && (() => {
          const minRaise = gameState.currentBet + gameState.minRaise;
          const maxRaise = humanPlayer.chips + humanPlayer.currentBet;
          
          const handleInputChange = (value: string) => {
            // Remove any non-numeric characters
            const numericValue = value.replace(/[^0-9]/g, '');
            if (numericValue === '') {
              setRaiseAmount(minRaise);
              return;
            }
            const parsed = parseInt(numericValue, 10);
            // Clamp between min and max
            const clamped = Math.max(minRaise, Math.min(maxRaise, parsed));
            setRaiseAmount(clamped);
          };
          
          return (
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
                
                {/* Number Input */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-2xl text-yellow-400">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={raiseAmount}
                    onChange={e => handleInputChange(e.target.value)}
                    className="w-32 text-center text-3xl font-bold text-yellow-400 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500/50"
                  />
                </div>

                {/* Styled Range Slider */}
                <div className="relative mb-2">
                  <input
                    type="range"
                    min={minRaise}
                    max={maxRaise}
                    value={raiseAmount}
                    onChange={e => setRaiseAmount(parseInt(e.target.value))}
                    className="w-full h-2 appearance-none cursor-pointer bg-[var(--color-dark-4)] rounded-full
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-5
                      [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-yellow-500
                      [&::-webkit-slider-thumb]:border-2
                      [&::-webkit-slider-thumb]:border-yellow-400
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:shadow-lg
                      [&::-webkit-slider-thumb]:transition-transform
                      [&::-webkit-slider-thumb]:hover:scale-110
                      [&::-moz-range-thumb]:w-5
                      [&::-moz-range-thumb]:h-5
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-yellow-500
                      [&::-moz-range-thumb]:border-2
                      [&::-moz-range-thumb]:border-yellow-400
                      [&::-moz-range-thumb]:cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, rgb(234 179 8) 0%, rgb(234 179 8) ${((raiseAmount - minRaise) / (maxRaise - minRaise)) * 100}%, var(--color-dark-4) ${((raiseAmount - minRaise) / (maxRaise - minRaise)) * 100}%, var(--color-dark-4) 100%)`
                    }}
                  />
                </div>

                <div className="flex justify-between text-xs text-[var(--muted-foreground)] mb-6">
                  <span>Min: ${minRaise}</span>
                  <span>Max: ${maxRaise}</span>
                </div>

                {/* Quick Bet Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {[
                    { label: 'Min', value: minRaise },
                    { label: '2x', value: Math.min(gameState.currentBet * 2, maxRaise) },
                    { label: '3x', value: Math.min(gameState.currentBet * 3, maxRaise) },
                    { label: 'Max', value: maxRaise },
                  ].map(btn => (
                    <button
                      key={btn.label}
                      onClick={() => setRaiseAmount(btn.value)}
                      className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors ${
                        raiseAmount === btn.value
                          ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                          : 'bg-[var(--color-dark-3)] border-[var(--color-dark-4)] text-[var(--muted-foreground)] hover:border-[var(--color-dark-5)] hover:text-white'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
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
          );
        })()}
      </AnimatePresence>

      {/* Game Over Modal (out of chips) - only when hand ended and human lost with 0 chips, after 1.5s delay */}
      <AnimatePresence>
        {showGameOverModal && humanPlayer && humanPlayer.chips === 0 && gameState.phase === "roundEnd" && !gameState.winners.some(w => w.playerId === humanPlayer.id) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-8 max-w-md w-full text-center"
              onClick={e => e.stopPropagation()}
            >
              <motion.div
                className="text-6xl mb-4"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                😔
              </motion.div>
              <h2 className="text-2xl font-heading mb-2">Game Over!</h2>
              <p className="text-[var(--muted-foreground)] mb-6">You&apos;re out of chips.</p>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">What would you like to do?</p>
              <div className="flex flex-col gap-3">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    setShowGameOverModal(false);
                    setGameState(prev => ({ ...prev, phase: "idle" }));
                    setShowSetupModal(true);
                  }}
                >
                  Change Difficulty
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowGameOverModal(false);
                    startGame(gameState.difficulty, gameState.players.length);
                  }}
                >
                  Play Again
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowGameOverModal(false);
                    setGameState(prev => ({ ...prev, phase: "idle" }));
                  }}
                >
                  Main Menu
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

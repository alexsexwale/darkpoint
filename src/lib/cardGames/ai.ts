import { Card, Suit, Rank, Player } from "./types";
import { isRed, getHeartsPointValue, isQueenOfSpades, sortCardsByRank, groupBySuit } from "./deck";
import { randomItem } from "./utils";

/**
 * AI difficulty levels
 */
export type AIDifficulty = "easy" | "medium" | "hard";

/**
 * AI thinking delay in ms
 */
export const AI_THINK_DELAY = {
  easy: 1500,
  medium: 1000,
  hard: 600,
};

// ============================================
// CRAZY EIGHTS AI
// ============================================

/**
 * Find playable cards in Crazy Eights
 */
export function findPlayableCrazyEights(hand: Card[], topCard: Card, currentSuit: Suit): Card[] {
  return hand.filter(card => {
    // 8s are always playable
    if (card.rank === 8) return true;
    // Match suit or rank
    return card.suit === currentSuit || card.rank === topCard.rank;
  });
}

/**
 * AI chooses a card to play in Crazy Eights
 */
export function crazyEightsAIChooseCard(
  hand: Card[],
  topCard: Card,
  currentSuit: Suit,
  difficulty: AIDifficulty = "medium"
): { card: Card; newSuit?: Suit } | null {
  const playable = findPlayableCrazyEights(hand, topCard, currentSuit);
  
  if (playable.length === 0) return null;
  
  if (difficulty === "easy") {
    // Easy: play random playable card
    const card = randomItem(playable);
    return {
      card,
      newSuit: card.rank === 8 ? getMostCommonSuit(hand) : undefined,
    };
  }
  
  // Medium/Hard: prioritize strategy
  // 1. Try to play non-8s first (save 8s)
  const nonEights = playable.filter(c => c.rank !== 8);
  
  if (nonEights.length > 0) {
    if (difficulty === "hard") {
      // Hard: play card that matches most cards in hand
      const cardScores = nonEights.map(card => ({
        card,
        score: hand.filter(c => c.suit === card.suit || c.rank === card.rank).length,
      }));
      cardScores.sort((a, b) => b.score - a.score);
      return { card: cardScores[0].card };
    }
    // Medium: play random non-8
    return { card: randomItem(nonEights) };
  }
  
  // Have to play an 8
  const eight = playable.find(c => c.rank === 8)!;
  return {
    card: eight,
    newSuit: getMostCommonSuit(hand.filter(c => c.id !== eight.id)),
  };
}

/**
 * Get the most common suit in a hand
 */
function getMostCommonSuit(hand: Card[]): Suit {
  const counts: Record<Suit, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
  for (const card of hand) {
    counts[card.suit]++;
  }
  
  let maxSuit: Suit = "spades";
  let maxCount = 0;
  for (const [suit, count] of Object.entries(counts) as [Suit, number][]) {
    if (count > maxCount) {
      maxCount = count;
      maxSuit = suit;
    }
  }
  return maxSuit;
}

// ============================================
// HEARTS AI
// ============================================

/**
 * AI chooses cards to pass in Hearts
 */
export function heartsAIChoosePassCards(
  hand: Card[],
  difficulty: AIDifficulty = "medium"
): Card[] {
  const sorted = sortCardsByRank(hand);
  
  if (difficulty === "easy") {
    // Easy: pass 3 random high cards
    const highCards = sorted.filter(c => c.rank >= 10);
    if (highCards.length >= 3) {
      return highCards.slice(0, 3);
    }
    return sorted.slice(-3);
  }
  
  // Medium/Hard: strategic passing
  const toPass: Card[] = [];
  
  // Always pass Queen of Spades if we have it
  const queenOfSpades = hand.find(isQueenOfSpades);
  if (queenOfSpades) {
    toPass.push(queenOfSpades);
  }
  
  // Pass high spades (King, Ace)
  const highSpades = hand.filter(c => c.suit === "spades" && c.rank >= 12 && !isQueenOfSpades(c));
  for (const card of highSpades) {
    if (toPass.length < 3) toPass.push(card);
  }
  
  // Pass high hearts
  const highHearts = sorted.filter(c => c.suit === "hearts" && c.rank >= 10);
  for (const card of highHearts) {
    if (toPass.length < 3) toPass.push(card);
  }
  
  // Pass other high cards
  const remaining = sorted.filter(c => !toPass.includes(c));
  while (toPass.length < 3 && remaining.length > 0) {
    toPass.push(remaining.pop()!);
  }
  
  return toPass.slice(0, 3);
}

/**
 * AI chooses a card to play in Hearts trick
 */
export function heartsAIPlayCard(
  hand: Card[],
  trick: Card[],
  leadSuit: Suit | null,
  heartsBroken: boolean,
  isFirstTrick: boolean,
  difficulty: AIDifficulty = "medium"
): Card {
  // Get playable cards based on rules
  const playable = getPlayableHeartsCards(hand, leadSuit, heartsBroken, isFirstTrick);
  
  if (playable.length === 1) {
    return playable[0];
  }
  
  if (difficulty === "easy") {
    return randomItem(playable);
  }
  
  // Leading
  if (trick.length === 0) {
    return heartsAILead(playable, heartsBroken, difficulty);
  }
  
  // Following
  return heartsAIFollow(playable, trick, leadSuit!, difficulty);
}

/**
 * Get cards that can be played in Hearts
 */
function getPlayableHeartsCards(
  hand: Card[],
  leadSuit: Suit | null,
  heartsBroken: boolean,
  isFirstTrick: boolean
): Card[] {
  // Must follow suit if possible
  if (leadSuit) {
    const suitCards = hand.filter(c => c.suit === leadSuit);
    if (suitCards.length > 0) {
      return suitCards;
    }
    // Can't follow suit - can play anything except:
    // - Hearts or Queen of Spades on first trick (if not all you have)
    if (isFirstTrick) {
      const nonPenalty = hand.filter(c => getHeartsPointValue(c) === 0);
      if (nonPenalty.length > 0) {
        return nonPenalty;
      }
    }
    return hand;
  }
  
  // Leading - can't lead hearts until broken (unless only have hearts)
  if (!heartsBroken) {
    const nonHearts = hand.filter(c => c.suit !== "hearts");
    if (nonHearts.length > 0) {
      return nonHearts;
    }
  }
  
  return hand;
}

/**
 * AI logic for leading in Hearts
 */
function heartsAILead(playable: Card[], heartsBroken: boolean, difficulty: AIDifficulty): Card {
  const byRank = sortCardsByRank(playable);
  
  if (difficulty === "hard") {
    // Lead low cards to avoid taking tricks
    // Prefer leading from suits where we have few cards
    const groups = groupBySuit(playable);
    let minSuit: Suit = playable[0].suit;
    let minCount = Infinity;
    
    for (const [suit, cards] of Object.entries(groups) as [Suit, Card[]][]) {
      if (cards.length > 0 && cards.length < minCount && suit !== "hearts") {
        minCount = cards.length;
        minSuit = suit;
      }
    }
    
    const suitCards = sortCardsByRank(groups[minSuit]);
    return suitCards[0]; // Lead lowest in that suit
  }
  
  // Medium: lead low
  return byRank[0];
}

/**
 * AI logic for following in Hearts
 */
function heartsAIFollow(
  playable: Card[],
  trick: Card[],
  leadSuit: Suit,
  difficulty: AIDifficulty
): Card {
  const byRank = sortCardsByRank(playable);
  const followingSuit = playable[0].suit === leadSuit;
  
  if (followingSuit) {
    // We have to follow suit
    const trickCardsInSuit = trick.filter(c => c.suit === leadSuit);
    const highestInTrick = Math.max(...trickCardsInSuit.map(c => c.rank));
    
    if (difficulty === "hard" || difficulty === "medium") {
      // Try to play below the highest to not take the trick
      const lowerCards = byRank.filter(c => c.rank < highestInTrick);
      if (lowerCards.length > 0) {
        // Play highest card that still loses
        return lowerCards[lowerCards.length - 1];
      }
      // Have to take it - play lowest
      return byRank[0];
    }
    
    return randomItem(playable);
  }
  
  // Can't follow suit - dump high penalty cards
  if (difficulty === "hard" || difficulty === "medium") {
    // Try to dump Queen of Spades
    const queenOfSpades = playable.find(isQueenOfSpades);
    if (queenOfSpades) {
      return queenOfSpades;
    }
    
    // Dump high hearts
    const hearts = playable.filter(c => c.suit === "hearts");
    if (hearts.length > 0) {
      return sortCardsByRank(hearts)[hearts.length - 1]; // Highest heart
    }
    
    // Dump high spades (might let someone else get stuck with Queen)
    const highSpades = playable.filter(c => c.suit === "spades" && c.rank >= 12);
    if (highSpades.length > 0) {
      return sortCardsByRank(highSpades)[highSpades.length - 1];
    }
    
    // Dump other high cards
    return byRank[byRank.length - 1];
  }
  
  return randomItem(playable);
}

/**
 * Check if AI should attempt to shoot the moon
 */
export function shouldAttemptShootMoon(hand: Card[], collectedCards: Card[]): boolean {
  // Simple heuristic: have most high hearts and Queen of Spades
  const highHearts = hand.filter(c => c.suit === "hearts" && c.rank >= 10).length;
  const hasQueenSpades = hand.some(isQueenOfSpades) || collectedCards.some(isQueenOfSpades);
  const collectedHearts = collectedCards.filter(c => c.suit === "hearts").length;
  
  return (highHearts >= 3 || collectedHearts >= 8) && hasQueenSpades;
}

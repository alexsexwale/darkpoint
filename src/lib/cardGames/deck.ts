import { Card, Suit, Rank, SUITS, RANKS } from "./types";

/**
 * Generate a unique ID for a card
 */
function generateCardId(suit: Suit, rank: Rank): string {
  return `${suit}-${rank}`;
}

/**
 * Create a single card
 */
export function createCard(suit: Suit, rank: Rank, faceUp = false): Card {
  return {
    id: generateCardId(suit, rank),
    suit,
    rank,
    faceUp,
  };
}

/**
 * Create a standard 52-card deck
 */
export function createDeck(faceUp = false): Card[] {
  const deck: Card[] = [];
  
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(suit, rank, faceUp));
    }
  }
  
  return deck;
}

/**
 * Create multiple decks combined (for games like Spider Solitaire)
 */
export function createMultipleDecks(count: number, faceUp = false): Card[] {
  const decks: Card[] = [];
  
  for (let i = 0; i < count; i++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        decks.push({
          id: `${suit}-${rank}-${i}`, // Unique ID for each deck copy
          suit,
          rank,
          faceUp,
        });
      }
    }
  }
  
  return decks;
}

/**
 * Create a deck with only specific suits (for Spider Solitaire easy/medium modes)
 */
export function createDeckWithSuits(suits: Suit[], deckCount: number, faceUp = false): Card[] {
  const deck: Card[] = [];
  
  for (let d = 0; d < deckCount; d++) {
    for (const suit of suits) {
      for (const rank of RANKS) {
        deck.push({
          id: `${suit}-${rank}-${d}`,
          suit,
          rank,
          faceUp,
        });
      }
    }
  }
  
  return deck;
}

/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffleDeck<T>(deck: T[]): T[] {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Draw cards from the top of a deck
 */
export function drawCards(deck: Card[], count: number): { drawn: Card[]; remaining: Card[] } {
  const drawn = deck.slice(0, count);
  const remaining = deck.slice(count);
  return { drawn, remaining };
}

/**
 * Flip a card face up or face down
 */
export function flipCard(card: Card, faceUp?: boolean): Card {
  return {
    ...card,
    faceUp: faceUp !== undefined ? faceUp : !card.faceUp,
  };
}

/**
 * Flip all cards in an array
 */
export function flipCards(cards: Card[], faceUp: boolean): Card[] {
  return cards.map(card => flipCard(card, faceUp));
}

/**
 * Check if a card is red
 */
export function isRed(card: Card): boolean {
  return card.suit === "hearts" || card.suit === "diamonds";
}

/**
 * Check if a card is black
 */
export function isBlack(card: Card): boolean {
  return card.suit === "clubs" || card.suit === "spades";
}

/**
 * Check if two cards have opposite colors
 */
export function areOppositeColors(card1: Card, card2: Card): boolean {
  return isRed(card1) !== isRed(card2);
}

/**
 * Check if card1 can be placed on card2 in Solitaire tableau (opposite color, one rank lower)
 */
export function canStackInTableau(cardToPlace: Card, targetCard: Card): boolean {
  return (
    areOppositeColors(cardToPlace, targetCard) &&
    cardToPlace.rank === targetCard.rank - 1
  );
}

/**
 * Check if a card can be placed on a foundation pile (same suit, one rank higher)
 */
export function canStackOnFoundation(cardToPlace: Card, topCard: Card | null, foundationSuit?: Suit): boolean {
  if (!topCard) {
    // Empty foundation - only Ace can be placed
    return cardToPlace.rank === 1 && (foundationSuit === undefined || cardToPlace.suit === foundationSuit);
  }
  
  return (
    cardToPlace.suit === topCard.suit &&
    cardToPlace.rank === topCard.rank + 1
  );
}

/**
 * Sort cards by suit and rank
 */
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const suitOrder = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    if (suitOrder !== 0) return suitOrder;
    return a.rank - b.rank;
  });
}

/**
 * Sort cards by rank only (for hand display)
 */
export function sortCardsByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.rank - b.rank);
}

/**
 * Group cards by suit
 */
export function groupBySuit(cards: Card[]): Record<Suit, Card[]> {
  const groups: Record<Suit, Card[]> = {
    hearts: [],
    diamonds: [],
    clubs: [],
    spades: [],
  };
  
  for (const card of cards) {
    groups[card.suit].push(card);
  }
  
  return groups;
}

/**
 * Find a card in an array by ID
 */
export function findCardById(cards: Card[], id: string): Card | undefined {
  return cards.find(card => card.id === id);
}

/**
 * Remove a card from an array by ID
 */
export function removeCardById(cards: Card[], id: string): Card[] {
  return cards.filter(card => card.id !== id);
}

/**
 * Get the point value of a card (for Hearts)
 */
export function getHeartsPointValue(card: Card): number {
  if (card.suit === "hearts") return 1;
  if (card.suit === "spades" && card.rank === 12) return 13; // Queen of Spades
  return 0;
}

/**
 * Check if a card is the Queen of Spades
 */
export function isQueenOfSpades(card: Card): boolean {
  return card.suit === "spades" && card.rank === 12;
}

/**
 * Check if a sequence of cards forms a valid run (same suit, descending rank)
 */
export function isValidRun(cards: Card[]): boolean {
  if (cards.length < 2) return true;
  
  for (let i = 1; i < cards.length; i++) {
    if (cards[i].suit !== cards[0].suit) return false;
    if (cards[i].rank !== cards[i - 1].rank - 1) return false;
  }
  
  return true;
}

/**
 * Check if a sequence is a complete run from King to Ace
 */
export function isCompleteRun(cards: Card[]): boolean {
  if (cards.length !== 13) return false;
  if (!isValidRun(cards)) return false;
  return cards[0].rank === 13 && cards[12].rank === 1;
}

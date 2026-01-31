// Card suits
export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

// Card ranks (A = 1, J = 11, Q = 12, K = 13)
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

// Card interface
export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

// Suit colors
export const SUIT_COLORS: Record<Suit, "red" | "black"> = {
  hearts: "red",
  diamonds: "red",
  clubs: "black",
  spades: "black",
};

// Suit symbols
export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

// Rank display values
export const RANK_DISPLAY: Record<Rank, string> = {
  1: "A",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
};

// All suits in order
export const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];

// All ranks in order
export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// Player types
export type PlayerType = "human" | "ai";

// Player interface
export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  hand: Card[];
  score: number;
}

// Game status
export type GameStatus = "idle" | "playing" | "paused" | "won" | "lost" | "ended";

// Drag data for card movement
export interface DragData {
  cards: Card[];
  sourceId: string;
  sourceIndex: number;
}

// Animation states
export type CardAnimation = "idle" | "dealing" | "flipping" | "moving" | "collecting";

// Game difficulty for Spider Solitaire
export type SpiderDifficulty = "easy" | "medium" | "hard"; // 1, 2, or 4 suits

// Multiplayer mode
export type MultiplayerMode = "ai" | "local";

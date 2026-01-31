import { Card, Player, PlayerType } from "./types";

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Create a player
 */
export function createPlayer(name: string, type: PlayerType): Player {
  return {
    id: generateId(),
    name,
    type,
    hand: [],
    score: 0,
  };
}

/**
 * Create AI players with names
 */
const AI_NAMES = ["Alex", "Jordan", "Morgan", "Taylor", "Casey", "Riley", "Quinn", "Skyler"];

export function createAIPlayer(index: number): Player {
  const name = AI_NAMES[index % AI_NAMES.length];
  return createPlayer(name, "ai");
}

/**
 * Create human player
 */
export function createHumanPlayer(name = "You"): Player {
  return createPlayer(name, "human");
}

/**
 * Format time in MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Delay helper for animations and AI thinking
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get random item from array
 */
export function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get the next player index in turn order
 */
export function getNextPlayerIndex(currentIndex: number, totalPlayers: number): number {
  return (currentIndex + 1) % totalPlayers;
}

/**
 * Deep clone an object (for game state)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if arrays are equal (shallow comparison of IDs for cards)
 */
export function areCardsEqual(cards1: Card[], cards2: Card[]): boolean {
  if (cards1.length !== cards2.length) return false;
  return cards1.every((card, index) => card.id === cards2[index].id);
}

/**
 * Save game state to localStorage
 */
export function saveGameState<T>(key: string, state: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save game state:", e);
  }
}

/**
 * Load game state from localStorage
 */
export function loadGameState<T>(key: string): T | null {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.warn("Failed to load game state:", e);
    return null;
  }
}

/**
 * Clear saved game state
 */
export function clearGameState(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn("Failed to clear game state:", e);
  }
}

/**
 * Calculate percentage
 */
export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Pluralize a word
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || `${singular}s`);
}

/**
 * Get winner(s) from players based on score (lowest wins for Hearts)
 */
export function getWinnersByLowestScore(players: Player[]): Player[] {
  const minScore = Math.min(...players.map(p => p.score));
  return players.filter(p => p.score === minScore);
}

/**
 * Get winner(s) from players based on score (highest wins)
 */
export function getWinnersByHighestScore(players: Player[]): Player[] {
  const maxScore = Math.max(...players.map(p => p.score));
  return players.filter(p => p.score === maxScore);
}

/**
 * Shuffle array (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Rotate array by n positions (for card passing in Hearts)
 */
export function rotateArray<T>(array: T[], n: number): T[] {
  const len = array.length;
  const normalizedN = ((n % len) + len) % len;
  return [...array.slice(normalizedN), ...array.slice(0, normalizedN)];
}

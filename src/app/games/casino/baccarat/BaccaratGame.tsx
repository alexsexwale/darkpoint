"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import { PlayingCard } from "@/lib/cardGames/cardRenderer";
import { Card } from "@/lib/cardGames/types";
import { createDeck, shuffleDeck } from "@/lib/cardGames/deck";

type Difficulty = "easy" | "medium" | "hard" | "master";
type BetType = "player" | "banker" | "tie" | null;
type GamePhase = "betting" | "dealing" | "result" | "idle";

interface GameState {
  deck: Card[];
  playerHand: Card[];
  bankerHand: Card[];
  playerScore: number;
  bankerScore: number;
  chips: number;
  currentBet: number;
  betType: BetType;
  phase: GamePhase;
  message: string;
  winner: BetType;
  history: Array<{ winner: BetType; playerScore: number; bankerScore: number }>;
  difficulty: Difficulty;
}

const INITIAL_CHIPS: Record<Difficulty, number> = {
  easy: 5000,
  medium: 2500,
  hard: 1000,
  master: 500,
};

const MIN_BET: Record<Difficulty, number> = {
  easy: 10,
  medium: 25,
  hard: 50,
  master: 100,
};

const DIFFICULTY_LABELS: Record<Difficulty, { label: string; icon: string; description: string }> = {
  easy: { label: "Easy", icon: "🌱", description: "$5000 chips, $10 min bet" },
  medium: { label: "Medium", icon: "🎯", description: "$2500 chips, $25 min bet" },
  hard: { label: "Hard", icon: "🔥", description: "$1000 chips, $50 min bet" },
  master: { label: "Master", icon: "💀", description: "$500 chips, $100 min bet" },
};

const DEAL_DELAY = 400;
const BANKER_COMMISSION = 0.05;

// Calculate card value for Baccarat (face cards = 0, Ace = 1, others = face value)
function getCardValue(card: Card): number {
  if (card.rank >= 10) return 0; // 10, J, Q, K = 0
  return card.rank; // A = 1, 2-9 = face value
}

// Calculate hand score (units digit only)
function calculateScore(hand: Card[]): number {
  const total = hand.reduce((sum, card) => sum + getCardValue(card), 0);
  return total % 10;
}

// Check if natural (8 or 9)
function isNatural(score: number): boolean {
  return score === 8 || score === 9;
}

// Determine if player draws third card
function playerDrawsThird(playerScore: number): boolean {
  return playerScore <= 5;
}

// Determine if banker draws third card based on rules
function bankerDrawsThird(bankerScore: number, playerThirdCard: Card | null): boolean {
  if (!playerThirdCard) {
    // Player stood, banker draws on 0-5
    return bankerScore <= 5;
  }
  
  const playerThirdValue = getCardValue(playerThirdCard);
  
  if (bankerScore <= 2) return true;
  if (bankerScore === 3) return playerThirdValue !== 8;
  if (bankerScore === 4) return playerThirdValue >= 2 && playerThirdValue <= 7;
  if (bankerScore === 5) return playerThirdValue >= 4 && playerThirdValue <= 7;
  if (bankerScore === 6) return playerThirdValue === 6 || playerThirdValue === 7;
  return false; // Banker stands on 7
}

const createInitialState = (): GameState => ({
  deck: [],
  playerHand: [],
  bankerHand: [],
  playerScore: 0,
  bankerScore: 0,
  chips: 1000,
  currentBet: 0,
  betType: null,
  phase: "idle",
  message: "",
  winner: null,
  history: [],
  difficulty: "medium",
});

export function BaccaratGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [betAmount, setBetAmount] = useState(25);
  const dealingRef = useRef(false);

  const minBet = MIN_BET[gameState.difficulty];

  // Start new game
  const startGame = useCallback((difficulty: Difficulty) => {
    const deck = shuffleDeck(createDeck(true));
    setGameState({
      ...createInitialState(),
      deck,
      chips: INITIAL_CHIPS[difficulty],
      difficulty,
      phase: "betting",
      message: "Place your bet",
    });
    setBetAmount(MIN_BET[difficulty]);
    setShowSetupModal(false);
  }, []);

  // Place bet
  const placeBet = useCallback((type: BetType, amount: number) => {
    if (gameState.phase !== "betting" || amount > gameState.chips || amount < minBet) return;
    
    setGameState(prev => ({
      ...prev,
      betType: type,
      currentBet: amount,
      chips: prev.chips - amount,
      message: `Bet $${amount} on ${type === "tie" ? "Tie" : type === "player" ? "Player" : "Banker"}`,
    }));
  }, [gameState.phase, gameState.chips, minBet]);

  // Deal cards
  const deal = useCallback(() => {
    if (gameState.phase !== "betting" || !gameState.betType || dealingRef.current) return;
    
    dealingRef.current = true;
    
    setGameState(prev => ({
      ...prev,
      phase: "dealing",
      message: "Dealing...",
    }));

    // Deal sequence
    let currentDeck = [...gameState.deck];
    const playerCards: Card[] = [];
    const bankerCards: Card[] = [];
    
    // Deal 2 cards each (alternating: P, B, P, B)
    setTimeout(() => {
      const card1 = { ...currentDeck.pop()!, faceUp: true };
      playerCards.push(card1);
      setGameState(prev => ({
        ...prev,
        playerHand: [card1],
        deck: currentDeck,
      }));
    }, DEAL_DELAY);

    setTimeout(() => {
      const card2 = { ...currentDeck.pop()!, faceUp: true };
      bankerCards.push(card2);
      setGameState(prev => ({
        ...prev,
        bankerHand: [card2],
        deck: currentDeck,
      }));
    }, DEAL_DELAY * 2);

    setTimeout(() => {
      const card3 = { ...currentDeck.pop()!, faceUp: true };
      playerCards.push(card3);
      setGameState(prev => ({
        ...prev,
        playerHand: [...prev.playerHand, card3],
        deck: currentDeck,
      }));
    }, DEAL_DELAY * 3);

    setTimeout(() => {
      const card4 = { ...currentDeck.pop()!, faceUp: true };
      bankerCards.push(card4);
      currentDeck = currentDeck.slice(0, -4);
      
      const pScore = calculateScore(playerCards);
      const bScore = calculateScore(bankerCards);
      
      setGameState(prev => ({
        ...prev,
        bankerHand: [...prev.bankerHand, card4],
        playerScore: pScore,
        bankerScore: bScore,
        deck: currentDeck,
      }));
      
      // Check for natural or continue with third card rules
      if (isNatural(pScore) || isNatural(bScore)) {
        // Natural - determine winner
        setTimeout(() => determineWinner(playerCards, bankerCards, pScore, bScore), DEAL_DELAY);
      } else {
        // Check third card draws
        let playerThirdCard: Card | null = null;
        let newPScore = pScore;
        let newBScore = bScore;
        
        // Player third card
        if (playerDrawsThird(pScore)) {
          setTimeout(() => {
            playerThirdCard = { ...currentDeck.pop()!, faceUp: true };
            playerCards.push(playerThirdCard);
            newPScore = calculateScore(playerCards);
            
            setGameState(prev => ({
              ...prev,
              playerHand: [...prev.playerHand, playerThirdCard!],
              playerScore: newPScore,
              deck: prev.deck.slice(0, -1),
            }));
            
            // Banker third card decision
            if (bankerDrawsThird(bScore, playerThirdCard)) {
              setTimeout(() => {
                const bankerThird = { ...currentDeck.pop()!, faceUp: true };
                bankerCards.push(bankerThird);
                newBScore = calculateScore(bankerCards);
                
                setGameState(prev => ({
                  ...prev,
                  bankerHand: [...prev.bankerHand, bankerThird],
                  bankerScore: newBScore,
                  deck: prev.deck.slice(0, -1),
                }));
                
                setTimeout(() => determineWinner(playerCards, bankerCards, newPScore, newBScore), DEAL_DELAY);
              }, DEAL_DELAY);
            } else {
              setTimeout(() => determineWinner(playerCards, bankerCards, newPScore, bScore), DEAL_DELAY);
            }
          }, DEAL_DELAY);
        } else {
          // Player stands, check banker
          if (bankerDrawsThird(bScore, null)) {
            setTimeout(() => {
              const bankerThird = { ...currentDeck.pop()!, faceUp: true };
              bankerCards.push(bankerThird);
              newBScore = calculateScore(bankerCards);
              
              setGameState(prev => ({
                ...prev,
                bankerHand: [...prev.bankerHand, bankerThird],
                bankerScore: newBScore,
                deck: prev.deck.slice(0, -1),
              }));
              
              setTimeout(() => determineWinner(playerCards, bankerCards, pScore, newBScore), DEAL_DELAY);
            }, DEAL_DELAY);
          } else {
            setTimeout(() => determineWinner(playerCards, bankerCards, pScore, bScore), DEAL_DELAY);
          }
        }
      }
    }, DEAL_DELAY * 4);
  }, [gameState.phase, gameState.betType, gameState.deck]);

  // Determine winner and payout
  const determineWinner = (playerCards: Card[], bankerCards: Card[], pScore: number, bScore: number) => {
    let winner: BetType;
    let message: string;
    let payout = 0;
    
    if (pScore > bScore) {
      winner = "player";
      message = `Player wins! ${pScore} vs ${bScore}`;
    } else if (bScore > pScore) {
      winner = "banker";
      message = `Banker wins! ${bScore} vs ${pScore}`;
    } else {
      winner = "tie";
      message = `Tie! Both have ${pScore}`;
    }
    
    setGameState(prev => {
      // Calculate payout
      if (prev.betType === winner) {
        if (winner === "player") {
          payout = prev.currentBet * 2; // 1:1
        } else if (winner === "banker") {
          payout = prev.currentBet * 2 * (1 - BANKER_COMMISSION); // 1:1 minus 5% commission
        } else {
          payout = prev.currentBet * 9; // 8:1 for tie
        }
      }
      
      return {
        ...prev,
        phase: "result",
        winner,
        playerScore: pScore,
        bankerScore: bScore,
        chips: prev.chips + Math.floor(payout),
        message: payout > 0 
          ? `${message} - You win $${Math.floor(payout - prev.currentBet)}!`
          : `${message} - You lose $${prev.currentBet}`,
        history: [...prev.history, { winner, playerScore: pScore, bankerScore: bScore }].slice(-20),
      };
    });
    
    dealingRef.current = false;
  };

  // New round
  const newRound = useCallback(() => {
    if (gameState.chips < minBet) {
      setGameState(prev => ({
        ...prev,
        phase: "idle",
        message: "Game Over - Out of chips!",
      }));
      return;
    }
    
    // Reshuffle if deck is low
    let newDeck = gameState.deck;
    if (newDeck.length < 20) {
      newDeck = shuffleDeck(createDeck(true));
    }
    
    setGameState(prev => ({
      ...prev,
      deck: newDeck,
      playerHand: [],
      bankerHand: [],
      playerScore: 0,
      bankerScore: 0,
      currentBet: 0,
      betType: null,
      phase: "betting",
      winner: null,
      message: "Place your bet",
    }));
  }, [gameState.chips, gameState.deck, minBet]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 to-[var(--color-dark-1)]">
      {/* Header */}
      <div className="container pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/games/casino" className="text-[var(--muted-foreground)] hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-heading">Baccarat</h1>
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

      {/* Game Area */}
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Chip Count */}
          <div className="flex justify-center mb-6">
            <div className="bg-black/30 backdrop-blur rounded-full px-6 py-2 flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <span className="text-xl font-bold text-yellow-400">${gameState.chips}</span>
            </div>
          </div>

          {gameState.phase === "idle" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-6">🃏</div>
              <h1 className="text-4xl font-heading mb-4 text-white">Baccarat</h1>
              <p className="text-[var(--muted-foreground)] mb-8 max-w-md mx-auto">
                {gameState.message || "The elegant card game of chance. Bet on Player, Banker, or Tie!"}
              </p>
              <Button variant="primary" size="lg" onClick={() => setShowSetupModal(true)}>
                Start Game
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-8">
              {/* Banker Hand */}
              <div className="text-center">
                <div className="text-sm text-[var(--muted-foreground)] mb-2">Banker</div>
                <div className="flex justify-center gap-2 mb-2 min-h-[100px]">
                  <AnimatePresence mode="popLayout">
                    {gameState.bankerHand.map((card, i) => (
                      <motion.div
                        key={card.id + i}
                        initial={{ opacity: 0, y: -50, rotateY: 180 }}
                        animate={{ opacity: 1, y: 0, rotateY: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <PlayingCard card={card} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {gameState.bankerHand.length === 0 && (
                    <div className="w-[70px] h-[100px] border-2 border-dashed border-white/20 rounded-lg" />
                  )}
                </div>
                <div className="text-2xl font-bold text-white">
                  {gameState.bankerHand.length > 0 && gameState.bankerScore}
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

              {/* Player Hand */}
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-2">
                  {gameState.playerHand.length > 0 && gameState.playerScore}
                </div>
                <div className="flex justify-center gap-2 mb-2 min-h-[100px]">
                  <AnimatePresence mode="popLayout">
                    {gameState.playerHand.map((card, i) => (
                      <motion.div
                        key={card.id + i}
                        initial={{ opacity: 0, y: 50, rotateY: 180 }}
                        animate={{ opacity: 1, y: 0, rotateY: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <PlayingCard card={card} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {gameState.playerHand.length === 0 && (
                    <div className="w-[70px] h-[100px] border-2 border-dashed border-white/20 rounded-lg" />
                  )}
                </div>
                <div className="text-sm text-[var(--muted-foreground)]">Player</div>
              </div>

              {/* Betting Controls */}
              {gameState.phase === "betting" && (
                <div className="bg-[var(--color-dark-2)]/50 backdrop-blur rounded-xl p-6 border border-[var(--color-dark-3)]">
                  {/* Bet Amount Selector */}
                  <div className="flex justify-center gap-2 mb-6">
                    {[minBet, minBet * 2, minBet * 5, minBet * 10].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setBetAmount(amount)}
                        disabled={amount > gameState.chips}
                        className={`px-4 py-2 rounded-lg font-bold transition-all ${
                          betAmount === amount
                            ? "bg-yellow-500 text-black"
                            : amount > gameState.chips
                            ? "bg-[var(--color-dark-3)] text-[var(--muted-foreground)] opacity-50"
                            : "bg-[var(--color-dark-3)] text-white hover:bg-[var(--color-dark-4)]"
                        }`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>

                  {/* Bet Type Buttons */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <button
                      onClick={() => placeBet("player", betAmount)}
                      disabled={betAmount > gameState.chips}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        gameState.betType === "player"
                          ? "bg-blue-500/30 border-blue-500"
                          : "bg-[var(--color-dark-3)]/50 border-[var(--color-dark-4)] hover:border-blue-500/50"
                      }`}
                    >
                      <div className="text-2xl mb-2">👤</div>
                      <div className="font-bold text-white">Player</div>
                      <div className="text-xs text-[var(--muted-foreground)]">Pays 1:1</div>
                    </button>

                    <button
                      onClick={() => placeBet("tie", betAmount)}
                      disabled={betAmount > gameState.chips}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        gameState.betType === "tie"
                          ? "bg-green-500/30 border-green-500"
                          : "bg-[var(--color-dark-3)]/50 border-[var(--color-dark-4)] hover:border-green-500/50"
                      }`}
                    >
                      <div className="text-2xl mb-2">🤝</div>
                      <div className="font-bold text-white">Tie</div>
                      <div className="text-xs text-[var(--muted-foreground)]">Pays 8:1</div>
                    </button>

                    <button
                      onClick={() => placeBet("banker", betAmount)}
                      disabled={betAmount > gameState.chips}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        gameState.betType === "banker"
                          ? "bg-red-500/30 border-red-500"
                          : "bg-[var(--color-dark-3)]/50 border-[var(--color-dark-4)] hover:border-red-500/50"
                      }`}
                    >
                      <div className="text-2xl mb-2">🏦</div>
                      <div className="font-bold text-white">Banker</div>
                      <div className="text-xs text-[var(--muted-foreground)]">Pays 0.95:1</div>
                    </button>
                  </div>

                  {/* Deal Button */}
                  {gameState.betType && (
                    <div className="flex justify-center">
                      <Button variant="primary" size="lg" onClick={deal}>
                        Deal Cards
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Result Actions */}
              {gameState.phase === "result" && (
                <div className="flex justify-center">
                  <Button variant="primary" size="lg" onClick={newRound}>
                    {gameState.chips >= minBet ? "New Round" : "Game Over"}
                  </Button>
                </div>
              )}

              {/* History */}
              {gameState.history.length > 0 && (
                <div className="mt-8">
                  <div className="text-sm text-[var(--muted-foreground)] mb-2 text-center">Recent Results</div>
                  <div className="flex justify-center gap-1 flex-wrap">
                    {gameState.history.slice(-10).map((result, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          result.winner === "player"
                            ? "bg-blue-500"
                            : result.winner === "banker"
                            ? "bg-red-500"
                            : "bg-green-500"
                        }`}
                      >
                        {result.winner === "player" ? "P" : result.winner === "banker" ? "B" : "T"}
                      </div>
                    ))}
                  </div>
                </div>
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
                  {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map(diff => {
                    const info = DIFFICULTY_LABELS[diff];
                    return (
                      <button
                        key={diff}
                        onClick={() => startGame(diff)}
                        className="p-4 bg-[var(--color-dark-3)]/50 hover:bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg transition-colors text-center"
                      >
                        <div className="text-2xl mb-1">{info.icon}</div>
                        <div className="font-bold text-white">{info.label}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">{info.description}</div>
                      </button>
                    );
                  })}
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
              <h2 className="text-2xl font-heading mb-4">How to Play Baccarat</h2>
              
              <div className="space-y-4 text-sm text-[var(--muted-foreground)]">
                <div>
                  <h3 className="font-bold text-white mb-1">Objective</h3>
                  <p>Bet on which hand (Player or Banker) will have a total closest to 9, or bet on a Tie.</p>
                </div>
                
                <div>
                  <h3 className="font-bold text-white mb-1">Card Values</h3>
                  <ul className="list-disc list-inside">
                    <li>Ace = 1 point</li>
                    <li>2-9 = Face value</li>
                    <li>10, J, Q, K = 0 points</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-bold text-white mb-1">Scoring</h3>
                  <p>Only the units digit of the total counts. For example, a hand of 7 + 8 = 15 has a score of 5.</p>
                </div>
                
                <div>
                  <h3 className="font-bold text-white mb-1">Natural Win</h3>
                  <p>If either hand has 8 or 9 with the first two cards, it&apos;s a &quot;natural&quot; and no more cards are drawn.</p>
                </div>
                
                <div>
                  <h3 className="font-bold text-white mb-1">Payouts</h3>
                  <ul className="list-disc list-inside">
                    <li>Player wins: 1:1</li>
                    <li>Banker wins: 0.95:1 (5% commission)</li>
                    <li>Tie: 8:1</li>
                  </ul>
                </div>
              </div>
              
              <Button variant="primary" className="w-full mt-6" onClick={() => setShowRulesModal(false)}>
                Got It
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

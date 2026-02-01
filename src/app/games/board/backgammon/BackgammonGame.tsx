"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";

type Difficulty = "easy" | "medium" | "hard" | "master";
type Player = "white" | "black";
type GameStatus = "idle" | "playing" | "won" | "lost";

// Points are numbered 1-24, with 0 being the bar and 25 being off the board
// White moves from 24 to 1 (bearing off at 0)
// Black moves from 1 to 24 (bearing off at 25)
interface Point {
  count: number;
  player: Player | null;
}

interface GameState {
  points: Point[]; // 26 points (0 = white bar, 25 = black bar, 1-24 = board)
  whiteBar: number;
  blackBar: number;
  whiteBorneOff: number;
  blackBorneOff: number;
  currentPlayer: Player;
  dice: [number, number];
  remainingMoves: number[];
  status: GameStatus;
  difficulty: Difficulty;
  selectedPoint: number | null;
  validMoves: number[];
  mustRoll: boolean;
}

// Initial board setup
const createInitialBoard = (): Point[] => {
  const points: Point[] = Array(26).fill(null).map(() => ({ count: 0, player: null }));
  
  // White pieces (moving from 24 to 1)
  points[24] = { count: 2, player: "white" };
  points[13] = { count: 5, player: "white" };
  points[8] = { count: 3, player: "white" };
  points[6] = { count: 5, player: "white" };
  
  // Black pieces (moving from 1 to 24)
  points[1] = { count: 2, player: "black" };
  points[12] = { count: 5, player: "black" };
  points[17] = { count: 3, player: "black" };
  points[19] = { count: 5, player: "black" };
  
  return points;
};

// Roll two dice
const rollDice = (): [number, number] => {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
};

// Get available moves from dice
const getMovesFromDice = (dice: [number, number]): number[] => {
  if (dice[0] === dice[1]) {
    // Doubles - 4 moves
    return [dice[0], dice[0], dice[0], dice[0]];
  }
  return [...dice];
};

// Check if player can bear off (all pieces in home board)
const canBearOff = (points: Point[], player: Player, bar: number): boolean => {
  if (bar > 0) return false;
  
  if (player === "white") {
    // White home board is points 1-6
    for (let i = 7; i <= 24; i++) {
      if (points[i].player === "white" && points[i].count > 0) return false;
    }
    return true;
  } else {
    // Black home board is points 19-24
    for (let i = 1; i <= 18; i++) {
      if (points[i].player === "black" && points[i].count > 0) return false;
    }
    return true;
  }
};

// Get valid destination points for a piece
const getValidDestinations = (
  points: Point[],
  fromPoint: number,
  player: Player,
  remainingMoves: number[],
  whiteBar: number,
  blackBar: number,
  whiteBorneOff: number,
  blackBorneOff: number
): number[] => {
  const destinations: number[] = [];
  const isOnBar = (player === "white" && fromPoint === 0) || (player === "black" && fromPoint === 25);
  const bar = player === "white" ? whiteBar : blackBar;
  
  // Must enter from bar first
  if (!isOnBar && bar > 0) return [];
  
  const canBear = canBearOff(points, player, bar);
  
  for (const move of remainingMoves) {
    let destPoint: number;
    
    if (player === "white") {
      if (isOnBar) {
        destPoint = 25 - move; // Enter from opponent's home board
      } else {
        destPoint = fromPoint - move;
      }
      
      // Bearing off
      if (destPoint <= 0 && canBear) {
        if (destPoint === 0) {
          destinations.push(0); // Exact bear off
        } else {
          // Check if this is the furthest piece
          let hasFurther = false;
          for (let i = fromPoint + 1; i <= 6; i++) {
            if (points[i].player === "white" && points[i].count > 0) {
              hasFurther = true;
              break;
            }
          }
          if (!hasFurther) {
            destinations.push(0); // Bear off with excess
          }
        }
        continue;
      }
    } else {
      if (isOnBar) {
        destPoint = move; // Enter from opponent's home board
      } else {
        destPoint = fromPoint + move;
      }
      
      // Bearing off
      if (destPoint >= 25 && canBear) {
        if (destPoint === 25) {
          destinations.push(25); // Exact bear off
        } else {
          // Check if this is the furthest piece
          let hasFurther = false;
          for (let i = fromPoint - 1; i >= 19; i--) {
            if (points[i].player === "black" && points[i].count > 0) {
              hasFurther = true;
              break;
            }
          }
          if (!hasFurther) {
            destinations.push(25); // Bear off with excess
          }
        }
        continue;
      }
    }
    
    // Regular move - check if destination is valid
    if (destPoint >= 1 && destPoint <= 24) {
      const destPointData = points[destPoint];
      // Can move if: empty, own piece, or single opponent piece (hit)
      if (!destPointData.player || destPointData.player === player || destPointData.count <= 1) {
        if (!destinations.includes(destPoint)) {
          destinations.push(destPoint);
        }
      }
    }
  }
  
  return destinations;
};

// Get all points that have movable pieces
const getMovablePoints = (
  points: Point[],
  player: Player,
  remainingMoves: number[],
  whiteBar: number,
  blackBar: number,
  whiteBorneOff: number,
  blackBorneOff: number
): number[] => {
  const movable: number[] = [];
  const bar = player === "white" ? whiteBar : blackBar;
  
  // Must move from bar first
  if (bar > 0) {
    const barPoint = player === "white" ? 0 : 25;
    const dests = getValidDestinations(points, barPoint, player, remainingMoves, whiteBar, blackBar, whiteBorneOff, blackBorneOff);
    if (dests.length > 0) {
      movable.push(barPoint);
    }
    return movable;
  }
  
  // Check each point
  for (let i = 1; i <= 24; i++) {
    if (points[i].player === player && points[i].count > 0) {
      const dests = getValidDestinations(points, i, player, remainingMoves, whiteBar, blackBar, whiteBorneOff, blackBorneOff);
      if (dests.length > 0) {
        movable.push(i);
      }
    }
  }
  
  return movable;
};

// Apply a move
const applyMove = (
  points: Point[],
  fromPoint: number,
  toPoint: number,
  player: Player,
  remainingMoves: number[],
  whiteBar: number,
  blackBar: number,
  whiteBorneOff: number,
  blackBorneOff: number
): {
  points: Point[];
  remainingMoves: number[];
  whiteBar: number;
  blackBar: number;
  whiteBorneOff: number;
  blackBorneOff: number;
} => {
  const newPoints = points.map(p => ({ ...p }));
  let newWhiteBar = whiteBar;
  let newBlackBar = blackBar;
  let newWhiteBorneOff = whiteBorneOff;
  let newBlackBorneOff = blackBorneOff;
  
  // Calculate move distance
  let moveDistance: number;
  if (player === "white") {
    if (fromPoint === 0) {
      moveDistance = 25 - toPoint;
    } else if (toPoint === 0) {
      moveDistance = fromPoint;
    } else {
      moveDistance = fromPoint - toPoint;
    }
  } else {
    if (fromPoint === 25) {
      moveDistance = toPoint;
    } else if (toPoint === 25) {
      moveDistance = 25 - fromPoint;
    } else {
      moveDistance = toPoint - fromPoint;
    }
  }
  
  // Remove from remaining moves
  const newRemainingMoves = [...remainingMoves];
  const moveIndex = newRemainingMoves.indexOf(moveDistance);
  if (moveIndex !== -1) {
    newRemainingMoves.splice(moveIndex, 1);
  } else {
    // For bearing off with excess, find the largest available move
    const sorted = [...newRemainingMoves].sort((a, b) => b - a);
    for (const m of sorted) {
      if (m >= moveDistance) {
        const idx = newRemainingMoves.indexOf(m);
        if (idx !== -1) {
          newRemainingMoves.splice(idx, 1);
          break;
        }
      }
    }
  }
  
  // Remove piece from source
  if (fromPoint === 0) {
    newWhiteBar--;
  } else if (fromPoint === 25) {
    newBlackBar--;
  } else {
    newPoints[fromPoint].count--;
    if (newPoints[fromPoint].count === 0) {
      newPoints[fromPoint].player = null;
    }
  }
  
  // Add piece to destination
  if (toPoint === 0) {
    newWhiteBorneOff++;
  } else if (toPoint === 25) {
    newBlackBorneOff++;
  } else {
    // Check for hit
    if (newPoints[toPoint].player && newPoints[toPoint].player !== player && newPoints[toPoint].count === 1) {
      // Hit!
      if (newPoints[toPoint].player === "white") {
        newWhiteBar++;
      } else {
        newBlackBar++;
      }
      newPoints[toPoint].count = 0;
    }
    
    newPoints[toPoint].count++;
    newPoints[toPoint].player = player;
  }
  
  return {
    points: newPoints,
    remainingMoves: newRemainingMoves,
    whiteBar: newWhiteBar,
    blackBar: newBlackBar,
    whiteBorneOff: newWhiteBorneOff,
    blackBorneOff: newBlackBorneOff,
  };
};

// Evaluate board position for AI
const evaluatePosition = (
  points: Point[],
  player: Player,
  whiteBar: number,
  blackBar: number,
  whiteBorneOff: number,
  blackBorneOff: number
): number => {
  let score = 0;
  const opponent = player === "white" ? "black" : "white";
  
  // Pip count (lower is better)
  let playerPips = 0;
  let opponentPips = 0;
  
  for (let i = 1; i <= 24; i++) {
    if (points[i].player === "white") {
      const pips = i * points[i].count;
      if (player === "white") playerPips += pips;
      else opponentPips += pips;
    } else if (points[i].player === "black") {
      const pips = (25 - i) * points[i].count;
      if (player === "black") playerPips += pips;
      else opponentPips += pips;
    }
  }
  
  // Bar pieces
  if (player === "white") {
    playerPips += whiteBar * 25;
    opponentPips += blackBar * 25;
  } else {
    playerPips += blackBar * 25;
    opponentPips += whiteBar * 25;
  }
  
  score += (opponentPips - playerPips);
  
  // Borne off pieces (huge bonus)
  if (player === "white") {
    score += whiteBorneOff * 30;
    score -= blackBorneOff * 30;
  } else {
    score += blackBorneOff * 30;
    score -= whiteBorneOff * 30;
  }
  
  // Blots (single pieces) are vulnerable
  for (let i = 1; i <= 24; i++) {
    if (points[i].count === 1) {
      if (points[i].player === player) {
        score -= 5;
      } else {
        score += 5;
      }
    }
    // Made points (2+ pieces) are good
    if (points[i].count >= 2) {
      if (points[i].player === player) {
        score += 3;
      } else {
        score -= 3;
      }
    }
  }
  
  return score;
};

// AI move selection
const chooseAIMove = (
  points: Point[],
  player: Player,
  remainingMoves: number[],
  whiteBar: number,
  blackBar: number,
  whiteBorneOff: number,
  blackBorneOff: number,
  difficulty: Difficulty
): { from: number; to: number } | null => {
  const movablePoints = getMovablePoints(points, player, remainingMoves, whiteBar, blackBar, whiteBorneOff, blackBorneOff);
  if (movablePoints.length === 0) return null;
  
  // Collect all possible moves
  const allMoves: { from: number; to: number; score: number }[] = [];
  
  for (const from of movablePoints) {
    const destinations = getValidDestinations(points, from, player, remainingMoves, whiteBar, blackBar, whiteBorneOff, blackBorneOff);
    for (const to of destinations) {
      const result = applyMove(points, from, to, player, remainingMoves, whiteBar, blackBar, whiteBorneOff, blackBorneOff);
      const score = evaluatePosition(result.points, player, result.whiteBar, result.blackBar, result.whiteBorneOff, result.blackBorneOff);
      allMoves.push({ from, to, score });
    }
  }
  
  if (allMoves.length === 0) return null;
  
  switch (difficulty) {
    case "easy":
      // Random move
      return allMoves[Math.floor(Math.random() * allMoves.length)];
    
    case "medium": {
      // 50% best move, 50% random
      if (Math.random() < 0.5) {
        return allMoves[Math.floor(Math.random() * allMoves.length)];
      }
      allMoves.sort((a, b) => b.score - a.score);
      return allMoves[0];
    }
    
    case "hard":
    case "master": {
      // Best move
      allMoves.sort((a, b) => b.score - a.score);
      // Master adds some randomization among top moves
      if (difficulty === "master" && allMoves.length > 1) {
        const topMoves = allMoves.filter(m => m.score >= allMoves[0].score - 5);
        return topMoves[Math.floor(Math.random() * topMoves.length)];
      }
      return allMoves[0];
    }
  }
};

const DIFFICULTY_LABELS: Record<Difficulty, { label: string; color: string; icon: string }> = {
  easy: { label: "Easy", color: "bg-green-500", icon: "🌱" },
  medium: { label: "Medium", color: "bg-yellow-500", icon: "🎯" },
  hard: { label: "Hard", color: "bg-orange-500", icon: "🔥" },
  master: { label: "Master", color: "bg-red-500", icon: "👑" },
};

export function BackgammonGame() {
  const [gameState, setGameState] = useState<GameState>({
    points: createInitialBoard(),
    whiteBar: 0,
    blackBar: 0,
    whiteBorneOff: 0,
    blackBorneOff: 0,
    currentPlayer: "white",
    dice: [0, 0],
    remainingMoves: [],
    status: "idle",
    difficulty: "medium",
    selectedPoint: null,
    validMoves: [],
    mustRoll: true,
  });

  const [showSetupModal, setShowSetupModal] = useState(false);
  const aiThinkingRef = useRef(false);

  // Start game
  const startGame = useCallback((difficulty: Difficulty) => {
    setGameState({
      points: createInitialBoard(),
      whiteBar: 0,
      blackBar: 0,
      whiteBorneOff: 0,
      blackBorneOff: 0,
      currentPlayer: "white",
      dice: [0, 0],
      remainingMoves: [],
      status: "playing",
      difficulty,
      selectedPoint: null,
      validMoves: [],
      mustRoll: true,
    });
    setShowSetupModal(false);
  }, []);

  // Roll dice
  const handleRollDice = useCallback(() => {
    if (!gameState.mustRoll || gameState.currentPlayer !== "white") return;
    
    const dice = rollDice();
    const moves = getMovesFromDice(dice);
    const movablePoints = getMovablePoints(
      gameState.points, "white", moves,
      gameState.whiteBar, gameState.blackBar,
      gameState.whiteBorneOff, gameState.blackBorneOff
    );

    setGameState(prev => ({
      ...prev,
      dice,
      remainingMoves: moves,
      mustRoll: false,
      validMoves: movablePoints,
    }));
  }, [gameState]);

  // Handle point click
  const handlePointClick = useCallback((pointIndex: number) => {
    if (gameState.status !== "playing" || gameState.currentPlayer !== "white" || gameState.mustRoll) return;

    // If clicking on a movable point, select it
    if (gameState.validMoves.includes(pointIndex)) {
      const destinations = getValidDestinations(
        gameState.points, pointIndex, "white", gameState.remainingMoves,
        gameState.whiteBar, gameState.blackBar,
        gameState.whiteBorneOff, gameState.blackBorneOff
      );
      
      setGameState(prev => ({
        ...prev,
        selectedPoint: pointIndex,
        validMoves: destinations,
      }));
      return;
    }

    // If a piece is selected and clicking on valid destination
    if (gameState.selectedPoint !== null) {
      if (gameState.validMoves.includes(pointIndex)) {
        // Make the move
        const result = applyMove(
          gameState.points,
          gameState.selectedPoint,
          pointIndex,
          "white",
          gameState.remainingMoves,
          gameState.whiteBar,
          gameState.blackBar,
          gameState.whiteBorneOff,
          gameState.blackBorneOff
        );

        // Check for win
        if (result.whiteBorneOff === 15) {
          setGameState(prev => ({
            ...prev,
            ...result,
            status: "won",
            selectedPoint: null,
            validMoves: [],
          }));
          return;
        }

        // Check if more moves available
        const newMovable = getMovablePoints(
          result.points, "white", result.remainingMoves,
          result.whiteBar, result.blackBar,
          result.whiteBorneOff, result.blackBorneOff
        );

        if (result.remainingMoves.length === 0 || newMovable.length === 0) {
          // Turn ends, switch to black
          setGameState(prev => ({
            ...prev,
            ...result,
            currentPlayer: "black",
            selectedPoint: null,
            validMoves: [],
            mustRoll: true,
            dice: [0, 0],
          }));
        } else {
          setGameState(prev => ({
            ...prev,
            ...result,
            selectedPoint: null,
            validMoves: newMovable,
          }));
        }
      } else {
        // Deselect
        const movablePoints = getMovablePoints(
          gameState.points, "white", gameState.remainingMoves,
          gameState.whiteBar, gameState.blackBar,
          gameState.whiteBorneOff, gameState.blackBorneOff
        );
        setGameState(prev => ({
          ...prev,
          selectedPoint: null,
          validMoves: movablePoints,
        }));
      }
    }
  }, [gameState]);

  // AI turn
  useEffect(() => {
    if (
      gameState.status !== "playing" ||
      gameState.currentPlayer !== "black" ||
      aiThinkingRef.current
    ) {
      return;
    }

    aiThinkingRef.current = true;

    const timeout = setTimeout(async () => {
      // Roll dice for AI
      const dice = rollDice();
      let moves = getMovesFromDice(dice);
      let points = gameState.points;
      let whiteBar = gameState.whiteBar;
      let blackBar = gameState.blackBar;
      let whiteBorneOff = gameState.whiteBorneOff;
      let blackBorneOff = gameState.blackBorneOff;

      setGameState(prev => ({
        ...prev,
        dice,
        mustRoll: false,
      }));

      await new Promise(r => setTimeout(r, 500));

      // Make AI moves
      while (moves.length > 0) {
        const move = chooseAIMove(points, "black", moves, whiteBar, blackBar, whiteBorneOff, blackBorneOff, gameState.difficulty);
        if (!move) break;

        const result = applyMove(points, move.from, move.to, "black", moves, whiteBar, blackBar, whiteBorneOff, blackBorneOff);
        points = result.points;
        moves = result.remainingMoves;
        whiteBar = result.whiteBar;
        blackBar = result.blackBar;
        whiteBorneOff = result.whiteBorneOff;
        blackBorneOff = result.blackBorneOff;

        setGameState(prev => ({
          ...prev,
          points,
          whiteBar,
          blackBar,
          whiteBorneOff,
          blackBorneOff,
          remainingMoves: moves,
        }));

        await new Promise(r => setTimeout(r, 400));

        // Check for AI win
        if (blackBorneOff === 15) {
          setGameState(prev => ({
            ...prev,
            status: "lost",
          }));
          aiThinkingRef.current = false;
          return;
        }
      }

      // Switch to player
      setGameState(prev => ({
        ...prev,
        currentPlayer: "white",
        mustRoll: true,
        dice: [0, 0],
        remainingMoves: [],
        validMoves: [],
      }));

      aiThinkingRef.current = false;
    }, 500);

    return () => clearTimeout(timeout);
  }, [gameState.currentPlayer, gameState.status, gameState.difficulty, gameState.points, gameState.whiteBar, gameState.blackBar, gameState.whiteBorneOff, gameState.blackBorneOff]);

  // Skip turn if no moves available
  useEffect(() => {
    if (
      gameState.status === "playing" &&
      gameState.currentPlayer === "white" &&
      !gameState.mustRoll &&
      gameState.validMoves.length === 0 &&
      gameState.remainingMoves.length > 0
    ) {
      // No valid moves, pass turn
      const timeout = setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayer: "black",
          mustRoll: true,
          dice: [0, 0],
          remainingMoves: [],
        }));
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [gameState]);

  const difficultyInfo = DIFFICULTY_LABELS[gameState.difficulty];

  // Render a point (triangle)
  const renderPoint = (index: number, isTop: boolean) => {
    const point = gameState.points[index];
    const isSelected = gameState.selectedPoint === index;
    const isValidMove = gameState.validMoves.includes(index);
    const isEven = index % 2 === 0;

    return (
      <div
        key={index}
        className={`relative flex-1 h-full flex ${isTop ? "flex-col" : "flex-col-reverse"} items-center cursor-pointer ${
          isValidMove ? "ring-2 ring-green-500 ring-inset" : ""
        } ${isSelected ? "ring-2 ring-yellow-400 ring-inset" : ""}`}
        onClick={() => handlePointClick(index)}
      >
        {/* Triangle */}
        <div
          className={`w-full ${isTop ? "h-3/4" : "h-3/4"} ${
            isEven
              ? "bg-gradient-to-b from-amber-800 to-amber-900"
              : "bg-gradient-to-b from-amber-600 to-amber-700"
          }`}
          style={{
            clipPath: isTop
              ? "polygon(50% 100%, 0% 0%, 100% 0%)"
              : "polygon(50% 0%, 0% 100%, 100% 100%)",
          }}
        />
        
        {/* Pieces */}
        <div className={`absolute ${isTop ? "top-0" : "bottom-0"} left-1/2 -translate-x-1/2 flex ${isTop ? "flex-col" : "flex-col-reverse"} gap-0.5`}>
          {Array(Math.min(point.count, 5)).fill(null).map((_, i) => (
            <div
              key={i}
              className={`w-6 h-6 md:w-7 md:h-7 rounded-full border-2 ${
                point.player === "white"
                  ? "bg-gradient-to-br from-gray-100 to-gray-300 border-gray-400"
                  : "bg-gradient-to-br from-gray-700 to-gray-900 border-gray-600"
              }`}
            >
              {i === Math.min(point.count, 5) - 1 && point.count > 5 && (
                <span className="text-xs font-bold flex items-center justify-center h-full">
                  {point.count}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] py-8">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/games/board" className="text-[var(--muted-foreground)] hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-heading">Backgammon</h1>
              {gameState.status === "playing" && (
                <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <span>{difficultyInfo.icon}</span>
                  <span>{difficultyInfo.label}</span>
                </div>
              )}
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowSetupModal(true)}>
            New Game
          </Button>
        </div>

        {/* Game Board */}
        <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] rounded-xl p-4">
          {gameState.status === "idle" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="text-6xl mb-6">🎲</div>
              <h2 className="text-2xl font-heading mb-4">Backgammon</h2>
              <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                Roll the dice and race your pieces home! Bear off all 15 pieces to win.
              </p>
              <Button variant="primary" size="lg" onClick={() => setShowSetupModal(true)}>
                Start Game
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Status */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-400" />
                  <span className="text-sm">You: {gameState.whiteBorneOff}/15</span>
                </div>
                <div className="flex items-center gap-2">
                  {gameState.dice[0] > 0 && (
                    <div className="flex gap-1">
                      {gameState.dice.map((die, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 bg-white rounded flex items-center justify-center text-lg font-bold text-black ${
                            gameState.remainingMoves.includes(die) ? "" : "opacity-30"
                          }`}
                        >
                          {die}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">AI: {gameState.blackBorneOff}/15</span>
                  <div className="w-5 h-5 rounded-full bg-gray-800 border-2 border-gray-600" />
                </div>
              </div>

              {/* Board */}
              <div className="bg-amber-950 rounded-lg p-2 overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Top half (points 13-24) */}
                  <div className="flex h-32 md:h-40 gap-0.5">
                    {/* Points 13-18 */}
                    <div className="flex flex-1 gap-0.5">
                      {[13, 14, 15, 16, 17, 18].map(i => renderPoint(i, true))}
                    </div>
                    {/* Bar */}
                    <div className="w-8 bg-amber-950 flex flex-col items-center justify-center gap-1">
                      {Array(gameState.whiteBar).fill(null).map((_, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full bg-white border border-gray-300 cursor-pointer"
                          onClick={() => handlePointClick(0)}
                        />
                      ))}
                    </div>
                    {/* Points 19-24 */}
                    <div className="flex flex-1 gap-0.5">
                      {[19, 20, 21, 22, 23, 24].map(i => renderPoint(i, true))}
                    </div>
                  </div>

                  {/* Middle divider */}
                  <div className="h-4 bg-amber-900" />

                  {/* Bottom half (points 12-1) */}
                  <div className="flex h-32 md:h-40 gap-0.5">
                    {/* Points 12-7 */}
                    <div className="flex flex-1 gap-0.5">
                      {[12, 11, 10, 9, 8, 7].map(i => renderPoint(i, false))}
                    </div>
                    {/* Bar */}
                    <div className="w-8 bg-amber-950 flex flex-col items-center justify-center gap-1">
                      {Array(gameState.blackBar).fill(null).map((_, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full bg-gray-800 border border-gray-600"
                        />
                      ))}
                    </div>
                    {/* Points 6-1 */}
                    <div className="flex flex-1 gap-0.5">
                      {[6, 5, 4, 3, 2, 1].map(i => renderPoint(i, false))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-4 flex justify-center gap-4">
                {gameState.currentPlayer === "white" && gameState.mustRoll && (
                  <Button variant="primary" onClick={handleRollDice}>
                    Roll Dice
                  </Button>
                )}
                {gameState.currentPlayer === "black" && (
                  <div className="text-[var(--muted-foreground)]">AI is thinking...</div>
                )}
                {gameState.currentPlayer === "white" && !gameState.mustRoll && gameState.validMoves.length === 0 && (
                  <div className="text-[var(--muted-foreground)]">No valid moves - passing turn...</div>
                )}
              </div>

              {/* Hints */}
              <div className="mt-2 text-center text-sm text-[var(--muted-foreground)]">
                {gameState.currentPlayer === "white" && !gameState.mustRoll && gameState.validMoves.length > 0 && !gameState.selectedPoint && (
                  <p>Click a highlighted piece to move it</p>
                )}
                {gameState.selectedPoint !== null && (
                  <p>Click a highlighted destination to move, or click elsewhere to cancel</p>
                )}
              </div>
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
                <h2 className="text-xl font-heading mb-4 text-center">Choose Difficulty</h2>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((diff) => {
                    const info = DIFFICULTY_LABELS[diff];
                    return (
                      <button
                        key={diff}
                        className="p-4 bg-[var(--color-dark-3)]/50 hover:bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg transition-colors text-center"
                        onClick={() => startGame(diff)}
                      >
                        <span className="text-3xl mb-2 block">{info.icon}</span>
                        <div className="font-medium">{info.label}</div>
                      </button>
                    );
                  })}
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

        {/* Win/Loss Modal */}
        <AnimatePresence>
          {(gameState.status === "won" || gameState.status === "lost") && (
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
                  {gameState.status === "won" ? "🎉" : "😔"}
                </motion.div>
                <h2 className="text-2xl font-heading mb-2">
                  {gameState.status === "won" ? "You Win!" : "You Lose!"}
                </h2>
                <p className="text-[var(--muted-foreground)] mb-6">
                  {gameState.status === "won" 
                    ? "You bore off all your pieces!" 
                    : "The AI bore off all its pieces first."}
                </p>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">What would you like to do?</p>
                <div className="flex flex-col gap-3">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      setGameState(prev => ({ ...prev, status: "idle" }));
                      setShowSetupModal(true);
                    }}
                  >
                    Change Difficulty
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => startGame(gameState.difficulty)}
                  >
                    Play Again
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setGameState(prev => ({ ...prev, status: "idle" }))}
                  >
                    Main Menu
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

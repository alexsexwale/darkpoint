"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Confetti from "react-confetti";
import { Button } from "@/components/ui";

type Difficulty = "easy" | "medium" | "hard" | "master";
type Player = "black" | "white";
type Cell = Player | null;
type GameStatus = "idle" | "playing" | "won" | "lost" | "draw";

const BOARD_SIZE = 8;
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],          [0, 1],
  [1, -1],  [1, 0], [1, 1],
];

// Position weights for evaluation (corners and edges are valuable)
const POSITION_WEIGHTS = [
  [100, -20, 10, 5, 5, 10, -20, 100],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [10, -2, 1, 1, 1, 1, -2, 10],
  [5, -2, 1, 0, 0, 1, -2, 5],
  [5, -2, 1, 0, 0, 1, -2, 5],
  [10, -2, 1, 1, 1, 1, -2, 10],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [100, -20, 10, 5, 5, 10, -20, 100],
];

interface GameState {
  board: Cell[][];
  currentPlayer: Player;
  status: GameStatus;
  difficulty: Difficulty;
  validMoves: [number, number][];
  blackCount: number;
  whiteCount: number;
  moveHistory: { board: Cell[][]; currentPlayer: Player }[];
  lastMove: [number, number] | null;
}

// Create initial board
const createInitialBoard = (): Cell[][] => {
  const board: Cell[][] = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  // Starting position
  board[3][3] = "white";
  board[3][4] = "black";
  board[4][3] = "black";
  board[4][4] = "white";
  return board;
};

// Check if position is valid
const isValidPos = (row: number, col: number): boolean => {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
};

// Get pieces that would be flipped for a move
const getFlippedPieces = (board: Cell[][], row: number, col: number, player: Player): [number, number][] => {
  if (board[row][col] !== null) return [];
  
  const opponent = player === "black" ? "white" : "black";
  const flipped: [number, number][] = [];

  for (const [dr, dc] of DIRECTIONS) {
    const toFlip: [number, number][] = [];
    let r = row + dr;
    let c = col + dc;

    // Find opponent pieces in this direction
    while (isValidPos(r, c) && board[r][c] === opponent) {
      toFlip.push([r, c]);
      r += dr;
      c += dc;
    }

    // If we found our own piece at the end, these pieces can be flipped
    if (toFlip.length > 0 && isValidPos(r, c) && board[r][c] === player) {
      flipped.push(...toFlip);
    }
  }

  return flipped;
};

// Get all valid moves for a player
const getValidMoves = (board: Cell[][], player: Player): [number, number][] => {
  const moves: [number, number][] = [];
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (getFlippedPieces(board, row, col, player).length > 0) {
        moves.push([row, col]);
      }
    }
  }
  
  return moves;
};

// Apply a move to the board
const applyMove = (board: Cell[][], row: number, col: number, player: Player): Cell[][] => {
  const newBoard = board.map(r => [...r]);
  const flipped = getFlippedPieces(board, row, col, player);
  
  newBoard[row][col] = player;
  for (const [r, c] of flipped) {
    newBoard[r][c] = player;
  }
  
  return newBoard;
};

// Count pieces
const countPieces = (board: Cell[][]): { black: number; white: number } => {
  let black = 0, white = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === "black") black++;
      else if (cell === "white") white++;
    }
  }
  return { black, white };
};

// Evaluate board position
const evaluateBoard = (board: Cell[][], player: Player): number => {
  const opponent = player === "black" ? "white" : "black";
  let score = 0;

  // Position-based scoring
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === player) {
        score += POSITION_WEIGHTS[row][col];
      } else if (board[row][col] === opponent) {
        score -= POSITION_WEIGHTS[row][col];
      }
    }
  }

  // Mobility (number of valid moves)
  const playerMoves = getValidMoves(board, player).length;
  const opponentMoves = getValidMoves(board, opponent).length;
  score += (playerMoves - opponentMoves) * 5;

  return score;
};

// Minimax with alpha-beta pruning
const minimax = (
  board: Cell[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiPlayer: Player
): { score: number; move: [number, number] | null } => {
  const currentPlayer = maximizing ? aiPlayer : (aiPlayer === "black" ? "white" : "black");
  const moves = getValidMoves(board, currentPlayer);

  if (depth === 0 || moves.length === 0) {
    // Check if game is over
    const opponentMoves = getValidMoves(board, currentPlayer === "black" ? "white" : "black");
    if (moves.length === 0 && opponentMoves.length === 0) {
      const { black, white } = countPieces(board);
      const aiCount = aiPlayer === "black" ? black : white;
      const oppCount = aiPlayer === "black" ? white : black;
      if (aiCount > oppCount) return { score: 10000, move: null };
      if (aiCount < oppCount) return { score: -10000, move: null };
      return { score: 0, move: null };
    }
    return { score: evaluateBoard(board, aiPlayer), move: null };
  }

  if (maximizing) {
    let best = { score: -Infinity, move: moves[0] as [number, number] | null };
    for (const [row, col] of moves) {
      const newBoard = applyMove(board, row, col, currentPlayer);
      const result = minimax(newBoard, depth - 1, alpha, beta, false, aiPlayer);
      if (result.score > best.score) {
        best = { score: result.score, move: [row, col] };
      }
      alpha = Math.max(alpha, result.score);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = { score: Infinity, move: moves[0] as [number, number] | null };
    for (const [row, col] of moves) {
      const newBoard = applyMove(board, row, col, currentPlayer);
      const result = minimax(newBoard, depth - 1, alpha, beta, true, aiPlayer);
      if (result.score < best.score) {
        best = { score: result.score, move: [row, col] };
      }
      beta = Math.min(beta, result.score);
      if (beta <= alpha) break;
    }
    return best;
  }
};

// AI move selection
const chooseAIMove = (board: Cell[][], player: Player, difficulty: Difficulty): [number, number] | null => {
  const moves = getValidMoves(board, player);
  if (moves.length === 0) return null;

  switch (difficulty) {
    case "easy":
      return moves[Math.floor(Math.random() * moves.length)];

    case "medium": {
      // Prefer corners, then maximize flips
      const corners = moves.filter(([r, c]) => 
        (r === 0 || r === 7) && (c === 0 || c === 7)
      );
      if (corners.length > 0) return corners[0];

      // Maximize flipped pieces
      let best = moves[0];
      let bestFlips = 0;
      for (const [row, col] of moves) {
        const flips = getFlippedPieces(board, row, col, player).length;
        if (flips > bestFlips) {
          bestFlips = flips;
          best = [row, col];
        }
      }
      return best;
    }

    case "hard":
      return minimax(board, 4, -Infinity, Infinity, true, player).move;

    case "master":
      return minimax(board, 6, -Infinity, Infinity, true, player).move;
  }
};

const DIFFICULTY_LABELS: Record<Difficulty, { label: string; color: string; icon: string }> = {
  easy: { label: "Easy", color: "bg-green-500", icon: "🌱" },
  medium: { label: "Medium", color: "bg-yellow-500", icon: "🎯" },
  hard: { label: "Hard", color: "bg-orange-500", icon: "🔥" },
  master: { label: "Master", color: "bg-red-500", icon: "👑" },
};

export function ReversiGame() {
  const [gameState, setGameState] = useState<GameState>({
    board: createInitialBoard(),
    currentPlayer: "black",
    status: "idle",
    difficulty: "medium",
    validMoves: [],
    blackCount: 2,
    whiteCount: 2,
    moveHistory: [],
    lastMove: null,
  });

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showWinConfetti, setShowWinConfetti] = useState(false);
  const [confettiSize, setConfettiSize] = useState({ width: 0, height: 0 });
  const aiThinkingRef = useRef(false);

  // Confetti when user wins
  useEffect(() => {
    if (gameState.status === "won") {
      setConfettiSize({ width: typeof window !== "undefined" ? window.innerWidth : 0, height: typeof window !== "undefined" ? window.innerHeight : 0 });
      setShowWinConfetti(true);
    }
  }, [gameState.status]);

  useEffect(() => {
    if (!showWinConfetti) return;
    const t = setTimeout(() => setShowWinConfetti(false), 5000);
    return () => clearTimeout(t);
  }, [showWinConfetti]);

  // Start game
  const startGame = useCallback((difficulty: Difficulty) => {
    const board = createInitialBoard();
    const moves = getValidMoves(board, "black");
    setGameState({
      board,
      currentPlayer: "black",
      status: "playing",
      difficulty,
      validMoves: moves,
      blackCount: 2,
      whiteCount: 2,
      moveHistory: [],
      lastMove: null,
    });
    setShowSetupModal(false);
  }, []);

  // Handle cell click
  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameState.status !== "playing" || gameState.currentPlayer !== "black") return;
    if (!gameState.validMoves.some(([r, c]) => r === row && c === col)) return;

    const newBoard = applyMove(gameState.board, row, col, "black");
    const { black, white } = countPieces(newBoard);
    
    // Check next player's moves
    let nextPlayer: Player = "white";
    let nextMoves = getValidMoves(newBoard, "white");
    
    // If white has no moves, black plays again
    if (nextMoves.length === 0) {
      nextMoves = getValidMoves(newBoard, "black");
      nextPlayer = "black";
    }

    // Check for game end
    let status: GameStatus = "playing";
    if (nextMoves.length === 0) {
      // Game over
      if (black > white) status = "won";
      else if (white > black) status = "lost";
      else status = "draw";
    }

    setGameState(prev => ({
      ...prev,
      board: newBoard,
      currentPlayer: nextPlayer,
      validMoves: nextMoves,
      blackCount: black,
      whiteCount: white,
      status,
      moveHistory: [...prev.moveHistory, { board: prev.board, currentPlayer: prev.currentPlayer }],
      lastMove: [row, col],
    }));
  }, [gameState]);

  // AI turn
  useEffect(() => {
    if (
      gameState.status !== "playing" ||
      gameState.currentPlayer !== "white" ||
      aiThinkingRef.current
    ) {
      return;
    }

    aiThinkingRef.current = true;

    const timeout = setTimeout(() => {
      const move = chooseAIMove(gameState.board, "white", gameState.difficulty);
      
      if (!move) {
        // Pass turn back to black
        const blackMoves = getValidMoves(gameState.board, "black");
        if (blackMoves.length === 0) {
          // Game over
          const { black, white } = countPieces(gameState.board);
          setGameState(prev => ({
            ...prev,
            status: black > white ? "won" : white > black ? "lost" : "draw",
          }));
        } else {
          setGameState(prev => ({
            ...prev,
            currentPlayer: "black",
            validMoves: blackMoves,
          }));
        }
        aiThinkingRef.current = false;
        return;
      }

      const [row, col] = move;
      const newBoard = applyMove(gameState.board, row, col, "white");
      const { black, white } = countPieces(newBoard);

      // Check next player's moves
      let nextPlayer: Player = "black";
      let nextMoves = getValidMoves(newBoard, "black");

      if (nextMoves.length === 0) {
        nextMoves = getValidMoves(newBoard, "white");
        nextPlayer = "white";
      }

      let status: GameStatus = "playing";
      if (nextMoves.length === 0) {
        if (black > white) status = "won";
        else if (white > black) status = "lost";
        else status = "draw";
      }

      setGameState(prev => ({
        ...prev,
        board: newBoard,
        currentPlayer: nextPlayer,
        validMoves: nextMoves,
        blackCount: black,
        whiteCount: white,
        status,
        moveHistory: [...prev.moveHistory, { board: prev.board, currentPlayer: prev.currentPlayer }],
        lastMove: [row, col],
      }));

      aiThinkingRef.current = false;
    }, 500);

    return () => clearTimeout(timeout);
  }, [gameState]);

  // Undo move
  const undoMove = useCallback(() => {
    if (gameState.moveHistory.length < 2) return;

    const history = gameState.moveHistory.slice(0, -2);
    const lastState = history[history.length - 1] || { 
      board: createInitialBoard(), 
      currentPlayer: "black" as Player 
    };
    const { black, white } = countPieces(lastState.board);
    const moves = getValidMoves(lastState.board, lastState.currentPlayer);

    setGameState(prev => ({
      ...prev,
      board: lastState.board,
      currentPlayer: lastState.currentPlayer,
      validMoves: moves,
      blackCount: black,
      whiteCount: white,
      moveHistory: history,
      lastMove: null,
    }));
  }, [gameState.moveHistory]);

  const difficultyInfo = DIFFICULTY_LABELS[gameState.difficulty];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] py-8 relative">
      <div className="container max-w-2xl">
        {/* Header - stack on mobile so title and buttons don't squash */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/games/board" className="text-[var(--muted-foreground)] hover:text-white transition-colors flex-shrink-0" aria-label="Back to board games">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-heading truncate">Reversi</h1>
              {gameState.status === "playing" && (
                <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <span>{difficultyInfo.icon}</span>
                  <span>{difficultyInfo.label}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
            {gameState.status === "playing" && (
              <Button variant="outline" size="sm" onClick={undoMove} disabled={gameState.moveHistory.length < 2}>
                Undo
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => setShowSetupModal(true)}>
              New Game
            </Button>
          </div>
        </div>

        {/* Game Board */}
        <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] rounded-xl p-4 md:p-6">
          {gameState.status === "idle" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="text-6xl mb-6">⚫⚪</div>
              <h2 className="text-2xl font-heading mb-4">Reversi / Othello</h2>
              <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                Flip your opponent&apos;s pieces by surrounding them. The player with the most pieces wins!
              </p>
              <Button variant="primary" size="lg" onClick={() => setShowSetupModal(true)}>
                Start Game
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Score */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-700" />
                  <span className="font-medium">You: {gameState.blackCount}</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm ${
                  gameState.currentPlayer === "black"
                    ? "bg-slate-700/50 text-white"
                    : "bg-white/20 text-white"
                }`}>
                  {gameState.currentPlayer === "black" ? "Your Turn" : "AI Thinking..."}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">AI: {gameState.whiteCount}</span>
                  <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-300" />
                </div>
              </div>

              {/* Board */}
              <div className="flex justify-center">
                <div className="bg-green-700 p-1 rounded-lg shadow-xl">
                  <div className="grid grid-cols-8 gap-0.5">
                    {gameState.board.map((row, rowIdx) =>
                      row.map((cell, colIdx) => {
                        const isValidMove = gameState.validMoves.some(
                          ([r, c]) => r === rowIdx && c === colIdx
                        );
                        const isLastMove = gameState.lastMove && 
                          gameState.lastMove[0] === rowIdx && 
                          gameState.lastMove[1] === colIdx;

                        return (
                          <div
                            key={`${rowIdx}-${colIdx}`}
                            className={`w-9 h-9 md:w-11 md:h-11 bg-green-600 flex items-center justify-center cursor-pointer transition-colors ${
                              isValidMove && gameState.currentPlayer === "black" 
                                ? "hover:bg-green-500" 
                                : ""
                            } ${isLastMove ? "ring-2 ring-yellow-400 ring-inset" : ""}`}
                            onClick={() => handleCellClick(rowIdx, colIdx)}
                          >
                            {cell && (
                              <motion.div
                                initial={{ scale: 0, rotateY: 180 }}
                                animate={{ scale: 1, rotateY: 0 }}
                                transition={{ type: "spring", damping: 15 }}
                                className={`w-7 h-7 md:w-9 md:h-9 rounded-full shadow-md ${
                                  cell === "black"
                                    ? "bg-gradient-to-br from-slate-700 to-slate-900"
                                    : "bg-gradient-to-br from-white to-gray-200"
                                }`}
                              />
                            )}
                            {isValidMove && !cell && gameState.currentPlayer === "black" && (
                              <div className="w-3 h-3 rounded-full bg-green-400/50" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Hints */}
              <div className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
                {gameState.currentPlayer === "black" && gameState.status === "playing" && (
                  <p>Click a highlighted square to place your piece</p>
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

        {/* Win/Loss/Draw Modal */}
        <AnimatePresence>
          {(gameState.status === "won" || gameState.status === "lost" || gameState.status === "draw") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
              {showWinConfetti && confettiSize.width > 0 && confettiSize.height > 0 && (
                <div className="absolute inset-0 pointer-events-none z-[1]">
                  <Confetti
                    width={confettiSize.width}
                    height={confettiSize.height}
                    recycle={false}
                    numberOfPieces={200}
                    colors={["#e87b35", "#22c55e", "#fbbf24", "#a855f7", "#ec4899"]}
                    style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
                  />
                </div>
              )}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative z-[2] bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-8 max-w-md w-full text-center"
              >
                <motion.div
                  className="text-6xl mb-4"
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, repeat: 3 }}
                >
                  {gameState.status === "won" ? "🎉" : gameState.status === "lost" ? "😔" : "🤝"}
                </motion.div>
                <h2 className="text-2xl font-heading mb-2">
                  {gameState.status === "won" && "You Win!"}
                  {gameState.status === "lost" && "You Lose!"}
                  {gameState.status === "draw" && "It's a Draw!"}
                </h2>
                <p className="text-[var(--muted-foreground)] mb-2">
                  Final Score: You {gameState.blackCount} - {gameState.whiteCount} AI
                </p>
                <p className="text-[var(--muted-foreground)] mb-6 text-sm">
                  {gameState.status === "won" && "You controlled more of the board!"}
                  {gameState.status === "lost" && "The AI outmaneuvered you this time."}
                  {gameState.status === "draw" && "An evenly matched game!"}
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

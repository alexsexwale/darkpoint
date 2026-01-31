"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";

type Difficulty = "easy" | "medium" | "hard" | "master";
type Player = "red" | "yellow";
type Cell = Player | null;
type GameStatus = "idle" | "playing" | "won" | "lost" | "draw";

const ROWS = 6;
const COLS = 7;

interface GameState {
  board: Cell[][];
  currentPlayer: Player;
  status: GameStatus;
  difficulty: Difficulty;
  winningCells: [number, number][];
  moveHistory: Cell[][][];
}

// Create empty board
const createEmptyBoard = (): Cell[][] => {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
};

// Check for winner
const checkWinner = (board: Cell[][]): { winner: Player | null; cells: [number, number][] } => {
  // Check horizontal
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const cell = board[row][col];
      if (cell && 
          cell === board[row][col + 1] && 
          cell === board[row][col + 2] && 
          cell === board[row][col + 3]) {
        return { 
          winner: cell, 
          cells: [[row, col], [row, col + 1], [row, col + 2], [row, col + 3]] 
        };
      }
    }
  }

  // Check vertical
  for (let row = 0; row <= ROWS - 4; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = board[row][col];
      if (cell && 
          cell === board[row + 1][col] && 
          cell === board[row + 2][col] && 
          cell === board[row + 3][col]) {
        return { 
          winner: cell, 
          cells: [[row, col], [row + 1, col], [row + 2, col], [row + 3, col]] 
        };
      }
    }
  }

  // Check diagonal (down-right)
  for (let row = 0; row <= ROWS - 4; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const cell = board[row][col];
      if (cell && 
          cell === board[row + 1][col + 1] && 
          cell === board[row + 2][col + 2] && 
          cell === board[row + 3][col + 3]) {
        return { 
          winner: cell, 
          cells: [[row, col], [row + 1, col + 1], [row + 2, col + 2], [row + 3, col + 3]] 
        };
      }
    }
  }

  // Check diagonal (up-right)
  for (let row = 3; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const cell = board[row][col];
      if (cell && 
          cell === board[row - 1][col + 1] && 
          cell === board[row - 2][col + 2] && 
          cell === board[row - 3][col + 3]) {
        return { 
          winner: cell, 
          cells: [[row, col], [row - 1, col + 1], [row - 2, col + 2], [row - 3, col + 3]] 
        };
      }
    }
  }

  return { winner: null, cells: [] };
};

// Check if board is full
const isBoardFull = (board: Cell[][]): boolean => {
  return board[0].every(cell => cell !== null);
};

// Get valid columns (not full)
const getValidColumns = (board: Cell[][]): number[] => {
  return board[0].map((cell, col) => cell === null ? col : -1).filter(col => col !== -1);
};

// Drop piece in column, return new board and row where it landed
const dropPiece = (board: Cell[][], col: number, player: Player): { board: Cell[][]; row: number } | null => {
  const newBoard = board.map(r => [...r]);
  
  for (let row = ROWS - 1; row >= 0; row--) {
    if (!newBoard[row][col]) {
      newBoard[row][col] = player;
      return { board: newBoard, row };
    }
  }
  
  return null;
};

// Evaluate position for AI
const evaluateWindow = (window: Cell[], player: Player): number => {
  const opponent = player === "red" ? "yellow" : "red";
  const playerCount = window.filter(c => c === player).length;
  const opponentCount = window.filter(c => c === opponent).length;
  const emptyCount = window.filter(c => c === null).length;

  if (playerCount === 4) return 100;
  if (playerCount === 3 && emptyCount === 1) return 5;
  if (playerCount === 2 && emptyCount === 2) return 2;
  if (opponentCount === 3 && emptyCount === 1) return -4;
  
  return 0;
};

const evaluateBoard = (board: Cell[][], player: Player): number => {
  let score = 0;

  // Center column preference
  const centerCol = Math.floor(COLS / 2);
  const centerCount = board.filter(row => row[centerCol] === player).length;
  score += centerCount * 3;

  // Horizontal
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const window = [board[row][col], board[row][col + 1], board[row][col + 2], board[row][col + 3]];
      score += evaluateWindow(window, player);
    }
  }

  // Vertical
  for (let row = 0; row <= ROWS - 4; row++) {
    for (let col = 0; col < COLS; col++) {
      const window = [board[row][col], board[row + 1][col], board[row + 2][col], board[row + 3][col]];
      score += evaluateWindow(window, player);
    }
  }

  // Diagonal down-right
  for (let row = 0; row <= ROWS - 4; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const window = [board[row][col], board[row + 1][col + 1], board[row + 2][col + 2], board[row + 3][col + 3]];
      score += evaluateWindow(window, player);
    }
  }

  // Diagonal up-right
  for (let row = 3; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      const window = [board[row][col], board[row - 1][col + 1], board[row - 2][col + 2], board[row - 3][col + 3]];
      score += evaluateWindow(window, player);
    }
  }

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
): { score: number; col: number } => {
  const validCols = getValidColumns(board);
  const { winner } = checkWinner(board);
  const humanPlayer = aiPlayer === "red" ? "yellow" : "red";

  if (depth === 0 || validCols.length === 0 || winner) {
    if (winner === aiPlayer) return { score: 100000 + depth, col: -1 };
    if (winner === humanPlayer) return { score: -100000 - depth, col: -1 };
    if (validCols.length === 0) return { score: 0, col: -1 };
    return { score: evaluateBoard(board, aiPlayer), col: -1 };
  }

  if (maximizing) {
    let maxScore = -Infinity;
    let bestCol = validCols[0];
    
    for (const col of validCols) {
      const result = dropPiece(board, col, aiPlayer);
      if (!result) continue;
      
      const { score } = minimax(result.board, depth - 1, alpha, beta, false, aiPlayer);
      if (score > maxScore) {
        maxScore = score;
        bestCol = col;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    
    return { score: maxScore, col: bestCol };
  } else {
    let minScore = Infinity;
    let bestCol = validCols[0];
    
    for (const col of validCols) {
      const result = dropPiece(board, col, humanPlayer);
      if (!result) continue;
      
      const { score } = minimax(result.board, depth - 1, alpha, beta, true, aiPlayer);
      if (score < minScore) {
        minScore = score;
        bestCol = col;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    
    return { score: minScore, col: bestCol };
  }
};

// AI move selection
const chooseAIMove = (board: Cell[][], player: Player, difficulty: Difficulty): number => {
  const validCols = getValidColumns(board);
  if (validCols.length === 0) return -1;

  const opponent = player === "red" ? "yellow" : "red";

  switch (difficulty) {
    case "easy":
      return validCols[Math.floor(Math.random() * validCols.length)];

    case "medium": {
      // Check for winning move
      for (const col of validCols) {
        const result = dropPiece(board, col, player);
        if (result && checkWinner(result.board).winner === player) {
          return col;
        }
      }
      // Block opponent winning move
      for (const col of validCols) {
        const result = dropPiece(board, col, opponent);
        if (result && checkWinner(result.board).winner === opponent) {
          return col;
        }
      }
      // Prefer center
      if (validCols.includes(3)) return 3;
      return validCols[Math.floor(Math.random() * validCols.length)];
    }

    case "hard":
      return minimax(board, 4, -Infinity, Infinity, true, player).col;

    case "master":
      return minimax(board, 6, -Infinity, Infinity, true, player).col;
  }
};

const DIFFICULTY_LABELS: Record<Difficulty, { label: string; color: string; icon: string }> = {
  easy: { label: "Easy", color: "bg-green-500", icon: "🌱" },
  medium: { label: "Medium", color: "bg-yellow-500", icon: "🎯" },
  hard: { label: "Hard", color: "bg-orange-500", icon: "🔥" },
  master: { label: "Master", color: "bg-red-500", icon: "👑" },
};

export function ConnectFourGame() {
  const [gameState, setGameState] = useState<GameState>({
    board: createEmptyBoard(),
    currentPlayer: "red",
    status: "idle",
    difficulty: "medium",
    winningCells: [],
    moveHistory: [],
  });
  
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [hoverColumn, setHoverColumn] = useState<number | null>(null);
  const [lastDroppedCell, setLastDroppedCell] = useState<[number, number] | null>(null);
  const aiThinkingRef = useRef(false);

  // Start game
  const startGame = useCallback((difficulty: Difficulty) => {
    setGameState({
      board: createEmptyBoard(),
      currentPlayer: "red",
      status: "playing",
      difficulty,
      winningCells: [],
      moveHistory: [],
    });
    setShowSetupModal(false);
    setLastDroppedCell(null);
  }, []);

  // Handle column click
  const handleColumnClick = useCallback((col: number) => {
    if (gameState.status !== "playing" || gameState.currentPlayer !== "red") return;
    
    const result = dropPiece(gameState.board, col, "red");
    if (!result) return;

    setLastDroppedCell([result.row, col]);

    const { winner, cells } = checkWinner(result.board);
    const full = isBoardFull(result.board);

    setGameState(prev => ({
      ...prev,
      board: result.board,
      currentPlayer: winner || full ? prev.currentPlayer : "yellow",
      status: winner === "red" ? "won" : winner === "yellow" ? "lost" : full ? "draw" : "playing",
      winningCells: cells,
      moveHistory: [...prev.moveHistory, prev.board],
    }));
  }, [gameState]);

  // AI turn
  useEffect(() => {
    if (
      gameState.status !== "playing" ||
      gameState.currentPlayer !== "yellow" ||
      aiThinkingRef.current
    ) {
      return;
    }

    aiThinkingRef.current = true;

    const timeout = setTimeout(() => {
      const col = chooseAIMove(gameState.board, "yellow", gameState.difficulty);
      if (col === -1) {
        aiThinkingRef.current = false;
        return;
      }

      const result = dropPiece(gameState.board, col, "yellow");
      if (!result) {
        aiThinkingRef.current = false;
        return;
      }

      setLastDroppedCell([result.row, col]);

      const { winner, cells } = checkWinner(result.board);
      const full = isBoardFull(result.board);

      setGameState(prev => ({
        ...prev,
        board: result.board,
        currentPlayer: winner || full ? prev.currentPlayer : "red",
        status: winner === "red" ? "won" : winner === "yellow" ? "lost" : full ? "draw" : "playing",
        winningCells: cells,
        moveHistory: [...prev.moveHistory, prev.board],
      }));

      aiThinkingRef.current = false;
    }, 500);

    return () => clearTimeout(timeout);
  }, [gameState]);

  // Undo move
  const undoMove = useCallback(() => {
    if (gameState.moveHistory.length < 2) return;

    const history = gameState.moveHistory.slice(0, -2);
    const previousBoard = history[history.length - 1] || createEmptyBoard();

    setGameState(prev => ({
      ...prev,
      board: previousBoard,
      currentPlayer: "red",
      moveHistory: history,
      winningCells: [],
    }));
    setLastDroppedCell(null);
  }, [gameState.moveHistory]);

  const difficultyInfo = DIFFICULTY_LABELS[gameState.difficulty];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] py-8">
      <div className="container max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/games/board" className="text-[var(--muted-foreground)] hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-heading">Connect Four</h1>
              {gameState.status === "playing" && (
                <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <span>{difficultyInfo.icon}</span>
                  <span>{difficultyInfo.label}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              <div className="text-6xl mb-6">🔴</div>
              <h2 className="text-2xl font-heading mb-4">Connect Four</h2>
              <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                Drop your pieces to connect 4 in a row - horizontally, vertically, or diagonally!
              </p>
              <Button variant="primary" size="lg" onClick={() => setShowSetupModal(true)}>
                Start Game
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Turn indicator */}
              <div className="flex justify-center mb-4">
                <div className={`px-4 py-2 rounded-full text-sm ${
                  gameState.currentPlayer === "red"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {gameState.currentPlayer === "red" ? "Your Turn" : "AI Thinking..."}
                </div>
              </div>

              {/* Board */}
              <div className="flex justify-center">
                <div className="bg-blue-600 p-2 rounded-lg shadow-xl">
                  {/* Column hover indicators */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {Array(COLS).fill(null).map((_, col) => (
                      <div
                        key={col}
                        className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center"
                      >
                        {hoverColumn === col && gameState.currentPlayer === "red" && gameState.status === "playing" && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 0.5, y: 0 }}
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Board grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {gameState.board.map((row, rowIdx) =>
                      row.map((cell, colIdx) => {
                        const isWinning = gameState.winningCells.some(
                          ([r, c]) => r === rowIdx && c === colIdx
                        );
                        const isLastDropped = lastDroppedCell && 
                          lastDroppedCell[0] === rowIdx && 
                          lastDroppedCell[1] === colIdx;

                        return (
                          <div
                            key={`${rowIdx}-${colIdx}`}
                            className="w-10 h-10 md:w-12 md:h-12 bg-blue-700 rounded-full flex items-center justify-center cursor-pointer"
                            onClick={() => handleColumnClick(colIdx)}
                            onMouseEnter={() => setHoverColumn(colIdx)}
                            onMouseLeave={() => setHoverColumn(null)}
                          >
                            {cell && (
                              <motion.div
                                initial={isLastDropped ? { y: -200 } : { scale: 0 }}
                                animate={{ y: 0, scale: 1 }}
                                transition={isLastDropped ? { type: "spring", damping: 10 } : { duration: 0.2 }}
                                className={`w-8 h-8 md:w-10 md:h-10 rounded-full shadow-inner ${
                                  cell === "red"
                                    ? "bg-gradient-to-br from-red-400 to-red-600"
                                    : "bg-gradient-to-br from-yellow-300 to-yellow-500"
                                } ${isWinning ? "ring-4 ring-white" : ""}`}
                              />
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
                {gameState.currentPlayer === "red" && gameState.status === "playing" && (
                  <p>Click a column to drop your piece</p>
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
                  {gameState.status === "won" ? "🎉" : gameState.status === "lost" ? "😔" : "🤝"}
                </motion.div>
                <h2 className="text-2xl font-heading mb-2">
                  {gameState.status === "won" && "You Win!"}
                  {gameState.status === "lost" && "You Lose!"}
                  {gameState.status === "draw" && "It's a Draw!"}
                </h2>
                <p className="text-[var(--muted-foreground)] mb-6">
                  {gameState.status === "won" && "Congratulations! You connected four!"}
                  {gameState.status === "lost" && "The AI connected four. Try again!"}
                  {gameState.status === "draw" && "The board is full with no winner!"}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setGameState(prev => ({ ...prev, status: "idle" }))}
                  >
                    Menu
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => startGame(gameState.difficulty)}
                  >
                    Play Again
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

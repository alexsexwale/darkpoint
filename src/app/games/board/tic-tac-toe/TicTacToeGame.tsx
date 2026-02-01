"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";

type Difficulty = "easy" | "medium" | "hard" | "master";
type Player = "X" | "O";
type Cell = Player | null;
type GameStatus = "idle" | "playing" | "won" | "lost" | "draw";

interface GameState {
  board: Cell[];
  currentPlayer: Player;
  status: GameStatus;
  difficulty: Difficulty;
  winningLine: number[];
  moveHistory: Cell[][];
}

const WINNING_LINES = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 3, 6], // left column
  [1, 4, 7], // middle column
  [2, 5, 8], // right column
  [0, 4, 8], // diagonal
  [2, 4, 6], // anti-diagonal
];

// Create empty board
const createEmptyBoard = (): Cell[] => Array(9).fill(null);

// Check for winner
const checkWinner = (board: Cell[]): { winner: Player | null; line: number[] } => {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: [] };
};

// Check if board is full
const isBoardFull = (board: Cell[]): boolean => board.every(cell => cell !== null);

// Get empty cells
const getEmptyCells = (board: Cell[]): number[] => 
  board.map((cell, i) => cell === null ? i : -1).filter(i => i !== -1);

// Minimax for perfect play
const minimax = (board: Cell[], isMaximizing: boolean, aiPlayer: Player): { score: number; move: number } => {
  const humanPlayer = aiPlayer === "X" ? "O" : "X";
  const { winner } = checkWinner(board);
  
  if (winner === aiPlayer) return { score: 10, move: -1 };
  if (winner === humanPlayer) return { score: -10, move: -1 };
  if (isBoardFull(board)) return { score: 0, move: -1 };

  const emptyCells = getEmptyCells(board);
  
  if (isMaximizing) {
    let best = { score: -Infinity, move: emptyCells[0] };
    for (const cell of emptyCells) {
      const newBoard = [...board];
      newBoard[cell] = aiPlayer;
      const result = minimax(newBoard, false, aiPlayer);
      if (result.score > best.score) {
        best = { score: result.score, move: cell };
      }
    }
    return best;
  } else {
    let best = { score: Infinity, move: emptyCells[0] };
    for (const cell of emptyCells) {
      const newBoard = [...board];
      newBoard[cell] = humanPlayer;
      const result = minimax(newBoard, true, aiPlayer);
      if (result.score < best.score) {
        best = { score: result.score, move: cell };
      }
    }
    return best;
  }
};

// AI move selection
const chooseAIMove = (board: Cell[], player: Player, difficulty: Difficulty): number => {
  const emptyCells = getEmptyCells(board);
  if (emptyCells.length === 0) return -1;

  const opponent = player === "X" ? "O" : "X";

  switch (difficulty) {
    case "easy":
      // Random move
      return emptyCells[Math.floor(Math.random() * emptyCells.length)];

    case "medium": {
      // Check for winning move
      for (const cell of emptyCells) {
        const testBoard = [...board];
        testBoard[cell] = player;
        if (checkWinner(testBoard).winner === player) return cell;
      }
      // Block opponent winning move
      for (const cell of emptyCells) {
        const testBoard = [...board];
        testBoard[cell] = opponent;
        if (checkWinner(testBoard).winner === opponent) return cell;
      }
      // Take center if available
      if (emptyCells.includes(4)) return 4;
      // Take corner
      const corners = [0, 2, 6, 8].filter(c => emptyCells.includes(c));
      if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
      // Random
      return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }

    case "hard":
    case "master":
      // Perfect play with minimax
      return minimax(board, true, player).move;
  }
};

const DIFFICULTY_LABELS: Record<Difficulty, { label: string; color: string; icon: string }> = {
  easy: { label: "Easy", color: "bg-green-500", icon: "🌱" },
  medium: { label: "Medium", color: "bg-yellow-500", icon: "🎯" },
  hard: { label: "Hard", color: "bg-orange-500", icon: "🔥" },
  master: { label: "Master", color: "bg-red-500", icon: "👑" },
};

export function TicTacToeGame() {
  const [gameState, setGameState] = useState<GameState>({
    board: createEmptyBoard(),
    currentPlayer: "X",
    status: "idle",
    difficulty: "medium",
    winningLine: [],
    moveHistory: [],
  });

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [humanGoesFirst, setHumanGoesFirst] = useState(true); // Alternate after each game
  const aiThinkingRef = useRef(false);

  // Start game - alternate who goes first each time
  const startGame = useCallback((difficulty: Difficulty) => {
    const firstPlayer: Player = humanGoesFirst ? "X" : "O";
    setHumanGoesFirst(prev => !prev); // Flip for next game
    setGameState({
      board: createEmptyBoard(),
      currentPlayer: firstPlayer,
      status: "playing",
      difficulty,
      winningLine: [],
      moveHistory: [],
    });
    setShowSetupModal(false);
  }, [humanGoesFirst]);

  // Handle cell click
  const handleCellClick = useCallback((index: number) => {
    if (gameState.status !== "playing" || gameState.currentPlayer !== "X") return;
    if (gameState.board[index] !== null) return;

    const newBoard = [...gameState.board];
    newBoard[index] = "X";

    const { winner, line } = checkWinner(newBoard);
    const full = isBoardFull(newBoard);

    setGameState(prev => ({
      ...prev,
      board: newBoard,
      currentPlayer: winner || full ? prev.currentPlayer : "O",
      status: winner === "X" ? "won" : winner === "O" ? "lost" : full ? "draw" : "playing",
      winningLine: line,
      moveHistory: [...prev.moveHistory, prev.board],
    }));
  }, [gameState]);

  // AI turn
  useEffect(() => {
    if (
      gameState.status !== "playing" ||
      gameState.currentPlayer !== "O" ||
      aiThinkingRef.current
    ) {
      return;
    }

    aiThinkingRef.current = true;

    const timeout = setTimeout(() => {
      const move = chooseAIMove(gameState.board, "O", gameState.difficulty);
      if (move === -1) {
        aiThinkingRef.current = false;
        return;
      }

      const newBoard = [...gameState.board];
      newBoard[move] = "O";

      const { winner, line } = checkWinner(newBoard);
      const full = isBoardFull(newBoard);

      setGameState(prev => ({
        ...prev,
        board: newBoard,
        currentPlayer: winner || full ? prev.currentPlayer : "X",
        status: winner === "X" ? "won" : winner === "O" ? "lost" : full ? "draw" : "playing",
        winningLine: line,
        moveHistory: [...prev.moveHistory, prev.board],
      }));

      aiThinkingRef.current = false;
    }, 400);

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
      currentPlayer: "X",
      moveHistory: history,
      winningLine: [],
    }));
  }, [gameState.moveHistory]);

  const difficultyInfo = DIFFICULTY_LABELS[gameState.difficulty];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-dark-1)] to-[var(--color-dark-2)] py-8">
      <div className="container max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/games/board" className="text-[var(--muted-foreground)] hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-heading">Tic-Tac-Toe</h1>
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
        <div className="bg-[var(--color-dark-2)]/50 backdrop-blur border border-[var(--color-dark-3)] rounded-xl p-6">
          {gameState.status === "idle" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-6">❌⭕</div>
              <h2 className="text-2xl font-heading mb-4">Tic-Tac-Toe</h2>
              <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                The classic game! Get three in a row to win.
              </p>
              <Button variant="primary" size="lg" onClick={() => setShowSetupModal(true)}>
                Start Game
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Turn indicator */}
              <div className="flex justify-center mb-6">
                <div className={`px-4 py-2 rounded-full text-sm ${
                  gameState.currentPlayer === "X"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-pink-500/20 text-pink-400"
                }`}>
                  {gameState.currentPlayer === "X" ? "Your Turn (X)" : "AI Thinking (O)..."}
                </div>
              </div>

              {/* Board */}
              <div className="flex justify-center">
                <div className="grid grid-cols-3 gap-2 p-2 bg-[var(--color-dark-3)]/50 rounded-lg">
                  {gameState.board.map((cell, index) => {
                    const isWinning = gameState.winningLine.includes(index);
                    
                    return (
                      <button
                        key={index}
                        className={`w-20 h-20 md:w-24 md:h-24 bg-[var(--color-dark-2)] rounded-lg flex items-center justify-center text-4xl md:text-5xl font-bold transition-all ${
                          !cell && gameState.currentPlayer === "X" && gameState.status === "playing"
                            ? "hover:bg-[var(--color-dark-3)] cursor-pointer"
                            : ""
                        } ${isWinning ? "ring-4 ring-green-500" : ""}`}
                        onClick={() => handleCellClick(index)}
                        disabled={!!cell || gameState.status !== "playing"}
                      >
                        {cell && (
                          <motion.span
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className={cell === "X" ? "text-blue-400" : "text-pink-400"}
                          >
                            {cell === "X" ? "✕" : "○"}
                          </motion.span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Info */}
              <div className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
                <p>You are X, AI is O</p>
                {gameState.moveHistory.length === 0 && (
                  <p className="mt-1 text-xs opacity-80">
                    {gameState.currentPlayer === "X" ? "You go first this game" : "AI goes first this game"}
                  </p>
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
                <p className="text-sm text-[var(--muted-foreground)] text-center mb-4">
                  Note: Hard and Master use perfect play - draws are expected!
                </p>
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
                  {gameState.status === "won" && "You got three in a row!"}
                  {gameState.status === "lost" && "The AI got three in a row!"}
                  {gameState.status === "draw" && "No one wins this round!"}
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

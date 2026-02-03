"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Confetti from "react-confetti";
import { Button } from "@/components/ui";

type Difficulty = "easy" | "medium" | "hard" | "master";
type Player = "red" | "black";
type PieceType = "normal" | "king";
type GameStatus = "idle" | "playing" | "won" | "lost" | "draw";

interface Piece {
  player: Player;
  type: PieceType;
}

interface Position {
  row: number;
  col: number;
}

interface Move {
  from: Position;
  to: Position;
  captures: Position[];
}

type Board = (Piece | null)[][];

interface GameState {
  board: Board;
  currentPlayer: Player;
  selectedPiece: Position | null;
  validMoves: Move[];
  status: GameStatus;
  difficulty: Difficulty;
  moveHistory: { board: Board; currentPlayer: Player }[];
  redPieces: number;
  blackPieces: number;
  movesWithoutCapture: number;
}

const BOARD_SIZE = 8;

// Create initial board
const createInitialBoard = (): Board => {
  const board: Board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  // Place black pieces (top)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { player: "black", type: "normal" };
      }
    }
  }
  
  // Place red pieces (bottom)
  for (let row = 5; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { player: "red", type: "normal" };
      }
    }
  }
  
  return board;
};

// Count pieces
const countPieces = (board: Board): { red: number; black: number } => {
  let red = 0, black = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece) {
        if (piece.player === "red") red++;
        else black++;
      }
    }
  }
  return { red, black };
};

// Get all valid moves for a player
const getValidMoves = (board: Board, player: Player): Move[] => {
  const moves: Move[] = [];
  const captureMoves: Move[] = [];
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && piece.player === player) {
        const pieceMoves = getMovesForPiece(board, { row, col }, piece);
        pieceMoves.forEach(move => {
          if (move.captures.length > 0) {
            captureMoves.push(move);
          } else {
            moves.push(move);
          }
        });
      }
    }
  }
  
  // Mandatory jumps - if captures available, must take them
  return captureMoves.length > 0 ? captureMoves : moves;
};

// Get moves for a specific piece
const getMovesForPiece = (board: Board, pos: Position, piece: Piece): Move[] => {
  const moves: Move[] = [];
  const directions = piece.type === "king" 
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.player === "red" 
      ? [[-1, -1], [-1, 1]] // Red moves up
      : [[1, -1], [1, 1]];  // Black moves down
  
  // Check for captures first (multi-jump)
  const captures = findCaptures(board, pos, piece, []);
  if (captures.length > 0) {
    return captures;
  }
  
  // Regular moves
  for (const [dRow, dCol] of directions) {
    const newRow = pos.row + dRow;
    const newCol = pos.col + dCol;
    
    if (isValidPosition(newRow, newCol) && !board[newRow][newCol]) {
      moves.push({
        from: pos,
        to: { row: newRow, col: newCol },
        captures: [],
      });
    }
  }
  
  return moves;
};

// Find all capture sequences (multi-jump)
const findCaptures = (
  board: Board, 
  pos: Position, 
  piece: Piece, 
  capturedSoFar: Position[]
): Move[] => {
  const captures: Move[] = [];
  const directions = piece.type === "king"
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.player === "red"
      ? [[-1, -1], [-1, 1]]
      : [[1, -1], [1, 1]];
  
  // Kings can also capture backwards
  const captureDirections = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const dirsToUse = piece.type === "king" ? captureDirections : captureDirections;
  
  for (const [dRow, dCol] of dirsToUse) {
    const jumpRow = pos.row + dRow;
    const jumpCol = pos.col + dCol;
    const landRow = pos.row + dRow * 2;
    const landCol = pos.col + dCol * 2;
    
    if (!isValidPosition(landRow, landCol)) continue;
    
    const jumpedPiece = board[jumpRow]?.[jumpCol];
    const landSquare = board[landRow]?.[landCol];
    
    // Check if we can capture
    if (
      jumpedPiece && 
      jumpedPiece.player !== piece.player &&
      !landSquare &&
      !capturedSoFar.some(c => c.row === jumpRow && c.col === jumpCol)
    ) {
      const newCaptured = [...capturedSoFar, { row: jumpRow, col: jumpCol }];
      
      // Check for more captures from the new position
      const newBoard = board.map(r => [...r]);
      newBoard[pos.row][pos.col] = null;
      newBoard[jumpRow][jumpCol] = null;
      newBoard[landRow][landCol] = piece;
      
      // Check if piece becomes king
      const becomesKing = 
        piece.type === "normal" && 
        ((piece.player === "red" && landRow === 0) || 
         (piece.player === "black" && landRow === BOARD_SIZE - 1));
      
      const pieceAfterMove = becomesKing 
        ? { ...piece, type: "king" as PieceType }
        : piece;
      
      // If becomes king, stop the jump sequence
      if (becomesKing) {
        captures.push({
          from: { row: pos.row, col: pos.col },
          to: { row: landRow, col: landCol },
          captures: newCaptured,
        });
      } else {
        const furtherCaptures = findCaptures(
          newBoard, 
          { row: landRow, col: landCol }, 
          pieceAfterMove, 
          newCaptured
        );
        
        if (furtherCaptures.length > 0) {
          furtherCaptures.forEach(fc => {
            captures.push({
              from: { row: pos.row, col: pos.col },
              to: fc.to,
              captures: fc.captures,
            });
          });
        } else {
          captures.push({
            from: { row: pos.row, col: pos.col },
            to: { row: landRow, col: landCol },
            captures: newCaptured,
          });
        }
      }
    }
  }
  
  return captures;
};

const isValidPosition = (row: number, col: number): boolean => {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
};

// Apply a move to the board
const applyMove = (board: Board, move: Move): Board => {
  const newBoard = board.map(r => [...r]);
  const piece = newBoard[move.from.row][move.from.col]!;
  
  // Remove captured pieces
  move.captures.forEach(cap => {
    newBoard[cap.row][cap.col] = null;
  });
  
  // Move the piece
  newBoard[move.from.row][move.from.col] = null;
  
  // Check for king promotion
  const becomesKing = 
    piece.type === "normal" && 
    ((piece.player === "red" && move.to.row === 0) || 
     (piece.player === "black" && move.to.row === BOARD_SIZE - 1));
  
  newBoard[move.to.row][move.to.col] = becomesKing 
    ? { ...piece, type: "king" }
    : piece;
  
  return newBoard;
};

// AI: Evaluate board position
const evaluateBoard = (board: Board, player: Player): number => {
  let score = 0;
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      
      const baseValue = piece.type === "king" ? 3 : 1;
      const positionBonus = piece.type === "normal"
        ? (piece.player === "red" ? (7 - row) * 0.1 : row * 0.1)
        : 0;
      const edgeBonus = (col === 0 || col === 7) ? 0.1 : 0;
      const centerBonus = (col >= 2 && col <= 5 && row >= 2 && row <= 5) ? 0.05 : 0;
      
      const value = baseValue + positionBonus + edgeBonus + centerBonus;
      
      if (piece.player === player) {
        score += value;
      } else {
        score -= value;
      }
    }
  }
  
  return score;
};

// AI: Minimax with alpha-beta pruning
const minimax = (
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  player: Player,
  aiPlayer: Player
): number => {
  const currentPlayer = maximizing ? aiPlayer : (aiPlayer === "red" ? "black" : "red");
  const moves = getValidMoves(board, currentPlayer);
  
  if (depth === 0 || moves.length === 0) {
    return evaluateBoard(board, aiPlayer);
  }
  
  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, player, aiPlayer);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, player, aiPlayer);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

// AI: Choose best move based on difficulty
const chooseAIMove = (board: Board, player: Player, difficulty: Difficulty): Move | null => {
  const moves = getValidMoves(board, player);
  if (moves.length === 0) return null;
  
  switch (difficulty) {
    case "easy":
      // Random move
      return moves[Math.floor(Math.random() * moves.length)];
    
    case "medium": {
      // Prefer captures, then random with some evaluation
      const captureMoves = moves.filter(m => m.captures.length > 0);
      if (captureMoves.length > 0) {
        // Pick the capture with most pieces
        return captureMoves.reduce((best, m) => 
          m.captures.length > best.captures.length ? m : best
        );
      }
      // Simple evaluation
      let bestMove = moves[0];
      let bestScore = -Infinity;
      for (const move of moves) {
        const newBoard = applyMove(board, move);
        const score = evaluateBoard(newBoard, player);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      return bestMove;
    }
    
    case "hard": {
      // Minimax depth 4
      let bestMove = moves[0];
      let bestScore = -Infinity;
      for (const move of moves) {
        const newBoard = applyMove(board, move);
        const score = minimax(newBoard, 4, -Infinity, Infinity, false, player, player);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      return bestMove;
    }
    
    case "master": {
      // Minimax depth 6
      let bestMove = moves[0];
      let bestScore = -Infinity;
      for (const move of moves) {
        const newBoard = applyMove(board, move);
        const score = minimax(newBoard, 6, -Infinity, Infinity, false, player, player);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      return bestMove;
    }
  }
};

const DIFFICULTY_LABELS: Record<Difficulty, { label: string; color: string; icon: string }> = {
  easy: { label: "Easy", color: "bg-green-500", icon: "🌱" },
  medium: { label: "Medium", color: "bg-yellow-500", icon: "🎯" },
  hard: { label: "Hard", color: "bg-orange-500", icon: "🔥" },
  master: { label: "Master", color: "bg-red-500", icon: "👑" },
};

export function CheckersGame() {
  const [gameState, setGameState] = useState<GameState>({
    board: createInitialBoard(),
    currentPlayer: "red",
    selectedPiece: null,
    validMoves: [],
    status: "idle",
    difficulty: "medium",
    moveHistory: [],
    redPieces: 12,
    blackPieces: 12,
    movesWithoutCapture: 0,
  });
  
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [highlightedSquares, setHighlightedSquares] = useState<Position[]>([]);
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
    const moves = getValidMoves(board, "red");
    setGameState({
      board,
      currentPlayer: "red",
      selectedPiece: null,
      validMoves: moves,
      status: "playing",
      difficulty,
      moveHistory: [],
      redPieces: 12,
      blackPieces: 12,
      movesWithoutCapture: 0,
    });
    setShowSetupModal(false);
    setHighlightedSquares([]);
  }, []);

  // Handle square click
  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameState.status !== "playing" || gameState.currentPlayer !== "red") return;
    
    const piece = gameState.board[row][col];
    
    // If clicking on own piece, select it
    if (piece && piece.player === "red") {
      const pieceMoves = gameState.validMoves.filter(
        m => m.from.row === row && m.from.col === col
      );
      
      if (pieceMoves.length > 0) {
        setGameState(prev => ({ ...prev, selectedPiece: { row, col } }));
        setHighlightedSquares(pieceMoves.map(m => m.to));
      }
      return;
    }
    
    // If piece is selected and clicking on valid move destination
    if (gameState.selectedPiece) {
      const move = gameState.validMoves.find(
        m => 
          m.from.row === gameState.selectedPiece!.row &&
          m.from.col === gameState.selectedPiece!.col &&
          m.to.row === row &&
          m.to.col === col
      );
      
      if (move) {
        makeMove(move);
      } else {
        // Deselect
        setGameState(prev => ({ ...prev, selectedPiece: null }));
        setHighlightedSquares([]);
      }
    }
  }, [gameState]);

  // Make a move
  const makeMove = useCallback((move: Move) => {
    setGameState(prev => {
      const newBoard = applyMove(prev.board, move);
      const counts = countPieces(newBoard);
      const nextPlayer = prev.currentPlayer === "red" ? "black" : "red";
      const nextMoves = getValidMoves(newBoard, nextPlayer);
      
      // Check for win/loss/draw
      let status: GameStatus = "playing";
      const newMovesWithoutCapture = move.captures.length > 0 ? 0 : prev.movesWithoutCapture + 1;
      
      if (counts.black === 0) {
        status = "won";
      } else if (counts.red === 0) {
        status = "lost";
      } else if (nextMoves.length === 0) {
        status = nextPlayer === "black" ? "won" : "lost";
      } else if (newMovesWithoutCapture >= 100) {
        status = "draw";
      }
      
      return {
        ...prev,
        board: newBoard,
        currentPlayer: nextPlayer,
        selectedPiece: null,
        validMoves: nextMoves,
        status,
        moveHistory: [...prev.moveHistory, { board: prev.board, currentPlayer: prev.currentPlayer }],
        redPieces: counts.red,
        blackPieces: counts.black,
        movesWithoutCapture: newMovesWithoutCapture,
      };
    });
    setHighlightedSquares([]);
  }, []);

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
    
    const timeout = setTimeout(() => {
      const move = chooseAIMove(gameState.board, "black", gameState.difficulty);
      if (move) {
        makeMove(move);
      }
      aiThinkingRef.current = false;
    }, 500);

    return () => clearTimeout(timeout);
  }, [gameState.currentPlayer, gameState.status, gameState.board, gameState.difficulty, makeMove]);

  // Undo move
  const undoMove = useCallback(() => {
    if (gameState.moveHistory.length < 2) return;
    
    // Undo both player and AI move
    const history = gameState.moveHistory.slice(0, -2);
    const lastState = history[history.length - 1] || { 
      board: createInitialBoard(), 
      currentPlayer: "red" as Player 
    };
    
    const counts = countPieces(lastState.board);
    const moves = getValidMoves(lastState.board, lastState.currentPlayer);
    
    setGameState(prev => ({
      ...prev,
      board: history.length > 0 ? lastState.board : createInitialBoard(),
      currentPlayer: history.length > 0 ? lastState.currentPlayer : "red",
      selectedPiece: null,
      validMoves: moves,
      moveHistory: history,
      redPieces: counts.red,
      blackPieces: counts.black,
    }));
    setHighlightedSquares([]);
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
              <h1 className="text-xl sm:text-2xl font-heading truncate">Checkers</h1>
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
              <div className="text-6xl mb-6">🔴</div>
              <h2 className="text-2xl font-heading mb-4">Checkers</h2>
              <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                Jump over your opponent&apos;s pieces to capture them. 
                Reach the other side to become a King!
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
                  <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-red-700" />
                  <span className="font-medium">You: {gameState.redPieces}</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm ${
                  gameState.currentPlayer === "red" 
                    ? "bg-red-500/20 text-red-400" 
                    : "bg-slate-500/20 text-slate-400"
                }`}>
                  {gameState.currentPlayer === "red" ? "Your Turn" : "AI Thinking..."}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">AI: {gameState.blackPieces}</span>
                  <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600" />
                </div>
              </div>

              {/* Board */}
              <div className="aspect-square w-full max-w-[500px] mx-auto">
                <div className="grid grid-cols-8 gap-0 border-4 border-amber-900 rounded-lg overflow-hidden shadow-xl">
                  {Array(BOARD_SIZE).fill(null).map((_, row) =>
                    Array(BOARD_SIZE).fill(null).map((_, col) => {
                      const isDark = (row + col) % 2 === 1;
                      const piece = gameState.board[row][col];
                      const isSelected = 
                        gameState.selectedPiece?.row === row && 
                        gameState.selectedPiece?.col === col;
                      const isHighlighted = highlightedSquares.some(
                        s => s.row === row && s.col === col
                      );
                      const canSelect = 
                        gameState.currentPlayer === "red" &&
                        piece?.player === "red" &&
                        gameState.validMoves.some(m => m.from.row === row && m.from.col === col);

                      return (
                        <div
                          key={`${row}-${col}`}
                          className={`aspect-square relative cursor-pointer transition-colors ${
                            isDark ? "bg-amber-800" : "bg-amber-200"
                          } ${isSelected ? "ring-4 ring-yellow-400 ring-inset" : ""}
                          ${isHighlighted ? "bg-green-500/50" : ""}
                          ${canSelect && !isSelected ? "hover:brightness-110" : ""}`}
                          onClick={() => handleSquareClick(row, col)}
                        >
                          {piece && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={`absolute inset-1 md:inset-2 rounded-full flex items-center justify-center shadow-lg ${
                                piece.player === "red"
                                  ? "bg-gradient-to-br from-red-400 to-red-600 border-2 border-red-700"
                                  : "bg-gradient-to-br from-slate-600 to-slate-800 border-2 border-slate-900"
                              } ${canSelect ? "cursor-pointer" : ""}`}
                            >
                              {piece.type === "king" && (
                                <span className="text-yellow-300 text-lg md:text-2xl">♔</span>
                              )}
                            </motion.div>
                          )}
                          {isHighlighted && !piece && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-4 h-4 rounded-full bg-green-500/70" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Hints */}
              <div className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
                {gameState.currentPlayer === "red" && !gameState.selectedPiece && (
                  <p>Click one of your pieces to see available moves</p>
                )}
                {gameState.selectedPiece && (
                  <p>Click a highlighted square to move, or click another piece</p>
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
                <p className="text-[var(--muted-foreground)] mb-6">
                  {gameState.status === "won" && "Congratulations! You captured all the opponent's pieces!"}
                  {gameState.status === "lost" && "The AI got the better of you this time. Try again!"}
                  {gameState.status === "draw" && "Neither player could make progress. Good game!"}
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

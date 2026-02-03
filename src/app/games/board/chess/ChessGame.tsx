"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Confetti from "react-confetti";
import { Button } from "@/components/ui";

type Difficulty = "easy" | "medium" | "hard" | "master";
type Player = "white" | "black";
type PieceType = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";
type GameStatus = "idle" | "playing" | "checkmate" | "stalemate" | "draw";

interface Piece {
  type: PieceType;
  player: Player;
  hasMoved?: boolean;
}

interface Position {
  row: number;
  col: number;
}

interface Move {
  from: Position;
  to: Position;
  promotion?: PieceType;
  castle?: "kingside" | "queenside";
  enPassant?: boolean;
  capture?: Piece;
}

type Board = (Piece | null)[][];

interface GameState {
  board: Board;
  currentPlayer: Player;
  selectedPiece: Position | null;
  validMoves: Move[];
  status: GameStatus;
  difficulty: Difficulty;
  moveHistory: { board: Board; currentPlayer: Player; enPassant: Position | null }[];
  inCheck: boolean;
  winner: Player | null;
  enPassantTarget: Position | null;
  showPromotion: { from: Position; to: Position } | null;
}

const BOARD_SIZE = 8;

// Piece symbols
const PIECE_SYMBOLS: Record<PieceType, Record<Player, string>> = {
  king: { white: "♔", black: "♚" },
  queen: { white: "♕", black: "♛" },
  rook: { white: "♖", black: "♜" },
  bishop: { white: "♗", black: "♝" },
  knight: { white: "♘", black: "♞" },
  pawn: { white: "♙", black: "♟" },
};

// Piece values for evaluation
const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
};

// Position tables for evaluation
const PAWN_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_TABLE = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

// Create initial board
const createInitialBoard = (): Board => {
  const board: Board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  // Back row pieces
  const backRow: PieceType[] = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
  
  // Black pieces (top)
  for (let col = 0; col < BOARD_SIZE; col++) {
    board[0][col] = { type: backRow[col], player: "black" };
    board[1][col] = { type: "pawn", player: "black" };
  }
  
  // White pieces (bottom)
  for (let col = 0; col < BOARD_SIZE; col++) {
    board[7][col] = { type: backRow[col], player: "white" };
    board[6][col] = { type: "pawn", player: "white" };
  }
  
  return board;
};

const isValidPosition = (row: number, col: number): boolean => {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
};

// Find king position
const findKing = (board: Board, player: Player): Position | null => {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && piece.type === "king" && piece.player === player) {
        return { row, col };
      }
    }
  }
  return null;
};

// Check if a square is attacked by opponent
const isSquareAttacked = (board: Board, pos: Position, byPlayer: Player): boolean => {
  // Check all opponent pieces
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && piece.player === byPlayer) {
        const attacks = getPieceAttacks(board, { row, col }, piece);
        if (attacks.some(a => a.row === pos.row && a.col === pos.col)) {
          return true;
        }
      }
    }
  }
  return false;
};

// Get squares a piece attacks (not necessarily valid moves)
const getPieceAttacks = (board: Board, pos: Position, piece: Piece): Position[] => {
  const attacks: Position[] = [];
  
  switch (piece.type) {
    case "pawn": {
      const direction = piece.player === "white" ? -1 : 1;
      // Pawns attack diagonally
      if (isValidPosition(pos.row + direction, pos.col - 1)) {
        attacks.push({ row: pos.row + direction, col: pos.col - 1 });
      }
      if (isValidPosition(pos.row + direction, pos.col + 1)) {
        attacks.push({ row: pos.row + direction, col: pos.col + 1 });
      }
      break;
    }
    case "knight": {
      const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, dc] of knightMoves) {
        if (isValidPosition(pos.row + dr, pos.col + dc)) {
          attacks.push({ row: pos.row + dr, col: pos.col + dc });
        }
      }
      break;
    }
    case "bishop": {
      const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of directions) {
        for (let i = 1; i < BOARD_SIZE; i++) {
          const newRow = pos.row + dr * i;
          const newCol = pos.col + dc * i;
          if (!isValidPosition(newRow, newCol)) break;
          attacks.push({ row: newRow, col: newCol });
          if (board[newRow][newCol]) break;
        }
      }
      break;
    }
    case "rook": {
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of directions) {
        for (let i = 1; i < BOARD_SIZE; i++) {
          const newRow = pos.row + dr * i;
          const newCol = pos.col + dc * i;
          if (!isValidPosition(newRow, newCol)) break;
          attacks.push({ row: newRow, col: newCol });
          if (board[newRow][newCol]) break;
        }
      }
      break;
    }
    case "queen": {
      const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
      for (const [dr, dc] of directions) {
        for (let i = 1; i < BOARD_SIZE; i++) {
          const newRow = pos.row + dr * i;
          const newCol = pos.col + dc * i;
          if (!isValidPosition(newRow, newCol)) break;
          attacks.push({ row: newRow, col: newCol });
          if (board[newRow][newCol]) break;
        }
      }
      break;
    }
    case "king": {
      const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
      for (const [dr, dc] of directions) {
        if (isValidPosition(pos.row + dr, pos.col + dc)) {
          attacks.push({ row: pos.row + dr, col: pos.col + dc });
        }
      }
      break;
    }
  }
  
  return attacks;
};

// Check if king is in check
const isInCheck = (board: Board, player: Player): boolean => {
  const kingPos = findKing(board, player);
  if (!kingPos) return false;
  const opponent = player === "white" ? "black" : "white";
  return isSquareAttacked(board, kingPos, opponent);
};

// Get all valid moves for a piece
const getValidMovesForPiece = (
  board: Board, 
  pos: Position, 
  piece: Piece,
  enPassantTarget: Position | null
): Move[] => {
  const moves: Move[] = [];
  const opponent = piece.player === "white" ? "black" : "white";
  
  switch (piece.type) {
    case "pawn": {
      const direction = piece.player === "white" ? -1 : 1;
      const startRow = piece.player === "white" ? 6 : 1;
      const promotionRow = piece.player === "white" ? 0 : 7;
      
      // Forward move
      const oneStep = pos.row + direction;
      if (isValidPosition(oneStep, pos.col) && !board[oneStep][pos.col]) {
        if (oneStep === promotionRow) {
          // Promotion
          for (const promo of ["queen", "rook", "bishop", "knight"] as PieceType[]) {
            moves.push({ from: pos, to: { row: oneStep, col: pos.col }, promotion: promo });
          }
        } else {
          moves.push({ from: pos, to: { row: oneStep, col: pos.col } });
        }
        
        // Two steps from start
        const twoStep = pos.row + direction * 2;
        if (pos.row === startRow && !board[twoStep][pos.col]) {
          moves.push({ from: pos, to: { row: twoStep, col: pos.col } });
        }
      }
      
      // Captures
      for (const dc of [-1, 1]) {
        const captureCol = pos.col + dc;
        if (isValidPosition(oneStep, captureCol)) {
          const target = board[oneStep][captureCol];
          if (target && target.player === opponent) {
            if (oneStep === promotionRow) {
              for (const promo of ["queen", "rook", "bishop", "knight"] as PieceType[]) {
                moves.push({ from: pos, to: { row: oneStep, col: captureCol }, promotion: promo, capture: target });
              }
            } else {
              moves.push({ from: pos, to: { row: oneStep, col: captureCol }, capture: target });
            }
          }
          // En passant
          if (enPassantTarget && enPassantTarget.row === oneStep && enPassantTarget.col === captureCol) {
            moves.push({ from: pos, to: { row: oneStep, col: captureCol }, enPassant: true });
          }
        }
      }
      break;
    }
    
    case "knight": {
      const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, dc] of knightMoves) {
        const newRow = pos.row + dr;
        const newCol = pos.col + dc;
        if (isValidPosition(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (!target || target.player === opponent) {
            moves.push({ from: pos, to: { row: newRow, col: newCol }, capture: target || undefined });
          }
        }
      }
      break;
    }
    
    case "bishop": {
      const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of directions) {
        for (let i = 1; i < BOARD_SIZE; i++) {
          const newRow = pos.row + dr * i;
          const newCol = pos.col + dc * i;
          if (!isValidPosition(newRow, newCol)) break;
          const target = board[newRow][newCol];
          if (!target) {
            moves.push({ from: pos, to: { row: newRow, col: newCol } });
          } else if (target.player === opponent) {
            moves.push({ from: pos, to: { row: newRow, col: newCol }, capture: target });
            break;
          } else {
            break;
          }
        }
      }
      break;
    }
    
    case "rook": {
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of directions) {
        for (let i = 1; i < BOARD_SIZE; i++) {
          const newRow = pos.row + dr * i;
          const newCol = pos.col + dc * i;
          if (!isValidPosition(newRow, newCol)) break;
          const target = board[newRow][newCol];
          if (!target) {
            moves.push({ from: pos, to: { row: newRow, col: newCol } });
          } else if (target.player === opponent) {
            moves.push({ from: pos, to: { row: newRow, col: newCol }, capture: target });
            break;
          } else {
            break;
          }
        }
      }
      break;
    }
    
    case "queen": {
      const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
      for (const [dr, dc] of directions) {
        for (let i = 1; i < BOARD_SIZE; i++) {
          const newRow = pos.row + dr * i;
          const newCol = pos.col + dc * i;
          if (!isValidPosition(newRow, newCol)) break;
          const target = board[newRow][newCol];
          if (!target) {
            moves.push({ from: pos, to: { row: newRow, col: newCol } });
          } else if (target.player === opponent) {
            moves.push({ from: pos, to: { row: newRow, col: newCol }, capture: target });
            break;
          } else {
            break;
          }
        }
      }
      break;
    }
    
    case "king": {
      const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
      for (const [dr, dc] of directions) {
        const newRow = pos.row + dr;
        const newCol = pos.col + dc;
        if (isValidPosition(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (!target || target.player === opponent) {
            moves.push({ from: pos, to: { row: newRow, col: newCol }, capture: target || undefined });
          }
        }
      }
      
      // Castling
      if (!piece.hasMoved && !isInCheck(board, piece.player)) {
        const row = piece.player === "white" ? 7 : 0;
        
        // Kingside
        const kingsideRook = board[row][7];
        if (kingsideRook && kingsideRook.type === "rook" && !kingsideRook.hasMoved) {
          if (!board[row][5] && !board[row][6]) {
            if (!isSquareAttacked(board, { row, col: 5 }, opponent) &&
                !isSquareAttacked(board, { row, col: 6 }, opponent)) {
              moves.push({ from: pos, to: { row, col: 6 }, castle: "kingside" });
            }
          }
        }
        
        // Queenside
        const queensideRook = board[row][0];
        if (queensideRook && queensideRook.type === "rook" && !queensideRook.hasMoved) {
          if (!board[row][1] && !board[row][2] && !board[row][3]) {
            if (!isSquareAttacked(board, { row, col: 2 }, opponent) &&
                !isSquareAttacked(board, { row, col: 3 }, opponent)) {
              moves.push({ from: pos, to: { row, col: 2 }, castle: "queenside" });
            }
          }
        }
      }
      break;
    }
  }
  
  // Filter out moves that leave king in check
  return moves.filter(move => {
    const newBoard = applyMove(board, move);
    return !isInCheck(newBoard, piece.player);
  });
};

// Get all valid moves for a player
const getAllValidMoves = (board: Board, player: Player, enPassantTarget: Position | null): Move[] => {
  const moves: Move[] = [];
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && piece.player === player) {
        const pieceMoves = getValidMovesForPiece(board, { row, col }, piece, enPassantTarget);
        moves.push(...pieceMoves);
      }
    }
  }
  
  return moves;
};

// Apply a move to the board
const applyMove = (board: Board, move: Move): Board => {
  const newBoard = board.map(r => r.map(p => p ? { ...p } : null));
  const piece = newBoard[move.from.row][move.from.col]!;
  
  // Handle en passant capture
  if (move.enPassant) {
    const capturedRow = move.from.row;
    newBoard[capturedRow][move.to.col] = null;
  }
  
  // Handle castling
  if (move.castle) {
    const row = move.from.row;
    if (move.castle === "kingside") {
      newBoard[row][5] = newBoard[row][7];
      newBoard[row][7] = null;
      if (newBoard[row][5]) newBoard[row][5]!.hasMoved = true;
    } else {
      newBoard[row][3] = newBoard[row][0];
      newBoard[row][0] = null;
      if (newBoard[row][3]) newBoard[row][3]!.hasMoved = true;
    }
  }
  
  // Move the piece
  newBoard[move.from.row][move.from.col] = null;
  
  // Handle promotion
  if (move.promotion) {
    newBoard[move.to.row][move.to.col] = { type: move.promotion, player: piece.player, hasMoved: true };
  } else {
    newBoard[move.to.row][move.to.col] = { ...piece, hasMoved: true };
  }
  
  return newBoard;
};

// Evaluate board position
const evaluateBoard = (board: Board, player: Player): number => {
  let score = 0;
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      
      let value = PIECE_VALUES[piece.type];
      
      // Add position bonus
      if (piece.type === "pawn") {
        const tableRow = piece.player === "white" ? row : 7 - row;
        value += PAWN_TABLE[tableRow][col];
      } else if (piece.type === "knight") {
        const tableRow = piece.player === "white" ? row : 7 - row;
        value += KNIGHT_TABLE[tableRow][col];
      }
      
      if (piece.player === player) {
        score += value;
      } else {
        score -= value;
      }
    }
  }
  
  return score;
};

// Minimax with alpha-beta
const minimax = (
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  player: Player,
  aiPlayer: Player,
  enPassant: Position | null
): number => {
  const currentPlayer = maximizing ? aiPlayer : (aiPlayer === "white" ? "black" : "white");
  const moves = getAllValidMoves(board, currentPlayer, enPassant);
  
  if (depth === 0) {
    return evaluateBoard(board, aiPlayer);
  }
  
  if (moves.length === 0) {
    if (isInCheck(board, currentPlayer)) {
      return maximizing ? -100000 + depth : 100000 - depth;
    }
    return 0; // Stalemate
  }
  
  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, player, aiPlayer, null);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, player, aiPlayer, null);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

// AI choose move
const chooseAIMove = (
  board: Board, 
  player: Player, 
  difficulty: Difficulty,
  enPassant: Position | null
): Move | null => {
  const moves = getAllValidMoves(board, player, enPassant);
  if (moves.length === 0) return null;
  
  switch (difficulty) {
    case "easy":
      // Random move, but prefer captures
      const captures = moves.filter(m => m.capture);
      if (captures.length > 0 && Math.random() > 0.5) {
        return captures[Math.floor(Math.random() * captures.length)];
      }
      return moves[Math.floor(Math.random() * moves.length)];
    
    case "medium": {
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
      // Minimax depth 3
      let bestMove = moves[0];
      let bestScore = -Infinity;
      for (const move of moves) {
        const newBoard = applyMove(board, move);
        const score = minimax(newBoard, 3, -Infinity, Infinity, false, player, player, null);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      return bestMove;
    }
    
    case "master": {
      // Minimax depth 4-5
      let bestMove = moves[0];
      let bestScore = -Infinity;
      for (const move of moves) {
        const newBoard = applyMove(board, move);
        const score = minimax(newBoard, 4, -Infinity, Infinity, false, player, player, null);
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

export function ChessGame() {
  const [gameState, setGameState] = useState<GameState>({
    board: createInitialBoard(),
    currentPlayer: "white",
    selectedPiece: null,
    validMoves: [],
    status: "idle",
    difficulty: "medium",
    moveHistory: [],
    inCheck: false,
    winner: null,
    enPassantTarget: null,
    showPromotion: null,
  });
  
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [highlightedSquares, setHighlightedSquares] = useState<Position[]>([]);
  const [showWinConfetti, setShowWinConfetti] = useState(false);
  const [confettiSize, setConfettiSize] = useState({ width: 0, height: 0 });
  const aiThinkingRef = useRef(false);

  // Confetti when user wins (checkmate as white)
  useEffect(() => {
    if (gameState.status === "checkmate" && gameState.winner === "white") {
      setConfettiSize({ width: typeof window !== "undefined" ? window.innerWidth : 0, height: typeof window !== "undefined" ? window.innerHeight : 0 });
      setShowWinConfetti(true);
    }
  }, [gameState.status, gameState.winner]);

  useEffect(() => {
    if (!showWinConfetti) return;
    const t = setTimeout(() => setShowWinConfetti(false), 5000);
    return () => clearTimeout(t);
  }, [showWinConfetti]);

  // Start game
  const startGame = useCallback((difficulty: Difficulty) => {
    const board = createInitialBoard();
    const moves = getAllValidMoves(board, "white", null);
    setGameState({
      board,
      currentPlayer: "white",
      selectedPiece: null,
      validMoves: moves,
      status: "playing",
      difficulty,
      moveHistory: [],
      inCheck: false,
      winner: null,
      enPassantTarget: null,
      showPromotion: null,
    });
    setShowSetupModal(false);
    setHighlightedSquares([]);
  }, []);

  // Handle square click
  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameState.status !== "playing" || gameState.currentPlayer !== "white" || gameState.showPromotion) return;
    
    const piece = gameState.board[row][col];
    
    // If clicking on own piece, select it
    if (piece && piece.player === "white") {
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
          m.to.col === col &&
          !m.promotion // Handle non-promotion moves
      );
      
      // Check for promotion moves
      const promoMoves = gameState.validMoves.filter(
        m =>
          m.from.row === gameState.selectedPiece!.row &&
          m.from.col === gameState.selectedPiece!.col &&
          m.to.row === row &&
          m.to.col === col &&
          m.promotion
      );
      
      if (promoMoves.length > 0) {
        setGameState(prev => ({
          ...prev,
          showPromotion: { from: gameState.selectedPiece!, to: { row, col } }
        }));
        return;
      }
      
      if (move) {
        makeMove(move);
      } else {
        setGameState(prev => ({ ...prev, selectedPiece: null }));
        setHighlightedSquares([]);
      }
    }
  }, [gameState]);

  // Handle promotion selection
  const handlePromotion = useCallback((pieceType: PieceType) => {
    if (!gameState.showPromotion) return;
    
    const move = gameState.validMoves.find(
      m =>
        m.from.row === gameState.showPromotion!.from.row &&
        m.from.col === gameState.showPromotion!.from.col &&
        m.to.row === gameState.showPromotion!.to.row &&
        m.to.col === gameState.showPromotion!.to.col &&
        m.promotion === pieceType
    );
    
    if (move) {
      makeMove(move);
    }
  }, [gameState]);

  // Make a move
  const makeMove = useCallback((move: Move) => {
    setGameState(prev => {
      const newBoard = applyMove(prev.board, move);
      const nextPlayer = prev.currentPlayer === "white" ? "black" : "white";
      
      // Calculate en passant target
      let enPassantTarget: Position | null = null;
      const piece = prev.board[move.from.row][move.from.col];
      if (piece?.type === "pawn" && Math.abs(move.to.row - move.from.row) === 2) {
        enPassantTarget = {
          row: (move.from.row + move.to.row) / 2,
          col: move.to.col
        };
      }
      
      const nextMoves = getAllValidMoves(newBoard, nextPlayer, enPassantTarget);
      const inCheck = isInCheck(newBoard, nextPlayer);
      
      // Check for game end
      let status: GameStatus = "playing";
      let winner: Player | null = null;
      
      if (nextMoves.length === 0) {
        if (inCheck) {
          status = "checkmate";
          winner = prev.currentPlayer;
        } else {
          status = "stalemate";
        }
      }
      
      return {
        ...prev,
        board: newBoard,
        currentPlayer: nextPlayer,
        selectedPiece: null,
        validMoves: nextMoves,
        status,
        moveHistory: [...prev.moveHistory, { 
          board: prev.board, 
          currentPlayer: prev.currentPlayer,
          enPassant: prev.enPassantTarget 
        }],
        inCheck,
        winner,
        enPassantTarget,
        showPromotion: null,
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
      const move = chooseAIMove(gameState.board, "black", gameState.difficulty, gameState.enPassantTarget);
      if (move) {
        makeMove(move);
      }
      aiThinkingRef.current = false;
    }, 500);

    return () => clearTimeout(timeout);
  }, [gameState.currentPlayer, gameState.status, gameState.board, gameState.difficulty, makeMove, gameState.enPassantTarget]);

  // Undo move
  const undoMove = useCallback(() => {
    if (gameState.moveHistory.length < 2) return;
    
    const history = gameState.moveHistory.slice(0, -2);
    const lastState = history[history.length - 1] || { 
      board: createInitialBoard(), 
      currentPlayer: "white" as Player,
      enPassant: null
    };
    
    const moves = getAllValidMoves(
      history.length > 0 ? lastState.board : createInitialBoard(), 
      history.length > 0 ? lastState.currentPlayer : "white",
      lastState.enPassant
    );
    
    setGameState(prev => ({
      ...prev,
      board: history.length > 0 ? lastState.board : createInitialBoard(),
      currentPlayer: history.length > 0 ? lastState.currentPlayer : "white",
      selectedPiece: null,
      validMoves: moves,
      moveHistory: history,
      inCheck: false,
      enPassantTarget: lastState.enPassant,
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
              <h1 className="text-xl sm:text-2xl font-heading truncate">Chess</h1>
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
              <div className="text-6xl mb-6">♟️</div>
              <h2 className="text-2xl font-heading mb-4">Chess</h2>
              <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                The ultimate game of strategy. Plan your moves carefully 
                to checkmate your opponent&apos;s King!
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
                  <span className="text-2xl">♔</span>
                  <span className="font-medium">You (White)</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm ${
                  gameState.currentPlayer === "white" 
                    ? gameState.inCheck 
                      ? "bg-red-500/20 text-red-400" 
                      : "bg-green-500/20 text-green-400"
                    : "bg-slate-500/20 text-slate-400"
                }`}>
                  {gameState.currentPlayer === "white" 
                    ? gameState.inCheck ? "Check!" : "Your Turn" 
                    : "AI Thinking..."}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">AI (Black)</span>
                  <span className="text-2xl">♚</span>
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
                        gameState.currentPlayer === "white" &&
                        piece?.player === "white" &&
                        gameState.validMoves.some(m => m.from.row === row && m.from.col === col);
                      const isKingInCheck = 
                        gameState.inCheck &&
                        piece?.type === "king" &&
                        piece?.player === gameState.currentPlayer;

                      return (
                        <div
                          key={`${row}-${col}`}
                          className={`aspect-square relative cursor-pointer transition-colors ${
                            isDark ? "bg-amber-700" : "bg-amber-100"
                          } ${isSelected ? "ring-4 ring-yellow-400 ring-inset" : ""}
                          ${isHighlighted ? "bg-green-500/50" : ""}
                          ${isKingInCheck ? "bg-red-500/50" : ""}
                          ${canSelect && !isSelected ? "hover:brightness-110" : ""}`}
                          onClick={() => handleSquareClick(row, col)}
                        >
                          {piece && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={`absolute inset-0 flex items-center justify-center text-3xl md:text-4xl ${
                                piece.player === "white" ? "text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" : "text-slate-900"
                              } ${canSelect ? "cursor-pointer" : ""}`}
                            >
                              {PIECE_SYMBOLS[piece.type][piece.player]}
                            </motion.div>
                          )}
                          {isHighlighted && !piece && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-4 h-4 rounded-full bg-green-500/70" />
                            </div>
                          )}
                          {isHighlighted && piece && (
                            <div className="absolute inset-0 rounded-sm ring-4 ring-green-500/70 ring-inset" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Hints */}
              <div className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
                {gameState.currentPlayer === "white" && !gameState.selectedPiece && (
                  <p>Click one of your pieces to see available moves</p>
                )}
                {gameState.selectedPiece && (
                  <p>Click a highlighted square to move, or click another piece</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Promotion Modal */}
        <AnimatePresence>
          {gameState.showPromotion && (
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
                className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-6 max-w-sm w-full"
              >
                <h3 className="text-lg font-heading mb-4 text-center">Promote Pawn</h3>
                <div className="grid grid-cols-4 gap-2">
                  {(["queen", "rook", "bishop", "knight"] as PieceType[]).map((type) => (
                    <button
                      key={type}
                      className="p-4 bg-[var(--color-dark-3)]/50 hover:bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg transition-colors text-center"
                      onClick={() => handlePromotion(type)}
                    >
                      <span className="text-4xl text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                        {PIECE_SYMBOLS[type].white}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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

        {/* Game End Modal */}
        <AnimatePresence>
          {(gameState.status === "checkmate" || gameState.status === "stalemate" || gameState.status === "draw") && (
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
                  {gameState.winner === "white" ? "🎉" : gameState.winner === "black" ? "😔" : "🤝"}
                </motion.div>
                <h2 className="text-2xl font-heading mb-2">
                  {gameState.status === "checkmate" && gameState.winner === "white" && "Checkmate! You Win!"}
                  {gameState.status === "checkmate" && gameState.winner === "black" && "Checkmate! You Lose!"}
                  {gameState.status === "stalemate" && "Stalemate!"}
                  {gameState.status === "draw" && "Draw!"}
                </h2>
                <p className="text-[var(--muted-foreground)] mb-6">
                  {gameState.status === "checkmate" && gameState.winner === "white" && "Congratulations! You checkmated the AI!"}
                  {gameState.status === "checkmate" && gameState.winner === "black" && "The AI got you this time. Try again!"}
                  {gameState.status === "stalemate" && "No legal moves available. The game is a draw."}
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

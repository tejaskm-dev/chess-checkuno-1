import { create } from 'zustand';
import { initializeBoard, cloneBoard } from '../utils/board.js';
import { calculateLegalMoves, executeMove, isInCheck, hasLegalMoves, getAllLegalMoves } from '../utils/moves.js';
import { getAIMove } from '../utils/ai.js';
import { algebraicToCoords } from '../utils/notation.js';
import * as Sound from '../utils/sound.js';

export const useGameStore = create((set, get) => ({
  // Core Chess State
  board: initializeBoard(),
  currentPlayer: 'white',
  selectedSquare: null,
  highlightedSquares: [],
  castlingRights: {
    white: { kingside: true, queenside: true },
    black: { kingside: true, queenside: true }
  },
  enPassantSquare: null,
  viewMode: 'wide', // 'wide' (opponent turn/idle) or 'focused' (player turn/active)
  aiDifficulty: 'medium', // 'easy', 'medium', 'hard'
  aiThinking: false,
  gameOver: false,
  gameResult: null, // 'checkmate-white', 'checkmate-black', 'stalemate', 'draw'
  moveHistory: [],
  lastMove: null, // { from, to }
  lastCapture: null, // { square, type, color, serial } — drives the capture VFX
  shakeSeq: 0, // bumped on capture/check to trigger a camera shake
  promotionPending: null, // { from, to }
  soundEnabled: true,

  // Clock (seconds remaining) + captured-piece trays
  initialTime: 600, // 10 minutes each
  whiteTime: 600,
  blackTime: 600,
  clockRunning: false,
  capturedByWhite: [], // black piece types white has captured
  capturedByBlack: [], // white piece types black has captured

  // Actions
  selectSquare: (square) => {
    const { board, currentPlayer, selectedSquare, castlingRights, enPassantSquare, gameOver, aiThinking } = get();
    if (gameOver || aiThinking || currentPlayer === 'black') return;

    if (selectedSquare === square) {
      // Deselect
      set({ selectedSquare: null, highlightedSquares: [] });
      return;
    }

    const [col, row] = algebraicToCoords(square);
    const piece = board[row][col];

    if (piece && piece.color === currentPlayer) {
      // Select piece and calculate legal moves
      const legalMoves = calculateLegalMoves(board, square, castlingRights, enPassantSquare);
      if (get().soundEnabled) Sound.select();
      set({
        selectedSquare: square,
        highlightedSquares: legalMoves,
        viewMode: 'focused'
      });
    } else if (selectedSquare && get().highlightedSquares.includes(square)) {
      // Execute move onto empty space or opponent piece
      get().attemptMove(selectedSquare, square);
    } else {
      // Clicked on empty space or opponent piece without a valid move selected
      set({ selectedSquare: null, highlightedSquares: [] });
    }
  },

  attemptMove: (from, to) => {
    const { board, castlingRights, enPassantSquare } = get();
    const [fc, fr] = algebraicToCoords(from);
    const piece = board[fr][fc];

    if (!piece) return;

    // Check if this is a pawn promotion
    const isPawn = piece.type === 'pawn';
    const toRow = algebraicToCoords(to)[1];
    const promoRow = piece.color === 'white' ? 7 : 0;

    if (isPawn && toRow === promoRow) {
      // Trigger pawn promotion pending state
      set({ promotionPending: { from, to }, selectedSquare: null, highlightedSquares: [] });
    } else {
      // Execute normal move
      get().finalizeMove(from, to, 'queen');
    }
  },

  completePromotion: (type) => {
    const { promotionPending } = get();
    if (!promotionPending) return;
    const { from, to } = promotionPending;
    set({ promotionPending: null });
    get().finalizeMove(from, to, type);
  },

  finalizeMove: (from, to, promotionType) => {
    const { board, currentPlayer, castlingRights, enPassantSquare, moveHistory } = get();
    
    // Execute the move
    const result = executeMove(board, from, to, castlingRights, enPassantSquare, promotionType);
    const nextBoard = result.board;

    // Update castling rights
    const newCastlingRights = JSON.parse(JSON.stringify(castlingRights));
    const [fc, fr] = algebraicToCoords(from);
    const movingPiece = board[fr][fc];

    // Loss of rights due to King movement
    if (movingPiece.type === 'king') {
      newCastlingRights[currentPlayer] = { kingside: false, queenside: false };
    }

    // Loss of rights due to Rook movement
    if (movingPiece.type === 'rook') {
      const isKingside = from[0] === 'h';
      newCastlingRights[currentPlayer][isKingside ? 'kingside' : 'queenside'] = false;
    }

    // Loss of rights due to Rook capture (captured at its initial square)
    if (to === 'a1') newCastlingRights.white.queenside = false;
    if (to === 'h1') newCastlingRights.white.kingside = false;
    if (to === 'a8') newCastlingRights.black.queenside = false;
    if (to === 'h8') newCastlingRights.black.kingside = false;

    // Set new En Passant square if a pawn advanced two spaces
    let nextEnPassantSquare = null;
    if (movingPiece.type === 'pawn') {
      const [tc, tr] = algebraicToCoords(to);
      if (Math.abs(tr - fr) === 2) {
        nextEnPassantSquare = `${from[0]}${Math.round((fr + tr) / 2) + 1}`;
      }
    }

    const opponentColor = currentPlayer === 'white' ? 'black' : 'white';
    
    // Check for check/mate/stalemate on the opponent
    const isOpponentInCheck = isInCheck(nextBoard, opponentColor);
    const opponentHasMoves = hasLegalMoves(nextBoard, opponentColor, newCastlingRights, nextEnPassantSquare);

    let isGameOver = false;
    let newResult = null;

    if (!opponentHasMoves) {
      isGameOver = true;
      if (isOpponentInCheck) {
        newResult = currentPlayer === 'white' ? 'checkmate-white' : 'checkmate-black';
      } else {
        newResult = 'stalemate';
      }
    } else {
      // 50-move rule or 3-fold repetition could go here in a full app, but FIDE core covers draw by material
      // Draw by insufficient material check
      if (isInsufficientMaterial(nextBoard)) {
        isGameOver = true;
        newResult = 'draw';
      }
    }

    // Update state
    set({
      board: nextBoard,
      currentPlayer: opponentColor,
      selectedSquare: null,
      highlightedSquares: [],
      castlingRights: newCastlingRights,
      enPassantSquare: nextEnPassantSquare,
      lastMove: { from, to },
      moveHistory: [...moveHistory, { from, to, captured: !!result.capturedPiece, promoted: result.promoted }],
      gameOver: isGameOver,
      gameResult: newResult,
      viewMode: opponentColor === 'white' ? 'focused' : 'wide', // switch view based on turn
      isInCheck: isOpponentInCheck,
      lastCapture: result.capturedPiece
        ? { square: to, type: result.capturedPiece.type, color: result.capturedPiece.color, serial: moveHistory.length + 1 }
        : get().lastCapture,
      shakeSeq: (result.capturedPiece || isOpponentInCheck) ? get().shakeSeq + 1 : get().shakeSeq,
      capturedByWhite: (result.capturedPiece && currentPlayer === 'white')
        ? [...get().capturedByWhite, result.capturedPiece.type] : get().capturedByWhite,
      capturedByBlack: (result.capturedPiece && currentPlayer === 'black')
        ? [...get().capturedByBlack, result.capturedPiece.type] : get().capturedByBlack,
      clockRunning: !isGameOver
    });

    // Sound effects for the move that just happened (player and AI both route here)
    if (get().soundEnabled) {
      const fromCol = algebraicToCoords(from)[0];
      const toCol = algebraicToCoords(to)[0];
      const isCastle = movingPiece.type === 'king' && Math.abs(toCol - fromCol) === 2;

      if (isCastle) Sound.castle();
      else if (result.promoted) Sound.promote();
      else if (result.capturedPiece) Sound.capture();
      else Sound.move();

      if (isGameOver) {
        setTimeout(() => Sound.gameEnd(newResult === 'checkmate-white'), 300);
      } else if (isOpponentInCheck) {
        setTimeout(() => Sound.check(), 140);
      }
    }

    // Trigger AI Move if it's black's turn and game isn't over
    if (!isGameOver && opponentColor === 'black') {
      get().triggerAIMove();
    }
  },

  triggerAIMove: () => {
    set({ aiThinking: true, viewMode: 'wide' });

    // Realistic, variable "thinking" time so the AI actually spends clock time.
    const base = get().aiDifficulty === 'easy' ? 1400 : get().aiDifficulty === 'medium' ? 2400 : 3600;
    const delay = base + Math.random() * base * 0.7;

    // Perform AI calculation after a slight artificial delay for realism
    setTimeout(() => {
      const { board, aiDifficulty, castlingRights, enPassantSquare, gameOver } = get();
      if (gameOver) return;

      const aiMove = getAIMove(board, aiDifficulty, castlingRights, enPassantSquare);
      
      if (aiMove) {
        set({ aiThinking: false });
        get().finalizeMove(aiMove.from, aiMove.to, 'queen');
      } else {
        // Fallback in case no moves are found (should not happen unless checkmate/stalemate missed)
        set({ aiThinking: false, gameOver: true, gameResult: 'draw' });
      }
    }, delay);
  },

  toggleSound: () => {
    const next = !get().soundEnabled;
    if (next) Sound.unlock();
    set({ soundEnabled: next });
  },

  // Called on a timer tick with real elapsed seconds; drains the mover's clock.
  decrementClock: (dt) => {
    const s = get();
    if (!s.clockRunning || s.gameOver || s.promotionPending) return;

    if (s.currentPlayer === 'white') {
      const nt = s.whiteTime - dt;
      if (nt <= 0) {
        set({ whiteTime: 0, gameOver: true, gameResult: 'timeout-white', clockRunning: false });
        if (s.soundEnabled) Sound.gameEnd(false); // player flagged → loss
      } else {
        set({ whiteTime: nt });
      }
    } else {
      const nt = s.blackTime - dt;
      if (nt <= 0) {
        set({ blackTime: 0, gameOver: true, gameResult: 'timeout-black', clockRunning: false });
        if (s.soundEnabled) Sound.gameEnd(true); // opponent flagged → win
      } else {
        set({ blackTime: nt });
      }
    }
  },

  resetGame: (difficulty = 'medium') => {
    // resetGame is always called from a click (Start / Play Again) — a valid
    // user gesture, so this is where we unlock the Web Audio context.
    Sound.unlock();
    set({
      board: initializeBoard(),
      currentPlayer: 'white',
      selectedSquare: null,
      highlightedSquares: [],
      castlingRights: {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true }
      },
      enPassantSquare: null,
      viewMode: 'focused',
      aiDifficulty: difficulty,
      aiThinking: false,
      gameOver: false,
      gameResult: null,
      moveHistory: [],
      lastMove: null,
      lastCapture: null,
      shakeSeq: 0,
      promotionPending: null,
      isInCheck: false,
      soundEnabled: get().soundEnabled ?? true,
      whiteTime: get().initialTime,
      blackTime: get().initialTime,
      clockRunning: true,
      capturedByWhite: [],
      capturedByBlack: []
    });
  }
}));

// Helper to check for insufficient material
function isInsufficientMaterial(board) {
  const pieces = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) pieces.push(p);
    }
  }

  // King vs King
  if (pieces.length === 2) return true;

  // King + Bishop vs King or King + Knight vs King
  if (pieces.length === 3) {
    return pieces.some(p => p.type === 'bishop' || p.type === 'knight');
  }

  // King + Bishop vs King + Bishop (same color squares)
  // For simplicity, we just check if only Kings and Bishops remain
  if (pieces.length === 4) {
    const nonKings = pieces.filter(p => p.type !== 'king');
    if (nonKings.length === 2 && nonKings.every(p => p.type === 'bishop')) {
      // Technically, they must be on the same color square, which is the FIDE rule
      // We can check their square coordinates
      let bishopSquares = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (board[r][c] && board[r][c].type === 'bishop') {
            bishopSquares.push((r + c) % 2);
          }
        }
      }
      if (bishopSquares.length === 2 && bishopSquares[0] === bishopSquares[1]) {
        return true;
      }
    }
  }

  return false;
}

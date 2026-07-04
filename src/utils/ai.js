import { getAllLegalMoves, executeMove, isInCheck } from './moves.js';
import { cloneBoard, findKing } from './board.js';
import { algebraicToCoords } from './notation.js';

// Piece value mapping (from plan.md)
const PIECE_VALUES = {
  pawn: 10,
  knight: 30,
  bishop: 30,
  rook: 50,
  queen: 90,
  king: 9000 // A very large number so King is valued infinitely
};

/**
 * Basic board evaluation function (Black is maximizing, White is minimizing)
 */
export function evaluateBoard(board) {
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const baseValue = PIECE_VALUES[piece.type] || 0;
      let pieceScore = baseValue;

      // Centralization bonus (from plan.md)
      // distance from center (3.5, 3.5)
      const distFromCenter = Math.abs(c - 3.5) + Math.abs(r - 3.5);
      const centerBonus = 4 - distFromCenter / 2;
      pieceScore += centerBonus;

      // Add/subtract based on color (Black is AI = maximizing, White is Player = minimizing)
      score += piece.color === 'black' ? pieceScore : -pieceScore;
    }
  }

  // Check state modifiers
  if (isInCheck(board, 'black')) score -= 50;
  if (isInCheck(board, 'white')) score += 50;

  return score;
}

/**
 * Alpha-Beta Minimax search
 */
function minimax(board, depth, alpha, beta, isMaximizing, castlingRights, enPassantSquare) {
  if (depth === 0) {
    return { score: evaluateBoard(board), move: null };
  }

  const color = isMaximizing ? 'black' : 'white';
  const opponentColor = isMaximizing ? 'white' : 'black';
  const legalMoves = getAllLegalMoves(board, color, castlingRights, enPassantSquare);

  if (legalMoves.length === 0) {
    // No legal moves
    if (isInCheck(board, color)) {
      // Checkmate: if AI is checkmated, return highly negative score. If player is checkmated, return highly positive.
      return { score: isMaximizing ? -100000 - depth : 100000 + depth, move: null };
    }
    // Stalemate / Draw
    return { score: 0, move: null };
  }

  // Move ordering: sort captures and checks first to optimize alpha-beta pruning
  legalMoves.sort((m1, m2) => {
    const p1 = board[algebraicToCoords(m1.to)[1]][algebraicToCoords(m1.to)[0]];
    const p2 = board[algebraicToCoords(m2.to)[1]][algebraicToCoords(m2.to)[0]];
    const val1 = p1 ? PIECE_VALUES[p1.type] : 0;
    const val2 = p2 ? PIECE_VALUES[p2.type] : 0;
    return val2 - val1; // descending order of value
  });

  let bestMove = null;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of legalMoves) {
      // Simulate move
      const { board: nextBoard } = executeMove(board, move.from, move.to, castlingRights, enPassantSquare);
      
      // Update rights for recursive call
      const nextCastlingRights = JSON.parse(JSON.stringify(castlingRights));
      const movingPiece = board[algebraicToCoords(move.from)[1]][algebraicToCoords(move.from)[0]];
      if (movingPiece && movingPiece.type === 'king') {
        nextCastlingRights.black = { kingside: false, queenside: false };
      } else if (movingPiece && movingPiece.type === 'rook') {
        const isKingside = move.from[0] === 'h';
        nextCastlingRights.black[isKingside ? 'kingside' : 'queenside'] = false;
      }

      // Next en passant square
      let nextEnPassantSquare = null;
      if (movingPiece && movingPiece.type === 'pawn') {
        const [fc, fr] = algebraicToCoords(move.from);
        const [tc, tr] = algebraicToCoords(move.to);
        if (Math.abs(tr - fr) === 2) {
          nextEnPassantSquare = `${move.from[0]}${Math.round((fr + tr) / 2) + 1}`;
        }
      }

      const evaluation = minimax(nextBoard, depth - 1, alpha, beta, false, nextCastlingRights, nextEnPassantSquare).score;
      if (evaluation > maxEval) {
        maxEval = evaluation;
        bestMove = move;
      }
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break; // Beta cut-off
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const move of legalMoves) {
      const { board: nextBoard } = executeMove(board, move.from, move.to, castlingRights, enPassantSquare);
      
      // Update rights for recursive call
      const nextCastlingRights = JSON.parse(JSON.stringify(castlingRights));
      const movingPiece = board[algebraicToCoords(move.from)[1]][algebraicToCoords(move.from)[0]];
      if (movingPiece && movingPiece.type === 'king') {
        nextCastlingRights.white = { kingside: false, queenside: false };
      } else if (movingPiece && movingPiece.type === 'rook') {
        const isKingside = move.from[0] === 'h';
        nextCastlingRights.white[isKingside ? 'kingside' : 'queenside'] = false;
      }

      // Next en passant square
      let nextEnPassantSquare = null;
      if (movingPiece && movingPiece.type === 'pawn') {
        const [fc, fr] = algebraicToCoords(move.from);
        const [tc, tr] = algebraicToCoords(move.to);
        if (Math.abs(tr - fr) === 2) {
          nextEnPassantSquare = `${move.from[0]}${Math.round((fr + tr) / 2) + 1}`;
        }
      }

      const evaluation = minimax(nextBoard, depth - 1, alpha, beta, true, nextCastlingRights, nextEnPassantSquare).score;
      if (evaluation < minEval) {
        minEval = evaluation;
        bestMove = move;
      }
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break; // Alpha cut-off
    }
    return { score: minEval, move: bestMove };
  }
}

/**
 * Medium AI Move (Tactical awareness, check/capture priority, otherwise safe move)
 */
function aiMoveMedium(board, castlingRights, enPassantSquare) {
  const legalMoves = getAllLegalMoves(board, 'black', castlingRights, enPassantSquare);
  if (legalMoves.length === 0) return null;

  // 1. Checkmate in one move?
  for (const move of legalMoves) {
    const { board: nextBoard } = executeMove(board, move.from, move.to, castlingRights, enPassantSquare);
    const opponentMoves = getAllLegalMoves(nextBoard, 'white', castlingRights, null);
    if (opponentMoves.length === 0 && isInCheck(nextBoard, 'white')) {
      return move;
    }
  }

  // 2. Capture high-value pieces
  let bestCaptureMove = null;
  let bestCapturedValue = 0;
  for (const move of legalMoves) {
    const [tc, tr] = algebraicToCoords(move.to);
    const targetPiece = board[tr][tc];
    if (targetPiece && targetPiece.color === 'white') {
      const val = PIECE_VALUES[targetPiece.type] || 0;
      if (val > bestCapturedValue) {
        bestCapturedValue = val;
        bestCaptureMove = move;
      }
    }
  }
  if (bestCaptureMove) return bestCaptureMove;

  // 3. Block check or escape if in check
  if (isInCheck(board, 'black')) {
    // Filter moves that resolve check
    const checkEscapes = legalMoves.filter(move => {
      const { board: nextBoard } = executeMove(board, move.from, move.to, castlingRights, enPassantSquare);
      return !isInCheck(nextBoard, 'black');
    });
    if (checkEscapes.length > 0) {
      return checkEscapes[Math.floor(Math.random() * checkEscapes.length)];
    }
  }

  // 4. Random safe move (does not put itself in check, which is guaranteed by legalMoves)
  return legalMoves[Math.floor(Math.random() * legalMoves.length)];
}

/**
 * Gets the AI's move based on difficulty
 */
export function getAIMove(board, difficulty, castlingRights, enPassantSquare) {
  const legalMoves = getAllLegalMoves(board, 'black', castlingRights, enPassantSquare);
  if (legalMoves.length === 0) return null;

  if (difficulty === 'easy') {
    // Random move
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  if (difficulty === 'medium') {
    return aiMoveMedium(board, castlingRights, enPassantSquare);
  }

  if (difficulty === 'hard') {
    const searchResult = minimax(board, 3, -Infinity, Infinity, true, castlingRights, enPassantSquare);
    return searchResult.move || legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  return legalMoves[Math.floor(Math.random() * legalMoves.length)];
}

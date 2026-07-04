import { coordsToAlgebraic, algebraicToCoords } from './notation.js';
import { cloneBoard, findKing } from './board.js';

// Directions for sliding pieces
const ROOK_DIRECTIONS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
const BISHOP_DIRECTIONS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const QUEEN_DIRECTIONS = [...ROOK_DIRECTIONS, ...BISHOP_DIRECTIONS];

/**
 * Returns pseudo-legal moves for a piece at [col, row], ignoring check conditions.
 */
export function calculatePseudoLegalMoves(board, col, row, enPassantSquare) {
  const piece = board[row][col];
  if (!piece) return [];

  const moves = []; // Array of [c, r] coordinates
  const color = piece.color;
  const opponentColor = color === 'white' ? 'black' : 'white';

  switch (piece.type) {
    case 'pawn': {
      const direction = color === 'white' ? 1 : -1;
      const startRow = color === 'white' ? 1 : 6;

      // 1. Single step forward
      const nextRow = row + direction;
      if (nextRow >= 0 && nextRow < 8 && !board[nextRow][col]) {
        moves.push([col, nextRow]);

        // 2. Double step forward from initial position
        const doubleRow = row + 2 * direction;
        if (row === startRow && !board[doubleRow][col]) {
          moves.push([col, doubleRow]);
        }
      }

      // 3. Diagonal captures
      const captureCols = [col - 1, col + 1];
      for (const c of captureCols) {
        if (c >= 0 && c < 8 && nextRow >= 0 && nextRow < 8) {
          const targetPiece = board[nextRow][c];
          if (targetPiece && targetPiece.color === opponentColor) {
            moves.push([c, nextRow]);
          }
        }
      }

      // 4. En Passant capture
      if (enPassantSquare) {
        const [epCol, epRow] = algebraicToCoords(enPassantSquare);
        if (nextRow === epRow && Math.abs(col - epCol) === 1) {
          moves.push([epCol, epRow]);
        }
      }
      break;
    }

    case 'knight': {
      const knightOffsets = [
        [1, 2], [2, 1], [2, -1], [1, -2],
        [-1, -2], [-2, -1], [-2, 1], [-1, 2]
      ];
      for (const [dc, dr] of knightOffsets) {
        const c = col + dc;
        const r = row + dr;
        if (c >= 0 && c < 8 && r >= 0 && r < 8) {
          const target = board[r][c];
          if (!target || target.color === opponentColor) {
            moves.push([c, r]);
          }
        }
      }
      break;
    }

    case 'bishop': {
      for (const [dc, dr] of BISHOP_DIRECTIONS) {
        let c = col + dc;
        let r = row + dr;
        while (c >= 0 && c < 8 && r >= 0 && r < 8) {
          const target = board[r][c];
          if (!target) {
            moves.push([c, r]);
          } else {
            if (target.color === opponentColor) {
              moves.push([c, r]);
            }
            break; // Path blocked
          }
          c += dc;
          r += dr;
        }
      }
      break;
    }

    case 'rook': {
      for (const [dc, dr] of ROOK_DIRECTIONS) {
        let c = col + dc;
        let r = row + dr;
        while (c >= 0 && c < 8 && r >= 0 && r < 8) {
          const target = board[r][c];
          if (!target) {
            moves.push([c, r]);
          } else {
            if (target.color === opponentColor) {
              moves.push([c, r]);
            }
            break; // Path blocked
          }
          c += dc;
          r += dr;
        }
      }
      break;
    }

    case 'queen': {
      for (const [dc, dr] of QUEEN_DIRECTIONS) {
        let c = col + dc;
        let r = row + dr;
        while (c >= 0 && c < 8 && r >= 0 && r < 8) {
          const target = board[r][c];
          if (!target) {
            moves.push([c, r]);
          } else {
            if (target.color === opponentColor) {
              moves.push([c, r]);
            }
            break; // Path blocked
          }
          c += dc;
          r += dr;
        }
      }
      break;
    }

    case 'king': {
      for (const [dc, dr] of QUEEN_DIRECTIONS) {
        const c = col + dc;
        const r = row + dr;
        if (c >= 0 && c < 8 && r >= 0 && r < 8) {
          const target = board[r][c];
          if (!target || target.color === opponentColor) {
            moves.push([c, r]);
          }
        }
      }
      break;
    }
  }

  return moves;
}

/**
 * Checks if a square is attacked by any piece of the specified attackerColor.
 */
export function isSquareAttacked(board, [col, row], attackerColor) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== attackerColor) continue;

      // Handle pawn diagonal attacks specifically (pawns don't attack forward)
      if (piece.type === 'pawn') {
        const direction = attackerColor === 'white' ? 1 : -1;
        const attackRow = r + direction;
        if (attackRow === row && Math.abs(c - col) === 1) {
          return true;
        }
        continue;
      }

      // Handle other pieces
      const pseudoMoves = calculatePseudoLegalMoves(board, c, r, null);
      if (pseudoMoves.some(([mc, mr]) => mc === col && mr === row)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Checks if the King of the specified color is in check.
 */
export function isInCheck(board, color) {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  const opponentColor = color === 'white' ? 'black' : 'white';
  return isSquareAttacked(board, kingPos, opponentColor);
}

/**
 * Calculates absolute legal moves for a piece at a square, taking checks and castling into account.
 */
export function calculateLegalMoves(board, square, castlingRights, enPassantSquare) {
  const coords = algebraicToCoords(square);
  if (!coords) return [];
  const [col, row] = coords;
  const piece = board[row][col];
  if (!piece) return [];

  const color = piece.color;
  const opponentColor = color === 'white' ? 'black' : 'white';

  // 1. Get pseudo-legal moves
  const pseudoMoves = calculatePseudoLegalMoves(board, col, row, enPassantSquare);

  // 2. Filter out moves that leave/place own King in check
  const legalMoves = pseudoMoves.filter(([tc, tr]) => {
    const tempBoard = cloneBoard(board);
    // Execute move on temp board
    const movingPiece = tempBoard[row][col];
    tempBoard[row][col] = null;

    // Handle en passant capture
    if (movingPiece.type === 'pawn' && enPassantSquare) {
      const [epCol, epRow] = algebraicToCoords(enPassantSquare);
      if (tc === epCol && tr === epRow) {
        // Capture pawn behind the landing square
        const captureRow = color === 'white' ? epRow - 1 : epRow + 1;
        tempBoard[captureRow][epCol] = null;
      }
    }

    tempBoard[tr][tc] = movingPiece;
    return !isInCheck(tempBoard, color);
  });

  // 3. Add castling if piece is King
  if (piece.type === 'king') {
    const rights = castlingRights[color];
    const isKingInCh = isInCheck(board, color);

    if (rights && !isKingInCh) {
      const kingRow = color === 'white' ? 0 : 7;

      // Kingside Castling (O-O)
      if (rights.kingside) {
        const fSquareEmpty = !board[kingRow][5];
        const gSquareEmpty = !board[kingRow][6];
        const fSquareSafe = !isSquareAttacked(board, [5, kingRow], opponentColor);
        const gSquareSafe = !isSquareAttacked(board, [6, kingRow], opponentColor);

        // Path must be clear, King cannot pass through or land in check
        if (fSquareEmpty && gSquareEmpty && fSquareSafe && gSquareSafe) {
          // Double check rook is present and has not moved (redundancy check)
          const rook = board[kingRow][7];
          if (rook && rook.type === 'rook' && rook.color === color) {
            legalMoves.push([6, kingRow]);
          }
        }
      }

      // Queenside Castling (O-O-O)
      if (rights.queenside) {
        const dSquareEmpty = !board[kingRow][3];
        const cSquareEmpty = !board[kingRow][2];
        const bSquareEmpty = !board[kingRow][1];
        const dSquareSafe = !isSquareAttacked(board, [3, kingRow], opponentColor);
        const cSquareSafe = !isSquareAttacked(board, [2, kingRow], opponentColor);

        // Path must be clear (b, c, d empty), King cannot pass through (d) or land in check (c)
        // b-square does not need to be unattacked, only empty
        if (dSquareEmpty && cSquareEmpty && bSquareEmpty && dSquareSafe && cSquareSafe) {
          const rook = board[kingRow][0];
          if (rook && rook.type === 'rook' && rook.color === color) {
            legalMoves.push([2, kingRow]);
          }
        }
      }
    }
  }

  // Map to algebraic coordinates
  return legalMoves
    .map(([c, r]) => coordsToAlgebraic(c, r))
    .filter(Boolean);
}

/**
 * Returns all legal moves for a given player color.
 */
export function getAllLegalMoves(board, color, castlingRights, enPassantSquare) {
  const allMoves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const fromSquare = coordsToAlgebraic(c, r);
        const legalDestinations = calculateLegalMoves(board, fromSquare, castlingRights, enPassantSquare);
        for (const toSquare of legalDestinations) {
          allMoves.push({ from: fromSquare, to: toSquare });
        }
      }
    }
  }
  return allMoves;
}

/**
 * Checks if the specified color has no legal moves.
 */
export function hasLegalMoves(board, color, castlingRights, enPassantSquare) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const fromSquare = coordsToAlgebraic(c, r);
        const legalDestinations = calculateLegalMoves(board, fromSquare, castlingRights, enPassantSquare);
        if (legalDestinations.length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Executes a move on the board and returns the new board state along with move metadata.
 * Note: Assumes the move has already been validated.
 */
export function executeMove(board, fromSquare, toSquare, castlingRights, enPassantSquare, promotionType = 'queen') {
  const newBoard = cloneBoard(board);
  const [fc, fr] = algebraicToCoords(fromSquare);
  const [tc, tr] = algebraicToCoords(toSquare);

  const piece = newBoard[fr][fc];
  newBoard[fr][fc] = null;

  let capturedPiece = newBoard[tr][tc];
  let isEnPassant = false;
  let isCastling = false;
  let promoted = false;

  // Handle pawn-specific rules
  if (piece.type === 'pawn') {
    // 1. En Passant Capture
    if (enPassantSquare && tc === algebraicToCoords(enPassantSquare)[0] && tr === algebraicToCoords(enPassantSquare)[1]) {
      const epCol = tc;
      const captureRow = piece.color === 'white' ? tr - 1 : tr + 1;
      capturedPiece = newBoard[captureRow][epCol];
      newBoard[captureRow][epCol] = null;
      isEnPassant = true;
    }

    // 2. Promotion check
    const promoRow = piece.color === 'white' ? 7 : 0;
    if (tr === promoRow) {
      piece.type = promotionType;
      promoted = true;
    }
  }

  // Handle King-specific rules (Castling execution)
  if (piece.type === 'king') {
    const colDiff = tc - fc;
    if (Math.abs(colDiff) === 2) {
      isCastling = true;
      const kingRow = piece.color === 'white' ? 0 : 7;
      if (colDiff > 0) {
        // Kingside castling: Move rook from file h (7) to file f (5)
        const rook = newBoard[kingRow][7];
        newBoard[kingRow][7] = null;
        newBoard[kingRow][5] = rook;
        if (rook) rook.hasMoved = true;
      } else {
        // Queenside castling: Move rook from file a (0) to file d (3)
        const rook = newBoard[kingRow][0];
        newBoard[kingRow][0] = null;
        newBoard[kingRow][3] = rook;
        if (rook) rook.hasMoved = true;
      }
    }
  }

  // Set hasMoved flag on moving piece
  piece.hasMoved = true;
  newBoard[tr][tc] = piece;

  return {
    board: newBoard,
    capturedPiece,
    promoted,
    isEnPassant,
    isCastling
  };
}

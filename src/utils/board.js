/**
 * Chess board initialization and setup
 */

export function initializeBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));

  // Piece types sequence for back rank
  const backRankTypes = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

  // White Pieces (Row 0 = Rank 1, Row 1 = Rank 2)
  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: backRankTypes[col], color: 'white', hasMoved: false };
    board[1][col] = { type: 'pawn', color: 'white', hasMoved: false };
  }

  // Black Pieces (Row 7 = Rank 8, Row 6 = Rank 7)
  for (let col = 0; col < 8; col++) {
    board[7][col] = { type: backRankTypes[col], color: 'black', hasMoved: false };
    board[6][col] = { type: 'pawn', color: 'black', hasMoved: false };
  }

  return board;
}

export function cloneBoard(board) {
  return board.map(row => 
    row.map(cell => cell ? { ...cell } : null)
  );
}

// Helper to find the king's position
export function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === 'king' && piece.color === color) {
        return [c, r];
      }
    }
  }
  return null;
}

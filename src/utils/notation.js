/**
 * Chess coordinates conversion utilities
 * Internal board representation:
 * col (file): 0 = 'a', 7 = 'h'
 * row (rank): 0 = '1', 7 = '8' (White perspective: rank 1 at the bottom)
 */

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function coordsToAlgebraic(col, row) {
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  return `${FILES[col]}${row + 1}`;
}

export function algebraicToCoords(square) {
  if (!square || square.length !== 2) return null;
  const col = FILES.indexOf(square[0]);
  const row = parseInt(square[1], 10) - 1;
  if (col === -1 || isNaN(row) || row < 0 || row > 7) return null;
  return [col, row];
}

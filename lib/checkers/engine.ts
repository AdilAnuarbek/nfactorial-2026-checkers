import { BOARD_SIZE } from './board';
import type { Board, Move, Piece, PieceColor, Position } from './types';

export { BOARD_SIZE };

export function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function isPlayableSquare(row: number, col: number): boolean {
  return isValidPosition(row, col) && (row + col) % 2 === 1;
}

export function getMoveDirections(piece: Piece): [number, number][] {
  if (piece.type === 'king') {
    return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  }
  return piece.color === 'white'
    ? [[-1, -1], [-1, 1]]
    : [[1, -1], [1, 1]];
}

export function getCaptureDirections(
  piece: Piece,
  inCaptureChain: boolean
): [number, number][] {
  if (piece.type === 'king' || inCaptureChain) {
    return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  }
  return getMoveDirections(piece);
}

export function getCaptureMoves(
  row: number,
  col: number,
  board: Board,
  capturedPieces: Position[] = [],
  origin?: Position
): Move[] {
  const piece = board[row][col];
  if (!piece) return [];

  const start = origin ?? { row, col };
  const captures: Move[] = [];
  const directions = getCaptureDirections(piece, capturedPieces.length > 0);

  for (const [dRow, dCol] of directions) {
    const jumpRow = row + dRow;
    const jumpCol = col + dCol;
    const landRow = row + 2 * dRow;
    const landCol = col + 2 * dCol;

    if (
      isValidPosition(jumpRow, jumpCol) &&
      isPlayableSquare(landRow, landCol) &&
      board[jumpRow]?.[jumpCol] &&
      board[jumpRow][jumpCol]!.color !== piece.color &&
      !board[landRow][landCol] &&
      !capturedPieces.some(p => p.row === jumpRow && p.col === jumpCol)
    ) {
      const newCaptured = [...capturedPieces, { row: jumpRow, col: jumpCol }];
      const tempBoard = board.map(r => [...r]);
      tempBoard[landRow][landCol] = piece;
      tempBoard[row][col] = null;
      tempBoard[jumpRow][jumpCol] = null;

      const continuedCaptures = getCaptureMoves(
        landRow,
        landCol,
        tempBoard,
        newCaptured,
        start
      );

      if (continuedCaptures.length > 0) {
        captures.push(...continuedCaptures);
      } else {
        captures.push({
          from: start,
          to: { row: landRow, col: landCol },
          captures: newCaptured,
        });
      }
    }
  }

  return captures;
}

export function getPossibleMoves(row: number, col: number, board: Board): Move[] {
  const piece = board[row][col];
  if (!piece) return [];

  const moves: Move[] = [];
  const directions = getMoveDirections(piece);

  for (const [dRow, dCol] of directions) {
    const newRow = row + dRow;
    const newCol = col + dCol;
    if (isPlayableSquare(newRow, newCol) && !board[newRow][newCol]) {
      moves.push({ from: { row, col }, to: { row: newRow, col: newCol } });
    }
  }

  moves.push(...getCaptureMoves(row, col, board));
  return moves;
}

export function getAllPlayerMoves(player: PieceColor, board: Board): Move[] {
  const allMoves: Move[] = [];
  const captureMoves: Move[] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && piece.color === player) {
        const moves = getPossibleMoves(row, col, board);
        const captures = moves.filter(m => m.captures && m.captures.length > 0);
        if (captures.length > 0) captureMoves.push(...captures);
        else allMoves.push(...moves);
      }
    }
  }

  return captureMoves.length > 0 ? captureMoves : allMoves;
}

export function applyMoveToBoard(prev: Board, move: Move): Board {
  const newBoard = prev.map(row => [...row]);
  const piece = newBoard[move.from.row][move.from.col];
  if (!piece) return prev;

  newBoard[move.to.row][move.to.col] = piece;
  newBoard[move.from.row][move.from.col] = null;

  if (move.captures) {
    move.captures.forEach(pos => {
      newBoard[pos.row][pos.col] = null;
    });
  }

  if (
    piece.type === 'regular' &&
    ((piece.color === 'white' && move.to.row === 0) ||
      (piece.color === 'black' && move.to.row === BOARD_SIZE - 1))
  ) {
    newBoard[move.to.row][move.to.col] = { ...piece, type: 'king' };
  }

  return newBoard;
}

export function applyMoveWithTurn(
  board: Board,
  currentPlayer: PieceColor,
  move: Move
): { board: Board; currentPlayer: PieceColor; winner: PieceColor | null } {
  const newBoard = applyMoveToBoard(board, move);
  const opponent = currentPlayer === 'white' ? 'black' : 'white';
  const opponentMoves = getAllPlayerMoves(opponent, newBoard);
  if (opponentMoves.length === 0) {
    return { board: newBoard, currentPlayer: opponent, winner: currentPlayer };
  }
  return { board: newBoard, currentPlayer: opponent, winner: null };
}

export function isMoveAllowed(
  move: Move,
  player: PieceColor,
  board: Board
): boolean {
  const legal = getAllPlayerMoves(player, board);
  return legal.some(
    m =>
      m.from.row === move.from.row &&
      m.from.col === move.from.col &&
      m.to.row === move.to.row &&
      m.to.col === move.to.col &&
      (m.captures?.length ?? 0) === (move.captures?.length ?? 0)
  );
}

import type { Board } from './types';

export const BOARD_SIZE = 8;

export const initializeBoard = (): Board => {
  const board: Board = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'black', type: 'regular' };
      }
    }
  }

  for (let row = 5; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'white', type: 'regular' };
      }
    }
  }

  return board;
};

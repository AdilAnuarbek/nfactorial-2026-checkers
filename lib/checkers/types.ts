export type PieceType = 'regular' | 'king';
export type PieceColor = 'black' | 'white';

export interface Piece {
  color: PieceColor;
  type: PieceType;
}

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  captures?: Position[];
}

export type Board = (Piece | null)[][];

export type GameMode = 'pvp' | 'ai' | 'online';
export type AiLevel = 'easy' | 'medium' | 'hard';

export interface SavedGameState {
  board: Board;
  currentPlayer: PieceColor;
  moveHistory: Move[];
  winner: PieceColor | null;
  gameMode: GameMode;
  aiLevel: AiLevel;
  humanColor?: PieceColor;
  savedAt: string;
}

export interface SavedPreferences {
  theme: 'light' | 'dark';
  soundEnabled: boolean;
  aiLevel: AiLevel;
  humanColor?: PieceColor;
}

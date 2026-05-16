import type {
  AiLevel,
  GameMode,
  Move,
  PieceColor,
  SavedGameState,
  SavedPreferences,
} from '@/lib/checkers/types';

const GAME_KEY = 'checkers-pro-game';
const PREFS_KEY = 'checkers-pro-prefs';
const LOCAL_HISTORY_KEY = 'checkers-pro-history';
const RECORDED_GAME_KEY = 'checkers-pro-recorded-game';

export interface LocalGameRecord {
  id: string;
  gameMode: SavedGameState['gameMode'];
  aiLevel: SavedGameState['aiLevel'];
  winner: PieceColor | 'draw' | null;
  moveCount: number;
  finishedAt: string;
}

export function loadPreferences(): Partial<SavedPreferences> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as SavedPreferences) : {};
  } catch {
    return {};
  }
}

export function savePreferences(prefs: SavedPreferences): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function loadSavedGame(): SavedGameState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GAME_KEY);
    return raw ? (JSON.parse(raw) as SavedGameState) : null;
  } catch {
    return null;
  }
}

export function saveGameState(state: SavedGameState): void {
  localStorage.setItem(GAME_KEY, JSON.stringify(state));
}

export function clearSavedGame(): void {
  localStorage.removeItem(GAME_KEY);
}

export function loadLocalHistory(): LocalGameRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as LocalGameRecord[]) : [];
  } catch {
    return [];
  }
}

export function appendLocalHistory(record: LocalGameRecord): void {
  const history = loadLocalHistory();
  const next = [record, ...history].slice(0, 50);
  localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(next));
}

export function buildFinishedGameKey(
  moves: Move[],
  winner: PieceColor,
  gameMode: GameMode,
  aiLevel: AiLevel,
  humanColor?: PieceColor
): string {
  const last = moves[moves.length - 1];
  const lastSig = last
    ? `${last.from.row},${last.from.col}->${last.to.row},${last.to.col}`
    : 'none';
  const side = humanColor ? `:human=${humanColor}` : '';
  return `${gameMode}:${aiLevel}:${winner}:${moves.length}:${lastSig}${side}`;
}

export function wasGameAlreadyRecorded(key: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(RECORDED_GAME_KEY) === key;
}

export function markGameRecorded(key: string): void {
  localStorage.setItem(RECORDED_GAME_KEY, key);
}

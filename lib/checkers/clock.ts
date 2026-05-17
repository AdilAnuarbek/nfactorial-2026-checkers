import type { PieceColor } from './types';

export const BLITZ_MS_PER_PLAYER = 3 * 60 * 1000;

export type TimeControl = 'standard' | 'blitz';

export interface PersistedClock {
  whiteMs: number;
  blackMs: number;
  turnStartedAt: number;
  matchStartedAt: number;
}

export function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}:${rm.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function opponentOf(color: PieceColor): PieceColor {
  return color === 'white' ? 'black' : 'white';
}

export function createInitialClock(blitz: boolean): PersistedClock {
  const now = Date.now();
  return {
    whiteMs: blitz ? BLITZ_MS_PER_PLAYER : 0,
    blackMs: blitz ? BLITZ_MS_PER_PLAYER : 0,
    turnStartedAt: now,
    matchStartedAt: now,
  };
}

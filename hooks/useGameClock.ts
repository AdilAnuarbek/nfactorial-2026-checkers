'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BLITZ_MS_PER_PLAYER,
  createInitialClock,
  opponentOf,
  type PersistedClock,
  type TimeControl,
} from '@/lib/checkers/clock';
import type { PieceColor } from '@/lib/checkers/types';

interface UseGameClockOptions {
  timeControl: TimeControl;
  currentPlayer: PieceColor;
  winner: PieceColor | null;
  paused?: boolean;
  restored?: PersistedClock | null;
  onTimeout: (winner: PieceColor) => void;
}

export function useGameClock({
  timeControl,
  currentPlayer,
  winner,
  paused = false,
  restored,
  onTimeout,
}: UseGameClockOptions) {
  const blitz = timeControl === 'blitz';
  const clockRef = useRef<PersistedClock>(
    restored ??
      createInitialClock(blitz)
  );
  const [tick, setTick] = useState(0);
  const timeoutFiredRef = useRef(false);

  const getDisplayMs = useCallback(
    (color: PieceColor) => {
      if (!blitz) return 0;
      const base =
        color === 'white' ? clockRef.current.whiteMs : clockRef.current.blackMs;
      if (winner || paused || currentPlayer !== color) return base;
      const elapsed = Date.now() - clockRef.current.turnStartedAt;
      return Math.max(0, base - elapsed);
    },
    [blitz, currentPlayer, winner, paused]
  );

  const onTurnEnd = useCallback(
    (playerWhoMoved: PieceColor) => {
      if (!blitz || winner) return;
      const now = Date.now();
      const elapsed = now - clockRef.current.turnStartedAt;
      if (playerWhoMoved === 'white') {
        clockRef.current.whiteMs = Math.max(0, clockRef.current.whiteMs - elapsed);
      } else {
        clockRef.current.blackMs = Math.max(0, clockRef.current.blackMs - elapsed);
      }
      clockRef.current.turnStartedAt = now;
    },
    [blitz, winner]
  );

  useEffect(() => {
    if (!blitz || winner || paused) return;

    const id = window.setInterval(() => {
      const activeRemaining = getDisplayMs(currentPlayer);
      if (activeRemaining <= 0 && !timeoutFiredRef.current) {
        timeoutFiredRef.current = true;
        if (currentPlayer === 'white') {
          clockRef.current.whiteMs = 0;
        } else {
          clockRef.current.blackMs = 0;
        }
        clockRef.current.turnStartedAt = Date.now();
        onTimeout(opponentOf(currentPlayer));
        return;
      }
      setTick(t => t + 1);
    }, 100);

    return () => window.clearInterval(id);
  }, [blitz, currentPlayer, winner, paused, getDisplayMs, onTimeout]);

  const getPersisted = useCallback((): PersistedClock => {
    if (!blitz) {
      return clockRef.current;
    }
    const now = Date.now();
    const elapsed =
      !winner && !paused ? now - clockRef.current.turnStartedAt : 0;
    const whiteMs =
      currentPlayer === 'white' && !winner
        ? Math.max(0, clockRef.current.whiteMs - elapsed)
        : clockRef.current.whiteMs;
    const blackMs =
      currentPlayer === 'black' && !winner
        ? Math.max(0, clockRef.current.blackMs - elapsed)
        : clockRef.current.blackMs;
    return {
      whiteMs,
      blackMs,
      turnStartedAt: now,
      matchStartedAt: clockRef.current.matchStartedAt,
    };
  }, [blitz, currentPlayer, winner, paused]);

  const resetClock = useCallback(() => {
    clockRef.current = createInitialClock(blitz);
    timeoutFiredRef.current = false;
    setTick(t => t + 1);
  }, [blitz]);

  const matchElapsedMs = Date.now() - clockRef.current.matchStartedAt;

  return {
    blitz,
    tick,
    whiteDisplayMs: getDisplayMs('white'),
    blackDisplayMs: getDisplayMs('black'),
    matchElapsedMs,
    onTurnEnd,
    getPersisted,
    resetClock,
    isLowTime: (color: PieceColor) =>
      blitz && getDisplayMs(color) > 0 && getDisplayMs(color) <= 30_000,
    initialBlitzMs: BLITZ_MS_PER_PLAYER,
  };
}

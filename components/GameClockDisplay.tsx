'use client';

import { Clock, Zap } from 'lucide-react';
import { formatClock, formatElapsed } from '@/lib/checkers/clock';
import type { PieceColor } from '@/lib/checkers/types';

interface GameClockDisplayProps {
  blitz: boolean;
  whiteMs: number;
  blackMs: number;
  matchElapsedMs: number;
  currentPlayer: PieceColor;
  isLowTime: (color: PieceColor) => boolean;
}

function ClockCard({
  label,
  ms,
  active,
  low,
}: {
  label: string;
  ms: number;
  active: boolean;
  low: boolean;
}) {
  return (
    <div
      className={`flex-1 rounded-xl border px-3 py-2.5 text-center transition ${
        active
          ? low
            ? 'border-red-400 bg-red-500/20 animate-pulse'
            : 'border-app-accent bg-app-accent/15 ring-1 ring-app-accent/40'
          : 'border-app-panel-border bg-app-panel-hover'
      }`}
    >
      <div className="text-xs font-medium text-app-muted">{label}</div>
      <div
        className={`font-mono text-xl font-bold tabular-nums sm:text-2xl ${
          low ? 'text-red-400' : active ? 'text-app-text' : 'text-app-muted'
        }`}
      >
        {formatClock(ms)}
      </div>
    </div>
  );
}

export default function GameClockDisplay({
  blitz,
  whiteMs,
  blackMs,
  matchElapsedMs,
  currentPlayer,
  isLowTime,
}: GameClockDisplayProps) {
  if (blitz) {
    return (
      <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 p-3 backdrop-blur-sm lg:p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-orange-200">
          <Zap className="h-4 w-4" />
          Блиц · 3 мин на игрока
        </div>
        <div className="flex gap-2">
          <ClockCard
            label="Белые"
            ms={whiteMs}
            active={currentPlayer === 'white'}
            low={isLowTime('white')}
          />
          <ClockCard
            label="Чёрные"
            ms={blackMs}
            active={currentPlayer === 'black'}
            low={isLowTime('black')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-app-panel-border bg-app-panel p-3 backdrop-blur-sm lg:p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm text-app-muted">
          <Clock className="h-4 w-4" />
          Время партии
        </span>
        <span className="font-mono text-lg font-bold tabular-nums text-app-text">
          {formatElapsed(matchElapsedMs)}
        </span>
      </div>
    </div>
  );
}

'use client';

import { ArrowLeft, Settings } from 'lucide-react';
import AppearanceControls from '@/components/AppearanceControls';
import type { AiLevel, PieceColor, TimeControl } from '@/lib/checkers/types';
import { Zap } from 'lucide-react';

interface GameControlsProps {
  onBack: () => void;
  gameMode: 'pvp' | 'ai' | 'online';
  aiLevel: AiLevel;
  humanColor?: PieceColor;
  timeControl?: TimeControl;
  onAiLevelChange: (level: AiLevel) => void;
}

export default function GameControls({
  onBack,
  gameMode,
  aiLevel,
  humanColor = 'white',
  timeControl = 'standard',
  onAiLevelChange,
}: GameControlsProps) {
  return (
    <div className="mb-2 shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-app-panel-border bg-app-panel px-3 py-2 backdrop-blur-sm sm:gap-4 sm:px-4 sm:py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg bg-app-panel-hover px-3 py-1.5 text-sm font-medium text-app-text transition-all sm:px-4 sm:py-2 sm:text-base"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Назад в меню</span>
        </button>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="text-app-text">
            <span className="text-sm text-app-muted">Режим: </span>
            <span className="font-bold">
              {gameMode === 'pvp'
                ? 'Игра вдвоём'
                : gameMode === 'online'
                  ? 'Онлайн'
                  : 'Против ИИ'}
            </span>
            {timeControl === 'blitz' && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-300">
                <Zap className="h-3 w-3" />
                Блиц
              </span>
            )}
          </div>

          {gameMode === 'ai' && (
            <>
              <div className="text-sm text-app-text">
                <span className="text-app-muted">Вы: </span>
                <span className="font-bold">
                  {humanColor === 'white' ? 'Белые' : 'Чёрные'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-app-accent" />
                <select
                  value={aiLevel}
                  onChange={e => onAiLevelChange(e.target.value as AiLevel)}
                  className="app-input px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="easy">Легко</option>
                  <option value="medium">Средне</option>
                  <option value="hard">Сложно</option>
                </select>
              </div>
            </>
          )}
        </div>

        <AppearanceControls compact />
      </div>
    </div>
  );
}

'use client';

import { Bot, X, Zap } from 'lucide-react';
import type { AiLevel, PieceColor } from '@/lib/checkers/types';

interface AiMatchSetupProps {
  aiLevel: AiLevel;
  humanColor: PieceColor;
  blitz?: boolean;
  onAiLevelChange: (level: AiLevel) => void;
  onHumanColorChange: (color: PieceColor) => void;
  onStart: () => void;
  onCancel: () => void;
}

function ColorOption({
  color,
  label,
  selected,
  onSelect,
}: {
  color: PieceColor;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-4 transition ${
        selected
          ? 'border-app-accent bg-app-accent/15'
          : 'border-app-panel-border bg-app-panel hover:bg-app-panel-hover'
      }`}
    >
      <span
        className={`h-10 w-10 rounded-full border-2 shadow-md ${
          color === 'white'
            ? 'border-gray-400 bg-gradient-to-br from-gray-100 to-gray-300'
            : 'border-gray-950 bg-gradient-to-br from-gray-700 to-gray-900'
        }`}
      />
      <span className="text-sm font-semibold text-app-text">{label}</span>
      {color === 'white' ? (
        <span className="text-xs text-app-muted">Ходите первыми</span>
      ) : (
        <span className="text-xs text-app-muted">ИИ ходит первым</span>
      )}
    </button>
  );
}

export default function AiMatchSetup({
  aiLevel,
  humanColor,
  blitz = false,
  onAiLevelChange,
  onHumanColorChange,
  onStart,
  onCancel,
}: AiMatchSetupProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-setup-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-app-panel-border bg-app-panel p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-500/20 p-2">
              <Bot className="h-6 w-6 text-app-accent" />
            </div>
            <div>
              <h2
                id="ai-setup-title"
                className="text-xl font-bold text-app-text"
              >
                {blitz ? 'Блиц против ИИ' : 'Игра против ИИ'}
              </h2>
              <p className="text-sm text-app-muted">
                {blitz ? (
                  <span className="inline-flex items-center gap-1 text-orange-300">
                    <Zap className="h-3.5 w-3.5" />
                    3 минуты на каждого
                  </span>
                ) : (
                  'Настройте партию'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-app-muted transition hover:bg-app-panel-hover hover:text-app-text"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-sm font-medium text-app-muted">
            Сложность
          </label>
          <select
            value={aiLevel}
            onChange={e => onAiLevelChange(e.target.value as AiLevel)}
            className="app-input w-full"
          >
            <option value="easy">Легко</option>
            <option value="medium">Средне</option>
            <option value="hard">Сложно</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-app-muted">
            Играть за
          </label>
          <div className="flex gap-3">
            <ColorOption
              color="white"
              label="Белые"
              selected={humanColor === 'white'}
              onSelect={() => onHumanColorChange('white')}
            />
            <ColorOption
              color="black"
              label="Чёрные"
              selected={humanColor === 'black'}
              onSelect={() => onHumanColorChange('black')}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-app-panel-border py-2.5 text-sm font-medium text-app-muted transition hover:bg-app-panel-hover"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onStart}
            className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            Начать игру
          </button>
        </div>
      </div>
    </div>
  );
}

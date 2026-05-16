'use client';

import { ArrowLeft, Settings, Moon, Sun } from 'lucide-react';
import { useState } from 'react';

interface GameControlsProps {
  onBack: () => void;
  gameMode: 'pvp' | 'ai';
  aiLevel: 'easy' | 'medium' | 'hard';
  onAiLevelChange: (level: 'easy' | 'medium' | 'hard') => void;
}

export default function GameControls({
  onBack,
  gameMode,
  aiLevel,
  onAiLevelChange,
}: GameControlsProps) {
  const [isDark, setIsDark] = useState(true);

  return (
    <div className="mb-2 shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 px-3 py-2 sm:gap-4 sm:px-4 sm:py-2.5">
        {/* Кнопка назад */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white text-sm font-medium sm:px-4 sm:py-2 sm:text-base"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Назад в меню</span>
        </button>

        {/* Режим игры */}
        <div className="flex items-center gap-4">
          <div className="text-white">
            <span className="text-purple-200 text-sm">Режим: </span>
            <span className="font-bold">
              {gameMode === 'pvp' ? 'Игра вдвоём' : 'Против ИИ'}
            </span>
          </div>

          {/* Настройки ИИ */}
          {gameMode === 'ai' && (
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-300" />
              <select
                value={aiLevel}
                onChange={(e) => onAiLevelChange(e.target.value as any)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="easy" className="bg-gray-800">Легко</option>
                <option value="medium" className="bg-gray-800">Средне</option>
                <option value="hard" className="bg-gray-800">Сложно</option>
              </select>
            </div>
          )}
        </div>

        {/* Тема (для будущей реализации) */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
          title="Переключить тему"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-yellow-300" />
          ) : (
            <Moon className="w-5 h-5 text-purple-300" />
          )}
        </button>
      </div>
    </div>
  );
}
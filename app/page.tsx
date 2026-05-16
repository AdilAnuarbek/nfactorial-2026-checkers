'use client';

import { useState } from 'react';
import CheckersBoard from '@/components/CheckersBoard';
import GameControls from '@/components/GameControls';
import { Crown, Sparkles } from 'lucide-react';

export default function Home() {
  const [gameMode, setGameMode] = useState<'pvp' | 'ai' | null>(null);
  const [aiLevel, setAiLevel] = useState<'easy' | 'medium' | 'hard'>('medium');

  if (!gameMode) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Crown className="w-12 h-12 text-yellow-400" />
              <h1 className="text-6xl font-bold text-white">Шашки Pro</h1>
              <Sparkles className="w-12 h-12 text-purple-400" />
            </div>
            <p className="text-xl text-purple-200">
              Современная платформа для игры в шашки
            </p>
          </div>

          {/* Game Mode Selection */}
          <div className="grid gap-6">
            <button
              onClick={() => setGameMode('pvp')}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-left transition-all hover:scale-105 hover:shadow-2xl"
            >
              <div className="relative z-10">
                <h2 className="text-3xl font-bold text-white mb-2">
                  Игра вдвоём
                </h2>
                <p className="text-blue-100">
                  Играйте с другом на одном устройстве
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>

            <button
              onClick={() => setGameMode('ai')}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-left transition-all hover:scale-105 hover:shadow-2xl"
            >
              <div className="relative z-10">
                <h2 className="text-3xl font-bold text-white mb-2">
                  Игра против ИИ
                </h2>
                <p className="text-purple-100">
                  Тренируйтесь с умным противником
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </div>

          {/* Features */}
          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4">
              <div className="text-2xl font-bold text-yellow-400">3</div>
              <div className="text-sm text-purple-200">Уровня ИИ</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4">
              <div className="text-2xl font-bold text-green-400">100%</div>
              <div className="text-sm text-purple-200">Бесплатно</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4">
              <div className="text-2xl font-bold text-blue-400">∞</div>
              <div className="text-sm text-purple-200">Партий</div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-3 pb-2 pt-3">
      <div className="mx-auto flex min-h-0 w-full max-w-[1760px] flex-1 flex-col">
        <GameControls
          onBack={() => setGameMode(null)}
          gameMode={gameMode}
          aiLevel={aiLevel}
          onAiLevelChange={setAiLevel}
        />
        <CheckersBoard gameMode={gameMode} aiLevel={aiLevel} />
      </div>
    </main>
  );
}
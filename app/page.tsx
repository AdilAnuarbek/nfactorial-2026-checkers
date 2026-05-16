'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CheckersBoard from '@/components/CheckersBoard';
import GameControls from '@/components/GameControls';
import AuthPanel from '@/components/AuthPanel';
import GameHistoryPanel from '@/components/GameHistoryPanel';
import AppearanceControls from '@/components/AppearanceControls';
import AiMatchSetup from '@/components/AiMatchSetup';
import { useApp } from '@/context/AppProviders';
import type { AiLevel, GameMode, PieceColor, SavedGameState } from '@/lib/checkers/types';
import {
  clearSavedGame,
  loadSavedGame,
  saveGameState,
} from '@/lib/storage';
import { createRoom, isSupabaseConfigured } from '@/lib/multiplayer/rooms';
import {
  getDefaultPlayerName,
  saveDefaultPlayerName,
  saveRoomSession,
} from '@/lib/multiplayer/session';
import { Crown, Sparkles, Link2 } from 'lucide-react';
import CityLeaderboard from '@/components/CityLeaderboard';

export default function Home() {
  const router = useRouter();
  const { defaultAiLevel, setDefaultAiLevel, defaultHumanColor, setDefaultHumanColor } =
    useApp();
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [aiLevel, setAiLevel] = useState<AiLevel>(defaultAiLevel);
  const [humanColor, setHumanColor] = useState<PieceColor>(defaultHumanColor);
  const [showAiSetup, setShowAiSetup] = useState(false);
  const [resumeOffer, setResumeOffer] = useState<SavedGameState | null>(null);
  const [restoredGame, setRestoredGame] = useState<SavedGameState | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [creatingRoom, setCreatingRoom] = useState(false);

  useEffect(() => {
    setAiLevel(defaultAiLevel);
  }, [defaultAiLevel]);

  useEffect(() => {
    setHumanColor(defaultHumanColor);
  }, [defaultHumanColor]);

  const refreshResumeOffer = useCallback(() => {
    const saved = loadSavedGame();
    setResumeOffer(saved && !saved.winner ? saved : null);
  }, []);

  useEffect(() => {
    if (gameMode === null) {
      refreshResumeOffer();
    }
  }, [gameMode, refreshResumeOffer]);

  const handleAiLevelChange = useCallback(
    (level: AiLevel) => {
      setAiLevel(level);
      setDefaultAiLevel(level);
    },
    [setDefaultAiLevel]
  );

  const startMode = (
    mode: GameMode,
    fromSaved?: SavedGameState | null,
    color?: PieceColor
  ) => {
    setGameMode(mode);
    if (fromSaved) {
      setRestoredGame(fromSaved);
      setAiLevel(fromSaved.aiLevel);
      if (fromSaved.humanColor) setHumanColor(fromSaved.humanColor);
    } else {
      setRestoredGame(null);
      clearSavedGame();
      if (mode === 'ai' && color) {
        setHumanColor(color);
        setDefaultHumanColor(color);
      }
    }
    setResumeOffer(null);
    setShowAiSetup(false);
  };

  const handleCreateOnlineRoom = async () => {
    if (!isSupabaseConfigured) {
      alert('Добавьте NEXT_PUBLIC_SUPABASE_URL и ANON_KEY в .env');
      return;
    }
    setCreatingRoom(true);
    const name = getDefaultPlayerName();
    saveDefaultPlayerName(name);
    const room = await createRoom(name);
    if (!room) {
      alert('Не удалось создать комнату. Проверьте Supabase и таблицу game_rooms.');
      setCreatingRoom(false);
      return;
    }
    const token = room.host_token;
    saveRoomSession({
      roomId: room.id,
      role: 'host',
      playerToken: token,
      playerName: name,
    });
    router.push(`/room/${room.id}`);
  };

  if (!gameMode) {
    return (
      <main className="app-shell relative flex min-h-screen items-center justify-center overflow-y-auto p-4">
        <AppearanceControls className="absolute right-4 top-4" />

        <div className="my-8 w-full max-w-2xl">
          <div className="mb-8 text-center animate-fade-in">
            <div className="mb-4 flex items-center justify-center gap-3">
              <h1 className="text-5xl font-bold text-app-text sm:text-6xl">
                Шашки Pro
              </h1>
            </div>
            <p className="text-lg text-app-muted sm:text-xl">
              Современная платформа для игры в шашки
            </p>
          </div>

          {resumeOffer && (
            <div className="mb-6 rounded-2xl border border-amber-400/40 bg-amber-500/20 p-4 backdrop-blur-sm">
              <p className="mb-3 text-sm text-app-text">
                Есть незавершённая партия (
                {resumeOffer.gameMode === 'pvp' ? 'вдвоём' : 'против ИИ'}
                {resumeOffer.gameMode === 'ai' &&
                  resumeOffer.humanColor &&
                  ` · ${resumeOffer.humanColor === 'white' ? 'белые' : 'чёрные'}`}
                , {resumeOffer.moveHistory.length} ходов). Продолжить?
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startMode(resumeOffer.gameMode, resumeOffer)}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white"
                >
                  Продолжить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearSavedGame();
                    setResumeOffer(null);
                  }}
                  className="rounded-lg border border-app-panel-border px-4 py-2 text-sm text-app-muted"
                >
                  Начать заново
                </button>
              </div>
            </div>
          )}

          <div className="mb-8 grid gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => startMode('pvp')}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-left transition-all hover:scale-[1.02] hover:shadow-2xl sm:p-8"
            >
              <h2 className="mb-2 text-2xl font-bold text-white sm:text-3xl">
                Игра вдвоём
              </h2>
              <p className="text-blue-100">Играйте с другом на одном устройстве</p>
            </button>

            <button
              type="button"
              onClick={() => setShowAiSetup(true)}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-left transition-all hover:scale-[1.02] hover:shadow-2xl sm:p-8"
            >
              <h2 className="mb-2 text-2xl font-bold text-white sm:text-3xl">
                Игра против ИИ
              </h2>
              <p className="text-purple-100">
                Тренируйтесь с умным противником
              </p>
            </button>

            <button
              type="button"
              disabled={creatingRoom}
              onClick={() => void handleCreateOnlineRoom()}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-left transition-all hover:scale-[1.02] hover:shadow-2xl disabled:opacity-60 sm:p-8"
            >
              <div className="flex items-center gap-2">
                <Link2 className="h-7 w-7 text-white/90" />
                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                  Игра по ссылке
                </h2>
              </div>
              <p className="mt-2 text-emerald-100">
                {creatingRoom
                  ? 'Создаём комнату…'
                  : 'Онлайн с другом · WebSocket · можно вернуться'}
              </p>
            </button>
          </div>

          <div className="mb-8">
            <AuthPanel />
          </div>

          <GameHistoryPanel refreshKey={historyVersion} />

          <div className="mt-6">
            <CityLeaderboard />
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 text-center sm:gap-4">
            <div className="rounded-xl border border-app-panel-border bg-app-panel p-3 backdrop-blur-sm sm:p-4">
              <div className="text-xl font-bold text-yellow-400 sm:text-2xl">3</div>
              <div className="text-xs text-app-muted sm:text-sm">Уровня ИИ</div>
            </div>
            <div className="rounded-xl border border-app-panel-border bg-app-panel p-3 backdrop-blur-sm sm:p-4">
              <div className="text-xl font-bold text-green-400 sm:text-2xl">100%</div>
              <div className="text-xs text-app-muted sm:text-sm">Бесплатно</div>
            </div>
            <div className="rounded-xl border border-app-panel-border bg-app-panel p-3 backdrop-blur-sm sm:p-4">
              <div className="text-xl font-bold text-blue-400 sm:text-2xl">∞</div>
              <div className="text-xs text-app-muted sm:text-sm">Партий</div>
            </div>
          </div>
        </div>

        {showAiSetup && (
          <AiMatchSetup
            aiLevel={aiLevel}
            humanColor={humanColor}
            onAiLevelChange={handleAiLevelChange}
            onHumanColorChange={setHumanColor}
            onStart={() => startMode('ai', null, humanColor)}
            onCancel={() => setShowAiSetup(false)}
          />
        )}
      </main>
    );
  }

  return (
    <main className="app-shell flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden px-3 pb-2 pt-3">
      <div className="mx-auto flex min-h-0 w-full max-w-[1760px] flex-1 flex-col">
        <GameControls
          onBack={() => {
            setRestoredGame(null);
            setGameMode(null);
          }}
          gameMode={gameMode}
          aiLevel={aiLevel}
          humanColor={humanColor}
          onAiLevelChange={handleAiLevelChange}
        />
        <CheckersBoard
          key={`${restoredGame?.savedAt ?? 'new'}-${humanColor}`}
          gameMode={gameMode}
          aiLevel={aiLevel}
          humanColor={humanColor}
          restoredState={restoredGame}
          onPersist={state => {
            if (!state.winner) saveGameState(state);
            else clearSavedGame();
          }}
          onGameEnd={() => {
            refreshResumeOffer();
            setHistoryVersion(v => v + 1);
          }}
        />
      </div>
    </main>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { fetchRemoteHistory } from '@/lib/games';
import { loadLocalHistory, type LocalGameRecord } from '@/lib/storage';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function winnerLabel(winner: string | null) {
  if (winner === 'white') return 'Белые';
  if (winner === 'black') return 'Черные';
  return '—';
}

export default function GameHistoryPanel({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const { user, configured } = useAuth();
  const [local, setLocal] = useState<LocalGameRecord[]>([]);
  const [remote, setRemote] = useState<
    {
      id: string;
      game_mode: string;
      ai_level: string | null;
      winner: string | null;
      move_count: number;
      created_at: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLocal(loadLocalHistory());
    if (user) {
      setLoading(true);
      const data = await fetchRemoteHistory(user.id);
      setRemote(data);
      setLoading(false);
    } else {
      setRemote([]);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  const items = user && remote.length > 0 ? remote : local;
  const isRemote = Boolean(user && remote.length > 0);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-app-panel-border bg-app-panel p-4 backdrop-blur-sm">
        <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-app-text">
          <History className="h-5 w-5 text-app-accent" />
          История партий
        </h3>
        <p className="text-sm text-app-muted">
          Сыграйте партию — она появится здесь
          {configured && !user && ' (войдите для синхронизации в облако)'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-app-panel-border bg-app-panel p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold text-app-text">
          <History className="h-5 w-5 text-app-accent" />
          История партий
        </h3>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-xs text-app-muted hover:text-app-text"
        >
          Обновить
        </button>
      </div>
      {loading && (
        <p className="mb-2 text-xs text-app-muted">Загрузка из облака…</p>
      )}
      <p className="mb-2 text-xs text-app-muted">
        {isRemote ? 'Синхронизировано с аккаунтом' : 'Локально на устройстве'}
      </p>
      <ul className="max-h-40 space-y-2 overflow-y-auto">
        {items.map(item => {
          const isRemoteItem = 'created_at' in item;
          const date = isRemoteItem ? item.created_at : item.finishedAt;
          const gameMode = isRemoteItem ? item.game_mode : item.gameMode;
          const aiLevel = isRemoteItem ? item.ai_level : item.aiLevel;
          const moveCount = isRemoteItem ? item.move_count : item.moveCount;
          const mode = gameMode === 'ai' ? 'vs ИИ' : 'PvP';
          const level = aiLevel ? ` · ${aiLevel}` : '';

          return (
            <li
              key={item.id}
              className="rounded-lg bg-app-panel-hover px-3 py-2 text-xs text-app-muted"
            >
              <span className="font-medium text-app-text">
                {winnerLabel(item.winner)} · {moveCount} ходов
              </span>
              <br />
              {mode}
              {level} · {formatDate(date)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

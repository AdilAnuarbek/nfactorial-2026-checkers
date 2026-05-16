'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Copy,
  Check,
  Link2,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import CheckersBoard from '@/components/CheckersBoard';
import AppearanceControls from '@/components/AppearanceControls';
import type { Move, PieceColor } from '@/lib/checkers/types';
import {
  applyRoomMove,
  fetchRoom,
  getMyColor,
  getOpponentOnline,
  getRoomShareUrl,
  heartbeat,
  isSupabaseConfigured,
  reconnectToRoom,
  subscribeToRoom,
  type GameRoom,
} from '@/lib/multiplayer/rooms';
import {
  createPlayerToken,
  getDefaultPlayerName,
  loadRoomSession,
  saveDefaultPlayerName,
  saveRoomSession,
  type RoomSession,
} from '@/lib/multiplayer/session';

interface MultiplayerRoomProps {
  roomId: string;
}

export default function MultiplayerRoom({ roomId }: MultiplayerRoomProps) {
  const router = useRouter();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [session, setSession] = useState<RoomSession | null>(null);
  const [playerName, setPlayerName] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    setPlayerName(getDefaultPlayerName());
  }, []);

  const shareUrl = useMemo(() => getRoomShareUrl(roomId), [roomId]);

  const applySession = useCallback(async (existing: RoomSession | null) => {
    if (!isSupabaseConfigured) {
      setError('Настройте Supabase в .env для мультиплеера');
      setLoading(false);
      return;
    }

    if (existing && existing.roomId === roomId) {
      const result = await reconnectToRoom(
        roomId,
        existing.playerToken,
        existing.playerName
      );
      if (result) {
        setRoom(result.room);
        setSession(existing);
        setLoading(false);
        return;
      }
    }

    const fetched = await fetchRoom(roomId);
    if (!fetched) {
      setError('Комната не найдена');
      setLoading(false);
      return;
    }

    setRoom(fetched);
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    const saved = loadRoomSession(roomId);
    void applySession(saved);
  }, [roomId, applySession]);

  useEffect(() => {
    if (!room) return;
    const unsub = subscribeToRoom(roomId, updated => setRoom(updated));
    return () => unsub?.();
  }, [roomId, room?.id]);

  useEffect(() => {
    if (!session || !room) return;
    void heartbeat(roomId, session.role);
    const id = window.setInterval(() => {
      void heartbeat(roomId, session.role);
    }, 15_000);
    return () => window.clearInterval(id);
  }, [roomId, session, room?.id]);

  const handleJoin = async () => {
    if (!playerName.trim()) return;
    setJoining(true);
    saveDefaultPlayerName(playerName.trim());

    const saved = loadRoomSession(roomId);
    const token = saved?.playerToken ?? createPlayerToken();

    const result = await reconnectToRoom(roomId, token, playerName.trim());
    if (!result) {
      setError('Не удалось войти в комнату (возможно, она уже занята)');
      setJoining(false);
      return;
    }

    const newSession: RoomSession = {
      roomId,
      role: result.role,
      playerToken: token,
      playerName: playerName.trim(),
    };
    saveRoomSession(newSession);
    setSession(newSession);
    setRoom(result.room);
    setError(null);
    setJoining(false);
  };

  const handleMove = useCallback(
    async (move: Move) => {
      if (!session || !room) return false;
      const updated = await applyRoomMove(
        roomId,
        session.role,
        move,
        room.version
      );
      if (updated) setRoom(updated);
      return Boolean(updated);
    },
    [session, room, roomId]
  );

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center p-4">
        <p className="text-app-muted">Подключение к комнате…</p>
      </main>
    );
  }

  if (error && !room) {
    return (
      <main className="app-shell flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-center text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="rounded-lg bg-app-accent px-4 py-2 text-white"
        >
          На главную
        </button>
      </main>
    );
  }

  if (!room) return null;

  if (!session) {
    const isFull = Boolean(room.guest_token && room.status !== 'waiting');
    return (
      <main className="app-shell relative flex min-h-screen items-center justify-center p-4">
        <AppearanceControls className="absolute right-4 top-4" />
        <div className="w-full max-w-md rounded-2xl border border-app-panel-border bg-app-panel p-6">
          <h1 className="mb-2 text-xl font-bold text-app-text">Комната онлайн</h1>
          <p className="mb-4 text-sm text-app-muted">
            {isFull
              ? 'Комната занята. Если вы играли здесь раньше — введите то же имя на этом устройстве.'
              : 'Введите имя и присоединяйтесь. Ссылку можно отправить другу.'}
          </p>
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            className="app-input mb-4 w-full"
            placeholder="Ваше имя"
            maxLength={24}
          />
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
          <button
            type="button"
            disabled={joining}
            onClick={() => void handleJoin()}
            className="mb-3 w-full rounded-xl bg-app-accent py-2.5 font-medium text-white disabled:opacity-50"
          >
            {joining ? 'Вход…' : isFull ? 'Вернуться в игру' : 'Присоединиться'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full text-sm text-app-muted hover:text-app-text"
          >
            На главную
          </button>
        </div>
      </main>
    );
  }

  const myColor = getMyColor(room, session.role);
  const opponentName =
    session.role === 'host' ? room.guest_name : room.host_name;
  const opponentOnline = getOpponentOnline(room, session.role);
  const isMyTurn = room.current_player === myColor && room.status === 'playing';
  const waitingForGuest = session.role === 'host' && !room.guest_token;

  return (
    <main className="app-shell flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden px-3 pb-2 pt-3">
      <div className="mx-auto flex min-h-0 w-full max-w-[1760px] flex-1 flex-col">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-app-panel-border bg-app-panel px-3 py-2 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-2 rounded-lg bg-app-panel-hover px-3 py-1.5 text-sm text-app-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Меню
          </button>

          <div className="flex flex-wrap items-center gap-3 text-sm text-app-text">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4 text-app-accent" />
              {session.role === 'host' ? 'Хост' : 'Гость'} ·{' '}
              {myColor === 'white' ? 'белые' : 'чёрные'}
            </span>
            {opponentName ? (
              <span
                className={`flex items-center gap-1 ${
                  opponentOnline ? 'text-green-400' : 'text-amber-400'
                }`}
              >
                {opponentOnline ? (
                  <Wifi className="h-4 w-4" />
                ) : (
                  <WifiOff className="h-4 w-4" />
                )}
                {opponentName}
                {!opponentOnline && ' (офлайн)'}
              </span>
            ) : (
              <span className="text-app-muted">Ждём соперника…</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="flex items-center gap-1 rounded-lg border border-app-panel-border px-2 py-1.5 text-xs text-app-text hover:bg-app-panel-hover"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Ссылка
            </button>
            <AppearanceControls compact />
          </div>
        </div>

        {waitingForGuest && (
          <div className="mb-2 rounded-xl border border-blue-400/30 bg-blue-500/15 px-4 py-3 text-center text-sm text-blue-200">
            <Link2 className="mx-auto mb-1 h-5 w-5" />
            Отправьте ссылку другу. Когда он откроет её, партия начнётся автоматически.
            <button
              type="button"
              onClick={() => void copyLink()}
              className="mt-2 block w-full rounded-lg bg-blue-600/40 py-1.5 text-xs font-medium text-white"
            >
              Скопировать ссылку
            </button>
          </div>
        )}

        {!opponentOnline && room.guest_token && room.status === 'playing' && (
          <div className="mb-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-100">
            Соперник отключился — можно подождать: при возврате по ссылке игра продолжится.
          </div>
        )}

        {room.status === 'playing' && !waitingForGuest && (
          <div className="mb-2 text-center text-sm text-app-muted">
            {isMyTurn ? (
              <span className="font-medium text-green-400">Ваш ход</span>
            ) : opponentOnline ? (
              'Ход соперника…'
            ) : (
              'Ожидание соперника'
            )}
          </div>
        )}

        {(room.status === 'playing' || room.status === 'finished') &&
          room.guest_token && (
            <CheckersBoard
              key={room.id}
              gameMode="online"
              aiLevel="medium"
              humanColor={myColor}
              onlinePlay={{
                myColor,
                syncVersion: room.version,
                synced: {
                  board: room.board,
                  currentPlayer: room.current_player,
                  moveHistory: room.move_history,
                  winner: room.winner,
                },
                onMove: handleMove,
                disabled:
                  room.status !== 'playing' ||
                  !opponentOnline ||
                  !isMyTurn ||
                  waitingForGuest,
              }}
            />
          )}
      </div>
    </main>
  );
}

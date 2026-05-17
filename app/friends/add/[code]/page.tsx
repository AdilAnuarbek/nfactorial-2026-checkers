'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, UserPlus, X } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { addFriendByCode, findProfileByFriendCode } from '@/lib/friends';
import type { FriendProfile } from '@/lib/friends';

export default function AddFriendPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { user, loading } = useAuth();
  const [code, setCode] = useState('');
  const [inviter, setInviter] = useState<FriendProfile | null>(null);
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'success' | 'error'
  >('loading');
  const [message, setMessage] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void params.then(p => setCode(p.code.toLowerCase()));
  }, [params]);

  useEffect(() => {
    if (!code) return;
    void findProfileByFriendCode(code).then(p => {
      if (!p) {
        setStatus('error');
        setMessage('Ссылка недействительна или пользователь не найден');
      } else {
        setInviter(p);
        setStatus('ready');
      }
    });
  }, [code]);

  const handleAdd = async () => {
    if (!user || !code) return;
    setAdding(true);
    const result = await addFriendByCode(user.id, code);
    setAdding(false);
    if (result.ok) {
      setStatus('success');
      setMessage(
        `${result.friend.display_name || 'Игрок'} добавлен в друзья!`
      );
    } else {
      setStatus('error');
      setMessage(result.error);
    }
  };

  if (loading || (status === 'loading' && code)) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center">
        <p className="text-app-muted">Загрузка…</p>
      </main>
    );
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-app-panel-border bg-app-panel p-6 text-center">
        {status === 'success' ? (
          <>
            <Check className="mx-auto mb-3 h-12 w-12 text-green-400" />
            <h1 className="mb-2 text-xl font-bold text-app-text">Готово!</h1>
            <p className="mb-6 text-sm text-app-muted">{message}</p>
            <Link
              href="/profile"
              className="inline-block rounded-xl bg-app-accent px-6 py-2.5 text-sm font-medium text-white"
            >
              Перейти в профиль
            </Link>
          </>
        ) : status === 'error' ? (
          <>
            <X className="mx-auto mb-3 h-12 w-12 text-red-400" />
            <h1 className="mb-2 text-xl font-bold text-app-text">Ошибка</h1>
            <p className="mb-6 text-sm text-app-muted">{message}</p>
            <Link href="/" className="text-sm text-app-accent">
              На главную
            </Link>
          </>
        ) : inviter ? (
          <>
            <UserPlus className="mx-auto mb-3 h-12 w-12 text-app-accent" />
            <h1 className="mb-2 text-xl font-bold text-app-text">
              Добавить в друзья?
            </h1>
            <p className="mb-1 text-lg font-medium text-app-text">
              {inviter.display_name || 'Игрок'}
            </p>
            <p className="mb-6 text-sm text-app-muted">
              {inviter.city ?? 'Город не указан'} · {inviter.wins}П /{' '}
              {inviter.losses}П
            </p>
            {user ? (
              <button
                type="button"
                disabled={adding}
                onClick={() => void handleAdd()}
                className="mb-3 w-full rounded-xl bg-app-accent py-2.5 font-medium text-white disabled:opacity-50"
              >
                {adding ? 'Добавляем…' : 'Добавить в друзья'}
              </button>
            ) : (
              <Link
                href="/"
                className="mb-3 block w-full rounded-xl border border-app-panel-border py-2.5 text-sm font-medium text-app-text hover:bg-app-panel-hover"
              >
                Войти на главной, чтобы добавить
              </Link>
            )}
            <Link href="/" className="text-sm text-app-muted hover:text-app-text">
              Отмена
            </Link>
          </>
        ) : null}
      </div>
    </main>
  );
}

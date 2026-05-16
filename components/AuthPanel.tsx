'use client';

import { useState } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { CITIES } from '@/lib/constants';

export default function AuthPanel({ compact = false }: { compact?: boolean }) {
  const { user, profile, loading, configured, signIn, signUp, signOut } =
    useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!configured) {
    if (compact) return null;
    return (
      <p className="text-center text-sm text-app-muted">
        Облако: добавьте{' '}
        <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_SUPABASE_*</code>{' '}
        для входа и синхронизации истории
      </p>
    );
  }

  if (loading) {
    return <div className="text-sm text-app-muted">Загрузка аккаунта…</div>;
  }

  if (user) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-app-panel-border bg-app-panel px-3 py-2 text-sm text-app-text">
          <User className="h-4 w-4 text-app-accent" />
          <span>
            {profile?.display_name || user.email}
            {profile && (
              <span className="ml-2 text-app-muted">
                {profile.wins}W / {profile.losses}L
              </span>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="flex items-center gap-2 rounded-xl border border-app-panel-border bg-app-panel px-3 py-2 text-sm text-app-text transition hover:bg-app-panel-hover"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mx-auto flex items-center gap-2 rounded-xl border border-app-panel-border bg-app-panel px-4 py-2.5 text-sm font-medium text-app-text transition hover:bg-app-panel-hover"
        >
          <LogIn className="h-4 w-4 text-app-accent" />
          Войти / сохранить прогресс
        </button>
      ) : (
        <form
          className="space-y-3 rounded-2xl border border-app-panel-border bg-app-panel p-4 backdrop-blur-sm"
          onSubmit={async e => {
            e.preventDefault();
            setError('');
            setMessage('');
            
            // Валидация города при регистрации
            if (mode === 'register' && !CITIES.includes(city)) {
              setError('Пожалуйста, выберите город из предложенного списка.');
              return;
            }

            setSubmitting(true);
            
            // Передаем параметр city в функцию signUp!
            const err =
              mode === 'login'
                ? await signIn(email, password)
                : await signUp(email, password, displayName, city); 
                
            setSubmitting(false);
            if (err) {
              setError(err);
            } else if (mode === 'register') {
              setMessage(
                'Проверьте почту для подтверждения (если включено в Supabase)'
              );
            } else {
              setOpen(false);
            }
          }}
        >
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 rounded-lg py-1.5 ${
                mode === 'login' ? 'bg-app-accent text-white' : 'text-app-muted'
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 rounded-lg py-1.5 ${
                mode === 'register'
                  ? 'bg-app-accent text-white'
                  : 'text-app-muted'
              }`}
            >
              Регистрация
            </button>
          </div>

          {mode === 'register' && (
            <>
              <input
                type="text"
                placeholder="Имя"
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="app-input w-full"
              />
              <div className="relative">
                <input
                  type="text"
                  list="city-list"
                  placeholder="Ваш город (начните вводить...)"
                  required
                  value={city}
                  onChange={e => {
                    setCity(e.target.value);
                    setError('');
                  }}
                  className="app-input w-full"
                />
                <datalist id="city-list">
                  {CITIES.map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </>
          )}
          
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="app-input w-full"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Пароль (мин. 6)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="app-input w-full"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-green-400">{message}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-lg border border-app-panel-border py-2 text-sm text-app-muted"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-app-accent py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? '…' : mode === 'login' ? 'Войти' : 'Создать'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
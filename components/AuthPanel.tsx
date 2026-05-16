'use client';

import { useState } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { CITIES } from '@/lib/constants';

// Иконка Google (SVG, без внешних зависимостей)
function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function AuthPanel({ compact = false }: { compact?: boolean }) {
  const { user, profile, loading, configured, signIn, signUp, signInWithGoogle, signOut } =
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
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    const err = await signInWithGoogle();
    // Если ошибка — показываем, иначе страница сама перенаправится
    if (err) {
      setError(err);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {!open ? (
        <div className="flex flex-col items-center gap-3">
          {/* Кнопка Google — показываем сразу, без раскрытия формы */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="mx-auto flex w-full max-w-xs items-center justify-center gap-2.5 rounded-xl border border-app-panel-border bg-app-panel px-4 py-2.5 text-sm font-medium text-app-text transition hover:bg-app-panel-hover disabled:opacity-50"
          >
            <GoogleIcon />
            {googleLoading ? 'Перенаправление…' : 'Войти через Google'}
          </button>

          {/* Разделитель */}
          <div className="flex w-full max-w-xs items-center gap-3">
            <div className="h-px flex-1 bg-app-panel-border" />
            <span className="text-xs text-app-muted">или</span>
            <div className="h-px flex-1 bg-app-panel-border" />
          </div>

          {/* Обычный вход через email */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mx-auto flex items-center gap-2 rounded-xl border border-app-panel-border bg-app-panel px-4 py-2.5 text-sm font-medium text-app-text transition hover:bg-app-panel-hover"
          >
            <LogIn className="h-4 w-4 text-app-accent" />
            Войти через Email
          </button>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      ) : (
        <form
          className="space-y-3 rounded-2xl border border-app-panel-border bg-app-panel p-4 backdrop-blur-sm"
          onSubmit={async e => {
            e.preventDefault();
            setError('');
            setMessage('');

            if (mode === 'register' && !CITIES.includes(city)) {
              setError('Пожалуйста, выберите город из предложенного списка.');
              return;
            }

            setSubmitting(true);
            const err =
              mode === 'login'
                ? await signIn(email, password)
                : await signUp(email, password, displayName, city);
            setSubmitting(false);
            if (err) {
              setError(err);
            } else if (mode === 'register') {
              setMessage('Проверьте почту для подтверждения (если включено в Supabase)');
            } else {
              setOpen(false);
            }
          }}
        >
          {/* Кнопка Google внутри формы тоже */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-app-panel-border bg-app-panel-hover px-4 py-2.5 text-sm font-medium text-app-text transition hover:brightness-110 disabled:opacity-50"
          >
            <GoogleIcon />
            {googleLoading ? 'Перенаправление…' : 'Войти через Google'}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-app-panel-border" />
            <span className="text-xs text-app-muted">или через email</span>
            <div className="h-px flex-1 bg-app-panel-border" />
          </div>

          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 rounded-lg py-1.5 ${
                mode === 'login' ? 'bg-app-accent text-white' : 'text-app-muted'
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 rounded-lg py-1.5 ${
                mode === 'register' ? 'bg-app-accent text-white' : 'text-app-muted'
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
                  onChange={e => { setCity(e.target.value); setError(''); }}
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
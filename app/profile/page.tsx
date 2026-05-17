'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Copy,
  Link2,
  MapPin,
  Trophy,
  User,
  Users,
  UserMinus,
} from 'lucide-react';
import AppearanceControls from '@/components/AppearanceControls';
import AdBanner from '@/components/AdBanner';
import { useAuth } from '@/context/AuthProvider';
import { CITIES } from '@/lib/constants';
import {
  ensureFriendCode,
  getFriendInviteUrl,
  getFriends,
  removeFriend,
  type FriendProfile,
} from '@/lib/friends';
import { isOAuthUser, updatePassword } from '@/lib/profile';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, configured, updateProfile, refreshProfile } =
    useAuth();

  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [friendCode, setFriendCode] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [copied, setCopied] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const oauthUser = user ? isOAuthUser(user) : false;

  const loadFriends = useCallback(async () => {
    if (!user) return;
    setLoadingFriends(true);
    const list = await getFriends(user.id);
    setFriends(list);
    setLoadingFriends(false);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setCity(profile.city ?? '');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const code =
        profile?.friend_code ?? (await ensureFriendCode(user.id));
      setFriendCode(code);
      await loadFriends();
    })();
  }, [user, profile?.friend_code, loadFriends]);

  if (loading || !user) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center">
        <p className="text-app-muted">Загрузка профиля…</p>
      </main>
    );
  }

  if (!configured) {
    return (
      <main className="app-shell flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-app-muted">Настройте Supabase для профиля</p>
        <Link href="/" className="text-app-accent">
          На главную
        </Link>
      </main>
    );
  }

  const inviteUrl = friendCode ? getFriendInviteUrl(friendCode) : '';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErr(null);
    setProfileMsg(null);
    if (!displayName.trim()) {
      setProfileErr('Введите имя');
      return;
    }
    if (city && !CITIES.includes(city)) {
      setProfileErr('Выберите город из списка');
      return;
    }
    setSavingProfile(true);
    const err = await updateProfile({
      display_name: displayName.trim(),
      city: city || null,
    });
    setSavingProfile(false);
    if (err) setProfileErr(err);
    else {
      setProfileMsg('Профиль сохранён');
      await refreshProfile();
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErr(null);
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordErr('Пароли не совпадают');
      return;
    }
    setSavingPassword(true);
    const err = await updatePassword(newPassword);
    setSavingPassword(false);
    if (err) setPasswordErr(err);
    else {
      setPasswordMsg('Пароль обновлён');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="app-shell relative min-h-screen overflow-y-auto p-4 pb-12">
      <AppearanceControls className="absolute right-4 top-4" />

      <div className="mx-auto max-w-lg pt-12">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-app-muted hover:text-app-text"
        >
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Link>

        {/* Карточка профиля */}
        <div className="mb-8 rounded-2xl border border-app-panel-border bg-app-panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-app-accent/20">
              <User className="h-7 w-7 text-app-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-app-text">
                {profile?.display_name || 'Профиль'}
              </h1>
              <p className="text-sm text-app-muted">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-app-panel-hover p-3">
              <Trophy className="mx-auto mb-1 h-5 w-5 text-yellow-400" />
              <div className="text-xl font-bold text-app-text">
                {profile?.wins ?? 0}
              </div>
              <div className="text-xs text-app-muted">Побед</div>
            </div>
            <div className="rounded-xl bg-app-panel-hover p-3">
              <Trophy className="mx-auto mb-1 h-5 w-5 text-red-400" />
              <div className="text-xl font-bold text-app-text">
                {profile?.losses ?? 0}
              </div>
              <div className="text-xs text-app-muted">Поражений</div>
            </div>
          </div>

          {profile?.city && (
            <p className="mt-3 flex items-center justify-center gap-1 text-sm text-app-muted">
              <MapPin className="h-4 w-4" />
              {profile.city}
            </p>
          )}
        </div>

        {/* Баннер 1: после карточки профиля, перед редактированием */}
        <div className="mb-6">
          <AdBanner variant="upgrade" closeable={false} />
        </div>

        {/* Редактирование профиля */}
        <section className="mb-6 rounded-2xl border border-app-panel-border bg-app-panel p-6">
          <h2 className="mb-4 text-lg font-bold text-app-text">
            Редактировать профиль
          </h2>
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-app-muted">Имя</label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="app-input w-full"
                maxLength={32}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-app-muted">Город</label>
              <input
                list="profile-city-list"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="app-input w-full"
                placeholder="Выберите из списка"
              />
              <datalist id="profile-city-list">
                {CITIES.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            {profileErr && (
              <p className="text-sm text-red-400">{profileErr}</p>
            )}
            {profileMsg && (
              <p className="text-sm text-green-400">{profileMsg}</p>
            )}
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full rounded-xl bg-app-accent py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {savingProfile ? 'Сохранение…' : 'Сохранить'}
            </button>
          </form>
        </section>

        {/* Смена пароля (только для email-пользователей) */}
        {!oauthUser ? (
          <section className="mb-6 rounded-2xl border border-app-panel-border bg-app-panel p-6">
            <h2 className="mb-4 text-lg font-bold text-app-text">
              Сменить пароль
            </h2>
            <form onSubmit={handlePassword} className="space-y-3">
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="app-input w-full"
                placeholder="Новый пароль"
                minLength={6}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="app-input w-full"
                placeholder="Повторите пароль"
                minLength={6}
              />
              {passwordErr && (
                <p className="text-sm text-red-400">{passwordErr}</p>
              )}
              {passwordMsg && (
                <p className="text-sm text-green-400">{passwordMsg}</p>
              )}
              <button
                type="submit"
                disabled={savingPassword}
                className="w-full rounded-xl border border-app-panel-border py-2.5 text-sm font-medium text-app-text hover:bg-app-panel-hover disabled:opacity-50"
              >
                {savingPassword ? 'Обновление…' : 'Обновить пароль'}
              </button>
            </form>
          </section>
        ) : (
          <p className="mb-6 rounded-xl border border-app-panel-border bg-app-panel p-4 text-sm text-app-muted">
            Вы вошли через Google — смена пароля недоступна.
          </p>
        )}

        {/* Баннер 2: между паролем и секцией друзей */}
        <div className="mb-6">
          <AdBanner variant="horizontal" />
        </div>

        {/* Пригласить в друзья */}
        <section className="mb-6 rounded-2xl border border-app-panel-border bg-app-panel p-6">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-app-text">
            <Link2 className="h-5 w-5 text-app-accent" />
            Пригласить в друзья
          </h2>
          <p className="mb-4 text-sm text-app-muted">
            Отправьте ссылку — друг зарегистрируется или войдёт и добавит вас.
          </p>
          {friendCode && (
            <>
              <p className="mb-2 break-all rounded-lg bg-app-panel-hover px-3 py-2 text-xs text-app-muted">
                {inviteUrl}
              </p>
              <button
                type="button"
                onClick={() => void copyInvite()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-sm font-medium text-white"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Скопировать ссылку
                  </>
                )}
              </button>
            </>
          )}
        </section>

        {/* Список друзей */}
        <section className="rounded-2xl border border-app-panel-border bg-app-panel p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-app-text">
            <Users className="h-5 w-5 text-app-accent" />
            Друзья ({friends.length})
          </h2>
          {loadingFriends ? (
            <p className="text-sm text-app-muted">Загрузка…</p>
          ) : friends.length === 0 ? (
            <p className="text-sm text-app-muted">
              Пока нет друзей. Отправьте ссылку приглашения.
            </p>
          ) : (
            <ul className="space-y-2">
              {friends.map(f => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-xl bg-app-panel-hover px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-app-text">
                      {f.display_name || 'Игрок'}
                    </p>
                    <p className="text-xs text-app-muted">
                      {f.city ?? 'Город не указан'} · {f.wins}П / {f.losses}П
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await removeFriend(user.id, f.id);
                      await loadFriends();
                    }}
                    className="rounded-lg p-2 text-app-muted hover:bg-red-500/20 hover:text-red-400"
                    title="Удалить из друзей"
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
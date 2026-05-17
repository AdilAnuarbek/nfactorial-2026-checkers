'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { User } from '@supabase/supabase-js';
import {
  getSupabase,
  isSupabaseConfigured,
  type ProfileRow,
} from '@/lib/supabase/client';

interface AuthContextValue {
  user: User | null;
  profile: ProfileRow | null;
  loading: boolean;
  configured: boolean;
  needsCityPicker: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, displayName?: string, city?: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateCity: (city: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  // true — если вошёл, профиль загружен, но город не выбран
  const needsCityPicker = Boolean(user && profile && !profile.city);

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data as ProfileRow | null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        void fetchProfile(data.session.user.id);
      }
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) return 'Supabase не настроен';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string, city?: string) => {
      const supabase = getSupabase();
      if (!supabase) return 'Supabase не настроен';
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
            city: city || null,
          },
        },
      });
      return error?.message ?? null;
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return 'Supabase не настроен';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return error?.message ?? null;
  }, []);

  // Обновляем город в таблице profiles
  const updateCity = useCallback(async (city: string) => {
    const supabase = getSupabase();
    if (!supabase || !user) return;
    await supabase
      .from('profiles')
      .update({ city })
      .eq('id', user.id);
    // Обновляем локальный стейт без лишнего запроса к БД
    setProfile(prev => (prev ? { ...prev, city } : prev));
  }, [user]);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      configured: isSupabaseConfigured,
      needsCityPicker,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      refreshProfile,
      updateCity,
    }),
    [user, profile, loading, needsCityPicker, signIn, signUp, signInWithGoogle, signOut, refreshProfile, updateCity]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
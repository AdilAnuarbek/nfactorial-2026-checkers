'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AiLevel, PieceColor } from '@/lib/checkers/types';
import { loadPreferences, savePreferences } from '@/lib/storage';

type Theme = 'light' | 'dark';

interface AppContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  defaultAiLevel: AiLevel;
  setDefaultAiLevel: (level: AiLevel) => void;
  defaultHumanColor: PieceColor;
  setDefaultHumanColor: (color: PieceColor) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [defaultAiLevel, setDefaultAiLevelState] = useState<AiLevel>('medium');
  const [defaultHumanColor, setDefaultHumanColorState] =
    useState<PieceColor>('white');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const prefs = loadPreferences();
    if (prefs.theme) setThemeState(prefs.theme);
    if (typeof prefs.soundEnabled === 'boolean') {
      setSoundEnabledState(prefs.soundEnabled);
    }
    if (prefs.aiLevel) setDefaultAiLevelState(prefs.aiLevel);
    if (prefs.humanColor) setDefaultHumanColorState(prefs.humanColor);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = theme;
    savePreferences({
      theme,
      soundEnabled,
      aiLevel: defaultAiLevel,
      humanColor: defaultHumanColor,
    });
  }, [theme, soundEnabled, defaultAiLevel, defaultHumanColor, hydrated]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggleTheme = useCallback(
    () => setThemeState(t => (t === 'dark' ? 'light' : 'dark')),
    []
  );
  const setSoundEnabled = useCallback(
    (enabled: boolean) => setSoundEnabledState(enabled),
    []
  );
  const toggleSound = useCallback(
    () => setSoundEnabledState(s => !s),
    []
  );
  const setDefaultAiLevel = useCallback(
    (level: AiLevel) => setDefaultAiLevelState(level),
    []
  );
  const setDefaultHumanColor = useCallback(
    (color: PieceColor) => setDefaultHumanColorState(color),
    []
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      soundEnabled,
      setSoundEnabled,
      toggleSound,
      defaultAiLevel,
      setDefaultAiLevel,
      defaultHumanColor,
      setDefaultHumanColor,
    }),
    [
      theme,
      setTheme,
      toggleTheme,
      soundEnabled,
      setSoundEnabled,
      toggleSound,
      defaultAiLevel,
      setDefaultAiLevel,
      defaultHumanColor,
      setDefaultHumanColor,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProviders');
  }
  return ctx;
}

'use client';

import { Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { useApp } from '@/context/AppProviders';

interface AppearanceControlsProps {
  compact?: boolean;
  className?: string;
}

export default function AppearanceControls({
  compact = false,
  className = '',
}: AppearanceControlsProps) {
  const { theme, toggleTheme, soundEnabled, toggleSound } = useApp();

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      role="group"
      aria-label="Оформление"
    >
      {!compact && (
        <span className="mr-2 text-sm text-app-muted">Тема</span>
      )}
      <button
        type="button"
        onClick={toggleSound}
        className="rounded-lg border border-app-panel-border bg-app-panel p-2 transition hover:bg-app-panel-hover"
        title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
      >
        {soundEnabled ? (
          <Volume2 className="h-5 w-5 text-app-text" />
        ) : (
          <VolumeX className="h-5 w-5 text-app-muted" />
        )}
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        className="rounded-lg border border-app-panel-border bg-app-panel p-2 transition hover:bg-app-panel-hover"
        title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5 text-yellow-300" />
        ) : (
          <Moon className="h-5 w-5 text-app-accent" />
        )}
      </button>
    </div>
  );
}

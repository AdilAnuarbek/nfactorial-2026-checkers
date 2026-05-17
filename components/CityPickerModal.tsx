'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { CITIES } from '@/lib/constants';

interface CityPickerModalProps {
  displayName: string;
  onSave: (city: string) => Promise<void>;
}

export default function CityPickerModal({ displayName, onSave }: CityPickerModalProps) {
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!CITIES.includes(city)) {
      setError('Пожалуйста, выберите город из предложенного списка.');
      return;
    }
    setSaving(true);
    await onSave(city);
    setSaving(false);
  };

  return (
    // Затемнённый оверлей
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-app-panel-border bg-app-panel p-6 shadow-2xl">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-app-accent/20">
            <MapPin className="h-6 w-6 text-app-accent" />
          </div>
          <h2 className="text-lg font-bold text-app-text">
            Привет, {displayName}!
          </h2>
          <p className="mt-1 text-sm text-app-muted">
            Укажите ваш город — это нужно для лидерборда
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted pointer-events-none" />
            <input
              type="text"
              list="city-picker-list"
              placeholder="Начните вводить город…"
              required
              autoFocus
              value={city}
              onChange={e => {
                setCity(e.target.value);
                setError('');
              }}
              className="app-input w-full pl-9"
            />
            <datalist id="city-picker-list">
              {CITIES.map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={saving || !city}
            className="w-full rounded-xl bg-app-accent py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {saving ? 'Сохраняем…' : 'Сохранить и продолжить'}
          </button>
        </form>
      </div>
    </div>
  );
}
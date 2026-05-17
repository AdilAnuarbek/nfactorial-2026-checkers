'use client';

import { X, Sparkles, Zap, Crown } from 'lucide-react';
import { useState, useEffect } from 'react';

type BannerVariant = 'horizontal' | 'square' | 'upgrade';

interface AdBannerProps {
  variant?: BannerVariant;
  closeable?: boolean;
}

const ADS = [
  {
    label: 'Реклама',
    title: 'Хотите убрать рекламу?',
    description: 'Перейдите на Pro — без рекламы, кастомные скины и анализ партий',
    cta: 'Попробовать Pro',
    icon: Crown,
    gradient: 'from-purple-600/20 to-pink-600/20',
    border: 'border-purple-500/30',
    ctaClass: 'bg-purple-600 hover:bg-purple-500',
  },
  {
    label: 'Реклама',
    title: 'Шашечный турнир',
    description: 'Еженедельный турнир с призом $50. Регистрация открыта до пятницы',
    cta: 'Участвовать',
    icon: Zap,
    gradient: 'from-amber-600/20 to-orange-600/20',
    border: 'border-amber-500/30',
    ctaClass: 'bg-amber-600 hover:bg-amber-500',
  },
  {
    label: 'Реклама',
    title: 'Кастомные скины',
    description: 'Выберите уникальный дизайн доски и фигур. Более 20 наборов',
    cta: 'Смотреть скины',
    icon: Sparkles,
    gradient: 'from-blue-600/20 to-cyan-600/20',
    border: 'border-blue-500/30',
    ctaClass: 'bg-blue-600 hover:bg-blue-500',
  },
];

export default function AdBanner({ variant = 'horizontal', closeable = true }: AdBannerProps) {
  const [closed, setClosed] = useState(false);
  const [adIndex, setAdIndex] = useState(0);

  useEffect(() => {
    setAdIndex(Math.floor(Math.random() * ADS.length));
  }, []);

  if (closed) return null;

  const ad = ADS[adIndex];
  const Icon = ad.icon;

  if (variant === 'upgrade') {
    return (
      <div className={`relative rounded-xl border ${ad.border} bg-gradient-to-r ${ad.gradient} p-4 backdrop-blur-sm`}>
        {closeable && (
          <button
            onClick={() => setClosed(true)}
            className="absolute right-2 top-2 rounded p-0.5 text-app-muted hover:text-app-text transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-app-text">{ad.title}</p>
            <p className="truncate text-xs text-app-muted">{ad.description}</p>
          </div>
          <button
            onClick={() => alert('Монетизация: здесь будет Stripe или другой платёжный провайдер')}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition ${ad.ctaClass}`}
          >
            {ad.cta}
          </button>
        </div>
        <span className="absolute bottom-1 right-2 text-[10px] text-app-muted/50">{ad.label}</span>
      </div>
    );
  }

  if (variant === 'square') {
    return (
      <div className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border ${ad.border} bg-gradient-to-br ${ad.gradient} p-6 text-center backdrop-blur-sm`}>
        {closeable && (
          <button
            onClick={() => setClosed(true)}
            className="absolute right-2 top-2 rounded p-0.5 text-app-muted hover:text-app-text transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="font-bold text-app-text">{ad.title}</p>
          <p className="mt-1 text-sm text-app-muted">{ad.description}</p>
        </div>
        <button
          onClick={() => alert('Монетизация: здесь будет Stripe или другой платёжный провайдер')}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${ad.ctaClass}`}
        >
          {ad.cta}
        </button>
        <span className="text-[10px] text-app-muted/50">{ad.label}</span>
      </div>
    );
  }

  // horizontal (default)
  return (
    <div className={`relative rounded-xl border ${ad.border} bg-gradient-to-r ${ad.gradient} px-4 py-3 backdrop-blur-sm`}>
      {closeable && (
        <button
          onClick={() => setClosed(true)}
          className="absolute right-2 top-2 rounded p-0.5 text-app-muted hover:text-app-text transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="flex flex-wrap items-center gap-3 pr-4">
        <Icon className="h-5 w-5 shrink-0 text-white/80" />
        <div className="flex-1">
          <span className="font-medium text-app-text">{ad.title} </span>
          <span className="text-sm text-app-muted">{ad.description}</span>
        </div>
        <button
          onClick={() => alert('Монетизация: здесь будет Stripe или другой платёжный провайдер')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white transition ${ad.ctaClass}`}
        >
          {ad.cta}
        </button>
      </div>
      <span className="absolute bottom-1 right-2 text-[10px] text-app-muted/50">Реклама</span>
    </div>
  );
}
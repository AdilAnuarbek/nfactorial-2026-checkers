'use client';

import { useState, useEffect } from 'react';
import { Trophy, MapPin } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { CITIES } from '@/lib/constants';

interface PlayerStat {
  id: string;
  display_name: string;
  wins: number;
  losses: number;
}

export default function CityLeaderboard() {
  const [selectedCity, setSelectedCity] = useState(
    CITIES.includes('Астана') ? 'Астана' : CITIES[0] || ''
  );
  const [leaders, setLeaders] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      const supabase = getSupabase();
      
      if (!supabase) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, wins, losses')
        .eq('city', selectedCity)
        .order('wins', { ascending: false })
        .limit(10);

      if (!error && data) {
        setLeaders(data);
      } else if (error) {
        console.error('Ошибка при загрузке лидерборда:', error.message);
      }
      
      setLoading(false);
    }

    if (selectedCity) {
      fetchLeaderboard();
    }
  }, [selectedCity]);

  return (
    <div className="rounded-xl border border-app-panel-border bg-app-panel p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-xl font-bold text-app-text flex items-center gap-2">
          <Trophy className="text-yellow-400 h-5 w-5" />
          Топ игроков
        </h3>
        
        <div className="relative flex items-center min-w-[160px]">
          <MapPin className="absolute left-2.5 h-4 w-4 text-app-muted z-10 pointer-events-none" />
          <select 
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-app-panel-hover border border-app-panel-border rounded-lg text-sm text-app-text outline-none focus:border-app-accent appearance-none cursor-pointer transition-colors"
          >
            {CITIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-app-muted">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {/* FIX 2: добавлен массив [1,2,3,4,5] перед .map */}
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-app-panel-hover/50 rounded-lg w-full"></div>
          ))}
        </div>
      ) : leaders.length > 0 ? (
        <div className="space-y-2">
          {leaders.map((player, index) => (
            <div 
              key={player.id} 
              className="flex items-center justify-between p-3 bg-app-panel-hover/30 hover:bg-app-panel-hover transition-colors rounded-lg border border-transparent hover:border-app-panel-border"
            >
              <div className="flex items-center gap-3">
                <span className={`font-bold w-6 text-center ${
                  index === 0 ? 'text-yellow-400 text-lg drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]' : 
                  index === 1 ? 'text-gray-300 text-lg' : 
                  index === 2 ? 'text-amber-600 text-lg' : 
                  'text-app-muted'
                }`}>
                  #{index + 1}
                </span>
                <span className="font-medium text-app-text">
                  {player.display_name || 'Аноним'}
                </span>
              </div>
              <div className="text-sm bg-black/20 px-2 py-1 rounded-md">
                <span className="text-green-400 font-bold">{player.wins}W</span>
                <span className="text-app-muted mx-1.5">/</span>
                <span className="text-red-400 font-bold">{player.losses}L</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-app-panel-hover/20 rounded-lg border border-dashed border-app-panel-border">
          <p className="text-app-muted mb-1">В этом городе пока нет игроков.</p>
          <p className="text-sm text-app-text font-medium">Сыграйте партию и станьте первым!</p>
        </div>
      )}
    </div>
  );
}
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, anonKey!);
  }
  return client;
}

export type GameRow = {
  id: string;
  user_id: string;
  game_mode: 'pvp' | 'ai';
  ai_level: string | null;
  winner: string | null;
  move_count: number;
  moves: unknown;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  display_name: string | null;
  city: string | null;
  wins: number;
  losses: number;
  friend_code: string | null;
  created_at: string;
};

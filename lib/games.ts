import type { AiLevel, GameMode, Move, PieceColor } from '@/lib/checkers/types';
import {
  appendLocalHistory,
  buildFinishedGameKey,
  markGameRecorded,
  type LocalGameRecord,
  wasGameAlreadyRecorded,
} from '@/lib/storage';
import { getSupabase } from '@/lib/supabase/client';

export async function saveFinishedGame(params: {
  userId?: string;
  gameMode: GameMode;
  aiLevel: AiLevel;
  winner: PieceColor;
  moves: Move[];
  humanColor?: PieceColor;
}): Promise<boolean> {
  const recordKey = buildFinishedGameKey(
    params.moves,
    params.winner,
    params.gameMode,
    params.aiLevel,
    params.humanColor
  );

  if (wasGameAlreadyRecorded(recordKey)) {
    return false;
  }

  markGameRecorded(recordKey);

  const record: LocalGameRecord = {
    id: crypto.randomUUID(),
    gameMode: params.gameMode,
    aiLevel: params.aiLevel,
    winner: params.winner,
    moveCount: params.moves.length,
    finishedAt: new Date().toISOString(),
  };

  appendLocalHistory(record);

  if (!params.userId) return true;

  const supabase = getSupabase();
  if (!supabase) return true;

  await supabase.from('games').insert({
    user_id: params.userId,
    game_mode: params.gameMode,
    ai_level: params.gameMode === 'ai' ? params.aiLevel : null,
    winner: params.winner,
    move_count: params.moves.length,
    moves: params.moves,
  });

  if (params.gameMode !== 'ai') return true;

  const { data: profile } = await supabase
    .from('profiles')
    .select('wins, losses')
    .eq('id', params.userId)
    .maybeSingle();

  if (!profile) return true;

  const humanColor = params.humanColor ?? 'white';
  const humanWon = params.winner === humanColor;
  await supabase
    .from('profiles')
    .update({
      wins: profile.wins + (humanWon ? 1 : 0),
      losses: profile.losses + (humanWon ? 0 : 1),
    })
    .eq('id', params.userId);

  return true;
}

export async function fetchRemoteHistory(userId: string) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from('games')
    .select('id, game_mode, ai_level, winner, move_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  return data ?? [];
}

import { initializeBoard } from '@/lib/checkers/board';
import {
  applyMoveWithTurn,
  isMoveAllowed,
} from '@/lib/checkers/engine';
import type { Board, Move, PieceColor } from '@/lib/checkers/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { createPlayerToken } from './session';

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface GameRoom {
  id: string;
  status: RoomStatus;
  host_token: string;
  guest_token: string | null;
  host_color: PieceColor;
  host_name: string;
  guest_name: string | null;
  host_last_seen: string | null;
  guest_last_seen: string | null;
  board: Board;
  current_player: PieceColor;
  move_history: Move[];
  winner: PieceColor | null;
  version: number;
  created_at: string;
  updated_at: string;
}

const PRESENCE_TIMEOUT_MS = 45_000;

export function isPlayerOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < PRESENCE_TIMEOUT_MS;
}

export function getOpponentOnline(
  room: GameRoom,
  myRole: 'host' | 'guest'
): boolean {
  if (myRole === 'host') return isPlayerOnline(room.guest_last_seen);
  return isPlayerOnline(room.host_last_seen);
}

export function getMyColor(
  room: GameRoom,
  role: 'host' | 'guest'
): PieceColor {
  if (role === 'host') return room.host_color;
  return room.host_color === 'white' ? 'black' : 'white';
}

export async function createRoom(hostName: string): Promise<GameRoom | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const hostToken = createPlayerToken();
  const { data, error } = await supabase
    .from('game_rooms')
    .insert({
      host_token: hostToken,
      host_name: hostName,
      host_last_seen: new Date().toISOString(),
      board: initializeBoard(),
      current_player: 'white',
      move_history: [],
    })
    .select()
    .single();

  if (error || !data) {
    console.error('createRoom', error);
    return null;
  }
  return data as GameRoom;
}

export async function fetchRoom(roomId: string): Promise<GameRoom | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();

  if (error || !data) return null;
  return data as GameRoom;
}

export async function joinRoomAsGuest(
  roomId: string,
  guestToken: string,
  guestName: string
): Promise<GameRoom | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const room = await fetchRoom(roomId);
  if (!room) return null;

  const now = new Date().toISOString();

  if (room.guest_token === guestToken) {
    const { data } = await supabase
      .from('game_rooms')
      .update({
        guest_name: guestName,
        guest_last_seen: now,
        status: room.status === 'waiting' ? 'playing' : room.status,
      })
      .eq('id', roomId)
      .select()
      .single();
    return (data as GameRoom) ?? null;
  }

  if (room.guest_token && room.guest_token !== guestToken) {
    return null;
  }

  const { data, error } = await supabase
    .from('game_rooms')
    .update({
      guest_token: guestToken,
      guest_name: guestName,
      guest_last_seen: now,
      status: 'playing',
    })
    .eq('id', roomId)
    .is('guest_token', null)
    .select()
    .single();

  if (error || !data) {
    const retry = await fetchRoom(roomId);
    if (retry?.guest_token === guestToken) {
      return joinRoomAsGuest(roomId, guestToken, guestName);
    }
    return null;
  }
  return data as GameRoom;
}

export async function reconnectToRoom(
  roomId: string,
  playerToken: string,
  playerName: string
): Promise<{ room: GameRoom; role: 'host' | 'guest' } | null> {
  const room = await fetchRoom(roomId);
  if (!room) return null;

  const now = new Date().toISOString();
  const supabase = getSupabase();
  if (!supabase) return null;

  if (room.host_token === playerToken) {
    const { data } = await supabase
      .from('game_rooms')
      .update({ host_name: playerName, host_last_seen: now })
      .eq('id', roomId)
      .select()
      .single();
    return data ? { room: data as GameRoom, role: 'host' } : null;
  }

  if (room.guest_token === playerToken) {
    const { data } = await supabase
      .from('game_rooms')
      .update({ guest_name: playerName, guest_last_seen: now })
      .eq('id', roomId)
      .select()
      .single();
    return data ? { room: data as GameRoom, role: 'guest' } : null;
  }

  if (!room.guest_token && room.status !== 'finished') {
    const joined = await joinRoomAsGuest(roomId, playerToken, playerName);
    return joined ? { room: joined, role: 'guest' } : null;
  }

  return null;
}

export async function heartbeat(
  roomId: string,
  role: 'host' | 'guest'
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const field = role === 'host' ? 'host_last_seen' : 'guest_last_seen';
  await supabase
    .from('game_rooms')
    .update({ [field]: new Date().toISOString() })
    .eq('id', roomId);
}

export async function applyRoomMove(
  roomId: string,
  role: 'host' | 'guest',
  move: Move,
  expectedVersion: number
): Promise<GameRoom | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const room = await fetchRoom(roomId);
  if (!room || room.version !== expectedVersion) return null;

  const myColor = getMyColor(room, role);
  if (room.current_player !== myColor || room.status !== 'playing') return null;
  if (!isMoveAllowed(move, myColor, room.board)) return null;

  const next = applyMoveWithTurn(room.board, room.current_player, move);
  const moveHistory = [...room.move_history, move];
  const status = next.winner ? 'finished' : 'playing';

  const { data, error } = await supabase
    .from('game_rooms')
    .update({
      board: next.board,
      current_player: next.currentPlayer,
      move_history: moveHistory,
      winner: next.winner,
      status,
      version: room.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)
    .eq('version', expectedVersion)
    .select()
    .single();

  if (error || !data) return null;
  return data as GameRoom;
}

export function subscribeToRoom(
  roomId: string,
  onUpdate: (room: GameRoom) => void
): (() => void) | null {
  const supabase = getSupabase();
  if (!supabase) return null;

  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${roomId}`,
      },
      payload => {
        if (payload.new) onUpdate(payload.new as GameRoom);
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function getRoomShareUrl(roomId: string): string {
  if (typeof window === 'undefined') return `/room/${roomId}`;
  return `${window.location.origin}/room/${roomId}`;
}

export { isSupabaseConfigured };

import { getSupabase } from '@/lib/supabase/client';
import type { ProfileRow } from '@/lib/supabase/client';

export type FriendProfile = Pick<
  ProfileRow,
  'id' | 'display_name' | 'city' | 'wins' | 'losses' | 'friend_code'
>;

export function getFriendInviteUrl(friendCode: string): string {
  if (typeof window === 'undefined') {
    return `/friends/add/${friendCode}`;
  }
  return `${window.location.origin}/friends/add/${friendCode}`;
}

export async function ensureFriendCode(userId: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('friend_code')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.friend_code) return profile.friend_code;

  const code = Math.random().toString(36).slice(2, 10).toLowerCase();
  const { data, error } = await supabase
    .from('profiles')
    .update({ friend_code: code })
    .eq('id', userId)
    .select('friend_code')
    .single();

  if (error) return null;
  return data.friend_code as string;
}

export async function getFriends(userId: string): Promise<FriendProfile[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', userId)
      .eq('status', 'accepted'),
    supabase
      .from('friendships')
      .select('user_id')
      .eq('friend_id', userId)
      .eq('status', 'accepted'),
  ]);

  const ids = [
    ...(outgoing?.map(r => r.friend_id) ?? []),
    ...(incoming?.map(r => r.user_id) ?? []),
  ];

  if (!ids.length) return [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, city, wins, losses, friend_code')
    .in('id', ids);

  return (profiles ?? []) as FriendProfile[];
}

export async function addFriendByCode(
  myUserId: string,
  code: string
): Promise<{ ok: true; friend: FriendProfile } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase не настроен' };

  const normalized = code.trim().toLowerCase();
  if (!normalized) return { ok: false, error: 'Неверная ссылка' };

  const { data: inviter, error: findError } = await supabase
    .from('profiles')
    .select('id, display_name, city, wins, losses, friend_code')
    .eq('friend_code', normalized)
    .maybeSingle();

  if (findError || !inviter) {
    return { ok: false, error: 'Пользователь по этой ссылке не найден' };
  }

  if (inviter.id === myUserId) {
    return { ok: false, error: 'Нельзя добавить себя в друзья' };
  }

  const { data: existing } = await supabase
    .from('friendships')
    .select('id')
    .eq('user_id', myUserId)
    .eq('friend_id', inviter.id)
    .maybeSingle();

  if (existing) {
    return {
      ok: true,
      friend: inviter as FriendProfile,
    };
  }

  const { error: insertError } = await supabase.from('friendships').insert({
    user_id: myUserId,
    friend_id: inviter.id,
    status: 'accepted',
  });

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  return { ok: true, friend: inviter as FriendProfile };
}

export async function removeFriend(
  myUserId: string,
  friendId: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  await supabase
    .from('friendships')
    .delete()
    .eq('user_id', myUserId)
    .eq('friend_id', friendId);

  await supabase
    .from('friendships')
    .delete()
    .eq('user_id', friendId)
    .eq('friend_id', myUserId);

  return true;
}

export async function findProfileByFriendCode(
  code: string
): Promise<FriendProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, city, wins, losses, friend_code')
    .eq('friend_code', code.trim().toLowerCase())
    .maybeSingle();

  return data as FriendProfile | null;
}

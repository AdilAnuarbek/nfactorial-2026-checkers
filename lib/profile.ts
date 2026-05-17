import { getSupabase } from '@/lib/supabase/client';

export async function updateProfileFields(
  userId: string,
  fields: { display_name?: string; city?: string }
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return 'Supabase не настроен';

  const { error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', userId);

  return error?.message ?? null;
}

export async function updatePassword(
  newPassword: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return 'Supabase не настроен';

  if (newPassword.length < 6) {
    return 'Пароль должен быть не короче 6 символов';
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return error?.message ?? null;
}

export function isOAuthUser(
  user: { app_metadata?: { provider?: string }; identities?: { provider: string }[] }
): boolean {
  const provider = user.app_metadata?.provider;
  if (provider && provider !== 'email') return true;
  return (
    user.identities?.some(i => i.provider !== 'email') ?? false
  );
}

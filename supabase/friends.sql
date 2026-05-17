-- Выполните в Supabase SQL Editor после основного schema.sql

alter table public.profiles
  add column if not exists friend_code text unique;

-- Коды для существующих пользователей
update public.profiles
set friend_code = lower(substring(md5(id::text || random()::text) from 1 for 8))
where friend_code is null;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'accepted'
    check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);

create index if not exists idx_friendships_user on public.friendships (user_id);
create index if not exists idx_friendships_friend on public.friendships (friend_id);

alter table public.friendships enable row level security;

create policy "friendships_select_own"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "friendships_insert_own"
  on public.friendships for insert
  with check (auth.uid() = user_id);

create policy "friendships_delete_own"
  on public.friendships for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- Обновить триггер регистрации: friend_code для новых пользователей
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, city, friend_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'city',
    lower(substring(md5(new.id::text || random()::text) from 1 for 8))
  );
  return new;
end;
$$;

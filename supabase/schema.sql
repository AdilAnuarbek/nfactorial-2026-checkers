-- Run in Supabase SQL Editor after creating a project

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  city text,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_city on public.profiles(city);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  game_mode text not null check (game_mode in ('pvp', 'ai')),
  ai_level text check (ai_level in ('easy', 'medium', 'hard')),
  winner text check (winner in ('white', 'black')),
  move_count integer not null default 0,
  moves jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.games enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can read own games"
  on public.games for select using (auth.uid() = user_id);

create policy "Users can insert own games"
  on public.games for insert with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, city)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'city'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Мультиплеер (Supabase Realtime = WebSocket)
create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'waiting'
    check (status in ('waiting', 'playing', 'finished')),
  host_token text not null,
  guest_token text,
  host_color text not null default 'white' check (host_color in ('white', 'black')),
  host_name text not null default 'Хост',
  guest_name text,
  host_last_seen timestamptz,
  guest_last_seen timestamptz,
  board jsonb not null,
  current_player text not null default 'white' check (current_player in ('white', 'black')),
  move_history jsonb not null default '[]'::jsonb,
  winner text check (winner in ('white', 'black')),
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_rooms_updated_at_idx on public.game_rooms (updated_at desc);

alter table public.game_rooms enable row level security;

create policy "game_rooms_select" on public.game_rooms for select using (true);
create policy "game_rooms_insert" on public.game_rooms for insert with check (true);
create policy "game_rooms_update" on public.game_rooms for update using (true);

-- Включаем Realtime для таблицы game_rooms
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;

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

-- Run in Supabase SQL Editor after creating a project

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  city text,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now()
);

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
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
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

-- В Dashboard: Database → Replication → включить game_rooms для Realtime

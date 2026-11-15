-- Tracker.ME cloud sync — run once in Supabase → SQL Editor.
create table if not exists public.entries (
  user_id    uuid        not null default auth.uid() references auth.users on delete cascade,
  k          text        not null,
  v          jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, k)
);
create index if not exists entries_user_updated on public.entries (user_id, updated_at);

-- Only you can see or change your rows.
alter table public.entries enable row level security;
drop policy if exists "own rows" on public.entries;
create policy "own rows" on public.entries
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Server clock decides update order (device clocks can be wrong).
create or replace function public.entries_touch() returns trigger
language plpgsql as $$ begin new.updated_at := clock_timestamp(); return new; end $$;
drop trigger if exists entries_touch on public.entries;
create trigger entries_touch before insert or update on public.entries
  for each row execute function public.entries_touch();

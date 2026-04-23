-- Numeris initial schema
-- Run this in Supabase → SQL Editor, or let the Supabase MCP apply it.
-- Safe to re-run (uses IF NOT EXISTS).

-- ───────────────────────────────────────────────────────────────────
-- profiles: a named person (numerology + tradition inputs).
-- user_id is NULL for anonymous saves; filled when the user is signed in.
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  birthdate   date not null,
  system      text not null default 'pythagorean' check (system in ('pythagorean','chaldean')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_profiles_birthdate on public.profiles(birthdate);

-- ───────────────────────────────────────────────────────────────────
-- readings: polymorphic store. "kind" identifies the shape of payload.
--   kind ∈ {numbers, profile, compatibility, tradition, confluence, deepen}
-- inputs: what was asked (chip numbers, profile inputs, etc.)
-- payload: the full oracle response
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.readings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  profile_id    uuid references public.profiles(id) on delete cascade,
  kind          text not null check (kind in ('numbers','profile','compatibility','tradition','confluence','deepen')),
  tradition_id  text,
  inputs        jsonb not null default '{}'::jsonb,
  payload       jsonb not null,
  pattern       text,
  palette       jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_readings_user_id on public.readings(user_id);
create index if not exists idx_readings_profile_id on public.readings(profile_id);
create index if not exists idx_readings_kind on public.readings(kind);
create index if not exists idx_readings_created_at on public.readings(created_at desc);

-- ───────────────────────────────────────────────────────────────────
-- saved_portraits: a user's curated collection pointing at readings.
-- Lightweight view layer — user picks their favorite reading and saves it.
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.saved_portraits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  reading_id   uuid not null references public.readings(id) on delete cascade,
  title        text,
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_saved_portraits_user_id on public.saved_portraits(user_id);

-- ───────────────────────────────────────────────────────────────────
-- Row Level Security.
-- The service-role key used by our serverless functions BYPASSES RLS,
-- so these policies protect direct client access (future auth work).
-- ───────────────────────────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.readings         enable row level security;
alter table public.saved_portraits  enable row level security;

-- Profiles: users can read/write their own rows. Anonymous rows are readable
-- by service role only (no client policy for user_id IS NULL).
do $$ begin
  create policy "profiles_own_select" on public.profiles for select
    using (auth.uid() = user_id);
  exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "profiles_own_insert" on public.profiles for insert
    with check (auth.uid() = user_id);
  exception when duplicate_object then null;
end $$;

-- Readings: same — user sees their own.
do $$ begin
  create policy "readings_own_select" on public.readings for select
    using (auth.uid() = user_id);
  exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "readings_own_insert" on public.readings for insert
    with check (auth.uid() = user_id);
  exception when duplicate_object then null;
end $$;

-- Saved portraits: same.
do $$ begin
  create policy "portraits_own_all" on public.saved_portraits for all
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
  exception when duplicate_object then null;
end $$;

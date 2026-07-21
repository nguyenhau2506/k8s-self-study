-- Kubernaut — initial schema for auth-backed progress & quiz tracking.
-- Run in the Supabase SQL editor (or `supabase db push`).
-- Row-Level Security: every user can read/write ONLY their own rows.

-- ── profiles: one row per auth user ──────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- ── lesson_progress: docs a user marked "đã học" ─────────────────────
create table if not exists public.lesson_progress (
  user_id    uuid    not null references auth.users(id) on delete cascade,
  lesson_id  text    not null,
  completed  boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ── quiz_attempts: quiz / practice results ───────────────────────────
create table if not exists public.quiz_attempts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  quiz_id     text not null,
  question_id text,
  correct     boolean,
  score       int,
  total       int,
  created_at  timestamptz not null default now()
);

-- ── Row-Level Security ───────────────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts   enable row level security;

drop policy if exists "profiles self-service" on public.profiles;
create policy "profiles self-service" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "progress owner-only" on public.lesson_progress;
create policy "progress owner-only" on public.lesson_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "attempts owner-only" on public.quiz_attempts;
create policy "attempts owner-only" on public.quiz_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Auto-create a profile row on signup ──────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

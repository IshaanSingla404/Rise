-- Safe to run more than once (idempotent). Paste the whole file into Supabase SQL Editor and click Run.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  theme text not null default 'light' check (theme in ('light','dark')),
  focus_minutes int not null default 25 check (focus_minutes between 1 and 120),
  short_break_minutes int not null default 5 check (short_break_minutes between 1 and 120),
  long_break_minutes int not null default 15 check (long_break_minutes between 1 and 120),
  notifications_enabled boolean not null default false,
  week_starts_monday boolean not null default true,
  strict_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  cue text not null default '' check (char_length(cue) <= 90),
  category text not null default 'Morning' check (category in ('Morning','Afternoon','Evening','Anytime')),
  reminder_time time not null default '09:00',
  archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists habits_user_active_idx on public.habits(user_id, archived, sort_order, created_at);
create table if not exists public.habit_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  day_of_week smallint not null check(day_of_week between 0 and 6),
  created_at timestamptz not null default now(),
  unique(habit_id, day_of_week)
);
create index if not exists habit_schedules_user_idx on public.habit_schedules(user_id, habit_id);
create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  local_date date not null,
  completed_at timestamptz not null default now(),
  unique(habit_id, local_date)
);
create index if not exists habit_completions_user_date_idx on public.habit_completions(user_id, local_date desc);
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  duration_minutes int not null check(duration_minutes between 1 and 120),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists focus_sessions_user_started_idx on public.focus_sessions(user_id, started_at desc);
create table if not exists public.focus_domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null check(char_length(domain) between 3 and 253),
  kind text not null check(kind in ('blocked','allow')),
  created_at timestamptz not null default now(),
  unique(user_id, domain, kind)
);
create index if not exists focus_domains_user_kind_idx on public.focus_domains(user_id, kind);

-- Atomic habit + schedule writes. Ownership is always taken from the JWT.
create or replace function public.save_habit_with_schedule(
  p_habit_id uuid,
  p_name text,
  p_cue text,
  p_category text,
  p_reminder_time time,
  p_days integer[]
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_habit_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if cardinality(p_days) < 1 or exists(select 1 from unnest(p_days) d where d < 0 or d > 6) then
    raise exception 'Schedule must include valid days';
  end if;
  if p_habit_id is null then
    insert into public.habits(user_id,name,cue,category,reminder_time)
    values(auth.uid(),trim(p_name),coalesce(p_cue,''),p_category,p_reminder_time)
    returning id into v_habit_id;
  else
    update public.habits set name=trim(p_name),cue=coalesce(p_cue,''),category=p_category,
      reminder_time=p_reminder_time,updated_at=now()
    where id=p_habit_id and user_id=auth.uid() returning id into v_habit_id;
    if v_habit_id is null then raise exception 'Habit not found'; end if;
  end if;
  delete from public.habit_schedules where habit_id=v_habit_id and user_id=auth.uid();
  insert into public.habit_schedules(user_id,habit_id,day_of_week)
  select auth.uid(),v_habit_id,d::smallint from (select distinct unnest(p_days) d) days;
  return v_habit_id;
end;
$$;
grant execute on function public.save_habit_with_schedule(uuid,text,text,text,time,integer[]) to authenticated;

-- Keep child ownership consistent with the owning habit. RLS below also checks it.
create or replace function public.owns_habit(p_habit_id uuid, p_user_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from public.habits where id=p_habit_id and user_id=p_user_id)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,display_name) values(new.id, coalesce(new.raw_user_meta_data->>'display_name','')) on conflict(id) do nothing;
  insert into public.user_preferences(user_id) values(new.id) on conflict(user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.habits enable row level security;
alter table public.habit_schedules enable row level security;
alter table public.habit_completions enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.focus_domains enable row level security;

drop policy if exists "profiles self access" on public.profiles;
create policy "profiles self access" on public.profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists "preferences self access" on public.user_preferences;
create policy "preferences self access" on public.user_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "habits self access" on public.habits;
create policy "habits self access" on public.habits for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "schedules self access" on public.habit_schedules;
create policy "schedules self access" on public.habit_schedules for all to authenticated using(user_id=auth.uid() and public.owns_habit(habit_id,auth.uid())) with check(user_id=auth.uid() and public.owns_habit(habit_id,auth.uid()));
drop policy if exists "completions self access" on public.habit_completions;
create policy "completions self access" on public.habit_completions for all to authenticated using(user_id=auth.uid() and public.owns_habit(habit_id,auth.uid())) with check(user_id=auth.uid() and public.owns_habit(habit_id,auth.uid()));
drop policy if exists "sessions self access" on public.focus_sessions;
create policy "sessions self access" on public.focus_sessions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "domains self access" on public.focus_domains;
create policy "domains self access" on public.focus_domains for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

grant usage on schema public to authenticated;
grant select,insert,update,delete on public.profiles, public.user_preferences, public.habits, public.habit_schedules, public.habit_completions, public.focus_sessions, public.focus_domains to authenticated;

-- Make the new tables and functions visible to the API immediately.
notify pgrst, 'reload schema';

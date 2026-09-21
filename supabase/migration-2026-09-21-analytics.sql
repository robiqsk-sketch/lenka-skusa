-- Jednoduchá štatistika používania — BEZ identifikátorov.
-- Do `events` sa ukladá len názov udalosti, rola (guest/student/firm), malé doplnkové údaje a čas.
-- Žiadne ID používateľa, ID relácie, IP ani cookies → nikoho sa nedá spätne dohľadať (zásady ochrany údajov §3.3, §7).
-- Čítať ich vie len admin (tabuľka `admins`) cez analytics_summary(); stránka robiq-app/admin.html.
-- Spustiť v Supabase → SQL Editor → New query → Run.

create table public.events (
  id          bigint generated always as identity primary key,
  name        text  not null check (length(name) between 1 and 40),        -- visit, reg_start, reg_done, …
  role        text  not null default 'guest' check (role in ('guest', 'student', 'firm')),
  props       jsonb not null default '{}' check (pg_column_size(props) < 1024),
  created_at  timestamptz not null default now()
);
create index events_created_idx on public.events (created_at desc);

alter table public.events enable row level security;
create policy "events: anyone inserts" on public.events for insert to anon, authenticated with check (true);
-- žiadna politika na čítanie → cez API sa udalosti prečítať nedajú, len cez analytics_summary()

-- Kto smie vidieť štatistiku (e-mail účtu v Robiq).
create table public.admins (email text primary key);
alter table public.admins enable row level security;                        -- bez politík → cez API neviditeľné
insert into public.admins (email) values ('lenkamasarikova08@gmail.com');

-- Appka podľa toho ukáže adminovi položku „Štatistika“ v menu účtu.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where email = auth.jwt() ->> 'email')
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.analytics_summary(p_days int default 7) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  since timestamptz := date_trunc('day', now()) - make_interval(days => greatest(p_days, 1) - 1);
begin
  if not exists (select 1 from admins where email = auth.jwt() ->> 'email') then
    raise exception 'Prístup zamietnutý.';
  end if;

  return jsonb_build_object(
    'days', p_days, 'since', since,

    -- udalosti z appky za obdobie: { "visit": 120, "reg_start": 14, … }
    'events', (select coalesce(jsonb_object_agg(name, n), '{}') from (select name, count(*) n from events where created_at >= since group by name) t),
    'events_by_role', (select coalesce(jsonb_object_agg(k, n), '{}') from (select name || '/' || role k, count(*) n from events where created_at >= since group by name, role) t),
    'blocked', (select coalesce(jsonb_object_agg(r, n), '{}') from (select coalesce(props ->> 'reason', '?') r, count(*) n from events where name = 'reg_blocked' and created_at >= since group by 1) t),
    -- lievik registrácie: { "reg_start:student": 14, "reg_step:student:2": 9, "reg_done:student": 5, … }
    'reg', (select coalesce(jsonb_object_agg(k, n), '{}') from (
              select name || ':' || coalesce(props ->> 'role', '?') || coalesce(':' || (props ->> 'step'), '') k, count(*) n
              from events where name in ('reg_start', 'reg_step', 'reg_done') and created_at >= since group by 1) t),

    -- čo sa reálne stalo v databáze za obdobie
    'period', jsonb_build_object(
      'new_students',      (select count(*) from profiles where role = 'student' and created_at >= since),
      'new_companies',     (select count(*) from profiles where role = 'firm'    and created_at >= since),
      'postings_new',      (select count(*) from postings where created_at >= since),
      'interests',         (select count(*) from interests where created_at >= since),
      'skips',             (select count(*) from skips where created_at >= since),
      'company_interests', (select count(*) from company_interests where created_at >= since),
      'matches',           (select count(*) from matches where created_at >= since),
      'messages',          (select count(*) from messages where created_at >= since)),

    -- stav celkovo
    'totals', jsonb_build_object(
      'students',           (select count(*) from students),
      'companies',          (select count(*) from companies),
      'companies_verified', (select count(*) from companies where verified),
      'postings_active',    (select count(*) from postings where active),
      'matches',            (select count(*) from matches)),

    -- po dňoch (pre graf)
    'daily', (select jsonb_agg(jsonb_build_object(
        'day', d::date,
        'visits',    (select count(*) from events    where name = 'visit' and created_at >= d and created_at < d + interval '1 day'),
        'new_users', (select count(*) from profiles  where created_at >= d and created_at < d + interval '1 day'),
        'interests', (select count(*) from interests where created_at >= d and created_at < d + interval '1 day'),
        'matches',   (select count(*) from matches   where created_at >= d and created_at < d + interval '1 day')
      ) order by d) from generate_series(since, date_trunc('day', now()), interval '1 day') d)
  );
end $$;

revoke all on function public.analytics_summary(int) from public;
grant execute on function public.analytics_summary(int) to authenticated;

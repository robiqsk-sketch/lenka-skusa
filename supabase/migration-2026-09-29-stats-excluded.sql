-- Štatistika bez vlastných účtov: účty z `stats_excluded` (Lenka, Robiq) sa nepočítajú v admin štatistike.
-- Týka sa ich profilov, inzerátov, záujmov, zhôd a správ, aj všetkého, čo sa ich inzerátov/zhôd týka.
-- Udalosti (`events`) sú anonymné — tie nerozlíši databáza, appka ich na zariadení vylúčeného účtu vôbec neposiela.
-- Spustiť v Supabase → SQL Editor → New query → Run.

create table if not exists public.stats_excluded (email text primary key);
alter table public.stats_excluded enable row level security;   -- bez pravidiel: čítajú ho len funkcie nižšie
insert into public.stats_excluded (email) values ('lenkamasarikova08@gmail.com'), ('robiq.sk@gmail.com')
  on conflict do nothing;

-- Appka sa po prihlásení spýta, či sa tento účet má vynechať — ak áno, na zariadení prestane posielať udalosti.
create or replace function public.is_stats_excluded() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from stats_excluded where lower(email) = lower(auth.jwt() ->> 'email'))
$$;
revoke all on function public.is_stats_excluded() from public, anon;
grant execute on function public.is_stats_excluded() to authenticated;

create or replace function public.analytics_summary(p_days int default 7) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  since timestamptz := date_trunc('day', now()) - make_interval(days => greatest(p_days, 1) - 1);
  ex  uuid[]   := array(select u.id from auth.users u join stats_excluded e on lower(e.email) = lower(u.email));
  exp bigint[];   -- inzeráty vylúčených firiem
  exm bigint[];   -- zhody, v ktorých je vylúčený účet
begin
  if not exists (select 1 from admins where email = auth.jwt() ->> 'email') then
    raise exception 'Prístup zamietnutý.';
  end if;
  exp := array(select id from postings where company_id = any(ex));
  exm := array(select id from matches where student_id = any(ex) or company_id = any(ex) or posting_id = any(exp));
  return jsonb_build_object(
    'days', p_days, 'since', since,
    'events', (select coalesce(jsonb_object_agg(name, n), '{}') from (select name, count(*) n from events where created_at >= since group by name) t),
    'events_by_role', (select coalesce(jsonb_object_agg(k, n), '{}') from (select name || '/' || role k, count(*) n from events where created_at >= since group by name, role) t),
    'blocked', (select coalesce(jsonb_object_agg(r, n), '{}') from (select coalesce(props ->> 'reason', '?') r, count(*) n from events where name = 'reg_blocked' and created_at >= since group by 1) t),
    'reg', (select coalesce(jsonb_object_agg(k, n), '{}') from (
              select name || ':' || coalesce(props ->> 'role', '?') || coalesce(':' || (props ->> 'step'), '') k, count(*) n
              from events where name in ('reg_start', 'reg_step', 'reg_done') and created_at >= since group by 1) t),
    'period', jsonb_build_object(
      'new_students',      (select count(*) from profiles where role = 'student' and created_at >= since and id <> all(ex)),
      'new_companies',     (select count(*) from profiles where role = 'firm'    and created_at >= since and id <> all(ex)),
      'postings_new',      (select count(*) from postings where created_at >= since and id <> all(exp)),
      'interests',         (select count(*) from interests where created_at >= since and student_id <> all(ex) and posting_id <> all(exp)),
      'skips',             (select count(*) from skips where created_at >= since and student_id <> all(ex) and posting_id <> all(exp)),
      'company_interests', (select count(*) from company_interests where created_at >= since and company_id <> all(ex) and student_id <> all(ex) and posting_id <> all(exp)),
      'matches',           (select count(*) from matches where created_at >= since and id <> all(exm)),
      'messages',          (select count(*) from messages where created_at >= since and match_id <> all(exm))),
    'totals', jsonb_build_object(
      'students',           (select count(*) from students where id <> all(ex)),
      'companies',          (select count(*) from companies where id <> all(ex)),
      'companies_verified', (select count(*) from companies where verified and id <> all(ex)),
      'postings_active',    (select count(*) from postings where active and id <> all(exp)),
      'matches',            (select count(*) from matches where id <> all(exm))),
    'daily', (select jsonb_agg(jsonb_build_object(
        'day', d::date,
        'visits',    (select count(*) from events    where name = 'visit' and created_at >= d and created_at < d + interval '1 day'),
        'new_users', (select count(*) from profiles  where created_at >= d and created_at < d + interval '1 day' and id <> all(ex)),
        'interests', (select count(*) from interests where created_at >= d and created_at < d + interval '1 day' and student_id <> all(ex) and posting_id <> all(exp)),
        'matches',   (select count(*) from matches   where created_at >= d and created_at < d + interval '1 day' and id <> all(exm))
      ) order by d) from generate_series(since, date_trunc('day', now()), interval '1 day') d)
  );
end $$;

revoke all on function public.analytics_summary(int) from public, anon;
grant execute on function public.analytics_summary(int) to authenticated;

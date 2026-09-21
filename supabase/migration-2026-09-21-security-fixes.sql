-- Opravy podľa Supabase Advisors → Security. Bezpečné spustiť opakovane.
-- Spustiť v Supabase → SQL Editor → New query → Run.

-- „Function Search Path Mutable": trigger funkcie musia mať pevný search_path.
alter function public.students_guard_birth()     set search_path = public;
alter function public.companies_guard_verified() set search_path = public;

-- „Security Definer View" (candidate_profiles): pohľad nahradíme funkciou s rovnakými pravidlami.
-- Firma o kandidátovi dostane len meno, zručnosti, hodiny a fotku — a len ak jej ten študent dal záujem
-- (alebo ide o vlastný riadok). Dátum narodenia a bio zostávajú skryté rovnako ako doteraz.
drop view if exists public.candidate_profiles;

create or replace function public.candidate_profiles(p_ids uuid[])
returns table (id uuid, name text, skills jsonb, hours smallint, avatar_path text)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.skills, s.hours, s.avatar_path
  from public.students s
  where s.id = any(p_ids)
    and (s.id = auth.uid() or public.is_my_candidate(s.id))
$$;

revoke all on function public.candidate_profiles(uuid[]) from public;
grant execute on function public.candidate_profiles(uuid[]) to authenticated;

-- is_admin(): appka podľa toho ukáže adminovi „Štatistika Robiq" v menu (chýbala v prvej verzii analytics migrácie).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where email = auth.jwt() ->> 'email')
$$;

-- Supabase dáva novým funkciám automaticky EXECUTE aj pre `anon` (neprihlásených) — „revoke from public" to nezruší.
-- Funkcie určené len prihláseným preto odoberáme anon výslovne. (Všetky si aj tak vnútri overujú auth.uid(), toto je poistka navyše.)
revoke all     on function public.is_admin()               from public;
revoke execute on function public.candidate_profiles(uuid[]) from anon;
revoke execute on function public.is_admin()               from anon;
revoke execute on function public.analytics_summary(int)   from anon;
revoke execute on function public.verify_my_company()      from anon;
revoke execute on function public.suggest_candidates(bigint) from anon;
revoke execute on function public.delete_my_account()      from anon;
grant  execute on function public.is_admin() to authenticated;

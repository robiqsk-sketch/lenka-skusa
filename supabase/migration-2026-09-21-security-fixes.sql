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

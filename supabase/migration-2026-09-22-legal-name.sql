-- Overenie firmy podľa IČO: k IČO sa viaže aj oficiálny názov z Registra právnických osôb.
-- Doteraz sa overovala len existencia IČO — firma si mohla dať ľubovoľný názov a aj tak dostala ✓.
--   companies.legal_name  — oficiálny názov z registra; píše ho len verify_my_company(), firma ho meniť nemôže
--   companies.name        — zobrazovaný názov, ktorý si firma zvolí (môže sa líšiť, je to len značka)
-- Spustiť v Supabase → SQL Editor → New query → Run.

alter table public.companies add column if not exists legal_name text not null default '';

-- `verified` aj `legal_name` smie meniť len verify_my_company() (cez robiq.allow_verified v tej istej transakcii).
create or replace function public.companies_guard_verified() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_setting('robiq.allow_verified', true) is distinct from 'on' then
    if tg_op = 'INSERT' then new.verified := false; new.legal_name := '';
    else new.verified := old.verified; new.legal_name := old.legal_name; end if;
  end if;
  if tg_op = 'UPDATE' and new.ico is distinct from old.ico then           -- nové IČO → overiť znova
    new.verified := false; new.legal_name := '';
  end if;
  return new;
end $$;

drop trigger if exists companies_guard_verified on public.companies;
create trigger companies_guard_verified before insert or update on public.companies
  for each row execute function public.companies_guard_verified();

-- Overenie vlastnej firmy. Vracia výsledok rpo_lookup + { verified }.
-- Oficiálny názov sa berie z registra — nie od firmy —, takže sa s IČO nemôže rozísť.
-- Keď je register nedostupný, doterajší stav nechá tak (skúsi sa nabudúce).
create or replace function public.verify_my_company() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c  companies%rowtype;
  r  jsonb;
  ok boolean;
begin
  select * into c from companies where id = auth.uid();
  if not found then raise exception 'Firma neexistuje.'; end if;
  r := public.rpo_lookup(c.ico);
  if r ->> 'reason' = 'unavailable' then
    return r || jsonb_build_object('verified', c.verified, 'legal_name', c.legal_name);
  end if;
  ok := (r ->> 'found')::boolean and not coalesce((r ->> 'terminated')::boolean, false);
  perform set_config('robiq.allow_verified', 'on', true);
  update companies set verified = ok, legal_name = case when ok then coalesce(r ->> 'name', '') else '' end,
                       updated_at = now() where id = c.id;
  return r || jsonb_build_object('verified', ok, 'legal_name', case when ok then coalesce(r ->> 'name', '') else '' end);
end $$;

revoke all on function public.verify_my_company() from public;
grant execute on function public.verify_my_company() to authenticated;

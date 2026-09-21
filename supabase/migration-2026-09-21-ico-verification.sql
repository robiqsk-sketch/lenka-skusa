-- Overenie firiem podľa IČO v Registri právnických osôb (RPO, Štatistický úrad SR — verejné API, licencia CC-BY 4.0).
--   rpo_lookup(ičo)      — vyhľadá firmu; volá ju appka v kroku 1 registrácie (ešte bez prihlásenia) a ukáže názov.
--   verify_my_company()  — overí vlastnú firmu (po registrácii / z profilu) a nastaví companies.verified.
--   trigger              — `verified` si firma nemôže nastaviť sama cez API; zmena IČO overenie zruší.
-- Spustiť v Supabase → SQL Editor → New query → Run.

create extension if not exists http with schema extensions;   -- HTTP volania z databázy (pgsql-http)

-- Vyhľadanie v RPO. Vracia jsonb:
--   { found: true,  name, city, terminated }          firma existuje (terminated = je zrušená)
--   { found: false, reason: 'format' | 'not_found' | 'unavailable' }
create or replace function public.rpo_lookup(p_ico text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  ico  text := regexp_replace(coalesce(p_ico, ''), '\s', '', 'g');
  resp extensions.http_response;
  hit  jsonb;
begin
  if ico !~ '^[0-9]{8}$' then return jsonb_build_object('found', false, 'reason', 'format'); end if;
  begin
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '6000');
    resp := extensions.http_get('https://api.statistics.sk/rpo/v1/search?identifier=' || ico);
  exception when others then
    return jsonb_build_object('found', false, 'reason', 'unavailable');
  end;
  if resp.status <> 200 then return jsonb_build_object('found', false, 'reason', 'unavailable'); end if;

  -- Register vracia aj približné zhody → berieme len záznam s presne týmto IČO; živý má prednosť pred zrušeným.
  select x into hit
  from jsonb_array_elements(resp.content::jsonb -> 'results') x
  where exists (select 1 from jsonb_array_elements(x -> 'identifiers') i where i ->> 'value' = ico)
  order by (x ? 'termination') asc
  limit 1;
  if hit is null then return jsonb_build_object('found', false, 'reason', 'not_found'); end if;

  return jsonb_build_object(
    'found', true,
    'name', (select n ->> 'value' from jsonb_array_elements(hit -> 'fullNames') n order by n ->> 'validFrom' desc limit 1),
    'city', hit -> 'addresses' -> 0 -> 'municipality' ->> 'value',
    'terminated', hit ? 'termination');
end $$;

revoke all on function public.rpo_lookup(text) from public;
grant execute on function public.rpo_lookup(text) to anon, authenticated;

-- `verified` smie meniť len verify_my_company() (cez nastavenie robiq.allow_verified v tej istej transakcii).
create or replace function public.companies_guard_verified() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_setting('robiq.allow_verified', true) is distinct from 'on' then
    if tg_op = 'INSERT' then new.verified := false; else new.verified := old.verified; end if;
  end if;
  if tg_op = 'UPDATE' and new.ico is distinct from old.ico then new.verified := false; end if;   -- nové IČO → overiť znova
  return new;
end $$;

drop trigger if exists companies_guard_verified on public.companies;
create trigger companies_guard_verified before insert or update on public.companies
  for each row execute function public.companies_guard_verified();

-- Overenie vlastnej firmy. Vracia výsledok rpo_lookup + { verified }.
-- Keď je register nedostupný, doterajší stav `verified` nechá tak (skúsi sa nabudúce).
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
  if r ->> 'reason' = 'unavailable' then return r || jsonb_build_object('verified', c.verified); end if;
  ok := (r ->> 'found')::boolean and not coalesce((r ->> 'terminated')::boolean, false);
  perform set_config('robiq.allow_verified', 'on', true);
  update companies set verified = ok, updated_at = now() where id = c.id;
  return r || jsonb_build_object('verified', ok);
end $$;

revoke all on function public.verify_my_company() from public;
grant execute on function public.verify_my_company() to authenticated;

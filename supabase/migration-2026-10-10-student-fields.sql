-- Registrácia v3 (10. 10. 2026): študent si pri registrácii vyberie, akú prácu hľadá (odvetvie — rovnaký zoznam ako firmy).
-- Firma pri kandidátovi uvidí navyše odvetvie, dni a časti dňa — aj keď si študent profil nedoplnil: Robiq mu ich navrhne
-- podľa inzerátov, o ktoré mal záujem, a uloží len to, čo študent potvrdí (appka, nie databáza).
-- Bezpečné spustiť kedykoľvek: staršia appka nový stĺpec ani nové stĺpce funkcie nepoužíva.

alter table public.students add column if not exists fields text[] not null default '{}';

-- Registrácia e-mailom: odvetvie z metadát. Inak bez zmeny oproti ostrej databáze (vrátane bio a telefónu z testu AI registrácie).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  d jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text  := d->>'role';
begin
  if r is null then return new; end if;
  insert into profiles (id, role) values (new.id, r);
  if r = 'firm' then
    insert into companies (id, name, ico, fields, contact_name, city_id)
    values (new.id, coalesce(d->>'name', 'Firma'), coalesce(d->>'ico', ''),
            coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(d->'fields', '[]'::jsonb)) x), '{}'),
            coalesce(d->>'contact_name', ''), nullif(d->>'city_id', '')::int);
  else
    insert into students (id, name, birth, skills, hours, avail_days, avail_times, city_id, commute, bio, phone, fields)
    values (new.id, coalesce(d->>'name', ''), nullif(d->>'birth', '')::date, coalesce(d->'skills', '[]'::jsonb), coalesce((d->>'hours')::smallint, 1),
            coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(d->'avail_days',  '[]'::jsonb)) x), '{}'),
            coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(d->'avail_times', '[]'::jsonb)) x), '{}'),
            nullif(d->>'city_id', '')::int, coalesce(nullif(d->>'commute', ''), '30km'), left(coalesce(d->>'bio', ''), 500),
            left(coalesce(d->>'phone', ''), 20),
            coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(d->'fields', '[]'::jsonb)) x), '{}'));
  end if;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Firma o kandidátovi: navyše odvetvie, dni a časti dňa. Stále nie dátum narodenia, bio ani telefón.
-- (Zmena stĺpcov výsledku → funkciu treba zmazať a vytvoriť znova; nič iné na nej nezávisí.)
drop function if exists public.candidate_profiles(uuid[]);
create function public.candidate_profiles(p_ids uuid[])
returns table (id uuid, name text, skills jsonb, hours smallint, avatar_path text, city text, fields text[], avail_days text[], avail_times text[])
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.skills, s.hours, s.avatar_path, c.name, s.fields, s.avail_days, s.avail_times
  from public.students s left join public.cities c on c.id = s.city_id
  where s.id = any(p_ids) and (s.id = auth.uid() or public.is_my_candidate(s.id))
$$;
revoke all on function public.candidate_profiles(uuid[]) from public;
revoke execute on function public.candidate_profiles(uuid[]) from anon;
grant execute on function public.candidate_profiles(uuid[]) to authenticated;

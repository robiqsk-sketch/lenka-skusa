-- Registrácia: kontrola, či e-mail už má účet — appka ju volá hneď v kroku 1 (študent) / kroku 3 (firma),
-- aby obsadený e-mail nepustila ďalej. Supabase pri zapnutom potvrdzovaní e-mailu na signUp s obsadeným
-- e-mailom nevráti chybu (kvôli ochrane pred zisťovaním účtov), preto sa pýtame vopred.
-- Spustiť v Supabase → SQL Editor → New query → Run.

create or replace function public.email_taken(p_email text) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from auth.users where lower(email) = lower(trim(p_email)))
$$;

revoke all on function public.email_taken(text) from public;
grant execute on function public.email_taken(text) to anon, authenticated;

-- Poistka: Google (OAuth) používateľ prichádza bez roly → trigger mu profil NEvytvorí.
-- Profil vznikne až v appke po výbere typu účtu a dokončení onboardingu (meno, zručnosti, čas).
-- Rovnaké ako v schema.sql — tu len pre istotu, aby živá DB nemala staršiu verziu.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  d jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text  := d->>'role';
begin
  if r is null then return new; end if;
  insert into profiles (id, role) values (new.id, r);
  if r = 'firm' then
    insert into companies (id, name, ico, fields, contact_name)
    values (new.id, coalesce(d->>'name', 'Firma'), coalesce(d->>'ico', ''),
            coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(d->'fields', '[]'::jsonb)) x), '{}'),
            coalesce(d->>'contact_name', ''));
  else
    insert into students (id, name, birth, skills, hours, avail_days, avail_times)
    values (new.id, coalesce(d->>'name', ''), nullif(d->>'birth', '')::date, coalesce(d->'skills', '[]'::jsonb), coalesce((d->>'hours')::smallint, 1),
            coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(d->'avail_days',  '[]'::jsonb)) x), '{}'),
            coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(d->'avail_times', '[]'::jsonb)) x), '{}'));
  end if;
  return new;
end $$;

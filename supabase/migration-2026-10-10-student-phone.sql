-- TEST (registrácia rozhovorom s AI): telefónne číslo študenta. Vypĺňa sa vo formulári po rozhovore, upraviť sa dá v profile.
-- Vidí ho zatiaľ len študent sám — firma číta študentov len cez candidate_profiles (bez telefónu). Kto ho uvidí, treba rozhodnúť.
alter table public.students add column if not exists phone text not null default '';

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
    insert into students (id, name, birth, skills, hours, avail_days, avail_times, city_id, commute, bio, phone)
    values (new.id, coalesce(d->>'name', ''), nullif(d->>'birth', '')::date, coalesce(d->'skills', '[]'::jsonb), coalesce((d->>'hours')::smallint, 1),
            coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(d->'avail_days',  '[]'::jsonb)) x), '{}'),
            coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(d->'avail_times', '[]'::jsonb)) x), '{}'),
            nullif(d->>'city_id', '')::int, coalesce(nullif(d->>'commute', ''), '30km'), left(coalesce(d->>'bio', ''), 500),
            left(coalesce(d->>'phone', ''), 20));
  end if;
  return new;
end $$;

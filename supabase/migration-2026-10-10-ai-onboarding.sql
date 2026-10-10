-- TEST: registrácia študenta rozhovorom s AI (funkcia ai-onboarding, obrazovka „aiob" v appke).
-- 1) Počítadlo volaní funkcie — limit na IP za hodinu a spolu za deň, aby nikto nevyčerpal kredit na AI.
--    Ukladá sa len odtlačok (hash) IP, nie IP samotná; staršie ako týždeň funkcia maže. Appka do tabuľky nevidí.
create table if not exists public.ai_onboarding_calls (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ip_hash    text not null
);
alter table public.ai_onboarding_calls enable row level security;   -- bez pravidiel → anon / authenticated nič
revoke all on public.ai_onboarding_calls from anon, authenticated;
create index if not exists ai_onboarding_calls_ip_idx on public.ai_onboarding_calls (ip_hash, created_at desc);
create index if not exists ai_onboarding_calls_created_idx on public.ai_onboarding_calls (created_at desc);

-- 2) Registrácia: aj „o mne" (bio) z metadát — AI ho napíše z rozhovoru. Klasická registrácia ho neposiela → ostane ''.
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
    insert into students (id, name, birth, skills, hours, avail_days, avail_times, city_id, commute, bio)
    values (new.id, coalesce(d->>'name', ''), nullif(d->>'birth', '')::date, coalesce(d->'skills', '[]'::jsonb), coalesce((d->>'hours')::smallint, 1),
            coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(d->'avail_days',  '[]'::jsonb)) x), '{}'),
            coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(d->'avail_times', '[]'::jsonb)) x), '{}'),
            nullif(d->>'city_id', '')::int, coalesce(nullif(d->>'commute', ''), '30km'), left(coalesce(d->>'bio', ''), 500));
  end if;
  return new;
end $$;

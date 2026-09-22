-- Zručnosť „Vodičák B" sa premenováva na oficiálny názov „Vodičský preukaz B".
-- (1) prepíše názov v už uložených profiloch študentov, (2) aktualizuje mapu odvetvie → zručnosti.
-- Spustiť v Supabase → SQL Editor → New query → Run.

update public.students s
set skills = (
  select jsonb_agg(
    case when x->>'n' = 'Vodičák B' then jsonb_set(x, '{n}', '"Vodičský preukaz B"'::jsonb) else x end
    order by ord)
  from jsonb_array_elements(s.skills) with ordinality t(x, ord))
where s.skills @> '[{"n":"Vodičák B"}]'::jsonb;

create or replace function public.field_skills(fields text[]) returns text[]   -- odvetvie firmy → zručnosti (plán §2)
language sql immutable as $$
  select coalesce(array_agg(distinct s), '{}') from unnest(fields) f cross join lateral unnest(case f
    when 'Gastro'            then array['Barista','Čašník / Servírka','Kuchyňa','Pokladňa']
    when 'Retail'            then array['Predaj','Pokladňa']
    when 'Sklad a logistika' then array['Sklad','Vodičský preukaz B','Fyzická kondícia']
    when 'Eventy'            then array['Eventy','Hostesing','Promo akcie']
    when 'IT a dizajn'       then array['React','Tvorba webu','Grafika','Figma','Canva','Photoshop','Video strih','Copywriting','Sociálne siete','Excel','Dátová analýza','AI nástroje']
    when 'Doučovanie'        then array['Doučovanie','Angličtina','Nemčina','Španielčina','Francúzština','Taliančina','Ruština','Ukrajinčina','Maďarčina','Poľština','Čínština']
    when 'Administratíva'    then array['Administratíva','Excel']
    when 'Manuálna práca'    then array['Fyzická kondícia','Upratovanie','Kuchyňa']
    else '{}'::text[] end) s
$$;

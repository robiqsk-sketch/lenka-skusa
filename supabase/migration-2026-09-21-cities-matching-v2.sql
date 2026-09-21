-- Miesto + párovanie v2 (docs/PLAN-parovanie-v2.md, rozhodnutia 21. 9. 2026: 4 stupne dochádzania, mesto študenta povinné,
-- miesto ako brána). Spustiť v Supabase → SQL Editor → New query → Run.

create extension if not exists unaccent with schema extensions;

-- ── Mestá (pevný zoznam, GPS pre výpočet vzdialenosti — bez externej služby) ──
create table if not exists public.cities (
  id        int primary key,
  name      text not null,
  district  text not null,          -- okres
  region    text not null,          -- kraj
  lat       double precision not null,
  lng       double precision not null
);
alter table public.cities enable row level security;
drop policy if exists "cities: public read" on public.cities;
create policy "cities: public read" on public.cities for select using (true);

insert into public.cities (id, name, district, region, lat, lng) values
  (1,'Bratislava','Bratislava','Bratislavský',48.1486,17.1077),(2,'Malacky','Malacky','Bratislavský',48.4364,17.0217),(3,'Pezinok','Pezinok','Bratislavský',48.2897,17.2669),
  (4,'Senec','Senec','Bratislavský',48.2192,17.4003),(5,'Stupava','Malacky','Bratislavský',48.2747,17.0322),(6,'Modra','Pezinok','Bratislavský',48.3331,17.3067),(7,'Svätý Jur','Pezinok','Bratislavský',48.2522,17.2130),
  (10,'Trnava','Trnava','Trnavský',48.3774,17.5883),(11,'Piešťany','Piešťany','Trnavský',48.5949,17.8253),(12,'Hlohovec','Hlohovec','Trnavský',48.4312,17.8031),(13,'Galanta','Galanta','Trnavský',48.1893,17.7278),
  (14,'Sereď','Galanta','Trnavský',48.2880,17.7367),(15,'Dunajská Streda','Dunajská Streda','Trnavský',47.9931,17.6203),(16,'Šamorín','Dunajská Streda','Trnavský',48.0296,17.3094),(17,'Senica','Senica','Trnavský',48.6797,17.3665),
  (18,'Skalica','Skalica','Trnavský',48.8447,17.2264),(19,'Holíč','Skalica','Trnavský',48.8113,17.1618),(20,'Vrbové','Piešťany','Trnavský',48.6194,17.7228),(21,'Leopoldov','Hlohovec','Trnavský',48.4471,17.7631),
  (22,'Gabčíkovo','Dunajská Streda','Trnavský',47.8931,17.5772),(23,'Veľký Meder','Dunajská Streda','Trnavský',47.8583,17.7697),
  (30,'Trenčín','Trenčín','Trenčiansky',48.8945,18.0444),(31,'Prievidza','Prievidza','Trenčiansky',48.7745,18.6246),(32,'Bojnice','Prievidza','Trenčiansky',48.7803,18.5779),(33,'Handlová','Prievidza','Trenčiansky',48.7275,18.7607),
  (34,'Nováky','Prievidza','Trenčiansky',48.7143,18.5348),(35,'Partizánske','Partizánske','Trenčiansky',48.6285,18.3796),(36,'Bánovce nad Bebravou','Bánovce nad Bebravou','Trenčiansky',48.7190,18.2580),
  (37,'Nové Mesto nad Váhom','Nové Mesto nad Váhom','Trenčiansky',48.7573,17.8300),(38,'Stará Turá','Nové Mesto nad Váhom','Trenčiansky',48.7772,17.6953),(39,'Myjava','Myjava','Trenčiansky',48.7534,17.5680),
  (40,'Považská Bystrica','Považská Bystrica','Trenčiansky',49.1215,18.4256),(41,'Púchov','Púchov','Trenčiansky',49.1246,18.3310),(42,'Dubnica nad Váhom','Ilava','Trenčiansky',48.9591,18.1665),
  (43,'Ilava','Ilava','Trenčiansky',48.9985,18.2345),(44,'Nová Dubnica','Ilava','Trenčiansky',48.9339,18.1440),(45,'Trenčianske Teplice','Trenčín','Trenčiansky',48.9106,18.1656),
  (50,'Nitra','Nitra','Nitriansky',48.3069,18.0864),(51,'Nové Zámky','Nové Zámky','Nitriansky',47.9853,18.1614),(52,'Komárno','Komárno','Nitriansky',47.7633,18.1275),(53,'Levice','Levice','Nitriansky',48.2158,18.6069),
  (54,'Šaľa','Šaľa','Nitriansky',48.1516,17.8802),(55,'Topoľčany','Topoľčany','Nitriansky',48.5628,18.1745),(56,'Zlaté Moravce','Zlaté Moravce','Nitriansky',48.3856,18.4008),(57,'Šurany','Nové Zámky','Nitriansky',48.0858,18.1878),
  (58,'Štúrovo','Nové Zámky','Nitriansky',47.7989,18.7178),(59,'Vráble','Nitra','Nitriansky',48.2441,18.3084),(60,'Kolárovo','Komárno','Nitriansky',47.9219,17.9856),(61,'Hurbanovo','Komárno','Nitriansky',47.8747,18.1908),
  (62,'Tlmače','Levice','Nitriansky',48.2886,18.5283),(63,'Šahy','Levice','Nitriansky',48.0742,18.9503),(64,'Želiezovce','Levice','Nitriansky',48.0508,18.6614),
  (70,'Žilina','Žilina','Žilinský',49.2231,18.7394),(71,'Martin','Martin','Žilinský',49.0665,18.9217),(72,'Vrútky','Martin','Žilinský',49.1117,18.9219),(73,'Turčianske Teplice','Turčianske Teplice','Žilinský',48.8621,18.8620),
  (74,'Čadca','Čadca','Žilinský',49.4380,18.7893),(75,'Kysucké Nové Mesto','Kysucké Nové Mesto','Žilinský',49.3005,18.7895),(76,'Turzovka','Čadca','Žilinský',49.4028,18.6243),(77,'Bytča','Bytča','Žilinský',49.2241,18.5581),
  (78,'Ružomberok','Ružomberok','Žilinský',49.0789,19.3050),(79,'Liptovský Mikuláš','Liptovský Mikuláš','Žilinský',49.0830,19.6122),(80,'Liptovský Hrádok','Liptovský Mikuláš','Žilinský',49.0393,19.7245),
  (81,'Dolný Kubín','Dolný Kubín','Žilinský',49.2091,19.3006),(82,'Námestovo','Námestovo','Žilinský',49.4080,19.4810),(83,'Tvrdošín','Tvrdošín','Žilinský',49.3378,19.5544),(84,'Trstená','Tvrdošín','Žilinský',49.3611,19.6136),
  (85,'Rajec','Žilina','Žilinský',49.0886,18.6390),(86,'Krásno nad Kysucou','Čadca','Žilinský',49.4020,18.8355),
  (90,'Banská Bystrica','Banská Bystrica','Banskobystrický',48.7363,19.1462),(91,'Zvolen','Zvolen','Banskobystrický',48.5762,19.1246),(92,'Brezno','Brezno','Banskobystrický',48.8047,19.6390),
  (93,'Lučenec','Lučenec','Banskobystrický',48.3320,19.6672),(94,'Fiľakovo','Lučenec','Banskobystrický',48.2677,19.8247),(95,'Rimavská Sobota','Rimavská Sobota','Banskobystrický',48.3830,20.0206),
  (96,'Veľký Krtíš','Veľký Krtíš','Banskobystrický',48.2094,19.3493),(97,'Žiar nad Hronom','Žiar nad Hronom','Banskobystrický',48.5906,18.8501),(98,'Banská Štiavnica','Banská Štiavnica','Banskobystrický',48.4586,18.8934),
  (99,'Žarnovica','Žarnovica','Banskobystrický',48.4818,18.7170),(100,'Kremnica','Žiar nad Hronom','Banskobystrický',48.7047,18.9184),(101,'Detva','Detva','Banskobystrický',48.5580,19.4204),
  (102,'Krupina','Krupina','Banskobystrický',48.3556,19.0645),(103,'Revúca','Revúca','Banskobystrický',48.6832,20.1140),(104,'Poltár','Poltár','Banskobystrický',48.4302,19.7950),(105,'Hriňová','Detva','Banskobystrický',48.5789,19.5253),
  (106,'Tornaľa','Revúca','Banskobystrický',48.4207,20.3253),(107,'Sliač','Zvolen','Banskobystrický',48.6231,19.1502),
  (110,'Prešov','Prešov','Prešovský',48.9986,21.2400),(111,'Poprad','Poprad','Prešovský',49.0553,20.2977),(112,'Kežmarok','Kežmarok','Prešovský',49.1358,20.4300),(113,'Svit','Poprad','Prešovský',49.0603,20.2059),
  (114,'Spišská Belá','Kežmarok','Prešovský',49.1872,20.4589),(115,'Levoča','Levoča','Prešovský',49.0237,20.5893),(116,'Stará Ľubovňa','Stará Ľubovňa','Prešovský',49.2996,20.6900),(117,'Bardejov','Bardejov','Prešovský',49.2929,21.2764),
  (118,'Humenné','Humenné','Prešovský',48.9370,21.9155),(119,'Snina','Snina','Prešovský',48.9877,22.1466),(120,'Medzilaborce','Medzilaborce','Prešovský',49.2725,21.9035),(121,'Vranov nad Topľou','Vranov nad Topľou','Prešovský',48.8891,21.6843),
  (122,'Svidník','Svidník','Prešovský',49.3060,21.5700),(123,'Stropkov','Stropkov','Prešovský',49.2033,21.6510),(124,'Sabinov','Sabinov','Prešovský',49.1030,21.0985),(125,'Lipany','Sabinov','Prešovský',49.1560,20.9634),
  (126,'Veľký Šariš','Prešov','Prešovský',49.0387,21.1919),(127,'Vysoké Tatry','Poprad','Prešovský',49.1266,20.2211),
  (130,'Košice','Košice','Košický',48.7164,21.2611),(131,'Michalovce','Michalovce','Košický',48.7563,21.9159),(132,'Sobrance','Sobrance','Košický',48.7439,22.1810),(133,'Trebišov','Trebišov','Košický',48.6285,21.7193),
  (134,'Sečovce','Trebišov','Košický',48.6996,21.6606),(135,'Kráľovský Chlmec','Trebišov','Košický',48.4225,21.9800),(136,'Rožňava','Rožňava','Košický',48.6602,20.5318),(137,'Dobšiná','Rožňava','Košický',48.8210,20.3679),
  (138,'Spišská Nová Ves','Spišská Nová Ves','Košický',48.9447,20.5616),(139,'Krompachy','Spišská Nová Ves','Košický',48.9143,20.8779),(140,'Gelnica','Gelnica','Košický',48.8542,20.9366),
  (141,'Moldava nad Bodvou','Košice-okolie','Košický',48.6153,20.9962),(142,'Veľké Kapušany','Michalovce','Košický',48.5479,22.0805),(143,'Strážske','Michalovce','Košický',48.8746,21.8367)
on conflict (id) do nothing;

-- ── Nové stĺpce ──
alter table public.students  add column if not exists city_id int references public.cities (id);
alter table public.students  add column if not exists commute text not null default '30km' check (commute in ('city', '15km', '30km', 'any'));
alter table public.postings  add column if not exists city_id int references public.cities (id);
alter table public.postings  add column if not exists remote boolean not null default false;
alter table public.companies add column if not exists city_id int references public.cities (id);

-- ── Pomocné funkcie ──
create or replace function public.distance_km(a int, b int) returns double precision
language sql stable set search_path = public as $$
  select case when a is null or b is null then null when a = b then 0 else
    6371 * 2 * asin(sqrt(
      sin(radians(cb.lat - ca.lat) / 2) ^ 2 +
      cos(radians(ca.lat)) * cos(radians(cb.lat)) * sin(radians(cb.lng - ca.lng) / 2) ^ 2))
  end
  from cities ca, cities cb where ca.id = a and cb.id = b
$$;

create or replace function public.norm(t text) returns text            -- malé písmená bez diakritiky (slovná zhoda)
language sql immutable set search_path = public, extensions as $$ select lower(extensions.unaccent(coalesce(t, ''))) $$;

create or replace function public.field_skills(fields text[]) returns text[]   -- odvetvie firmy → zručnosti (plán §2)
language sql immutable as $$
  select coalesce(array_agg(distinct s), '{}') from unnest(fields) f cross join lateral unnest(case f
    when 'Gastro'            then array['Barista','Čašník / Servírka','Kuchyňa','Pokladňa']
    when 'Retail'            then array['Predaj','Pokladňa']
    when 'Sklad a logistika' then array['Sklad','Vodičák B','Fyzická kondícia']
    when 'Eventy'            then array['Eventy','Hostesing','Promo akcie']
    when 'IT a dizajn'       then array['React','Tvorba webu','Grafika','Figma','Canva','Photoshop','Video strih','Copywriting','Sociálne siete','Excel','Dátová analýza','AI nástroje']
    when 'Doučovanie'        then array['Doučovanie','Angličtina','Nemčina','Španielčina','Francúzština','Taliančina','Ruština','Ukrajinčina','Maďarčina','Poľština','Čínština']
    when 'Administratíva'    then array['Administratíva','Excel']
    when 'Manuálna práca'    then array['Fyzická kondícia','Upratovanie','Kuchyňa']
    else '{}'::text[] end) s
$$;

-- ── Registrácia: mesto a dochádzanie z metadát ──
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
    insert into students (id, name, birth, skills, hours, avail_days, avail_times, city_id, commute)
    values (new.id, coalesce(d->>'name', ''), nullif(d->>'birth', '')::date, coalesce(d->'skills', '[]'::jsonb), coalesce((d->>'hours')::smallint, 1),
            coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(d->'avail_days',  '[]'::jsonb)) x), '{}'),
            coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(d->'avail_times', '[]'::jsonb)) x), '{}'),
            nullif(d->>'city_id', '')::int, coalesce(nullif(d->>'commute', ''), '30km'));
  end if;
  return new;
end $$;

-- ── Kandidáti pre firmu: aj mesto (po záujme firma vidí meno, tak aj mesto) ──
drop function if exists public.candidate_profiles(uuid[]);
create or replace function public.candidate_profiles(p_ids uuid[])
returns table (id uuid, name text, skills jsonb, hours smallint, avatar_path text, city text)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.skills, s.hours, s.avatar_path, c.name
  from public.students s left join public.cities c on c.id = s.city_id
  where s.id = any(p_ids) and (s.id = auth.uid() or public.is_my_candidate(s.id))
$$;
revoke all on function public.candidate_profiles(uuid[]) from public;
revoke execute on function public.candidate_profiles(uuid[]) from anon;
grant execute on function public.candidate_profiles(uuid[]) to authenticated;

-- ── Návrhy kandidátov v2 ──
-- Brány: 18+ · miesto (inzerát nie je remote → študent musí byť v dosahu podľa svojho `commute`; starý inzerát bez mesta → bez brány).
-- Body (max 100): zručnosti 45 (× úroveň) · odvetvie 15 · dostupnosť 25 · miesto 10 · hodiny 5 · čerstvosť 5. Prah 30, max 12.
drop function if exists public.suggest_candidates(bigint);
create or replace function public.suggest_candidates(p_posting bigint)
returns table (
  student_id  uuid, score int, skills text[], hours smallint, avail_days text[], avail_times text[],
  city text, distance_km int, contacted boolean, interested boolean
)
language plpgsql security definer set search_path = public as $$
declare
  p postings%rowtype;
  hay text;
  fs  text[];
begin
  select * into p from postings where id = p_posting and company_id = auth.uid();
  if not found then return; end if;
  hay := public.norm(coalesce(p.title, '') || ' ' || coalesce(p.ai_note, '') || ' ' || coalesce(p.description, '') || ' ' || array_to_string(p.types, ' '));
  fs  := public.field_skills((select c.fields from companies c where c.id = p.company_id));

  return query
  with st as (
    select s.id, s.hours, s.avail_days, s.avail_times, s.updated_at, s.city_id, s.commute, s.skills as sk,
           array(select x->>'n' from jsonb_array_elements(s.skills) x) as names,
           public.distance_km(p.city_id, s.city_id) as dist
    from students s
    where s.id <> auth.uid()
      and (not p.only18 or (s.birth is not null and s.birth <= current_date - interval '18 years'))
  ),
  gated as (
    select * from st
    where p.remote or p.city_id is null
       or (st.city_id is not null and (st.city_id = p.city_id
            or (st.commute = '15km' and st.dist <= 15)
            or (st.commute = '30km' and st.dist <= 30)
            or st.commute = 'any'))
  ),
  scored as (
    select g.*,
      coalesce((select sum(case rn when 1 then 25 when 2 then 12 else 8 end
                           * case coalesce((x->>'lvl')::int, 2) when 1 then 0.7 when 3 then 1.2 else 1 end)
                from (select x, row_number() over () rn
                      from jsonb_array_elements(g.sk) x
                      where position(left(public.norm(x->>'n'), 5) in hay) > 0 limit 3) m), 0) as sk_pts,
      case when g.names && fs then 15 else 0 end as field_pts,
      least(25,
          case when 'Víkendy'    = any(p.types) and g.avail_days && array['So','Ne'] then 12 else 0 end
        + case when 'Poobede'    = any(p.types) and 'Poobede' = any(g.avail_times)   then 8  else 0 end
        + case when 'Večery'     = any(p.types) and 'Večer'   = any(g.avail_times)   then 8  else 0 end
        + case when 'Flexibilné' = any(p.types) and cardinality(g.avail_days) >= 4  then 8  else 0 end) as av_pts,
      case when p.remote then 5 when p.city_id is not null and g.city_id = p.city_id then 10 when g.dist <= 30 then 5 else 0 end as place_pts,
      case when g.hours >= 1 then 5 else 0 end as hours_pts,                       -- HOURS index 1 = 10 h / týždeň
      case when g.updated_at >= now() - interval '30 days' then 5 when g.updated_at >= now() - interval '90 days' then 2 else 0 end as fresh_pts
    from gated g
  )
  select sc.id, least(round(sc.sk_pts + sc.field_pts + sc.av_pts + sc.place_pts + sc.hours_pts + sc.fresh_pts)::int, 100),
         sc.names, sc.hours, sc.avail_days, sc.avail_times,
         (select c.name from cities c where c.id = sc.city_id), round(sc.dist)::int,
         exists (select 1 from company_interests ci where ci.posting_id = p_posting and ci.student_id = sc.id),
         exists (select 1 from interests i where i.posting_id = p_posting and i.student_id = sc.id)
  from scored sc
  where sc.sk_pts + sc.field_pts + sc.av_pts + sc.place_pts + sc.hours_pts + sc.fresh_pts >= 30
  order by 2 desc, sc.updated_at desc, random()
  limit 12;
end $$;
revoke all on function public.suggest_candidates(bigint) from public;
revoke execute on function public.suggest_candidates(bigint) from anon;
grant execute on function public.suggest_candidates(bigint) to authenticated;

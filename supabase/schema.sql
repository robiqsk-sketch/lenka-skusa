-- Robiq — databázová schéma pre Supabase
-- Spustiť raz v Supabase → SQL Editor → New query → Run.
--
-- Model: každý používateľ (auth.users) má riadok v `profiles` s rolou.
-- Študent má `students`, firma `companies`. Firma zverejňuje `postings`.
-- Študent dá záujem (`interests`), firma dá záujem (`company_interests`);
-- keď existujú obe pre ten istý inzerát, trigger vytvorí `matches` a začne chat (`messages`).

-- ─────────────────────────── Tabuľky ───────────────────────────

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


create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null check (role in ('student', 'firm')),
  created_at  timestamptz not null default now()
);

create table public.students (
  id           uuid primary key references public.profiles (id) on delete cascade,
  name         text not null default '',
  skills       jsonb not null default '[]',        -- [{ n, lvl, speak }]
  hours        smallint not null default 1,        -- index do HOURS (0–3)
  avail_days   text[] not null default '{}',
  avail_times  text[] not null default '{}',
  birth        date,
  city_id      int references public.cities (id),   -- mesto (pevný zoznam cities)
  commute      text not null default '30km' check (commute in ('city', '15km', '30km', 'any')),   -- kam je ochotný dochádzať
  bio          text not null default '',
  avatar_path  text,                                -- cesta v neverejnom bucket-e avatars: <uid>/avatar.<ext>
  updated_at   timestamptz not null default now()
);

create table public.companies (
  id            uuid primary key references public.profiles (id) on delete cascade,
  name          text not null,
  ico           text not null default '',
  fields        text[] not null default '{}',
  contact_name  text not null default '',
  description   text not null default '',
  logo_url      text,
  city_id       int references public.cities (id),   -- sídlo; predvyplní nový inzerát
  verified      boolean not null default false,
  updated_at    timestamptz not null default now()
);

create table public.postings (
  id          bigint generated always as identity primary key,
  company_id  uuid not null references public.companies (id) on delete cascade,
  title       text not null,
  pay         text not null default '8',           -- hodinová sadzba, text ako v UI ("8,50")
  need        int  not null default 1 check (need >= 1),
  taken       int  not null default 0,
  types       text[] not null default '{}',        -- Víkendy, Poobede, …
  only18      boolean not null default false,
  city_id     int references public.cities (id),   -- miesto výkonu (null len pri remote / starých inzerátoch)
  remote      boolean not null default false,
  ai_note     text not null default '',
  description text not null default '',
  start       text not null default 'ihneď',
  photos      text[] not null default '{}',         -- „deň v práci": verejné URL (bucket posting-photos), max. 3
  active      boolean not null default true,        -- pozastavené firmou
  blocked     boolean not null default false,       -- pozastavené Robiqom (admin) — firma to späť nezapne
  block_reason text not null default '',
  views       int  not null default 0,
  created_at  timestamptz not null default now()
);
create index postings_company_idx on public.postings (company_id);
create index postings_active_idx  on public.postings (active, created_at desc);

-- Študent → „Mám záujem"
create table public.interests (
  id          bigint generated always as identity primary key,
  posting_id  bigint not null references public.postings (id) on delete cascade,
  student_id  uuid   not null references public.students (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (posting_id, student_id)
);

-- Študent → „Preskočiť" (aby sa karta už nezobrazovala)
create table public.skips (
  posting_id  bigint not null references public.postings (id) on delete cascade,
  student_id  uuid   not null references public.students (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (posting_id, student_id)
);

-- Firma → „Prejaviť záujem" o kandidáta na konkrétny inzerát
create table public.company_interests (
  id          bigint generated always as identity primary key,
  posting_id  bigint not null references public.postings (id) on delete cascade,
  company_id  uuid   not null references public.companies (id) on delete cascade,
  student_id  uuid   not null references public.students (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (posting_id, student_id)
);

-- Zhoda = obojstranný záujem. Vytvára ju trigger, nie klient.
create table public.matches (
  id          bigint generated always as identity primary key,
  posting_id  bigint not null references public.postings (id) on delete cascade,
  student_id  uuid   not null references public.students (id) on delete cascade,
  company_id  uuid   not null references public.companies (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (posting_id, student_id)
);
create index matches_student_idx on public.matches (student_id);
create index matches_company_idx on public.matches (company_id);

create table public.messages (
  id          bigint generated always as identity primary key,
  match_id    bigint not null references public.matches (id) on delete cascade,
  sender_id   uuid   not null references public.profiles (id) on delete cascade,
  body        text   not null check (length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index messages_match_idx on public.messages (match_id, created_at);

-- ─────────────────────────── Trigger: zhoda ───────────────────────────

create or replace function public.try_match(p_posting bigint, p_student uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from interests         where posting_id = p_posting and student_id = p_student)
 and exists (select 1 from company_interests where posting_id = p_posting and student_id = p_student) then
    insert into matches (posting_id, student_id, company_id)
    select p.id, p_student, p.company_id from postings p where p.id = p_posting
    on conflict do nothing;
  end if;
end $$;

create or replace function public.on_interest() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.try_match(new.posting_id, new.student_id);
  return new;
end $$;

create trigger interests_match         after insert on public.interests         for each row execute function public.on_interest();
create trigger company_interests_match after insert on public.company_interests for each row execute function public.on_interest();

-- ─────────────────────────── Trigger: nový používateľ → profil ───────────────────────────
-- Klient pri signUp pošle údaje z onboardingu v `options.data`; tu z nich vznikne profil.
-- Beží aj keď používateľ ešte nepotvrdil e-mail.

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

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Dátum narodenia študenta: minimálny vek 16 rokov; raz nastavený dátum sa už nedá zmeniť.
create or replace function public.students_guard_birth() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.birth is not null and new.birth > current_date - interval '16 years' then
    raise exception 'Robiq je pre ľudí od 16 rokov.';
  end if;
  if tg_op = 'UPDATE' and old.birth is not null and new.birth is distinct from old.birth then
    raise exception 'Dátum narodenia sa nedá meniť.';
  end if;
  return new;
end $$;

create trigger students_guard_birth before insert or update on public.students
  for each row execute function public.students_guard_birth();

-- Registrácia: je e-mail už obsadený? Appka sa pýta v kroku 1 (študent) / 3 (firma) a obsadený e-mail nepustí ďalej.
-- (signUp pri zapnutom potvrdzovaní e-mailu chybu nevráti — kvôli ochrane pred zisťovaním účtov.)
create or replace function public.email_taken(p_email text) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from auth.users where lower(email) = lower(trim(p_email)))
$$;

revoke all on function public.email_taken(text) from public;
grant execute on function public.email_taken(text) to anon, authenticated;

-- ─────────────────────────── Storage: logá firiem ───────────────────────────

insert into storage.buckets (id, name, public) values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos: public read"  on storage.objects for select using (bucket_id = 'logos');
create policy "logos: own upload"   on storage.objects for insert with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos: own update"   on storage.objects for update using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos: own delete"   on storage.objects for delete using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Fotky „deň v práci" pri inzeráte: verejný bucket, firma zapisuje do <uid>/<posting_id>/. URL sú v postings.photos.
insert into storage.buckets (id, name, public) values ('posting-photos', 'posting-photos', true)
on conflict (id) do nothing;
create policy "posting-photos: public read" on storage.objects for select using (bucket_id = 'posting-photos');
create policy "posting-photos: own write"   on storage.objects for all
  using      (bucket_id = 'posting-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'posting-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Profilové fotky brigádnikov: NEVEREJNÝ bucket. Vlastník robí všetko; firma číta len fotky svojich kandidátov (cez podpísané URL).
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false)
on conflict (id) do nothing;

create policy "avatars: own all" on storage.objects for all
  using      (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
-- (politika pre firmy je nižšie, pri funkcii candidate_profiles — potrebuje funkciu is_my_candidate)

-- ─────────────────────────── Pomocné kontroly pre RLS ───────────────────────────
-- security definer = bežia mimo RLS, aby sa politiky neodkazovali navzájom (rekurzia).

create or replace function public.owns_posting(p_posting bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from postings where id = p_posting and company_id = auth.uid())
$$;

create or replace function public.has_interest(p_posting bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from interests where posting_id = p_posting and student_id = auth.uid())
$$;

create or replace function public.is_my_candidate(p_student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from interests i join postings p on p.id = i.posting_id
                 where i.student_id = p_student and p.company_id = auth.uid())
$$;

create or replace function public.is_match_party(p_match bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from matches where id = p_match and (student_id = auth.uid() or company_id = auth.uid()))
$$;

-- ─────────────────────────── RLS (kto čo smie) ───────────────────────────

alter table public.profiles          enable row level security;
alter table public.students          enable row level security;
alter table public.companies         enable row level security;
alter table public.postings          enable row level security;
alter table public.interests         enable row level security;
alter table public.skips             enable row level security;
alter table public.company_interests enable row level security;
alter table public.matches           enable row level security;
alter table public.messages          enable row level security;

-- profiles: len vlastný riadok
create policy "profiles: own read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: own insert" on public.profiles for insert with check (auth.uid() = id);

-- students: len vlastný riadok. Firma kandidátov vidí cez funkciu candidate_profiles (nižšie) — bez dátumu narodenia a bia.
create policy "students: own"  on public.students for all using (auth.uid() = id) with check (auth.uid() = id);

-- companies: verejne čitateľné (meno firmy na karte ponuky), upravuje len vlastník
create policy "companies: public read" on public.companies for select using (true);
create policy "companies: own insert"  on public.companies for insert with check (auth.uid() = id);
create policy "companies: own update"  on public.companies for update using (auth.uid() = id) with check (auth.uid() = id);

-- postings: aktívne vidí každý (guest-first feed), firma spravuje svoje
create policy "postings: public read active" on public.postings for select using (
  (active and not blocked) or company_id = auth.uid() or public.has_interest(id)   -- pozastavený inzerát stále vidí ten, kto dal záujem
);
create policy "postings: own write"          on public.postings for insert with check (company_id = auth.uid());
create policy "postings: own update"         on public.postings for update using (company_id = auth.uid()) with check (company_id = auth.uid());
create policy "postings: own delete"         on public.postings for delete using (company_id = auth.uid());

-- interests: študent svoje; firma tie, ktoré patria k jej inzerátom
create policy "interests: student own" on public.interests for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "interests: firm reads own postings" on public.interests for select using (public.owns_posting(posting_id));

-- skips: len študent
create policy "skips: student own" on public.skips for all using (student_id = auth.uid()) with check (student_id = auth.uid());

-- company_interests: firma svoje; študent vidí, kto má o neho záujem
create policy "company_interests: firm own"     on public.company_interests for all using (company_id = auth.uid()) with check (company_id = auth.uid());
create policy "company_interests: student read" on public.company_interests for select using (student_id = auth.uid());

-- matches: obe strany čítajú; vkladá len trigger (security definer)
create policy "matches: parties read" on public.matches for select using (student_id = auth.uid() or company_id = auth.uid());

-- messages: obe strany zhody čítajú a píšu
create policy "messages: parties read"  on public.messages for select using (public.is_match_party(match_id));
create policy "messages: parties write" on public.messages for insert with check (sender_id = auth.uid() and public.is_match_party(match_id));

-- ─────────────────────────── Kandidáti pre firmy ───────────────────────────
-- Firma vidí o študentovi len meno, zručnosti, hodiny a fotku — a len ak študent dal záujem o jej inzerát.
-- Funkcia (nie pohľad): security-definer pohľad by Supabase Advisor označil ako riziko; pravidlá sú tu rovnaké.

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

-- Fotku kandidáta vidí firma rovnako len po jeho záujme (bucket avatars je neverejný, klient si pýta podpísané URL).
create policy "avatars: firm sees candidates" on storage.objects for select
  using (bucket_id = 'avatars' and public.is_my_candidate(((storage.foldername(name))[1])::uuid));

-- ─────────────────────────── Miesto a návrhy kandidátov v2 ───────────────────────────
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

-- ─────────────────────────── Overenie firmy podľa IČO (RPO) ───────────────────────────
-- Register právnických osôb (Štatistický úrad SR) — verejné API, licencia CC-BY 4.0.
-- rpo_lookup: krok 1 registrácie (bez prihlásenia) · verify_my_company: nastaví companies.verified
-- · trigger: `verified` si firma nemôže nastaviť sama, zmena IČO overenie zruší.

create extension if not exists http with schema extensions;

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

create or replace function public.companies_guard_verified() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_setting('robiq.allow_verified', true) is distinct from 'on' then
    if tg_op = 'INSERT' then new.verified := false; else new.verified := old.verified; end if;
  end if;
  if tg_op = 'UPDATE' and new.ico is distinct from old.ico then new.verified := false; end if;
  return new;
end $$;

create trigger companies_guard_verified before insert or update on public.companies
  for each row execute function public.companies_guard_verified();

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

-- ─────────────────────────── Štatistika používania (bez identifikátorov) ───────────────────────────
-- Len názov udalosti, rola a čas — žiadne ID používateľa, relácie, IP ani cookies. Číta ju len admin (admin.html).

create table public.events (
  id          bigint generated always as identity primary key,
  name        text  not null check (length(name) between 1 and 40),
  role        text  not null default 'guest' check (role in ('guest', 'student', 'firm')),
  props       jsonb not null default '{}' check (pg_column_size(props) < 1024),
  created_at  timestamptz not null default now()
);
create index events_created_idx on public.events (created_at desc);
alter table public.events enable row level security;
create policy "events: anyone inserts" on public.events for insert to anon, authenticated with check (true);

create table public.admins (email text primary key);
alter table public.admins enable row level security;
insert into public.admins (email) values ('lenkamasarikova08@gmail.com');

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where email = auth.jwt() ->> 'email')
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.analytics_summary(p_days int default 7) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  since timestamptz := date_trunc('day', now()) - make_interval(days => greatest(p_days, 1) - 1);
begin
  if not exists (select 1 from admins where email = auth.jwt() ->> 'email') then
    raise exception 'Prístup zamietnutý.';
  end if;
  return jsonb_build_object(
    'days', p_days, 'since', since,
    'events', (select coalesce(jsonb_object_agg(name, n), '{}') from (select name, count(*) n from events where created_at >= since group by name) t),
    'events_by_role', (select coalesce(jsonb_object_agg(k, n), '{}') from (select name || '/' || role k, count(*) n from events where created_at >= since group by name, role) t),
    'blocked', (select coalesce(jsonb_object_agg(r, n), '{}') from (select coalesce(props ->> 'reason', '?') r, count(*) n from events where name = 'reg_blocked' and created_at >= since group by 1) t),
    'reg', (select coalesce(jsonb_object_agg(k, n), '{}') from (
              select name || ':' || coalesce(props ->> 'role', '?') || coalesce(':' || (props ->> 'step'), '') k, count(*) n
              from events where name in ('reg_start', 'reg_step', 'reg_done') and created_at >= since group by 1) t),
    'period', jsonb_build_object(
      'new_students',      (select count(*) from profiles where role = 'student' and created_at >= since),
      'new_companies',     (select count(*) from profiles where role = 'firm'    and created_at >= since),
      'postings_new',      (select count(*) from postings where created_at >= since),
      'interests',         (select count(*) from interests where created_at >= since),
      'skips',             (select count(*) from skips where created_at >= since),
      'company_interests', (select count(*) from company_interests where created_at >= since),
      'matches',           (select count(*) from matches where created_at >= since),
      'messages',          (select count(*) from messages where created_at >= since)),
    'totals', jsonb_build_object(
      'students',           (select count(*) from students),
      'companies',          (select count(*) from companies),
      'companies_verified', (select count(*) from companies where verified),
      'postings_active',    (select count(*) from postings where active),
      'matches',            (select count(*) from matches)),
    'daily', (select jsonb_agg(jsonb_build_object(
        'day', d::date,
        'visits',    (select count(*) from events    where name = 'visit' and created_at >= d and created_at < d + interval '1 day'),
        'new_users', (select count(*) from profiles  where created_at >= d and created_at < d + interval '1 day'),
        'interests', (select count(*) from interests where created_at >= d and created_at < d + interval '1 day'),
        'matches',   (select count(*) from matches   where created_at >= d and created_at < d + interval '1 day')
      ) order by d) from generate_series(since, date_trunc('day', now()), interval '1 day') d)
  );
end $$;

revoke all on function public.analytics_summary(int) from public;
grant execute on function public.analytics_summary(int) to authenticated;

-- ─────────────────────────── Zmazanie účtu ───────────────────────────
-- Používateľ zmaže sám seba. Kaskády v tabuľkách zmažú profil, inzeráty, záujmy, zhody a správy.
-- Súbory v Storage (logo) maže klient cez Storage API pred volaním — SQL ich mazať nesmie (chyba 42501).

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Nie ste prihlásený.'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- ─────────────────────────── Admin: prehľad firiem a inzerátov ───────────────────────────
-- Pozastavenie inzerátu Robiqom (`blocked`) môže meniť len admin; firma vidí značku a dôvod.

create or replace function public.postings_guard_blocked() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_setting('robiq.admin', true) is distinct from 'on' then
    if tg_op = 'INSERT' then new.blocked := false; new.block_reason := '';
    else new.blocked := old.blocked; new.block_reason := old.block_reason; end if;
  end if;
  return new;
end $$;
create trigger postings_guard_blocked before insert or update on public.postings
  for each row execute function public.postings_guard_blocked();

create or replace function public.assert_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from admins where email = auth.jwt() ->> 'email') then raise exception 'Prístup zamietnutý.'; end if;
end $$;

create or replace function public.admin_companies()
returns table (id uuid, name text, ico text, verified boolean, contact_name text, fields text[], created_at timestamptz,
               postings int, postings_active int, postings_blocked int, interests int, matches int, last_posting_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.ico, c.verified, c.contact_name, c.fields, p.created_at,
         (select count(*)::int from postings x where x.company_id = c.id),
         (select count(*)::int from postings x where x.company_id = c.id and x.active and not x.blocked),
         (select count(*)::int from postings x where x.company_id = c.id and x.blocked),
         (select count(*)::int from interests i join postings x on x.id = i.posting_id where x.company_id = c.id),
         (select count(*)::int from matches m where m.company_id = c.id),
         (select max(x.created_at) from postings x where x.company_id = c.id)
  from companies c join profiles p on p.id = c.id
  where public.is_admin()
  order by p.created_at desc
$$;

create or replace function public.admin_postings()
returns table (id bigint, company_id uuid, company text, verified boolean, title text, pay text, need int, taken int, types text[],
               only18 boolean, active boolean, blocked boolean, block_reason text, views int, created_at timestamptz,
               interests int, matches int, description text)
language sql stable security definer set search_path = public as $$
  select x.id, x.company_id, c.name, c.verified, x.title, x.pay, x.need, x.taken, x.types, x.only18, x.active, x.blocked, x.block_reason,
         x.views, x.created_at,
         (select count(*)::int from interests i where i.posting_id = x.id),
         (select count(*)::int from matches m where m.posting_id = x.id),
         x.description
  from postings x join companies c on c.id = x.company_id
  where public.is_admin()
  order by x.created_at desc
$$;

create or replace function public.admin_set_posting_blocked(p_id bigint, p_blocked boolean, p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  perform set_config('robiq.admin', 'on', true);
  update postings set blocked = p_blocked, block_reason = case when p_blocked then coalesce(p_reason, '') else '' end where id = p_id;
end $$;

create or replace function public.admin_set_company_verified(p_id uuid, p_verified boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  perform set_config('robiq.allow_verified', 'on', true);
  update companies set verified = p_verified, updated_at = now() where id = p_id;
end $$;

revoke all on function public.assert_admin()                                 from public;
revoke all on function public.admin_companies()                              from public;
revoke all on function public.admin_postings()                               from public;
revoke all on function public.admin_set_posting_blocked(bigint, boolean, text) from public;
revoke all on function public.admin_set_company_verified(uuid, boolean)      from public;
grant execute on function public.admin_companies()                              to authenticated;
grant execute on function public.admin_postings()                               to authenticated;
grant execute on function public.admin_set_posting_blocked(bigint, boolean, text) to authenticated;
grant execute on function public.admin_set_company_verified(uuid, boolean)      to authenticated;

-- ─────────────────────────── Nahlásenia (DSA čl. 16) ───────────────────────────
-- Ktokoľvek (aj hosť) nahlási inzerát / firmu / brigádnika; rieši admin v admin.html.

create table public.reports (
  id           bigint generated always as identity primary key,
  reporter_id  uuid references public.profiles (id) on delete set null,   -- null = hosť
  target_type  text not null check (target_type in ('posting', 'company', 'student')),
  target_id    text not null,
  reason       text not null check (reason in ('scam', 'inappropriate', 'duplicate', 'other')),
  note         text not null default '' check (length(note) <= 1000),
  status       text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  admin_note   text not null default '',
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create index reports_status_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;
create policy "reports: anyone inserts" on public.reports for insert to anon, authenticated
  with check (reporter_id is null or reporter_id = auth.uid());

create or replace function public.admin_reports()
returns table (id bigint, target_type text, target_id text, target_label text, target_blocked boolean, reason text, note text,
               status text, admin_note text, reporter_role text, created_at timestamptz, resolved_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.target_type, r.target_id,
         case r.target_type
           when 'posting' then (select x.title || ' — ' || c.name from postings x join companies c on c.id = x.company_id where x.id::text = r.target_id)
           when 'company' then (select c.name from companies c where c.id::text = r.target_id)
           when 'student' then (select s.name from students s where s.id::text = r.target_id)
         end,
         case r.target_type when 'posting' then (select x.blocked from postings x where x.id::text = r.target_id) else null end,
         r.reason, r.note, r.status, r.admin_note,
         (select p.role from profiles p where p.id = r.reporter_id),
         r.created_at, r.resolved_at
  from reports r
  where public.is_admin()
  order by (r.status = 'open') desc, r.created_at desc
$$;

create or replace function public.admin_resolve_report(p_id bigint, p_status text, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  if p_status not in ('open', 'resolved', 'dismissed') then raise exception 'Neznámy stav.'; end if;
  update reports set status = p_status, admin_note = coalesce(p_note, ''),
         resolved_at = case when p_status = 'open' then null else now() end
  where id = p_id;
end $$;

create or replace function public.admin_open_reports_count() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from reports where status = 'open' and public.is_admin()
$$;

revoke all on function public.admin_reports()                          from public;
revoke all on function public.admin_resolve_report(bigint, text, text) from public;
revoke all on function public.admin_open_reports_count()               from public;
grant execute on function public.admin_reports()                          to authenticated;
grant execute on function public.admin_resolve_report(bigint, text, text) to authenticated;
grant execute on function public.admin_open_reports_count()               to authenticated;

-- ─────────────────────────── Práva funkcií ───────────────────────────
-- Supabase dáva novým funkciám automaticky EXECUTE aj pre `anon`; „revoke from public" to nezruší.
-- Funkcie len pre prihlásených preto anon odoberáme výslovne (vnútri sa aj tak overuje auth.uid()).
revoke execute on function public.candidate_profiles(uuid[])  from anon;
revoke execute on function public.is_admin()                  from anon;
revoke execute on function public.analytics_summary(int)      from anon;
revoke execute on function public.verify_my_company()         from anon;
revoke execute on function public.suggest_candidates(bigint)  from anon;
revoke execute on function public.delete_my_account()         from anon;
revoke execute on function public.assert_admin()              from anon;
revoke execute on function public.admin_companies()           from anon;
revoke execute on function public.admin_postings()            from anon;
revoke execute on function public.admin_set_posting_blocked(bigint, boolean, text) from anon;
revoke execute on function public.admin_set_company_verified(uuid, boolean)      from anon;
revoke execute on function public.admin_reports()                          from anon;
revoke execute on function public.admin_resolve_report(bigint, text, text) from anon;
revoke execute on function public.admin_open_reports_count()               from anon;

-- ─────────────────────────── Realtime ───────────────────────────
-- Chat a banner „Máte zhodu!" počúvajú na nové riadky.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.company_interests;   -- „Firma ťa oslovila" bez obnovenia

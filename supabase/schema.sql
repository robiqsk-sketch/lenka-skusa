-- Robiq — databázová schéma pre Supabase
-- Spustiť raz v Supabase → SQL Editor → New query → Run.
--
-- Model: každý používateľ (auth.users) má riadok v `profiles` s rolou.
-- Študent má `students`, firma `companies`. Firma zverejňuje `postings`.
-- Študent dá záujem (`interests`), firma dá záujem (`company_interests`);
-- keď existujú obe pre ten istý inzerát, trigger vytvorí `matches` a začne chat (`messages`).

-- ─────────────────────────── Tabuľky ───────────────────────────

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
  -- Google (OAuth) používatelia prídu bez roly → profil vytvorí aplikácia po výbere typu účtu a onboardingu.
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
returns table (id uuid, name text, skills jsonb, hours smallint, avatar_path text)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.skills, s.hours, s.avatar_path
  from public.students s
  where s.id = any(p_ids)
    and (s.id = auth.uid() or public.is_my_candidate(s.id))
$$;

revoke all on function public.candidate_profiles(uuid[]) from public;
grant execute on function public.candidate_profiles(uuid[]) to authenticated;

-- Fotku kandidáta vidí firma rovnako len po jeho záujme (bucket avatars je neverejný, klient si pýta podpísané URL).
create policy "avatars: firm sees candidates" on storage.objects for select
  using (bucket_id = 'avatars' and public.is_my_candidate(((storage.foldername(name))[1])::uuid));

-- ─────────────────────────── Návrhy kandidátov (anonymné) ───────────────────────────
create or replace function public.suggest_candidates(p_posting bigint)
returns table (
  student_id  uuid,
  score       int,
  skills      text[],
  hours       smallint,
  avail_days  text[],
  avail_times text[],
  contacted   boolean,      -- firma ho už oslovila
  interested  boolean       -- študent už dal záujem (je aj v Brigádnikoch s menom)
)
language plpgsql security definer set search_path = public as $$
declare
  p postings%rowtype;
  hay text;
begin
  select * into p from postings where id = p_posting and company_id = auth.uid();
  if not found then return; end if;
  hay := lower(coalesce(p.title, '') || ' ' || coalesce(p.ai_note, '') || ' ' || coalesce(p.description, '') || ' ' || array_to_string(p.types, ' '));

  return query
  with st as (
    select s.id, s.hours, s.avail_days, s.avail_times, s.birth,
           array(select x->>'n' from jsonb_array_elements(s.skills) x) as names
    from students s
    where s.id <> auth.uid()
      and (not p.only18 or (s.birth is not null and s.birth <= current_date - interval '18 years'))
  ),
  scored as (
    select st.*,
      ( least((select count(*) from unnest(st.names) n where position(lower(n) in hay) > 0), 2) * 30
      + case when 'Víkendy'    = any(p.types) and st.avail_days  && array['So','Ne']  then 15 else 0 end
      + case when 'Poobede'    = any(p.types) and 'Poobede' = any(st.avail_times)     then 15 else 0 end
      + case when 'Večery'     = any(p.types) and 'Večer'   = any(st.avail_times)     then 15 else 0 end
      + case when 'Remote'     = any(p.types) then 5 else 0 end
      + case when 'Flexibilné' = any(p.types) and cardinality(st.avail_days) >= 4    then 10 else 0 end
      + case when cardinality(st.names) > 0 then 5 else 0 end
      )::int as sc
    from st
  )
  select scored.id, least(scored.sc, 99), scored.names, scored.hours, scored.avail_days, scored.avail_times,
         exists (select 1 from company_interests ci where ci.posting_id = p_posting and ci.student_id = scored.id),
         exists (select 1 from interests i where i.posting_id = p_posting and i.student_id = scored.id)
  from scored
  where scored.sc >= 20
  order by scored.sc desc
  limit 12;
end $$;

revoke all on function public.suggest_candidates(bigint) from public;
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

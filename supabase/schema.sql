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
  active      boolean not null default true,
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

-- ─────────────────────────── Storage: logá firiem ───────────────────────────

insert into storage.buckets (id, name, public) values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos: public read"  on storage.objects for select using (bucket_id = 'logos');
create policy "logos: own upload"   on storage.objects for insert with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos: own update"   on storage.objects for update using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos: own delete"   on storage.objects for delete using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Profilové fotky brigádnikov: NEVEREJNÝ bucket. Vlastník robí všetko; firma číta len fotky svojich kandidátov (cez podpísané URL).
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false)
on conflict (id) do nothing;

create policy "avatars: own all" on storage.objects for all
  using      (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
-- (politika pre firmy je nižšie, pri pohľade candidate_profiles — potrebuje funkciu is_my_candidate)

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

-- students: len vlastný riadok. Firma kandidátov vidí cez pohľad candidate_profiles (nižšie) — bez dátumu narodenia a bia.
create policy "students: own"  on public.students for all using (auth.uid() = id) with check (auth.uid() = id);

-- companies: verejne čitateľné (meno firmy na karte ponuky), upravuje len vlastník
create policy "companies: public read" on public.companies for select using (true);
create policy "companies: own insert"  on public.companies for insert with check (auth.uid() = id);
create policy "companies: own update"  on public.companies for update using (auth.uid() = id) with check (auth.uid() = id);

-- postings: aktívne vidí každý (guest-first feed), firma spravuje svoje
create policy "postings: public read active" on public.postings for select using (
  active or company_id = auth.uid() or public.has_interest(id)   -- pozastavený inzerát stále vidí ten, kto dal záujem
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

-- ─────────────────────────── Pohľad pre firmy: kandidáti ───────────────────────────
-- Firma vidí o študentovi len meno, zručnosti a hodiny — a len ak študent dal záujem o jej inzerát.

create or replace view public.candidate_profiles as
  select s.id, s.name, s.skills, s.hours, s.avatar_path
  from public.students s
  where s.id = auth.uid() or public.is_my_candidate(s.id);

grant select on public.candidate_profiles to anon, authenticated;

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

-- ─────────────────────────── Realtime ───────────────────────────
-- Chat a banner „Máte zhodu!" počúvajú na nové riadky.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.company_interests;   -- „Firma ťa oslovila" bez obnovenia

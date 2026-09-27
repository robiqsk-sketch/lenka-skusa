-- Opravy podľa Supabase Advisors (bezpečnosť + výkon). Správanie appky sa nemení — kto čo vidí, ostáva rovnaké.
-- Spustiť v Supabase → SQL Editor → New query → Run.

-- ═══ 1. Bezpečnosť ═══
-- Funkcie, ktoré spúšťa len databáza sama (triggery pri registrácii / záujme / zhode), nemá kto volať zvonka cez API.
-- Trigger ich spustí aj bez tohto práva (práva sa kontrolujú len pri vytvorení triggra).
revoke execute on function public.handle_new_user()         from public, anon, authenticated;
revoke execute on function public.on_interest()             from public, anon, authenticated;
revoke execute on function public.sync_taken()              from public, anon, authenticated;
revoke execute on function public.try_match(bigint, uuid)   from public, anon, authenticated;   -- volá ju len on_interest()
-- has_interest / owns_posting / is_match_party / is_my_candidate ostávajú — používajú ich pravidlá prístupu (RLS).

alter function public.field_skills(text[]) set search_path = public;   -- pevný search_path ako ostatné funkcie

-- ═══ 2. Výkon: indexy pre cudzie kľúče (spojenia a mazanie účtu nemusia prechádzať celú tabuľku) ═══
create index if not exists blocks_target_id_idx             on public.blocks (target_id);
create index if not exists companies_city_id_idx            on public.companies (city_id);
create index if not exists company_interests_company_id_idx on public.company_interests (company_id);
create index if not exists company_interests_student_id_idx on public.company_interests (student_id);
create index if not exists interests_student_id_idx         on public.interests (student_id);
create index if not exists messages_sender_id_idx           on public.messages (sender_id);
create index if not exists postings_city_id_idx             on public.postings (city_id);
create index if not exists reports_reporter_id_idx          on public.reports (reporter_id);
create index if not exists skips_student_id_idx             on public.skips (student_id);
create index if not exists students_city_id_idx             on public.students (city_id);

-- ═══ 3. Výkon: pravidlá prístupu vyhodnotia prihláseného používateľa raz za dotaz, nie pre každý riadok ═══
-- auth.uid() → (select auth.uid()). Podmienky sú inak totožné.
alter policy "profiles: own read"   on public.profiles using ((select auth.uid()) = id);
alter policy "profiles: own insert" on public.profiles with check ((select auth.uid()) = id);
alter policy "students: own"        on public.students using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
alter policy "companies: own insert" on public.companies with check ((select auth.uid()) = id);
alter policy "companies: own update" on public.companies using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
alter policy "postings: public read active" on public.postings using (
  (active and not blocked) or company_id = (select auth.uid()) or public.has_interest(id));
alter policy "postings: own write"  on public.postings with check (company_id = (select auth.uid()));
alter policy "postings: own update" on public.postings using (company_id = (select auth.uid())) with check (company_id = (select auth.uid()));
alter policy "postings: own delete" on public.postings using (company_id = (select auth.uid()));
alter policy "interests: student own" on public.interests using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
alter policy "skips: student own"     on public.skips     using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
alter policy "company_interests: firm own"     on public.company_interests using (company_id = (select auth.uid())) with check (company_id = (select auth.uid()));
alter policy "company_interests: student read" on public.company_interests using (student_id = (select auth.uid()));
alter policy "matches: parties read"   on public.matches  using (student_id = (select auth.uid()) or company_id = (select auth.uid()));
alter policy "messages: parties write" on public.messages with check (sender_id = (select auth.uid()) and public.is_match_party(match_id));
alter policy "blocks: own"             on public.blocks   using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));
alter policy "reports: anyone inserts" on public.reports  with check (reporter_id is null or reporter_id = (select auth.uid()));

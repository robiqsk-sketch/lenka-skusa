-- Migrácia pre existujúcu databázu (schema.sql už bola spustená).
-- Spustiť v Supabase → SQL Editor → Run.

-- 1) Firma doteraz mohla cez RLS prečítať celý riadok kandidáta (aj birth a bio).
--    Odteraz vidí len meno, zručnosti a hodiny cez pohľad candidate_profiles.

drop policy if exists "students: firm sees candidates" on public.students;

create or replace view public.candidate_profiles as
  select s.id, s.name, s.skills, s.hours
  from public.students s
  where s.id = auth.uid() or public.is_my_candidate(s.id);   -- vlastný riadok, alebo študent, ktorý dal záujem o môj inzerát

grant select on public.candidate_profiles to anon, authenticated;

-- 2) Zmazanie účtu: používateľ zmaže sám seba (kaskády zmažú profil, inzeráty, záujmy, zhody, správy; logo v Storage tiež).

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Nie ste prihlásený.'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- 3) Firma si pri zmazaní účtu môže zmazať svoje logo v Storage.
create policy "logos: own delete" on storage.objects for delete
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

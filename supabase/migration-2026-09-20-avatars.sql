-- Profilová fotka brigádnika (dokument o ochrane údajov §3.1, §5, §12):
-- neverejný bucket, vidí ju študent a firma až po tom, ako študent dal záujem o jej inzerát.

alter table public.students add column if not exists avatar_path text;

create or replace view public.candidate_profiles as
  select s.id, s.name, s.skills, s.hours, s.avatar_path
  from public.students s
  where s.id = auth.uid() or public.is_my_candidate(s.id);

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- cesta súboru: <uid>/avatar.<ext>
create policy "avatars: own all" on storage.objects for all
  using      (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: firm sees candidates" on storage.objects for select
  using (bucket_id = 'avatars' and public.is_my_candidate(((storage.foldername(name))[1])::uuid));

-- Fotky „deň v práci" pri inzeráte (max. 3) + verejný popis inzerátu vo formulári.
-- Bucket `posting-photos` je verejný (inzerát je verejný obsah); firma zapisuje len do svojho priečinka <uid>/<posting_id>/.
-- Spustiť v Supabase → SQL Editor → New query → Run.

alter table public.postings add column if not exists photos text[] not null default '{}';   -- verejné URL, poradie = poradie zobrazenia

insert into storage.buckets (id, name, public) values ('posting-photos', 'posting-photos', true)
on conflict (id) do nothing;

drop policy if exists "posting-photos: public read" on storage.objects;
create policy "posting-photos: public read" on storage.objects for select using (bucket_id = 'posting-photos');

drop policy if exists "posting-photos: own write" on storage.objects;
create policy "posting-photos: own write" on storage.objects for all
  using      (bucket_id = 'posting-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'posting-photos' and (storage.foldername(name))[1] = auth.uid()::text);

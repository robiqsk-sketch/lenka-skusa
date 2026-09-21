-- Adresa prevádzky pri inzeráte (nepovinná; mesto zostáva povinné a slúži na vzdialenosť). Verejná — je súčasťou inzerátu.
-- Spustiť v Supabase → SQL Editor → New query → Run.
alter table public.postings add column if not exists address text not null default '' check (length(address) <= 200);

-- Opravy nájdené pri písaní dokumentácie (docs/Otvorené otázky a nezrovnalosti.md):
--   1) zobrazenia inzerátu sa nepočítali (postings.views bolo stále 0)
--   2) obsadené miesta (postings.taken) sa nemenili → čiara na karte bola vždy prázdna
--   3) zablokovanie firmy / brigádnika platilo len do obnovenia stránky → tabuľka blocks
-- Bezpečné spustiť opakovane. Spustiť v Supabase → SQL Editor → New query → Run.

-- ── 1) Zobrazenia: +1 pri otvorení detailu (aj hosť). Vlastné inzeráty firmy sa nepočítajú. ──
create or replace function public.count_view(p_posting bigint) returns void
language sql security definer set search_path = public as $$
  update postings set views = views + 1
  where id = p_posting and active and not blocked and company_id is distinct from auth.uid()
$$;
revoke all on function public.count_view(bigint) from public;
grant execute on function public.count_view(bigint) to anon, authenticated;

-- ── 2) Obsadené miesta = počet zhôd na inzerát (max. need) — rovnako ako „obsadené" v Inzerátoch firmy ──
create or replace function public.sync_taken() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid bigint := coalesce(new.posting_id, old.posting_id);
begin
  update postings set taken = least(need, (select count(*) from matches where posting_id = pid)) where id = pid;
  return null;
end $$;
drop trigger if exists matches_sync_taken on public.matches;
create trigger matches_sync_taken after insert or delete on public.matches
  for each row execute function public.sync_taken();

update public.postings p set taken = least(p.need, (select count(*) from public.matches m where m.posting_id = p.id));

-- ── 3) Blokovanie: študent skryje firmu, firma skryje brigádnika. Vidí a mení len ten, kto blokoval. ──
create table if not exists public.blocks (
  blocker_id  uuid not null references public.profiles (id) on delete cascade,
  target_id   uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, target_id)
);
alter table public.blocks enable row level security;
drop policy if exists "blocks: own" on public.blocks;
create policy "blocks: own" on public.blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

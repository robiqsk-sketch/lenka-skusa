-- Admin (admin.html): prehľad firiem a inzerátov + zásahy — pozastavenie inzerátu Robiqom, ručné overenie firmy.
-- Všetky funkcie si overia is_admin(). Spustiť v Supabase → SQL Editor → New query → Run.

-- Inzerát pozastavený Robiqom: firma ho vidí so značkou a dôvodom, no sama ho späť zapnúť nemôže
-- (na rozdiel od `active`, ktoré má firma v rukách). Vo feede sa nezobrazuje.
alter table public.postings add column if not exists blocked boolean not null default false;
alter table public.postings add column if not exists block_reason text not null default '';

-- feed: aktívne a nepozastavené; vlastné a tie so záujmom stále vidno
drop policy if exists "postings: public read active" on public.postings;
create policy "postings: public read active" on public.postings for select using (
  (active and not blocked) or company_id = auth.uid() or public.has_interest(id)
);

-- `blocked` a `block_reason` smie meniť len admin (cez nastavenie robiq.admin v tej istej transakcii)
create or replace function public.postings_guard_blocked() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_setting('robiq.admin', true) is distinct from 'on' then
    if tg_op = 'INSERT' then new.blocked := false; new.block_reason := '';
    else new.blocked := old.blocked; new.block_reason := old.block_reason; end if;
  end if;
  return new;
end $$;
drop trigger if exists postings_guard_blocked on public.postings;
create trigger postings_guard_blocked before insert or update on public.postings
  for each row execute function public.postings_guard_blocked();

create or replace function public.assert_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from admins where email = auth.jwt() ->> 'email') then raise exception 'Prístup zamietnutý.'; end if;
end $$;

-- Firmy: základ + počty. Bez kontaktných osobných údajov nad rámec profilu firmy.
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

-- Inzeráty: všetky (aj pozastavené) s firmou a počtami.
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
revoke all on function public.postings_guard_blocked()                       from public;
revoke execute on function public.assert_admin()                                 from anon;
revoke execute on function public.admin_companies()                              from anon;
revoke execute on function public.admin_postings()                               from anon;
revoke execute on function public.admin_set_posting_blocked(bigint, boolean, text) from anon;
revoke execute on function public.admin_set_company_verified(uuid, boolean)      from anon;
grant execute on function public.admin_companies()                              to authenticated;
grant execute on function public.admin_postings()                               to authenticated;
grant execute on function public.admin_set_posting_blocked(bigint, boolean, text) to authenticated;
grant execute on function public.admin_set_company_verified(uuid, boolean)      to authenticated;

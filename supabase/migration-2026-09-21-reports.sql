-- Nahlásenie inzerátu / firmy / brigádnika (DSA čl. 16 — mechanizmus oznamovania). Rieši admin v admin.html.
-- Spustiť v Supabase → SQL Editor → New query → Run.

create table public.reports (
  id           bigint generated always as identity primary key,
  reporter_id  uuid references public.profiles (id) on delete set null,   -- null = hosť (bez účtu)
  target_type  text not null check (target_type in ('posting', 'company', 'student')),
  target_id    text not null,                                              -- id inzerátu (číslo) alebo uuid účtu
  reason       text not null check (reason in ('scam', 'inappropriate', 'duplicate', 'other')),
  note         text not null default '' check (length(note) <= 1000),
  status       text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  admin_note   text not null default '',
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create index reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;
-- ktokoľvek môže nahlásiť (aj hosť — podvodný inzerát vidí aj bez účtu); reporter_id musí byť vlastný alebo null
create policy "reports: anyone inserts" on public.reports for insert to anon, authenticated
  with check (reporter_id is null or reporter_id = auth.uid());
-- čítanie len cez admin_reports()

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
revoke execute on function public.admin_reports()                          from anon;
revoke execute on function public.admin_resolve_report(bigint, text, text) from anon;
revoke execute on function public.admin_open_reports_count()               from anon;
grant execute on function public.admin_reports()                          to authenticated;
grant execute on function public.admin_resolve_report(bigint, text, text) to authenticated;
grant execute on function public.admin_open_reports_count()               to authenticated;

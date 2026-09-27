-- Prepínač e-mailových upozornení (menu účtu → E-maily Zap./Vyp.). Predvolene zapnuté.
-- Funkcia `notify` pred poslaním e-mailu skontroluje profiles.email_notify príjemcu.
-- Spustiť v Supabase → SQL Editor → New query → Run.

alter table public.profiles add column if not exists email_notify boolean not null default true;

-- profiles nemá pravidlo na úpravu (rolu si nikto meniť nesmie) → zmena len cez túto funkciu, len vlastného stĺpca.
create or replace function public.set_email_notify(p_on boolean) returns void
language sql security definer set search_path = public as $$
  update profiles set email_notify = p_on where id = auth.uid();
$$;
revoke execute on function public.set_email_notify(boolean) from public, anon;
grant  execute on function public.set_email_notify(boolean) to authenticated;

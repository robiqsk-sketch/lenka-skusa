-- Upozornenia (push na telefón; e-mail pripravený) na novú správu a novú zhodu.
-- Posiela ich Edge Function `notify` (supabase/functions/notify), ktorú zavolá appka odosielateľa;
-- funkcia si overí, že odosielateľ je účastník zhody, a pošle upozornenie druhej strane.
-- Spustiť v Supabase → SQL Editor → New query → Run.

-- Zariadenia, ktoré chcú upozornenia (jedno zariadenie = jeden záznam; patrí tomu, kto je na ňom práve prihlásený).
create table if not exists public.push_subscriptions (
  endpoint   text primary key,                                   -- adresa zariadenia u Apple / Google / Mozilla
  user_id    uuid not null references public.profiles(id) on delete cascade,
  p256dh     text not null,                                      -- verejný kľúč zariadenia (šifrovanie obsahu)
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;   -- bez pravidiel: klient ide len cez funkcie nižšie

-- Uloží zariadenie prihláseného (ak ho predtým malo iné konto — napr. zdieľaný telefón — prepíše sa na neho).
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language sql security definer set search_path = public as $$
  insert into push_subscriptions (endpoint, user_id, p256dh, auth) values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
$$;
create or replace function public.delete_push_subscription(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;
revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
revoke execute on function public.delete_push_subscription(text) from public, anon;
grant  execute on function public.save_push_subscription(text, text, text) to authenticated;
grant  execute on function public.delete_push_subscription(text) to authenticated;

-- Poistka proti dvojitému upozorneniu: funkcia `notify` si správu / zhodu „zaberie" nastavením času.
alter table public.messages add column if not exists notified_at timestamptz;
alter table public.matches  add column if not exists notified_at timestamptz;

-- Tajné kľúče (VAPID pre push, neskôr Brevo pre e-mail) sú v trezore Supabase Vault; čítať ich smie len server (service_role).
create or replace function public.notify_secret(p_name text) returns text
language sql stable security definer set search_path = public as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name;
$$;
revoke execute on function public.notify_secret(text) from public, anon, authenticated;
grant  execute on function public.notify_secret(text) to service_role;

-- Kľúč sa do trezoru vkladá mimo tejto migrácie (nesmie byť v gite):
--   select vault.create_secret('<VAPID private key>', 'vapid_private');
--   select vault.create_secret('<Brevo API key>',    'brevo_api_key');    -- keď bude e-mail

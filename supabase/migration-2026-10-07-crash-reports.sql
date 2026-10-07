-- Hlásenia o páde appky (obrazovka „Niečo sa pokazilo"). Zapisuje ich len funkcia crash-report (service role),
-- appka ani prihlásení používatelia do tabuľky nevidia. E-mail adminom ide najviac raz za 30 minút (emailed).
create table if not exists public.crash_reports (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  reason     text not null,                -- script / error / rejection / server
  message    text,
  page       text,
  user_agent text,
  emailed    boolean not null default false
);
alter table public.crash_reports enable row level security;   -- bez pravidiel → anon / authenticated nič
revoke all on public.crash_reports from anon, authenticated;
create index if not exists crash_reports_created_idx on public.crash_reports (created_at desc);

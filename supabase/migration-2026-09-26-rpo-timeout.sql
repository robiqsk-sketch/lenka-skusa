-- „Register je teraz nedostupný" pri registrácii firmy.
-- Príčina: rpo_lookup() volá appka ešte bez prihlásenia (rola anon) a Supabase má pre anon limit 3 s na príkaz.
-- Register (api.statistics.sk) občas odpovedá aj ~5 s → Postgres príkaz zruší ("canceling statement due to
-- statement timeout"), API vráti 500 a appka to ukáže ako nedostupný register.
-- Oprava: limit pre anon 10 s — dosť na 6 s timeout HTTP volania v rpo_lookup(), takže pomalý register
-- skončí najhoršie čistým { reason: 'unavailable' }, nie chybou.
-- Spustiť v Supabase → SQL Editor → New query → Run.

alter role anon set statement_timeout = '10s';
notify pgrst, 'reload config';                     -- PostgREST si nastavenie rolí načíta znova

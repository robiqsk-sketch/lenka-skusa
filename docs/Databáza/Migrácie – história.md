---
tags: [robiq, databáza, história]
---
# Migrácie – história

← [[00 Mapa systému]]

**Ako to funguje:** `supabase/schema.sql` je vždy **aktuálny celý stav** (pre novú databázu).
Každá zmena sa zároveň zapíše ako samostatná migrácia `supabase/migration-RRRR-MM-DD-nazov.sql`, ktorú treba
**ručne spustiť** na existujúcej databáze (Supabase → SQL Editor → New query → Run).

> [!warning] Pri novej zmene
> Uprav `schema.sql` **aj** pridaj migráciu — a dopíš riadok sem.

| Dátum | Migrácia | Čo zmenila | Poznámka |
|---|---|---|---|
| 20. 9. | `candidate-view` | firma číta kandidátov len cez funkciu (predtým videla aj dátum narodenia a bio) | [[Prístupy a bezpečnosť (RLS)]] |
| 20. 9. | `avatars` | profilová fotka brigádnika, neverejný bucket | |
| 21. 9. | `suggestions` | prvá verzia anonymných návrhov kandidátov | [[Návrhy kandidátov (párovanie)]] |
| 21. 9. | `email-taken` | kontrola obsadeného e-mailu pri registrácii | |
| 21. 9. | `birth-lock` | vek 16+, dátum narodenia nemenný | |
| 21. 9. | `ico-verification` | overenie firmy v Registri právnických osôb | [[Registrácia firmy a overenie IČO]] |
| 21. 9. | `analytics` | anonymná štatistika `events` + `admins` | [[Štatistika používania]] |
| 21. 9. | `security-fixes` | opravy podľa Supabase Advisors (search_path, práva anon) | |
| 21. 9. | `admin-overview` | admin prehľad, pozastavenie inzerátu, ručné overenie | [[Admin panel]] |
| 21. 9. | `reports` | nahlásenia (DSA čl. 16) | [[Nahlásenia a moderovanie]] |
| 21. 9. | `posting-photos` | fotky „deň v práci" pri inzeráte | |
| 21. 9. | `cities-matching-v2` | mestá, dochádzanie, miesto pri inzeráte, párovanie v2 | [[PLAN-parovanie-v2]] |
| 21. 9. | `posting-address` | adresa prevádzky pri inzeráte | |
| 22. 9. | `legal-name` | oficiálny názov z registra oddelený od zobrazovaného | |
| 22. 9. | `vodicsky-preukaz` | premenovanie zručnosti „Vodičák B" → „Vodičský preukaz B" | |
| 23. 9. | `fixes` | počítanie zobrazení (`count_view`), obsadené miesta zo zhôd (`sync_taken`), tabuľka `blocks` | [[Otvorené otázky a nezrovnalosti]] |
| 27. 9. | `email-notify` | `profiles.email_notify` + `set_email_notify` — prepínač e-mailových upozornení v menu účtu | [[Upozornenia]] |
| 27. 9. | `push` | upozornenia: tabuľka `push_subscriptions`, `notified_at` pri správach a zhodách, `notify_secret` (trezor) | [[Upozornenia]] |
| 27. 9. | `advisors` | interné funkcie (triggery) nedostupné zvonka, 10 indexov, pravidlá prístupu s `(select auth.uid())` — rýchlejšie, kto čo vidí sa nemení | [[Prístupy a bezpečnosť (RLS)]] |
| 26. 9. | `rpo-timeout` | limit príkazu pre neprihlásených (anon) 3 s → 10 s, aby pomalý register nekončil „nedostupný" | [[Registrácia firmy a overenie IČO]] |
| 29. 9. | `stats-excluded` | tabuľka `stats_excluded` + `is_stats_excluded`; `analytics_summary` nezarátava vlastné účty (Lenka, Robiq) | [[Štatistika používania]] |
| 7. 10. | `crash-reports` | tabuľka `crash_reports` — hlásenia o páde appky (zapisuje len funkcia `crash-report`), e-mail adminom najviac raz za 30 min | [[Chybové stránky]] |
| 10. 10. | `ai-onboarding` | **test:** tabuľka `ai_onboarding_calls` (limit volaní AI) + `handle_new_user` berie z registrácie aj „o mne“ (bio) | [[Registrácia rozhovorom s AI (test)]] |
| 10. 10. | `student-phone` | **test:** `students.phone` — telefón z formulára po rozhovore s AI, vidí ho len študent; `handle_new_user` ho berie z registrácie | [[Registrácia rozhovorom s AI (test)]] |

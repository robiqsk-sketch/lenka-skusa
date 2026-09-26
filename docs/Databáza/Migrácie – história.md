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
| 26. 9. | `rpo-timeout` | limit príkazu pre neprihlásených (anon) 3 s → 10 s, aby pomalý register nekončil „nedostupný" | [[Registrácia firmy a overenie IČO]] |

---
tags: [robiq, databáza]
---
# Databázové funkcie a triggery

← [[00 Mapa systému]] · všetko v `supabase/schema.sql`

Časť logiky beží **priamo v databáze** — tam sa nedá obísť z prehliadača.

## Triggery (spustia sa samy)
| Trigger | Kedy | Čo urobí |
|---|---|---|
| `on_auth_user_created` → `handle_new_user` | nový účet | z údajov z registrácie vytvorí `profiles` + `students`/`companies` |
| `interests_match`, `company_interests_match` → `try_match` | nový záujem z ktorejkoľvek strany | ak existuje záujem z oboch strán, vytvorí `matches` → [[Záujem, zhoda a chat]] |
| `students_guard_birth` | zápis študenta | vek min. 16, dátum narodenia nemenný |
| `companies_guard_verified` | zápis firmy | `verified`/`legal_name` nemení firma sama; nové IČO = overenie znova |
| `postings_guard_blocked` | zápis inzerátu | `blocked` mení len admin |
| `matches_sync_taken` → `sync_taken` | nová / zmazaná zhoda | prepočíta `postings.taken` (obsadené miesta, max. `need`) |

## Funkcie volané z appky (`sb.rpc(...)`)
| Funkcia | Kto | Na čo |
|---|---|---|
| `email_taken` | ktokoľvek | je e-mail už registrovaný? (krok registrácie) |
| `count_view` | ktokoľvek | +1 zobrazenie inzerátu pri otvorení detailu (raz za načítanie stránky) |
| `rpo_lookup` | ktokoľvek | nájde firmu podľa IČO v registri → [[Registrácia firmy a overenie IČO]] |
| `verify_my_company` | firma | overí vlastnú firmu, nastaví `verified` + `legal_name` |
| `candidate_profiles` | firma | profily kandidátov (bez dátumu narodenia a bia) |
| `suggest_candidates` | firma | anonymné návrhy kandidátov so skóre → [[Návrhy kandidátov (párovanie)]] |
| `delete_my_account` | prihlásený | zmaže vlastný účet → [[Zmazanie účtu]] |
| `is_admin` | prihlásený | je admin? (ukáže položku Štatistika v menu) |
| `analytics_summary` | admin | štatistika → [[Štatistika používania]] |
| `admin_companies`, `admin_postings` | admin | prehľady |
| `admin_set_posting_blocked`, `admin_set_company_verified` | admin | zásahy |
| `admin_reports`, `admin_resolve_report`, `admin_open_reports_count` | admin | nahlásenia → [[Nahlásenia a moderovanie]] |

## Pomocné
- `distance_km(a, b)` — vzdialenosť medzi dvoma mestami podľa GPS (haversine). Rovnaký výpočet je aj v `app.js` (`kmBetween`).
- `norm(text)` — malé písmená bez diakritiky, pre porovnávanie slov.
- `field_skills(odvetvia)` — mapa odvetvie firmy → zručnosti.

Súvisí: [[Prístupy a bezpečnosť (RLS)]], [[Dátový model]]

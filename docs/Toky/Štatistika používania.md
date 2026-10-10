---
tags: [robiq, tok, admin]
---
# Štatistika používania

← [[00 Mapa systému]] · tabuľka `events` · kód: `app.js` → `track(...)` · DB: `analytics_summary`

Zámerne **anonymná**: ukladá sa len názov udalosti, rola (hosť/študent/firma), malé doplnkové údaje a čas.
Žiadne ID používateľa, relácie, IP ani cookies — tak to sľubuje dokument o ochrane údajov.

## Sledované udalosti
| Udalosť | Kedy |
|---|---|
| `visit` | otvorenie appky |
| `detail_open` | otvorenie detailu inzerátu |
| `gate_shown` | hosť klikol „Mám záujem" (v2 ho to pošle na registráciu, v1 dostal výzvu) — v admine „„Mám záujem" bez účtu" |
| `reg_start`, `reg_step`, `reg_done`, `reg_blocked` | priebeh registrácie (kde ľudia odpadávajú a prečo). Registrácia študenta v2 je jedna obrazovka — `reg_step` neposiela, admin kroky, do ktorých nikto neprišiel, vynechá |
| `profile_fill_start`, `profile_filled` | študent otvoril „Doplniť profil" (`step` = krok) / uložil ho (`left` = koľko častí ešte chýba) |
| `login`, `login_google_click`, `password_reset_sent` | prihlasovanie |
| `report` | odoslané nahlásenie |
| `theme` | prepnutie svetlý/tmavý režim |
| `filter` | zapnutie/vypnutie filtra nad ponukami (ktorý filter, zap./vyp.) |

Čítať ju vie len admin cez `analytics_summary(dni)` → [[Admin panel]] (záložka Štatistika).
Okrem udalostí ukazuje aj počty z tabuliek: noví študenti a firmy, inzeráty, záujmy, zhody, správy.

## Vlastné účty sa nepočítajú
Účty v tabuľke `stats_excluded` (Lenkin a Robiq) sa do štatistiky nezarátajú — aby testovanie nekazilo čísla.
- **Počty z tabuliek:** `analytics_summary` vynechá ich profily, inzeráty a všetko, čo sa ich týka (záujmy, zhody a správy v ich zhodách, aj keď druhá strana je skutočný používateľ).
- **Udalosti:** sú anonymné, takže databáza nevie, od koho prišli. Preto sa appka po prihlásení spýta `is_stats_excluded` — ak áno, zapamätá si to na zariadení a odvtedy z neho neposiela nič, ani po odhlásení. Návštevy z toho zariadenia pred prvým prihlásením sa ešte zarátali.
- Ďalší účet sa pridá riadkom do `stats_excluded` (e-mail účtu). Nie je to to isté ako `admins` — vylúčený účet nemusí byť admin.

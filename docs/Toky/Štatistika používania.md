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
| `gate_shown` | hosť klikol „Mám záujem" a dostal výzvu na registráciu |
| `reg_start`, `reg_step`, `reg_done`, `reg_blocked` | priebeh registrácie (kde ľudia odpadávajú a prečo) |
| `login`, `login_google_click`, `password_reset_sent` | prihlasovanie |
| `report` | odoslané nahlásenie |
| `theme` | prepnutie svetlý/tmavý režim |

Čítať ju vie len admin cez `analytics_summary(dni)` → [[Admin panel]] (záložka Štatistika).
Okrem udalostí ukazuje aj počty z tabuliek: noví študenti a firmy, inzeráty, záujmy, zhody, správy.

---
tags: [robiq, todo]
---
# Otvorené otázky a nezrovnalosti

← [[00 Mapa systému]]

Sem si zapisuj veci, ktoré nesedia alebo treba doriešiť. Keď sa niečo vyrieši, odškrtni to alebo riadok zmaž.

## Treba urobiť
- [ ] **Nástup brigády** — firma ho pri inzeráte nevie zadať (v databáze je všade „ihneď"), preto sa na kartách zatiaľ nezobrazuje. Ak ho chceme ukazovať, treba pridať pole do formulára Nový inzerát.
- [ ] **Notifikácie** — appka zatiaľ žiadne neposiela (prepínač v menu bol len atrapa, odstránený 26. 9.).
- [ ] **Dokument o ochrane osobných údajov** (`robiq-app/ochrana-osobnych-udajov.html`) doplniť o nové údaje: zablokovania (`blocks`) a počítanie zobrazení inzerátu. Podklad je v `supabase/UDAJE-INVENTAR.md` (§3.11).

## Vyriešené 26. 9. 2026
- [x] Pri registrácii firmy sa občas ukazovalo „Register je teraz nedostupný" → pomalý register narazil na 3 s limit databázy; limit zvýšený, appka skúša znova.
- [x] Upratanie kódu (YAGNI): preč nepoužívané funkcie, poistky pre už spustené migrácie, `netlify.toml`, prázdne „Icebreakery", atrapa notifikácií a vymyslené čísla vo firemnom profile („~2 h čas odpovede", „o 40 % viac zhôd").
- [x] Migrácia `2026-09-23-fixes` je spustená (overené v databáze).
- [x] Deduplikácia kódu v `app.js` (opakované kroky → spoločné funkcie). Popri tom opravené: súhlas s podmienkami vo firemnej registrácii prepínal skryté políčko študenta, ak človek predtým prešiel registráciu študenta až po krok 3.

## Vyriešené 23. 9. 2026
- [x] Počítadlo zobrazení bolo stále 0 → `count_view` pri otvorení detailu.
- [x] Obsadené miesta sa nemenili → `taken` = počet zhôd (trigger), čiara na karte sa plní.
- [x] Duplikovanie inzerátu nekopírovalo miesto → kopíruje mesto, „na diaľku", adresu aj fotky (ako vlastné kópie súborov).
- [x] Zmazanie účtu firmy nechávalo fotky inzerátov → mažú sa všetky.
- [x] Zablokovanie platilo len do obnovenia stránky → tabuľka `blocks` + zoznam s odblokovaním v profile.
- [x] Pri nahlásení brigádnika z karty kandidáta sa v okne ukazovalo „Brigádnik" namiesto mena → opravené.
- [x] `supabase/UDAJE-INVENTAR.md` a `README.md` boli zastarané → aktualizované.

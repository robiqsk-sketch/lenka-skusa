---
tags: [robiq, todo]
---
# Otvorené otázky a nezrovnalosti

← [[00 Mapa systému]]

Sem si zapisuj veci, ktoré nesedia alebo treba doriešiť. Keď sa niečo vyrieši, odškrtni to alebo riadok zmaž.

## Treba urobiť
- [ ] **Spustiť migráciu** `supabase/migration-2026-09-23-fixes.sql` v Supabase → SQL Editor → New query → Run. Bez nej sa zobrazenia nepočítajú, obsadené miesta sa nemenia a blokovanie sa neuloží (appka funguje ďalej ako doteraz).
- [ ] **Dokument o ochrane osobných údajov** (`robiq-app/ochrana-osobnych-udajov.html`) doplniť o nové údaje: zablokovania (`blocks`) a počítanie zobrazení inzerátu. Podklad je v `supabase/UDAJE-INVENTAR.md` (§3.11).

## Vyriešené 23. 9. 2026
- [x] Počítadlo zobrazení bolo stále 0 → `count_view` pri otvorení detailu.
- [x] Obsadené miesta sa nemenili → `taken` = počet zhôd (trigger), čiara na karte sa plní.
- [x] Duplikovanie inzerátu nekopírovalo miesto → kopíruje mesto, „na diaľku", adresu aj fotky (ako vlastné kópie súborov).
- [x] Zmazanie účtu firmy nechávalo fotky inzerátov → mažú sa všetky.
- [x] Zablokovanie platilo len do obnovenia stránky → tabuľka `blocks` + zoznam s odblokovaním v profile.
- [x] Pri nahlásení brigádnika z karty kandidáta sa v okne ukazovalo „Brigádnik" namiesto mena → opravené.
- [x] `supabase/UDAJE-INVENTAR.md` a `README.md` boli zastarané → aktualizované.

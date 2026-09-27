---
tags: [robiq, todo]
---
# Otvorené otázky a nezrovnalosti

← [[00 Mapa systému]]

Sem si zapisuj veci, ktoré nesedia alebo treba doriešiť. Keď sa niečo vyrieši, odškrtni to alebo riadok zmaž.

## Treba urobiť
- [ ] **Nástup brigády** — firma ho pri inzeráte nevie zadať (v databáze je všade „ihneď"), preto sa na kartách zatiaľ nezobrazuje. Ak ho chceme ukazovať, treba pridať pole do formulára Nový inzerát.
- [ ] **Notifikácie** — appka zatiaľ žiadne neposiela (prepínač v menu bol len atrapa, odstránený 26. 9.).
- [ ] **Ochrana pred uniknutými heslami** — zapnúť ručne v Supabase → Authentication → Settings (kontrola hesiel cez HaveIBeenPwned).
- [ ] **Vypnutie e-mailových upozornení v appke** — dnes chodia každému (pri zhode; pri správe bez push). Kto ich nechce, musí napísať na support. Pridať prepínač do menu účtu (a stĺpec v profile).
- [ ] V Supabase → Edge Functions zmazať nepotrebnú testovaciu funkciu **`notify-selftest`** (je vypnutá, len vracia 410).

## Vyriešené 27. 9. 2026
- [x] **Push upozornenia** na novú zhodu a správu (aj keď appka nie je otvorená) → [[Upozornenia]]. Dokument o ochrane údajov doplnený (3.1, 4, 5, 6, 7, 8); kapitola 7 opravená aj o nastavenia v prehliadači (tmavý režim, zavreté hlášky), ktoré predtým chýbali.
- [x] Tmavý režim: karty a okraje s jemným fialovým nádychom, ladia s hornou lištou.
- [x] **E-mailové upozornenia** zapnuté cez Brevo (odosielateľ ahoj@robiq.sk). Brevo doplnené do dokumentu o ochrane údajov ako sprostredkovateľ — aj pre prihlasovacie e-maily, ktoré tam doteraz chýbali.
- [x] Dokument o ochrane osobných údajov doplnený o zablokovania (3.1, 3.2, 4, 5, 8) a presnejší popis štatistiky používania; opravený odkaz na kapitolu s právami (11, nie 12). Zobrazenia inzerátu tam už boli.
- [x] Supabase Advisors: interné funkcie triggerov nedostupné zvonka, 10 indexov, rýchlejšie pravidlá prístupu (migrácia `advisors`).

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

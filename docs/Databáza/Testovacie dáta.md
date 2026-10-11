---
tags: [robiq, databáza, test]
---
# Testovacie dáta

← [[00 Mapa systému]] · zdroj: `supabase/testovacie-data.sql`

Aby web pri skúšaní nebol prázdny, sú v ostrej databáze vymyslené firmy, inzeráty a brigádnici (pridané 11. 10. 2026).

## Čo tam je
- **10 firiem** v rôznych mestách a odvetviach (bistro v Bratislave, pekáreň v Trnave, sklad v Senci, eventová agentúra, kníhkupectvo v Žiline, doučovanie, kreatívne štúdio, penzión v Poprade, upratovanie v Nitre, účtovná kancelária v Prešove) — s popisom, bez loga a bez IČO.
- **20 inzerátov** — mestá aj práca z domu, rôzne typy (víkendy, poobede, večery, flexibilné), 3 len pre 18+. Dátumy zverejnenia sú rozložené do posledných dvoch týždňov, aby karty ukazovali „pred X dňami".
- **16 brigádnikov** s vyplneným profilom (mesto, dochádzanie, zručnosti, čas, akú prácu hľadajú) — vo veku 17 až 24 rokov.
- **Záujmy** šiestich z nich o inzeráty testovacej firmy **Kaviareň Test** (`firma.test@robiq.sk`) — po prihlásení za ňu sú vidieť v záložke Brigádnici a v návrhoch kandidátov.

## Pravidlá
- Účty sa spoznajú podľa e-mailu **`test.…@robiq.sk`** (napr. `test.firma.sklad@robiq.sk`, `test.student.tomas@robiq.sk`).
- **Nemajú heslo** — nedá sa do nich prihlásiť, takže na záujem skutočného študenta nikto neodpovie a zhoda nevznikne. Na skúšanie za firmu a študenta slúžia stále `firma.test@` a `student.test@robiq.sk`.
- Firmy **nie sú overené** (žiadna značka „Overená firma") — nemajú skutočné IČO.
- Do štatistiky sa nerátajú — e-maily sú v `stats_excluded` ([[Štatistika používania]]).
- Testoví brigádnici sa ukazujú v **návrhoch kandidátov** každej firmy ([[Návrhy kandidátov (párovanie)]]) a testové inzeráty vidí každý návštevník. Pred spustením pre verejnosť ich treba zmazať ([[Otvorené otázky a nezrovnalosti]]).

## Ako pridať znova alebo zmazať
- **Pridať:** celý súbor spustiť v Supabase → SQL Editor → Run. Opakované spustenie nič nezdvojí — chýbajúce doplní.
- **Zmazať:** dva riadky na konci súboru (zmazanie účtu kaskádovo zmaže aj firmu, jej inzeráty, študenta a jeho záujmy).

Súvisí: [[Dátový model]], [[Migrácie – história]]

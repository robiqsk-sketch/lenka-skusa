---
tags: [robiq, obrazovky, študent]
---
# Obrazovky hosťa a študenta

← [[00 Mapa systému]] · kód: `app.js` → `feed`, `jobCard`, `zhody`, `profile`

Študent má dole **dock** s tromi záložkami: **Objavuj · Správy · Profil** (`STUDENT_TABS` v `data.js`).
Hosť vidí len Objavuj a tlačidlá na prihlásenie/registráciu.

## Objavuj (`feed`)
- Nadpis „Ponuky **pre teba**", karty inzerátov: firma, mesto (a vzdialenosť), plat/hod, typy, obsadenosť miest, „✓ Overená firma".
- Tlačidlá **Mám záujem** / **Preskočiť**; klik na kartu = **detail** (popis, fotky „deň v práci", adresa s odkazom na mapu, oficiálny názov firmy, nahlásenie).
- Po 2 prezretých kartách sa hore ukáže tip **„✦ Toto by ti sedelo"** (prvý inzerát, o ktorý ešte nedal záujem).
- Prúžok **„Doplň si mesto"**, ak študent nemá mesto.
- Menu karty: nahlásiť inzerát, skryť firmu (len do obnovenia stránky).
- Poradie: pozri [[Návrhy kandidátov (párovanie)]] → časť Poradie ponúk.
- Hosť pri „Mám záujem" → výzva na prihlásenie (*gate*).

## Správy (`zhody`)
Zoznam zhôd a chat. Pri novej zhode banner **„Máte zhodu!"**. → [[Záujem, zhoda a chat]]

## Profil (`profile`)
- Hlavička: fotka, meno, hodiny, mesto; tlačidlo **Upraviť / ✓ Hotovo** (ukladá sa až pri Hotovo).
- Režim úprav: fotka, dátum narodenia (len raz), bio (max. 240 znakov, s upozornením na citlivé údaje), zručnosti s úrovňou, dostupnosť a miesto.
- Štatistika: prezreté · záujmy · zhody.
- **Moje záujmy** — na čo klikol „Mám záujem" a stav (Čaká na odpoveď / ✓ Zhoda).

## Menu účtu (vpravo hore)
Profil · notifikácie · svetlý/tmavý režim · pomoc (e-mail na support) · podmienky · **Štatistika** (len admin) · odhlásiť · **zmazať účet** → [[Zmazanie účtu]]

Súvisí: [[Registrácia študenta]], [[Obrazovky firmy]]

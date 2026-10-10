---
tags: [robiq, slovník]
---
# Slovník

← [[00 Mapa systému]]

| Pojem | Význam | V databáze |
|---|---|---|
| **Brigádnik / študent** | človek, ktorý hľadá brigádu | `students`, rola `student` |
| **Firma** | zamestnávateľ, ktorý zverejňuje inzeráty | `companies`, rola `firm` |
| **Hosť** | neprihlásený návštevník; vidí ponuky | – |
| **Inzerát / ponuka** | ponuka brigády od firmy | `postings` |
| **Záujem** | študent klikol „Mám záujem" na inzerát | `interests` |
| **Preskočiť** | študent inzerát nechce vidieť | `skips` |
| **Oslovenie** | firma prejavila záujem o študenta (z návrhov alebo z kandidátov) | `company_interests` |
| **Kandidát** | študent, ktorý dal záujem o inzerát firmy — firma vidí jeho meno | cez `candidate_profiles` |
| **Návrh (navrhovaný kandidát)** | anonymný študent, ktorý sedí na inzerát podľa skóre | `suggest_candidates` |
| **Zhoda** | obojstranný záujem na ten istý inzerát → otvorí sa chat | `matches` |
| **Gate** | výzva na prihlásenie, keď hosť klikne „Mám záujem" — len v registrácii v1 (v2 ide hosť rovno na registráciu) | – |
| **Registrácia v1 / v2** | v1: tri kroky so zručnosťami a časom (schovaná); v2: jedna obrazovka, profil sa dopĺňa neskôr | prepínač `REG_V2` v `app.js` |
| **Nedoplnený profil** | študent (v2) bez zručností, času alebo mesta — svieti mu Profil, upozornenie nad feedom a karta na jeho konci | `profileTodo` (appka) |
| **Doplniť profil** | pôvodné kroky 2 a 3 registrácie otvorené z appky, ukladajú sa do profilu | – |
| **Dochádzanie** | ako ďaleko je študent ochotný cestovať | `students.commute` |
| **Overená firma** | IČO nájdené v Registri právnických osôb | `companies.verified` |
| **Oficiálny vs. zobrazovaný názov** | z registra vs. zvolený firmou | `legal_name` vs. `name` |
| **Pozastavený inzerát** | vypnutý firmou (`active`) alebo Robiqom (`blocked`) | `postings` |
| **Nahlásenie** | upozornenie na problém (DSA) | `reports` |
| **RLS** | pravidlá v databáze, kto smie čítať/meniť riadky | [[Prístupy a bezpečnosť (RLS)]] |
| **RPO** | Register právnických osôb (Štatistický úrad SR) | `rpo_lookup` |
| **Migrácia** | SQL súbor so zmenou databázy, spúšťa sa ručne | [[Migrácie – história]] |
| **Dock** | spodná lišta so záložkami | – |

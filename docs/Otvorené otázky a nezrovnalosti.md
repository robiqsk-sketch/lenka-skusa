---
tags: [robiq, todo]
---
# Otvorené otázky a nezrovnalosti

← [[00 Mapa systému]]

Veci, na ktoré som narazil pri písaní poznámok (stav k 23. 9. 2026). Nie sú opravené — len zapísané, aby sa nestratili.
Keď sa niečo vyrieši, odškrtni to alebo riadok zmaž.

## V appke
- [ ] **Počítadlo zobrazení je stále 0.** `postings.views` sa nikde nezvyšuje, no firma ho vidí v Inzerátoch („zobrazenia").
- [ ] **Obsadené miesta sa nemenia.** `postings.taken` appka nikde nenastavuje, takže čiara obsadenosti na karte je vždy prázdna.
- [ ] **Duplikovanie inzerátu nekopíruje miesto.** Kópia nemá mesto, „na diaľku", adresu ani fotky → nemá bránu miesta pri párovaní a v detaile chýba miesto.
- [ ] **Zmazanie účtu firmy nechá fotky inzerátov.** Maže sa len bucket `logos`, súbory v `posting-photos` zostanú (verejne dostupné).
- [ ] **Zablokovanie kandidáta / skrytie firmy platí len do obnovenia stránky** — nikam sa neukladá.

## V dokumentoch
- [ ] `supabase/UDAJE-INVENTAR.md` (stav 20. 9.) je v častiach zastaraný: píše, že profilová fotka nie je implementovaná, overenie IČO nie je implementované a vek sa pri registrácii nekontroluje — všetko už existuje. Chýbajú v ňom novšie údaje (mesto a dochádzanie sú spomenuté, ale fotky inzerátov, adresa, nahlásenia, štatistika `events`, `legal_name` nie).
- [ ] Hlavný `README.md` hovorí „bez backendu — dáta žijú len v pamäti stránky" — to už neplatí (Supabase).

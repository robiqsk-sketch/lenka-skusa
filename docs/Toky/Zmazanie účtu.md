---
tags: [robiq, tok, gdpr]
---
# Zmazanie účtu

← [[00 Mapa systému]] · kód: `app.js` → `askDeleteAccount`, `delAccountConfirm` · DB: `delete_my_account`

Používateľ si zmaže účet sám: **menu účtu → Zmazať účet** (s potvrdením). Právo na vymazanie (GDPR).

1. Appka najprv zmaže súbory v Storage cez Storage API (fotku študenta / logo firmy) — SQL ich mazať nesmie.
2. Zavolá `delete_my_account()` → zmaže riadok v `auth.users`.
3. **Kaskáda** v databáze zmaže profil, inzeráty, záujmy, zhody aj správy.
4. Odhlásenie a čistý pohľad hosťa.

> [!note]
> Pri mazaní jedného inzerátu appka zmaže aj jeho fotky (`posting-photos/<uid>/<id>/`). Pri mazaní celého účtu firmy sa
> mažú len logá — pozri [[Otvorené otázky a nezrovnalosti]].

Súvisí: [[Dátový model]]

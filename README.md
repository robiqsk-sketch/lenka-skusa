# Lenka skúša programovať

Robiq — brigádny matching systém pre študentov a firmy. Frontend postavený podľa dizajnového handoffu.

## Priečinky

- `robiq-app/` — samotná appka. Jeden súbor `index.html`, otvorí sa dvojklikom v prehliadači. Bez backendu — dáta žijú len v pamäti stránky.
- `docs/` — poznámky o systéme (Obsidian vault), začni na `docs/00 Mapa systému.md`.
- `design_handoff_robiq/` — zadanie: klikateľný prototyp (`Robiq MVP - standalone.html`), `README.md` so špecifikáciou obrazoviek a `DESIGN.md` s dizajnovým systémom.

## Čo appka obsahuje

- Prihlásenie, výber typu účtu, onboarding študenta (3 kroky), registrácia firmy (3 kroky)
- Študent: Objavuj (feed ponúk), Zhody (chat), Profil
- Firma: Brigádnici, Správy, Inzeráty, Nová ponuka, Firemný profil
- Guest-first: feed je viditeľný bez účtu, prihlásenie sa vyžiada až pri akcii

## Ďalší krok

Backend (Supabase): účty, inzeráty, záujmy a zhody, realtime chat.

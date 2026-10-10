# Lenka skúša programovať

Robiq — brigádny matching systém pre študentov a firmy. Frontend postavený podľa dizajnového handoffu.

## Priečinky

- `robiq-app/` — samotná appka (statické HTML + JS, bez build kroku). Dáta, prihlásenie, súbory a chat sú v Supabase. Nasadzuje sa na Cloudflare podľa `wrangler.jsonc`.
- `supabase/` — databázová schéma (`schema.sql`) a migrácie, ktoré sa spúšťajú ručne v Supabase → SQL Editor.
- `docs/` — poznámky o systéme (Obsidian vault), začni na `docs/00 Mapa systému.md`.
- `design_handoff_robiq/` — zadanie: klikateľný prototyp (`Robiq MVP - standalone.html`), `README.md` so špecifikáciou obrazoviek a `DESIGN.md` s dizajnovým systémom.

## Čo appka obsahuje

- Prihlásenie, výber typu účtu, registrácia študenta (jedna obrazovka — zručnosti, čas a miesto si doplní neskôr v appke), registrácia firmy (3 kroky)
- Študent: Objavuj (feed ponúk), Zhody (chat), Profil
- Firma: Brigádnici, Správy, Inzeráty, Nová ponuka, Firemný profil
- Guest-first: feed je viditeľný bez účtu; „Mám záujem" hosťa vedie rovno na krátku registráciu a záujem sa po nej odošle sám

Podrobný popis systému je v `docs/` (začni na `docs/00 Mapa systému.md`).

---
tags: [robiq, architektúra]
---
# Architektúra

← [[00 Mapa systému]]

## Súčasti

| Časť | Čo to je | Kde |
|---|---|---|
| **Appka** | jedna stránka (`index.html`), logika v `app.js`, statické zoznamy v `data.js`, vzhľad v `styles.css` | `robiq-app/` |
| **Admin** | samostatná stránka so štatistikou, firmami, inzerátmi a nahláseniami | `robiq-app/admin.html` → [[Admin panel]] |
| **Právne stránky** | podmienky, ochrana osobných údajov | `robiq-app/podmienky.html`, `ochrana-osobnych-udajov.html` |
| **Databáza** | PostgreSQL v Supabase — tabuľky, pravidlá prístupu, funkcie, triggery | `supabase/schema.sql` + migrácie |
| **Dizajn** | klikateľný prototyp a dizajnový systém (zadanie) | `design_handoff_robiq/` |
| **Lokálny server** | na spustenie appky na vlastnom počítači (Windows) | `tools/serve.ps1` → http://localhost:8765 |

## Ako to do seba zapadá

```mermaid
flowchart TB
  subgraph Prehliadač
    IDX[index.html] --> CFG[config.js<br/>adresa + verejný kľúč Supabase]
    IDX --> DATA[data.js<br/>zručnosti, dni, časy, odvetvia]
    IDX --> APPJS[app.js<br/>stav · načítanie dát · vykreslenie]
  end
  subgraph Supabase[Supabase · Frankfurt]
    AUTH[Auth<br/>e-mail+heslo, Google]
    DB[(PostgreSQL<br/>tabuľky + RLS + funkcie)]
    ST[Storage<br/>logos · posting-photos · avatars]
    RT[Realtime<br/>messages · matches · company_interests]
  end
  APPJS -->|supabase-js z jsDelivr| AUTH
  APPJS --> DB
  APPJS --> ST
  RT -->|nové riadky| APPJS
  DB -->|rpo_lookup| RPO[api.statistics.sk<br/>Register právnických osôb]
```

## Dôležité princípy
- **Žiadny vlastný backend.** Prehliadač hovorí priamo so Supabase. Bezpečnosť preto stojí na pravidlách v databáze → [[Prístupy a bezpečnosť (RLS)]].
- **Verejný kľúč (`anon`) v `config.js` je v poriadku** — sám nič nedovolí, všetko strážia RLS pravidlá. Kľúč `service_role` do appky nikdy nepatrí.
- **Citlivé operácie bežia v databáze** ako funkcie (`security definer`): vytvorenie zhody, návrhy kandidátov, overenie firmy, admin zásahy → [[Databázové funkcie]].
- **Guest-first:** ponuky vidí aj neprihlásený hosť; prihlásenie sa pýta až pri „Mám záujem".
- **Bez build kroku:** čo je v `robiq-app/`, to sa nasadí.

## Nasadenie
- Web beží na **Cloudflare** (projekt „robiq", Workers Builds). Pri každom pushi na GitHub Cloudflare spustí `wrangler`, ktorý podľa `wrangler.jsonc` nahrá statické súbory z `robiq-app/`. Bez tohto súboru build zlyhá („Missing entry-point… or assets directory").
- Push do `main` = nasadenie na web; push do inej vetvy = len náhľadová verzia.
- Bezpečnostné hlavičky sú v `robiq-app/_headers`.
- `netlify.toml` je pozostatok (Netlify sa už nepoužíva).
- **Zmeny databázy sa nenasadzujú samy:** migráciu treba ručne spustiť v Supabase → SQL Editor → Run. Pozri [[Migrácie – história]].

## Externé služby
| Služba | Na čo |
|---|---|
| Supabase | databáza, prihlásenie, súbory, realtime |
| Google (OAuth) | prihlásenie cez Google |
| api.statistics.sk (RPO) | overenie IČO firmy |
| jsDelivr | knižnica supabase-js |
| cdnfonts.com | písma Satoshi a Open Sauce One |

Súvisí: [[app.js – mapa kódu]], [[Dátový model]]

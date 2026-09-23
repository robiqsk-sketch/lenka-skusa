---
tags: [robiq, obrazovky, admin]
---
# Admin panel

← [[00 Mapa systému]] · súbor: `robiq-app/admin.html` (samostatná stránka, zdieľa prihlásenie s appkou)

Prístup len pre e-maily v tabuľke `admins`. V appke sa adminovi ukáže v menu účtu položka **Štatistika**.
Stránka má `noindex` (nevyhľadávajú ju vyhľadávače).

| Záložka | Čo ukazuje | Zásahy | DB funkcia |
|---|---|---|---|
| **Štatistika** | návštevy, registrácie (aj kde ľudia odpadávajú), záujmy, zhody, správy; za 7 / 30 / 90 dní | – | `analytics_summary` |
| **Firmy** | zoznam firiem, overenie, počty inzerátov, záujmov, zhôd | ručne overiť / zrušiť overenie | `admin_companies`, `admin_set_company_verified` |
| **Inzeráty** | všetky inzeráty so stavom a počtami | pozastaviť s dôvodom / obnoviť | `admin_postings`, `admin_set_posting_blocked` |
| **Nahlásenia** | nahlásenia (otvorené navrchu), počet otvorených pri záložke | vyriešiť / zamietnuť / pozastaviť inzerát | `admin_reports`, `admin_resolve_report` |

Súvisí: [[Štatistika používania]], [[Nahlásenia a moderovanie]], [[Prístupy a bezpečnosť (RLS)]]

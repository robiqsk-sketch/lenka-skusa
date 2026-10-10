---
tags: [robiq, tok, študent]
---
# Registrácia študenta

← [[00 Mapa systému]] · kód: `app.js` → `REG_V2`, `openJoin`, `obJoin`, `registerStudent`, `sendPending`, `profileTodo` · v1: `renderOb`, `obStep1–3`

Od 10. 10. 2026 beží **verzia 2**: registrácia je jedna krátka obrazovka a všetko ostatné si študent **doplní neskôr v appke**.
Pôvodná trojkroková registrácia (**verzia 1**) je v kóde **schovaná, nie zmazaná** — zapne sa späť prepínačom `REG_V2 = false` na začiatku `app.js`.

## Prečo verzia 2
Hosť, ktorý klikne „Mám záujem", chce dať najavo záujem o konkrétnu brigádu — nie vypĺňať 50 zručností a kalendár.
Vo v1 ho čakala výzva na prihlásenie → výber typu účtu → 3 kroky. Vo v2 je od kliknutia k odoslanému záujmu **jedna obrazovka**.
Zručnosti, čas a miesto sú stále dôležité (podľa nich Robiq radí ponuky a firmy študenta nájdu) — len sa pýtajú až potom, a appka na ne upozorňuje.

```mermaid
flowchart TD
  F[Hosť vo feede] -->|„Mám záujem" na inzeráte| J
  H[Hlavička: Vytvoriť účet] --> P[Výber typu účtu] -->|Hľadám prácu| J
  E[Koniec feedu: Vytvoriť profil] --> J
  J["Registrácia — jedna obrazovka<br/>karta inzerátu · meno · dátum narodenia · e-mail · heslo · súhlas<br/>alebo Google · alebo Už mám účet"]
  J -->|e-mail| SU[signUp — trigger handle_new_user<br/>vytvorí profil len s menom a dátumom]
  J -->|Google| UP[profil sa zapíše priamo<br/>profiles + students]
  SU --> CONF{Treba potvrdiť e-mail?}
  CONF -->|áno| LOGIN[Prihlásenie + „Poslali sme ti e-mail…<br/>a záujem odošleme"]
  CONF -->|nie| APP
  UP --> APP[Appka → Objavuj<br/>záujem sa odošle sám]
  APP --> T[Profil nedoplnený:<br/>svieti záložka Profil, pruh nad feedom,<br/>karta na konci feedu]
  T -->|Doplniť| W["Doplniť profil — pôvodné kroky 2 a 3<br/>zručnosti → čas a miesto → Uložiť"]
```

## Obrazovka registrácie (v2)
- Hore **karta inzerátu**, na ktorý hosť klikol (logo, názov, firma, plat) — aby bolo jasné, prečo sa registruje. Keď prišiel z hlavičky, karta nie je.
- Polia: **meno a priezvisko · dátum narodenia · e-mail · heslo** (pri Google len e-mail z Googlu) a **súhlas** s podmienkami (16+).
  To je minimum, ktoré zamestnávateľ potrebuje: kto to je a koľko má rokov (16+ je podmienka Robiqu, 18+ niektorých inzerátov).
- Tlačidlo **„Odoslať záujem"** (z inzerátu) alebo **„Vytvoriť účet"** (z hlavičky). Bez bodiek krokov — je len jeden.
- Pod tým **Pokračovať s Google** a **Už mám účet — prihlásiť sa** (hosť z inzerátu výber typu účtu nevidel, preto sú tu).
- **← Späť** — z inzerátu späť do feedu (záujem sa zahodí), z výberu typu účtu späť naň.
- Chyba sa ukazuje jedna naraz, rovnako ako vo v1. Fotka tu nie je (pridá sa v profile).

## Záujem čaká na účet
Inzerát, na ktorý hosť klikol, si appka pamätá v stave **aj v prehliadači** (`robiq_pending_job`, najviac deň):
- prihlásenie cez Google aj potvrdzovací e-mail stránku znovu načítajú (odkaz z e-mailu ju dokonca otvorí v novej karte),
- po návrate z Googlu bez profilu appka vďaka nemu vie, že ide o študenta, a otvorí registráciu s tou istou kartou,
- hneď ako je študent prihlásený, záujem sa **odošle sám** (`sendPending`) a ukáže sa „… — záujem odoslaný ✓".

Zmaže sa po odoslaní, pri „← Späť" z registrácie a pri odhlásení. Uvedené aj v dokumente o ochrane údajov (`ochrana-osobnych-udajov.html`, kap. 7).

## Doplnenie profilu (v2)
Študent bez zručností, času alebo mesta má **nedoplnený profil** (`profileTodo`). Kde to vidí → [[Obrazovky hosťa a študenta]]:
- svieti mu záložka **Profil** (žltá bodka),
- nad feedom pruh **„Profil máš na 25 %"** — dá sa zavrieť, pri ďalšom otvorení appky je späť,
- na konci feedu karta **„Nemáš dokončený profil"** s tým, čo chýba,
- v profile karta s percentami a riadkami Čo ti ide · Kedy máš čas · Kde môžeš pracovať.

Percentá: účet = 25 %, každá doplnená časť ďalších 25 %. Tlačidlá **Doplniť** otvoria **pôvodné kroky 2 a 3 z v1** (zatiaľ bez zmeny — [[Nápady – doplnenie profilu|nápady, ako to spraviť inak]]):
krok 1/2 zručnosti, krok 2/2 hodiny, dni, časy a mesto → **Uložiť**. Nič nie je povinné a ukladá sa aj pri „← Späť" — vyplnené sa nestratí.

Prečo „veľa ponúk" záleží na profile: feed radí ponuky podľa mesta a firma vidí študenta v [[Návrhy kandidátov (párovanie)|návrhoch]] až od skóre 30 —
prázdny profil ho skoro nikdy nedosiahne.

## Pravidlá (obe verzie)
- **Vek 16+** kontroluje appka aj databáza (trigger). Dátum narodenia sa potom nedá zmeniť.
- **Obsadený e-mail** sa zisťuje pred vytvorením účtu (`email_taken`), lebo Supabase pri zapnutom potvrdzovaní chybu nevráti.
- Databáza (trigger `handle_new_user`) doplní, čo registrácia neposlala: prázdne zručnosti, dni a časy, bez mesta, **hodiny = 10 h / týždeň** (predvolená hodnota stĺpca).
  Preto appka hodiny nikde neukazuje, kým študent nevyplní čas — v profile ani firme (karta kandidáta bez zručností má „Profil ešte nedoplnený").

## Verzia 1 (schovaná)
Výzva na prihlásenie (*gate*) → výber typu účtu → 3 kroky: **1** meno, dátum narodenia, fotka, e-mail, heslo · **2** zručnosti (z každej skupiny prvé 4, zvyšok za „Ďalšie") ·
**3** hodiny, dni, časy, **mesto (povinné)** a súhlas. Kroky bez nadpisov, priebeh ukazujú bodky dole. Mesto chýbajúce starším účtom pripomínal prúžok „Doplň si mesto".

## Nedokončená registrácia
Ak účet existuje, ale chýba profil (napr. prihlásenie cez Google, prerušená registrácia), appka zostane zamknutá a pokračuje registráciou
(`profileUnfinished` → `resumeOnboarding`). Vo v2 stačí na dokončenie **meno**; vo v1 museli byť aj zručnosti.

Súvisí: [[Prihlásenie a obnova hesla]], [[Obrazovky hosťa a študenta]], [[Záujem, zhoda a chat]], [[Registrácia firmy a overenie IČO]]

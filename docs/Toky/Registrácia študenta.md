---
tags: [robiq, tok, študent]
---
# Registrácia študenta

← [[00 Mapa systému]] · kód: `app.js` → `REG_V2`, `REG_V3`, `openJoin`, `obJoin`, `registerStudent`, `sendPending`, `profileTodo`, `offerScreen`, `learnProposals` · v1: `renderOb`, `obStep1–3`

Od 10. 10. 2026 beží **verzia 3** — verzia 2 (jedna krátka obrazovka, profil sa dopĺňa neskôr) a k tomu **odvetvie pri registrácii**, ponuka **„Doplniť profil / Preskočiť"** hneď po nej a **učenie z ponúk, ktoré sa študentovi páčia**.
Staršie verzie sú v kóde **schované, nie zmazané** — prepínače na začiatku `app.js`: `REG_V3 = … false` vráti presne verziu 2, `REG_V2 = false` pôvodnú trojkrokovú verziu 1.

## Verzia 3 — čo pribudlo
Tok: páči sa ti ponuka → **Mám záujem** → registrácia (alebo prihlásenie) → **Doplniť profil / Preskočiť** → feed. Kto preskočí, tomu profil dopĺňa Robiq podľa toho, čo lajkuje.

1. **Akú prácu hľadáš?** — na registračnej obrazovke čipy s odvetviami (rovnaký zoznam ako pri firmách: Gastro, Retail, Sklad a logistika…), aspoň jedno. Predvyplní sa odvetvie firmy z inzerátu, na ktorý hosť klikol — väčšinou stačí nič nemeniť. Ukladá sa do `students.fields`, upraviť sa dá v profile.
2. **Hneď po registrácii** (`offerScreen`): „✓ Záujem o … je odoslaný", **Chceš ponuky na mieru?** → **Doplniť profil** (malé kroky nižšie) alebo **Preskočiť**. Pri registrácii s potvrdzovacím e-mailom sa ukáže pri prvom prihlásení (značka v prehliadači `robiq_offer`).
3. **Robiq si všimol, čo ťa baví** (`learnProposals`) — po 3 záujmoch sa pozrie na lajknuté inzeráty a ak sa niečo opakuje aspoň 2×, navrhne to: **odvetvie** firmy, **víkendy / poobedia / večery** (podľa typu brigády) a **mesto** („Trnava a okolie"). Navrhuje len to, čo v profile chýba. Okno s čipmi: každý sa dá vypnúť, **Uložiť do profilu** uloží len zapnuté, vypnuté už na tomto zariadení neponúkne (`robiq_learn_no`). „Teraz nie" → znova najskôr po ďalších 3 záujmoch. Nie je to AI — obyčajné počítanie.
4. **Firma vidí viac** — pri kandidátovi aj **„Hľadá: Gastro, Eventy"** a **dni / časti dňa** (aj keď ich študent len potvrdil z návrhu). „Profil ešte nedoplnený" ostáva len pri kandidátovi, o ktorom nevieme nič. Funkcia `candidate_profiles`, migrácia `student-fields`.

> [!warning] Čo ostáva otvorené
> Kto preskočí doplnenie a lajkne menej ako 3 ponuky, o tom firma vie len meno a odvetvie z registrácie. Ďalší krok môže byť jedna otázka pri záujme ([[Nápady – doplnenie profilu]], nápad 1).

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
  T -->|Doplniť| W["Doplniť profil — malé kroky, jedna otázka na obrazovku<br/>zručnosti → hodiny → dni → časť dňa → miesto → Uložiť"]
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

Percentá: účet = 25 %, každá doplnená časť ďalších 25 %.

**Doplniť** ide po **malých krokoch — na každej obrazovke jedna otázka** (bodky dole ukazujú, koľko krokov ešte zostáva):

| Časť | Kroky |
|---|---|
| Čo ti ide | zručnosti (pôvodný krok 2 registrácie, bez zmeny) |
| Kedy máš čas | Koľko hodín týždenne? → Ktoré dni? → Kedy počas dňa? |
| Kde môžeš pracovať | mesto + ako ďaleko dochádzaš |

- Riadok v profile alebo čip na konci feedu otvorí **len svoju časť** (napr. „Kedy máš čas" = 3 kroky).
- Tlačidlo **Doplniť / Doplniť profil** prejde **všetky časti, ktoré chýbajú**, za sebou.
- Posledný krok má **Uložiť**; „← Späť" ide o krok späť, z prvého kroku späť do appky. Nič nie je povinné a ukladá sa aj pri odchode cez „← Späť" — vyplnené sa nestratí.
- Prečo: pôvodný krok 3 mal hodiny, dni, časy, mesto aj dochádzanie na jednej obrazovke — priveľa naraz.
- V profile cez **Upraviť** je naďalej všetko na jednej stránke (tam človek mení jednu vec, nie vypĺňa od nuly).

Iné spôsoby, ako sa na to pýtať: [[Nápady – doplnenie profilu]].

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

---
tags: [robiq, tok, študent]
---
# Registrácia študenta

← [[00 Mapa systému]] · kód: `app.js` → `REG_V2`, `REG_V3`, `REG_V4`, `quizAnswer`, `quizResult` (otázky `QUIZ` v `data.js`), `openJoin`, `obJoin`, `registerStudent`, `sendPending`, `profileTodo`, `joinField`, `offerScreen`, `feedAffinity` · v1: `renderOb`, `obStep1–3`

Od 10. 10. 2026 beží **verzia 3** — verzia 2 (krátka registrácia, profil sa dopĺňa neskôr) a k tomu **odvetvie v 2. kroku registrácie**, ponuka **„Doplniť profil / Preskočiť"** hneď po nej (doplnenie = najviac 10 krátkych otázok) a **poradie ponúk podľa toho, čo študenta zaujíma**.
Od 11. 10. 2026 **verzia 4**: „Doplniť profil" sa z polohy pýta len na mesto a namiesto skupín zručností dáva **6 jednoduchých otázok Áno / Nie o tom, čo ťa baví** — z nich vznikne profil.
Staršie verzie sú v kóde **schované, nie zmazané** — prepínače na začiatku `app.js`: `REG_V4 = … false` vráti verziu 3, `REG_V3 = … false` presne verziu 2, `REG_V2 = false` pôvodnú trojkrokovú verziu 1.

## Verzia 4 — otázky o tebe
„Doplniť profil" sa pýta menej na fakty a viac na človeka — aby sme zistili, na čo sa hodí.
- **Poloha = len mesto:** „V ktorom meste chceš pracovať?". Dochádzanie sa nepýta (ostáva predvolené do 30 km, zmeniť sa dá v profile cez Upraviť).
- **6 otázok Áno / Nie** (`QUIZ` v `data.js`). Ťuknutie na odpoveď hneď prejde na ďalšiu otázku a uloží. Dá sa Preskočiť aj vrátiť a odpoveď zmeniť.
- Otázky vychádzajú z **Hollandovho testu záujmov (RIASEC)** — najznámejší test kariérnych záujmov, používa ho napr. americký O*NET (Interest Profiler). Delí záujmy na 6 typov: praktický, skúmavý, umelecký, sociálny, podnikavý, konvenčný. Z každého typu je jedna otázka zrozumiteľná pre brigádu; podnikavý typ nahrádza otázka na tempo (pri brigádach dôležitejšia).

| Otázka | Typ | „Áno" pridá do zručností | Body odvetviam |
|---|---|---|---|
| Máš rád/a prácu s ľuďmi? | sociálny | Komunikatívnosť | Gastro, Retail, Eventy |
| Baví ťa fyzická práca, pri ktorej si stále v pohybe? | praktický | Fyzická kondícia | Sklad a logistika, Manuálna práca |
| Máš rád/a poriadok a jasné postupy? | konvenčný | Organizovanosť | Administratíva, Sklad a logistika |
| Baví ťa zisťovať, ako veci fungujú, a riešiť úlohy? | skúmavý | Rýchle učenie | IT a dizajn, Doučovanie |
| Baví ťa tvoriť — kresliť, fotiť, písať, strihať videá? | umelecký | Kreativita (nová vlastnosť v zozname) | IT a dizajn, Eventy |
| Zvládaš rýchle tempo, keď je veľa práce naraz? | tempo | Práca pod tlakom | Gastro, Eventy, Retail |

- **Ako z toho vznikne profil:** „Áno" pridá vlastnosť medzi zručnosti (úroveň Dobré) — firma ju vidí pri kandidátovi. „Nie" vezme späť len to, čo pridala tá istá otázka, nie to, čo mal študent už predtým.
- **Na konci „Na čo sa hodíš?"** — najviac 3 odvetvia s najväčším počtom bodov sa zakliknú k tým z registrácie; študent ich môže odkliknúť alebo pridať iné. Pod nimi vidí, aké vlastnosti sa pridali, a vetu, že všetko zmení v Profile → Upraviť. Uložiť → appka.
- **Samotné odpovede sa neukladajú** — len vlastnosti a odvetvia, ktoré študent vidí a môže zmeniť. Je to pomôcka na opis a poradie, nie psychologický test; nikoho nevylučuje z ponúk (ochrana údajov, kap. 4 a 9).
- V profile a na konci feedu sa táto časť volá **Čo ťa baví** (vo v3 „Čo ti ide").

## Verzia 3 — čo pribudlo
Tok: páči sa ti ponuka → **Mám záujem** → registrácia (alebo prihlásenie) → **Doplniť profil / Preskočiť** → feed.

1. **Registrácia v 2 krokoch** — **1.** meno, dátum narodenia, e-mail a heslo (alebo Google), súhlas → **Pokračovať**; **2.** **Akú prácu hľadáš?** (`joinField`) — čipy s odvetviami (rovnaký zoznam ako pri firmách), aspoň jedno, predvyplnené odvetvím firmy z inzerátu → **Odoslať záujem** / **Vytvoriť účet**. Účet vznikne až po 2. kroku. Ukladá sa do `students.fields`, upraviť sa dá v profile. Odvetvie nie je pri mene a kontaktoch, aby prvý krok bol len o tom, kto si.
2. **Hneď po registrácii** (`offerScreen`): **Chceš ponuky na mieru?** → **Doplniť profil** (10 otázok nižšie) alebo **Preskočiť**. Pri registrácii s potvrdzovacím e-mailom sa ukáže pri prvom prihlásení (značka v prehliadači `robiq_offer`).
3. **Poradie ponúk podľa záujmov** (`feedAffinity`) — profil sa z toho **nedopĺňa**, mení sa len poradie vo feede. Každý inzerát má znaky: odvetvia firmy, typy (víkendy, poobede…) a mesto. Lajknutý inzerát pridá každému svojmu znaku +2, preskočený −1, odvetvie zvolené pri registrácii +3; skóre inzerátu = súčet jeho znakov. Radí sa po oslovených ponukách a ponukách v dosahu, pred „najnovšie". Už lajknuté inzeráty nedostávajú body (aby navrchu boli nové podobné). Počíta sa v appke pri každom vykreslení, nikam sa neukladá.
4. **Firma vidí viac** — pri kandidátovi aj **„Hľadá: Gastro, Eventy"** a **dni / časti dňa**, ak ich študent vyplnil. „Profil ešte nedoplnený" ostáva len pri kandidátovi, o ktorom nevieme nič. Funkcia `candidate_profiles`, migrácia `student-fields`.

Do 10. 10. večer mala v3 aj okno „Robiq si všimol, čo ťa baví" (navrhovalo uložiť do profilu odvetvie, dni a mesto z lajknutých inzerátov) — na želanie zrušené, ostalo len poradie ponúk.

> [!warning] Čo ostáva otvorené
> Kto preskočí doplnenie, o tom firma vie len meno a odvetvie z registrácie. Ďalší krok môže byť jedna otázka pri záujme ([[Nápady – doplnenie profilu]], nápad 1).

## Prečo verzia 2
Hosť, ktorý klikne „Mám záujem", chce dať najavo záujem o konkrétnu brigádu — nie vypĺňať 50 zručností a kalendár.
Vo v1 ho čakala výzva na prihlásenie → výber typu účtu → 3 kroky. Vo v2 je od kliknutia k odoslanému záujmu **jedna obrazovka**.
Zručnosti, čas a miesto sú stále dôležité (podľa nich Robiq radí ponuky a firmy študenta nájdu) — len sa pýtajú až potom, a appka na ne upozorňuje.

```mermaid
flowchart TD
  F[Hosť vo feede] -->|„Mám záujem" na inzeráte| J
  H[Hlavička: Vytvoriť účet] --> P[Výber typu účtu] -->|Hľadám prácu| J
  E[Koniec feedu: Vytvoriť profil] --> J
  J["Registrácia — jedna obrazovka<br/>meno · dátum narodenia · akú prácu hľadáš · e-mail · heslo · súhlas<br/>alebo Google · alebo Už mám účet"]
  J -->|e-mail| SU[signUp — trigger handle_new_user<br/>vytvorí profil len s menom a dátumom]
  J -->|Google| UP[profil sa zapíše priamo<br/>profiles + students]
  SU --> CONF{Treba potvrdiť e-mail?}
  CONF -->|áno| LOGIN[Prihlásenie + „Poslali sme ti e-mail…<br/>a záujem odošleme"]
  CONF -->|nie| APP
  UP --> APP[Appka → Objavuj<br/>záujem sa odošle sám]
  APP --> T[Profil nedoplnený:<br/>svieti záložka Profil, pruh nad feedom,<br/>karta na konci feedu]
  T -->|Doplniť| W["Doplniť profil — malé kroky, jedna otázka na obrazovku<br/>zručnosti → hodiny → dni → časť dňa → miesto → Uložiť"]
```

## Obrazovka registrácie (v2 / v3)
- Vo v3 **bez karty inzerátu** hore (zrušená 10. 10.); inzerát sa prejaví predvyplneným odvetvím a tlačidlom „Odoslať záujem". Vo v2 bola hore **karta inzerátu**, na ktorý hosť klikol (logo, názov, firma, plat). Keď prišiel z hlavičky, karta nie je.
- Polia: **meno a priezvisko · dátum narodenia · e-mail · heslo** (pri Google len e-mail z Googlu) a **súhlas** s podmienkami (16+).
  To je minimum, ktoré zamestnávateľ potrebuje: kto to je a koľko má rokov (16+ je podmienka Robiqu, 18+ niektorých inzerátov).
- Tlačidlo **„Odoslať záujem"** (z inzerátu) alebo **„Vytvoriť účet"** (z hlavičky) — vo v2 hneď, vo v3 až v 2. kroku (odvetvie); v 1. kroku je **Pokračovať** a bodky ukazujú 2 kroky. Vo v2 bez bodiek — je len jeden krok.
- Pod tým **Pokračovať s Google** a **Už mám účet — prihlásiť sa** (hosť z inzerátu výber typu účtu nevidel, preto sú tu).
- **← Späť** — z inzerátu späť do feedu (záujem sa zahodí), z výberu typu účtu späť naň.
- Chyba sa ukazuje jedna naraz, rovnako ako vo v1. Fotka tu nie je (pridá sa v profile).

## Záujem čaká na účet
Inzerát, na ktorý hosť klikol, si appka pamätá v stave **aj v prehliadači** (`robiq_pending_job`, najviac deň):
- prihlásenie cez Google aj potvrdzovací e-mail stránku znovu načítajú (odkaz z e-mailu ju dokonca otvorí v novej karte),
- po návrate z Googlu bez profilu appka vďaka nemu vie, že ide o študenta, a otvorí registráciu s tou istou kartou,
- hneď ako je študent prihlásený, záujem sa **odošle sám** (`sendPending`) a ukáže sa „… — záujem odoslaný ✓".

Zmaže sa po odoslaní, pri „← Späť" z registrácie a pri odhlásení. Uvedené aj v dokumente o ochrane údajov (`ochrana-osobnych-udajov.html`, kap. 7).

## Doplnenie profilu (v2 / v3)
Študent bez zručností, času alebo mesta má **nedoplnený profil** (`profileTodo`). Kde to vidí → [[Obrazovky hosťa a študenta]]:
- svieti mu záložka **Profil** (žltá bodka),
- nad feedom pruh **„Profil máš na 25 %"** — dá sa zavrieť, pri ďalšom otvorení appky je späť,
- na konci feedu karta **„Nemáš dokončený profil"** s tým, čo chýba,
- v profile karta s percentami a riadkami Čo ťa baví (v3: Čo ti ide) · Kedy máš čas · Kde môžeš pracovať.

Percentá: účet = 25 %, každá doplnená časť ďalších 25 %.

**Doplniť** ide po **malých krokoch — na každej obrazovke jedna otázka** (bodky dole ukazujú, koľko krokov ešte zostáva):

| Časť | Kroky |
|---|---|
| Kedy máš čas | 1 Koľko hodín týždenne? → 2 Ktoré dni? → 3 Kedy počas dňa? |
| Kde môžeš pracovať | v4: 4 V ktorom meste chceš pracovať? · v3: 4 Kde bývaš? → 5 Ako ďaleko môžeš dochádzať? |
| Čo ťa baví (v4) | 5–10 šesť otázok Áno / Nie (vyššie) → **Na čo sa hodíš?** (odvetvia, záverečná obrazovka) |
| Čo ti ide (v3) | 6 V čom už máš skúsenosti? (pracovné pozície + vlastné, dopísané ručne — ostanú pri tejto otázke, nie v „Ešte niečo“) → 7 Aké jazyky ovládaš? → 8 Čo zvládaš na počítači? → 9 Čo o tebe platí? → 10 Ešte niečo, čo vieš? (vlastná zručnosť) |

Spolu **10 otázok** (v4: + záverečná obrazovka; v3: 10 otázok; vo v2 boli zručnosti jedna obrazovka so všetkými ~50 čipmi a miesto jedna obrazovka). Každá otázka ukazuje len svoju skupinu zručností — celú, bez „Ďalšie" — a pri vybraných úroveň.

- Riadok v profile alebo čip na konci feedu otvorí **len svoju časť** (napr. „Kedy máš čas" = 3 kroky).
- Tlačidlo **Doplniť / Doplniť profil** prejde **všetky časti, ktoré chýbajú**, za sebou.
- Posledný krok má **Uložiť**; „← Späť" ide o krok späť, z prvého kroku späť do appky. Nič nie je povinné: na nezodpovedanej otázke je tlačidlo **Preskočiť** namiesto Pokračovať (v3). Vo v3 sa ukladá **po každej otázke**, takže kto odíde v polovici, nestratí nič; vo v2 pri Uložiť alebo „← Späť".
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

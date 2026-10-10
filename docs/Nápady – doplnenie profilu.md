---
tags: [robiq, nápady, študent]
---
# Nápady – doplnenie profilu

← [[00 Mapa systému]] · súvisí: [[Registrácia študenta]], [[Návrhy kandidátov (párovanie)]]

Stav: **návrhy na rozhodnutie** (10. 10. 2026). Dnes „Doplniť profil" otvára pôvodné kroky 2 a 3 registrácie —
stenu ~50 zručností a kalendár. Funguje to, ale je to formulár, nie zážitok. Tu sú spôsoby, ako sa dopýtať na
**čo študentovi ide, kedy má čas, kde chce pracovať a aký je** inak. Každý nápad hovorí, čo do profilu naplní.

## 1. Jedna otázka po každom záujme ⭐
Po kliknutí „Mám záujem" vyskočí malá karta s **jednou otázkou k tomu inzerátu**: pri baristovi „Robil/a si už za barom?"
→ *Áno · Nie, ale rád/a sa naučím · Nie*. Pri sklade „Máš vodičák?", pri doučovaní „Z čoho doučuješ?".
- **Plní:** zručnosti s úrovňou (Áno = Dobré, naučím sa = Základy).
- **Prečo:** otázka má zmysel práve teraz („firma sa ťa na to aj tak spýta"), je jedna a dá sa preskočiť. Za 5 záujmov je profil plný bez jediného formulára.
- **Treba:** ku každej zručnosti jednu ľudskú otázku (zoznam v `data.js`) a vybrať ju podľa názvu/popisu inzerátu — rovnako ako to už robí párovanie (prvých 5 písmen).

## 2. Robiq sa učí z feedu ⭐
Každé „Mám záujem" a „Nezaujíma ma" niečo prezrádza: typ práce, víkendy vs. poobedia, mesto. Po 3–4 záujmoch:
**„Vyzerá to, že ťa ťahá gastro cez víkendy v Trnave. Mám si to zapamätať?"** → *Áno · Upraviť*.
- **Plní:** dni/časy (z typov inzerátov), mesto (z miest inzerátov), oblasť zručností.
- **Prečo:** študent nič nevypĺňa, len potvrdí to, čo už urobil. Žiadne AI — obyčajné počítanie typov a miest.
- **Pozor:** z preskočení len opatrne (preskočiť môže aj kvôli platu).

## 3. Týždeň ťahom prsta
Namiesto dní + častí dňa jedna **mriežka Po–Ne × ráno / poobede / večer / noc** — prstom „premaľuje" políčka, kedy môže.
- **Plní:** dni, časy (a z počtu políčok odhad hodín týždenne — posuvník by odpadol).
- **Prečo:** jeden pohyb namiesto troch otázok, vizuálne hneď jasné. Rovnaký nápad používajú rozvrhové appky.

## 4. Mesto na jedno ťuknutie
- Z prvého inzerátu, o ktorý mal záujem: **„Hľadáš v Trnave?"** → *Áno*, alebo
- **„Použiť moju polohu"** — raz, len na výber najbližšieho mesta zo zoznamu; presná poloha sa neukladá.
- **Plní:** mesto (dochádzanie predvolené „do 30 km", zmení sa v profile).
- **Pozor:** pri polohe treba vetu do dokumentu o ochrane údajov (dnes sľubuje „tvoju presnú polohu nezisťujeme" — ostane to pravda, ak sa uloží len mesto).

## 5. Mini kvíz „Aký si brigádnik?"
Päť hravých otázok „toto alebo toto": *s ľuďmi / s vecami · rýchle tempo / pokoj · ráno / noc · stály tím / každý deň niečo nové · rukami / za počítačom*.
Výsledok s menom a ikonkou — napr. **„Eventový nomád"**, **„Tichý organizátor"** — ktorý sa dá zdieľať.
- **Plní:** povahu (nové pole, napr. 5 hodnôt) → dá sa použiť pri radení ponúk (event, sklad, gastro, admin) a firme ako „typ".
- **Prečo:** zábava, ktorú ľudia dobrovoľne dokončia a pošlú kamošom — reklama zadarmo.
- **Pozor:** povaha nesmie slúžiť na vylúčenie z ponuky, len na poradie; firme ukázať len so súhlasom.

## 6. Opíš sa vlastnými slovami
Jedno pole (alebo hlasová správa): *„Som v 2. ročníku, robila som v kaviarni, cez víkendy mám voľno, bývam v Trnave."*
→ Robiq z toho vytiahne zručnosti, čas a mesto a ukáže ich ako čipy na potvrdenie.
- **Plní:** všetko naraz.
- **Pozor:** potrebuje AI. Dokument o ochrane údajov dnes hovorí, že AI nič nespracúva, a sľubuje, že ju **nezapneme potichu** (kap. 9) — pred spustením treba dokument aj poučenie v appke. Ak by AI radila kandidátov, je to podľa AI aktu vysokorizikový systém.

## 7. Odomykanie namiesto percent
Namiesto „Profil máš na 25 %" konkrétny zisk pri každej časti:
**Zručnosti → firmy ťa môžu osloviť · Čas → ponuky, ktoré ti sedia časovo · Mesto → ponuky v okolí a vzdialenosť na kartách.**
- **Plní:** nič nové — je to obal pre ostatné nápady, ktorý vysvetľuje, *prečo* to vyplniť.

## Odporúčanie
Začať **1 + 2 + 4**: zručnosti sa naplnia otázkami pri záujmoch, čas a mesto sa odvodia z feedu a potvrdia jedným ťuknutím.
Študent tak profil doplní bez formulára a karta „Doplniť profil" bude len záloha. **3** (mriežka) ako náhrada kroku 3 pre tých, čo chcú vyplniť ručne.
**5** je pekný marketingový doplnok na neskôr; **6** až keď budeme pripravení na AI aj po právnej stránke.

## Ďalšie, čo by pomohlo
- **Pripomienka mimo appky** — push / e-mail deň po registrácii („Firma XY hľadá baristu v Trnave — doplň si zručnosti, nech ťa nájde"). Dnes posielame len upozornenia na zhodu a správu; toto by potrebovalo naplánovanú úlohu v Supabase. Pozor na súhlas: je to skôr marketingová správa než servisná.
- **Hodiny bez predvolenej hodnoty** — databáza nového študenta zapíše „10 h / týždeň", hoci to nezadal. Appka to dnes len skrýva; čistejšie je dovoliť v stĺpci „neuvedené" (migrácia).

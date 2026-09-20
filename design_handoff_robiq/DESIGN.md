# Robiq — design systém

Platforma na párovanie študentov a firiem pre brigády. Jeden Design Component: `Robiq MVP.dc.html`.

## Farby

| Rola | HEX |
|---|---|
| Pozadie aplikácie | `#F7F6FB` |
| Pozadie prihlásenia | `#F0EFF5` |
| Tmavý panel — stred | `#1C1540` |
| Tmavý panel — 55 % | `#120D2B` |
| Tmavý panel — okraj | `#08050F` |
| Primárna fialová | `#40319F` |
| Hover / logo bodka | `#5546C4` |
| Svetlá fialová | `#7C6CE0` |
| Žiara | `#9F8FF2`, `#CBC0FF`, `#F0ECFF` |
| Text hlavný | `#000000` |
| Text sekundárny | `#3F3A55` |
| Orámovanie kariet | `#CEC6E4` |
| Orámovanie inputov | `#DEDBEC` |
| Deštruktívna akcia | `#DC2626` |

Žiadna ružová, žltá ani iná farba mimo tejto škály.

Priehľadné odtiene v opakovanom použití: `rgba(36,27,69,.05)` výplň inputu, `rgba(85,70,196,.06)` aktívny chip, `rgba(124,108,224,.16)` ikonový podklad, `rgba(23,18,46,.5)` overlay modálu.

## Typografia

- Všetok text: **Satoshi** (cdnfonts), základná váha 500, nadpisy a tlačidlá 700.
- Logo výhradne **Open Sauce One** Bold: `Robiq` + fialová bodka `#5546C4`.
- Nadpis sekcie 24 px / 700, s druhým slovom v `<b>`.
- Popis pod nadpisom 13–13,5 px, `#3F3A55`.
- Nadlinka (eyebrow) 11 px, `letter-spacing:.14em`, uppercase, `#40319F`.

## Tvary a tiene

- Karta: `border-radius:22–24px`, biela, `1px solid #CEC6E4`, tieň `0 12px 34px -12px rgba(48,36,110,.24)`.
- Input a tlačidlo: `border-radius:12px`, padding `13px 16px`.
- Chip / pill: `border-radius:99px`, padding `9px 16px`.
- Modál: overlay `rgba(23,18,46,.5)` + `backdrop-filter:blur(7px)`.

## Komponenty

**Primárne tlačidlo** — `#40319F`, biely text, 700, hover `#5546C4`.
**Sekundárne tlačidlo** — priehľadné, `1px solid #DEDBEC`, čierny text.
**Textový odkaz** — `#40319F` 700, hover `#5546C4`.
**Input** — výplň `rgba(36,27,69,.05)`, focus mení orámovanie na `#40319F`.
**Krokovač** — tri prúžky 26 × 4 px, aktívny `#40319F`, neaktívny svetlý.
**Karta ponuky** — biela karta, `⋯` menu vpravo hore (Nahlásiť / Zablokovať, vlastné inzeráty Duplikovať / Zmazať s potvrdením).

## Pozadie prihlásenia

Tmavý panel s odsadením 22 px a rohmi 34 px, radiálny gradient `#1C1540 → #120D2B → #08050F`. Dve bodkované sféry 900 × 900 px zarezané za ľavý a pravý okraj (canvas), dva tenké obrysové kruhy 760 × 820 px pri 10 % priehľadnosti, zvislá svetlá žiara v strede s rozmazaním 16 px. Všetko sa pomaly vznáša (16–18 s slučky). Detailný postup pre Canvu: `BACKGROUND-canva.md`.

## Obrazovky

Prihlásenie · Onboarding študenta (3 kroky) · Výber typu účtu · Firemná registrácia (3 kroky) · Objavuj · Zhody · Profil študenta · Brigádnici · Správy firmy · Ponuky firmy · Nová ponuka · Firemný profil · modály Detail ponuky, Prihlásenie potrebné, Zmazať inzerát.

## Vzory správania

- **Guest-first.** Feed je viditeľný bez prihlásenia; login sa vyžiada až pri akcii „Mám záujem".
- Neprihlásení študenti vidia prvé meno a rozmazanú profilovku, žiadne súkromné údaje.
- Neprihlásené firmy nevidia profily kandidátov, len výzvu na prihlásenie.
- Horná lišta sa skrýva pri scrollovaní nadol.
- Nová firma vidí prázdny stav, nie demo dáta.
- Odhlásenie vracia čistý guest pohľad.

## Responzívnosť

Breakpointy 960 px (mriežka kariet na 2 stĺpce) a 640 px (jeden stĺpec, chat sa skladá pod seba, dock sa zužuje). Cielené cez `data-mq` atribúty.

## Jazyk

Slovenčina, tykanie študentom, vykanie firmám. Vecné, krátke vety, žiadne emoji.

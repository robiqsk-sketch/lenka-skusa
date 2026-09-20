# Robiq — pozadie (návod pre Canvu)

Tmavý panel s dvomi bodkovanými sférami zľava a sprava a svetlou žiarou v strede.

## Farby

| Prvok | HEX |
|---|---|
| Stránka okolo panelu | `#F0EFF5` |
| Panel — stred | `#1C1540` |
| Panel — 55 % | `#120D2B` |
| Panel — okraj | `#08050F` |
| Bodky sfér / žiara | `#9F8FF2`, `#CBC0FF`, `#F0ECFF` |
| Primárna fialová | `#40319F` (hover `#5546C4`) |

## Postup v Canve

1. **Podklad** — obdĺžnik na celé plátno, výplň `#F0EFF5`.
2. **Panel** — obdĺžnik s odsadením ~22 px od okrajov, rohy 34 px. Radiálny gradient zo stredu: `#1C1540` → `#120D2B` → `#08050F`.
3. **Sféry** — dva kruhy ~900 × 900 px, jeden vľavo a jeden vpravo, oba zarezané za okraj panelu (viditeľná je len vnútorná ~20 % časť). Výplň: bodkovaná textúra (Elements → „dot sphere" / „particle sphere"), farba `#9F8FF2`, priehľadnosť 60–70 %, k okraju stmavuje do stratena.
4. **Obrysové kruhy** — dva tenké kruhy 760 × 820 px, obrys 2 px, `#9F8FF2` pri 10 % priehľadnosti, rozmazanie 2 px.
5. **Stredová žiara** — zvislý ovál ~100 px široký, výška 120 % panelu, výplň `#F0ECFF`, rozmazanie 16 px, priehľadnosť ~70 %.
6. Obsah (logo, karta) sa kladie nad panel v bielej karte s rohmi 24 px.

Logo vždy **Open Sauce One Bold**: Robiq + fialová bodka `#5546C4`. Ostatný text **Satoshi**.

## Odporúčané rozmery

- Instagram post 1080 × 1080
- Prezentácia / obal 1920 × 1080
- Story 1080 × 1920 (sféry posuň hore a dole namiesto do strán)

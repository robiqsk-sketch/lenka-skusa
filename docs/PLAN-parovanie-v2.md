# Plán: párovanie v2 + miesto

Stav: **návrh na schválenie** (20. 9. 2026). V kóde zatiaľ nič nezmenené.

Otvorené otázky pred štartom:
1. Dochádzanie — stačia 3 stupne (*moje mesto / do 30 km / celé Slovensko*), alebo aj „do 15 km"?
2. Mesto študenta **povinné** pri registrácii, alebo **voliteľné** s prúžkom „doplň si mesto"?
3. Súhlas so zrušením bodov „Remote pre všetkých" a s bránou miesta pre ne-remote inzeráty?

---

## 1. Miesto (nové dáta)

Pri brigádach je miesto najdôležitejší filter; dnes ho nemáme ani od študenta, ani od firmy.

| Kde | Nové pole | Ako sa zadáva |
|---|---|---|
| **Študent** | `city_id` + `commute` (`city` = len moje mesto · `30km` · `any` = celé Slovensko) | onboarding krok 3 (Dostupnosť), sekcia **„Kde môžeš pracovať?"**: mesto s našepkávaním z pevného zoznamu + 3 prepínače. Voliteľné; bez mesta sa nenavrhne na lokálne brigády. Upraviteľné v profile. |
| **Inzerát** | `city_id` + `remote` (bool) | Nový inzerát: pole **„Miesto výkonu"** (našepkávanie); typ „Remote" → prepínač *Na diaľku*; pri remote sa mesto nevyžaduje. |
| **Firma** | `city_id` (sídlo) | firemný profil; predvyplní nový inzerát |

**Tabuľka `cities`** (id, name, district, region, lat, lng) — ~140 SK miest a väčších obcí. Vzdialenosť sa počíta z GPS (haversine) v databáze — bez externej služby, bez posielania údajov tretej strane.

**Zobrazenie:** karta inzerátu ukáže mesto pri firme (*Kaviareň Test · Bratislava*, ako v prototype). Firma v anonymných návrhoch vidí len *Bratislava* alebo *do 30 km od Trnavy*.

## 2. Algoritmus v2

Skóre 0–100; navrhnú sa kandidáti s ≥ 30, max 12, zostupne. Miesto je **brána**, ostatné body s váhami.

### Brány (vypadnú úplne)
- inzerát „Len 18+" a študent < 18 alebo bez dátumu narodenia *(už je)*
- inzerát **nie je remote** a študent nesplní vzdialenosť: rovnaké mesto · ≤ 30 km ak má `30km` · čokoľvek ak `any`; študent bez mesta prejde len na remote

### Body (max 100)

| Kritérium | Body | Oproti dnes |
|---|---|---|
| **Zručnosti** — zhoda so slovami v inzeráte (názov + AI poznámka + popis) | až **45**: 1. zhoda 25, 2. 12, 3. 8; **× úroveň** (Základy 0,7 · Dobré 1 · Top 1,2; jazyky A1–A2 0,7 · B1–B2 1 · C1–C2 1,2) | dnes 30+30, bez úrovne |
| **Odvetvie firmy → skupina zručností** | **15**, ak má študent aspoň jednu zručnosť z mapy odvetvia | nové |
| **Dostupnosť** — typ brigády vs. dni/časy | až **25**: Víkendy↔So/Ne 12 · Poobede 8 · Večery 8 · Flexibilné↔≥ 4 dni 8 (strop 25) | dnes 15/15/15/10 bez stropu |
| **Miesto** | **10** rovnaké mesto · 5 do 30 km · 5 remote | nové |
| **Hodiny** | **5**, ak ≥ 10 h/týždeň | nové |
| **Čerstvosť profilu** (`updated_at`) | do 30 dní 5 · do 90 dní 2 · staršie 0 | nové |
| Vyplnený profil | zrušiť (dnes 5) | — |

Mapa odvetví: Gastro → Barista, Čašník / Servírka, Kuchyňa, Pokladňa · Retail → Predaj, Pokladňa · Sklad a logistika → Sklad, Vodičák B, Fyzická kondícia · Eventy → Eventy, Hostesing, Promo akcie · IT a dizajn → skupina Digitálne zručnosti · Doučovanie → Doučovanie + Jazyky · Administratíva → Administratíva, Excel · Manuálna práca → Fyzická kondícia, Upratovanie, Kuchyňa.

**Slovná zhoda:** bez diakritiky, malé písmená, porovnanie kmeňa (prvých 5 znakov: „barist" nájde „baristu", „baristov"). Nie AI.

**Poradie pri rovnakom skóre:** čerstvosť profilu, potom náhodne.

## 3. UI

- Onboarding študenta krok 3: „Kde môžeš pracovať?" (mesto + dochádzanie); zhrnutie doplní *· Bratislava, do 30 km*.
- Profil študenta: mesto v hlavičke, upraviteľné.
- Nový inzerát: Miesto výkonu + prepínač Na diaľku; validácia: bez mesta len ak remote.
- Karta inzerátu / detail: mesto pri firme.
- Návrhy kandidátov: riadok s miestom / vzdialenosťou.
- Firemný profil: mesto sídla.

## 4. Databáza a migrácia

1. `cities` (naplniť zoznamom SK miest)
2. `students.city_id`, `students.commute`, `postings.city_id`, `postings.remote`, `companies.city_id`
3. `suggest_candidates` v2 + `distance_km(city_a, city_b)`
4. RLS: `cities` verejne čitateľná; `candidate_profiles` a `suggest_candidates` vrátia mesto/dochádzanie
5. Existujúci používatelia bez mesta: jednorazový prúžok v Objavuj *„Doplň si mesto, aby ťa firmy našli"*; kým nemajú mesto, navrhnú sa len na remote. Existujúce inzeráty bez mesta: brána miesta sa neaplikuje (dočasne).

## 5. Ochrana údajov

Doplniť: mesto (§3.1, §3.2), ochotu dochádzať, že firma v anonymných návrhoch vidí mesto/vzdialenosť, účel „ponuky podľa miesta". Zároveň doplniť odsek o **anonymných návrhoch kandidátov** (§5) — zatiaľ chýba. Aktualizovať `supabase/UDAJE-INVENTAR.md`.

## 6. Mimo plánu

- AI párovanie (embeddingy) — platené API, prenos textov tretej strane, zápis do dokumentu; až s reálnou prevádzkou.
- Presná adresa / GPS študenta — zbytočne citlivé.

## Rozsah

DB + algoritmus ~1 h · UI ~2 h · test + dokumenty ~1 h. Nasadiť naraz.

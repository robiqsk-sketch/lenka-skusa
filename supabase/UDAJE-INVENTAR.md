# Robiq — inventár osobných údajov (podklad pre ochranu osobných údajov)

Tento dokument popisuje **presne**, aké údaje aplikácia Robiq zbiera, kde ich ukladá, kto k nim má prístup a s akými tretími stranami pracuje. Vychádza z databázovej schémy (`schema.sql`) a z kódu aplikácie (`robiq-app/app.js`). Je určený ako vstup pre vypracovanie dokumentu „Ochrana osobných údajov" pre aplikáciu (nie pre waitlist na robiq.sk — ten má vlastný, jednoduchší dokument).

Stav k: 23. 9. 2026.

---

## 1. Kto je kto

- **Prevádzkovateľ:** Robiq (Matej Majtán), kontakt info@robiq.sk, žiadosti support@robiq.sk — rovnako ako pri waitliste.
- **Používatelia:** dve roly
  - **študent / brigádnik** (fyzická osoba hľadajúca krátkodobú prácu),
  - **firma** (zamestnávateľ; registruje ju kontaktná osoba — tiež fyzická osoba).
- **Hosť** (neprihlásený návštevník) — vidí zoznam ponúk, nič sa o ňom neukladá do databázy.

## 2. Kde údaje ležia

| Systém | Čo | Poskytovateľ | Miesto |
|---|---|---|---|
| **Supabase — databáza (PostgreSQL)** | všetky údaje z tabuliek nižšie | Supabase Inc. (sprostredkovateľ) | región **Central EU (Frankfurt, Nemecko)** |
| **Supabase — Auth** | e-mail, heslo (uložené len ako hash, aplikácia ho nikdy nevidí), časy prihlásení, IP adresa pri prihlásení (systémový log Supabase) | Supabase | Frankfurt |
| **Supabase — Storage** | logá firiem (bucket `logos`, **verejné**), fotky „deň v práci" pri inzerátoch (bucket `posting-photos`, **verejné**), profilové fotky brigádnikov (bucket `avatars`, **neverejné**) | Supabase | Frankfurt |
| **Supabase — Realtime** | prenos nových správ a zhôd v reálnom čase (nič sa navyše neukladá) | Supabase | Frankfurt |
| **Prehliadač používateľa — localStorage** | prihlasovací token (session) Supabase, aby človek zostal prihlásený; voľba svetlý/tmavý režim; či už videl upozornenie v chate | — | zariadenie používateľa |
| **Register právnických osôb (api.statistics.sk)** | pri registrácii firmy sa odošle **IČO** na overenie; vráti oficiálny názov a obec | Štatistický úrad SR | SR |
| **Google (OAuth)** | ak sa používateľ prihlási cez Google: Google overí identitu a Supabase dostane e-mail a meno | Google | — |
| **Cloudflare (hosting aplikácie)** | doručenie stránky; IP adresa, hlavičky prehliadača, technické záznamy požiadaviek — žiadne údaje z účtu | Cloudflare, Inc. (sprostredkovateľ) | globálna sieť |
| **jsDelivr CDN** | načítanie knižnice supabase-js (pri načítaní stránky sa odošle IP adresa a hlavičky prehliadača) | jsDelivr (Prospect One) | globálna CDN |
| **cdnfonts.com** | načítanie písiem Satoshi a Open Sauce One (rovnako IP adresa) | CDNFonts | globálna CDN |

Aplikácia **nepoužíva** cookies, reklamné skripty ani sledovanie. Štatistika používania je anonymná (§3.13).

## 3. Údaje podľa tabuliek

### 3.1 Účet (Supabase Auth — `auth.users`)
Vzniká pri registrácii študenta aj firmy.

| Údaj | Odkiaľ | Povinný |
|---|---|---|
| e-mail | registračný formulár | áno |
| heslo (len hash) | registračný formulár | áno |
| metadáta z registrácie (`raw_user_meta_data`) | kópia údajov z onboardingu — rola, meno, zručnosti, hodiny, dni, časy / názov firmy, IČO, odvetvia, kontaktná osoba | áno (technické) |
| čas vytvorenia, posledné prihlásenie | systém | áno |

### 3.2 `profiles` — rola
| Údaj | Popis |
|---|---|
| `id` | ID používateľa (UUID) |
| `role` | `student` alebo `firm` |
| `created_at` | čas vytvorenia |

### 3.3 `students` — profil študenta
| Údaj | Odkiaľ | Povinný | Poznámka |
|---|---|---|---|
| `name` | onboarding krok 1 | áno | meno a priezvisko |
| `skills` | onboarding krok 2 / profil | nie | zoznam zručností s úrovňou (Základy/Dobré/Top), pri jazykoch úroveň A1–C2 a či ním hovorí; **môže obsahovať vlastný text** používateľa („Niečo iné?") |
| `hours` | onboarding krok 3 / profil | nie | koľko hodín týždenne môže pracovať (4 stupne) |
| `avail_days` | onboarding / profil | nie | dni v týždni |
| `avail_times` | onboarding / profil | nie | časy dňa (ráno, poobede, večer, nočné) |
| `birth` | onboarding krok 1 | **áno** | **dátum narodenia** — vek 16+ (kontroluje appka aj DB trigger), inzeráty „Len 18+" sa mladším neukazujú; po nastavení nemenný |
| `city_id`, `commute` | onboarding krok 3 / profil | **áno** (mesto) | mesto z pevného zoznamu `cities` + dochádzanie (city / 15km / 30km / any); vzdialenosť sa počíta v DB medzi mestami, bez GPS používateľa; mesto vidí firma v anonymných návrhoch a po záujme |
| `bio` | profil → Upraviť | nie | voľný text do 240 znakov — **môže obsahovať čokoľvek**, čo človek napíše (škola, záľuby…) |
| `avatar_path` | onboarding krok 1 / profil | nie | **profilová fotka** v neverejnom bucket-e `avatars`; vidí ju študent a firma, o ktorej inzerát študent prejavil záujem (podpísané URL) |
| `updated_at` | systém | | |

### 3.4 `companies` — profil firmy
| Údaj | Odkiaľ | Povinný | Poznámka |
|---|---|---|---|
| `name` | registrácia krok 1 | áno | názov firmy — **verejne viditeľný** (na kartách ponúk aj pre hostí) |
| `ico` | registrácia krok 1 | áno | IČO — overuje sa v Registri právnických osôb |
| `legal_name` | Register právnických osôb | | oficiálny názov firmy — zobrazuje sa v detaile inzerátu |
| `fields` | registrácia krok 2 | áno | odvetvia |
| `contact_name` | registrácia krok 3 | nie | **meno kontaktnej osoby** (fyzická osoba) |
| `description` | firemný profil | nie | voľný text o firme — verejne viditeľný |
| `logo_url` | firemný profil / registrácia | nie | odkaz na logo v Storage — **verejne dostupný súbor** |
| `city_id` | firemný profil | nie | sídlo firmy (mesto) |
| `verified` | systém — `true`, ak IČO existuje v Registri právnických osôb a firma nezanikla; môže nastaviť aj admin | | |

### 3.5 `postings` — inzeráty firmy
| Údaj | Poznámka |
|---|---|
| `title`, `pay`, `need`, `types`, `start`, `description` | obsah inzerátu — **verejný** (vidí ho aj hosť) |
| `city_id`, `remote`, `address` | miesto výkonu (mesto, na diaľku, adresa prevádzky) — **verejné** |
| `photos` | fotky „deň v práci" (max. 3) — **verejné** súbory; môžu na nich byť ľudia |
| `taken` | počet obsadených miest — počíta sa automaticky zo zhôd |
| `only18` | či je inzerát len pre 18+ |
| `ai_note` | voľný text firmy „Povedzte AI, koho hľadáte" — **môže obsahovať požiadavky na osobu** (napr. jazyk, skúsenosti); vidí ho len firma; zatiaľ sa nespracúva žiadnou AI |
| `active`, `blocked`, `block_reason`, `created_at` | stav; `blocked` = pozastavené Robiqom (admin) s dôvodom |
| `views` | počet otvorení detailu (bez údajov o tom, kto ho otvoril) |

### 3.6 `interests` — „Mám záujem" (študent → inzerát)
Kto (študent), o čo (inzerát), kedy. **Vidí študent (svoje) a firma, ktorej inzerát to je.**
Toto je moment, keď firma **získa prístup k profilu študenta** (meno, zručnosti, hodiny — pozri §4).

### 3.7 `skips` — „Preskočiť"
Kto, ktorý inzerát preskočil, kedy. Vidí len študent. Slúži len na to, aby sa karta znovu nezobrazovala.

### 3.8 `company_interests` — „Prejaviť záujem" (firma → študent)
Firma, študent, inzerát, kedy. Vidí firma (svoje) a študent (kto o neho prejavil záujem).

### 3.9 `matches` — zhody
Vznikne automaticky (databázový trigger), keď existuje záujem z oboch strán. Obsahuje inzerát, študenta, firmu, čas. Vidia obe strany zhody.

### 3.10 `messages` — správy v chate
| Údaj | Poznámka |
|---|---|
| `body` | **text správy** — voľný text, môže obsahovať čokoľvek (telefón, adresu, dohodu o termíne…) |
| `sender_id`, `match_id`, `created_at` | kto, v ktorej zhode, kedy |

Vidia len obe strany danej zhody. Prevádzkovateľ má k správam technický prístup ako správca databázy.

### 3.11 `blocks` — zablokovanie
Kto (študent alebo firma) koho zablokoval a kedy. Študent si tak skryje firmu, firma brigádnika. Vidí a ruší ho len ten, kto blokoval; druhá strana sa o tom nedozvie.

### 3.12 `reports` — nahlásenia (DSA čl. 16)
Kto nahlásil (ID používateľa, pri hosťovi nič), čo (inzerát / firmu / brigádnika), dôvod, **voľný text poznámky** (do 1000 znakov), stav a poznámka admina. Vidí len admin.

### 3.13 `events` — štatistika používania
Len názov udalosti (napr. návšteva, otvorenie detailu, krok registrácie), rola (hosť/študent/firma), malé doplnkové údaje (napr. dôvod neúspešnej registrácie) a čas. **Žiadne ID používateľa, relácie, IP ani cookies.** Vidí len admin.

### 3.14 `admins`
E-maily správcov, ktorí vidia štatistiku a nahlásenia.

## 4. Kto čo vidí (podľa RLS politík v schéme)

| Údaj | Hosť | Študent | Firma | Prevádzkovateľ |
|---|---|---|---|---|
| inzeráty (aktívne) + názov, popis a logo firmy | **áno** | áno | áno | áno |
| profil študenta (meno, zručnosti, hodiny, mesto, fotka) | nie | len svoj | **len študentov, ktorí dali záujem o jej inzerát** | áno |
| anonymný návrh študenta (zručnosti, hodiny, dostupnosť, mesto/vzdialenosť, skóre — **bez mena a fotky**) | nie | — | pre svoje inzeráty | áno |
| dátum narodenia, bio študenta | nie | len svoj | **nie** (funkcia `candidate_profiles` ich nevracia) | áno |
| IČO, kontaktná osoba firmy | nie | nie | len svoja | áno |
| záujmy študenta | nie | svoje | len na svoje inzeráty | áno |
| správy | nie | len vo svojich zhodách | len vo svojich zhodách | áno (technicky) |
| e-mail, heslo | nie | — | — | e-mail áno, heslo nikdy (hash) |

## 5. Účely spracúvania (na čo sa údaje používajú)

1. **Vedenie účtu a prihlásenie** — e-mail, heslo.
2. **Sprostredkovanie brigád** — profil študenta a inzeráty firmy sa navzájom zobrazujú, aby sa mohli spojiť (jadro služby).
3. **Vekové obmedzenie** — dátum narodenia sa používa len na to, aby sa inzeráty „Len 18+" neukázali mladším.
4. **Komunikácia medzi študentom a firmou** — chat po zhode.
5. **Štatistiky firme** — počet záujmov a zhôd na inzerát (agregované, bez mien navyše).

Zatiaľ **nie**: marketing, newsletter (ten rieši waitlist), profilovanie, automatizované rozhodovanie, AI spracovanie (pole `ai_note` sa len ukladá).

## 6. Na čo upozorniť pri písaní dokumentu

- **Vek:** aplikácia je pre študentov, môžu sa registrovať aj **osoby mladšie ako 18** (inzeráty pre nich filtruje pole `only18`). Dátum narodenia je pri registrácii **povinný** a registrácia mladších ako **16 rokov** sa nepustí (appka aj databáza).
- **Voľné texty** (`bio`, `skills` vlastné položky, `ai_note`, `messages.body`) môžu obsahovať citlivé údaje, ak ich tam človek sám napíše. Dokument by mal používateľov upozorniť, aby do nich nepísali citlivé informácie, a určiť, ako sa s nimi zaobchádza.
- **Verejné údaje firmy:** názov, popis a logo firmy sú verejné bez prihlásenia. Meno kontaktnej osoby verejné nie je.
- **Prístup firmy k profilu študenta** je podmienený tým, že študent sám klikol „Mám záujem" na jej inzerát — to je vhodný právny základ (plnenie zmluvy / oprávnený záujem) a dá sa to v dokumente jasne opísať.
- **Bio a dátum narodenia firma nevidí** — technicky zaručené: firma číta kandidátov len cez funkciu `candidate_profiles` (meno, zručnosti, hodiny, fotka, mesto), priamo k tabuľke `students` prístup nemá.
- **Uchovávanie a zmazanie účtu:** schéma nemá automatické mazanie podľa času. Používateľ si **môže účet zmazať sám** (menu účtu → Zmazať účet, s potvrdením) — zmaže sa účet, profil, inzeráty, záujmy, zhody, správy, zablokovania, profilová fotka, logo aj fotky inzerátov firmy. Nahlásenia, ktoré človek podal, zostanú bez väzby na neho (`reporter_id` sa vynuluje). Nič sa neuchováva po zmazaní okrem systémových logov poskytovateľa.
- **Export údajov (prenosnosť):** nie je v aplikácii; riešiť na žiadosť.
- **Tretie strany mimo EÚ:** jsDelivr a cdnfonts sú globálne CDN — pri načítaní stránky im prehliadač odošle IP adresu. Ak to má byť čisto EÚ, dá sa knižnica aj písma hostovať priamo v aplikácii (jednoduchá úprava).
- **Bezpečnosť:** prístup k dátam riadia RLS politiky v databáze (každý riadok má pravidlo, kto ho smie čítať/meniť); heslá hashuje Supabase Auth; prenos je cez HTTPS; verejný `anon` kľúč v kóde je určený na tento účel a sám o sebe prístup k údajom nedáva.

## 7. Čo aplikácia NEZBIERA

Telefónne číslo študenta ani firmy (pole neexistuje), adresu študenta, presnú polohu (GPS) — len mesto z pevného zoznamu, platobné údaje, údaje zo sociálnych sietí, cookies, analytiku správania, údaje o zariadení nad rámec bežných HTTP logov poskytovateľa.

---

## Príloha: prompt pre AI

> Na základe priloženého inventára údajov (UDAJE-INVENTAR.md) a databázovej schémy (schema.sql) napíš dokument „Ochrana osobných údajov" pre webovú aplikáciu Robiq v slovenčine, v súlade s GDPR a zákonom č. 18/2018 Z. z. Prevádzkovateľ: Matej Majtán, support@robiq.sk. Dokument má mať sekcie: kto spracúva údaje; aké údaje zbierame (rozdelené pre študentov a firmy, vrátane voľných textov a správ); účely a právne základy pre každý účel; komu údaje odovzdávame (Supabase — Frankfurt, EÚ, jsDelivr, CDNFonts) a prenosy mimo EÚ; kto vidí čo (firma vidí profil študenta až po jeho záujme, nikdy dátum narodenia ani bio); ako dlho údaje uchovávame a ako si používateľ zmaže účet sám v aplikácii; práva používateľa a ako ich uplatniť; vekové obmedzenie (mladší ako 16 rokov — súhlas zákonného zástupcu); bezpečnosť; kontakt. Študentom tykaj, firmám vykaj. Krátke vecné vety, bez emoji. Pri veciach, ktoré aplikácia zatiaľ nerieši automaticky (export údajov), uveď, že sa riešia na žiadosť e-mailom.

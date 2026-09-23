---
tags: [robiq, obrazovky, firma]
---
# Obrazovky firmy

← [[00 Mapa systému]] · kód: `app.js` → `brig`, `suggCard`, `candCard`, `fspravy`, `ponuky`, `nova`, `fprofil`

Firma má v docku štyri záložky: **Ponuka · Správy · Inzeráty · Profil** (`FIRM_TABS` v `data.js`).
Nový inzerát je samostatný pohľad (`ftab = 9`).

## Ponuka brigádnikov (`brig`)
Zoskupené podľa aktívnych inzerátov:
- **Kandidáti** — študenti, ktorí dali „Mám záujem": meno, fotka, hodiny, mesto, zručnosti → **♥ Prejaviť záujem** (= zhoda). Menu: nahlásiť, zablokovať (zmizne z kandidátov aj z návrhov; uloží sa do `blocks`).
- **✦ Navrhovaní kandidáti** — anonymné návrhy (bez mena a fotky) so skóre zhody → **✦ Osloviť**. → [[Návrhy kandidátov (párovanie)]]

## Správy (`fspravy`)
Chat so zhodami (rovnaký ako u študenta). → [[Záujem, zhoda a chat]]

## Inzeráty (`ponuky`)
- Súhrn: aktívne inzeráty, zobrazenia, záujmy, zhody.
- Riadok inzerátu: zobrazenia, záujmy, zhody, obsadené; zapnúť/pozastaviť; menu ⋯ (fotky „deň v práci", duplikovať — skopíruje aj miesto a fotky, zmazať).
- Inzerát **pozastavený Robiqom** má značku a dôvod; firma ho nevie zapnúť. → [[Nahlásenia a moderovanie]]

## Nový inzerát (`nova`)
Názov pozície · hodinová sadzba · počet ľudí · **miesto** (mesto zo zoznamu, alebo „Na diaľku") + adresa · vek kandidátov (všetci / len 18+) ·
typ brigády · popis práce · **✦ Koho hľadáte** (text pre párovanie — zručnosti, nie vek/pohlavie/zdravie) · fotky (max. 3).
Po zverejnení appka prepne na Ponuku a ukáže, koľko kandidátov sedí.

## Firemný profil (`fprofil`)
Oficiálny názov (z registra, needitovateľný) · zobrazovaný názov · sídlo (predvyplní miesto v novom inzeráte) ·
IČO s overením („Overiť znova") · popis firmy · logo. → [[Registrácia firmy a overenie IČO]]
Pod profilom **Zablokovaní brigádnici** s tlačidlom „Odblokovať" (ukáže sa, len ak nejakí sú).

Súvisí: [[Obrazovky hosťa a študenta]], [[Admin panel]]

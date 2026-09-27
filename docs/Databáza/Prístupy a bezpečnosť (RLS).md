---
tags: [robiq, databáza, bezpečnosť]
---
# Prístupy a bezpečnosť (RLS)

← [[00 Mapa systému]]

**RLS (Row Level Security)** = pravidlá priamo v databáze, ktoré pri každom riadku rozhodnú, či ho prihlásený
používateľ smie čítať alebo meniť. Keďže appka nemá vlastný server, **toto je hlavná ochrana dát**.

## Kto čo vidí

| Údaj | Hosť | Študent | Firma | Admin |
|---|---|---|---|---|
| aktívne inzeráty + názov, popis, logo firmy | ✓ | ✓ | ✓ | ✓ |
| profil študenta (meno, zručnosti, hodiny, mesto, fotka) | – | svoj | **len ak dal záujem o jej inzerát** | cez admin funkcie |
| anonymný návrh študenta (zručnosti, dostupnosť, skóre — bez mena) | – | – | pre svoje inzeráty | – |
| dátum narodenia, bio študenta | – | svoj | **nikdy** | – |
| IČO, kontaktná osoba firmy | – | – | svoje | ✓ |
| správy | – | vo svojich zhodách | vo svojich zhodách | – |
| zablokovania | – | svoje | svoje | – |
| štatistika, nahlásenia | – | – | – | ✓ |

## Kľúčové pravidlá
- **Firma nemá priamy prístup k tabuľke `students`.** Kandidátov číta len cez funkciu `candidate_profiles`, ktorá vráti meno, zručnosti, hodiny, fotku a mesto — a len tých, čo dali záujem o jej inzerát (`is_my_candidate`).
- **Zhodu nevie vytvoriť klient**, len trigger v databáze → nikto si nemôže „vyrobiť" chat.
- **Pozastavený inzerát** (`active = false` alebo `blocked`) vidí stále firma a študent, ktorý o neho dal záujem.
- **Správu** môže poslať len účastník zhody a len pod vlastným menom.
- Pomocné funkcie `owns_posting`, `has_interest`, `is_my_candidate`, `is_match_party` bežia ako `security definer`, aby sa pravidlá neodkazovali navzájom do kruhu.
- Funkcie len pre prihlásených majú výslovne odobraté právo pre `anon` (Supabase ho inak dáva automaticky).
- **Interné funkcie triggerov** (`handle_new_user`, `on_interest`, `try_match`, `sync_taken`) sa nedajú zavolať zvonka vôbec — spúšťa ich len databáza. Overené: zhoda pri obojstrannom záujme vzniká ďalej, priame volanie je zamietnuté.
- Pravidlá používajú `(select auth.uid())` namiesto `auth.uid()` — databáza zistí prihláseného raz za dotaz, nie pre každý riadok (rýchlejšie pri väčšom počte dát; kto čo vidí, sa tým nemení).
- **Ochrana pred uniknutými heslami** (kontrola cez HaveIBeenPwned) sa zapína v Supabase → Authentication → Settings — treba ju zapnúť ručne.

## Admin
Admin = e-mail v tabuľke `admins`. Každá admin funkcia si to overí (`is_admin` / `assert_admin`). → [[Admin panel]]

Súvisí: [[Dátový model]], [[Databázové funkcie]]

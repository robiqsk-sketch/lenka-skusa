---
tags: [robiq, tok, upozornenia]
---
# Upozornenia (push a e-mail)

← [[00 Mapa systému]] · kód: `app.js` → sekcia *Push notifications*, `sw.js`, `supabase/functions/notify`

Keď vznikne **zhoda** alebo príde **nová správa**, druhá strana dostane upozornenie na telefón — aj keď appku nemá otvorenú.

## Ako to prebieha
```mermaid
sequenceDiagram
  participant A as Appka odosielateľa
  participant F as Funkcia notify (Supabase)
  participant DB as Databáza
  participant P as Apple / Google push
  participant B as Telefón príjemcu
  A->>DB: pošle správu / svojím záujmom vytvorí zhodu
  A->>F: „oznám správu / zhodu č. X"
  F->>DB: overí, že volajúci je účastník a záznam je čerstvý; „zaberie" ho (notified_at)
  F->>DB: nájde zariadenia príjemcu (push_subscriptions)
  F->>P: zašifrované upozornenie
  P->>B: zobrazí ho (sw.js); ťuknutie otvorí Robiq v Správach
```

## Zapnutie
- Prihlásený vidí nad ponukami / kandidátmi prúžok **„Nezmeškaj zhodu ani správu"** s tlačidlom **Zapnúť** (dá sa zavrieť ✕ — pamätá si to zariadenie).
- Alebo **menu účtu → prepínač Upozornenia**
- Prehliadač sa spýta na povolenie; zariadenie sa uloží k prihlásenému účtu (`save_push_subscription`).
- **iPhone:** funguje len v appke pridanej na plochu (iOS 16.4+). V Safari prúžok radí pridať Robiq na plochu.

## Pravidlá
- Upozornenie pošle len **účastník** zhody a len na **čerstvý** záznam (do 5 minút) — a každú správu / zhodu **najviac raz** (`notified_at`).
- Príjemca vidí meno druhej strany, pozíciu a začiatok správy (max. 140 znakov). Obsah je šifrovaný — Apple / Google ho neprečítajú.
- **Odhlásenie** zariadenie odpojí (na zdieľanom telefóne neprídu upozornenia predošlého účtu). Nové prihlásenie si zariadenie „prevezme".
- Zariadenie, ktoré push služba označí za neplatné (404 / 410), sa samo zmaže.
- Kľúče: verejný VAPID je v `config.js`, súkromný v **Supabase Vault** (`vapid_private`), číta ho len server (`notify_secret`).

## E-mail (zapnutý 27. 9. 2026)
Funkcia `notify` posiela aj e-mail cez **Brevo** (zadarmo 300 e-mailov denne) — pri zhode vždy, pri správe len ak príjemca nemá push. Kľúč `brevo_api_key` je v trezore.
Kto e-maily nechce, vypne ich v **menu účtu → prepínač E-maily** (`profiles.email_notify`, mení sa cez `set_email_notify`; platí pre účet na všetkých zariadeniach). Predvolene sú zapnuté.
V Brevo je **vypnuté blokovanie IP** (Security → Authorised IPs) — funkcia beží na serveroch Supabase s meniacimi sa adresami, s blokovaním by ju Brevo odmietalo (401 „unrecognised IP address").
Ako to bolo nastavené:
Treba: účet v Brevo, overený odosielateľ / doména **robiq.sk** (odosielateľ `ahoj@robiq.sk` — ten istý, overený, ako pri prihlasovacích e-mailoch; tie idú cez SMTP v Supabase Auth a táto funkcia sa ich netýka), API kľúč (SMTP & API → API Keys), potom
`select vault.create_secret('<kľúč>', 'brevo_api_key');` v Supabase → SQL Editor. Pred zapnutím doplniť e-mail do dokumentu o ochrane údajov (Brevo ako sprostredkovateľ — firma z Francúzska, dáta v EÚ).

Súvisí: [[Záujem, zhoda a chat]], [[Prístupy a bezpečnosť (RLS)]]

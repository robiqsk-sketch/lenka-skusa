---
tags: [robiq, obrazovky, chyby]
---
# Chybové stránky

← [[00 Mapa systému]] · súbory: `robiq-app/index.html` (obrazovka „Niečo sa pokazilo"), `robiq-app/404.html`

Dve stránky pre prípad, že niečo nejde. Obe sú krátke — logo, ikona, nadpis, jedna veta a jedno tlačidlo.

## „Niečo sa pokazilo" (appka sa nevie spustiť)
Ukáže sa namiesto appky, keď sa appka **vôbec nespustí**:
- nenačíta sa niektorý skript (napr. knižnica Supabase z CDN),
- pri štarte nastane chyba v kóde,
- pri štarte sa nedá spojiť so serverom (Supabase nedostupný, výpadok internetu).

Text podľa príčiny:
- **zariadenie je offline** → „Si offline — skontroluj pripojenie na internet a skús to znova." (nie je to naša chyba),
- **inak** → „Niečo sa pokazilo — Už pracujeme na tom, aby to čo najskôr fungovalo."

Tlačidlo **Skúsiť znova** obnoví stránku.

### E-mail adminom
Každý pád (okrem offline) appka nahlási funkcii **crash-report** v Supabase (`supabase/functions/crash-report`). Tá ho uloží do tabuľky `crash_reports` a pošle e-mail všetkým z tabuľky `admins` cez Brevo (rovnaký kľúč a odosielateľ `ahoj@robiq.sk` ako pri [[Upozornenia|upozorneniach]]).
- Predmet **„Robiq spadol"**, v texte: kedy to spadlo, **príčina** (nenačítal sa skript / server nedostupný / chyba v kóde) a **čo ďalej** (2 kroky podľa príčiny).
- **Najviac jeden e-mail za 30 minút** — keď spadne stovkám ľudí naraz, príde jeden e-mail a ďalší povie, koľko pádov medzitým bolo.
- Záznamy sa držia 30 dní; najviac 200 za hodinu (ochrana proti zahlteniu).
- Obmedzenie: keď nejde celé Supabase, hlásenie sa nemá kam poslať a e-mail nepríde — vtedy pomôže https://status.supabase.com.

Prečo len pri štarte: keď appka raz nabehne, chyby počas používania (napr. neodoslaná správa) ukazuje ako krátku bublinu dole a appka ide ďalej — celá obrazovka by používateľa zbytočne vyhodila z toho, čo robil. Chyby, ktoré nie sú výpadkom spojenia (napr. vypršané prihlásenie), sa pri štarte ukážu tiež len ako bublina.

Nenačítané obrázky a písma (napr. nedostupné fonty) appku nezhodia — za pád sa považuje len skript.

## „Táto stránka neexistuje" (404)
Cloudflare ju ukáže pri každej adrese, ktorá neexistuje (starý alebo preklepnutý odkaz) — nastavené v `wrangler.jsonc` (`not_found_handling`). Tlačidlo **Späť na Robiq** vedie na úvod. Rešpektuje svetlý / tmavý režim a vyhľadávače ju neindexujú.

Súvisí: [[Architektúra]], [[Obrazovky hosťa a študenta]]

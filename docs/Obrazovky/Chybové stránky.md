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

Tlačidlo **Skúsiť znova** obnoví stránku.

Prečo len pri štarte: keď appka raz nabehne, chyby počas používania (napr. neodoslaná správa) ukazuje ako krátku bublinu dole a appka ide ďalej — celá obrazovka by používateľa zbytočne vyhodila z toho, čo robil. Chyby, ktoré nie sú výpadkom spojenia (napr. vypršané prihlásenie), sa pri štarte ukážu tiež len ako bublina.

Nenačítané obrázky a písma (napr. nedostupné fonty) appku nezhodia — za pád sa považuje len skript.

## „Táto stránka neexistuje" (404)
Cloudflare ju ukáže pri každej adrese, ktorá neexistuje (starý alebo preklepnutý odkaz) — nastavené v `wrangler.jsonc` (`not_found_handling`). Tlačidlo **Späť na Robiq** vedie na úvod. Rešpektuje svetlý / tmavý režim a vyhľadávače ju neindexujú.

Súvisí: [[Architektúra]], [[Obrazovky hosťa a študenta]]

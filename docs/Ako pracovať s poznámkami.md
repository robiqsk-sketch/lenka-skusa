---
tags: [robiq, návod]
---
# Ako pracovať s poznámkami

← [[00 Mapa systému]]

## Otvorenie v Obsidiane
1. Stiahni si repozitár `robiqsk-sketch/lenka-skusa` (napr. cez **GitHub Desktop** → *Clone repository*).
2. V Obsidiane: **Open folder as vault** → vyber priečinok `docs` v stiahnutom repozitári.
3. Začni na stránke [[00 Mapa systému]].
4. Diagramy (Mermaid) sa v Obsidiane vykreslia samy. Graf prepojení: *Ctrl/Cmd + G*.

## Aktualizácia
- Keď sa poznámky zmenia na GitHube, v GitHub Desktop klikni **Fetch / Pull** — v Obsidiane sa hneď ukážu nové.
- Automaticky: plugin **Obsidian Git** (Settings → Community plugins) vie robiť pull pri otvorení vaultu.

## Pravidlá, aby poznámky nezastarali
- **Poznámka = ako a prečo, nie kód.** Kód sa mení často; popis toku oveľa menej.
- Pri zmene v appke uprav aj poznámku, ktorej sa to týka (Claude to robí spolu so zmenou kódu).
- Nová migrácia → riadok do [[Migrácie – história]].
- Keď niečo nesedí medzi poznámkou a kódom, **platí kód** — a poznámku oprav.

## Konvencie
- Odkazy medzi poznámkami: `[[Názov poznámky]]`.
- Odkazy na kód: cesta v repozitári, napr. `robiq-app/app.js` → funkcia `loadPostings`.
- Každá poznámka má hore odkaz späť na mapu.
- Priečinok `.obsidian/` (nastavenia Obsidianu) sa do gitu neukladá.

---
tags: [robiq, tok, študent, test]
---
# Registrácia rozhovorom s AI (test)

← [[00 Mapa systému]] · kód: `app.js` → `renderAiob`, `aiSend`, `applyAiProfile`, `demoReply` · funkcia `supabase/functions/ai-onboarding`

> [!warning] Testovacia verzia
> Žije len vo vetve `claude/practical-fermi-k5e1jz` (náhľad na Cloudflare), **nie v `main`**. Je to druhý spôsob registrácie študenta popri klasických troch krokoch ([[Registrácia študenta]]) — skúšame, či je rozhovor pre ľudí príjemnejší než formulár.

## Ako to prebieha
Na výbere typu účtu je tretia možnosť **„Hľadám prácu — porozprávam sa s AI"**. Namiesto formulára sa otvorí chat: bot Robiq sa po jednom pýta na meno, dátum narodenia, čo človeku ide a čo robil, koľko hodín a kedy môže pracovať, mesto a ako ďaleko dochádza. Z odpovedí si sám odvodí zručnosti aj s úrovňou (napr. „robila som rok baristku" → Barista, Dobré) a napíše krátke „o mne".

```mermaid
flowchart TD
  P[Výber typu účtu] -->|Porozprávam sa s AI| CH[Chat s botom]
  CH -->|celý rozhovor| F[funkcia ai-onboarding<br/>→ Claude]
  F -->|ďalšia veta + celý profil zatiaľ| CH
  CH --> SUM[„Tvoj profil" pod chatom<br/>priebežne sa dopĺňa]
  SUM -->|meno · 16+ · zručnosť · mesto| FIN[E-mail · heslo · súhlas<br/>„Hotovo — pozri ponuky"]
  FIN --> REG[rovnaká registrácia ako klasická<br/>signUp / Google]
  CH -.->|Radšej vyplním formulár| OB[klasické 3 kroky<br/>predvyplnené tým, čo bot zistil]
```

## Pravidlá
- **Pod chatom je vždy vidno, čo bot pochopil** („Tvoj profil"). Ak niečo nesedí, človek to jednoducho povie v chate a profil sa opraví.
- **Dokončenie** sa ukáže, keď je profil dosť úplný (meno, vek 16+, aspoň jedna zručnosť, mesto) alebo keď bot povie, že má všetko. Ak bot mesto nenašiel presne v zozname, objaví sa pole mesta predvyplnené tým, čo počul — stačí vybrať zo zoznamu.
- **E-mail, heslo a súhlas s podmienkami sa AI nikdy neposielajú** — vypĺňajú sa pod chatom ako obyčajné polia. Bot sa na ne ani nepýta.
- **Vek 16+** stráži appka aj databáza rovnako ako pri klasickej registrácii; mladšiemu bot slušne povie, že to zatiaľ nejde, a dokončenie sa neukáže.
- **„Radšej vyplním formulár"** prepne na klasické kroky a všetko, čo bot zistil, tam už je vyplnené.
- Zručnosti bot berie z rovnakého zoznamu ako formulár (zoznam je skopírovaný vo funkcii — pri zmene `data.js` treba upraviť aj ju). Čo do zoznamu nepatrí, pridá ako vlastnú zručnosť.
- Študent má po registrácii vyplnené aj **„o mne"** (bio) — preto sa pri registrácii posiela aj ono (migrácia `ai-onboarding`).

## Skúšobný režim bez AI
Kým funkcia `ai-onboarding` nie je nasadená alebo nemá kľúč, appka to zistí pri prvej správe a rozhovor prevezme **jednoduchý bot bez AI**. Nad chatom sa vtedy ukáže, že ide o skúšobný režim.
- Kladie rovnaké otázky v pevnom poradí (meno → dátum narodenia → čo ti ide → hodiny → dni a čas → mesto a dochádzanie → pár slov o sebe).
- V odpovediach hľadá kľúčové slová: zručnosti („kaviareň" → Barista, „po anglicky" → Angličtina), čísla, dni („víkendy", „po–pi"), časti dňa a mesto zo zoznamu. Opravy typu „nie, vlastne Košice" nepochopí — na to je „Radšej vyplním formulár".
- Stačí na vyskúšanie celého postupu a vzhľadu. Registrácia na konci je skutočná (vytvorí účet) — na skúšanie použi testovací e-mail.
- Keď je kľúč nastavený, skutočná AI sa použije automaticky pri ďalšom rozhovore. Ak už AI raz odpovedala, na bota sa už neprepína — pri výpadku ukáže chybu.

## Funkcia `ai-onboarding`
- Appka pošle celý doterajší rozhovor, funkcia sa opýta Clauda (Anthropic) a vráti ďalšiu vetu bota, celý profil a či je hotovo. Odpoveď má pevný tvar (JSON podľa schémy), takže appka vie profil rovno použiť.
- **Ochrana kreditu:** najviac 60 správ za hodinu z jednej IP a 3000 za deň spolu (tabuľka `ai_onboarding_calls` — ukladá len odtlačok IP, nie IP; staršie ako týždeň maže). Rozhovor má najviac 40 správ, jedna správa najviac 1000 znakov.
- Keď AI neodpovedá alebo je limit, appka správu vráti do políčka a ukáže hlášku; vždy sa dá prejsť na formulár.
- Štatistika: `reg_start` s `via: ai`, `reg_ai_done` (pri botovi `demo: true`), `reg_ai_demo` (prepnutie na bota), `reg_ai_error`, `reg_ai_to_form`, `reg_done` s `flow: ai` → [[Štatistika používania]].

## Ako zapnúť skutočnú AI (jednorazovo)
1. Supabase → SQL Editor: spustiť `supabase/migration-2026-10-10-ai-onboarding.sql` (hotovo 10. 10.).
2. Nastaviť kľúč: `supabase secrets set ANTHROPIC_API_KEY=…` (z console.anthropic.com).
3. Nasadiť funkciu: `supabase functions deploy ai-onboarding`.
4. Otvoriť náhľad vetvy na Cloudflare → Vytvoriť účet → „Hľadám prácu — porozprávam sa s AI".

## Pred prípadným spustením naostro
- Doplniť **Anthropic** do dokumentu o ochrane osobných údajov ako sprostredkovateľa (rozhovor vrátane mena a dátumu narodenia ide do USA) → [[Otvorené otázky a nezrovnalosti]].
- Vyhodnotiť štatistiku: koľko ľudí rozhovor dokončí oproti formuláru, koľko prepne na formulár.

Súvisí: [[Registrácia študenta]], [[Obrazovky hosťa a študenta]], [[Architektúra]]

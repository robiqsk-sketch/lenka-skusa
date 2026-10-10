---
tags: [robiq, tok, študent, test]
---
# Registrácia rozhovorom s AI (test)

← [[00 Mapa systému]] · kód: `app.js` → `renderAiob`, `aiSend`, `applyAiProfile`, `aiFormStep`, `demoReply` · funkcia `supabase/functions/ai-onboarding`

> [!warning] Testovacia verzia
> Žije len vo vetve `claude/practical-fermi-k5e1jz` (náhľad na Cloudflare), **nie v `main`**. Je to druhý spôsob registrácie študenta popri klasických troch krokoch ([[Registrácia študenta]]) — skúšame, či je rozhovor pre ľudí príjemnejší než formulár.

## Ako to prebieha
Na výbere typu účtu je tretia možnosť **„Hľadám prácu — porozprávam sa s AI"**. Registrácia má dve časti:

1. **Rozhovor — čo hľadáš.** Bot Robiq sa pýta, akú brigádu človek hľadá, čo mu ide a čo už má za sebou, koľko hodín a kedy môže pracovať, a pár slov o sebe. Z odpovedí si sám odvodí zručnosti aj s úrovňou (napr. „robila som rok baristku" → Barista, Dobré) a napíše krátke „o mne". Na meno, vek ani kontakty sa nepýta.
2. **Formulár — povinné údaje.** Po kliknutí na „Pokračovať": meno, dátum narodenia, **telefón**, mesto a dochádzanie, e-mail, heslo, súhlas s podmienkami. Nič z formulára sa AI neposiela.

```mermaid
flowchart TD
  P[Výber typu účtu] -->|Porozprávam sa s AI| CH[Rozhovor: čo hľadáš]
  CH -->|celý rozhovor| F[funkcia ai-onboarding<br/>→ Claude]
  F -->|ďalšia veta + zručnosti, čas, o mne| CH
  CH --> SUM[„Čo hľadáš" pod chatom<br/>priebežne sa dopĺňa]
  SUM -->|Pokračovať| FORM[Formulár: meno · dátum narodenia · telefón<br/>mesto · e-mail · heslo · súhlas]
  FORM --> REG[rovnaká registrácia ako klasická<br/>signUp / Google]
  CH -.->|Radšej vyplním formulár| OB[klasické 3 kroky<br/>predvyplnené tým, čo bot zistil]
```

## Pravidlá
- **Pod chatom je vždy vidno, čo bot pochopil** („Čo hľadáš"). Ak niečo nesedí, človek to povie v chate a opraví sa to.
- **„Pokračovať"** sa ukáže, keď bot pozná aspoň jednu zručnosť; keď bot povie, že má všetko, je zvýraznené. „← Späť" z formulára sa vráti do rozhovoru.
- **Telefón je povinný** (slovenské číslo 09… sa uloží ako +4219…, prijme aj zahraničné s predvoľbou). Zatiaľ ho vidí **len študent sám** — v profile ho vie zmeniť. Kto ho uvidí (napr. firma až po zhode), treba rozhodnúť → [[Otvorené otázky a nezrovnalosti]].
- **Vek 16+** stráži appka aj databáza rovnako ako pri klasickej registrácii.
- Ak bot počul mesto (človek ho sám spomenul), formulár ho predvyplní.
- **„Radšej vyplním formulár"** prepne na klasické kroky a všetko, čo bot zistil, tam už je vyplnené (klasická registrácia telefón nemá).
- Zručnosti bot berie z rovnakého zoznamu ako formulár (zoznam je skopírovaný vo funkcii — pri zmene `data.js` treba upraviť aj ju). Čo do zoznamu nepatrí, pridá ako vlastnú zručnosť.
- Študent má po registrácii vyplnené aj **„o mne"** (bio) — preto sa pri registrácii posiela aj ono (migrácia `ai-onboarding`).

## Skúšobný režim bez AI
Kým funkcia `ai-onboarding` nie je nasadená alebo nemá kľúč, appka to zistí pri prvej správe a rozhovor prevezme **jednoduchý bot bez AI**. Nad chatom sa vtedy ukáže, že ide o skúšobný režim.
- Kladie rovnaké otázky v pevnom poradí (čo ti ide → hodiny → dni a čas → pár slov o sebe).
- V odpovediach hľadá kľúčové slová: zručnosti („kaviareň" → Barista, „po anglicky" → Angličtina), čísla, dni („víkendy", „po–pi"), časti dňa. Opravy typu „nie, vlastne sklad" nepochopí.
- Stačí na vyskúšanie celého postupu a vzhľadu, **nič nestojí**. Registrácia na konci je skutočná (vytvorí účet) — na skúšanie použi testovací e-mail.
- Keď je kľúč nastavený, skutočná AI sa použije automaticky pri ďalšom rozhovore. Ak už AI raz odpovedala, na bota sa neprepína — pri výpadku ukáže chybu.

## Funkcia `ai-onboarding`
- Appka pošle celý doterajší rozhovor, funkcia sa opýta Clauda (Anthropic) a vráti ďalšiu vetu bota, čo zatiaľ vie (zručnosti, čas, o mne) a či je hotovo. Odpoveď má pevný tvar (JSON podľa schémy), takže appka ju vie rovno použiť.
- **Ochrana kreditu:** najviac 60 správ za hodinu z jednej IP a 3000 za deň spolu (tabuľka `ai_onboarding_calls` — ukladá len odtlačok IP, nie IP; staršie ako týždeň maže). Rozhovor má najviac 40 správ, jedna správa najviac 1000 znakov.
- **Platí sa za použitie** (API kľúč Anthropic, kredit vopred). S modelom Claude Opus 5.5 vyjde rozhovor rádovo na 10–20 centov, s Claude Haiku 5.5 pod 1 cent.
- Keď AI neodpovedá alebo je limit, appka správu vráti do políčka a ukáže hlášku; vždy sa dá prejsť na formulár.
- Štatistika: `reg_start` s `via: ai`, `reg_ai_done` (pri botovi `demo: true`), `reg_ai_demo` (prepnutie na bota), `reg_ai_form` (Pokračovať na formulár), `reg_ai_error`, `reg_ai_to_form` (Radšej vyplním formulár), `reg_done` s `flow: ai` → [[Štatistika používania]].

## Ako to vyskúšať
1. Supabase → SQL Editor: spustiť `supabase/migration-2026-10-10-ai-onboarding.sql` (hotovo 10. 10.) a `supabase/migration-2026-10-10-student-phone.sql` (telefón).
2. Otvoriť náhľad vetvy na Cloudflare → Vytvoriť účet → „Hľadám prácu — porozprávam sa s AI". Bez kľúča beží skúšobný bot.
3. Skutočná AI (neskôr, platené): kľúč z platform.claude.com → Supabase → Edge Functions → Secrets ako `ANTHROPIC_API_KEY` → nasadiť funkciu `ai-onboarding`.

## Pred prípadným spustením naostro
- Doplniť **Anthropic** do dokumentu o ochrane osobných údajov ako sprostredkovateľa (rozhovor ide do USA) a **telefón** ako nový osobný údaj (na čo slúži, kto ho vidí) → [[Otvorené otázky a nezrovnalosti]].
- Vyhodnotiť štatistiku: koľko ľudí rozhovor dokončí oproti formuláru, koľko prepne na formulár.

Súvisí: [[Registrácia študenta]], [[Obrazovky hosťa a študenta]], [[Architektúra]]

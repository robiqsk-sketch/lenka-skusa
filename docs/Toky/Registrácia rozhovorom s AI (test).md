---
tags: [robiq, tok, študent, test]
---
# Registrácia rozhovorom s AI (test)

← [[00 Mapa systému]] · kód: `app.js` → `renderAiob`, `aiSend`, `applyAiProfile`, `aiFormStep`, `demoReply` · AI: `worker/index.js` (Cloudflare Workers AI)

> [!warning] Testovacia verzia
> Žije len vo vetve `claude/practical-fermi-k5e1jz` (náhľad na Cloudflare), **nie v `main`**. Je to **ďalší, voliteľný** spôsob registrácie študenta — klasické tri kroky ([[Registrácia študenta]]) ostávajú bez zmeny a sú stále hlavná cesta. Skúšame, či je rozhovor pre ľudí príjemnejší než formulár.

## Ako to prebieha
Na výbere typu účtu je tretia možnosť **„Hľadám prácu — porozprávam sa s AI"**. Registrácia má dve časti:

1. **Rozhovor — čo hľadáš.** Bot Robiq sa pýta, akú brigádu človek hľadá, čo mu ide a čo už má za sebou, koľko hodín a kedy môže pracovať, a pár slov o sebe. Z odpovedí si sám odvodí zručnosti aj s úrovňou (napr. „robila som rok baristku" → Barista, Dobré) a napíše krátke „o mne". Na meno, vek ani kontakty sa nepýta.
2. **Formulár — povinné údaje.** Po kliknutí na „Pokračovať": meno, dátum narodenia, **telefón**, mesto a dochádzanie, e-mail, heslo, súhlas s podmienkami. Nič z formulára sa AI neposiela.

```mermaid
flowchart TD
  P[Výber typu účtu] -->|Porozprávam sa s AI| CH[Rozhovor: čo hľadáš]
  CH -->|koniec rozhovoru + čo už vieme| F[/api/ai-onboarding<br/>worker → Cloudflare Workers AI/]
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
Keď AI pri prvej správe neodpovie, rozhovor prevezme **jednoduchý bot bez AI** a nad chatom sa ukáže, že ide o skúšobný režim. Stáva sa to pri spustení appky na vlastnom počítači (tam Worker nebeží), keď je minutý denný limit zadarmo, alebo keď je AI vypnutá.
- Kladie rovnaké otázky v pevnom poradí (čo ti ide → hodiny → dni a čas → pár slov o sebe).
- V odpovediach hľadá kľúčové slová: zručnosti („kaviareň" → Barista, „po anglicky" → Angličtina), čísla, dni („víkendy", „po–pi"), časti dňa. Opravy typu „nie, vlastne sklad" nepochopí.
- Ak už AI v rozhovore raz odpovedala, na bota sa neprepína — pri výpadku ukáže chybu.

## AI: Cloudflare Workers AI (`worker/index.js`)
- Web beží na Cloudflare, tak aj AI: malý Worker beží **len pre adresy `/api/…`** (všetko ostatné sú rovno súbory z `robiq-app/`, ako doteraz). AI volá cez väzbu `AI` vo `wrangler.jsonc` — **bez API kľúča, nič netreba nastavovať**.
- **Zadarmo:** 10 000 „Neurons" denne (reset o polnoci UTC), to je zhruba 100–200 odpovedí, teda asi 15–30 rozhovorov denne. Keď sa minú, ďalší rozhovor prevezme skúšobný bot. Pri väčšom raste by sa platilo.
- **Model:** Llama 3.3 70B (otvorený model) — konštanta `MODEL` vo Workeri, dá sa vymeniť (Gemma 3, Mistral Small 3.1, Qwen 3). Treba vyskúšať, ako zvláda slovenčinu.
- Appka posiela len **koniec rozhovoru (12 správ) a to, čo už vieme** — menej textu = viac rozhovorov zadarmo. Model vráti ďalšiu vetu a celý doplnený profil v pevnom tvare (JSON); keby pevný tvar zlyhal, skúsi to ešte raz bez neho.
- **Ochrana limitu:** najviac 10 správ za minútu z jednej IP (`ratelimits` vo `wrangler.jsonc`), len z vlastnej stránky (cudzí web nemôže míňať náš limit), správa najviac 1000 znakov.
- Keď AI neodpovedá alebo je limit, appka správu vráti do políčka a ukáže hlášku; vždy sa dá prejsť na formulár.
- Štatistika: `reg_start` s `via: ai`, `reg_ai_done` (pri botovi `demo: true`), `reg_ai_demo` (prepnutie na bota), `reg_ai_form` (Pokračovať na formulár), `reg_ai_error`, `reg_ai_to_form` (Radšej vyplním formulár), `reg_done` s `flow: ai` → [[Štatistika používania]].

## Náhradná verzia s Claudom (nepoužíva sa)
V `supabase/functions/ai-onboarding` ostáva predchádzajúca verzia cez Claude (Anthropic) — lepšia slovenčina, ale **platená** (API kľúč, kredit vopred; rozhovor rádovo 10–20 centov s Opus 5.5, pod 1 cent s Haiku 5.5). Nie je nasadená. Tabuľka `ai_onboarding_calls` (migrácia `ai-onboarding`) patrí k nej a teraz sa nepoužíva.

## Ako to vyskúšať
1. Migrácie `ai-onboarding` a `student-phone` sú spustené (10. 10.).
2. Otvoriť náhľad vetvy na Cloudflare → Vytvoriť účet → „Hľadám prácu — porozprávam sa s AI". AI funguje len na Cloudflare (náhľad alebo web), na vlastnom počítači beží skúšobný bot.
3. Na konci použiť testovací e-mail — registrácia je skutočná (vytvorí účet).

## Pred prípadným spustením naostro
- Doplniť do dokumentu o ochrane osobných údajov, že rozhovor spracúva AI na Cloudflare (Workers AI), a **telefón** ako nový osobný údaj (na čo slúži, kto ho vidí) → [[Otvorené otázky a nezrovnalosti]].
- Overiť, ako model zvláda slovenčinu na skutočných rozhovoroch; prípadne vymeniť model.
- Vyhodnotiť štatistiku: koľko ľudí rozhovor dokončí oproti formuláru, koľko prepne na formulár.

Súvisí: [[Registrácia študenta]], [[Obrazovky hosťa a študenta]], [[Architektúra]]

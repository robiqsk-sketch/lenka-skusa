# Handoff: Robiq — brigádny matching systém

## Overview
Robiq is a two-sided marketplace that matches students with companies offering short-term work ("brigády") in Slovakia. Students browse a feed of postings, express interest, and manage matches; companies publish postings, browse candidates, message them, and manage their company profile — including a calendar of when each posting runs.

The whole product is prototyped as a single HTML design component: `Robiq MVP.dc.html`.

## About the design files
The files in this bundle are **design references written in HTML** — prototypes that show the intended look, copy and behaviour. They are **not production code to copy**.

The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, SwiftUI, React Native, whatever the app uses) using its established patterns, component library and routing. If there is no codebase yet, pick the most appropriate framework for a mobile-first two-sided marketplace and implement the designs there.

`Robiq MVP.dc.html` uses a small in-house prototyping runtime (`support.js`): a template between `<x-dc>` tags with `{{ value }}` holes, `<sc-if>` / `<sc-for>` control flow, and a `class Component extends DCLogic` block whose `renderVals()` returns everything the template reads. **Do not port the runtime.** Read the template for markup and styling, read the logic class for state and behaviour, and rewrite both idiomatically. `Robiq MVP - standalone.html` (if present) opens in any browser with no server — the fastest way to click through the real thing.

## Fidelity
**High-fidelity.** Final colours, typography, spacing, radii, shadows, copy and interactions. Recreate the UI pixel-accurately using the codebase's own primitives. All styling in the prototype is inline on the elements — the exact values are in the markup, and the system-level values are listed in `DESIGN.md` and below.

## Language
All UI copy is **Slovak** and is final — keep it verbatim. Students are addressed informally (tykanie), companies formally (vykanie). Short factual sentences, no emoji.

## Screens / views

Two role-scoped apps behind one shell. Screen order below follows the flow.

### Shared / entry
1. **Prihlásenie (sign-in)** — dark panel background (see *Background* below), centered white card, e-mail + password inputs, primary button, link to registration.
2. **Výber typu účtu** — two large choice cards: student vs. company.

### Student
3. **Onboarding študenta — 3 steps** with a 3-bar stepper (26 × 4 px, active `#40319F`).
   - Step 1: name.
   - Step 2: skills — multi-select chips.
   - Step 3: **availability**. A range slider for weekly hours with tick labels `5 h / 10 h / 20 h / Fulltime`; below it "Ktoré dni?" — a 7-column grid of day toggles (Po Ut St Št Pi So Ne, 40–42 px tall, radius 11 px, selected = `#40319F` fill + white text, unselected = `rgba(36,27,69,.04)` fill + `1px solid #DEDBEC`); below that "Kedy počas dňa?" — a 2-column grid of four time-of-day toggles, each with a bold label and a muted sub-label: **Ráno** 6–12 h, **Poobede** 12–18 h, **Večer** 18–23 h, **Nočné zmeny** 23–6 h (selected = `rgba(124,108,224,.14)` fill, `#40319F` text, `1px solid #7C6CE0`). Under both, a one-line summary sentence built from the selection ("So, Ne · poobede"; "každý deň" when all 7 days are picked; empty state "Vyber si dni a časy, kedy môžeš pracovať.").
   - Defaults: hours index 1, days `['So','Ne']`, times `['Poobede']`.
4. **Objavuj (discover feed)** — scrollable list of posting cards. Each card: white, radius 22–24 px, `1px solid #CEC6E4`, shadow `0 12px 34px -12px rgba(48,36,110,.24)`; title, company, pay rate, meta chips, primary "Mám záujem" action, and a `⋯` menu top-right.
5. **Zhody (matches)** — matched postings / conversations.
6. **Profil študenta** — editable profile; contains the **same availability controls** as onboarding step 3 (days + time-of-day grids + summary), kept in sync with the same state.
7. **Detail ponuky (modal)** — full posting detail with three photos (no video).

### Company
8. **Firemná registrácia — 3 steps**: (1) company name + logo upload + company ID, (2) industries, (3) contact person + password. No city field.
9. **Brigádnici (candidates)** — candidate cards. Signed-out companies see only a sign-in prompt instead of candidate profiles.
10. **Správy (messages)** — conversation list + thread; stacks vertically under 640 px.
11. **Inzeráty / Ponuky firmy** — the company's own postings with views, likes, filled/needed counts and an active toggle. `⋯` menu on own postings offers **Duplikovať** and **Zmazať** (with confirmation modal). A new company sees an **empty state**, never demo data.
12. **Nová ponuka** — posting creation form. While in this flow the bottom dock keeps "Inzeráty" highlighted to preserve context. New postings default to a run of the 8th–15th of the month.
13. **Firemný profil** — company info, stats, an 18+ filter (lives here, not in posting creation), and the **calendar** below.

### Kalendár inzerátov (company profile)
A white card, radius 22 px, padding 28 × 30 px.
- Header row: "Kalendár inzerátov" (16 px / 700) left, month label ("September 2026", 12.5 px, `#6E688C`) right.
- Weekday header: 7-column grid, labels Po Ut St Št Pi So Ne, 10.5 px / 700, uppercase, `letter-spacing:.12em`, `#6E688C`.
- Day grid: 7 columns, 6 px gap, cells 52 px tall, radius 12 px, padding `7px 8px 6px`. The day number sits top-left (14 px). At the bottom of the cell, one 3 px-tall rounded bar per posting running that day, stacked with 2 px gaps — bar colour comes from a 3-colour rotation `['#5546C4','#7C6CE0','#9F8FF2']` keyed by posting index; paused postings render at 40 % opacity. Leading blanks pad the month to the correct weekday start (Monday-first).
- Cell states: **selected** `#40319F` fill, white text, bars at `rgba(255,255,255,.9)`; **has postings** `rgba(124,108,224,.12)` fill, `#40319F` text, `1px solid rgba(124,108,224,.3)`, weight 700; **empty** transparent, `#6E688C` text, transparent border, weight 400. Transition `background .18s, color .18s`.
- Legend under the grid: one row per posting — a 14 × 3 px colour bar, the posting title (truncated with ellipsis), and its date range ("5. – 12. 9.", `#6E688C`) right-aligned. Paused postings at 45 % opacity.
- Selection detail: separated by a `1px solid rgba(36,27,69,.07)` rule, the selected date in full ("10. september 2026", 12.5 px / 700, `#3F3A55`), then one row per posting running that day — 7 px colour dot, title (13.5 px / 700), `"5. – 12. 9. 2026 · 7,50 € / hod"` sub-line (11.5 px, `#6E688C`), and a status word right-aligned: **Aktívna** `#15803D` or **Pozastavená** `#6E688C`. Rows are `rgba(36,27,69,.04)` fill, `1px solid rgba(36,27,69,.07)`, radius 13 px, padding `12px 15px`. When no posting runs that day: "V tento deň nebeží žiadny inzerát." (13 px, `#6E688C`).
- Default selected day: 10.

### Modals
**Detail ponuky**, **Prihlásenie potrebné** (Vytvoriť účet / Prihlásiť sa / Zrušiť), **Zmazať inzerát** (confirm). Overlay `rgba(23,18,46,.5)` + `backdrop-filter: blur(7px)`.

## Interactions & behaviour
- **Guest-first.** The feed is fully browsable without an account. Sign-in is only demanded when the user acts ("Mám záujem") — that opens the *Prihlásenie potrebné* modal with Create account / Sign in / Cancel.
- Guest students see a shuffled feed, first names only, blurred profile photos, no private data.
- Signed-out companies cannot open candidate profiles — only a sign-in prompt.
- **Top bar hides on scroll down and returns on scroll up** (Amazon-style), driven by the feed's scroll position.
- `⋯` menu: on other people's cards → Nahlásiť / Zablokovať; on the company's own postings → Duplikovať / Zmazať (confirmation required).
- Calendar day cells are buttons; clicking one sets the selected day and re-renders the detail list. No month navigation in the prototype — add prev/next month if the target app needs it.
- Availability day/time toggles are independent multi-selects; the summary sentence recomputes on every change.
- Signing out returns a clean guest view with no residual state.
- Transitions are short and functional: `.18s` on background/colour for toggles and cells; background sphere animation loops 16–18 s.

## State
Single component state in the prototype; split per route/store when porting.
- `screen` (login / onboarding / roleChoice / firmReg / app), `authed`, `role` ('student' | 'firm')
- `tab` / `ftab` — active bottom-dock tab per role
- `obStep`, `obName`, `obSkills[]`, `obHours` (slider index), `availDays[]`, `availTimes[]`
- `offers[]` — company postings: `{t, pay, views, likes, m, need, on, d1, d2}` where `m` = matched count, `need` = positions needed, `on` = active, `d1`/`d2` = first/last day of the run
- `calDay` — selected calendar day
- `detail` — open posting modal, `contacted[]`, report/block and delete-confirm flags
- `fpName`, `fpLogo`, `fpDesc` … — company profile fields, seeded from registration
- Posting creation fields (`fNeed` etc.)

Data flow: the candidate feed derives from real postings — no seeded demo content for a freshly registered company.

## Design tokens

### Colours
| Role | HEX |
|---|---|
| App background | `#F7F6FB` |
| Sign-in background | `#F0EFF5` |
| Dark panel — centre | `#1C1540` |
| Dark panel — 55 % | `#120D2B` |
| Dark panel — edge | `#08050F` |
| Primary violet | `#40319F` |
| Hover / logo dot | `#5546C4` |
| Light violet | `#7C6CE0` |
| Glow | `#9F8FF2`, `#CBC0FF`, `#F0ECFF` |
| Text primary | `#000000` |
| Text secondary | `#3F3A55` |
| Text muted | `#6E688C` |
| Card border | `#CEC6E4` |
| Input border | `#DEDBEC` |
| Destructive | `#DC2626` |
| Success / active status | `#15803D` |

No pink, yellow or any colour outside this scale.

Recurring alphas: `rgba(36,27,69,.05)` input fill · `rgba(36,27,69,.04)` subtle row fill · `rgba(36,27,69,.07)` hairline border · `rgba(85,70,196,.06)` active chip · `rgba(124,108,224,.12)` calendar day with postings · `rgba(124,108,224,.14)` selected time toggle · `rgba(124,108,224,.16)` icon backdrop · `rgba(23,18,46,.5)` modal overlay.

### Typography
- All text: **Satoshi** (cdnfonts, `https://fonts.cdnfonts.com/css/satoshi`), base weight 500, headings and buttons 700.
- Logo only: **Open Sauce One** Bold — `Robiq` + violet dot `#5546C4`.
- Section heading 24–26 px / 700, second word wrapped in `<b>` and tinted `#40319F`.
- Sub-description 13–13.5 px, `#3F3A55`.
- Eyebrow 11 px, uppercase, `letter-spacing:.14em`, `#40319F`.
- Small meta 11–12.5 px, `#6E688C`.

### Shape & shadow
- Card: radius 22–24 px, white, `1px solid #CEC6E4`, shadow `0 12px 34px -12px rgba(48,36,110,.24)`.
- Input / button: radius 12 px, padding `13px 16px`.
- Chip / pill: radius 99 px, padding `9px 16px`.
- Toggle button (day / time): radius 11–12 px.
- Calendar cell: radius 12 px, height 52 px.
- Modal: overlay `rgba(23,18,46,.5)` + `backdrop-filter: blur(7px)`.

### Components
- **Primary button** — `#40319F`, white text, 700, hover `#5546C4`.
- **Secondary button** — transparent, `1px solid #DEDBEC`, black text.
- **Text link** — `#40319F` 700, hover `#5546C4`.
- **Input** — fill `rgba(36,27,69,.05)`, focus border `#40319F`.
- **Stepper** — three 26 × 4 px bars, active `#40319F`.

## Background (sign-in / hero)
Dark panel inset 22 px with 34 px corners, radial gradient `#1C1540 → #120D2B → #08050F`. Two 900 × 900 px dotted spheres cropped behind the left and right edges (drawn on canvas), two thin outline circles 760 × 820 px at 10 % opacity, and a vertical light glow down the centre with 16 px blur. Everything drifts slowly on 16–18 s loops. Step-by-step recreation notes: `BACKGROUND-canva.md`.

## Responsiveness
Mobile-first. Breakpoints at **960 px** (card grid → 2 columns) and **640 px** (single column, chat stacks vertically, bottom dock narrows). In the prototype these are targeted via `data-mq` attributes; use the codebase's normal responsive mechanism instead.

## Assets
- Fonts: Satoshi and Open Sauce One, both from cdnfonts. Self-host or use the codebase's font pipeline.
- No raster brand assets in the prototype. Company logos are user uploads; posting photos and profile pictures are placeholders — replace with real media or the app's image component.
- Icons are inline glyphs/SVG in the prototype; substitute the codebase's icon set.

## Files in this bundle
- `Robiq MVP.dc.html` — the full prototype (template + logic). Primary reference.
- `Robiq MVP - standalone.html` — self-contained build; open directly in a browser to click through the flows.
- `support.js` — the prototyping runtime the .dc.html needs to run locally. **Not for porting.**
- `DESIGN.md` — the design system in short form.
- `BACKGROUND-canva.md` — how the animated dark background is constructed.

## Suggested order of work
1. Open the standalone file and walk both roles end to end.
2. Set up tokens (colours, type, radii, shadows) in the target system.
3. Build the shared shell: dark background, card, input, button, chip, stepper, bottom dock, `⋯` menu, modal.
4. Student flow: onboarding (incl. availability) → feed → detail modal → matches → profile.
5. Company flow: registration → postings → new posting → candidates → messages → profile with calendar.
6. Wire guest-first gating and the deferred sign-in modal last — it touches every action.

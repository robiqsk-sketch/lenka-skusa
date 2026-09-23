---
tags: [robiq, tok, študent]
---
# Registrácia študenta

← [[00 Mapa systému]] · kód: `app.js` → `renderOb`, `obStep1–3`, `registerStudent`

Tri kroky (obrazovka `ob`). Registrácia sa začína z výberu typu účtu, alebo keď hosť klikne „Mám záujem".

```mermaid
flowchart TD
  P[Výber typu účtu] --> S1
  S1["Krok 1 — Ako sa voláš<br/>meno · dátum narodenia · fotka · e-mail · heslo · súhlas s podmienkami"] -->|email_taken? vek ≥ 16?| S2
  S2["Krok 2 — Čo ti ide<br/>zručnosti + úroveň (jazyky A1–C2)"] --> S3
  S3["Krok 3 — Koľko hodín a kedy<br/>hodiny · dni · časy · mesto + dochádzanie"] --> REG
  REG{Účet cez e-mail<br/>alebo Google?}
  REG -->|e-mail| SU[signUp s údajmi v metadátach<br/>→ trigger handle_new_user vytvorí profil]
  REG -->|Google| UP[profil sa zapíše priamo<br/>profiles + students]
  SU --> CONF{Treba potvrdiť e-mail?}
  CONF -->|áno| LOGIN[Prihlásenie + hláška „Poslali sme ti e-mail"]
  CONF -->|nie| APP[Appka → Objavuj]
  UP --> APP
```

## Pravidlá
- **Vek 16+** kontroluje appka aj databáza (trigger). Dátum narodenia sa potom nedá zmeniť.
- **Obsadený e-mail** sa zisťuje hneď v kroku 1 (`email_taken`), lebo Supabase pri zapnutom potvrdzovaní chybu nevráti.
- **Mesto je povinné** (kvôli párovaniu podľa miesta). Starší používatelia bez mesta vidia v Objavuj prúžok „Doplň si mesto".
- Fotka vybraná v kroku 1 sa nahrá až po vzniku účtu (bucket `avatars`).

## Nedokončená registrácia
Ak účet existuje, ale chýba profil alebo zručnosti (napr. prihlásenie cez Google, prerušená registrácia),
appka zostane zamknutá a pokračuje tam, kde sa skončilo (`profileUnfinished` → `resumeOnboarding`).

Súvisí: [[Prihlásenie a obnova hesla]], [[Obrazovky hosťa a študenta]], [[Registrácia firmy a overenie IČO]]

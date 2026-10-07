---
tags: [robiq, obrazovky, študent]
---
# Obrazovky hosťa a študenta

← [[00 Mapa systému]] · kód: `app.js` → `feed`, `jobCard`, `zhody`, `profile`

Študent má tri záložky: **Objavuj · Správy · Profil** (`STUDENT_TABS` v `data.js`). Na mobile sú v plávajúcom **docku** dole (len ikony, názov záložky číta čítačka obrazovky), na počítači (šírka nad 960 px) v hornej lište, tiež len ako ikony (názov sa ukáže po podržaní myši) — dock sa tam neukazuje.
Hosť má v hornej lište tmavý režim · Prihlásiť sa · Vytvoriť účet. Na veľmi úzkych telefónoch (pod 380 px) sa prepínač režimu skryje, pod 320 px (zložený Galaxy Fold) aj „Prihlásiť sa" — prihlásenie ostáva cez „Vytvoriť účet" → „Už mám účet".
Hosť vidí len Objavuj a tlačidlá na prihlásenie/registráciu.

## Objavuj (`feed`)
- Nadpis „Ponuky **pre teba**", pod ním rad **filtrov**: „V mojom okolí" (len študent s mestom) a typy brigády (Víkendy, Poobede, Večery, Na diaľku, Flexibilné). Typ „Na diaľku" sa v dátach volá `Remote` — mení sa len to, čo ľudia vidia. Na mobile sa rad posúva do strany a pravý okraj jemne mizne, aby bolo jasné, že je tam viac. Vybrané typy platia ako „aspoň jeden z nich", okolie navyše; „Zrušiť" ich vypne. Filtre sa neukladajú — po obnovení stránky sú preč.
- Kompaktné karty inzerátov: logo, názov, firma s „✓ overená" a plat/hod vpravo hore; pod tým mesto (a vzdialenosť) · kedy pridané · menu ⋯; obsadenosť miest (čiara = počet zhôd / počet ľudí), typy.
- Otvorenie detailu sa započíta do zobrazení inzerátu.
- Tlačidlá **Mám záujem** / **✕ Nezaujíma ma** (= Preskočiť). Hosť vidí len „Mám záujem" — ✕ by mu nič nepovedalo. **Obsadená** ponuka (všetky miesta zabrané) je stlmená, je na konci zoznamu, namiesto tlačidiel má neaktívne „Obsadené" a neponúka sa v tipe „Toto by ti sedelo"; klik na kartu = **detail** (popis, fotky „deň v práci", adresa s odkazom na mapu, oficiálny názov firmy, nahlásenie).
- Po 2 prezretých kartách sa hore ukáže tip **„✦ Toto by ti sedelo"** (prvý inzerát, o ktorý ešte nedal záujem).
- Prúžok **„Doplň si mesto"**, ak študent nemá mesto.
- Menu karty: nahlásiť inzerát, **zablokovať firmu** (jej ponuky zmiznú; uloží sa do `blocks`).
- Poradie: pozri [[Návrhy kandidátov (párovanie)]] → časť Poradie ponúk.
- Hosť pri „Mám záujem" → výzva na prihlásenie (*gate*).

## Správy (`zhody`)
Zoznam zhôd a chat. Pri novej zhode banner **„Máte zhodu!"**. → [[Záujem, zhoda a chat]]

## Profil (`profile`)
- Hlavička: fotka, meno, hodiny, mesto; tlačidlo **Upraviť / ✓ Hotovo** (ukladá sa až pri Hotovo).
- Režim úprav: fotka, dátum narodenia (len raz), bio (max. 240 znakov, s upozornením na citlivé údaje), zručnosti s úrovňou, dostupnosť a miesto.
- Štatistika: prezreté · záujmy · zhody.
- **Moje záujmy** — na čo klikol „Mám záujem" a stav (Čaká na odpoveď / ✓ Zhoda).
- **Skryté firmy** — zablokované firmy s tlačidlom „Zobraziť" (ukáže sa, len ak nejaké sú).

## Menu účtu (vpravo hore)
Takmer všetko je len ikonami, bez popisov (ako ovládacie centrum v iPhone) — názov sa ukáže až po podržaní myši nad ikonou, a čítačke obrazovky ho povie tiež.
- **Prvý riadok – prepínače:** upozornenia (zvonček) · e-maily (obálka) · režim (slnko = svetlý, mesiac = tmavý). Zapnutý prepínač je vyfarbený hlavnou farbou, vypnutý sivý → [[Upozornenia]]
- **Druhý riadok:** profil · pomoc (e-mail na support) · podmienky · **Štatistika** (len admin)
- Pod čiarou ostávajú s textom **odhlásiť** a **zmazať účet** → [[Zmazanie účtu]] — pri nich nesmie byť omyl, čo tlačidlo urobí.

Súvisí: [[Registrácia študenta]], [[Obrazovky firmy]]

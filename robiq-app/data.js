// Static lists from the prototype (Robiq MVP.dc.html l.1063–1110, 1249, 1305–1309, 1473).
// Live data (postings, students, matches, messages) comes from Supabase — see app.js.

const GROUPS = [
  { g: 'Pracovné pozície', items: ['Barista','Čašník / Servírka','Predaj','Pokladňa','Sklad','Eventy','Hostesing','Promo akcie','Doučovanie','Kuriér','Rozvoz','Recepcia','Kuchyňa','Upratovanie','Administratíva'] },
  { g: 'Digitálne zručnosti', items: ['React','Tvorba webu','Grafika','Figma','Canva','Photoshop','Video strih','Copywriting','Sociálne siete','Excel','Dátová analýza','AI nástroje'] },
  { g: 'Jazyky', items: ['Angličtina','Nemčina','Španielčina','Francúzština','Taliančina','Ruština','Ukrajinčina','Maďarčina','Poľština','Čínština'] },
  { g: 'Vlastnosti a iné', items: ['Vodičák B','Komunikatívnosť','Spoľahlivosť','Práca v tíme','Fyzická kondícia','Flexibilita','Práca pod tlakom','Organizovanosť','Rýchle učenie'] },
];
const SKILLS = GROUPS.flatMap(x => x.items);
const LANGS  = GROUPS.find(x => x.g === 'Jazyky').items;
const LANG_LVLS = ['A1–A2', 'B1–B2', 'C1–C2'];
const LVLS      = ['Základy', 'Dobré', 'Top'];
const RELATED = {
  'Barista':['Obsluha','Latte art','Príprava nápojov'], 'Čašník / Servírka':['Obsluha','Someliérstvo','Barmanstvo'],
  'Predaj':['Obsluha','Merchandising','Reklamácie'], 'Pokladňa':['Obsluha','Inventúra'], 'Sklad':['VZV preukaz','Inventúra','Balenie objednávok'],
  'Eventy':['Stavba pódia','Šatňa','Vstupenky'], 'Hostesing':['Modeling','Degustácie'], 'Promo akcie':['Letáky','Sampling'],
  'Doučovanie':['Matematika','Fyzika','Slovenčina','Programovanie pre deti'], 'Kuriér':['Vlastné auto','Bicykel','Skúter'],
  'Rozvoz':['Vlastné auto','Navigácia'], 'Recepcia':['Rezervácie','Telefonovanie'], 'Kuchyňa':['Príprava jedál','Hygienické minimum','Umývanie riadu'],
  'Administratíva':['Fakturácia','Dátové tabuľky','Telefonovanie'], 'React':['TypeScript','CSS','Git','Next.js'], 'Tvorba webu':['WordPress','HTML/CSS','SEO'],
  'Grafika':['Illustrator','Branding','Tlačoviny'], 'Figma':['Prototypovanie','UI dizajn'], 'Canva':['Prezentácie','Social media grafika'],
  'Photoshop':['Retuš','Fotografovanie'], 'Video strih':['CapCut','Premiere','Reels'], 'Copywriting':['SEO texty','Blog','Newslettre'],
  'Sociálne siete':['Reels','TikTok','Community management'], 'Excel':['PowerPoint','Dátové tabuľky','Google Sheets'], 'Dátová analýza':['SQL','Power BI'],
  'AI nástroje':['ChatGPT','Midjourney','Automatizácie'], 'Vodičák B':['Vlastné auto','Rozvoz'], 'Angličtina':['Preklady','Zákaznícka podpora'],
  'Nemčina':['Preklady','Zákaznícka podpora'], 'Španielčina':['Preklady'], 'Francúzština':['Preklady'], 'Ukrajinčina':['Tlmočenie'],
  'Komunikatívnosť':['Telefonovanie','Zákaznícka podpora'], 'Práca v tíme':['Vedenie zmeny'], 'Fyzická kondícia':['Sťahovanie','Stavba pódia'],
};
const HOURS  = ['5 h / týždeň', '10 h / týždeň', '20 h / týždeň', 'Fulltime cez leto'];
const DAYS   = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
const TIMES  = [['Ráno','6–12 h'], ['Poobede','12–18 h'], ['Večer','18–23 h'], ['Nočné zmeny','23–6 h']];
const FIELDS = ['Gastro','Retail','Sklad a logistika','Administratíva','Eventy','IT a dizajn','Doučovanie','Manuálna práca'];
const TYPES  = ['Víkendy', 'Poobede', 'Večery', 'Remote', 'Flexibilné'];

const PERSON = `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.6 20c0-3.6 3.3-5.6 7.4-5.6s7.4 2 7.4 5.6"/></svg>`;
const STUDENT_TABS = [['Objavuj','❖'], ['Správy','✉'], ['Profil', PERSON]];
const FIRM_TABS    = [['Ponuka','❖'], ['Správy','✉'], ['Inzeráty','☰'], ['Profil', PERSON]];

// Logo colours for companies without an uploaded logo — design palette, picked by name.
const LOGO_COLORS = ['#5546C4', '#7C6CE0', '#9F8FF2', '#40319F'];

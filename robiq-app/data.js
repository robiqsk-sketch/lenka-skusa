// Static lists from the prototype (Robiq MVP.dc.html l.1063–1110, 1249, 1305–1309, 1473).
// Live data (postings, students, matches, messages) comes from Supabase — see app.js.

const GROUPS = [
  { g: 'Pracovné pozície', items: ['Barista','Čašník / Servírka','Predaj','Pokladňa','Sklad','Eventy','Hostesing','Promo akcie','Doučovanie','Kuriér','Rozvoz','Recepcia','Kuchyňa','Upratovanie','Administratíva'] },
  { g: 'Digitálne zručnosti', items: ['React','Tvorba webu','Grafika','Figma','Canva','Photoshop','Video strih','Copywriting','Sociálne siete','Excel','Dátová analýza','AI nástroje'] },
  { g: 'Jazyky', items: ['Angličtina','Nemčina','Španielčina','Francúzština','Taliančina','Ruština','Ukrajinčina','Maďarčina','Poľština','Čínština'] },
  { g: 'Vlastnosti a iné', items: ['Vodičský preukaz B','Komunikatívnosť','Spoľahlivosť','Práca v tíme','Fyzická kondícia','Flexibilita','Práca pod tlakom','Organizovanosť','Rýchle učenie'] },
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
  'AI nástroje':['ChatGPT','Midjourney','Automatizácie'], 'Vodičský preukaz B':['Vlastné auto','Rozvoz'], 'Angličtina':['Preklady','Zákaznícka podpora'],
  'Nemčina':['Preklady','Zákaznícka podpora'], 'Španielčina':['Preklady'], 'Francúzština':['Preklady'], 'Ukrajinčina':['Tlmočenie'],
  'Komunikatívnosť':['Telefonovanie','Zákaznícka podpora'], 'Práca v tíme':['Vedenie zmeny'], 'Fyzická kondícia':['Sťahovanie','Stavba pódia'],
};
const HOURS  = ['5 h / týždeň', '10 h / týždeň', '20 h / týždeň', 'Fulltime cez leto'];
const DAYS   = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
const TIMES  = [['Ráno','6–12 h'], ['Poobede','12–18 h'], ['Večer','18–23 h'], ['Nočné zmeny','23–6 h']];
const FIELDS = ['Gastro','Retail','Sklad a logistika','Administratíva','Eventy','IT a dizajn','Doučovanie','Manuálna práca'];
const TYPES  = ['Víkendy', 'Poobede', 'Večery', 'Remote', 'Flexibilné'];

// One icon set for the whole app (paths from Lucide, ISC licence) — text symbols like ◐ ❖ ✉ ⋯ ♥ looked different on every phone.
const ICONS = {
  compass:  '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>',
  message:  '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  mail:     '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  list:     '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  user:     '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  moon:     '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  more:     '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  heart:    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  x:        '<path d="M18 6 6 18M6 6l12 12"/>',
  flag:     '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  help:     '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
  file:     '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/>',
  chart:    '<path d="M12 20V10M18 20V4M6 20v-4"/>',
  logout:   '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  trash:    '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  lock:     '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  clock:    '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
};
const icon = (name, size = 18) => `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
const PERSON = icon('user', 21);
const STUDENT_TABS = [['Objavuj', icon('compass')], ['Správy', icon('message')], ['Profil', icon('user')]];
const FIRM_TABS    = [['Ponuka', icon('compass')], ['Správy', icon('message')], ['Inzeráty', icon('list')], ['Profil', icon('user')]];

// Logo colours for companies without an uploaded logo — calm, non-purple tones (purple is kept for actions), picked by name.
const LOGO_COLORS = ['#475569', '#0F766E', '#B45309', '#BE185D'];

// ═══════════ Data — l.1029–1054 (jobs), 1063–1110 (skills), 1249, 1473 ═══════════
const JOBS = [
  {id:1,t:'Barista — víkendy',f:'Kavey Coffee · Bratislava',pay:'7,50 €',need:2,taken:1,posted:'pred 2 dňami',start:'18. júla',lg:'#5546C4',ini:'K',rat:'4,8',ratN:23,score:87,ai:false,match:false,
   badges:['✓ Overená firma','⚡ Rýchla odpoveď'],tags:['Víkendy','Bez praxe','Staré Mesto'],
   desc:'Ranné a víkendové zmeny v specialty kaviarni v centre. Skúsenosti netreba — zaškolíme ťa, latte art zvládneš za mesiac.',
   ice:['Čo ťa naučíme za prvý mesiac? — Latte art a prácu s espresso strojom La Marzocco.','Aký je tím? — Šiesti, väčšina študenti. Playlist si volíme spoločne.','Najlepší benefit? — Káva zadarmo aj mimo zmeny.']},
  {id:2,t:'Junior frontend výpomoc',f:'TechLink s.r.o. · remote',pay:'12 €',need:1,taken:0,posted:'včera',start:'ihneď',lg:'#0EA5E9',ini:'T',rat:'4,9',ratN:11,score:94,ai:true,match:true,
   badges:['✓ Overená firma','Nástup ASAP'],tags:['React','Remote','10 h / týž.'],
   desc:'Pomáhaj nášmu tímu s React komponentami a drobnými fixami. Ideálne popri škole — úlohy si plánuješ sám, code review dostaneš na každý PR.',
   ice:['Čo ťa naučíme za prvý mesiac? — Prácu v reálnom git flow a code review kultúru.','Aký je tím? — 4 devi, štandup 2× týždenne, inak async.','Najlepší benefit? — Referencia a mentoring od seniora.']},
  {id:3,t:'Hosteska — eventy',f:'Eventix · Bratislava',pay:'9 €',need:8,taken:3,posted:'pred 4 dňami',start:'24. júla',lg:'#9F8FF2',ini:'E',rat:'4,3',ratN:41,score:71,ai:false,match:false,
   badges:['⚡ Rýchla odpoveď'],tags:['Večery','Flexibilné','Tímové'],
   desc:'Vítanie hostí a registrácia na firemných eventoch a konferenciách. Večerné akcie, výber termínov je na tebe.',
   ice:['Čo ťa naučíme za prvý mesiac? — Prácu s registračným systémom a event etiketu.','Aký je tím? — Mladý, na každej akcii iná zostava.','Najlepší benefit? — Catering a networking zadarmo.']},
  {id:4,t:'Doučovanie matematiky',f:'SmartKids · online',pay:'15 €',need:3,taken:1,posted:'pred 3 hodinami',start:'od septembra',lg:'#7C6CE0',ini:'S',rat:'4,7',ratN:18,score:89,ai:true,match:true,
   badges:['✓ Overená firma'],tags:['Online','VŠ študent','Poobede'],
   desc:'Online doučovanie stredoškolákov, 60-minútové bloky poobede. Materiály dostaneš, ty dodáš trpezlivosť.',
   ice:['Čo ťa naučíme za prvý mesiac? — Didaktiku a prácu s našou online tabuľou.','Aký je tím? — 30+ doučovateľov, komunita na Discorde.','Najlepší benefit? — Sám si volíš počet žiakov.']},
  {id:5,t:'Skladová výpomoc — víkendy',f:'LogisPack · Trnava',pay:'8,20 €',need:5,taken:4,posted:'pred 6 dňami',start:'12. júla',lg:'#40319F',ini:'L',rat:'4,1',ratN:35,score:64,ai:false,match:false,
   badges:['⚡ Rýchla odpoveď'],tags:['Víkendy','Fyzická práca','Trnava'],
   desc:'Kompletizácia objednávok v modernom sklade. Sobota alebo nedeľa, 8-hodinové zmeny, doprava z centra Trnavy zdarma.',
   ice:['Čo ťa naučíme za prvý mesiac? — Prácu so skenerom a logistiku e-shopu.','Aký je tím? — Zmena 10 ľudí, polovica brigádnici.','Najlepší benefit? — Príplatok 20 % za nedeľu.']},
  {id:6,t:'Social media asistent',f:'Mode Studio · Bratislava',pay:'10 €',need:1,taken:0,posted:'včera',start:'ihneď',lg:'#7C6CE0',ini:'M',rat:'4,6',ratN:9,score:82,ai:true,match:false,
   badges:['✓ Overená firma'],tags:['Instagram','Kreatívne','Hybrid'],
   desc:'Príprava reels a stories pre módne značky. Hybrid — natáčanie v štúdiu, strih z domu.',
   ice:['Čo ťa naučíme za prvý mesiac? — Strih v CapCute na profi úrovni.','Aký je tím? — Kreatívne duo + ty.','Najlepší benefit? — Vlastné portfólio kampaní.']},
];
const CANDS = [                                          // l.1055–1062
  {id:1,adult:true,n:'Marek K.',ini:'MK',school:'FIIT STU',role:'Frontend',offer:'Barista — víkendy',hrs:'10 h / týž.',rat:'4,9',ratN:7,skills:['React','TypeScript','Figma'],score:92,g:'linear-gradient(135deg,#5546C4,#9F8FF2)'},
  {id:2,adult:true,n:'Laura B.',ini:'LB',school:'EUBA',role:'Marketing',offer:'Hosteska — letné eventy',hrs:'20 h / týž.',rat:'4,8',ratN:12,skills:['Instagram','Copywriting','Canva'],score:88,g:'linear-gradient(135deg,#5546C4,#40319F)'},
  {id:3,adult:true,n:'Adam V.',ini:'AV',school:'FMFI UK',role:'Doučovanie',offer:'Barista — víkendy',hrs:'flexibilne',rat:'5,0',ratN:5,skills:['Matematika','Fyzika','AJ B2'],score:85,g:'linear-gradient(135deg,#7C6CE0,#9F8FF2)'},
  {id:4,adult:false,n:'Samuel T.',ini:'ST',school:'SPŠE',role:'Sklad',offer:'Skladová výpomoc',hrs:'víkendy',rat:'4,6',ratN:14,skills:['VZV preukaz','Spoľahlivosť'],score:81,g:'linear-gradient(135deg,#40319F,#5546C4)'},
  {id:5,adult:false,n:'Nina H.',ini:'NH',school:'ŠUP J. Vydru',role:'Grafika',offer:'Hosteska — letné eventy',hrs:'poobede',rat:'4,7',ratN:6,skills:['Illustrator','Photoshop'],score:77,g:'linear-gradient(135deg,#7C6CE0,#7C6CE0)'},
  {id:6,adult:true,n:'Ema S.',ini:'ES',school:'FiF UK',role:'Eventy',offer:'Hosteska — letné eventy',hrs:'večery',rat:'4,8',ratN:19,skills:['Komunikácia','AJ C1','NJ B2'],score:74,g:'linear-gradient(135deg,#9F8FF2,#7C6CE0)'},
];
const TYPES = ['Víkendy', 'Poobede', 'Večery', 'Remote', 'Flexibilné'];   // l.1110
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

// Dock tabs — l.1305–1309
const PERSON = `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.6 20c0-3.6 3.3-5.6 7.4-5.6s7.4 2 7.4 5.6"/></svg>`;
const STUDENT_TABS = [['Objavuj','❖'], ['Správy','✉'], ['Profil', PERSON]];
const FIRM_TABS    = [['Ponuka','❖'], ['Správy','✉'], ['Inzeráty','☰'], ['Profil', PERSON]];

// ═══════════ State — l.1112–1138 ═══════════
// Guest-first: the prototype opens on the feed, signed out.
const initialState = () => ({
  screen: 'app', authed: false, role: 'student', pendingJob: null, gate: false,
  tab: 0, ftab: 0, loading: false, accMenu: false, notifOn: true, rowMenu: null,
  handled: [], viewed: 0, liked: 0, likedIds: [], blockedFirms: [],
  matches: [{ jobId: 1, name: 'Kavey Coffee', job: 'Barista — víkendy', ini: 'K', lg: '#5546C4',      // l.1122–1125
    msgs: [{ me: false, txt: 'Ahoj! Videli sme tvoj profil — kedy by si sa vedel zastaviť na skúšobnú zmenu?' },
           { me: true,  txt: 'Ahoj! Pokojne tento víkend, sobota ráno?' },
           { me: false, txt: 'Sobota 9:00 znie super. Laurinská 4, pýtaj si Petru.' }] }],
  activeChat: 0, draft: '',
  detail: null, toast: '', banner: false, bannerName: '',
  // company side — l.1127–1137
  fchats: [{ candId: 1, name: 'Marek K.', job: 'Barista — víkendy', ini: 'MK', lg: 'linear-gradient(135deg,#5546C4,#9F8FF2)',
    msgs: [{ me: true,  txt: 'Dobrý deň Marek, váš profil nám sedí na víkendové zmeny. Máte čas tento týždeň na krátky hovor?' },
           { me: false, txt: 'Dobrý deň! Áno, vo štvrtok poobede alebo v piatok kedykoľvek.' }] }],
  activeFChat: 0, fdraft: '', aiNote: '', contacted: [], blocked: [], delIdx: null, only18: false,
  fT: '', fPay: '', fNeed: '', fTypes: [],
  // student onboarding + profile (l.1116, 1118)
  obStep: 1, obName: '', obSkills: [], customSkill: '', obHours: 1, availDays: ['So', 'Ne'], availTimes: ['Poobede'],
  profEdit: false, birth: '2006-03-14',
  bio: 'Študent FIIT, hľadám brigády popri škole — najradšej víkendy. Rýchlo sa učím a nevadí mi fyzická práca.',
  // company registration + profile (seeded from registration, l.1486–1488)
  fobStep: 1, fobName: '', fobIco: '', fobLogo: '', fobFields: [], fobContact: '', fobEmail: '', fobPass: '', fobTerms: false,
  fpName: 'Kavey Coffee s.r.o.', fpLogo: '', fpVerified: true,
  fpDesc: 'Specialty kaviareň v centre. Mladý tím, väčšina študenti — zmeny si plánuješ podľa rozvrhu.',
  offers: [{ t: 'Barista — víkendy',       pay: '7,50 € / hod', views: 412, likes: 38, m: 6, need: 2, on: true  },   // l.1133–1135
           { t: 'Hosteska — letné eventy', pay: '9 € / hod',    views: 230, likes: 21, m: 3, need: 8, on: true  },
           { t: 'Skladová výpomoc',        pay: '8,20 € / hod', views: 145, likes: 9,  m: 1, need: 5, on: false }],
});
let state = initialState();
let order = shuffle();                                   // l.1241: guests see a shuffled feed
let loadT, toastT, bannerT;

function shuffle() { return JOBS.map(j => j.id).sort(() => Math.random() - .5); }
const isStudent = () => state.role === 'student';

// ═══════════ Actions ═══════════
function startLoad(ms) {                                 // l.1143–1147: skeleton while "loading"
  clearTimeout(loadT);
  state.loading = true; render();
  loadT = setTimeout(() => { state.loading = false; render(); }, ms || 900);
}
function showToast(msg) {                                // l.1148–1152
  clearTimeout(toastT);
  state.rowMenu = null; state.toast = msg; render();
  toastT = setTimeout(() => { state.toast = ''; render(); }, 2600);
}
function act(job, dir) {                                 // l.1219–1235
  if (!state.authed && dir === 'like') { state.gate = true; state.pendingJob = job; state.detail = null; render(); return; }
  if (state.handled.includes(job.id)) return;
  state.handled.push(job.id); state.viewed++;
  if (dir === 'like') {
    state.liked++; state.likedIds.push(job.id);
    if (job.match && !state.matches.some(m => m.jobId === job.id)) {
      state.matches.push({ jobId: job.id, name: job.f.split(' · ')[0], job: job.t, ini: job.ini, lg: job.lg,
        msgs: [{ me: false, txt: 'Ahoj! Tvoj profil nám sedí — kedy máš čas na krátky call?' }] });
      state.banner = true; state.bannerName = job.f.split(' · ')[0];
      clearTimeout(bannerT); bannerT = setTimeout(() => { state.banner = false; render(); }, 3500);
    }
  }
  render();
}
function enterApp(extra) {                               // shared by login and both onboardings
  const pj = state.pendingJob;
  Object.assign(state, { screen: 'app', authed: true, pendingJob: null }, extra);
  startLoad();
  if (pj) setTimeout(() => act(pj, 'like'), 40);         // l.1498–1503: send the interest that hit the gate
}

const go = {
  // entry — l.1447–1450, 1498–1504
  doLogin:     () => enterApp(),
  goRegister:  () => { state.screen = 'pick'; state.obStep = 1; state.fobStep = 1; },
  goSignup:    () => { state.screen = 'pick'; state.obStep = 1; state.fobStep = 1; },
  goFirmReg:   () => { state.screen = 'fob'; state.role = 'firm'; state.fobStep = 1; },
  pickStudent: () => { state.screen = 'ob';  state.role = 'student'; state.obStep = 1; },
  pickFirm:    () => { state.screen = 'fob'; state.role = 'firm'; state.fobStep = 1; },
  goLogin:     () => { state.screen = 'login'; },
  // gate — l.1444–1446
  gateClose:   () => { state.gate = false; state.pendingJob = null; },
  gateLogin:   () => { state.gate = false; state.screen = 'login'; },
  gateSignup:  () => { state.gate = false; state.screen = 'pick'; state.obStep = 1; state.fobStep = 1; },
  // account menu — l.1515–1524
  menuToggle:  () => { state.accMenu = !state.accMenu; },
  menuProfile: () => { if (isStudent()) state.tab = 2; else state.ftab = 3; state.accMenu = false; },
  menuClose:   () => { state.accMenu = false; },
  menuNotif:   () => { state.notifOn = !state.notifOn; },
  logout:      () => {                                   // l.1506–1514: clean guest view
    clearTimeout(bannerT); order = shuffle();
    state = initialState(); startLoad();
  },
  goNova:      () => { state.ftab = 9; },
  // feed — l.1577–1591
  resetDeck:   () => { state.handled = []; },
  aiOpen:      () => { state.detail = JOBS[3]; },
  closeDetail: () => { state.detail = null; },
  detailLike:  () => { const j = state.detail; state.detail = null; if (j) act(j, 'like'); },
  detailSkip:  () => { const j = state.detail; state.detail = null; if (j) act(j, 'skip'); },
  bannerGo:    () => { state.banner = false; state.tab = 1; },
  // profile — l.1616
  profEditToggle: () => { state.profEdit = !state.profEdit; },
  // chats — l.1689–1700, 1676–1687
  sendMsg:  () => sendMsg('matches', 'activeChat', 'draft', 'Super, dohodnuté! Ozveme sa s detailami.'),
  fSendMsg: () => sendMsg('fchats', 'activeFChat', 'fdraft', 'Ďakujem za správu! Ozvem sa hneď, ako budem vedieť.'),
  // new posting — l.1641–1642, 1653–1659
  set18All:  () => { state.only18 = false; },
  set18Only: () => { state.only18 = true; },
  publish:   () => {
    if (!state.fT.trim()) return;
    state.offers.unshift({ t: state.fT.trim(), pay: (state.fPay.trim() || '8') + ' € / hod', views: 0, likes: 0, m: 0,
      need: Math.max(1, parseInt(state.fNeed, 10) || 1), on: true });
    Object.assign(state, { fT: '', fPay: '', fNeed: '', fTypes: [], aiNote: '', ftab: 2 });
  },
  // delete confirm — l.1638–1639
  delCancel:  () => { state.delIdx = null; },
  delConfirm: () => { state.offers.splice(state.delIdx, 1); state.delIdx = null; showToast('Inzerát zmazaný.'); },
};

function sendMsg(listKey, idxKey, draftKey, reply) {
  const t = state[draftKey].trim();
  if (!t) return;
  const chat = state[listKey][state[idxKey]];
  if (!chat) return;
  chat.msgs.push({ me: true, txt: t });
  state[draftKey] = '';
  clearTimeout(replyT);
  replyT = setTimeout(() => { chat.msgs.push({ me: false, txt: reply }); render(); }, 1400);
}
let replyT;

// Every element with data-go="name" calls go[name] and re-renders.
document.body.addEventListener('click', e => {
  const el = e.target.closest('[data-go]');
  if (!el) return;
  e.stopPropagation();
  go[el.dataset.go](el);
  render();
});
// Close the account menu on any click elsewhere (l.1171–1172); close ⋯ menus on pointerdown outside (l.1155–1161).
document.addEventListener('click', () => { if (state.accMenu) { state.accMenu = false; render(); } });
document.addEventListener('pointerdown', e => {
  if (!state.rowMenu) return;
  if (e.target.closest('[data-rowmenu]')) return;
  state.rowMenu = null; render();
}, true);

// ═══════════ Render ═══════════
function render() {
  for (const s of ['app', 'login', 'pick', 'ob', 'fob']) document.getElementById('scr-' + s).hidden = state.screen !== s;
  if (state.screen === 'app') renderApp();
  if (state.screen === 'ob')  renderOb();
  if (state.screen === 'fob') renderFob();
}

// ─── APP ───
function renderApp() {
  renderHeader();
  const main = document.getElementById('a-main');
  if (state.loading) main.innerHTML = skeleton();
  else if (isStudent()) {
    main.innerHTML = [feed, zhody, profile][state.tab]();
    if (state.tab === 2 && state.profEdit) bindEditors();
  }
  else main.innerHTML = ({ 0: brig, 1: fspravy, 2: ponuky, 3: fprofil, 9: nova })[state.ftab]();
  bindAppInputs();
  document.getElementById('a-dock').innerHTML = state.authed ? dock() : '';
  document.getElementById('a-layers').innerHTML = layers();
}

function renderHeader() {                                // l.342–372
  const r = document.getElementById('a-hdr-right');
  if (!state.authed) {
    r.innerHTML = `<div class="a-guest">
      <button class="a-pill-ghost" data-go="goLogin">Prihlásiť sa</button>
      <button class="a-pill" data-go="goSignup">Vytvoriť účet</button></div>`;
    return;
  }
  const nova = !isStudent() ? `<button class="a-pill nova" data-go="goNova">＋ Nový inzerát</button>` : '';
  const menu = !state.accMenu ? '' : `
    <div class="a-menu" data-go="menuToggle">
      <div class="name">${esc(menuName())}</div><hr>
      <button data-go="menuProfile"><span class="ic">◔</span>Môj profil</button>
      <button data-go="menuClose"><span class="ic">⚙</span>Nastavenia</button>
      <button class="notif" data-go="menuNotif"><span style="display:flex;align-items:center;gap:10px"><span class="ic">◇</span>Notifikácie</span>
        <span class="st" style="color:${state.notifOn ? '#15803D' : '#6E688C'}">${state.notifOn ? 'Zap.' : 'Vyp.'}</span></button>
      <button data-go="menuClose"><span class="ic">?</span>Pomoc a podpora</button><hr>
      <button class="out" data-go="logout"><span class="ic">→</span>Odhlásiť sa</button>
    </div>`;
  r.innerHTML = `${nova}<div class="a-acc"><button class="a-ava" aria-label="Účet" data-go="menuToggle">${avaInit()}</button>${menu}</div>`;
}
// Menu items that only close the menu re-toggle it; make menuToggle on the menu container a no-op.
const _menuToggle = go.menuToggle;
go.menuToggle = el => { if (el.classList.contains('a-menu')) { state.accMenu = true; return; } _menuToggle(); };
go.menuNotif = el => { state.notifOn = !state.notifOn; state.accMenu = true; };

function menuName() { return isStudent() ? (state.obName || 'Marek Kováč') : state.fpName; }      // l.1517
function avaInit() {                                     // l.1532
  if (isStudent()) return initials();
  return state.fpName.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'F';
}

function skeleton() {                                    // l.377–403
  const card = `<div class="sk-card">
    <div style="display:flex;align-items:center;gap:14px"><div class="sk" style="width:44px;height:44px;border-radius:12px;flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px"><div class="sk" style="width:62%;height:16px;border-radius:6px"></div><div class="sk lt" style="width:44%;height:12px;border-radius:99px"></div></div></div>
    <div class="sk" style="width:34%;height:24px;border-radius:8px"></div>
    <div style="height:7px;border-radius:99px;background:#E9E5F4"></div>
    <div style="display:flex;gap:8px">${'<div class="sk xl" style="width:74px;height:26px;border-radius:99px"></div>'.repeat(3)}</div>
    <div class="sk" style="height:44px;border-radius:12px"></div></div>`;
  return `<div class="a-wrap" aria-busy="true">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px"><div class="sk" style="width:236px;height:26px;border-radius:8px"></div><div class="sk" style="width:132px;height:13px;border-radius:99px"></div></div>
    <div class="cards" style="grid-template-columns:repeat(2,1fr);gap:20px">${card.repeat(4)}</div></div>`;
}

// l.1313
const needTxt = j => { const free = j.need - (j.taken || 0); return `Voľné ${free} / ${j.need} ${j.need === 1 ? 'pozície' : 'pozícií'}`; };

function remaining() {                                   // l.1243–1245
  return JOBS.filter(j => !state.handled.includes(j.id) || state.likedIds.includes(j.id))
    .filter(j => !state.blockedFirms.includes(j.f))
    .sort(state.authed ? (a, b) => b.score - a.score : (a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

function feed() {                                        // l.408–475
  const list = remaining();
  const ai = JOBS[3];
  const tip = state.viewed < 2 ? '' : `
    <div class="ai-tip">
      <div class="eb">✦ Toto by ti sedelo</div>
      <div class="mid"><div class="lg" style="background:${ai.lg}">${ai.ini}</div>
        <div><div class="t">${esc(ai.t)}</div><div class="f">${esc(ai.f.split(' · ')[0])} · <b>${ai.pay}/hod</b></div></div></div>
      <button data-go="aiOpen">Pozrieť detail</button>
    </div>`;
  const cards = list.length ? `<div class="cards">${list.map(jobCard).join('')}</div>` : `
    <div class="deck-empty">
      <div class="h">Na dnes si videl <b>všetko</b></div>
      <p>Robiq medzitým aktívne hľadá ďalšie ponuky, ktoré ti sadnú. Vráť sa večer.</p>
      <button data-go="resetDeck">Prezrieť znova</button>
    </div>`;
  return `<div class="a-wrap">
    <div class="a-title"><h2>Ponuky <b>pre teba</b></h2>${state.authed ? '<span class="sorted">✦ zoradené podľa zhody s tvojím profilom</span>' : ''}</div>
    ${tip}${cards}</div>`;
}

function jobCard(j) {                                    // l.425–463
  const liked = state.likedIds.includes(j.id);
  const pct = Math.round((j.need - (j.taken || 0)) / j.need * 100);
  const menu = state.rowMenu !== 'j' + j.id ? '' : `
    <div class="row-menu" data-rowmenu="1">
      <button data-job="${j.id}" data-act="report">Nahlásiť inzerát</button>
      <button class="danger" data-job="${j.id}" data-act="block">Zablokovať firmu</button>
    </div>`;
  return `<div class="job">
    <div class="top"><div class="posted">${esc(j.posted)}</div>
      <div class="more"><button class="dots-btn" data-rowmenu="1" aria-label="Ďalšie možnosti" data-job="${j.id}" data-act="menu">⋯</button>${menu}</div></div>
    <div class="who" data-job="${j.id}" data-act="open">
      <div class="lg" style="background:${j.lg}">${j.ini}</div>
      <div style="flex:1;min-width:0"><div class="t">${esc(j.t)}</div><div class="f">${esc(j.f)}</div>
        <div class="rat"><b>★ ${j.rat}</b> (${j.ratN} hodnotení)</div></div>
    </div>
    <div class="pay">${j.pay} <small>/ hod</small></div>
    <div class="need"><span>${needTxt(j)}</span><span class="bar"><i style="width:${pct}%"></i></span></div>
    <div class="tags">${j.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>
    <div class="start">Nástup <b>${esc(j.start)}</b></div>
    ${liked ? `<div class="sent">✓ Záujem odoslaný</div>` : `
    <div class="act"><button class="like" data-job="${j.id}" data-act="like">♥ Mám záujem</button>
      <button class="skip" aria-label="Preskočiť" data-job="${j.id}" data-act="skip">✕</button></div>`}
  </div>`;
}

function profile() {                                     // l.515–635
  const s = state;
  const skills = (s.obSkills.length ? s.obSkills : [{ n: 'Barista', lvl: 2 }, { n: 'Eventy', lvl: 2 }, { n: 'Angličtina', lvl: 3 }])   // l.1610
    .map(x => LANGS.includes(x.n)
      ? { n: x.n, dots: LANG_LVLS[x.lvl - 1] + (x.speak !== false ? ' · rozprávam' : '') }
      : { n: x.n, dots: '●'.repeat(x.lvl) + '○'.repeat(3 - x.lvl) });
  const interests = s.likedIds.map(id => JOBS.find(j => j.id === id)).filter(Boolean).map(j => {   // l.1420–1426
    const matched = s.matches.some(m => m.jobId === j.id);
    return { ...j, firm: j.f.split(' · ')[0], status: matched ? '✓ Zhoda' : 'Čaká na odpoveď',
      stBg: matched ? 'rgba(21,128,61,.12)' : 'rgba(36,27,69,.07)', stFg: matched ? '#15803D' : '#6E688C' };
  });

  const view = `
    ${s.bio.trim() ? `<div class="p-sec tight">O mne</div><p class="p-bio">${esc(s.bio)}</p>` : ''}
    <div class="p-sec">Zručnosti</div>
    <div class="p-skills">${skills.map(k => `<span class="p-skill">${esc(k.n)} <b>${esc(k.dots)}</b></span>`).join('')}</div>`;

  const edit = `<div class="compact">
    <div class="p-birth"><div class="l">Dátum narodenia</div><input type="date" id="p-birth" value="${esc(s.birth)}"></div>
    <div class="p-bio-edit"><div class="label" style="margin-bottom:8px">Bio</div>
      <textarea id="p-bio" rows="3" maxlength="240" placeholder="Napíš pár viet o sebe — čo študuješ, čo ťa baví, kedy máš čas…">${esc(s.bio)}</textarea></div>
    <div class="p-sec">Tvoje zručnosti — nastav úroveň</div>
    ${skillsEditor()}
    <div class="p-sec" style="margin-bottom:10px">Dostupnosť</div>
    ${availabilityEditor()}
  </div>`;

  return `<div class="prof">
    <div class="pcard">
      <div class="p-head">
        <div class="p-ava">${initials()}</div>
        <div style="flex:1;min-width:0"><div class="p-name">${esc(s.obName.trim() || 'Tomáš Novák')}</div><div class="p-sub">Študent · <span id="p-hours">${HOURS[s.obHours]}</span></div></div>
        <button class="p-edit" data-go="profEditToggle">${s.profEdit ? '✓ Hotovo' : 'Upraviť'}</button>
      </div>
      ${s.profEdit ? edit : view}
      <div class="p-stats">
        <div><div class="n">${s.viewed}</div><div class="l">prezreté</div></div>
        <div><div class="n">${s.liked}</div><div class="l">záujmy</div></div>
        <div><div class="n">${s.matches.length}</div><div class="l">zhody</div></div>
      </div>
    </div>
    <div class="pcard sm">
      <div class="p-int-head"><div class="t">Moje <b>záujmy</b></div><span class="s">na čo si klikol „Mám záujem"</span></div>
      ${interests.length ? `<div class="p-int">${interests.map(it => `
        <div class="p-int-row"><div class="lg" style="background:${it.lg}">${it.ini}</div>
          <div style="flex:1;min-width:0"><div class="t">${esc(it.t)}</div><div class="f">${esc(it.firm)} · <b>${it.pay}/hod</b></div></div>
          <span class="st" style="background:${it.stBg};color:${it.stFg}">${it.status}</span></div>`).join('')}</div>`
      : `<div class="p-empty">Zatiaľ žiadne. Prejdi na <b>Objavuj</b> a označ ponuky, ktoré ťa zaujali.</div>`}
    </div>
  </div>`;
}

// Card actions — l.1577–1584; skill / availability toggles inside the profile editor
document.getElementById('a-main').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (btn && !btn.dataset.act && editorClick(btn)) return;
  if (btn && btn.dataset.chat !== undefined) {                                // chat list — l.1338, 1602
    if (isStudent()) state.activeChat = +btn.dataset.chat; else state.activeFChat = +btn.dataset.chat;
    render(); return;
  }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const d = el.dataset, a = d.act;

  if (d.job) {                                                                 // feed cards — l.1577–1584
    const j = JOBS.find(x => x.id === +d.job);
    if (a === 'open')   { state.detail = j; render(); }
    if (a === 'like')   act(j, 'like');
    if (a === 'skip')   act(j, 'skip');
    if (a === 'menu')   { state.rowMenu = state.rowMenu === 'j' + j.id ? null : 'j' + j.id; render(); }
    if (a === 'report') showToast('Inzerát sme nahlásili — pozrieme sa na to.');
    if (a === 'block')  { state.blockedFirms.push(j.f); showToast('Firmu sme skryli z tvojho feedu.'); }
  }
  else if (d.cand) {                                                           // candidates — l.1342–1364
    const c = CANDS.find(x => x.id === +d.cand);
    if (a === 'menu')   { state.rowMenu = state.rowMenu === 'c' + c.id ? null : 'c' + c.id; render(); }
    if (a === 'report') showToast('Profil sme nahlásili — pozrieme sa na to.');
    if (a === 'block')  { state.blocked.push(c.id); showToast('Profil zablokovaný.'); }
    if (a === 'contact') {
      if (!state.authed) { state.gate = true; render(); return; }
      state.contacted.push(c.id);
      if (!state.fchats.some(f => f.candId === c.id))
        state.fchats.push({ candId: c.id, name: c.n, job: c.offer, ini: c.ini, lg: c.g,
          msgs: [{ me: true, txt: `Dobrý deň, váš profil nás zaujal — máte záujem o pozíciu ${c.offer}?` }] });
      render();
    }
  }
  else if (d.offer) {                                                          // company postings — l.1372–1383
    const i = +d.offer, o = state.offers[i];
    if (a === 'toggle') { o.on = !o.on; render(); }
    if (a === 'menu')   { state.rowMenu = state.rowMenu === 'o' + i ? null : 'o' + i; render(); }
    if (a === 'dup')    { state.offers.splice(i + 1, 0, { ...o, t: o.t + ' (kópia)', views: 0, likes: 0, m: 0 }); showToast('Inzerát zduplikovaný.'); }
    if (a === 'askDel') { state.rowMenu = null; state.delIdx = i; render(); }
  }
  else if (a === 'type') { toggleInList(state.fTypes, d.type); render(); }    // posting type chips — l.1297–1302
});

// ─── Chat (shared by Zhody and Správy firmy) — l.482–511 / 712–741 ───
function chatUI(list, active, isFirm) {
  const cur = list[Math.min(active, list.length - 1)] || list[0];
  const lgCls = isFirm ? 'lg round' : 'lg';
  const items = list.map((m, i) => `
    <button class="${i === active ? 'on' : ''}" data-chat="${i}">
      <div class="${lgCls}" style="background:${m.lg}">${m.ini}</div>
      <div><div class="n">${esc(m.name)}</div><div class="j">${esc(m.job)}</div></div>
    </button>`).join('');
  const head = !cur ? '' : `
    <div class="chat-head"><div class="${lgCls}" style="background:${cur.lg}">${cur.ini}</div>
      <div><div class="n">${esc(cur.name)}</div>
        <div class="j ${isFirm ? 'firm' : ''}">${isFirm ? 'Uchádzač · ' : '✓ Zhoda · '}${esc(cur.job)}</div></div></div>`;
  const msgs = (cur ? cur.msgs : []).map(m => `<div class="msg ${m.me ? 'me' : 'them'}">${esc(m.txt)}</div>`).join('');
  return `<div class="chat">
    <div class="chat-list">${items}</div>
    <div class="chat-box">${head}
      <div class="chat-msgs" id="chat-msgs">${msgs}</div>
      <div class="chat-input"><input id="chat-draft" placeholder="Napíš správu…" value="${esc(isFirm ? state.fdraft : state.draft)}">
        <button data-go="${isFirm ? 'fSendMsg' : 'sendMsg'}">Odoslať</button></div>
    </div></div>`;
}
function zhody() {                                       // l.478–513
  return `<div class="chat-wrap">
    <div class="a-title"><h2>Tvoje <b>správy</b></h2><span class="sub">každý chat = obojstranný záujem</span></div>
    ${chatUI(state.matches, state.activeChat, false)}</div>`;
}
function fspravy() {                                     // l.708–743
  return `<div class="chat-wrap">
    <div class="a-title"><h2>Vaše <b>správy</b></h2><span class="sub">konverzácie s uchádzačmi</span></div>
    ${chatUI(state.fchats, state.activeFChat, true)}</div>`;
}

// ─── Brigádnici — l.637–706, logic l.1342–1370 ───
function brig() {
  const s = state;
  let body;
  if (!s.authed) body = `<div class="gate-card"><div class="ic">◎</div>
      <div class="h">Profily brigádnikov sú len pre prihlásené firmy</div>
      <div class="p">Chránime súkromie ľudí — ich profily uvidíte po prihlásení firemného účtu.</div>
      <div class="col"><button class="gate-b1 b1" data-go="goSignup" style="width:100%;background:#40319F;color:#fff;border:none;border-radius:13px;padding:13px 0;font-size:14px;font-weight:700;cursor:pointer">Vytvoriť firemný účet</button>
        <button data-go="goLogin" style="width:100%;background:transparent;color:#40319F;border:1px solid rgba(64,49,159,.35);border-radius:13px;padding:12px 0;font-size:14px;font-weight:700;cursor:pointer">Už mám účet — prihlásiť sa</button></div></div>`;
  else if (s.offers.length === 0) body = `<div class="empty-card narrow">
      <div class="h">Zatiaľ nie sú koho ukázať</div>
      <div class="p">Pridajte prvý inzerát — kandidátov začneme párovať hneď po zverejnení.</div>
      <button class="btn-violet" data-go="goNova">＋ Nový inzerát</button></div>`;
  else {
    const offerNames = s.offers.map(o => o.t);
    const visible = CANDS.filter(c => (!s.only18 || c.adult) && offerNames.includes(c.offer) && !s.blocked.includes(c.id));
    const groups = [...new Set(visible.map(c => c.offer))].map(off => {
      const cands = visible.filter(c => c.offer === off).sort((a, b) => b.score - a.score);
      const count = cands.length + (cands.length === 1 ? ' kandidát' : cands.length < 5 ? ' kandidáti' : ' kandidátov');
      return `<div class="cgroup"><div class="cgroup-head"><div class="t">${esc(off)}</div><span class="c">${count}</span></div>
        <div class="cards">${cands.map(candCard).join('')}</div></div>`;
    });
    body = groups.join('');
  }
  const has = s.authed && s.offers.length > 0;
  return `<div class="a-wrap">
    <div class="a-title" style="align-items:center"><h2>Ponuka <b>brigádnikov</b></h2>${has ? '<span class="sorted">✦ zoradené podľa AI zhody s vašimi ponukami</span>' : ''}</div>
    ${body}</div>`;
}
function candCard(c) {                                   // l.674–699
  const done = state.contacted.includes(c.id), authed = state.authed;
  const menu = state.rowMenu !== 'c' + c.id ? '' : `
    <div class="row-menu w186" data-rowmenu="1">
      <button data-cand="${c.id}" data-act="report">Nahlásiť profil</button>
      <button class="danger" data-cand="${c.id}" data-act="block">Zablokovať</button></div>`;
  return `<div class="cand">
    <div class="top">
      <div class="av" style="background:${c.g}"><span style="filter:${authed ? 'none' : 'blur(9px)'}">${authed ? c.ini : '●●'}</span></div>
      <div><div class="n">${esc(authed ? c.n : c.n.split(' ')[0])}</div>
        <div class="s">${authed ? `${esc(c.school)} · ${esc(c.hrs)}` : `${esc(c.hrs)} · <span class="muted">detaily po prihlásení</span>`}</div>
        <div class="r"><b>★ ${c.rat}</b> (${c.ratN} hodnotení)</div></div>
      <div class="more"><button class="dots-btn" data-rowmenu="1" aria-label="Ďalšie možnosti" data-cand="${c.id}" data-act="menu">⋯</button>${menu}</div>
    </div>
    <div class="skills">${c.skills.map(k => `<span>${esc(k)}</span>`).join('')}</div>
    ${done ? `<div class="sent">✓ Záujem odoslaný</div>` : `<button class="contact" data-cand="${c.id}" data-act="contact">♥ Prejaviť záujem</button>`}
  </div>`;
}

// ─── Ponuky firmy — l.745–791, logic l.1372–1383, 1415–1418 ───
const sums = () => ({
  active: state.offers.filter(o => o.on).length,
  views: state.offers.reduce((a, o) => a + o.views, 0),
  likes: state.offers.reduce((a, o) => a + o.likes, 0),
  m: state.offers.reduce((a, o) => a + o.m, 0),
});
function ponuky() {
  const S = sums();
  const rows = state.offers.map((o, i) => {
    const menu = state.rowMenu !== 'o' + i ? '' : `
      <div class="row-menu w186" data-rowmenu="1">
        <button data-offer="${i}" data-act="dup">Duplikovať</button>
        <button class="danger" data-offer="${i}" data-act="askDel">Zmazať inzerát</button></div>`;
    return `<div class="offer ${o.on ? '' : 'off'}">
      <div><div class="t">${esc(o.t)}</div><div class="pay">${esc(o.pay)}</div></div>
      <div class="stat"><div class="n">${o.views}</div><div class="l">zobrazenia</div></div>
      <div class="stat"><div class="n">${o.likes}</div><div class="l">záujmy</div></div>
      <div class="stat"><div class="n green">${o.m}</div><div class="l">zhody</div></div>
      <div class="stat"><div class="n">${Math.min(o.m, o.need || 1)} / ${o.need || 1}</div><div class="l">obsadené</div></div>
      <span class="st ${o.on ? 'on' : 'paused'}">${o.on ? 'Aktívna' : 'Pozastavená'}</span>
      <div class="act"><button class="tg" data-offer="${i}" data-act="toggle">${o.on ? 'Pozastaviť' : 'Aktivovať'}</button>
        <div class="more"><button class="dots-btn" data-rowmenu="1" aria-label="Ďalšie možnosti" data-offer="${i}" data-act="menu">⋯</button>${menu}</div></div>
    </div>`;
  }).join('');
  return `<div class="off-wrap">
    <div class="a-title" style="justify-content:space-between"><h2>Vaše <b>inzeráty</b></h2></div>
    <div class="off-stats">
      <div><div class="n">${S.active}</div><div class="l">aktívne inzeráty</div></div>
      <div><div class="n">${S.views}</div><div class="l">zobrazenia spolu</div></div>
      <div><div class="n">${S.likes}</div><div class="l">záujmy spolu</div></div>
      <div><div class="n green">${S.m}</div><div class="l">zhody spolu</div></div>
    </div>
    ${state.offers.length ? '' : `<div class="empty-card">
      <div class="h">Zatiaľ nemáte žiadny inzerát</div>
      <div class="p">Pridajte prvý — kandidátov vám Robiq začne párovať hneď po zverejnení.</div>
      <button class="btn-violet" data-go="goNova">＋ Nový inzerát</button></div>`}
    <div class="off-list">${rows}</div></div>`;
}

// ─── Nová ponuka — l.793–828, logic l.1297–1302, 1430, 1640–1659 ───
function nova() {
  const s = state;
  return `<div class="nova-wrap">
    <h2>Nový <b>inzerát</b></h2>
    <p class="desc">Robiq ju aktívne doručí študentom, ktorí sedia na profil pozície.</p>
    <div class="form-card">
      <div><div class="label">Názov pozície</div><input class="input" id="f-t" placeholder="napr. Barista — víkendy" value="${esc(s.fT)}"></div>
      <div class="two">
        <div><div class="label">Hodinová sadzba (€)</div><input class="input" id="f-pay" placeholder="napr. 8,50" value="${esc(s.fPay)}"></div>
        <div><div class="label">Koľko ľudí hľadáte?</div><input class="input" id="f-need" type="number" min="1" placeholder="napr. 3" value="${esc(s.fNeed)}"></div>
      </div>
      <div><div class="label">Vek kandidátov</div>
        <div class="seg"><button class="${s.only18 ? '' : 'on'}" data-go="set18All">Bez obmedzenia</button><button class="${s.only18 ? 'on' : ''}" data-go="set18Only">Len 18+</button></div>
        <div class="note">Platí pre tento inzerát — kandidáti mladší ako 18 ho neuvidia.</div></div>
      <div><div class="label" style="margin-bottom:10px">Typ brigády</div>
        <div class="tchips">${TYPES.map(t => `<button class="tchip ${s.fTypes.includes(t) ? 'on' : ''}" data-type="${t}" data-act="type">${t}</button>`).join('')}</div></div>
      <div><div class="label" style="margin-bottom:4px">✦ Povedzte AI, koho hľadáte</div>
        <div class="ai-sub">Vlastnými slovami — AI podľa toho vyberie a zoradí kandidátov pre tento inzerát.</div>
        <textarea id="f-ai" rows="3" placeholder="napr. Potrebujem niekoho komunikatívneho na ranné zmeny, ideálne so skúsenosťou z gastra. Výhodou angličtina kvôli turistom…">${esc(s.aiNote)}</textarea></div>
      <div class="tip"><b>Tip:</b> pridajte 3 fotky „deň v práci" — reálne zábery z prevádzky zvyšujú záujem pracovníkov.</div>
      <button class="publish" id="f-publish" data-go="publish" style="opacity:${s.fT.trim() ? 1 : .45}">Zverejniť ponuku</button>
    </div></div>`;
}

// ─── Firemný profil + kalendár — l.830–913, logic l.1384–1418 ───
function fprofil() {
  const s = state, S = sums();
  return `<div class="fprof">
    <div class="pcard">
      <div class="p-head">
        <label class="fp-logo" id="fp-logo" title="Zmeniť logo" style="background-image:${s.fpLogo ? `url(${s.fpLogo})` : 'none'}">
          <span style="display:${s.fpLogo ? 'none' : 'block'}">${avaInit()}</span><input type="file" accept="image/*" id="fp-file"></label>
        <div style="flex:1;min-width:0"><div class="p-name">${esc(s.fpName)}</div>
          <div class="fp-badges">${s.fpVerified ? '<span class="badge-ok">✓ Overená firma</span>' : '<span class="badge-pending">◷ Overenie prebieha</span>'}</div></div>
      </div>
      <div class="fp-fields">
        <div><div class="label">Názov firmy</div><input class="input" id="fp-name" value="${esc(s.fpName)}"></div>
        <div><div class="label">O firme — uvidia to študenti na karte</div><textarea id="fp-desc" rows="3">${esc(s.fpDesc)}</textarea></div>
      </div>
      <div class="p-stats">
        <div><div class="n">${S.active}</div><div class="l">aktívne inzeráty</div></div>
        <div><div class="n green">${S.m}</div><div class="l">zhody spolu</div></div>
        <div><div class="n">~2 h</div><div class="l">čas odpovede</div></div>
      </div>
    </div>
    <div class="tip r16"><b>Tip:</b> firmy s vyplneným profilom a fotkami majú o 40 % viac zhôd. Študent vidí profil pri každej vašej ponuke.</div>
  </div>`;
}

// Text fields on app screens: update state while typing, no re-render (keeps the caret).
function bindAppInputs() {
  const on = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
  on('chat-draft', el => {
    const key = isStudent() ? 'draft' : 'fdraft';
    el.addEventListener('input', () => { state[key] = el.value; });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { go[isStudent() ? 'sendMsg' : 'fSendMsg'](); render(); } });
  });
  on('chat-msgs', el => { el.scrollTop = el.scrollHeight; });                 // l.1598
  on('f-t',    el => el.addEventListener('input', () => { state.fT = el.value; document.getElementById('f-publish').style.opacity = el.value.trim() ? 1 : .45; }));
  on('f-pay',  el => el.addEventListener('input', () => { state.fPay = el.value; }));
  on('f-need', el => el.addEventListener('input', () => { state.fNeed = el.value; }));
  on('f-ai',   el => el.addEventListener('input', () => { state.aiNote = el.value; }));
  on('fp-name', el => { el.addEventListener('input', () => { state.fpName = el.value; }); el.addEventListener('change', render); });
  on('fp-desc', el => el.addEventListener('input', () => { state.fpDesc = el.value; }));
  on('fp-file', el => el.addEventListener('change', e => {                      // l.1628–1632
    const f = e.target.files && e.target.files[0]; if (!f) return;
    state.fpLogo = URL.createObjectURL(f); render();
  }));
}

function dock() {                                        // l.929–941, logic l.1308–1326
  const tabs = isStudent() ? STUDENT_TABS : FIRM_TABS;
  const active = isStudent() ? state.tab : (state.ftab === 9 ? 2 : state.ftab);
  const n = tabs.length;
  const notchLeft = ((active * 2 + 1) / (2 * n) * 430 - 37).toFixed(1) + 'px';
  return `<div class="dock">
    <div class="bg" style="-webkit-mask-position:${notchLeft} -38px, 0 0; mask-position:${notchLeft} -38px, 0 0"></div>
    <div class="tabs">${tabs.map(([label, glyph], i) => `
      <button class="${i === active ? 'on' : ''}" data-tab="${i}"><span class="glyph">${glyph}</span><span class="lbl">${label}</span></button>`).join('')}</div>
  </div>`;
}
document.getElementById('a-dock').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  const i = +b.dataset.tab;
  const active = isStudent() ? state.tab : (state.ftab === 9 ? 2 : state.ftab);
  if (i === active) return;
  if (isStudent()) state.tab = i; else state.ftab = i;
  startLoad();
});

function layers() {                                      // banner l.946, toast l.954, gate l.972, detail l.988
  let h = '';
  if (state.banner) h += `<div class="banner" role="status"><div class="ok">✓</div>
    <div><b>Máte zhodu!</b><span class="s">${esc(state.bannerName)} má o teba záujem.</span></div>
    <button data-go="bannerGo">Napísať správu</button></div>`;
  if (state.toast) h += `<div class="toast">${esc(state.toast)}</div>`;
  if (state.delIdx !== null && state.offers[state.delIdx]) h += `<div class="overlay del" data-go="delCancel"><div class="delm" data-go="noop">
    <div class="h">Zmazať „${esc(state.offers[state.delIdx].t)}"?</div>
    <div class="p">Inzerát aj jeho zhody sa nedajú vrátiť. Ak ho chcete len stiahnuť, použite Pozastaviť.</div>
    <div class="col"><button class="b1" data-go="delConfirm">Zmazať natrvalo</button><button class="b2" data-go="delCancel">Zrušiť</button></div></div></div>`;
  if (state.gate) h += `<div class="overlay" data-go="gateClose"><div class="gate" data-go="noop">
    <div class="ic">♥</div>
    <div class="h">Ešte krôčik — potrebujeme vedieť, kto si</div>
    <div class="p">Bez účtu nevieme komu ponuku priradiť. Registrácia trvá pár sekúnd a tvoj záujem odošleme hneď po nej.</div>
    <div class="col"><button class="b1" data-go="gateSignup">Vytvoriť účet</button>
      <button class="b2" data-go="gateLogin">Už mám účet — prihlásiť sa</button>
      <button class="b3" data-go="gateClose">Zrušiť</button></div></div></div>`;
  const d = state.detail;
  if (d) h += `<div class="overlay detail" data-go="closeDetail"><div class="dmodal" data-go="noop">
    <div class="top"><div class="who"><div class="lg" style="background:${d.lg}">${d.ini}</div>
      <div><div class="t">${esc(d.t)}</div><div class="f">${esc(d.f)} · <b>★ ${d.rat}</b> (${d.ratN} hodnotení)</div></div></div>
      <button class="x" data-go="closeDetail">✕</button></div>
    <div class="chips">${d.badges.map(b => `<span class="badge">${esc(b)}</span>`).join('')}${d.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
    <div class="payrow"><div class="pay">${d.pay} <small>/ hod</small></div><span class="need">${needTxt(d)}</span></div>
    <p>${esc(d.desc)}</p>
    <div class="sec">Icebreakery</div>
    <div class="ice">${d.ice.map(i => `<div>${esc(i)}</div>`).join('')}</div>
    <div class="sec">Deň v práci</div>
    <div class="day"><div>foto 1</div><div>foto 2</div><div>foto 3</div></div>
    <div class="act"><button class="like" data-go="detailLike">♥ Mám záujem</button><button class="skip" data-go="detailSkip">✕ Preskočiť</button></div>
  </div></div>`;
  return h;
}
go.noop = () => {};                                      // clicks inside a modal don't close it (l.1668 `stop`)

// README: top bar hides on scroll down and returns on scroll up.
(() => {
  const c = document.getElementById('a-content'), hdr = document.getElementById('a-hdr');
  let last = 0;
  c.addEventListener('scroll', () => {
    const y = c.scrollTop;
    hdr.classList.toggle('hide', y > last && y > 80);
    last = y;
  });
})();

// ─── OB ───
document.getElementById('ob-back').addEventListener('click', () => { if (state.obStep > 1) state.obStep--; else state.screen = 'pick'; render(); });
document.getElementById('ob-next').addEventListener('click', () => {           // l.1566–1570
  if (state.obStep === 2 && state.obSkills.length < 1) return;
  if (state.obStep < 3) { state.obStep++; render(); }
  else enterApp({ tab: 0 });
});
function renderOb() {
  document.getElementById('ob-no').textContent = state.obStep;
  [...document.getElementById('ob-dots').children].forEach((d, i) => d.classList.toggle('on', state.obStep >= i + 1));
  const next = document.getElementById('ob-next');
  next.textContent = state.obStep === 3 ? 'Hotovo — pozri ponuky' : 'Pokračovať';
  next.style.opacity = (state.obStep === 2 && state.obSkills.length < 1) ? .45 : 1;
  if (state.obStep === 1) obStep1();
  if (state.obStep === 2) obStep2();
  if (state.obStep === 3) obStep3();
}
const obEl = document.getElementById('ob-step');
function obStep1() {                                     // l.111–119
  obEl.innerHTML = `
    <h2>Ako sa <b>voláš?</b></h2>
    <p class="desc" style="margin-bottom:26px">Žiadne CV, žiadny motivačný list. Stačí meno a fotka.</p>
    <div class="s1-row"><div class="avatar" id="avatar">${initials()}</div>
      <div class="col"><input class="input" id="ob-name" placeholder="Meno a priezvisko" value="${esc(state.obName)}">
        <button class="photo-btn" type="button">Nahrať fotku (voliteľné)</button></div></div>`;
  const nameEl = document.getElementById('ob-name');
  nameEl.addEventListener('input', () => { state.obName = nameEl.value; document.getElementById('avatar').textContent = initials(); });
  obEl.onclick = null;
}
function initials() {                                    // l.1247–1248
  const name = state.obName.trim() || 'Tomáš Novák';
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function obStep2() {                                     // l.123–162
  obEl.innerHTML = `
    <h2>Čo ti <b>ide?</b></h2>
    <p class="desc" style="margin-bottom:22px">Vyber si koľko chceš — a pri každej nastav, ako dobre ju ovládaš. Robiq sa učí z každého kliku.</p>
    ${skillsEditor()}`;
  obEl.onclick = e => { const el = e.target.closest('button'); if (el) editorClick(el); };
  bindEditors();
}
function obStep3() {                                     // l.166–188
  obEl.innerHTML = `
    <h2>Koľko hodín <b>máš?</b></h2>
    <p class="desc" style="margin-bottom:30px">Ponuky uvidíš len podľa svojej reálnej dostupnosti.</p>
    <div class="hours-label" id="hours-label">${HOURS[state.obHours]}</div>
    ${availabilityEditor()}`;
  obEl.onclick = e => { const el = e.target.closest('button'); if (el) editorClick(el); };
  bindEditors();
}

// ─── Shared editors: used by onboarding steps 2–3 and by the profile in edit mode ───
function skillsEditor() {                                // l.126–162, logic l.1256–1296
  const selNames = state.obSkills.map(x => x.n);
  const rows = state.obSkills.map((x, i) => {
    const isLang = LANGS.includes(x.n), speakOn = x.speak !== false;
    const lvls = (isLang ? LANG_LVLS : LVLS).map((L, li) => `<button type="button" class="${x.lvl === li + 1 ? 'on' : ''}" data-lvl="${i}:${li + 1}">${L}</button>`).join('');
    return `<div class="sel-row"><div class="sel-name">${esc(x.n)}</div>
      <button type="button" class="speak ${speakOn ? 'on' : ''}" data-speak="${i}" style="display:${isLang ? 'inline-block' : 'none'}">${speakOn ? '✓ Rozprávam' : 'Rozprávam'}</button>
      <div class="lvls">${lvls}</div><button type="button" class="remove" aria-label="Odstrániť" data-remove="${i}">✕</button></div>`;
  }).join('');
  const groups = GROUPS.map(gr => {
    const sugg = [];
    state.obSkills.forEach(x => { if (!gr.items.includes(x.n)) return;
      (RELATED[x.n] || []).forEach(r => { if (!selNames.includes(r) && !SKILLS.includes(r) && !sugg.includes(r)) sugg.push(r); }); });
    const chips = gr.items.filter(n => !selNames.includes(n)).map(n => `<button type="button" class="chip" data-add="${esc(n)}">＋ ${esc(n)}</button>`)
      .concat(sugg.map(n => `<button type="button" class="chip sugg" data-add="${esc(n)}">✦ ${esc(n)}</button>`));
    return chips.length ? `<div><div class="group-title">${gr.g}</div><div class="chips">${chips.join('')}</div></div>` : '';
  }).join('');
  return `${rows ? `<div class="sel-list">${rows}</div>` : ''}
    <div class="groups">${groups}
      <div><div class="group-title">Niečo iné?</div>
        <div class="custom-row"><input class="input" id="custom" placeholder="Napíš vlastnú zručnosť a stlač Enter…" value="${esc(state.customSkill)}"><button type="button" class="add-btn" id="add-custom">Pridať</button></div>
        <div class="hint">Všetko, čo sem napíšeš, použije Robiq pri AI párovaní s ponukami.</div></div></div>`;
}
function availabilityEditor() {                          // l.169–188, logic l.1542–1563
  return `<input type="range" id="hours" min="0" max="3" step="1" value="${state.obHours}">
    <div class="ticks"><span>5 h</span><span>10 h</span><span>20 h</span><span>Fulltime</span></div>
    <div class="label">Ktoré dni?</div>
    <div class="days">${DAYS.map(d => `<button type="button" class="${state.availDays.includes(d) ? 'on' : ''}" data-day="${d}">${d}</button>`).join('')}</div>
    <div class="label">Kedy počas dňa?</div>
    <div class="times">${TIMES.map(([t, sub]) => `<button type="button" class="${state.availTimes.includes(t) ? 'on' : ''}" data-time="${t}"><span>${t}</span><small>${sub}</small></button>`).join('')}</div>
    <div class="summary">${availSummary()}</div>`;
}
// Buttons inside the editors carry data-* attributes; returns true when it handled the click.
function editorClick(el) {
  if (el.dataset.add)    { addSkill(el.dataset.add); return true; }
  if (el.dataset.remove) { state.obSkills.splice(+el.dataset.remove, 1); render(); return true; }
  if (el.dataset.speak)  { const s = state.obSkills[+el.dataset.speak]; s.speak = !(s.speak !== false); render(); return true; }
  if (el.dataset.lvl)    { const [i, l] = el.dataset.lvl.split(':'); state.obSkills[+i].lvl = +l; render(); return true; }
  if (el.dataset.day)    { toggleInList(state.availDays, el.dataset.day); render(); return true; }
  if (el.dataset.time)   { toggleInList(state.availTimes, el.dataset.time); render(); return true; }
  if (el.id === 'add-custom') { addCustom(); return true; }
  return false;
}
// Text fields update state while typing (no re-render, so the caret stays). Call after the editor HTML is in the page.
function bindEditors() {
  const custom = document.getElementById('custom');
  if (custom) {
    custom.addEventListener('input', () => { state.customSkill = custom.value; });
    custom.addEventListener('keydown', e => { if (e.key === 'Enter') addCustom(); });
  }
  const hours = document.getElementById('hours');
  if (hours) hours.addEventListener('input', () => {
    state.obHours = +hours.value;
    for (const id of ['hours-label', 'p-hours']) { const el = document.getElementById(id); if (el) el.textContent = HOURS[state.obHours]; }
  });
  const birth = document.getElementById('p-birth');
  if (birth) birth.addEventListener('input', () => { state.birth = birth.value; });
  const bio = document.getElementById('p-bio');
  if (bio) bio.addEventListener('input', () => { state.bio = bio.value; });
}
function addSkill(n) { if (!state.obSkills.some(x => x.n === n)) { state.obSkills.push({ n, lvl: 2, speak: true }); state.customSkill = ''; } render(); }
function addCustom() { const n = state.customSkill.trim(); if (n) addSkill(n); }
function availSummary() {                                // l.1558–1563
  const d = state.availDays, t = state.availTimes;
  if (!d.length && !t.length) return 'Vyber si dni a časy, kedy môžeš pracovať.';
  const dd = d.length === 7 ? 'každý deň' : (d.length ? d.join(', ') : 'dni podľa dohody');
  return dd + (t.length ? ' · ' + t.join(', ').toLowerCase() : '');
}

// ─── FOB ───
function fobCanContinue() {
  if (state.fobStep === 1) return state.fobName.trim() !== '';
  if (state.fobStep === 2) return state.fobFields.length > 0;
  return state.fobTerms;
}
document.getElementById('fob-back').addEventListener('click', () => { if (state.fobStep > 1) state.fobStep--; else state.screen = 'pick'; render(); });
document.getElementById('fob-next').addEventListener('click', () => {          // l.1480–1490
  if (!fobCanContinue()) return;
  if (state.fobStep < 3) { state.fobStep++; render(); return; }
  enterApp({ role: 'firm', ftab: 0, fpName: state.fobName.trim(), fpLogo: state.fobLogo,
             fpDesc: '', fpVerified: false, offers: [], contacted: [], fchats: [] });      // l.1486–1488: no demo data
});
function renderFob() {
  document.getElementById('fob-no').textContent = state.fobStep;
  [...document.getElementById('fob-dots').children].forEach((d, i) => d.classList.toggle('on', state.fobStep >= i + 1));
  const next = document.getElementById('fob-next');
  next.textContent = state.fobStep === 3 ? 'Vytvoriť firemný účet' : 'Pokračovať';
  next.style.opacity = fobCanContinue() ? 1 : .45;
  if (state.fobStep === 1) fobStep1();
  if (state.fobStep === 2) fobStep2();
  if (state.fobStep === 3) fobStep3();
}
const fobEl = document.getElementById('fob-step');
function fobStep1() {                                    // l.244–256
  fobEl.innerHTML = `
    <h2>Kto <b>ste?</b></h2>
    <p class="desc" style="margin-bottom:24px">Overíme firmu podľa IČO — ľudia tak vedia, že píšu reálnemu zamestnávateľovi.</p>
    <div class="f1-row"><label class="flogo" id="flogo" title="Nahrať logo"><span id="flogo-init"></span><span class="tag">LOGO</span><input type="file" accept="image/*" id="flogo-file"></label>
      <div class="col"><input class="input" id="fob-name" placeholder="Názov firmy" value="${esc(state.fobName)}"><input class="input" id="fob-ico" placeholder="IČO" value="${esc(state.fobIco)}"></div></div>`;
  paintLogo();
  const nameEl = document.getElementById('fob-name');
  nameEl.addEventListener('input', () => { state.fobName = nameEl.value; paintLogo(); document.getElementById('fob-next').style.opacity = fobCanContinue() ? 1 : .45; });
  bindInput('fob-ico', 'fobIco');
  document.getElementById('flogo-file').addEventListener('change', e => {      // l.1460–1464
    const f = e.target.files && e.target.files[0]; if (!f) return;
    state.fobLogo = URL.createObjectURL(f); paintLogo();
  });
  fobEl.onclick = null;
}
function paintLogo() {                                   // l.1457–1459
  const logo = document.getElementById('flogo'), init = document.getElementById('flogo-init'); if (!logo) return;
  init.textContent = (state.fobName.trim() || '?').slice(0, 1).toUpperCase();
  init.style.display = state.fobLogo ? 'none' : 'block';
  logo.style.backgroundImage = state.fobLogo ? `url(${state.fobLogo})` : 'none';
}
function fobStep2() {                                    // l.261–268
  fobEl.innerHTML = `
    <h2>Koho <b>hľadáte?</b></h2>
    <p class="desc" style="margin-bottom:22px">Podľa toho vám Robiq predvyberie ľudí. Dá sa kedykoľvek zmeniť.</p>
    <div class="label" style="margin-bottom:11px">Odvetvie</div>
    <div class="fchips">${FIELDS.map(f => `<button type="button" class="fchip ${state.fobFields.includes(f) ? 'on' : ''}" data-field="${esc(f)}">${esc(f)}</button>`).join('')}</div>`;
  fobEl.onclick = e => { const el = e.target.closest('button[data-field]'); if (!el) return; toggleInList(state.fobFields, el.dataset.field); render(); };
}
function fobStep3() {                                    // l.272–282
  fobEl.innerHTML = `
    <h2>Kontaktná <b>osoba</b></h2>
    <p class="desc" style="margin-bottom:24px">Komu majú chodiť správy od záujemcov.</p>
    <div class="f3-col"><input class="input" id="fob-contact" placeholder="Meno a priezvisko" value="${esc(state.fobContact)}">
      <input class="input" id="fob-email" type="email" placeholder="Pracovný e-mail" value="${esc(state.fobEmail)}">
      <input class="input" id="fob-pass" type="password" placeholder="Heslo" value="${esc(state.fobPass)}"></div>
    <button type="button" class="terms ${state.fobTerms ? 'on' : ''}" id="terms"><span class="box">${state.fobTerms ? '✓' : ''}</span>
      <span class="txt">Súhlasím s podmienkami Robiq a potvrdzujem, že som oprávnený zastupovať túto firmu.</span></button>`;
  bindInput('fob-contact', 'fobContact'); bindInput('fob-email', 'fobEmail'); bindInput('fob-pass', 'fobPass');
  document.getElementById('terms').addEventListener('click', () => { state.fobTerms = !state.fobTerms; render(); });
  fobEl.onclick = null;
}

// ═══════════ Helpers ═══════════
function bindInput(id, key) { const el = document.getElementById(id); el.addEventListener('input', () => { state[key] = el.value; }); }
function toggleInList(list, item) { const i = list.indexOf(item); if (i === -1) list.push(item); else list.splice(i, 1); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ═══════════ Login background — l.1173–1213, verbatim ═══════════
const M = 12, R = 430, CX = 450, CY = 450, SEG = 90;
const cvL = document.querySelector('canvas[data-dot="L"]'), cvR = document.querySelector('canvas[data-dot="R"]');
function draw(cv, t, mirror) {
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, 900, 900);
  const g = ctx.createLinearGradient(mirror ? CX + R : CX - R, 0, mirror ? CX - R : CX + R, 0);
  g.addColorStop(0, 'rgba(64,49,159,.55)'); g.addColorStop(.5, 'rgba(124,108,224,.8)'); g.addColorStop(1, 'rgba(203,192,255,.95)');
  ctx.strokeStyle = g;
  const T = t * 60;
  for (let k = 0; k < M; k++) {
    const p = ((k / M + T * 0.05) % 1 + 1) % 1, r = 40 + p * (R - 40), fade = Math.sin(p * Math.PI);
    ctx.globalAlpha = fade * 0.85; ctx.lineWidth = 1 + fade * 1.2;
    const amp = 6 + 10 * p;
    ctx.beginPath();
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const rr = r + amp * Math.sin(a * 5 + T * 0.9 + k * 1.7) + amp * 0.5 * Math.sin(a * 3 - T * 0.6 + k);
      const x = CX + rr * Math.cos(a), y = CY + rr * Math.sin(a);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function loop(now) {
  requestAnimationFrame(loop);
  if (state.screen !== 'login') return;
  const t = now * 0.000016;
  draw(cvL, t, false); draw(cvR, 1e6 - t * 0.85, true);
}
requestAnimationFrame(loop);

render();

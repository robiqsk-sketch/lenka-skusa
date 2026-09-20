// Robiq — app logic. UI follows Robiq MVP.dc.html (line numbers in comments);
// data lives in Supabase (see ../supabase/schema.sql).

const CFG = window.ROBIQ_CONFIG;
const sb = supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);

// ═══════════ State ═══════════
// `screen` decides which <section> is visible: app · login · pick · ob · fob
const initialState = () => ({
  screen: 'app', authed: false, role: 'student', uid: null, pendingJob: null, gate: false,
  tab: 0, ftab: 0, loading: false, accMenu: false, notifOn: true, rowMenu: null,
  detail: null, toast: '', banner: false, bannerName: '', delIdx: null, delAccount: false,
  // feed (guest + student)
  postings: [], likedIds: [], skippedIds: [], blockedFirms: [],
  // student
  obStep: 1, obName: '', obEmail: '', obPass: '', obSkills: [], customSkill: '', obHours: 1, availDays: ['So', 'Ne'], availTimes: ['Poobede'],
  profEdit: false, birth: '', bio: '',
  avatarPath: null, obPhotoFile: null, obPhotoPreview: '',
  matches: [], activeChat: 0, draft: '', myInterests: [],
  // company
  fobStep: 1, fobName: '', fobIco: '', fobLogo: '', fobLogoFile: null, fobFields: [], fobContact: '', fobEmail: '', fobPass: '', fobTerms: false,
  fpName: '', fpDesc: '', fpLogo: '', fpVerified: false,
  offers: [], candidates: [], contacted: [], blocked: [], fchats: [], activeFChat: 0, fdraft: '',
  fT: '', fPay: '', fNeed: '', fTypes: [], aiNote: '', only18: false,
});
let state = initialState();
let order = [];                                            // guest feed order (shuffled)
let loadT, toastT, bannerT, rt;
const avatarUrls = {};                                     // storage path → signed URL (bucket "avatars" is private)

// ═══════════ Profile photos (private bucket) ═══════════
async function resolveAvatars(paths) {                     // fetch signed URLs for paths we don't have yet
  const missing = [...new Set(paths.filter(p => p && !avatarUrls[p]))];
  if (!missing.length) return;
  const { data } = await sb.storage.from('avatars').createSignedUrls(missing, 60 * 60);
  for (const r of data || []) if (r.signedUrl && !r.error) avatarUrls[r.path] = r.signedUrl;
}
const avatarUrl = path => (path && avatarUrls[path]) || '';
async function uploadAvatar(file) {                        // <uid>/avatar.<ext>, replaces the previous one
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${state.uid}/avatar.${ext}`;
  if (state.avatarPath && state.avatarPath !== path) await sb.storage.from('avatars').remove([state.avatarPath]);
  const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { error: e2 } = await sb.from('students').update({ avatar_path: path }).eq('id', state.uid);
  if (e2) throw e2;
  delete avatarUrls[path];
  state.avatarPath = path;
  await resolveAvatars([path]);
}
async function removeAvatar() {
  if (!state.avatarPath) return;
  await sb.storage.from('avatars').remove([state.avatarPath]);
  const { error } = await sb.from('students').update({ avatar_path: null }).eq('id', state.uid);
  if (error) throw error;
  delete avatarUrls[state.avatarPath];
  state.avatarPath = null;
}
// Round avatar: photo when there is one, initials otherwise.
function avatarHtml(cls, url, initialsText, extra = '') {
  return url ? `<div class="${cls} has-img" style="background-image:url('${url}')"${extra}></div>`
             : `<div class="${cls}"${extra}>${initialsText}</div>`;
}
const isStudent = () => state.role === 'student';

// ═══════════ Data: reading ═══════════
function colorFor(name) {                                  // deterministic logo colour from the palette
  let h = 0; for (const ch of name || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return LOGO_COLORS[h % LOGO_COLORS.length];
}
function ago(ts) {                                         // "pred 2 dňami" etc.
  const s = (Date.now() - new Date(ts)) / 1000;
  if (s < 60) return 'práve teraz';
  const m = Math.floor(s / 60); if (m < 60) return `pred ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return h === 1 ? 'pred hodinou' : `pred ${h} hodinami`;
  const d = Math.floor(h / 24); if (d === 1) return 'včera';
  return `pred ${d} dňami`;
}
function jobFromRow(p) {                                   // posting row (+company) → card model
  const c = p.companies || {};
  return {
    id: p.id, companyId: p.company_id, t: p.title, f: c.name || 'Firma', pay: p.pay + ' €', need: p.need, taken: p.taken,
    posted: ago(p.created_at), start: p.start, lg: colorFor(c.name), logo: c.logo_url, ini: (c.name || 'F')[0].toUpperCase(),
    badges: c.verified ? ['✓ Overená firma'] : [], tags: p.types || [], desc: p.description || '', ice: [], only18: p.only18,
  };
}
function shuffle(list) { return list.map(x => x.id).sort(() => Math.random() - .5); }

async function loadPostings() {
  const { data, error } = await sb.from('postings')
    .select('*, companies(name, verified, logo_url)').eq('active', true).order('created_at', { ascending: false });
  if (error) throw error;
  state.postings = data.map(jobFromRow);
  if (!order.length) order = shuffle(state.postings);
}

async function loadMe() {                                  // who is signed in, and their role data
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { state.authed = false; state.uid = null; return; }
  state.uid = session.user.id;
  const { data: prof } = await sb.from('profiles').select('role').eq('id', state.uid).maybeSingle();
  if (!prof) { state.authed = false; return; }             // profile trigger not run yet — treat as guest
  state.authed = true; state.role = prof.role;
  if (prof.role === 'student') await loadStudent(); else await loadCompany();
}

async function loadStudent() {
  const [{ data: s }, { data: ints }, { data: skips }] = await Promise.all([
    sb.from('students').select('*').eq('id', state.uid).single(),
    sb.from('interests').select('posting_id, postings(id, title, pay, companies(name, logo_url))').eq('student_id', state.uid),
    sb.from('skips').select('posting_id').eq('student_id', state.uid),
  ]);
  if (s) Object.assign(state, { obName: s.name, obSkills: s.skills || [], obHours: s.hours, availDays: s.avail_days || [],
    availTimes: s.avail_times || [], birth: s.birth || '', bio: s.bio || '', avatarPath: s.avatar_path || null });
  await resolveAvatars([state.avatarPath]);
  state.likedIds = (ints || []).map(i => i.posting_id);
  state.myInterests = (ints || []).filter(i => i.postings).map(i => ({
    postingId: i.posting_id, t: i.postings.title, f: i.postings.companies?.name || 'Firma', pay: i.postings.pay + ' €',
    lg: colorFor(i.postings.companies?.name), ini: (i.postings.companies?.name || 'F')[0].toUpperCase() }));
  state.skippedIds = (skips || []).map(x => x.posting_id);
  await loadMatches();
}

async function loadCompany() {
  const [{ data: c }, { data: posts }, { data: cints }] = await Promise.all([
    sb.from('companies').select('*').eq('id', state.uid).single(),
    sb.from('postings').select('*, interests(count), matches(count)').eq('company_id', state.uid).order('created_at', { ascending: false }),
    sb.from('company_interests').select('student_id, posting_id').eq('company_id', state.uid),
  ]);
  if (c) Object.assign(state, { fpName: c.name, fpDesc: c.description || '', fpLogo: c.logo_url || '', fpVerified: c.verified });
  state.offers = (posts || []).map(p => ({ id: p.id, t: p.title, pay: p.pay + ' € / hod', views: p.views,
    likes: p.interests?.[0]?.count || 0, m: p.matches?.[0]?.count || 0, need: p.need, on: p.active }));
  state.contacted = (cints || []).map(x => x.student_id + ':' + x.posting_id);
  await loadCandidates();
  await loadMatches();
}

// Firma vidí o kandidátovi len to, čo je v pohľade candidate_profiles (meno, zručnosti, hodiny) — nie dátum narodenia ani bio.
async function loadCandidateProfiles(ids) {
  if (!ids.length) return {};
  const { data } = await sb.from('candidate_profiles').select('id, name, skills, hours, avatar_path').in('id', ids);
  await resolveAvatars((data || []).map(s => s.avatar_path));
  return Object.fromEntries((data || []).map(s => [s.id, s]));
}
async function loadCandidates() {                          // students who liked one of my postings, grouped later by posting
  const { data } = await sb.from('interests')
    .select('posting_id, student_id, created_at, postings!inner(title, company_id)')
    .eq('postings.company_id', state.uid);
  const rows = data || [];
  const profiles = await loadCandidateProfiles([...new Set(rows.map(r => r.student_id))]);
  state.candidates = rows.filter(r => profiles[r.student_id]).map(r => {
    const s = profiles[r.student_id];
    return { id: s.id, n: s.name || 'Študent', ini: initialsOf(s.name), hrs: HOURS[s.hours] || '', photo: avatarUrl(s.avatar_path),
      skills: (s.skills || []).map(k => k.n), offer: r.postings.title, postingId: r.posting_id, at: r.created_at,
      g: `linear-gradient(135deg, ${colorFor(s.name)}, #9F8FF2)` };
  });
}

async function loadMatches() {
  const col = isStudent() ? 'student_id' : 'company_id';
  const { data } = await sb.from('matches')
    .select('id, posting_id, student_id, company_id, created_at, postings(title), companies(name, logo_url)')
    .eq(col, state.uid).order('created_at');
  const names = isStudent() ? {} : await loadCandidateProfiles([...new Set((data || []).map(m => m.student_id))]);
  const list = (data || []).map(m => {
    const other = isStudent() ? (m.companies?.name || 'Firma') : (names[m.student_id]?.name || 'Študent');
    return { id: m.id, postingId: m.posting_id, name: other, job: m.postings?.title || '', msgs: [],
      photo: isStudent() ? (m.companies?.logo_url || '') : avatarUrl(names[m.student_id]?.avatar_path),
      ini: isStudent() ? other[0].toUpperCase() : initialsOf(other),
      lg: isStudent() ? colorFor(other) : `linear-gradient(135deg, ${colorFor(other)}, #9F8FF2)` };
  });
  if (list.length) {
    const { data: msgs } = await sb.from('messages').select('*').in('match_id', list.map(m => m.id)).order('created_at');
    for (const msg of msgs || []) { const m = list.find(x => x.id === msg.match_id); if (m) m.msgs.push({ id: msg.id, me: msg.sender_id === state.uid, txt: msg.body }); }
  }
  if (isStudent()) state.matches = list; else state.fchats = list;
}

function initialsOf(name) { return (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'; }

// ═══════════ Realtime: new messages and matches ═══════════
function subscribe() {
  if (rt) sb.removeChannel(rt);
  if (!state.authed) return;
  rt = sb.channel('robiq')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: msg }) => {
      const list = isStudent() ? state.matches : state.fchats;
      const m = list.find(x => x.id === msg.match_id);
      if (!m || m.msgs.some(x => x.id === msg.id)) return;
      m.msgs.push({ id: msg.id, me: msg.sender_id === state.uid, txt: msg.body });
      render();
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, async ({ new: m }) => {
      if (m.student_id !== state.uid && m.company_id !== state.uid) return;
      await onNewMatch(m.id);
    })
    .subscribe();
}
async function onNewMatch(id) {                            // banner l.946–950
  const list = isStudent() ? state.matches : state.fchats;
  if (list.some(x => x.id === id)) return;
  await loadMatches();
  const m = (isStudent() ? state.matches : state.fchats).find(x => x.id === id);
  if (!m) return;
  if (isStudent()) { state.banner = true; state.bannerName = m.name; clearTimeout(bannerT); bannerT = setTimeout(() => { state.banner = false; render(); }, 3500); }
  else showToast(`Zhoda: ${m.name} má záujem o ${m.job}.`);
  if (!isStudent()) await loadCompany();
  render();
}

// ═══════════ Actions ═══════════
function startLoad(ms) {                                   // skeleton while "loading" — l.1143–1147
  clearTimeout(loadT);
  state.loading = true; render();
  loadT = setTimeout(() => { state.loading = false; render(); }, ms || 900);
}
function showToast(msg) {                                  // l.1148–1152
  clearTimeout(toastT);
  state.rowMenu = null; state.toast = msg; render();
  toastT = setTimeout(() => { state.toast = ''; render(); }, 2600);
}
function fail(e) { console.error(e); showToast(e.message || 'Niečo sa nepodarilo.'); }

async function act(job, dir) {                             // l.1219–1235
  if (!state.authed && dir === 'like') { state.gate = true; state.pendingJob = job; state.detail = null; render(); return; }
  if (state.likedIds.includes(job.id) || state.skippedIds.includes(job.id)) return;
  try {
    if (dir === 'like') {
      const { error } = await sb.from('interests').insert({ posting_id: job.id, student_id: state.uid });
      if (error) throw error;
      state.likedIds.push(job.id);
      state.myInterests.push({ postingId: job.id, t: job.t, f: job.f, pay: job.pay, lg: job.lg, ini: job.ini });
      render();
      const { data: m } = await sb.from('matches').select('id').eq('posting_id', job.id).eq('student_id', state.uid).maybeSingle();
      if (m) await onNewMatch(m.id);
    } else {
      const { error } = await sb.from('skips').insert({ posting_id: job.id, student_id: state.uid });
      if (error) throw error;
      state.skippedIds.push(job.id);
      render();
    }
  } catch (e) { fail(e); }
}

async function enterApp(extra) {                           // after sign-in / registration
  const pj = state.pendingJob;
  Object.assign(state, { screen: 'app', pendingJob: null, gate: false }, extra);
  state.loading = true; render();
  try { await loadMe(); await loadPostings(); } catch (e) { fail(e); }
  state.loading = false;
  if (state.authed && !isStudent()) state.ftab = 0;
  subscribe();
  render();
  if (pj && state.authed && isStudent()) setTimeout(() => act(pj, 'like'), 40);   // l.1498–1503
}

function setErr(id, msg) { const el = document.getElementById(id); if (el) el.textContent = msg || ''; }

const go = {
  // entry — l.1447–1450, 1498–1504
  doLogin: async () => {
    const email = document.getElementById('login-email').value.trim(), pass = document.getElementById('login-pass').value;
    setErr('login-err', '');
    if (!email || !pass) { setErr('login-err', 'Zadaj e-mail a heslo.'); return; }
    const btn = document.getElementById('login-btn'); btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    btn.disabled = false;
    if (error) { setErr('login-err', error.message === 'Invalid login credentials' ? 'Nesprávny e-mail alebo heslo.' : error.message); return; }
    document.getElementById('login-pass').value = '';
    await enterApp();
  },
  goRegister:  () => { state.pickFrom = 'login'; state.screen = 'pick'; state.obStep = 1; state.fobStep = 1; },   // from the login card
  goSignup:    () => { state.pickFrom = 'app';   state.screen = 'pick'; state.obStep = 1; state.fobStep = 1; },   // from the feed header
  goFirmReg:   () => { state.screen = 'fob'; state.fobStep = 1; },
  pickStudent: () => { state.screen = 'ob';  state.obStep = 1; },
  pickFirm:    () => { state.screen = 'fob'; state.fobStep = 1; },
  goLogin:     () => { state.screen = 'login'; setErr('login-err', ''); },
  // "← Späť" on login and account-type screens: login → feed; pick → wherever it was opened from
  back:        () => { state.screen = state.screen === 'pick' ? (state.pickFrom || 'app') : 'app'; },
  goPonuky:    () => { state.ftab = 2; },
  // gate — l.1444–1446
  gateClose:   () => { state.gate = false; state.pendingJob = null; },
  gateLogin:   () => { state.gate = false; state.screen = 'login'; },
  gateSignup:  () => { state.gate = false; state.pickFrom = 'app'; state.screen = 'pick'; state.obStep = 1; state.fobStep = 1; },
  // account menu — l.1515–1524
  menuToggle:  el => { if (el && el.classList.contains('a-menu')) { state.accMenu = true; return; } state.accMenu = !state.accMenu; },
  menuProfile: () => { if (isStudent()) state.tab = 2; else state.ftab = 3; state.accMenu = false; },
  menuClose:   () => { state.accMenu = false; },
  menuNotif:   () => { state.notifOn = !state.notifOn; state.accMenu = true; },
  logout: async () => {                                    // l.1506–1514: clean guest view
    clearTimeout(bannerT);
    await sb.auth.signOut();
    state = initialState(); order = [];
    subscribe();
    state.loading = true; render();
    try { await loadPostings(); } catch (e) { fail(e); }
    state.loading = false;
  },
  goNova:      () => { state.ftab = 9; },
  // feed — l.1577–1591
  resetDeck: async () => {
    try { await sb.from('skips').delete().eq('student_id', state.uid); state.skippedIds = []; } catch (e) { fail(e); }
  },
  aiOpen:      () => { state.detail = aiJob(); },
  closeDetail: () => { state.detail = null; },
  detailLike:  () => { const j = state.detail; state.detail = null; if (j) act(j, 'like'); },
  detailSkip:  () => { const j = state.detail; state.detail = null; if (j) act(j, 'skip'); },
  bannerGo:    () => { state.banner = false; state.tab = 1; state.activeChat = state.matches.length - 1; },
  noop:        () => {},
  // profile — l.1616; saving happens on "✓ Hotovo"
  profEditToggle: async () => {
    state.profEdit = !state.profEdit;
    if (!state.profEdit) await saveStudent();
  },
  // chats — l.1689–1700, 1676–1687
  sendMsg:  () => sendMsg('matches', 'activeChat', 'draft'),
  fSendMsg: () => sendMsg('fchats', 'activeFChat', 'fdraft'),
  // new posting — l.1641–1642, 1653–1659
  set18All:  () => { state.only18 = false; },
  set18Only: () => { state.only18 = true; },
  publish: async () => {
    if (!state.fT.trim()) return;
    try {
      const { error } = await sb.from('postings').insert({ company_id: state.uid, title: state.fT.trim(), pay: state.fPay.trim() || '8',
        need: Math.max(1, parseInt(state.fNeed, 10) || 1), types: state.fTypes, only18: state.only18, ai_note: state.aiNote });
      if (error) throw error;
      Object.assign(state, { fT: '', fPay: '', fNeed: '', fTypes: [], aiNote: '', only18: false, ftab: 2 });
      await loadCompany(); await loadPostings();
    } catch (e) { fail(e); }
  },
  // account deletion — GDPR right to erasure; everything cascades in the database
  askDeleteAccount: () => { state.accMenu = false; state.delAccount = true; },
  delAccountCancel: () => { state.delAccount = false; },
  delAccountConfirm: async () => {
    state.delAccount = false;
    try {
      {                                                    // Storage files must go through the Storage API, not SQL
        const bucket = isStudent() ? 'avatars' : 'logos';
        const { data: files } = await sb.storage.from(bucket).list(state.uid);
        if (files && files.length) await sb.storage.from(bucket).remove(files.map(f => `${state.uid}/${f.name}`));
      }
      const { error } = await sb.rpc('delete_my_account');
      if (error) throw error;
      await sb.auth.signOut();
      state = initialState(); order = [];
      subscribe();
      state.loading = true; render();
      try { await loadPostings(); } catch (e) { fail(e); }
      state.loading = false;
      showToast('Účet bol zmazaný.');
    } catch (e) { fail(e); }
  },
  // delete confirm — l.1638–1639
  delCancel:  () => { state.delIdx = null; },
  delConfirm: async () => {
    const o = state.offers[state.delIdx]; state.delIdx = null;
    try { const { error } = await sb.from('postings').delete().eq('id', o.id); if (error) throw error; await loadCompany(); await loadPostings(); showToast('Inzerát zmazaný.'); }
    catch (e) { fail(e); }
  },
};

async function sendMsg(listKey, idxKey, draftKey) {
  const t = state[draftKey].trim(); if (!t) return;
  const chat = state[listKey][state[idxKey]]; if (!chat) return;
  state[draftKey] = '';
  try {
    const { data, error } = await sb.from('messages').insert({ match_id: chat.id, sender_id: state.uid, body: t }).select().single();
    if (error) throw error;
    if (!chat.msgs.some(m => m.id === data.id)) chat.msgs.push({ id: data.id, me: true, txt: data.body });
    render();
  } catch (e) { fail(e); }
}

async function saveStudent() {
  try {
    const { error } = await sb.from('students').update({ name: state.obName.trim(), skills: state.obSkills, hours: state.obHours,
      avail_days: state.availDays, avail_times: state.availTimes, birth: state.birth || null, bio: state.bio, updated_at: new Date().toISOString() }).eq('id', state.uid);
    if (error) throw error;
  } catch (e) { fail(e); }
}
async function saveCompany(patch) {
  try {
    const { error } = await sb.from('companies').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', state.uid);
    if (error) throw error;
    await loadPostings();                                 // company name shows on cards
  } catch (e) { fail(e); }
}
async function uploadLogo(file) {                          // Storage bucket "logos", path <uid>/logo.<ext>
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${state.uid}/logo.${ext}`;
  const { error } = await sb.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = sb.storage.from('logos').getPublicUrl(path);
  return data.publicUrl + '?v=' + Date.now();
}

// Every element with data-go="name" calls go[name] and re-renders.
document.body.addEventListener('click', async e => {
  const el = e.target.closest('[data-go]');
  if (!el) return;
  e.stopPropagation();
  await go[el.dataset.go](el);
  render();
});
// Close the account menu on any click elsewhere (l.1171–1172); close ⋯ menus on pointerdown outside (l.1155–1161).
document.addEventListener('click', () => { if (state.accMenu) { state.accMenu = false; render(); } });
document.addEventListener('pointerdown', e => {
  if (!state.rowMenu) return;
  if (e.target.closest('[data-rowmenu]')) return;
  state.rowMenu = null; render();
}, true);
document.getElementById('login-form').addEventListener('submit', e => { e.preventDefault(); go.doLogin(); });

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
  else if (!state.authed || isStudent()) {
    main.innerHTML = [feed, zhody, profile][state.tab]();
    if (state.tab === 2 && state.profEdit) bindEditors();
  }
  else main.innerHTML = ({ 0: brig, 1: fspravy, 2: ponuky, 3: fprofil, 9: nova })[state.ftab]();
  bindAppInputs();
  updateDock();
  document.getElementById('a-layers').innerHTML = layers();
}

function renderHeader() {                                  // l.342–372
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
      <button class="del" data-go="askDeleteAccount"><span class="ic">✕</span>Zmazať účet</button>
    </div>`;
  const photo = isStudent() ? avatarUrl(state.avatarPath) : state.fpLogo;
  const ava = photo ? `<button class="a-ava has-img" aria-label="Účet" data-go="menuToggle" style="background-image:url('${photo}')"></button>`
                    : `<button class="a-ava" aria-label="Účet" data-go="menuToggle">${avaInit()}</button>`;
  r.innerHTML = `${nova}<div class="a-acc">${ava}${menu}</div>`;
}
function menuName() { return isStudent() ? (state.obName || 'Študent') : state.fpName; }
function avaInit() { return isStudent() ? initials() : (initialsOf(state.fpName) || 'F'); }

function skeleton() {                                      // l.377–403
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
const needTxt = j => { const free = Math.max(0, j.need - (j.taken || 0)); return `Voľné ${free} / ${j.need} ${j.need === 1 ? 'pozície' : 'pozícií'}`; };
const logoStyle = j => j.logo ? `background:url('${j.logo}') center/cover` : `background:${j.lg}`;
const logoText  = j => j.logo ? '' : j.ini;

function ageOf(iso) {                                      // full years from an ISO date; null when unknown/invalid
  if (!iso) return null;
  const b = new Date(iso), n = new Date();
  if (isNaN(b)) return null;
  return n.getFullYear() - b.getFullYear() - ((n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) ? 1 : 0);
}
// Privacy policy §3.1: without a birth date the 18+ postings stay hidden.
function isAdult() { const a = ageOf(state.birth); return a !== null && a >= 18; }
function remaining() {                                     // l.1243–1245
  const adult = isAdult();
  return state.postings
    .filter(j => !state.skippedIds.includes(j.id) && !state.blockedFirms.includes(j.f) && (!j.only18 || adult))
    .sort(state.authed ? (a, b) => (b.id - a.id) : (a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}
function aiJob() { return remaining().find(j => !state.likedIds.includes(j.id)) || null; }

function feed() {                                          // l.408–475
  const list = remaining();
  const viewed = state.likedIds.length + state.skippedIds.length;
  const ai = viewed >= 2 ? aiJob() : null;
  const tip = !ai ? '' : `
    <div class="ai-tip">
      <div class="eb">✦ Toto by ti sedelo</div>
      <div class="mid"><div class="lg" style="${logoStyle(ai)}">${logoText(ai)}</div>
        <div><div class="t">${esc(ai.t)}</div><div class="f">${esc(ai.f)} · <b>${esc(ai.pay)}/hod</b></div></div></div>
      <button data-go="aiOpen">Pozrieť detail</button>
    </div>`;
  const cards = list.length ? `<div class="cards">${list.map(jobCard).join('')}</div>` : `
    <div class="deck-empty">
      <div class="h">Na dnes si videl <b>všetko</b></div>
      <p>Robiq medzitým aktívne hľadá ďalšie ponuky, ktoré ti sadnú. Vráť sa večer.</p>
      ${state.skippedIds.length ? '<button data-go="resetDeck">Prezrieť znova</button>' : ''}
    </div>`;
  return `<div class="a-wrap">
    <div class="a-title"><h2>Ponuky <b>pre teba</b></h2>${state.authed ? '<span class="sorted">✦ zoradené podľa zhody s tvojím profilom</span>' : ''}</div>
    ${tip}${cards}</div>`;
}

function jobCard(j) {                                      // l.425–463
  const liked = state.likedIds.includes(j.id);
  const pct = Math.round(Math.max(0, j.need - (j.taken || 0)) / j.need * 100);
  const menu = state.rowMenu !== 'j' + j.id ? '' : `
    <div class="row-menu" data-rowmenu="1">
      <button data-job="${j.id}" data-act="report">Nahlásiť inzerát</button>
      <button class="danger" data-job="${j.id}" data-act="block">Zablokovať firmu</button>
    </div>`;
  return `<div class="job">
    <div class="top"><div class="posted">${esc(j.posted)}</div>
      <div class="more"><button class="dots-btn" data-rowmenu="1" aria-label="Ďalšie možnosti" data-job="${j.id}" data-act="menu">⋯</button>${menu}</div></div>
    <div class="who" data-job="${j.id}" data-act="open">
      <div class="lg" style="${logoStyle(j)}">${logoText(j)}</div>
      <div style="flex:1;min-width:0"><div class="t">${esc(j.t)}</div><div class="f">${esc(j.f)}</div>
        ${j.badges.length ? `<div class="rat"><b>${esc(j.badges[0])}</b></div>` : ''}</div>
    </div>
    <div class="pay">${esc(j.pay)} <small>/ hod</small></div>
    <div class="need"><span>${needTxt(j)}</span><span class="bar"><i style="width:${pct}%"></i></span></div>
    ${j.tags.length ? `<div class="tags">${j.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="start">Nástup <b>${esc(j.start)}</b></div>
    ${liked ? `<div class="sent">✓ Záujem odoslaný</div>` : `
    <div class="act"><button class="like" data-job="${j.id}" data-act="like">♥ Mám záujem</button>
      <button class="skip" aria-label="Preskočiť" data-job="${j.id}" data-act="skip">✕</button></div>`}
  </div>`;
}

function profile() {                                       // l.515–635
  const s = state;
  const skills = s.obSkills.map(x => LANGS.includes(x.n)
    ? { n: x.n, dots: LANG_LVLS[x.lvl - 1] + (x.speak !== false ? ' · rozprávam' : '') }
    : { n: x.n, dots: '●'.repeat(x.lvl) + '○'.repeat(3 - x.lvl) });
  const interests = s.myInterests.map(it => {
    const matched = s.matches.some(m => m.postingId === it.postingId);
    return { ...it, status: matched ? '✓ Zhoda' : 'Čaká na odpoveď', stBg: matched ? 'rgba(21,128,61,.12)' : 'rgba(36,27,69,.07)', stFg: matched ? '#15803D' : '#6E688C' };
  });
  const view = `
    ${s.bio.trim() ? `<div class="p-sec tight">O mne</div><p class="p-bio">${esc(s.bio)}</p>` : ''}
    <div class="p-sec">Zručnosti</div>
    ${skills.length ? `<div class="p-skills">${skills.map(k => `<span class="p-skill">${esc(k.n)} <b>${esc(k.dots)}</b></span>`).join('')}</div>`
                    : `<div class="p-empty" style="margin-bottom:26px">Zatiaľ žiadne. Klikni na <b>Upraviť</b> a pridaj, čo ti ide.</div>`}`;
  const edit = `<div class="compact">
    <div class="p-photo-row">
      <div class="l">Profilová fotka</div>
      <label class="photo-btn sm">${s.avatarPath ? 'Zmeniť fotku' : 'Nahrať fotku'}<input type="file" accept="image/*" id="p-photo" hidden></label>
      ${s.avatarPath ? '<button type="button" class="photo-remove" id="p-photo-remove">Odstrániť</button>' : ''}
    </div>
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
        ${avatarHtml('p-ava', avatarUrl(s.avatarPath), initials())}
        <div style="flex:1;min-width:0"><div class="p-name">${esc(s.obName.trim() || 'Študent')}</div><div class="p-sub">Študent · <span id="p-hours">${HOURS[s.obHours]}</span></div></div>
        <button class="p-edit" data-go="profEditToggle">${s.profEdit ? '✓ Hotovo' : 'Upraviť'}</button>
      </div>
      ${s.profEdit ? edit : view}
      <div class="p-stats">
        <div><div class="n">${s.likedIds.length + s.skippedIds.length}</div><div class="l">prezreté</div></div>
        <div><div class="n">${s.likedIds.length}</div><div class="l">záujmy</div></div>
        <div><div class="n">${s.matches.length}</div><div class="l">zhody</div></div>
      </div>
    </div>
    <div class="pcard sm">
      <div class="p-int-head"><div class="t">Moje <b>záujmy</b></div><span class="s">na čo si klikol „Mám záujem"</span></div>
      ${interests.length ? `<div class="p-int">${interests.map(it => `
        <div class="p-int-row"><div class="lg" style="background:${it.lg}">${it.ini}</div>
          <div style="flex:1;min-width:0"><div class="t">${esc(it.t)}</div><div class="f">${esc(it.f)} · <b>${esc(it.pay)}/hod</b></div></div>
          <span class="st" style="background:${it.stBg};color:${it.stFg}">${it.status}</span></div>`).join('')}</div>`
      : `<div class="p-empty">Zatiaľ žiadne. Prejdi na <b>Objavuj</b> a označ ponuky, ktoré ťa zaujali.</div>`}
    </div>
  </div>`;
}

// ─── Chat (shared by Zhody and Správy firmy) — l.482–511 / 712–741 ───
function chatUI(list, active, isFirm) {
  const cur = list[Math.min(active, list.length - 1)] || list[0];
  const lgCls = isFirm ? 'lg round' : 'lg';
  const face = m => m.photo ? `<div class="${lgCls} has-img" style="background-image:url('${m.photo}')"></div>`
                            : `<div class="${lgCls}" style="background:${m.lg}">${m.ini}</div>`;
  const items = list.map((m, i) => `
    <button class="${i === active ? 'on' : ''}" data-chat="${i}">
      ${face(m)}
      <div><div class="n">${esc(m.name)}</div><div class="j">${esc(m.job)}</div></div>
    </button>`).join('');
  const head = !cur ? '' : `
    <div class="chat-head">${face(cur)}
      <div><div class="n">${esc(cur.name)}</div>
        <div class="j ${isFirm ? 'firm' : ''}">${isFirm ? 'Uchádzač · ' : '✓ Zhoda · '}${esc(cur.job)}</div></div></div>`;
  const msgs = (cur ? cur.msgs : []).map(m => `<div class="msg ${m.me ? 'me' : 'them'}">${esc(m.txt)}</div>`).join('');
  if (!list.length) return `<div class="p-empty">${isFirm
    ? 'Zatiaľ žiadne konverzácie. Chat vznikne, keď o kandidáta prejavíte záujem a on oň prejavil záujem tiež.'
    : 'Zatiaľ žiadne zhody. Chat vznikne, keď o teba prejaví záujem firma, ktorej si dal „Mám záujem".'}</div>`;
  return `<div class="chat">
    <div class="chat-list">${items}</div>
    <div class="chat-box">${head}
      <div class="chat-msgs" id="chat-msgs">${msgs}</div>
      <div class="chat-input"><input id="chat-draft" placeholder="Napíš správu…" value="${esc(isFirm ? state.fdraft : state.draft)}">
        <button data-go="${isFirm ? 'fSendMsg' : 'sendMsg'}">Odoslať</button></div>
    </div></div>`;
}
function zhody() {                                         // l.478–513
  return `<div class="chat-wrap">
    <div class="a-title"><h2>Tvoje <b>správy</b></h2><span class="sub">každý chat = obojstranný záujem</span></div>
    ${chatUI(state.matches, state.activeChat, false)}</div>`;
}
function fspravy() {                                       // l.708–743
  return `<div class="chat-wrap">
    <div class="a-title"><h2>Vaše <b>správy</b></h2><span class="sub">konverzácie s uchádzačmi</span></div>
    ${chatUI(state.fchats, state.activeFChat, true)}</div>`;
}

// ─── Brigádnici — l.637–706 ───
function brig() {
  const s = state;
  let body;
  if (!s.authed) body = `<div class="gate-card"><div class="ic">◎</div>
      <div class="h">Profily brigádnikov sú len pre prihlásené firmy</div>
      <div class="p">Chránime súkromie ľudí — ich profily uvidíte po prihlásení firemného účtu.</div>
      <div class="col"><button data-go="goSignup" style="width:100%;background:#40319F;color:#fff;border:none;border-radius:13px;padding:13px 0;font-size:14px;font-weight:700;cursor:pointer">Vytvoriť firemný účet</button>
        <button data-go="goLogin" style="width:100%;background:transparent;color:#40319F;border:1px solid rgba(64,49,159,.35);border-radius:13px;padding:12px 0;font-size:14px;font-weight:700;cursor:pointer">Už mám účet — prihlásiť sa</button></div></div>`;
  else if (s.offers.length === 0) body = `<div class="empty-card narrow">
      <div class="h">Zatiaľ nie sú koho ukázať</div>
      <div class="p">Pridajte prvý inzerát — kandidátov začneme párovať hneď po zverejnení.</div>
      <button class="btn-violet" data-go="goNova">＋ Nový inzerát</button></div>`;
  else {
    const visible = s.candidates.filter(c => !s.blocked.includes(c.id));
    if (!visible.length) body = `<div class="empty-card narrow">
      <div class="h">Zatiaľ nikto neprejavil záujem</div>
      <div class="p">Kandidáti sa tu objavia, keď klepnú „Mám záujem" na niektorý z vašich inzerátov.</div></div>`;
    else body = [...new Set(visible.map(c => c.offer))].map(off => {
      const cands = visible.filter(c => c.offer === off).sort((a, b) => new Date(b.at) - new Date(a.at));
      const count = cands.length + (cands.length === 1 ? ' kandidát' : cands.length < 5 ? ' kandidáti' : ' kandidátov');
      return `<div class="cgroup"><div class="cgroup-head"><div class="t">${esc(off)}</div><span class="c">${count}</span></div>
        <div class="cards">${cands.map(candCard).join('')}</div></div>`;
    }).join('');
  }
  const has = s.authed && s.candidates.length > 0;
  return `<div class="a-wrap">
    <div class="a-title" style="align-items:center"><h2>Ponuka <b>brigádnikov</b></h2>${has ? '<span class="sorted">✦ zoradené podľa AI zhody s vašimi ponukami</span>' : ''}</div>
    ${body}</div>`;
}
function candCard(c) {                                     // l.674–699
  const key = c.id + ':' + c.postingId, done = state.contacted.includes(key);
  const menu = state.rowMenu !== 'c' + key ? '' : `
    <div class="row-menu w186" data-rowmenu="1">
      <button data-cand="${key}" data-act="report">Nahlásiť profil</button>
      <button class="danger" data-cand="${key}" data-act="block">Zablokovať</button></div>`;
  return `<div class="cand">
    <div class="top">
      ${c.photo ? `<div class="av has-img" style="background-image:url('${c.photo}')"></div>` : `<div class="av" style="background:${c.g}"><span>${c.ini}</span></div>`}
      <div><div class="n">${esc(c.n)}</div><div class="s">${esc(c.hrs)}</div></div>
      <div class="more"><button class="dots-btn" data-rowmenu="1" aria-label="Ďalšie možnosti" data-cand="${key}" data-act="menu">⋯</button>${menu}</div>
    </div>
    ${c.skills.length ? `<div class="skills">${c.skills.map(k => `<span>${esc(k)}</span>`).join('')}</div>` : ''}
    ${done ? `<div class="sent">✓ Záujem odoslaný</div>` : `<button class="contact" data-cand="${key}" data-act="contact">♥ Prejaviť záujem</button>`}
  </div>`;
}

// ─── Ponuky firmy — l.745–791 ───
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

// ─── Nová ponuka — l.793–828 ───
function nova() {
  const s = state;
  return `<div class="nova-wrap">
    <button class="back back-top" data-go="goPonuky">← Späť na inzeráty</button>
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

// ─── Firemný profil — l.830–913 (bez kalendára) ───
function fprofil() {
  const s = state, S = sums();
  return `<div class="fprof">
    <div class="pcard">
      <div class="p-head">
        <label class="fp-logo" id="fp-logo" title="Zmeniť logo" style="background-image:${s.fpLogo ? `url('${s.fpLogo}')` : 'none'}">
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
    el.addEventListener('keydown', e => { if (e.key === 'Enter') go[isStudent() ? 'sendMsg' : 'fSendMsg'](); });
  });
  on('chat-msgs', el => { el.scrollTop = el.scrollHeight; });                 // l.1598
  on('f-t',    el => el.addEventListener('input', () => { state.fT = el.value; document.getElementById('f-publish').style.opacity = el.value.trim() ? 1 : .45; }));
  on('f-pay',  el => el.addEventListener('input', () => { state.fPay = el.value; }));
  on('f-need', el => el.addEventListener('input', () => { state.fNeed = el.value; }));
  on('f-ai',   el => el.addEventListener('input', () => { state.aiNote = el.value; }));
  on('fp-name', el => { el.addEventListener('input', () => { state.fpName = el.value; });
                        el.addEventListener('change', async () => { await saveCompany({ name: state.fpName.trim() }); render(); }); });
  on('fp-desc', el => { el.addEventListener('input', () => { state.fpDesc = el.value; });
                        el.addEventListener('change', () => saveCompany({ description: state.fpDesc })); });
  on('fp-file', el => el.addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try { state.fpLogo = await uploadLogo(f); await saveCompany({ logo_url: state.fpLogo }); render(); } catch (err) { fail(err); }
  }));
}

// Card / candidate / posting actions — l.1577–1584, 1342–1364, 1372–1383
document.getElementById('a-main').addEventListener('click', async e => {
  const btn = e.target.closest('button');
  if (btn && !btn.dataset.act && editorClick(btn)) return;
  if (btn && btn.dataset.chat !== undefined) {
    if (isStudent()) state.activeChat = +btn.dataset.chat; else state.activeFChat = +btn.dataset.chat;
    render(); return;
  }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const d = el.dataset, a = d.act;

  if (d.job) {
    const j = state.postings.find(x => x.id === +d.job);
    if (a === 'open')   { state.detail = j; render(); }
    if (a === 'like')   act(j, 'like');
    if (a === 'skip')   act(j, 'skip');
    if (a === 'menu')   { state.rowMenu = state.rowMenu === 'j' + j.id ? null : 'j' + j.id; render(); }
    if (a === 'report') showToast('Inzerát sme nahlásili — pozrieme sa na to.');
    if (a === 'block')  { state.blockedFirms.push(j.f); showToast('Firmu sme skryli z tvojho feedu.'); }
  }
  else if (d.cand) {
    const [sid, pid] = d.cand.split(':');
    const c = state.candidates.find(x => x.id === sid && x.postingId === +pid);
    if (a === 'menu')   { state.rowMenu = state.rowMenu === 'c' + d.cand ? null : 'c' + d.cand; render(); }
    if (a === 'report') showToast('Profil sme nahlásili — pozrieme sa na to.');
    if (a === 'block')  { state.blocked.push(sid); showToast('Profil zablokovaný.'); }
    if (a === 'contact') {
      try {
        const { error } = await sb.from('company_interests').insert({ company_id: state.uid, student_id: sid, posting_id: +pid });
        if (error) throw error;
        state.contacted.push(d.cand); render();
        const { data: m } = await sb.from('matches').select('id').eq('posting_id', +pid).eq('student_id', sid).maybeSingle();
        if (m) await onNewMatch(m.id);
      } catch (err) { fail(err); }
    }
  }
  else if (d.offer) {
    const i = +d.offer, o = state.offers[i];
    try {
      if (a === 'toggle') { o.on = !o.on; render(); const { error } = await sb.from('postings').update({ active: o.on }).eq('id', o.id); if (error) throw error; await loadPostings(); }
      if (a === 'menu')   { state.rowMenu = state.rowMenu === 'o' + i ? null : 'o' + i; render(); }
      if (a === 'dup')    {
        const { data: src } = await sb.from('postings').select('*').eq('id', o.id).single();
        const { error } = await sb.from('postings').insert({ company_id: state.uid, title: src.title + ' (kópia)', pay: src.pay, need: src.need,
          types: src.types, only18: src.only18, ai_note: src.ai_note, description: src.description, start: src.start });
        if (error) throw error;
        await loadCompany(); await loadPostings(); showToast('Inzerát zduplikovaný.');
      }
      if (a === 'askDel') { state.rowMenu = null; state.delIdx = i; render(); }
    } catch (err) { fail(err); }
  }
  else if (a === 'type') { toggleInList(state.fTypes, d.type); render(); }
});

// Dock — l.929–941, logic l.1308–1326. Built once per role; afterwards only the active
// tab and the notch position change, so the CSS transitions run instead of restarting.
const DOCK_W = 360, DOCK_R = 31;                           // smaller than the prototype's 430 / 37
function updateDock() {
  const host = document.getElementById('a-dock');
  if (!state.authed) { host.innerHTML = ''; host.dataset.role = ''; return; }
  const tabs = isStudent() ? STUDENT_TABS : FIRM_TABS;
  if (host.dataset.role !== state.role) {
    host.dataset.role = state.role;
    host.innerHTML = `<div class="dock"><div class="bg"></div>
      <div class="tabs">${tabs.map(([label, glyph], i) => `
        <button data-tab="${i}"><span class="glyph">${glyph}</span><span class="lbl">${label}</span></button>`).join('')}</div></div>`;
  }
  const active = isStudent() ? state.tab : (state.ftab === 9 ? 2 : state.ftab);
  const w = host.querySelector('.dock').offsetWidth || DOCK_W;   // narrower on small phones
  const notchLeft = ((active * 2 + 1) / (2 * tabs.length) * w - DOCK_R).toFixed(1) + 'px';
  const bg = host.querySelector('.bg');
  bg.style.webkitMaskPosition = `${notchLeft} -${DOCK_R + 1}px, 0 0`;
  bg.style.maskPosition = `${notchLeft} -${DOCK_R + 1}px, 0 0`;
  host.querySelectorAll('[data-tab]').forEach((b, i) => b.classList.toggle('on', i === active));
}
window.addEventListener('resize', () => { if (state.screen === 'app' && state.authed) updateDock(); });
document.getElementById('a-dock').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  const i = +b.dataset.tab;
  const active = isStudent() ? state.tab : (state.ftab === 9 ? 2 : state.ftab);
  if (i === active) return;
  if (isStudent()) state.tab = i; else state.ftab = i;
  state.rowMenu = null; state.accMenu = false;
  render();                                                // data is already in memory — no fake loading
  window.scrollTo(0, 0);
});

function layers() {                                        // banner l.946, toast l.954, delete l.957, gate l.972, detail l.988
  let h = '';
  if (state.banner) h += `<div class="banner" role="status"><div class="ok">✓</div>
    <div><b>Máte zhodu!</b><span class="s">${esc(state.bannerName)} má o teba záujem.</span></div>
    <button data-go="bannerGo">Napísať správu</button></div>`;
  if (state.toast) h += `<div class="toast">${esc(state.toast)}</div>`;
  if (state.delIdx !== null && state.offers[state.delIdx]) h += `<div class="overlay del" data-go="delCancel"><div class="delm" data-go="noop">
    <div class="h">Zmazať „${esc(state.offers[state.delIdx].t)}"?</div>
    <div class="p">Inzerát aj jeho zhody sa nedajú vrátiť. Ak ho chcete len stiahnuť, použite Pozastaviť.</div>
    <div class="col"><button class="b1" data-go="delConfirm">Zmazať natrvalo</button><button class="b2" data-go="delCancel">Zrušiť</button></div></div></div>`;
  if (state.delAccount) h += `<div class="overlay del" data-go="delAccountCancel"><div class="delm" data-go="noop">
    <div class="h">${isStudent() ? 'Zmazať tvoj účet?' : 'Zmazať firemný účet?'}</div>
    <div class="p">${isStudent()
      ? 'Natrvalo sa zmaže tvoj profil, záujmy, zhody aj správy. Toto sa nedá vrátiť.'
      : 'Natrvalo sa zmaže profil firmy, všetky inzeráty, zhody aj správy s uchádzačmi. Toto sa nedá vrátiť.'}</div>
    <div class="col"><button class="b1" data-go="delAccountConfirm">Zmazať natrvalo</button><button class="b2" data-go="delAccountCancel">Zrušiť</button></div></div></div>`;
  if (state.gate) h += `<div class="overlay" data-go="gateClose"><div class="gate" data-go="noop">
    <div class="ic">♥</div>
    <div class="h">Ešte krôčik — potrebujeme vedieť, kto si</div>
    <div class="p">Bez účtu nevieme komu ponuku priradiť. Registrácia trvá pár sekúnd a tvoj záujem odošleme hneď po nej.</div>
    <div class="col"><button class="b1" data-go="gateSignup">Vytvoriť účet</button>
      <button class="b2" data-go="gateLogin">Už mám účet — prihlásiť sa</button>
      <button class="b3" data-go="gateClose">Zrušiť</button></div></div></div>`;
  const d = state.detail;
  if (d) h += `<div class="overlay detail" data-go="closeDetail"><div class="dmodal" data-go="noop">
    <div class="top"><div class="who"><div class="lg" style="${logoStyle(d)}">${logoText(d)}</div>
      <div><div class="t">${esc(d.t)}</div><div class="f">${esc(d.f)}</div></div></div>
      <button class="x" data-go="closeDetail">✕</button></div>
    ${d.badges.length || d.tags.length ? `<div class="chips">${d.badges.map(b => `<span class="badge">${esc(b)}</span>`).join('')}${d.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="payrow"><div class="pay">${esc(d.pay)} <small>/ hod</small></div><span class="need">${needTxt(d)}</span></div>
    ${d.desc ? `<p>${esc(d.desc)}</p>` : ''}
    ${d.ice.length ? `<div class="sec">Icebreakery</div><div class="ice">${d.ice.map(i => `<div>${esc(i)}</div>`).join('')}</div>` : ''}
    <div class="sec">Deň v práci</div>
    <div class="day"><div>foto 1</div><div>foto 2</div><div>foto 3</div></div>
    ${state.likedIds.includes(d.id) ? `<div class="sent">✓ Záujem odoslaný</div>` : `
    <div class="act"><button class="like" data-go="detailLike">♥ Mám záujem</button><button class="skip" data-go="detailSkip">✕ Preskočiť</button></div>`}
  </div></div>`;
  return h;
}

// The top bar is static (see styles.css): it scrolls away with the page and does not come back mid-page.
// The document itself scrolls, so Safari can collapse its address bar.

// ─── OB — student onboarding — l.97–194 ───
// Privacy policy §10: Robiq is for people aged 16+, younger cannot register.
const MIN_AGE = 16;
function obCanContinue() {
  if (state.obStep === 1) return state.obName.trim() && state.obEmail.trim() && state.obPass.length >= 6 && (ageOf(state.birth) ?? -1) >= MIN_AGE;
  if (state.obStep === 2) return state.obSkills.length > 0;
  return true;
}
document.getElementById('ob-back').addEventListener('click', () => { if (state.obStep > 1) state.obStep--; else state.screen = 'pick'; render(); });
document.getElementById('ob-next').addEventListener('click', async () => {           // l.1566–1570
  if (!obCanContinue()) return;
  if (state.obStep < 3) { state.obStep++; render(); return; }
  await registerStudent();
});
async function registerStudent() {
  const btn = document.getElementById('ob-next'); btn.disabled = true; setErr('ob-err', '');
  const { data, error } = await sb.auth.signUp({ email: state.obEmail.trim(), password: state.obPass,
    options: { data: { role: 'student', name: state.obName.trim(), birth: state.birth, skills: state.obSkills, hours: state.obHours, avail_days: state.availDays, avail_times: state.availTimes } } });
  btn.disabled = false;
  if (error) { setErr('ob-err', error.message); return; }
  if (!data.session) {                                    // e-mail confirmation is on
    state.screen = 'login'; render();
    setErr('login-err', 'Poslali sme ti potvrdzovací e-mail. Po potvrdení sa prihlás.');
    return;
  }
  if (state.obPhotoFile) {                                 // the account exists now — store the photo chosen in step 1
    state.uid = data.user.id;
    try { await uploadAvatar(state.obPhotoFile); } catch (e) { console.warn('avatar upload failed', e); }
    state.obPhotoFile = null; state.obPhotoPreview = '';
  }
  await enterApp({ tab: 0 });
}
function renderOb() {
  document.getElementById('ob-no').textContent = state.obStep;
  [...document.getElementById('ob-dots').children].forEach((d, i) => d.classList.toggle('on', state.obStep >= i + 1));
  const next = document.getElementById('ob-next');
  next.textContent = state.obStep === 3 ? 'Hotovo — pozri ponuky' : 'Pokračovať';
  next.style.opacity = obCanContinue() ? 1 : .45;
  if (state.obStep === 1) obStep1();
  if (state.obStep === 2) obStep2();
  if (state.obStep === 3) obStep3();
}
const obEl = document.getElementById('ob-step');
function obStep1() {                                       // l.111–119 + e-mail a heslo (nutné pre skutočný účet)
  obEl.innerHTML = `
    <h2>Ako sa <b>voláš?</b></h2>
    <p class="desc" style="margin-bottom:26px">Žiadne CV, žiadny motivačný list. Stačí meno a e-mail.</p>
    <div class="s1-row">${avatarHtml('avatar', state.obPhotoPreview, initials(), ' id="avatar"')}
      <div class="col"><input class="input" id="ob-name" placeholder="Meno a priezvisko" value="${esc(state.obName)}" autocomplete="name">
        <input class="input" id="ob-email" type="email" placeholder="E-mail" value="${esc(state.obEmail)}" autocomplete="email">
        <input class="input" id="ob-pass" type="password" placeholder="Heslo (aspoň 6 znakov)" value="${esc(state.obPass)}" autocomplete="new-password">
        <label class="ob-birth"><span>Dátum narodenia</span><input class="input" id="ob-birth" type="date" value="${esc(state.birth)}" autocomplete="bday"></label>
        <div class="ob-age-note" id="ob-age-note">Robiq je pre ľudí od ${MIN_AGE} rokov.</div>
        <label class="photo-btn">${state.obPhotoFile ? 'Zmeniť fotku' : 'Nahrať fotku (voliteľné)'}<input type="file" accept="image/*" id="ob-photo" hidden></label>
        ${state.obPhotoFile ? '<button type="button" class="photo-remove" id="ob-photo-remove">Odstrániť fotku</button>' : ''}</div></div>`;
  const upd = () => {
    document.getElementById('ob-next').style.opacity = obCanContinue() ? 1 : .45;
    const a = ageOf(state.birth), note = document.getElementById('ob-age-note');
    note.textContent = a !== null && a < MIN_AGE ? `Robiq je pre ľudí od ${MIN_AGE} rokov — registrácia zatiaľ nie je možná.` : `Robiq je pre ľudí od ${MIN_AGE} rokov.`;
    note.classList.toggle('err', a !== null && a < MIN_AGE);
  };
  const nameEl = document.getElementById('ob-name');
  nameEl.addEventListener('input', () => { state.obName = nameEl.value; document.getElementById('avatar').textContent = initials(); upd(); });
  const emailEl = document.getElementById('ob-email'); emailEl.addEventListener('input', () => { state.obEmail = emailEl.value; upd(); });
  const passEl = document.getElementById('ob-pass');    passEl.addEventListener('input', () => { state.obPass = passEl.value; upd(); });
  const birthEl = document.getElementById('ob-birth');  birthEl.addEventListener('input', () => { state.birth = birthEl.value; upd(); });
  document.getElementById('ob-photo').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setErr('ob-err', 'Fotka je príliš veľká (max. 5 MB).'); return; }
    setErr('ob-err', ''); state.obPhotoFile = f; state.obPhotoPreview = URL.createObjectURL(f); render();
  });
  const rm = document.getElementById('ob-photo-remove');
  if (rm) rm.addEventListener('click', () => { state.obPhotoFile = null; state.obPhotoPreview = ''; render(); });
  upd();
  obEl.onclick = null;
}
function initials() {                                      // l.1247–1248
  const name = state.obName.trim() || 'Tomáš Novák';
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function obStep2() {                                       // l.123–162
  obEl.innerHTML = `
    <h2>Čo ti <b>ide?</b></h2>
    <p class="desc" style="margin-bottom:22px">Vyber si koľko chceš — a pri každej nastav, ako dobre ju ovládaš. Robiq sa učí z každého kliku.</p>
    ${skillsEditor()}`;
  obEl.onclick = e => { const el = e.target.closest('button'); if (el) editorClick(el); };
  bindEditors();
}
function obStep3() {                                       // l.166–188
  obEl.innerHTML = `
    <h2>Koľko hodín <b>máš?</b></h2>
    <p class="desc" style="margin-bottom:30px">Ponuky uvidíš len podľa svojej reálnej dostupnosti.</p>
    <div class="hours-label" id="hours-label">${HOURS[state.obHours]}</div>
    ${availabilityEditor()}`;
  obEl.onclick = e => { const el = e.target.closest('button'); if (el) editorClick(el); };
  bindEditors();
}

// ─── Shared editors: onboarding steps 2–3 and the profile in edit mode ───
function skillsEditor() {                                  // l.126–162, logic l.1256–1296
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
function availabilityEditor() {                            // l.169–188, logic l.1542–1563
  return `<input type="range" id="hours" min="0" max="3" step="1" value="${state.obHours}">
    <div class="ticks"><span>5 h</span><span>10 h</span><span>20 h</span><span>Fulltime</span></div>
    <div class="label">Ktoré dni?</div>
    <div class="days">${DAYS.map(d => `<button type="button" class="${state.availDays.includes(d) ? 'on' : ''}" data-day="${d}">${d}</button>`).join('')}</div>
    <div class="label">Kedy počas dňa?</div>
    <div class="times">${TIMES.map(([t, sub]) => `<button type="button" class="${state.availTimes.includes(t) ? 'on' : ''}" data-time="${t}"><span>${t}</span><small>${sub}</small></button>`).join('')}</div>
    <div class="summary">${availSummary()}</div>`;
}
function editorClick(el) {                                 // returns true when it handled the click
  if (el.dataset.add)    { addSkill(el.dataset.add); return true; }
  if (el.dataset.remove) { state.obSkills.splice(+el.dataset.remove, 1); render(); return true; }
  if (el.dataset.speak)  { const s = state.obSkills[+el.dataset.speak]; s.speak = !(s.speak !== false); render(); return true; }
  if (el.dataset.lvl)    { const [i, l] = el.dataset.lvl.split(':'); state.obSkills[+i].lvl = +l; render(); return true; }
  if (el.dataset.day)    { toggleInList(state.availDays, el.dataset.day); render(); return true; }
  if (el.dataset.time)   { toggleInList(state.availTimes, el.dataset.time); render(); return true; }
  if (el.id === 'add-custom') { addCustom(); return true; }
  return false;
}
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
  const photo = document.getElementById('p-photo');
  if (photo) photo.addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    if (f.size > 5 * 1024 * 1024) { showToast('Fotka je príliš veľká (max. 5 MB).'); return; }
    try { await uploadAvatar(f); render(); showToast('Fotka uložená.'); } catch (err) { fail(err); }
  });
  const photoRm = document.getElementById('p-photo-remove');
  if (photoRm) photoRm.addEventListener('click', async () => {
    try { await removeAvatar(); render(); showToast('Fotka odstránená.'); } catch (err) { fail(err); }
  });
}
function addSkill(n) { if (!state.obSkills.some(x => x.n === n)) { state.obSkills.push({ n, lvl: 2, speak: true }); state.customSkill = ''; } render(); }
function addCustom() { const n = state.customSkill.trim(); if (n) addSkill(n); }
function availSummary() {                                  // l.1558–1563
  const d = state.availDays, t = state.availTimes;
  if (!d.length && !t.length) return 'Vyber si dni a časy, kedy môžeš pracovať.';
  const dd = d.length === 7 ? 'každý deň' : (d.length ? d.join(', ') : 'dni podľa dohody');
  return dd + (t.length ? ' · ' + t.join(', ').toLowerCase() : '');
}

// ─── FOB — company registration — l.230–291 ───
function fobCanContinue() {
  if (state.fobStep === 1) return state.fobName.trim() !== '';
  if (state.fobStep === 2) return state.fobFields.length > 0;
  return state.fobTerms && state.fobEmail.trim() && state.fobPass.length >= 6;
}
document.getElementById('fob-back').addEventListener('click', () => { if (state.fobStep > 1) state.fobStep--; else state.screen = 'pick'; render(); });
document.getElementById('fob-next').addEventListener('click', async () => {          // l.1480–1490
  if (!fobCanContinue()) return;
  if (state.fobStep < 3) { state.fobStep++; render(); return; }
  await registerCompany();
});
async function registerCompany() {
  const btn = document.getElementById('fob-next'); btn.disabled = true; setErr('fob-err', '');
  const { data, error } = await sb.auth.signUp({ email: state.fobEmail.trim(), password: state.fobPass,
    options: { data: { role: 'firm', name: state.fobName.trim(), ico: state.fobIco.trim(), fields: state.fobFields, contact_name: state.fobContact.trim() } } });
  btn.disabled = false;
  if (error) { setErr('fob-err', error.message); return; }
  if (!data.session) {
    state.screen = 'login'; render();
    setErr('login-err', 'Poslali sme vám potvrdzovací e-mail. Po potvrdení sa prihláste.');
    return;
  }
  state.uid = data.user.id;
  if (state.fobLogoFile) { try { const url = await uploadLogo(state.fobLogoFile); await sb.from('companies').update({ logo_url: url }).eq('id', state.uid); } catch (e) { console.warn(e); } }
  await enterApp({ ftab: 0 });
}
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
function fobStep1() {                                      // l.244–256
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
    state.fobLogoFile = f; state.fobLogo = URL.createObjectURL(f); paintLogo();
  });
  fobEl.onclick = null;
}
function paintLogo() {                                     // l.1457–1459
  const logo = document.getElementById('flogo'), init = document.getElementById('flogo-init'); if (!logo) return;
  init.textContent = (state.fobName.trim() || '?').slice(0, 1).toUpperCase();
  init.style.display = state.fobLogo ? 'none' : 'block';
  logo.style.backgroundImage = state.fobLogo ? `url(${state.fobLogo})` : 'none';
}
function fobStep2() {                                      // l.261–268
  fobEl.innerHTML = `
    <h2>Koho <b>hľadáte?</b></h2>
    <p class="desc" style="margin-bottom:22px">Podľa toho vám Robiq predvyberie ľudí. Dá sa kedykoľvek zmeniť.</p>
    <div class="label" style="margin-bottom:11px">Odvetvie</div>
    <div class="fchips">${FIELDS.map(f => `<button type="button" class="fchip ${state.fobFields.includes(f) ? 'on' : ''}" data-field="${esc(f)}">${esc(f)}</button>`).join('')}</div>`;
  fobEl.onclick = e => { const el = e.target.closest('button[data-field]'); if (!el) return; toggleInList(state.fobFields, el.dataset.field); render(); };
}
function fobStep3() {                                      // l.272–282
  fobEl.innerHTML = `
    <h2>Kontaktná <b>osoba</b></h2>
    <p class="desc" style="margin-bottom:24px">Komu majú chodiť správy od záujemcov.</p>
    <div class="f3-col"><input class="input" id="fob-contact" placeholder="Meno a priezvisko" value="${esc(state.fobContact)}" autocomplete="name">
      <input class="input" id="fob-email" type="email" placeholder="Pracovný e-mail" value="${esc(state.fobEmail)}" autocomplete="email">
      <input class="input" id="fob-pass" type="password" placeholder="Heslo (aspoň 6 znakov)" value="${esc(state.fobPass)}" autocomplete="new-password"></div>
    <button type="button" class="terms ${state.fobTerms ? 'on' : ''}" id="terms"><span class="box">${state.fobTerms ? '✓' : ''}</span>
      <span class="txt">Súhlasím s <a href="ochrana-osobnych-udajov.html" target="_blank" rel="noopener">podmienkami Robiq</a> a potvrdzujem, že som oprávnený zastupovať túto firmu.</span></button>`;
  const upd = () => { document.getElementById('fob-next').style.opacity = fobCanContinue() ? 1 : .45; };
  bindInput('fob-contact', 'fobContact'); bindInput('fob-email', 'fobEmail', upd); bindInput('fob-pass', 'fobPass', upd);
  document.getElementById('terms').addEventListener('click', e => {
    if (e.target.closest('a')) return;                     // the link opens the terms; it must not toggle the checkbox
    state.fobTerms = !state.fobTerms; render();
  });
  fobEl.onclick = null;
}

// ═══════════ Helpers ═══════════
function bindInput(id, key, after) { const el = document.getElementById(id); el.addEventListener('input', () => { state[key] = el.value; if (after) after(); }); }
function toggleInList(list, item) { const i = list.indexOf(item); if (i === -1) list.push(item); else list.splice(i, 1); }
function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

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

// ═══════════ Start ═══════════
(async () => {
  state.loading = true; render();
  try { await loadMe(); await loadPostings(); } catch (e) { fail(e); }
  state.loading = false;
  subscribe();
  render();
})();

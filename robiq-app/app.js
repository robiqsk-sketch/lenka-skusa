// Robiq — app logic. UI follows Robiq MVP.dc.html (line numbers in comments);
// data lives in Supabase (see ../supabase/schema.sql).

const CFG = window.ROBIQ_CONFIG;
const sb = supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);

// ═══════════ State ═══════════
// `screen` decides which <section> is visible: app · login · pick · ob · fob
const initialState = () => ({
  screen: 'app', authed: false, role: 'student', uid: null, pendingJob: null, gate: false, isAdmin: false,
  oauth: false, oauthEmail: '', oauthRole: null,           // signed in (Google) but registration unfinished → finish it in-app; oauthRole = role already chosen, if any
  tab: 0, ftab: 0, loading: false, accMenu: false, notifOn: true, rowMenu: null,
  detail: null, toast: '', banner: false, bannerName: '', delIdx: null, delAccount: false, report: null,
  // feed (guest + student)
  postings: [], likedIds: [], skippedIds: [], blockedFirms: [],
  // student
  obStep: 1, obName: '', obEmail: '', obPass: '', obSkills: [], customSkill: '', obHours: 1, availDays: ['So', 'Ne'], availTimes: ['Poobede'],
  profEdit: false, birth: '', bio: '', obTerms: false,
  cityId: null, commute: '30km',                           // student: home city (table cities) + how far they travel
  avatarPath: null, obPhotoFile: null, obPhotoPreview: '',
  matches: [], activeChat: 0, draft: '', myInterests: [],
  // company
  fobStep: 1, fobName: '', fobIco: '', fobLogo: '', fobLogoFile: null, fobFields: [], fobContact: '', fobEmail: '', fobPass: '', fobTerms: false,
  fobRpo: null,                                            // result of the IČO lookup for state.fobIco (see rpoLookup)
  fpName: '', fpDesc: '', fpLogo: '', fpIco: '', fpVerified: false, fpRpo: null,
  offers: [], candidates: [], suggestions: {}, contacted: [], blocked: [], fchats: [], activeFChat: 0, fdraft: '',
  invitedPostingIds: [],                                   // student: postings whose company reached out first
  fT: '', fPay: '', fNeed: '', fTypes: [], aiNote: '', only18: false, fDesc: '', fCityId: null, fRemote: false, fpCityId: null,
  fPhotos: [],                                             // new posting: [{ file, url }] previews, max 3
  photoEdit: null,                                         // existing posting: { offerId, photos: [url] } overlay
});
let state = initialState();
let order = [];                                            // guest feed order (shuffled)

// ═══════════ Cities (table `cities`, loaded once) ═══════════
let CITIES = [];                                           // [{ id, name, district, lat, lng }]
const cityById = id => CITIES.find(c => c.id === id) || null;
const cityName = id => cityById(id)?.name || '';
const cityByName = name => { const n = (name || '').trim().toLowerCase(); return CITIES.find(c => c.name.toLowerCase() === n) || null; };
function kmBetween(a, b) {                                 // haversine between two city ids (same as distance_km in the DB)
  const ca = cityById(a), cb = cityById(b); if (!ca || !cb) return null; if (a === b) return 0;
  const r = x => x * Math.PI / 180, dLat = r(cb.lat - ca.lat), dLng = r(cb.lng - ca.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(ca.lat)) * Math.cos(r(cb.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
const COMMUTES = [['city', 'Len moje mesto'], ['15km', 'Do 15 km'], ['30km', 'Do 30 km'], ['any', 'Celé Slovensko']];
const commuteLabel = c => (COMMUTES.find(x => x[0] === c) || COMMUTES[2])[1];
const inReach = j => j.remote || !j.cityId || !state.cityId ? true : (() => {   // student's reach vs. a posting (feed order, badge)
  const d = kmBetween(state.cityId, j.cityId); if (d === null) return true;
  return j.cityId === state.cityId || (state.commute === '15km' && d <= 15) || (state.commute === '30km' && d <= 30) || state.commute === 'any';
})();
const cityDatalist = () => `<datalist id="cities-dl">${CITIES.map(c => `<option value="${esc(c.name)}">${esc(c.district)}</option>`).join('')}</datalist>`;
async function loadCities() {
  const { data, error } = await sb.from('cities').select('id, name, district, lat, lng').order('name');
  if (error) { console.warn('cities', error.message); return; }
  CITIES = data || [];
}
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

// ═══════════ Usage statistics (table `events`, read only by admin.html) ═══════════
// Deliberately anonymous: event name + role + time. No user id, no session id, no cookies —
// the privacy policy (§3.3, §7) promises visitors are not tracked. Fire-and-forget.
function track(name, props) {
  const role = state.authed ? state.role : 'guest';
  sb.from('events').insert({ name, role, props: props || {} }).then(({ error }) => { if (error) console.warn('track', name, error.message); });
}

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
    photos: p.photos || [], cityId: p.city_id || null, city: p.cities?.name || cityName(p.city_id), remote: !!p.remote,
  };
}
function shuffle(list) { return list.map(x => x.id).sort(() => Math.random() - .5); }

async function loadPostings() {
  const q = (sel) => sb.from('postings').select(sel).eq('active', true).order('created_at', { ascending: false });
  let { data, error } = await q('*, companies(name, verified, logo_url), cities(name)').eq('blocked', false);
  if (error) ({ data, error } = await q('*, companies(name, verified, logo_url)'));   // DB migrations not applied yet (blocked / cities) → feed still works
  if (error) throw error;
  state.postings = data.map(jobFromRow);
  if (!order.length) order = shuffle(state.postings);
}

async function loadMe() {                                  // who is signed in, and their role data
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { state.authed = false; state.uid = null; return; }
  state.uid = session.user.id;
  const { data: prof } = await sb.from('profiles').select('role').eq('id', state.uid).maybeSingle();
  // The account exists but the registration is not finished — Google sign-in without a profile, or a profile
  // whose onboarding was interrupted (no student/company row, student without skills). The app stays locked
  // and the user finishes the steps (name, skills, time) first.
  if (!prof || await profileUnfinished(prof.role)) {
    const u = session.user, meta = u.user_metadata || {};
    state.authed = false; state.oauth = true; state.oauthEmail = u.email || ''; state.oauthRole = prof ? prof.role : null;
    if (!state.obName)  state.obName  = meta.full_name || meta.name || '';
    if (!state.fobContact) state.fobContact = meta.full_name || meta.name || '';
    return;
  }
  state.oauth = false; state.oauthRole = null;
  state.authed = true; state.role = prof.role;
  if (prof.role === 'student') await loadStudent(); else await loadCompany();
  const { data: admin } = await sb.rpc('is_admin');       // admins get a „Štatistika" item in the account menu (admin.html)
  state.isAdmin = admin === true;
}
async function profileUnfinished(role) {                   // true → the role row is missing or has no skills yet
  if (role === 'student') {
    const { data: s } = await sb.from('students').select('name, birth, skills').eq('id', state.uid).maybeSingle();
    if (s && (s.skills || []).length) return false;
    if (s) { state.obName = state.obName || s.name || ''; state.birth = state.birth || s.birth || ''; }   // keep what step 1 already saved
    return true;
  }
  const { data: c } = await sb.from('companies').select('id').eq('id', state.uid).maybeSingle();
  return !c;
}
// Account exists, registration unfinished → continue where it stopped (role already chosen → skip the pick screen).
function resumeOnboarding() {
  state.pickFrom = 'app';
  state.screen = state.oauthRole === 'firm' ? 'fob' : state.oauthRole === 'student' ? 'ob' : 'pick';
  state.obStep = 1; state.fobStep = 1;
  if (state.screen === 'ob' && obCanContinue()) state.obStep = 2;   // name + birth already known → straight to skills
}

async function loadStudent() {
  const [{ data: s }, { data: ints }, { data: skips }, { data: invites }] = await Promise.all([
    sb.from('students').select('*').eq('id', state.uid).single(),
    sb.from('interests').select('posting_id, postings(id, title, pay, companies(name, logo_url))').eq('student_id', state.uid),
    sb.from('skips').select('posting_id').eq('student_id', state.uid),
    sb.from('company_interests').select('posting_id').eq('student_id', state.uid),
  ]);
  state.invitedPostingIds = (invites || []).map(x => x.posting_id);
  if (s) Object.assign(state, { obName: s.name, obSkills: s.skills || [], obHours: s.hours, availDays: s.avail_days || [],
    availTimes: s.avail_times || [], birth: s.birth || '', bio: s.bio || '', avatarPath: s.avatar_path || null, cityId: s.city_id || null, commute: s.commute || '30km' });
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
  if (c) Object.assign(state, { fpName: c.name, fpDesc: c.description || '', fpLogo: c.logo_url || '', fpIco: c.ico || '', fpVerified: c.verified, fpCityId: c.city_id || null });
  if (c && !c.verified && ICO_RE.test(c.ico)) await verifyCompany();   // not verified yet (e-mail confirmation, register was down…) → try again
  state.offers = (posts || []).map(p => ({ id: p.id, t: p.title, pay: p.pay + ' € / hod', views: p.views,
    likes: p.interests?.[0]?.count || 0, m: p.matches?.[0]?.count || 0, need: p.need, on: p.active,
    blocked: !!p.blocked, blockReason: p.block_reason || '', photos: p.photos || [] }));   // blocked by Robiq (admin) — the company cannot lift it
  state.contacted = (cints || []).map(x => x.student_id + ':' + x.posting_id);
  await loadCandidates();
  await loadSuggestions();
  await loadMatches();
}

// Anonymous suggestions per posting (suggest_candidates): skills, hours, availability, score — no name or photo.
async function loadSuggestions() {
  state.suggestions = {};
  await Promise.all(state.offers.filter(o => o.on && !o.blocked).map(async o => {
    const { data } = await sb.rpc('suggest_candidates', { p_posting: o.id });
    state.suggestions[o.id] = (data || []).filter(r => !r.interested);   // those who already liked are in Brigádnici with a name
  }));
}

// Firma vidí o kandidátovi len to, čo vracia funkcia candidate_profiles (meno, zručnosti, hodiny, fotka) — nie dátum narodenia ani bio.
async function loadCandidateProfiles(ids) {
  if (!ids.length) return {};
  const { data, error } = await sb.rpc('candidate_profiles', { p_ids: ids });
  if (error) console.warn('candidate_profiles', error.message);
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
    return { id: s.id, n: s.name || 'Študent', ini: initialsOf(s.name), hrs: (HOURS[s.hours] || '') + (s.city ? ' · 📍 ' + s.city : ''), photo: avatarUrl(s.avatar_path),
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
      otherId: isStudent() ? m.company_id : m.student_id,   // for „Nahlásiť" in the chat header
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
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'company_interests' }, ({ new: ci }) => {
      if (!isStudent() || ci.student_id !== state.uid || state.invitedPostingIds.includes(ci.posting_id)) return;
      state.invitedPostingIds.push(ci.posting_id);
      const j = state.postings.find(p => p.id === ci.posting_id);
      showToast(j ? `${j.f} ťa oslovila: ${j.t}` : 'Firma ťa oslovila — pozri Objavuj.');
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
  if (!state.authed && dir === 'like') { state.gate = true; state.pendingJob = job; state.detail = null; render(); track('gate_shown'); return; }
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
  if (state.oauth) resumeOnboarding();                     // signed in, but the registration steps are not done yet
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
    track('login', { via: 'email' });
  },
  // Forgotten password: Supabase e-mails a link that opens this page with type=recovery → screen 'reset' (see start).
  forgot: async () => {
    const email = document.getElementById('login-email').value.trim();
    setErr('login-err', '');
    if (!email) { setErr('login-err', 'Napíš hore svoj e-mail a klikni znova na „Zabudol som heslo“.'); return; }
    const btn = document.getElementById('forgot-btn'); btn.disabled = true;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    btn.disabled = false;
    if (error) { setErr('login-err', error.message); return; }
    setErr('login-err', 'Ak tento e-mail má účet, poslali sme naň odkaz na nastavenie nového hesla. Pozri aj spam.');
    track('password_reset_sent');
  },
  doReset: async () => {
    const p1 = document.getElementById('reset-pass').value, p2 = document.getElementById('reset-pass2').value;
    setErr('reset-err', '');
    if (p1.length < 6) { setErr('reset-err', 'Heslo musí mať aspoň 6 znakov.'); return; }
    if (p1 !== p2) { setErr('reset-err', 'Heslá sa nezhodujú.'); return; }
    const btn = document.getElementById('reset-btn'); btn.disabled = true;
    const { error } = await sb.auth.updateUser({ password: p1 });
    btn.disabled = false;
    if (error) { setErr('reset-err', error.message.includes('different from the old') ? 'Nové heslo musí byť iné ako staré.' : error.message); return; }
    document.getElementById('reset-pass').value = ''; document.getElementById('reset-pass2').value = '';
    await enterApp();
    showToast('Heslo je zmenené. ✓');
  },
  goRegister:  () => { state.pickFrom = 'login'; state.screen = 'pick'; state.obStep = 1; state.fobStep = 1; },   // from the login card
  goSignup:    () => { state.pickFrom = 'app';   state.screen = 'pick'; state.obStep = 1; state.fobStep = 1; },   // from the feed header
  goFirmReg:   () => { state.screen = 'fob'; state.fobStep = 1; track('reg_start', { role: 'firm' }); },
  pickStudent: () => { state.screen = 'ob';  state.obStep = 1; track('reg_start', { role: 'student' }); },
  pickFirm:    () => { state.screen = 'fob'; state.fobStep = 1; track('reg_start', { role: 'firm' }); },
  goLogin:     () => { state.screen = 'login'; setErr('login-err', ''); },
  // "← Späť" on login and account-type screens: login → feed; pick → wherever it was opened from
  back:        () => { state.screen = state.screen === 'pick' ? (state.pickFrom || 'app') : 'app'; },
  // Google sign-in: Supabase redirects to Google and back to this page; loadMe() then decides
  // whether the user already has a profile (→ app) or has to pick an account type (→ pick).
  google: async () => {
    track('login_google_click');
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    if (error) fail(error);
  },
  goPonuky:    () => { state.ftab = 2; },
  // gate — l.1444–1446
  gateClose:   () => { state.gate = false; state.pendingJob = null; },
  gateLogin:   () => { state.gate = false; state.screen = 'login'; },
  gateSignup:  () => { state.gate = false; state.pickFrom = 'app'; state.screen = 'pick'; state.obStep = 1; state.fobStep = 1; },
  // account menu — l.1515–1524
  menuToggle:  el => { if (el && el.classList.contains('a-menu')) { state.accMenu = true; return; } state.accMenu = !state.accMenu; },
  menuProfile: () => { if (isStudent()) state.tab = 2; else state.ftab = 3; state.accMenu = false; },
  goProfileEdit: () => { state.tab = 2; state.profEdit = true; },
  menuClose:   () => { state.accMenu = false; },
  menuHelp:    () => { state.accMenu = false; location.href = 'mailto:support@robiq.sk?subject=Robiq%20%E2%80%93%20pomoc'; },
  menuTerms:   () => { state.accMenu = false; window.open('podmienky.html', '_blank', 'noopener'); },
  menuStats:   () => { state.accMenu = false; location.href = 'admin.html'; },   // admin only — the session is shared, no second sign-in
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
  goNova:      () => { state.ftab = 9; if (!state.fCityId) state.fCityId = state.fpCityId; },   // the company's seat prefills the place
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
  // Reports (⚑) — a posting from its detail, the other party from the chat header.
  reportPosting: () => { const d = state.detail; if (!d) return; state.detail = null; state.report = { type: 'posting', id: String(d.id), label: `${d.t} — ${d.f}`, reason: 'scam', note: '' }; },
  reportChat:  () => {
    const list = isStudent() ? state.matches : state.fchats, cur = list[isStudent() ? state.activeChat : state.activeFChat];
    if (!cur) return;
    state.report = { type: isStudent() ? 'company' : 'student', id: cur.otherId, label: cur.name, reason: 'inappropriate', note: '' };
  },
  reportCancel: () => { state.report = null; },
  chatWarnOk:  () => { try { localStorage.setItem('robiq_chat_warn', '1'); } catch {} },
  reportSend: async () => {
    const r = state.report; if (!r) return;
    r.note = document.getElementById('report-note').value.trim();
    const btn = document.getElementById('report-send'); btn.disabled = true;
    const { error } = await sb.from('reports').insert({ reporter_id: state.authed ? state.uid : null, target_type: r.type, target_id: r.id, reason: r.reason, note: r.note });
    btn.disabled = false;
    if (error) { setErr('report-err', error.message); return; }
    state.report = null; showToast('Ďakujeme, nahlásenie sme dostali. Pozrieme sa na to.');
    track('report', { type: r.type, reason: r.reason });
  },
  // profile — l.1616; saving happens on "✓ Hotovo"
  fpVerify: async () => {                                  // company profile: "Overiť znova"
    const r = await verifyCompany();
    if (!r) { showToast('Overenie sa nepodarilo. Skúste to neskôr.'); return; }
    showToast(r.verified ? 'Firma je overená. ✓' : rpoText(r));
    await loadPostings();                                  // the badge on the cards follows `verified`
  },
  profEditToggle: async () => {
    if (state.profEdit && state.birth && !isOldEnough()) {   // birth set for the first time in the profile — same age rule as step 1
      showToast(`Robiq je pre ľudí od ${MIN_AGE} rokov.`); return;
    }
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
    if (!novaCanPublish()) { showToast(!state.fT.trim() ? 'Zadajte názov pozície.' : 'Vyberte miesto výkonu zo zoznamu, alebo označte „Na diaľku“.'); return; }
    try {
      const { data: row, error } = await sb.from('postings').insert({ company_id: state.uid, title: state.fT.trim(), pay: state.fPay.trim() || '8',
        need: Math.max(1, parseInt(state.fNeed, 10) || 1), types: state.fTypes, only18: state.only18, ai_note: state.aiNote, description: state.fDesc.trim(),
        city_id: state.fRemote ? null : state.fCityId, remote: state.fRemote })
        .select('id').single();
      if (error) throw error;
      if (state.fPhotos.length) {                          // the row exists now → upload the photos under its id
        const urls = [];
        for (const [n, p] of state.fPhotos.entries()) { try { urls.push(await uploadPostingPhoto(row.id, p.file, n)); } catch (e) { console.warn('photo upload', e); } }
        if (urls.length) await sb.from('postings').update({ photos: urls }).eq('id', row.id);
        if (urls.length < state.fPhotos.length) showToast('Niektoré fotky sa nepodarilo nahrať.');
      }
      Object.assign(state, { fT: '', fPay: '', fNeed: '', fTypes: [], aiNote: '', only18: false, fDesc: '', fPhotos: [], fCityId: state.fpCityId, fRemote: false, ftab: 0 });   // straight to candidates
      await loadCompany(); await loadPostings();
      const n = Object.values(state.suggestions)[0]?.length ?? 0;
      const first = state.offers[0] && state.suggestions[state.offers[0].id] ? state.suggestions[state.offers[0].id].length : n;
      showToast(first ? `Inzerát zverejnený — ${first} ${first === 1 ? 'kandidát sedí' : first < 5 ? 'kandidáti sedia' : 'kandidátov sedí'} na profil pozície.` : 'Inzerát zverejnený. Kandidátov navrhneme, hneď ako sa objavia.');
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
    try {
      const { data: files } = await sb.storage.from('posting-photos').list(`${state.uid}/${o.id}`);   // photos go with the posting
      if (files?.length) await sb.storage.from('posting-photos').remove(files.map(f => `${state.uid}/${o.id}/${f.name}`));
      const { error } = await sb.from('postings').delete().eq('id', o.id); if (error) throw error;
      await loadCompany(); await loadPostings(); showToast('Inzerát zmazaný.');
    } catch (e) { fail(e); }
  },
  // "Fotky" on an existing posting (row menu ⋯)
  photoClose: () => { state.photoEdit = null; },
  photoRemove: async el => {
    const pe = state.photoEdit; if (!pe) return;
    const url = pe.photos[+el.dataset.i]; if (!url) return;
    try {
      await sb.storage.from('posting-photos').remove([photoPath(url)]);
      pe.photos = pe.photos.filter(u => u !== url);
      const { error } = await sb.from('postings').update({ photos: pe.photos }).eq('id', pe.offerId); if (error) throw error;
      await loadCompany(); await loadPostings();
    } catch (e) { fail(e); }
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
      avail_days: state.availDays, avail_times: state.availTimes, birth: state.birth || null, bio: state.bio, city_id: state.cityId, commute: state.commute, updated_at: new Date().toISOString() }).eq('id', state.uid);
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
// Report form: reason buttons (inside the overlay, before the body's data-go handler)
document.getElementById('a-layers').addEventListener('click', e => {
  const b = e.target.closest('[data-reason]'); if (!b || !state.report) return;
  e.stopPropagation(); state.report.reason = b.dataset.reason; render();
});

// ═══════════ Render ═══════════
function render() {
  for (const s of ['app', 'login', 'reset', 'pick', 'ob', 'fob']) document.getElementById('scr-' + s).hidden = state.screen !== s;
  // Login screen is dark on phones: page background + Safari bar colour follow it
  const dark = state.screen === 'login' && matchMedia('(max-width: 640px)').matches;
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#120d2b' : '#EEEBF7');
  if (state.screen === 'pick') {
    const note = document.getElementById('pick-note');
    note.hidden = !state.oauth;
    if (state.oauth) note.innerHTML = `Prihlásený cez Google ako <b>${esc(state.oauthEmail)}</b>. Vyber, aký účet chceš vytvoriť — alebo <button class="link" data-go="logout" style="padding:0">sa odhlás</button>.`;
    document.getElementById('pick-links').hidden = state.oauth;
  }
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
  const note = document.getElementById('report-note'); if (note) note.addEventListener('input', () => { state.report.note = note.value; });
  const pePhoto = document.getElementById('pe-photo');     // photos overlay: upload straight away
  if (pePhoto) pePhoto.addEventListener('change', async e => {
    const pe = state.photoEdit; if (!pe) return;
    const files = pickPhotos(e.target.files || [], pe.photos.length); if (!files.length) return;
    showToast('Nahrávam…');
    try {
      for (const [n, f] of files.entries()) pe.photos.push(await uploadPostingPhoto(pe.offerId, f, pe.photos.length + n));
      const { error } = await sb.from('postings').update({ photos: pe.photos }).eq('id', pe.offerId); if (error) throw error;
      await loadCompany(); await loadPostings(); render(); showToast('Fotky uložené.');
    } catch (err) { fail(err); }
  });
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
      <button class="notif" data-go="menuNotif"><span style="display:flex;align-items:center;gap:10px"><span class="ic">◇</span>Notifikácie</span>
        <span class="st" style="color:${state.notifOn ? '#15803D' : '#6E688C'}">${state.notifOn ? 'Zap.' : 'Vyp.'}</span></button>
      <button data-go="menuHelp"><span class="ic">?</span>Pomoc a podpora</button>
      <button data-go="menuTerms"><span class="ic">§</span>Podmienky a ochrana údajov</button>
      ${state.isAdmin ? `<hr><button data-go="menuStats"><span class="ic">▤</span>Štatistika Robiq</button>` : ''}<hr>
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
  const inv = id => state.invitedPostingIds.includes(id) ? 1 : 0, near = j => inReach(j) ? 1 : 0;
  return state.postings
    .filter(j => !state.skippedIds.includes(j.id) && !state.blockedFirms.includes(j.f) && (!j.only18 || adult))
    .sort(state.authed ? (a, b) => (inv(b) - inv(a)) || (near(b) - near(a)) || (b.id - a.id)   // invitations, then within reach, then newest
                       : (a, b) => order.indexOf(a.id) - order.indexOf(b.id));
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
  const noCity = state.authed && isStudent() && !state.cityId && CITIES.length ? `
    <div class="city-nudge">📍 <b>Doplň si mesto</b> — firmy ťa potom nájdu na brigády vo svojom okolí a ponuky zoradíme podľa vzdialenosti.
      <button data-go="goProfileEdit">Doplniť</button></div>` : '';
  return `<div class="a-wrap">
    <div class="a-title"><h2>Ponuky <b>pre teba</b></h2>${state.authed ? '<span class="sorted">✦ zoradené podľa zhody s tvojím profilom</span>' : ''}</div>
    ${noCity}${tip}${cards}</div>`;
}

// "Trnava" · "Na diaľku" · "Trnava · 12 km od teba" (student with a city)
function placeTxt(j) {
  if (j.remote) return 'Na diaľku';
  if (!j.city) return '';
  const d = state.authed && isStudent() && state.cityId && j.cityId ? kmBetween(state.cityId, j.cityId) : null;
  return d === null || d === 0 ? j.city : `${j.city} · ${Math.round(d)} km od teba`;
}
function jobCard(j) {                                      // l.425–463
  const liked = state.likedIds.includes(j.id);
  const pct = Math.round(Math.max(0, j.need - (j.taken || 0)) / j.need * 100);
  const menu = state.rowMenu !== 'j' + j.id ? '' : `
    <div class="row-menu" data-rowmenu="1">
      <button data-job="${j.id}" data-act="report">Nahlásiť inzerát</button>
      <button class="danger" data-job="${j.id}" data-act="block">Zablokovať firmu</button>
    </div>`;
  const invited = state.invitedPostingIds.includes(j.id) && !liked;
  return `<div class="job ${invited ? 'invited' : ''}">
    ${invited ? `<div class="invite-badge">✦ Firma ťa oslovila — sedíš na túto pozíciu</div>` : ''}
    <div class="top"><div class="posted">${esc(j.posted)}</div>
      <div class="more"><button class="dots-btn" data-rowmenu="1" aria-label="Ďalšie možnosti" data-job="${j.id}" data-act="menu">⋯</button>${menu}</div></div>
    <div class="who" data-job="${j.id}" data-act="open">
      <div class="lg" style="${logoStyle(j)}">${logoText(j)}</div>
      <div style="flex:1;min-width:0"><div class="t">${esc(j.t)}</div><div class="f">${esc(j.f)}${placeTxt(j) ? ` · ${esc(placeTxt(j))}` : ''}</div>
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
    ${s.birth
      ? `<div class="p-birth"><div class="l">Dátum narodenia<small>nedá sa zmeniť</small></div><div class="v">${esc(fmtDate(s.birth))}</div></div>`
      : `<div class="p-birth"><div class="l">Dátum narodenia<small>nastavíš len raz</small></div><input type="date" id="p-birth" value="" max="${maxBirth()}"></div>`}
    <div class="p-bio-edit"><div class="label" style="margin-bottom:8px">Bio</div>
      <textarea id="p-bio" rows="3" maxlength="240" placeholder="Napíš pár viet o sebe — čo študuješ, čo ťa baví, kedy máš čas…">${esc(s.bio)}</textarea>
      <div class="hint" style="margin-top:6px">Nepíš sem citlivé údaje — zdravie, náboženstvo, politické názory, rodné číslo.</div></div>
    <div class="p-sec">Tvoje zručnosti — nastav úroveň</div>
    ${skillsEditor()}
    <div class="p-sec" style="margin-bottom:10px">Dostupnosť</div>
    ${availabilityEditor()}
  </div>`;
  return `<div class="prof">
    <div class="pcard">
      <div class="p-head">
        ${avatarHtml('p-ava', avatarUrl(s.avatarPath), initials())}
        <div style="flex:1;min-width:0"><div class="p-name">${esc(s.obName.trim() || 'Študent')}</div><div class="p-sub">Študent · <span id="p-hours">${HOURS[s.obHours]}</span>${s.cityId ? ` · ${esc(cityName(s.cityId))}${s.commute !== 'city' ? ' (' + commuteLabel(s.commute).toLowerCase() + ')' : ''}` : ''}</div></div>
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
      <div style="flex:1;min-width:0"><div class="n">${esc(cur.name)}</div>
        <div class="j ${isFirm ? 'firm' : ''}">${isFirm ? 'Uchádzač · ' : '✓ Zhoda · '}${esc(cur.job)}</div></div>
      <button class="chat-report" data-go="reportChat" title="Nahlásiť">⚑ Nahlásiť</button></div>`;
  const msgs = (cur ? cur.msgs : []).map(m => `<div class="msg ${m.me ? 'me' : 'them'}">${esc(m.txt)}</div>`).join('');
  if (!list.length) return `<div class="p-empty">${isFirm
    ? 'Zatiaľ žiadne konverzácie. Chat vznikne, keď o kandidáta prejavíte záujem a on oň prejavil záujem tiež.'
    : 'Zatiaľ žiadne zhody. Chat vznikne, keď o teba prejaví záujem firma, ktorej si dal „Mám záujem".'}</div>`;
  // One-time notice (per browser): the chat is not end-to-end encrypted — privacy policy §3.4, terms §8.
  let warn = '';
  try { if (!localStorage.getItem('robiq_chat_warn')) warn = `<div class="chat-warn">🔒 Chat nie je šifrovaný medzi zariadeniami — neposielaj sem fotky dokladov, rodné číslo ani platobné údaje. Správy vidí druhá strana a technicky aj Robiq.
      <button data-go="chatWarnOk">Rozumiem</button></div>`; } catch {}
  return `<div class="chat">
    <div class="chat-list">${items}</div>
    <div class="chat-box">${head}${warn}
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
    const groups = s.offers.filter(o => o.on && !o.blocked).map(o => {
      const cands = visible.filter(c => c.postingId === o.id).sort((a, b) => new Date(b.at) - new Date(a.at));
      const sugg = s.suggestions[o.id] || [];
      if (!cands.length && !sugg.length) return '';
      const count = cands.length ? cands.length + (cands.length === 1 ? ' kandidát' : cands.length < 5 ? ' kandidáti' : ' kandidátov') : '';
      return `<div class="cgroup">
        <div class="cgroup-head"><div class="t">${esc(o.t)}</div>${count ? `<span class="c">${count}</span>` : ''}</div>
        ${cands.length ? `<div class="cards">${cands.map(candCard).join('')}</div>` : ''}
        ${sugg.length ? `
          <div class="sugg-head"><span class="eb">✦ Navrhovaní kandidáti</span><span class="s">Sedia na inzerát podľa zručností a dostupnosti. Meno a fotku uvidíte, keď prejavia záujem.</span></div>
          <div class="cards">${sugg.map(r => suggCard(o, r)).join('')}</div>` : ''}
      </div>`;
    }).join('');
    body = groups || `<div class="empty-card narrow">
      <div class="h">Zatiaľ nikto neprejavil záujem</div>
      <div class="p">Kandidáti sa tu objavia, keď klepnú „Mám záujem" na niektorý z vašich inzerátov.</div></div>`;
  }
  const has = s.authed && (s.candidates.length > 0 || Object.values(s.suggestions).some(l => l.length));
  return `<div class="a-wrap">
    <div class="a-title" style="align-items:center"><h2>Ponuka <b>brigádnikov</b></h2>${has ? '<span class="sorted">✦ zoradené podľa zhody s vašimi ponukami</span>' : ''}</div>
    ${body}</div>`;
}
// Anonymous suggestion card: no name, no photo — skills, hours, availability, match score, "Osloviť".
function suggCard(o, r) {
  const key = r.student_id + ':' + o.id, done = r.contacted || state.contacted.includes(key);
  const days = (r.avail_days || []).length === 7 ? 'každý deň' : (r.avail_days || []).join(', ');
  const times = (r.avail_times || []).map(t => t.toLowerCase()).join(', ');
  const avail = [days, times].filter(Boolean).join(' · ') || 'dostupnosť neuvedená';
  const place = !r.city ? '' : (r.distance_km === null || r.distance_km === undefined || r.distance_km === 0) ? `📍 ${r.city}` : `📍 ${r.city} · ${r.distance_km} km`;
  return `<div class="cand sugg">
    <div class="top">
      <div class="av anon">${PERSON}</div>
      <div><div class="n">Brigádnik</div><div class="s">${esc(HOURS[r.hours] || '')}${r.score ? ` · zhoda ${r.score} %` : ''}</div><div class="s">${esc(avail)}</div>${place ? `<div class="s">${esc(place)}</div>` : ''}</div>
    </div>
    ${(r.skills || []).length ? `<div class="skills">${r.skills.map(k => `<span>${esc(k)}</span>`).join('')}</div>` : ''}
    ${done ? `<div class="sent">✓ Oslovený — čaká sa na odpoveď</div>` : `<button class="contact" data-sugg="${key}" data-act="invite">✦ Osloviť</button>`}
  </div>`;
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
  active: state.offers.filter(o => o.on && !o.blocked).length,
  views: state.offers.reduce((a, o) => a + o.views, 0),
  likes: state.offers.reduce((a, o) => a + o.likes, 0),
  m: state.offers.reduce((a, o) => a + o.m, 0),
});
function ponuky() {
  const S = sums();
  const rows = state.offers.map((o, i) => {
    const menu = state.rowMenu !== 'o' + i ? '' : `
      <div class="row-menu w186" data-rowmenu="1">
        <button data-offer="${i}" data-act="photos">Fotky „deň v práci“${o.photos.length ? ` (${o.photos.length})` : ''}</button>
        <button data-offer="${i}" data-act="dup">Duplikovať</button>
        <button class="danger" data-offer="${i}" data-act="askDel">Zmazať inzerát</button></div>`;
    return `<div class="offer ${o.on && !o.blocked ? '' : 'off'}">
      <div><div class="t">${esc(o.t)}</div><div class="pay">${esc(o.pay)}</div>
        ${o.blocked ? `<div class="blocked-note">⛔ Pozastavené Robiqom${o.blockReason ? ': ' + esc(o.blockReason) : ''} · napíšte na support@robiq.sk</div>` : ''}</div>
      <div class="stat"><div class="n">${o.views}</div><div class="l">zobrazenia</div></div>
      <div class="stat"><div class="n">${o.likes}</div><div class="l">záujmy</div></div>
      <div class="stat"><div class="n green">${o.m}</div><div class="l">zhody</div></div>
      <div class="stat"><div class="n">${Math.min(o.m, o.need || 1)} / ${o.need || 1}</div><div class="l">obsadené</div></div>
      <span class="st ${o.on && !o.blocked ? 'on' : 'paused'}">${o.blocked ? 'Pozastavená Robiqom' : o.on ? 'Aktívna' : 'Pozastavená'}</span>
      <div class="act">${o.blocked ? '' : `<button class="tg" data-offer="${i}" data-act="toggle">${o.on ? 'Pozastaviť' : 'Aktivovať'}</button>`}
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
const novaCanPublish = () => !!state.fT.trim() && (state.fRemote || !!state.fCityId);   // title + a place (city or remote)
function nova() {
  const s = state;
  return `<div class="nova-wrap">
    <button class="back back-top" data-go="goPonuky">← Späť na inzeráty</button>
    <h2>Nový <b>inzerát</b></h2>
    <div class="form-card">
      <div><div class="label">Názov pozície <b class="req">*</b></div><input class="input" id="f-t" placeholder="napr. Barista — víkendy" value="${esc(s.fT)}"></div>
      <div class="two">
        <div><div class="label">Hodinová sadzba (€)</div><input class="input" id="f-pay" placeholder="napr. 8,50" value="${esc(s.fPay)}"></div>
        <div><div class="label">Počet ľudí</div><input class="input" id="f-need" type="number" min="1" placeholder="1" value="${esc(s.fNeed)}"></div>
      </div>
      <div><div class="label">Miesto <b class="req">*</b></div>
        <div class="place-row"><input class="input" id="f-city" list="cities-dl" placeholder="Mesto zo zoznamu" value="${esc(cityName(s.fCityId))}" autocomplete="off" ${s.fRemote ? 'disabled' : ''}>
          <button type="button" class="tchip ${s.fRemote ? 'on' : ''}" data-act="remote">🏠 Na diaľku</button></div>${cityDatalist()}</div>
      <div><div class="label">Vek kandidátov</div>
        <div class="seg"><button class="${s.only18 ? '' : 'on'}" data-go="set18All">Bez obmedzenia</button><button class="${s.only18 ? 'on' : ''}" data-go="set18Only">Len 18+</button></div></div>
      <div><div class="label" style="margin-bottom:10px">Typ brigády</div>
        <div class="tchips">${TYPES.map(t => `<button class="tchip ${s.fTypes.includes(t) ? 'on' : ''}" data-type="${t}" data-act="type">${t}</button>`).join('')}</div></div>
      <div><div class="label" style="margin-bottom:4px">Popis práce</div>
        <textarea id="f-desc" rows="3" maxlength="1500" placeholder="Čo bude brigádnik robiť, kde a od kedy.">${esc(s.fDesc)}</textarea></div>
      <div><div class="label" style="margin-bottom:4px">✦ Koho hľadáte</div>
        <textarea id="f-ai" rows="2" placeholder="Zručnosti a povaha práce — podľa toho zoradíme kandidátov. Nie vek, pohlavie či zdravie.">${esc(s.aiNote)}</textarea></div>
      <div><div class="label" style="margin-bottom:4px">Fotky „deň v práci“</div>
        ${photoGrid(s.fPhotos.map(p => p.url), 'f-photo', 'f-photo-rm', 'data-act="fphoto-rm"')}</div>
      <button class="publish" id="f-publish" data-go="publish" style="opacity:${novaCanPublish() ? 1 : .45}">Zverejniť ponuku</button>
    </div></div>`;
}

// Photo grid shared by the new-posting form and the "Fotky" overlay: previews + remove ✕ + an "add" tile while under 3.
const MAX_PHOTOS = 3;
function photoGrid(urls, inputId, rmAttr, rmExtra = '') {
  return `<div class="photo-grid">
    ${urls.map((u, i) => `<div class="ph" style="background-image:url('${esc(u)}')"><button type="button" class="rm" ${rmExtra} data-${rmAttr}="${i}" aria-label="Odstrániť">✕</button></div>`).join('')}
    ${urls.length < MAX_PHOTOS ? `<label class="ph add">＋ Pridať fotku<input type="file" accept="image/*" multiple id="${inputId}" hidden></label>` : ''}
  </div>`;
}
const pickPhotos = (files, have) => {                      // validates size, respects the 3-photo limit
  const out = [];
  for (const f of files) {
    if (have + out.length >= MAX_PHOTOS) { showToast(`Najviac ${MAX_PHOTOS} fotky.`); break; }
    if (f.size > 8 * 1024 * 1024) { showToast(`${f.name}: fotka je príliš veľká (max. 8 MB).`); continue; }
    out.push(f);
  }
  return out;
};
async function uploadPostingPhoto(postingId, file, n) {    // bucket posting-photos, path <uid>/<posting>/<time>-<n>.<ext>
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${state.uid}/${postingId}/${Date.now()}-${n}.${ext}`;
  const { error } = await sb.storage.from('posting-photos').upload(path, file, { contentType: file.type });
  if (error) throw error;
  return sb.storage.from('posting-photos').getPublicUrl(path).data.publicUrl;
}
const photoPath = url => decodeURIComponent(url.split('/posting-photos/')[1] || '').split('?')[0];   // public URL → storage path

// ─── Firemný profil — l.830–913 (bez kalendára) ───
function fprofil() {
  const s = state, S = sums();
  return `<div class="fprof">
    <div class="pcard">
      <div class="p-head">
        <label class="fp-logo" id="fp-logo" title="Zmeniť logo" style="background-image:${s.fpLogo ? `url('${s.fpLogo}')` : 'none'}">
          <span style="display:${s.fpLogo ? 'none' : 'block'}">${avaInit()}</span><input type="file" accept="image/*" id="fp-file"></label>
        <div style="flex:1;min-width:0"><div class="p-name">${esc(s.fpName)}</div>
          <div class="fp-badges">${s.fpVerified ? '<span class="badge-ok">✓ Overená firma</span>' : '<span class="badge-pending">◷ Neoverená firma</span>'}</div></div>
      </div>
      <div class="fp-fields">
        <div><div class="label">Názov firmy</div><input class="input" id="fp-name" value="${esc(s.fpName)}"></div>
        <div><div class="label">Sídlo (mesto) — predvyplní miesto v novom inzeráte</div><input class="input" id="fp-city" list="cities-dl" value="${esc(cityName(s.fpCityId))}" placeholder="Mesto" autocomplete="off">${cityDatalist()}</div>
        <div><div class="label">IČO — overujeme v Registri právnických osôb</div>
          <div class="fp-ico-row"><input class="input" id="fp-ico" value="${esc(s.fpIco)}" inputmode="numeric" maxlength="8" autocomplete="off">
            ${s.fpVerified ? '' : '<button class="p-edit" data-go="fpVerify">Overiť znova</button>'}</div>
          <div class="ico-note ${s.fpVerified ? 'ok' : rpoClass(s.fpRpo)}">${esc(s.fpVerified ? (rpoOk(s.fpRpo) ? rpoText(s.fpRpo) : '✓ Overená v Registri právnických osôb') : (rpoText(s.fpRpo) || 'Zatiaľ neoverené.'))}</div></div>
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
  on('f-t',    el => el.addEventListener('input', () => { state.fT = el.value; document.getElementById('f-publish').style.opacity = novaCanPublish() ? 1 : .45; }));
  on('f-pay',  el => el.addEventListener('input', () => { state.fPay = el.value; }));
  on('f-need', el => el.addEventListener('input', () => { state.fNeed = el.value; }));
  on('f-ai',   el => el.addEventListener('input', () => { state.aiNote = el.value; }));
  on('fp-name', el => { el.addEventListener('input', () => { state.fpName = el.value; });
                        el.addEventListener('change', async () => { await saveCompany({ name: state.fpName.trim() }); render(); }); });
  on('fp-desc', el => { el.addEventListener('input', () => { state.fpDesc = el.value; });
                        el.addEventListener('change', () => saveCompany({ description: state.fpDesc })); });
  on('fp-ico', el => { el.addEventListener('input', () => { el.value = el.value.replace(/\D/g, '').slice(0, 8); state.fpIco = el.value; });
                       el.addEventListener('change', async () => {          // new IČO: the DB drops `verified`, we check the register again
                         if (!ICO_RE.test(state.fpIco)) { showToast('IČO má 8 číslic.'); return; }
                         await saveCompany({ ico: state.fpIco }); await go.fpVerify(); render(); }); });
  on('fp-file', el => el.addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try { state.fpLogo = await uploadLogo(f); await saveCompany({ logo_url: state.fpLogo }); render(); } catch (err) { fail(err); }
  }));
  on('f-desc', el => el.addEventListener('input', () => { state.fDesc = el.value; }));
  on('f-city', el => el.addEventListener('input', () => { const c = cityByName(el.value); state.fCityId = c ? c.id : null;
    const b = document.getElementById('f-publish'); if (b) b.style.opacity = novaCanPublish() ? 1 : .45; }));
  on('fp-city', el => el.addEventListener('change', async () => {   // company profile: seat → prefills new postings
    const c = cityByName(el.value); if (!c && el.value.trim()) { showToast('Vyberte mesto zo zoznamu.'); return; }
    state.fpCityId = c ? c.id : null; await saveCompany({ city_id: state.fpCityId }); render();
  }));
  on('f-photo', el => el.addEventListener('change', e => {   // new posting: previews only, uploaded on publish
    for (const f of pickPhotos(e.target.files || [], state.fPhotos.length)) state.fPhotos.push({ file: f, url: URL.createObjectURL(f) });
    render();
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
    if (a === 'open')   { state.detail = j; render(); track('detail_open'); }
    if (a === 'like')   act(j, 'like');
    if (a === 'skip')   act(j, 'skip');
    if (a === 'menu')   { state.rowMenu = state.rowMenu === 'j' + j.id ? null : 'j' + j.id; render(); }
    if (a === 'report') { state.rowMenu = null; state.report = { type: 'posting', id: String(j.id), label: `${j.t} — ${j.f}`, reason: 'scam', note: '' }; render(); }
    if (a === 'block')  { state.blockedFirms.push(j.f); showToast('Firmu sme skryli z tvojho feedu.'); }
  }
  else if (d.cand) {
    const [sid, pid] = d.cand.split(':');
    const c = state.candidates.find(x => x.id === sid && x.postingId === +pid);
    if (a === 'menu')   { state.rowMenu = state.rowMenu === 'c' + d.cand ? null : 'c' + d.cand; render(); }
    if (a === 'report') { state.rowMenu = null; state.report = { type: 'student', id: sid, label: c?.name || 'Brigádnik', reason: 'inappropriate', note: '' }; render(); }
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
  else if (d.sugg && a === 'invite') {                                          // firm reaches out first
    const [sid, pid] = d.sugg.split(':');
    try {
      const { error } = await sb.from('company_interests').insert({ company_id: state.uid, student_id: sid, posting_id: +pid });
      if (error) throw error;
      state.contacted.push(d.sugg);
      const r = (state.suggestions[+pid] || []).find(x => x.student_id === sid); if (r) r.contacted = true;
      render(); showToast('Oslovené. Keď brigádnik prejaví záujem, vznikne zhoda a uvidíte jeho profil.');
    } catch (err) { fail(err); }
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
      if (a === 'photos') { state.rowMenu = null; state.photoEdit = { offerId: o.id, title: o.t, photos: [...o.photos] }; render(); }
    } catch (err) { fail(err); }
  }
  else if (a === 'type') { toggleInList(state.fTypes, d.type); render(); }
  else if (a === 'remote') { state.fRemote = !state.fRemote; if (state.fRemote && !state.fTypes.includes('Remote')) state.fTypes.push('Remote'); render(); }
  else if (a === 'fphoto-rm') {                            // new posting form: remove a preview
    const p = state.fPhotos.splice(+d.fPhotoRm, 1)[0]; if (p) URL.revokeObjectURL(p.url); render();
  }
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
      <div><div class="t">${esc(d.t)}</div><div class="f">${esc(d.f)}${placeTxt(d) ? ` · ${esc(placeTxt(d))}` : ''}</div></div></div>
      <button class="x" data-go="closeDetail">✕</button></div>
    ${d.badges.length || d.tags.length ? `<div class="chips">${d.badges.map(b => `<span class="badge">${esc(b)}</span>`).join('')}${d.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="payrow"><div class="pay">${esc(d.pay)} <small>/ hod</small></div><span class="need">${needTxt(d)}</span></div>
    ${d.desc ? `<p>${esc(d.desc)}</p>` : ''}
    ${d.ice.length ? `<div class="sec">Icebreakery</div><div class="ice">${d.ice.map(i => `<div>${esc(i)}</div>`).join('')}</div>` : ''}
    ${d.photos.length ? `<div class="sec">Deň v práci</div>
    <div class="day">${d.photos.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener" class="ph" style="background-image:url('${esc(u)}')"></a>`).join('')}</div>` : ''}
    ${state.likedIds.includes(d.id) ? `<div class="sent">✓ Záujem odoslaný</div>` : `
    <div class="act"><button class="like" data-go="detailLike">♥ Mám záujem</button><button class="skip" data-go="detailSkip">✕ Preskočiť</button></div>`}
    ${(state.authed && !isStudent() && d.companyId === state.uid) ? '' : `<div class="report-row"><button class="link" data-go="reportPosting">⚑ Nahlásiť inzerát</button></div>`}
  </div></div>`;
  // Photos of an existing posting (row menu ⋯ → Fotky)
  const pe = state.photoEdit;
  if (pe) h += `<div class="overlay del" data-go="photoClose"><div class="delm report" data-go="noop">
    <div class="h">Fotky „deň v práci“</div>
    <div class="p" style="margin-bottom:12px"><b>${esc(pe.title)}</b> · max. ${MAX_PHOTOS} fotky, uvidia ich všetci v detaile inzerátu.</div>
    ${photoGrid(pe.photos, 'pe-photo', 'i', 'data-go="photoRemove"')}
    <div class="col" style="margin-top:14px"><button class="b2" data-go="photoClose">Hotovo</button></div></div></div>`;
  // Report form (posting / company / student) — table `reports`, handled by admin.html
  const r = state.report;
  if (r) h += `<div class="overlay del" data-go="reportCancel"><div class="delm report" data-go="noop">
    <div class="h">Nahlásiť ${r.type === 'posting' ? 'inzerát' : r.type === 'company' ? 'firmu' : 'používateľa'}</div>
    <div class="p" style="margin-bottom:12px"><b>${esc(r.label)}</b></div>
    <div class="reasons">${REPORT_REASONS.map(([k, l]) => `<button type="button" class="${r.reason === k ? 'on' : ''}" data-reason="${k}">${l}</button>`).join('')}</div>
    <textarea id="report-note" rows="3" maxlength="1000" placeholder="Čo sa stalo? (nepovinné)">${esc(r.note)}</textarea>
    <div class="form-err" id="report-err"></div>
    <div class="col"><button class="b1" data-go="reportSend" id="report-send">Odoslať nahlásenie</button><button class="b2" data-go="reportCancel">Zrušiť</button></div></div></div>`;
  return h;
}
const REPORT_REASONS = [['scam', 'Podvod / vyzerá nedôveryhodne'], ['inappropriate', 'Nevhodný alebo urážlivý obsah'], ['duplicate', 'Duplicitný / spam'], ['other', 'Iné']];

// The top bar is static (see styles.css): it scrolls away with the page and does not come back mid-page.
// The document itself scrolls, so Safari can collapse its address bar.

// ─── OB — student onboarding — l.97–194 ───
// Privacy policy §10: Robiq is for people aged 16+, younger cannot register.
const MIN_AGE = 16;
const isOldEnough = () => (ageOf(state.birth) ?? -1) >= MIN_AGE;
// Latest birth date that makes someone MIN_AGE today — the date picker's upper bound.
function maxBirth() { const d = new Date(); d.setFullYear(d.getFullYear() - MIN_AGE); return d.toISOString().slice(0, 10); }
const fmtDate = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('sk-SK'); };
function obCanContinue() {
  if (state.obStep === 1) return state.obName.trim() && (state.oauth || (state.obEmail.trim() && state.obPass.length >= 6)) && isOldEnough();
  if (state.obStep === 2) return state.obSkills.length > 0;
  return state.obTerms && !!state.cityId;                  // step 3: city (required) + terms/privacy consent (also for Google sign-ups)
}
// Consent line for the last registration step (student and company). Links open in a new tab so the form is not lost.
const TERMS_HTML = (who) => `<button type="button" class="terms ${state[who] ? 'on' : ''}" id="terms"><span class="box">${state[who] ? '✓' : ''}</span>
  <span class="txt">Mám 16 rokov alebo viac, súhlasím s <a href="podmienky.html" target="_blank" rel="noopener">Podmienkami používania</a> a beriem na vedomie <a href="ochrana-osobnych-udajov.html" target="_blank" rel="noopener">Ochranu osobných údajov</a>.</span></button>`;
function obStep1Problem() {                                // why step 1 cannot continue — shown when the button is pressed anyway
  if (!state.obName.trim()) return 'Napíš svoje meno.';
  if (!state.oauth && !state.obEmail.trim()) return 'Zadaj e-mail.';
  if (!state.oauth && state.obPass.length < 6) return 'Heslo musí mať aspoň 6 znakov.';
  if (!state.birth) return 'Zadaj dátum narodenia.';
  if (!isOldEnough()) return `Robiq je pre ľudí od ${MIN_AGE} rokov — registrácia zatiaľ nie je možná.`;
  return '';
}
document.getElementById('ob-back').addEventListener('click', () => { if (state.obStep > 1) state.obStep--; else state.screen = 'pick'; render(); });
document.getElementById('ob-next').addEventListener('click', async () => {           // l.1566–1570
  if (!obCanContinue()) {
    if (state.obStep === 1) { setErr('ob-err', obStep1Problem()); if (state.birth && !isOldEnough()) track('reg_blocked', { reason: 'age' }); }
    if (state.obStep === 3) setErr('ob-err', !state.cityId ? 'Vyber svoje mesto zo zoznamu.' : 'Potvrď, že máš 16+ a súhlasíš s podmienkami.');
    return;
  }
  if (state.obStep === 1 && !state.oauth && await emailTaken(state.obEmail, 'ob-err', 'ob-next', EMAIL_TAKEN_S)) { track('reg_blocked', { reason: 'email_taken' }); return; }
  if (state.obStep < 3) { state.obStep++; render(); track('reg_step', { role: 'student', step: state.obStep }); return; }
  await registerStudent();
});
// A used e-mail stops the registration right where it is typed. Supabase signUp itself does not complain when
// e-mail confirmation is on (it hides whether an account exists) — so we ask email_taken() first (schema.sql),
// and on signUp still check `identities` (empty = the e-mail already has an account).
const EMAIL_TAKEN_S = 'Tento e-mail už má účet. Prihlás sa, alebo použi iný e-mail.';
const EMAIL_TAKEN_F = 'Tento e-mail už má účet. Prihláste sa, alebo použite iný e-mail.';
async function emailTaken(email, errId, btnId, msg) {
  const btn = document.getElementById(btnId); btn.disabled = true; setErr(errId, '');
  const { data, error } = await sb.rpc('email_taken', { p_email: email.trim() });
  btn.disabled = false;
  if (error) { console.warn('email_taken', error); return false; }   // check unavailable → signUp decides
  if (data) setErr(errId, msg);
  return !!data;
}
const signUpTaken = (data, error) => (error && /already registered/i.test(error.message)) || (!error && data?.user?.identities?.length === 0);
async function registerStudent() {
  const btn = document.getElementById('ob-next'); btn.disabled = true; setErr('ob-err', '');
  if (state.oauth) {                                       // account exists (Google) — create the profile rows directly
    // upsert: a profile row left behind by an interrupted registration must not block finishing it
    const p = await sb.from('profiles').upsert({ id: state.uid, role: 'student' }, { onConflict: 'id', ignoreDuplicates: true });
    const s = p.error ? p : await sb.from('students').upsert({ id: state.uid, name: state.obName.trim(), birth: state.birth || null,
      skills: state.obSkills, hours: state.obHours, avail_days: state.availDays, avail_times: state.availTimes, city_id: state.cityId, commute: state.commute });
    btn.disabled = false;
    if (s.error) { setErr('ob-err', s.error.message); return; }
    if (state.obPhotoFile) { try { await uploadAvatar(state.obPhotoFile); } catch (e) { console.warn('avatar upload failed', e); } state.obPhotoFile = null; state.obPhotoPreview = ''; }
    await enterApp({ tab: 0 });
    track('reg_done', { role: 'student', via: 'google' });
    return;
  }
  const { data, error } = await sb.auth.signUp({ email: state.obEmail.trim(), password: state.obPass,
    options: { data: { role: 'student', name: state.obName.trim(), birth: state.birth, skills: state.obSkills, hours: state.obHours, avail_days: state.availDays, avail_times: state.availTimes, city_id: state.cityId, commute: state.commute } } });
  btn.disabled = false;
  if (signUpTaken(data, error)) { state.obStep = 1; render(); setErr('ob-err', EMAIL_TAKEN_S); return; }   // back to the e-mail field
  if (error) { setErr('ob-err', error.message); return; }
  track('reg_done', { role: 'student', via: 'email' });
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
        ${state.oauth ? `<div class="oauth-note" style="margin:0;text-align:left">Účet cez Google: <b>${esc(state.oauthEmail)}</b></div>` : `
        <input class="input" id="ob-email" type="email" placeholder="E-mail" value="${esc(state.obEmail)}" autocomplete="email">
        <input class="input" id="ob-pass" type="password" placeholder="Heslo (aspoň 6 znakov)" value="${esc(state.obPass)}" autocomplete="new-password">`}
        <label class="ob-birth"><span>Dátum narodenia</span><input class="input" id="ob-birth" type="date" value="${esc(state.birth)}" max="${maxBirth()}" autocomplete="bday"></label>
        <div class="ob-age-note" id="ob-age-note">Robiq je pre ľudí od ${MIN_AGE} rokov. Dátum sa neskôr nedá zmeniť.</div>
        <label class="photo-btn">${state.obPhotoFile ? 'Zmeniť fotku' : 'Nahrať fotku (voliteľné)'}<input type="file" accept="image/*" id="ob-photo" hidden></label>
        ${state.obPhotoFile ? '<button type="button" class="photo-remove" id="ob-photo-remove">Odstrániť fotku</button>' : ''}</div></div>`;
  const upd = () => {
    document.getElementById('ob-next').style.opacity = obCanContinue() ? 1 : .45;
    const a = ageOf(state.birth), note = document.getElementById('ob-age-note');
    note.textContent = a !== null && a < MIN_AGE ? `Robiq je pre ľudí od ${MIN_AGE} rokov — registrácia zatiaľ nie je možná.` : `Robiq je pre ľudí od ${MIN_AGE} rokov. Dátum sa neskôr nedá zmeniť.`;
    note.classList.toggle('err', a !== null && a < MIN_AGE);
    setErr('ob-err', '');
  };
  const nameEl = document.getElementById('ob-name');
  nameEl.addEventListener('input', () => { state.obName = nameEl.value; document.getElementById('avatar').textContent = initials(); upd(); });
  const emailEl = document.getElementById('ob-email'); if (emailEl) emailEl.addEventListener('input', () => { state.obEmail = emailEl.value; setErr('ob-err', ''); upd(); });
  const passEl = document.getElementById('ob-pass');    if (passEl) passEl.addEventListener('input', () => { state.obPass = passEl.value; upd(); });
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
    ${availabilityEditor()}
    <div style="margin-top:22px">${TERMS_HTML('obTerms')}</div>`;
  obEl.onclick = e => {
    const el = e.target.closest('button'); if (!el) return;
    if (el.id === 'terms') { if (e.target.closest('a')) return; state.obTerms = !state.obTerms; render(); return; }   // the link opens the terms; it must not toggle
    editorClick(el);
  };
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
        <div class="hint">Všetko, čo sem napíšeš, použije Robiq pri AI párovaní s ponukami. Nepíš sem citlivé údaje (zdravie, náboženstvo, politické názory).</div></div></div>`;
}
// "Kde môžeš pracovať?" — city (fixed list with suggestions) + how far the student travels. Onboarding step 3 and the profile.
function placeEditor() {
  return `<div class="label">Kde môžeš pracovať?</div>
    <div class="place-row"><input class="input" id="city" list="cities-dl" placeholder="Tvoje mesto" value="${esc(cityName(state.cityId))}" autocomplete="off">
      ${state.cityId ? '<span class="ok">✓</span>' : ''}</div>${cityDatalist()}
    <div class="commute">${COMMUTES.map(([k, l]) => `<button type="button" class="${state.commute === k ? 'on' : ''}" data-commute="${k}">${l}</button>`).join('')}</div>
    <div class="hint" id="city-hint">${state.cityId ? '' : 'Vyber mesto zo zoznamu — podľa neho ťa firmy nájdu.'}</div>`;
}
function availabilityEditor() {                            // l.169–188, logic l.1542–1563
  return `<input type="range" id="hours" min="0" max="3" step="1" value="${state.obHours}">
    <div class="ticks"><span>5 h</span><span>10 h</span><span>20 h</span><span>Fulltime</span></div>
    <div class="label">Ktoré dni?</div>
    <div class="days">${DAYS.map(d => `<button type="button" class="${state.availDays.includes(d) ? 'on' : ''}" data-day="${d}">${d}</button>`).join('')}</div>
    <div class="label">Kedy počas dňa?</div>
    <div class="times">${TIMES.map(([t, sub]) => `<button type="button" class="${state.availTimes.includes(t) ? 'on' : ''}" data-time="${t}"><span>${t}</span><small>${sub}</small></button>`).join('')}</div>
    <div class="summary">${availSummary()}</div>
    <div style="margin-top:22px">${placeEditor()}</div>`;
}
function editorClick(el) {                                 // returns true when it handled the click
  if (el.dataset.add)    { addSkill(el.dataset.add); return true; }
  if (el.dataset.remove) { state.obSkills.splice(+el.dataset.remove, 1); render(); return true; }
  if (el.dataset.speak)  { const s = state.obSkills[+el.dataset.speak]; s.speak = !(s.speak !== false); render(); return true; }
  if (el.dataset.lvl)    { const [i, l] = el.dataset.lvl.split(':'); state.obSkills[+i].lvl = +l; render(); return true; }
  if (el.dataset.day)    { toggleInList(state.availDays, el.dataset.day); render(); return true; }
  if (el.dataset.commute) { state.commute = el.dataset.commute; render(); return true; }
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
  const city = document.getElementById('city');          // matches the typed name against the list; no re-render while typing
  if (city) city.addEventListener('input', () => {
    const c = cityByName(city.value); state.cityId = c ? c.id : null;
    const hint = document.getElementById('city-hint'); if (hint) hint.textContent = c ? '' : 'Vyber mesto zo zoznamu — podľa neho ťa firmy nájdu.';
    const ok = city.parentElement.querySelector('.ok'); if (ok && !c) ok.remove();
    const next = document.getElementById('ob-next'); if (next && state.screen === 'ob') next.style.opacity = obCanContinue() ? 1 : .45;
  });
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
const ICO_RE = /^[0-9]{8}$/;                               // Slovak IČO: 8 digits
function fobCanContinue() {
  if (state.fobStep === 1) return state.fobName.trim() !== '' && ICO_RE.test(state.fobIco);
  if (state.fobStep === 2) return state.fobFields.length > 0;
  return state.fobTerms && (state.oauth || (state.fobEmail.trim() && state.fobPass.length >= 6));
}
// ─── IČO ↔ Register právnických osôb (rpo_lookup / verify_my_company in schema.sql) ───
// The register answers { found, name, city, terminated } or { found: false, reason }.
// A company that is not in the register, or is dissolved, cannot register. If the register is
// down we let them through unverified — verifyCompany() retries on every later sign-in.
let rpoSeq = 0;
async function rpoLookup(ico) {
  const seq = ++rpoSeq;
  const { data, error } = await sb.rpc('rpo_lookup', { p_ico: ico });
  if (seq !== rpoSeq) return null;                         // a newer lookup is running — ignore this one
  state.fobRpo = error ? { ico, found: false, reason: 'unavailable' } : { ico, ...data };
  if (error) console.warn('rpo_lookup', error);
  return state.fobRpo;
}
function rpoText(r) {                                      // one line under the IČO field / in the profile
  if (!r) return '';
  if (r.found && r.terminated) return `✕ ${r.name} — firma je v registri zrušená.`;
  if (r.found) return `✓ ${r.name}${r.city ? ', ' + r.city : ''}`;
  if (r.reason === 'not_found') return '✕ Toto IČO sme v Registri právnických osôb nenašli. Skontrolujte ho.';
  if (r.reason === 'unavailable') return '◷ Register je teraz nedostupný — firmu overíme neskôr.';
  return 'IČO má 8 číslic.';
}
const rpoOk = r => !!r && r.found && !r.terminated;
const rpoClass = r => !r ? '' : rpoOk(r) ? 'ok' : r.reason === 'unavailable' ? 'warn' : 'err';
async function verifyCompany() {                           // signed-in company: RPO check, sets companies.verified in the DB
  const { data, error } = await sb.rpc('verify_my_company');
  if (error) { console.warn('verify_my_company', error); return null; }
  state.fpVerified = !!data.verified; state.fpRpo = data;
  return data;
}
document.getElementById('fob-back').addEventListener('click', () => { if (state.fobStep > 1) state.fobStep--; else state.screen = 'pick'; render(); });
document.getElementById('fob-next').addEventListener('click', async () => {          // l.1480–1490
  if (!fobCanContinue()) { if (state.fobStep === 1) setErr('fob-err', !state.fobName.trim() ? 'Zadajte názov firmy.' : 'IČO má 8 číslic.'); return; }
  if (state.fobStep === 1) {                               // the IČO must be a live company in the register
    const btn = document.getElementById('fob-next'); btn.disabled = true; setErr('fob-err', '');
    const r = state.fobRpo?.ico === state.fobIco ? state.fobRpo : await rpoLookup(state.fobIco);
    btn.disabled = false;
    if (!r) return;
    if (!rpoOk(r) && r.reason !== 'unavailable') { render(); setErr('fob-err', 'S týmto IČO sa firma zaregistrovať nedá.'); track('reg_blocked', { reason: 'ico_' + (r.terminated ? 'terminated' : r.reason) }); return; }   // the reason is under the field
  }
  if (state.fobStep < 3) { state.fobStep++; render(); track('reg_step', { role: 'firm', step: state.fobStep }); return; }
  if (!state.oauth && await emailTaken(state.fobEmail, 'fob-err', 'fob-next', EMAIL_TAKEN_F)) { track('reg_blocked', { reason: 'email_taken' }); return; }   // e-mail is typed in step 3
  await registerCompany();
});
async function registerCompany() {
  const btn = document.getElementById('fob-next'); btn.disabled = true; setErr('fob-err', '');
  if (state.oauth) {                                       // account exists (Google) — create the profile rows directly
    const p = await sb.from('profiles').upsert({ id: state.uid, role: 'firm' }, { onConflict: 'id', ignoreDuplicates: true });
    const c = p.error ? p : await sb.from('companies').upsert({ id: state.uid, name: state.fobName.trim(), ico: state.fobIco.trim(),
      fields: state.fobFields, contact_name: state.fobContact.trim() });
    btn.disabled = false;
    if (c.error) { setErr('fob-err', c.error.message); return; }
    if (state.fobLogoFile) { try { const url = await uploadLogo(state.fobLogoFile); await sb.from('companies').update({ logo_url: url }).eq('id', state.uid); } catch (e) { console.warn(e); } }
    await verifyCompany();                                 // the company row exists now → RPO check sets `verified`
    await enterApp({ ftab: 0 });
    track('reg_done', { role: 'firm', via: 'google' });
    return;
  }
  const { data, error } = await sb.auth.signUp({ email: state.fobEmail.trim(), password: state.fobPass,
    options: { data: { role: 'firm', name: state.fobName.trim(), ico: state.fobIco.trim(), fields: state.fobFields, contact_name: state.fobContact.trim() } } });
  btn.disabled = false;
  if (signUpTaken(data, error)) { setErr('fob-err', EMAIL_TAKEN_F); return; }
  if (error) { setErr('fob-err', error.message); return; }
  track('reg_done', { role: 'firm', via: 'email' });
  if (!data.session) {
    state.screen = 'login'; render();
    setErr('login-err', 'Poslali sme vám potvrdzovací e-mail. Po potvrdení sa prihláste.');
    return;
  }
  state.uid = data.user.id;
  if (state.fobLogoFile) { try { const url = await uploadLogo(state.fobLogoFile); await sb.from('companies').update({ logo_url: url }).eq('id', state.uid); } catch (e) { console.warn(e); } }
  await verifyCompany();                                   // (with e-mail confirmation on, loadCompany() does this at first sign-in)
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
      <div class="col"><input class="input" id="fob-name" placeholder="Názov firmy" value="${esc(state.fobName)}">
        <input class="input" id="fob-ico" placeholder="IČO (8 číslic)" value="${esc(state.fobIco)}" inputmode="numeric" maxlength="8" autocomplete="off">
        <div class="ico-note ${rpoClass(state.fobRpo)}" id="fob-ico-note">${esc(state.fobRpo?.ico === state.fobIco ? rpoText(state.fobRpo) : '')}</div></div></div>`;
  paintLogo();
  const upd = () => { document.getElementById('fob-next').style.opacity = fobCanContinue() ? 1 : .45; };
  const nameEl = document.getElementById('fob-name');
  nameEl.addEventListener('input', () => { state.fobName = nameEl.value; paintLogo(); upd(); });
  // IČO: digits only; as soon as there are 8 of them, ask the register and show the company under the field.
  const icoEl = document.getElementById('fob-ico'), noteEl = document.getElementById('fob-ico-note');
  const showRpo = r => { noteEl.textContent = rpoText(r); noteEl.className = 'ico-note ' + rpoClass(r); };
  icoEl.addEventListener('input', async () => {
    icoEl.value = icoEl.value.replace(/\D/g, '').slice(0, 8);
    state.fobIco = icoEl.value; state.fobRpo = null; setErr('fob-err', ''); upd();
    if (!ICO_RE.test(state.fobIco)) { showRpo(null); return; }
    noteEl.textContent = 'Hľadám v registri…'; noteEl.className = 'ico-note';
    const r = await rpoLookup(state.fobIco);
    if (!r || r.ico !== state.fobIco) return;             // typed on meanwhile
    showRpo(r);
    if (rpoOk(r) && !state.fobName.trim()) { state.fobName = r.name; nameEl.value = r.name; paintLogo(); upd(); }   // prefill the official name
  });
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
      ${state.oauth ? `<div class="oauth-note" style="margin:0;text-align:left">Účet cez Google: <b>${esc(state.oauthEmail)}</b></div>` : `
      <input class="input" id="fob-email" type="email" placeholder="Pracovný e-mail" value="${esc(state.fobEmail)}" autocomplete="email">
      <input class="input" id="fob-pass" type="password" placeholder="Heslo (aspoň 6 znakov)" value="${esc(state.fobPass)}" autocomplete="new-password">`}</div>
    <button type="button" class="terms ${state.fobTerms ? 'on' : ''}" id="terms"><span class="box">${state.fobTerms ? '✓' : ''}</span>
      <span class="txt">Súhlasím s <a href="podmienky.html" target="_blank" rel="noopener">Podmienkami používania</a>, beriem na vedomie <a href="ochrana-osobnych-udajov.html" target="_blank" rel="noopener">Ochranu osobných údajov</a> a potvrdzujem, že som oprávnený/á konať za túto firmu.</span></button>`;
  const upd = () => { setErr('fob-err', ''); document.getElementById('fob-next').style.opacity = fobCanContinue() ? 1 : .45; };
  bindInput('fob-contact', 'fobContact');
  if (!state.oauth) { bindInput('fob-email', 'fobEmail', upd); bindInput('fob-pass', 'fobPass', upd); }
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
// The "forgot password" e-mail link opens this page with type=recovery: the session is set from the link,
// and the user has to choose a new password before anything else (screen 'reset').
const isRecovery = location.hash.includes('type=recovery');
sb.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY' && state.screen !== 'reset') { state.screen = 'reset'; render(); } });
document.getElementById('reset-form').addEventListener('submit', e => { e.preventDefault(); go.doReset(); });
(async () => {
  state.loading = true; render();
  try { await loadCities(); await loadMe(); await loadPostings(); } catch (e) { fail(e); }
  state.loading = false;
  subscribe();
  if (state.oauth) resumeOnboarding();                     // back from Google, or a registration that was not finished
  const fromLink = location.hash.includes('access_token') || location.search.includes('code=');
  if (fromLink) history.replaceState(null, '', location.pathname);
  if (isRecovery) state.screen = 'reset';
  render();
  track('visit', isRecovery ? { via: 'password_reset' } : fromLink ? { via: 'google_return' } : {});
})();

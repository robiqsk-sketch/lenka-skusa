// Robiq — app logic. UI follows Robiq MVP.dc.html (line numbers in comments);
// data lives in Supabase (see ../supabase/schema.sql).

const CFG = window.ROBIQ_CONFIG;
const sb = supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);

// ═══════════ State ═══════════
// `screen` decides which <section> is visible: app · login · pick · ob · fob
const initialState = () => ({
  screen: 'app', authed: false, role: 'student', uid: null, pendingJob: null, gate: false, isAdmin: false,
  oauth: false, oauthEmail: '', oauthRole: null,           // signed in (Google) but registration unfinished → finish it in-app; oauthRole = role already chosen, if any
  tab: 0, ftab: 0, loading: false, accMenu: false, rowMenu: null, emailNotify: true,   // emailNotify: e-mail on new match / message
  detail: null, toast: '', banner: false, bannerName: '', delIdx: null, delAccount: false, report: null,
  // feed (guest + student)
  postings: [], likedIds: [], skippedIds: [], blockedFirms: [],   // blockedFirms: company ids hidden by the student (table blocks)
  filters: [],                                             // feed filter chips: 'near' and/or posting types (TYPES)
  blockNames: {},                                          // blocked id → name, for the „Odblokovať“ list in the profile
  // student
  obStep: 1, obName: '', obEmail: '', obPass: '', obSkills: [], customSkill: '', obHours: 1, availDays: ['So', 'Ne'], availTimes: ['Poobede'],
  skillsOpen: [],                                          // skill groups showing all their chips (registration step 2)
  profEdit: false, birth: '', bio: '', obTerms: false,
  cityId: null, commute: '30km',                           // student: home city (table cities) + how far they travel
  avatarPath: null, obPhotoFile: null, obPhotoPreview: '',
  matches: [], activeChat: 0, draft: '', myInterests: [],
  // company
  fobStep: 1, fobName: '', fobIco: '', fobLogo: '', fobLogoFile: null, fobFields: [], fobContact: '', fobEmail: '', fobPass: '', fobTerms: false,
  fobRpo: null,                                            // result of the IČO lookup for state.fobIco (see rpoLookup)
  fpName: '', fpLegal: '', fpDesc: '', fpLogo: '', fpIco: '', fpVerified: false, fpRpo: null,
  offers: [], candidates: [], suggestions: {}, contacted: [], blocked: [], fchats: [], activeFChat: 0, fdraft: '',
  invitedPostingIds: [],                                   // student: postings whose company reached out first
  fT: '', fPay: '', fNeed: '', fTypes: [], aiNote: '', only18: false, fDesc: '', fCityId: null, fRemote: false, fAddress: '', fpCityId: null,
  fPhotos: [],                                             // new posting: [{ file, url }] previews, max 3
  fEditId: null,                                           // posting being edited in the same form (null = new posting)
  photoEdit: null,                                         // existing posting: { offerId, photos: [url] } overlay
});
let state = initialState();
let order = [];                                            // guest feed order (shuffled)

// ═══════════ Theme (light / dark) ═══════════
// Per-browser preference in localStorage; without one we follow the system setting. Class `theme-dark` on <html> (styles.css tokens).
const THEME_KEY = 'robiq_theme';
const themePref = () => { try { return localStorage.getItem(THEME_KEY); } catch { return null; } };
const isDarkTheme = () => { const p = themePref(); return p ? p === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
function applyTheme() { document.documentElement.classList.toggle('theme-dark', isDarkTheme()); }
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!themePref()) { applyTheme(); render(); } });

// ═══════════ Cities (table `cities`, loaded once) ═══════════
let CITIES = [];                                           // [{ id, name, district, lat, lng }]
const cityById = id => CITIES.find(c => c.id === id) || null;
const cityName = id => cityById(id)?.name || '';
const fold = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();   // "Trenčín" → "trencin"
const cityByName = name => { const n = fold(name); return n ? CITIES.find(c => fold(c.name) === n) || null : null; };
// Custom autocomplete (a <datalist> cannot ignore diacritics): matches the start of any word, e.g. "nove m" → Nové Mesto nad Váhom.
function cityAutocomplete(input, onPick) {
  const dd = document.createElement('div'); dd.className = 'city-dd'; dd.hidden = true;
  input.insertAdjacentElement('afterend', dd);
  let items = [], sel = -1;
  const close = () => { dd.hidden = true; sel = -1; };
  const pick = c => { input.value = c.name; close(); onPick(c); };
  const show = () => {
    const q = fold(input.value);
    if (cityByName(input.value)?.name === input.value) { close(); return; }   // exact city already chosen → nothing to suggest
    items = !q ? [] : CITIES.filter(c => { const f = fold(c.name); return f.startsWith(q) || f.split(/\s+/).some(w => w.startsWith(q)); }).slice(0, 8);
    if (!items.length) { close(); return; }
    sel = -1;
    dd.innerHTML = items.map((c, i) => `<button type="button" data-i="${i}">${esc(c.name)}<small>${esc(c.district)}</small></button>`).join('');
    dd.hidden = false;
  };
  input.addEventListener('input', show);
  input.addEventListener('focus', show);
  input.addEventListener('blur', () => setTimeout(close, 150));               // let a click on an item land first
  input.addEventListener('keydown', e => {
    if (dd.hidden) return;
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(items[sel >= 0 ? sel : 0]); return; }
    else if (e.key === 'Escape') { close(); return; }
    else return;
    e.preventDefault(); [...dd.children].forEach((b, i) => b.classList.toggle('on', i === sel));
  });
  dd.addEventListener('mousedown', e => { const b = e.target.closest('button'); if (b) { e.preventDefault(); pick(items[+b.dataset.i]); } });
}
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
async function loadCities() {
  const { data, error } = await sb.from('cities').select('id, name, district, lat, lng').order('name');
  if (error) { console.warn('cities', error.message); return; }
  CITIES = data || [];
}
let toastT, bannerT, rt;
const avatarUrls = {};                                     // storage path → signed URL (bucket "avatars" is private)

// ═══════════ Profile photos (private bucket) ═══════════
async function resolveAvatars(paths) {                     // fetch signed URLs for paths we don't have yet
  const missing = [...new Set(paths.filter(p => p && !avatarUrls[p]))];
  if (!missing.length) return;
  const { data } = await sb.storage.from('avatars').createSignedUrls(missing, 60 * 60);
  for (const r of data || []) if (r.signedUrl && !r.error) avatarUrls[r.path] = r.signedUrl;
}
const avatarUrl = path => (path && avatarUrls[path]) || '';
const fileExt = (file, def) => (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') || def;   // safe for a storage path
async function uploadAvatar(file) {                        // <uid>/avatar.<ext>, replaces the previous one
  const path = `${state.uid}/avatar.${fileExt(file, 'jpg')}`;
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
// Our own accounts (table `stats_excluded`) mark the device once signed in — from then on it sends nothing, even signed out.
const NO_STATS_KEY = 'robiq_no_stats';
function track(name, props) {
  try { if (localStorage.getItem(NO_STATS_KEY)) return; } catch {}
  const role = state.authed ? state.role : 'guest';
  sb.from('events').insert({ name, role, props: props || {} }).then(({ error }) => { if (error) console.warn('track', name, error.message); });
}

// ═══════════ Push notifications (sw.js + Supabase function `notify`) ═══════════
// The device subscribes once (user taps "Zapnúť"); its subscription is stored for whoever is signed in on it.
// The sender's app then calls `notify` with the new message / match — the function tells the other side.
// iPhone: push works only in the app added to the home screen (iOS 16.4+), not in a Safari tab.
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const PUSH_NUDGE_KEY = 'robiq_push_nudge';                 // "✕" on the nudge — per device
let swReg = null, pushOn = false;                          // pushOn: this device gets notifications (for the signed-in account)
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js')
  .then(async r => { swReg = r; pushOn = await currentPushSub() !== null && Notification.permission === 'granted'; render(); })
  .catch(e => console.warn('sw', e.message));
async function currentPushSub() { try { return swReg && pushSupported() ? await swReg.pushManager.getSubscription() : null; } catch { return null; } }
const b64uBytes = s => Uint8Array.from(atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function savePushSub(sub) {                          // (re)assign this device to the signed-in account
  const j = sub.toJSON();
  const { error } = await sb.rpc('save_push_subscription', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
  if (error) throw error;
}
async function enablePush() {
  if (!pushSupported() || !swReg) {
    showToast(isIOS && !isStandalone() ? 'Na iPhone pridaj Robiq na plochu (Zdieľať → Pridať na plochu) a upozornenia zapni tam.' : 'Tento prehliadač upozornenia nepodporuje.');
    return;
  }
  const perm = await Notification.requestPermission();   // first await — still inside the tap, as iOS requires
  if (perm !== 'granted') { showToast('Upozornenia sú zablokované v nastaveniach telefónu / prehliadača.'); return; }
  try {
    const sub = await currentPushSub() || await swReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uBytes(CFG.vapidPublicKey) });
    await savePushSub(sub);
    pushOn = true; showToast('Upozornenia sú zapnuté. ✓'); track('push', { on: true });
  } catch (e) { fail(e); }
}
async function disablePush() {                             // also on logout: this device stops getting the account's notifications
  const sub = await currentPushSub();
  if (sub) { await sb.rpc('delete_push_subscription', { p_endpoint: sub.endpoint }); await sub.unsubscribe().catch(() => {}); }
  pushOn = false;
}
function notifyOther(body) {                               // fire-and-forget: { message_id } or { match_id }
  sb.functions.invoke('notify', { body }).then(({ error }) => { if (error) console.warn('notify', error.message); });
}
function pushNudge() {                                     // one-line invitation above the feed / candidates
  if (!state.authed || pushOn) return '';
  try { if (localStorage.getItem(PUSH_NUDGE_KEY)) return ''; } catch {}
  const ios = isIOS && !isStandalone();
  if (!ios && !pushSupported()) return '';
  return `<div class="push-nudge">${icon('message', 18)}<span>${ios
      ? '<b>Chceš vedieť o novej zhode a správe hneď?</b> Pridaj si Robiq na plochu (Zdieľať → Pridať na plochu) a zapni upozornenia tam.'
      : '<b>Nezmeškaj zhodu ani správu.</b> Zapni si upozornenia — dáme ti vedieť, aj keď appku nemáš otvorenú.'}</span>
    ${ios ? '' : '<button class="on" data-go="pushOn">Zapnúť</button>'}
    <button class="x" data-go="pushNudgeClose" aria-label="Zavrieť">${icon('x', 16)}</button></div>`;
}
// Opened from a notification (#spravy): go straight to the chats.
function openFromNotification(url) {
  if (!String(url || location.hash).includes('#spravy') || !state.authed) return;
  if (isStudent()) state.tab = 1; else state.ftab = 1;
  if (location.hash) history.replaceState(null, '', location.pathname);
  render();
}
navigator.serviceWorker?.addEventListener('message', e => { if (e.data?.type === 'open') openFromNotification(e.data.url); });

// ═══════════ Data: reading ═══════════
function colorFor(name) {                                  // deterministic logo colour from the palette
  let h = 0; for (const ch of name || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return LOGO_COLORS[h % LOGO_COLORS.length];
}
const firmIni = name => (name || 'F')[0].toUpperCase();   // company logo placeholder letter
const candGrad = name => colorFor(name);                  // student avatar without a photo (company side) — same calm palette as company logos
const plural = (n, one, few, many) => n === 1 ? one : n > 1 && n < 5 ? few : many;   // Slovak: 1 kandidát · 2–4 kandidáti · 5+ kandidátov
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
    posted: ago(p.created_at), lg: colorFor(c.name), logo: c.logo_url, ini: firmIni(c.name),
    badges: c.verified ? ['✓ Overená firma'] : [], tags: p.types || [], desc: p.description || '', only18: p.only18,
    legal: c.legal_name || '',                             // official name from the register — shown in the detail
    photos: p.photos || [], cityId: p.city_id || null, city: p.cities?.name || cityName(p.city_id), remote: !!p.remote, address: p.address || '',
  };
}
// Posting detail: counts a view (postings.views) once per posting and page load.
const viewedIds = new Set();
function openDetail(j) {
  state.detail = j;
  if (!j) return;
  track('detail_open');
  if (viewedIds.has(j.id)) return;
  viewedIds.add(j.id);
  sb.rpc('count_view', { p_posting: j.id }).then(({ error }) => { if (error) console.warn('count_view', error.message); });
}
function shuffle(list) { return list.map(x => x.id).sort(() => Math.random() - .5); }

async function loadPostings() {
  const q = (sel) => sb.from('postings').select(sel).eq('active', true).order('created_at', { ascending: false });
  const { data, error } = await q('*, companies(name, legal_name, verified, logo_url), cities(name)').eq('blocked', false);
  if (error) throw error;
  state.postings = data.map(jobFromRow);
  if (!order.length) order = shuffle(state.postings);
}

async function loadMe() {                                  // who is signed in, and their role data
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { state.authed = false; state.uid = null; return; }
  state.uid = session.user.id;
  const { data: prof } = await sb.from('profiles').select('role, email_notify').eq('id', state.uid).maybeSingle();
  state.emailNotify = prof?.email_notify !== false;        // menu → E-maily (the `notify` function checks it too)
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
  const { data: noStats } = await sb.rpc('is_stats_excluded');
  if (noStats === true) try { localStorage.setItem(NO_STATS_KEY, '1'); } catch {}
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

// Blocks (table `blocks`): the student hides a company, the company hides a student — kept across reloads.
async function loadBlocks() {
  const { data, error } = await sb.from('blocks').select('target_id').eq('blocker_id', state.uid);
  if (error) { console.warn('blocks', error.message); return []; }
  return data.map(b => b.target_id);
}
async function setBlocked(targetId, on) {
  const q = on ? sb.from('blocks').insert({ blocker_id: state.uid, target_id: targetId })
               : sb.from('blocks').delete().eq('blocker_id', state.uid).eq('target_id', targetId);
  const { error } = await q;
  if (error && error.code !== '23505') console.warn('blocks', error.message);   // 23505 = already blocked
}

async function loadStudent() {
  const [{ data: s }, { data: ints }, { data: skips }, { data: invites }, blocks] = await Promise.all([
    sb.from('students').select('*').eq('id', state.uid).single(),
    sb.from('interests').select('posting_id, postings(id, title, pay, companies(name, logo_url))').eq('student_id', state.uid),
    sb.from('skips').select('posting_id').eq('student_id', state.uid),
    sb.from('company_interests').select('posting_id').eq('student_id', state.uid),
    loadBlocks(),
  ]);
  state.blockedFirms = blocks;
  if (blocks.length) {                                     // names for the „Skryté firmy“ list (companies are public)
    const { data: cs } = await sb.from('companies').select('id, name').in('id', blocks);
    for (const c of cs || []) state.blockNames[c.id] = c.name;
  }
  state.invitedPostingIds = (invites || []).map(x => x.posting_id);
  if (s) Object.assign(state, { obName: s.name, obSkills: s.skills || [], obHours: s.hours, availDays: s.avail_days || [],
    availTimes: s.avail_times || [], birth: s.birth || '', bio: s.bio || '', avatarPath: s.avatar_path || null, cityId: s.city_id || null, commute: s.commute || '30km' });
  await resolveAvatars([state.avatarPath]);
  state.likedIds = (ints || []).map(i => i.posting_id);
  state.myInterests = (ints || []).filter(i => i.postings).map(i => ({
    postingId: i.posting_id, t: i.postings.title, f: i.postings.companies?.name || 'Firma', pay: i.postings.pay + ' €',
    lg: colorFor(i.postings.companies?.name), ini: firmIni(i.postings.companies?.name) }));
  state.skippedIds = (skips || []).map(x => x.posting_id);
  await loadMatches();
}

async function loadCompany() {
  const [{ data: c }, { data: posts }, { data: cints }, blocks] = await Promise.all([
    sb.from('companies').select('*').eq('id', state.uid).single(),
    sb.from('postings').select('*, interests(count), matches(count)').eq('company_id', state.uid).order('created_at', { ascending: false }),
    sb.from('company_interests').select('student_id, posting_id').eq('company_id', state.uid),
    loadBlocks(),
  ]);
  state.blocked = blocks;
  if (c) Object.assign(state, { fpName: c.name, fpLegal: c.legal_name || '', fpDesc: c.description || '', fpLogo: c.logo_url || '', fpIco: c.ico || '', fpVerified: c.verified, fpCityId: c.city_id || null });
  // Not verified yet (e-mail confirmation, register was down…), or verified before the official name was
  // stored at all (older accounts) → ask the register again.
  if (c && (!c.verified || !c.legal_name) && ICO_RE.test(c.ico)) await verifyCompany();
  state.offers = (posts || []).map(p => ({ id: p.id, t: p.title, pay: p.pay + ' € / hod', views: p.views,
    likes: p.interests?.[0]?.count || 0, m: p.matches?.[0]?.count || 0, need: p.need, on: p.active,
    blocked: !!p.blocked, blockReason: p.block_reason || '', photos: p.photos || [] }));   // blocked by Robiq (admin) — the company cannot lift it
  state.contacted = (cints || []).map(x => x.student_id + ':' + x.posting_id);
  await loadCandidates();
  for (const c of state.candidates) if (state.blocked.includes(c.id)) state.blockNames[c.id] = c.n;
  await loadSuggestions();
  await loadMatches();
}

// Anonymous suggestions per posting (suggest_candidates): skills, hours, availability, score — no name or photo.
async function loadSuggestions() {
  state.suggestions = {};
  await Promise.all(state.offers.filter(o => o.on && !o.blocked).map(async o => {
    const { data } = await sb.rpc('suggest_candidates', { p_posting: o.id });
    state.suggestions[o.id] = (data || []).filter(r => !r.interested && !state.blocked.includes(r.student_id));   // those who already liked are in Brigádnici with a name
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
    return { id: s.id, n: s.name || 'Študent', ini: initialsOf(s.name), hrs: (HOURS[s.hours] || '') + (s.city ? ' · ' + s.city : ''), photo: avatarUrl(s.avatar_path),
      skills: (s.skills || []).map(k => k.n), offer: r.postings.title, postingId: r.posting_id, at: r.created_at,
      g: candGrad(s.name) };
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
      ini: isStudent() ? firmIni(other) : initialsOf(other),
      lg: isStudent() ? colorFor(other) : candGrad(other) };
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
      const list = myChats();
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
      if (j && state.blockedFirms.includes(j.companyId)) return;   // hidden company — no toast
      showToast(j ? `${j.f} ťa oslovila: ${j.t}` : 'Firma ťa oslovila — pozri Objavuj.');
    })
    .subscribe();
}
async function onNewMatch(id) {                            // banner l.946–950
  const list = myChats();
  if (list.some(x => x.id === id)) return;
  await loadMatches();
  const m = myChats().find(x => x.id === id);
  if (!m) return;
  if (isStudent()) { state.banner = true; state.bannerName = m.name; clearTimeout(bannerT); bannerT = setTimeout(() => { state.banner = false; render(); }, 3500); }
  else showToast(`Zhoda: ${m.name} má záujem o ${m.job}.`);
  if (!isStudent()) await loadCompany();
  render();
}

// ═══════════ Actions ═══════════
function showToast(msg) {                                  // l.1148–1152
  clearTimeout(toastT);
  state.rowMenu = null; state.toast = msg; render();
  toastT = setTimeout(() => { state.toast = ''; render(); }, 2600);
}
function fail(e) { console.error(e); showToast(skError(e)); }
// Supabase and the browser report errors in English. The ones people can actually hit get a Slovak sentence;
// our own database messages (Slovak, with diacritics) pass through; anything else → a general one.
const ERR_SK = [
  [/invalid login credentials/i, 'Nesprávny e-mail alebo heslo.'],
  [/email not confirmed/i, 'E-mail ešte nie je potvrdený — potvrdzovací odkaz je v schránke (pozri aj spam).'],
  [/rate limit|too many requests|for security purposes/i, 'Príliš veľa pokusov za sebou. O chvíľu to pôjde znova.'],
  [/different from the old/i, 'Nové heslo musí byť iné ako staré.'],
  [/password should|weak password|password is known/i, 'Heslo je príliš slabé — aspoň 6 znakov, nie bežné heslo.'],
  [/invalid.*email|email.*invalid|unable to validate email/i, 'Tento e-mail nevyzerá správne.'],
  [/already registered|already exists/i, 'Tento e-mail už má účet.'],
  [/jwt expired|session.*(missing|expired)|not authenticated/i, 'Prihlásenie vypršalo. Obnov stránku a prihlás sa znova.'],
  [/failed to fetch|networkerror|load failed|network request failed|timeout|timed out/i, 'Nepodarilo sa spojiť so serverom. Skontroluj internet a skús znova.'],
];
function skError(e) {
  const m = (e && (e.message || e.error_description)) || String(e || '');
  for (const [re, sk] of ERR_SK) if (re.test(m)) return sk;
  return /[áäčďéíĺľňóôŕšťúýž]/i.test(m) ? m : 'Niečo sa nepodarilo. Skús to znova.';
}

async function resetToGuest() {                            // l.1506–1514: sign out → clean guest view (logout, account deletion)
  if (pushOn) await disablePush().catch(() => {});        // this device stops getting the signed-out account's notifications
  await sb.auth.signOut();
  state = initialState(); order = [];
  subscribe();
  state.loading = true; render();
  try { await loadPostings(); } catch (e) { fail(e); }
  state.loading = false;
}
async function reloadCompany() { await loadCompany(); await loadPostings(); }   // after a change to my postings / profile
async function removeFolder(bucket, folder) {              // deletes the files directly inside a Storage folder
  const { data: files } = await sb.storage.from(bucket).list(folder);
  if (files?.length) await sb.storage.from(bucket).remove(files.map(f => `${folder}/${f.name}`));
}
const myChats = () => isStudent() ? state.matches : state.fchats;
async function checkMatch(postingId, studentId) {          // after a like / invite: did it just become a match?
  const { data: m } = await sb.from('matches').select('id').eq('posting_id', postingId).eq('student_id', studentId).maybeSingle();
  if (!m) return;
  notifyOther({ match_id: m.id });                         // my action made the match → tell the other side
  await onNewMatch(m.id);
}
async function reachOut(studentId, postingId) {            // company → student interest (candidate card or anonymous suggestion)
  const { error } = await sb.from('company_interests').insert({ company_id: state.uid, student_id: studentId, posting_id: +postingId });
  if (error) throw error;
  state.contacted.push(studentId + ':' + postingId);
}
function openReport(type, id, label) {                     // report form: posting → "scam", people → "inappropriate" preselected
  state.rowMenu = null;
  state.report = { type, id: String(id), label, reason: type === 'posting' ? 'scam' : 'inappropriate', note: '' };
}

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
      await checkMatch(job.id, state.uid);
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
  if (state.authed && pushOn) { const sub = await currentPushSub(); if (sub) savePushSub(sub).catch(e => console.warn('push', e.message)); }   // device → newly signed-in account
  if (state.authed && !isStudent()) state.ftab = 0;
  if (state.oauth) resumeOnboarding();                     // signed in, but the registration steps are not done yet
  subscribe();
  render();
  if (pj && state.authed && isStudent()) setTimeout(() => act(pj, 'like'), 40);   // l.1498–1503
}

function openPick(from) { state.pickFrom = from; state.screen = 'pick'; state.obStep = 1; state.fobStep = 1; }   // account-type screen; "← Späť" returns to `from`
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
    if (error) { setErr('login-err', skError(error)); return; }
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
    if (error) { setErr('login-err', skError(error)); return; }
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
    if (error) { setErr('reset-err', skError(error)); return; }
    document.getElementById('reset-pass').value = ''; document.getElementById('reset-pass2').value = '';
    await enterApp();
    showToast('Heslo je zmenené. ✓');
  },
  goRegister:  () => openPick('login'),                   // from the login card
  goSignup:    () => openPick('app'),                     // from the feed header
  pickStudent: () => { state.screen = 'ob';  state.obStep = 1; track('reg_start', { role: 'student' }); },
  pickFirm:    () => { state.screen = 'fob'; state.fobStep = 1; track('reg_start', { role: 'firm' }); },  goLogin:     () => { state.screen = 'login'; setErr('login-err', ''); },
  // "← Späť" on login and account-type screens: login → feed; pick → wherever it was opened from
  back:        () => { state.screen = state.screen === 'pick' ? (state.pickFrom || 'app') : 'app'; },
  // Google sign-in: Supabase redirects to Google and back to this page; loadMe() then decides
  // whether the user already has a profile (→ app) or has to pick an account type (→ pick).
  google: async () => {
    track('login_google_click');
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    if (error) fail(error);
  },
  goPonuky:    () => { if (state.fEditId) clearNova(); state.ftab = 2; },
  goTab:       el => switchTab(+el.dataset.tab),          // top-bar tabs on desktop
  menuPush:    async () => { state.accMenu = false; if (pushOn) { await disablePush(); showToast('Upozornenia sú vypnuté.'); track('push', { on: false }); } else await enablePush(); },
  pushOn:      () => enablePush(),                        // the nudge above the feed / candidates
  menuEmail:   async () => {                              // e-mail notifications on / off (stored with the account)
    state.accMenu = true; const on = !state.emailNotify;
    const { error } = await sb.rpc('set_email_notify', { p_on: on });
    if (error) { fail(error); return; }
    state.emailNotify = on; showToast(on ? 'E-mailové upozornenia sú zapnuté.' : 'E-mailové upozornenia sú vypnuté.'); track('email_notify', { on });
  },
  pushNudgeClose: () => { try { localStorage.setItem(PUSH_NUDGE_KEY, '1'); } catch {} },
  // gate — l.1444–1446
  gateClose:   () => { state.gate = false; state.pendingJob = null; },
  gateLogin:   () => { state.gate = false; state.screen = 'login'; },
  gateSignup:  () => { state.gate = false; openPick('app'); },
  // account menu — l.1515–1524
  menuToggle:  el => { if (el && el.classList.contains('a-menu')) { state.accMenu = true; return; } state.accMenu = !state.accMenu; },
  menuProfile: () => { if (isStudent()) state.tab = 2; else state.ftab = 3; state.accMenu = false; },
  goProfileEdit: () => { state.tab = 2; state.profEdit = true; },
  menuClose:   () => { state.accMenu = false; },
  menuHelp:    () => { state.accMenu = false; location.href = 'mailto:support@robiq.sk?subject=Robiq%20%E2%80%93%20pomoc'; },
  menuTerms:   () => { state.accMenu = false; window.open('podmienky.html', '_blank', 'noopener'); },
  menuStats:   () => { state.accMenu = false; location.href = 'admin.html'; },   // admin only — the session is shared, no second sign-in
  menuTheme:   () => { try { localStorage.setItem(THEME_KEY, isDarkTheme() ? 'light' : 'dark'); } catch {} applyTheme(); state.accMenu = true; track('theme', { dark: isDarkTheme() }); },
  logout: async () => { clearTimeout(bannerT); await resetToGuest(); },
  goNova:      () => { if (state.fEditId) clearNova(); state.ftab = 9; if (!state.fCityId) state.fCityId = state.fpCityId; },   // the company's seat prefills the place
  // feed — l.1577–1591
  resetDeck: async () => {
    try { await sb.from('skips').delete().eq('student_id', state.uid); state.skippedIds = []; } catch (e) { fail(e); }
  },
  aiOpen:      () => { openDetail(aiJob()); },
  closeDetail: () => { state.detail = null; },
  detailLike:  () => { const j = state.detail; state.detail = null; if (j) act(j, 'like'); },
  detailSkip:  () => { const j = state.detail; state.detail = null; if (j) act(j, 'skip'); },
  bannerGo:    () => { state.banner = false; state.tab = 1; state.activeChat = state.matches.length - 1; },
  noop:        () => {},
  // Reports (⚑) — a posting from its detail, the other party from the chat header.
  reportPosting: () => { const d = state.detail; if (!d) return; state.detail = null; openReport('posting', d.id, `${d.t} — ${d.f}`); },
  reportChat:  () => {
    const list = myChats(), cur = list[isStudent() ? state.activeChat : state.activeFChat];
    if (!cur) return;
    openReport(isStudent() ? 'company' : 'student', cur.otherId, cur.name);
  },
  reportCancel: () => { state.report = null; },
  chatWarnOk:  () => { try { localStorage.setItem('robiq_chat_warn', '1'); } catch {} },
  reportSend: async () => {
    const r = state.report; if (!r) return;
    r.note = document.getElementById('report-note').value.trim();
    const btn = document.getElementById('report-send'); btn.disabled = true;
    const { error } = await sb.from('reports').insert({ reporter_id: state.authed ? state.uid : null, target_type: r.type, target_id: r.id, reason: r.reason, note: r.note });
    btn.disabled = false;
    if (error) { setErr('report-err', skError(error)); return; }
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
    if (!novaCanPublish()) { showToast(!state.fT.trim() ? 'Zadajte názov pozície.' : parsePay(state.fPay) === null ? `Zadajte hodinovú sadzbu v eurách, od ${PAY_MIN} do ${PAY_MAX} € (napr. 8,50).` : 'Vyberte miesto výkonu zo zoznamu, alebo označte „Na diaľku“.'); return; }
    try {
      const rec = { title: state.fT.trim(), pay: parsePay(state.fPay),
        need: Math.max(1, parseInt(state.fNeed, 10) || 1), types: state.fTypes, only18: state.only18, ai_note: state.aiNote, description: state.fDesc.trim(),
        city_id: state.fRemote ? null : state.fCityId, remote: state.fRemote, address: state.fRemote ? '' : state.fAddress.trim() };
      if (state.fEditId) {                                 // edit: same form, update instead of insert (photos: row menu → Fotky)
        const { error } = await sb.from('postings').update(rec).eq('id', state.fEditId);
        if (error) throw error;
        clearNova(); state.ftab = 2;
        await reloadCompany(); showToast('Zmeny sú uložené.');
        return;
      }
      rec.company_id = state.uid;
      const { data: row, error } = await sb.from('postings').insert(rec).select('id').single();
      if (error) throw error;
      if (state.fPhotos.length) {                          // the row exists now → upload the photos under its id
        const urls = [];
        for (const [n, p] of state.fPhotos.entries()) { try { urls.push(await uploadPostingPhoto(row.id, p.file, n)); } catch (e) { console.warn('photo upload', e); } }
        if (urls.length) await sb.from('postings').update({ photos: urls }).eq('id', row.id);
        if (urls.length < state.fPhotos.length) showToast('Niektoré fotky sa nepodarilo nahrať.');
      }
      clearNova(); state.ftab = 0;                         // straight to candidates
      await reloadCompany();
      const n = Object.values(state.suggestions)[0]?.length ?? 0;
      const first = state.offers[0] && state.suggestions[state.offers[0].id] ? state.suggestions[state.offers[0].id].length : n;
      showToast(first ? `Inzerát zverejnený — ${first} ${plural(first, 'kandidát sedí', 'kandidáti sedia', 'kandidátov sedí')} na profil pozície.` : 'Inzerát zverejnený. Kandidátov navrhneme, hneď ako sa objavia.');
    } catch (e) { fail(e); }
  },
  // account deletion — GDPR right to erasure; everything cascades in the database
  askDeleteAccount: () => { state.accMenu = false; state.delAccount = true; },
  delAccountCancel: () => { state.delAccount = false; },
  delAccountConfirm: async () => {
    state.delAccount = false;
    try {
      // Storage files must go through the Storage API, not SQL
      await removeFolder(isStudent() ? 'avatars' : 'logos', state.uid);
      if (!isStudent()) {                                  // company: photos of all postings, <uid>/<posting_id>/<file>
        const { data: dirs } = await sb.storage.from('posting-photos').list(state.uid);
        for (const dir of dirs || []) await removeFolder('posting-photos', `${state.uid}/${dir.name}`);
      }
      const { error } = await sb.rpc('delete_my_account');
      if (error) throw error;
      await resetToGuest();
      showToast('Účet bol zmazaný.');
    } catch (e) { fail(e); }
  },
  // delete confirm — l.1638–1639
  delCancel:  () => { state.delIdx = null; },
  delConfirm: async () => {
    const o = state.offers[state.delIdx]; state.delIdx = null;
    try {
      await removeFolder('posting-photos', `${state.uid}/${o.id}`);   // photos go with the posting
      const { error } = await sb.from('postings').delete().eq('id', o.id); if (error) throw error;
      await reloadCompany(); showToast('Inzerát zmazaný.');
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
      await reloadCompany();
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
    notifyOther({ message_id: data.id });                  // push / e-mail to the other side
  } catch (e) { if (!state[draftKey]) state[draftKey] = t; render(); fail(e); }   // not sent → the text goes back into the field
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
  const path = `${state.uid}/logo.${fileExt(file, 'png')}`;
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
// Escape closes the topmost window (report above detail, like the layers stack), then menus.
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || state.screen !== 'app') return;
  const close = [['report', () => { state.report = null; }], ['photoEdit', () => { state.photoEdit = null; }],
    ['delAccount', () => { state.delAccount = false; }], ['delIdx', () => { state.delIdx = null; }],
    ['gate', () => { state.gate = false; state.pendingJob = null; }], ['detail', () => { state.detail = null; }],
    ['accMenu', () => { state.accMenu = false; }], ['rowMenu', () => { state.rowMenu = null; }]]
    .find(([k]) => state[k] !== null && state[k] !== false);
  if (close) { close[1](); render(); }
});
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
  document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#0F0830' : isDarkTheme() ? '#0F0F13' : '#F6F6F8');
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
      await reloadCompany(); render(); showToast('Fotky uložené.');
    } catch (err) { fail(err); }
  });
}

function renderHeader() {                                  // l.342–372
  const r = document.getElementById('a-hdr-right');
  if (!state.authed) {
    r.innerHTML = `<div class="a-guest">
      <button class="a-pill-ghost theme-btn" data-go="menuTheme" aria-label="Tmavý režim" title="Tmavý režim" aria-pressed="${isDarkTheme()}">${icon(isDarkTheme() ? 'moon' : 'sun', 16)}</button>
      <button class="a-pill-ghost" data-go="goLogin">Prihlásiť sa</button>
      <button class="a-pill" data-go="goSignup">Vytvoriť účet</button></div>`;
    return;
  }
  const nova = !isStudent() ? `<button class="a-pill nova" data-go="goNova">＋ Nový inzerát</button>` : '';
  const menu = !state.accMenu ? '' : `
    <div class="a-menu" data-go="menuToggle">
      <div class="name">${esc(menuName())}</div><hr>
      <button data-go="menuProfile">${icon('user', 16)}Môj profil</button>
      ${menuSwitch('menuPush', 'bell', 'Upozornenia', pushOn)}
      ${menuSwitch('menuEmail', 'mail', 'E-maily', state.emailNotify)}
      ${menuSwitch('menuTheme', 'moon', 'Tmavý režim', isDarkTheme())}
      <button data-go="menuHelp">${icon('help', 16)}Pomoc a podpora</button>
      <button data-go="menuTerms">${icon('file', 16)}Podmienky a ochrana údajov</button>
      ${state.isAdmin ? `<hr><button data-go="menuStats">${icon('chart', 16)}Štatistika Robiq</button>` : ''}<hr>
      <button class="out" data-go="logout">${icon('logout', 16)}Odhlásiť sa</button>
      <button class="del" data-go="askDeleteAccount">${icon('trash', 16)}Zmazať účet</button>
    </div>`;
  const photo = isStudent() ? avatarUrl(state.avatarPath) : state.fpLogo;
  const ava = photo ? `<button class="a-ava has-img" aria-label="Účet" data-go="menuToggle" style="background-image:url('${photo}')"></button>`
                    : `<button class="a-ava" aria-label="Účet" data-go="menuToggle">${avaInit()}</button>`;
  // Desktop: the tabs live here in the top bar, icons only like the dock (CSS hides this on phones, where the bottom dock is used instead).
  const tabs = isStudent() ? STUDENT_TABS : FIRM_TABS, active = activeTab();
  const nav = `<nav class="a-nav" aria-label="Navigácia">${tabs.map(([label, glyph], i) =>
    `<button class="${i === active ? 'on' : ''}" data-go="goTab" data-tab="${i}" aria-label="${label}" title="${label}"${i === active ? ' aria-current="page"' : ''}>${glyph}</button>`).join('')}</nav>`;
  r.innerHTML = `${nav}${nova}<div class="a-acc">${ava}${menu}</div>`;
}
// Account menu row with an on/off switch on the right (instead of „Zap./Vyp.“ text).
function menuSwitch(go, glyph, label, on) {
  return `<button class="sw-row" data-go="${go}" role="switch" aria-checked="${!!on}">
    <span class="sw-label">${icon(glyph, 16)}${label}</span><span class="switch${on ? ' on' : ''}"></span></button>`;
}
function menuName() { return isStudent() ? (state.obName || 'Študent') : state.fpName; }
function avaInit() { return isStudent() ? initials() : (initialsOf(state.fpName) || 'F'); }

function skeleton() {                                      // l.377–403
  const card = `<div class="sk-card">
    <div style="display:flex;align-items:center;gap:14px"><div class="sk" style="width:44px;height:44px;border-radius:12px;flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px"><div class="sk" style="width:62%;height:16px;border-radius:6px"></div><div class="sk lt" style="width:44%;height:12px;border-radius:99px"></div></div></div>
    <div class="sk" style="width:34%;height:24px;border-radius:8px"></div>
    <div style="height:7px;border-radius:99px;background:var(--fill)"></div>
    <div style="display:flex;gap:8px">${'<div class="sk xl" style="width:74px;height:26px;border-radius:99px"></div>'.repeat(3)}</div>
    <div class="sk" style="height:44px;border-radius:12px"></div></div>`;
  return `<div class="a-wrap" aria-busy="true">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px"><div class="sk" style="width:236px;height:26px;border-radius:8px"></div><div class="sk" style="width:132px;height:13px;border-radius:99px"></div></div>
    <div class="cards">${card.repeat(4)}</div></div>`;
}

// l.1313
// "1 voľné miesto z 2" · "3 voľné miesta z 5" · "6 voľných miest z 8" · "Obsadené (2 z 2)"
const needTxt = j => {
  const need = j.need || 1, free = Math.max(0, need - (j.taken || 0));
  return free ? `${free} ${plural(free, 'voľné miesto', 'voľné miesta', 'voľných miest')} z ${need}` : `Obsadené (${need} z ${need})`;
};
const isFull = j => (j.taken || 0) >= (j.need || 1);
// The type 'Remote' stays in the data (postings.tags, filters); people see it as „Na diaľku", like the switch in Nový inzerát.
const typeLabel = t => t === 'Remote' ? 'Na diaľku' : t;
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
    .filter(j => !state.skippedIds.includes(j.id) && !state.blockedFirms.includes(j.companyId) && (!j.only18 || adult) && matchesFilters(j))
    .sort((a, b) => (isFull(a) - isFull(b)) || (state.authed   // full postings last
      ? (inv(b) - inv(a)) || (near(b) - near(a)) || (b.id - a.id)   // invitations, then within reach, then newest
      : order.indexOf(a.id) - order.indexOf(b.id)));
}
function aiJob() { return remaining().find(j => !state.likedIds.includes(j.id) && !isFull(j)) || null; }

// Feed filters: "V mojom okolí" (student with a city) AND any of the chosen types ("Víkendy" or "Remote" …).
const canFilterNear = () => state.authed && isStudent() && !!state.cityId;
function matchesFilters(j) {
  const f = state.filters;
  if (f.includes('near') && canFilterNear() && !inReach(j)) return false;
  const types = f.filter(x => x !== 'near');
  return !types.length || types.some(t => j.tags.includes(t) || (t === 'Remote' && j.remote));
}
function filterBar() {
  const chips = [...(canFilterNear() ? [['near', 'V mojom okolí']] : []), ...TYPES.map(t => [t, typeLabel(t)])];
  return `<div class="filters" role="group" aria-label="Filtre">
    ${chips.map(([k, l]) => `<button type="button" class="${state.filters.includes(k) ? 'on' : ''}" data-act="filter" data-f="${esc(k)}" aria-pressed="${state.filters.includes(k)}">${esc(l)}</button>`).join('')}
    ${state.filters.length ? '<button type="button" class="clear" data-act="filter-clear">Zrušiť</button>' : ''}
  </div>`;
}

function feed() {                                          // l.408–475
  const list = remaining();
  const viewed = state.likedIds.length + state.skippedIds.length;
  const ai = viewed >= 2 ? aiJob() : null;
  const tip = !ai ? '' : `
    <div class="ai-tip">
      <div class="eb">Toto by ti sedelo</div>
      <div class="mid"><div class="lg" style="${logoStyle(ai)}">${logoText(ai)}</div>
        <div><div class="t">${esc(ai.t)}</div><div class="f">${esc(ai.f)} · <b>${esc(ai.pay)}/hod</b></div></div></div>
      <button data-go="aiOpen">Pozrieť detail</button>
    </div>`;
  const cards = list.length ? `<div class="cards">${list.map(jobCard).join('')}</div>` : state.filters.length ? `
    <div class="deck-empty">
      <div class="h">Na tieto filtre <b>nič nesedí</b></div>
      <p>Skús ubrať niektorý filter — ostatné ponuky na teba počkajú.</p>
      <button data-act="filter-clear">Zrušiť filtre</button>
    </div>` : `
    <div class="deck-empty">
      <div class="h">Na dnes si videl <b>všetko</b></div>
      <p>Robiq medzitým aktívne hľadá ďalšie ponuky, ktoré ti sadnú. Vráť sa večer.</p>
      ${state.skippedIds.length ? '<button data-go="resetDeck">Prezrieť znova</button>' : ''}
    </div>`;
  const noCity = state.authed && isStudent() && !state.cityId && CITIES.length ? `
    <div class="city-nudge"><b>Doplň si mesto</b> — firmy ťa potom nájdu na brigády vo svojom okolí a ponuky zoradíme podľa vzdialenosti.
      <button data-go="goProfileEdit">Doplniť</button></div>` : '';
  return `<div class="a-wrap">
    <div class="a-title"><h2>Ponuky <b>pre teba</b></h2></div>
    ${pushNudge()}${noCity}${state.postings.length ? filterBar() : ''}${tip}${cards}</div>`;
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
  // ciara ukazuje obsadene miesta: vsetko volne = prazdna, polovica obsadena = polovicna
  const pct = Math.round(Math.min(j.need || 1, Math.max(0, j.taken || 0)) / (j.need || 1) * 100);
  const menu = state.rowMenu !== 'j' + j.id ? '' : `
    <div class="row-menu" data-rowmenu="1">
      <button data-job="${j.id}" data-act="report">Nahlásiť inzerát</button>
      <button class="danger" data-job="${j.id}" data-act="block">Zablokovať firmu</button>
    </div>`;
  const invited = state.invitedPostingIds.includes(j.id) && !liked;
  // Compact layout: logo · title/company · pay in one row, then one quiet meta line (place · posted · ⋯), occupancy as a thin bar.
  const meta = [placeTxt(j), j.posted].filter(Boolean).map(esc).join(' · ');
  const full = isFull(j) && !liked;
  return `<div class="job ${invited ? 'invited' : ''} ${full ? 'full' : ''}">
    ${invited ? `<div class="invite-badge">${icon('sparkles', 14)}Firma ťa oslovila — sedíš na túto pozíciu</div>` : ''}
    <div class="who" data-job="${j.id}" data-act="open">
      <div class="lg" style="${logoStyle(j)}">${logoText(j)}</div>
      <div class="name"><div class="t">${esc(j.t)}</div>
        <div class="f">${esc(j.f)}${j.badges.length ? ` <span class="ok">✓ overená</span>` : ''}</div></div>
      <div class="pay">${esc(j.pay)}<small>/ hod</small></div>
    </div>
    <div class="meta"><span>${meta}</span>
      <div class="more"><button class="dots-btn" data-rowmenu="1" aria-label="Ďalšie možnosti" data-job="${j.id}" data-act="menu">${icon('more')}</button>${menu}</div></div>
    <div class="need"><span>${needTxt(j)}</span><span class="bar"><i style="width:${pct}%"></i></span></div>
    ${j.tags.length ? `<div class="tags">${j.tags.map(t => `<span>${esc(typeLabel(t))}</span>`).join('')}</div>` : ''}
    ${liked ? `<div class="sent">✓ Záujem odoslaný</div>` : full ? `<div class="act"><button class="like" disabled>Obsadené</button></div>` : `
    <div class="act"><button class="like" data-job="${j.id}" data-act="like">${icon('heart', 16)}Mám záujem</button>
      ${state.authed ? `<button class="skip" aria-label="Nezaujíma ma" title="Nezaujíma ma" data-job="${j.id}" data-act="skip">${icon('x')}</button>` : ''}</div>`}
  </div>`;
}

function profile() {                                       // l.515–635
  const s = state;
  const skills = s.obSkills.map(x => LANGS.includes(x.n)
    ? { n: x.n, dots: LANG_LVLS[x.lvl - 1] + (x.speak !== false ? ' · rozprávam' : '') }
    : { n: x.n, dots: '●'.repeat(x.lvl) + '○'.repeat(3 - x.lvl) });
  const interests = s.myInterests.map(it => {
    const matched = s.matches.some(m => m.postingId === it.postingId);
    return { ...it, status: matched ? '✓ Zhoda' : 'Čaká na odpoveď', stBg: matched ? 'rgba(21,128,61,.12)' : 'var(--fill)', stFg: matched ? 'var(--ok)' : 'var(--muted)' };
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
    ${blockedCard(s.blockedFirms, 'Skryté <b>firmy</b>', 'ich ponuky nevidíš', 'Zobraziť')}
  </div>`;
}

// Blocked companies (student) / students (company) with a button to undo it; hidden when the list is empty.
function blockedCard(ids, title, sub, btn) {
  if (!ids.length) return '';
  return `<div class="pcard sm blocked-card">
    <div class="p-int-head"><div class="t">${title}</div><span class="s">${sub}</span></div>
    <div class="p-int">${ids.map(id => `
      <div class="p-int-row"><div style="flex:1;min-width:0"><div class="t">${esc(state.blockNames[id] || (isStudent() ? 'Firma' : 'Brigádnik'))}</div></div>
        <button class="p-edit" data-unblock="${esc(id)}" data-act="unblock">${btn}</button></div>`).join('')}</div>
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
      <button class="chat-report" data-go="reportChat" title="Nahlásiť">${icon('flag', 14)}Nahlásiť</button></div>`;
  const msgs = (cur ? cur.msgs : []).map(m => `<div class="msg ${m.me ? 'me' : 'them'}">${esc(m.txt)}</div>`).join('');
  if (!list.length) return `<div class="p-empty">${isFirm
    ? 'Zatiaľ žiadne konverzácie. Chat vznikne, keď o kandidáta prejavíte záujem a on oň prejavil záujem tiež.'
    : 'Zatiaľ žiadne zhody. Chat vznikne, keď o teba prejaví záujem firma, ktorej si dal „Mám záujem".'}</div>`;
  // One-time notice (per browser): the chat is not end-to-end encrypted — privacy policy §3.4, terms §8.
  let warn = '';
  try { if (!localStorage.getItem('robiq_chat_warn')) warn = `<div class="chat-warn">Chat nie je šifrovaný medzi zariadeniami — neposielaj sem fotky dokladov, rodné číslo ani platobné údaje.
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
    ${chatUI(state.matches, state.activeChat, false)}</div>`;
}
function fspravy() {                                       // l.708–743
  return `<div class="chat-wrap">
    ${chatUI(state.fchats, state.activeFChat, true)}</div>`;
}

// ─── Brigádnici — l.637–706 ───
function brig() {
  const s = state;
  let body;
  if (!s.authed) body = `<div class="gate-card"><div class="ic">${icon('lock', 24)}</div>
      <div class="h">Profily brigádnikov sú len pre prihlásené firmy</div>
      <div class="p">Chránime súkromie ľudí — ich profily uvidíte po prihlásení firemného účtu.</div>
      <div class="col"><button data-go="goSignup" style="width:100%;background:var(--accent);color:#fff;border:none;border-radius:13px;padding:13px 0;font-size:14px;font-weight:700;cursor:pointer">Vytvoriť firemný účet</button>
        <button data-go="goLogin" style="width:100%;background:transparent;color:var(--accent);border:1px solid var(--line2);border-radius:13px;padding:12px 0;font-size:14px;font-weight:700;cursor:pointer">Už mám účet — prihlásiť sa</button></div></div>`;
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
      const count = cands.length ? cands.length + ' ' + plural(cands.length, 'kandidát', 'kandidáti', 'kandidátov') : '';
      return `<div class="cgroup">
        <div class="cgroup-head"><div class="t">${esc(o.t)}</div>${count ? `<span class="c">${count}</span>` : ''}</div>
        ${cands.length ? `<div class="cards">${cands.map(candCard).join('')}</div>` : ''}
        ${sugg.length ? `
          <div class="sugg-head"><span class="eb">${icon('sparkles', 14)}Navrhovaní kandidáti</span><span class="s">Sedia na inzerát podľa zručností a dostupnosti. Meno a fotku uvidíte, keď prejavia záujem.</span></div>
          <div class="cards">${sugg.map(r => suggCard(o, r)).join('')}</div>` : ''}
      </div>`;
    }).join('');
    body = groups || `<div class="empty-card narrow">
      <div class="h">Zatiaľ nikto neprejavil záujem</div>
      <div class="p">Kandidáti sa tu objavia, keď klepnú „Mám záujem" na niektorý z vašich inzerátov.</div></div>`;
  }
  return `<div class="a-wrap">
    <div class="a-title" style="align-items:center"><h2>Ponuka <b>brigádnikov</b></h2></div>
    ${pushNudge()}${body}</div>`;
}
// Anonymous suggestion card: no name, no photo — skills, hours, availability, match score, "Osloviť".
function suggCard(o, r) {
  const key = r.student_id + ':' + o.id, done = r.contacted || state.contacted.includes(key);
  const days = (r.avail_days || []).length === 7 ? 'každý deň' : (r.avail_days || []).join(', ');
  const times = (r.avail_times || []).map(t => t.toLowerCase()).join(', ');
  const avail = [days, times].filter(Boolean).join(' · ') || 'dostupnosť neuvedená';
  const place = !r.city ? '' : (r.distance_km === null || r.distance_km === undefined || r.distance_km === 0) ? r.city : `${r.city} · ${r.distance_km} km`;
  return `<div class="cand sugg">
    <div class="top">
      <div class="av anon">${PERSON}</div>
      <div><div class="n">Brigádnik</div><div class="s">${esc(HOURS[r.hours] || '')}${r.score ? ` · zhoda ${r.score} %` : ''}</div><div class="s">${esc(avail)}</div>${place ? `<div class="s">${esc(place)}</div>` : ''}</div>
    </div>
    ${(r.skills || []).length ? `<div class="skills">${r.skills.map(k => `<span>${esc(k)}</span>`).join('')}</div>` : ''}
    ${done ? `<div class="sent">✓ Oslovený — čaká sa na odpoveď</div>` : `<button class="contact" data-sugg="${key}" data-act="invite">${icon('sparkles', 16)}Osloviť</button>`}
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
      <div class="more"><button class="dots-btn" data-rowmenu="1" aria-label="Ďalšie možnosti" data-cand="${key}" data-act="menu">${icon('more')}</button>${menu}</div>
    </div>
    ${c.skills.length ? `<div class="skills">${c.skills.map(k => `<span>${esc(k)}</span>`).join('')}</div>` : ''}
    ${done ? `<div class="sent">✓ Záujem odoslaný</div>` : `<button class="contact" data-cand="${key}" data-act="contact">${icon('heart', 16)}Prejaviť záujem</button>`}
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
        <button data-offer="${i}" data-act="edit">Upraviť</button>
        <button data-offer="${i}" data-act="photos">Fotky „deň v práci“${o.photos.length ? ` (${o.photos.length})` : ''}</button>
        <button data-offer="${i}" data-act="dup">Duplikovať</button>
        <button class="danger" data-offer="${i}" data-act="askDel">Zmazať inzerát</button></div>`;
    return `<div class="offer ${o.on && !o.blocked ? '' : 'off'}">
      <div><div class="t">${esc(o.t)}</div><div class="pay">${esc(o.pay)}</div>
        ${o.blocked ? `<div class="blocked-note">Pozastavené Robiqom${o.blockReason ? ': ' + esc(o.blockReason) : ''} · napíšte na support@robiq.sk</div>` : ''}</div>
      <div class="stat"><div class="n">${o.views}</div><div class="l">zobrazenia</div></div>
      <div class="stat"><div class="n">${o.likes}</div><div class="l">záujmy</div></div>
      <div class="stat"><div class="n green">${o.m}</div><div class="l">zhody</div></div>
      <div class="stat"><div class="n">${Math.min(o.m, o.need || 1)} / ${o.need || 1}</div><div class="l">obsadené</div></div>
      <span class="st ${o.on && !o.blocked ? 'on' : 'paused'}">${o.blocked ? 'Pozastavená Robiqom' : o.on ? 'Aktívna' : 'Pozastavená'}</span>
      <div class="act">${o.blocked ? '' : `<button class="tg" data-offer="${i}" data-act="toggle">${o.on ? 'Pozastaviť' : 'Aktivovať'}</button>`}
        <div class="more"><button class="dots-btn" data-rowmenu="1" aria-label="Ďalšie možnosti" data-offer="${i}" data-act="menu">${icon('more')}</button>${menu}</div></div>
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
// Hourly pay: typed as "8" / "8,50" / "8.5" → stored as text like the cards show it ("8" · "8,50"); null = not a sensible number.
const PAY_MIN = 1, PAY_MAX = 100;
function parsePay(txt) {
  const t = String(txt || '').trim().replace(/\s|€/g, '').replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return null;
  const n = +t; if (n < PAY_MIN || n > PAY_MAX) return null;
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');
}
function clearNova() {                                     // empty "Nový inzerát" form (after publishing / leaving an edit)
  for (const p of state.fPhotos) URL.revokeObjectURL(p.url);
  Object.assign(state, { fT: '', fPay: '', fNeed: '', fTypes: [], aiNote: '', only18: false, fDesc: '', fPhotos: [], fCityId: state.fpCityId, fRemote: false, fAddress: '', fEditId: null });
}
const novaCanPublish = () => !!state.fT.trim() && (state.fRemote || !!state.fCityId) && parsePay(state.fPay) !== null;   // title + place + pay
function nova() {
  const s = state;
  return `<div class="nova-wrap">
    <button class="back back-top" data-go="goPonuky">← Späť na inzeráty</button>
    <h2>${s.fEditId ? 'Upraviť' : 'Nový'} <b>inzerát</b></h2>
    <div class="form-card">
      <div><div class="label">Názov pozície <b class="req">*</b></div><input class="input" id="f-t" placeholder="napr. Barista — víkendy" value="${esc(s.fT)}"></div>
      <div class="two">
        <div><div class="label">Hodinová sadzba (€) <b class="req">*</b></div><input class="input" id="f-pay" placeholder="napr. 8,50" inputmode="decimal" maxlength="7" value="${esc(s.fPay)}"></div>
        <div><div class="label">Počet ľudí</div><input class="input" id="f-need" type="number" min="1" placeholder="1" value="${esc(s.fNeed)}"></div>
      </div>
      <div><div class="label">Miesto <b class="req">*</b></div>
        <div class="place-row"><input class="input" id="f-city" placeholder="Mesto" value="${esc(cityName(s.fCityId))}" autocomplete="off" ${s.fRemote ? 'disabled' : ''}>
          <button type="button" class="tchip ${s.fRemote ? 'on' : ''}" data-act="remote">Na diaľku</button></div>
        ${s.fRemote ? '' : `<input class="input" id="f-address" placeholder="Adresa prevádzky (ulica a číslo)" value="${esc(s.fAddress)}" maxlength="200" style="margin-top:8px">`}</div>
      <div><div class="label">Vek kandidátov</div>
        <div class="seg"><button class="${s.only18 ? '' : 'on'}" data-go="set18All">Bez obmedzenia</button><button class="${s.only18 ? 'on' : ''}" data-go="set18Only">Len 18+</button></div></div>
      <div><div class="label" style="margin-bottom:10px">Typ brigády</div>
        <div class="tchips">${TYPES.filter(t => t !== 'Remote').map(t => `<button class="tchip ${s.fTypes.includes(t) ? 'on' : ''}" data-type="${t}" data-act="type">${typeLabel(t)}</button>`).join('')}</div></div>
      <div><div class="label" style="margin-bottom:4px">Popis práce</div>
        <textarea id="f-desc" rows="3" maxlength="1500" placeholder="Čo bude brigádnik robiť, kde a od kedy.">${esc(s.fDesc)}</textarea></div>
      <div><div class="label" style="margin-bottom:4px">${icon('sparkles', 14)} Koho hľadáte</div>
        <textarea id="f-ai" rows="2" placeholder="Zručnosti a povaha práce — podľa toho zoradíme kandidátov. Nie vek, pohlavie či zdravie.">${esc(s.aiNote)}</textarea></div>
      ${s.fEditId ? '' : `<div><div class="label" style="margin-bottom:4px">Fotky „deň v práci“</div>
        ${photoGrid(s.fPhotos.map(p => p.url), 'f-photo', 'f-photo-rm', 'data-act="fphoto-rm"')}</div>`}
      <button class="publish" id="f-publish" data-go="publish" style="opacity:${novaCanPublish() ? 1 : .45}">${s.fEditId ? 'Uložiť zmeny' : 'Zverejniť ponuku'}</button>
    </div></div>`;
}

// Photo grid shared by the new-posting form and the "Fotky" overlay: previews + remove ✕ + an "add" tile while under 3.
const MAX_PHOTOS = 3;
function photoGrid(urls, inputId, rmAttr, rmExtra = '') {
  return `<div class="photo-grid">
    ${urls.map((u, i) => `<div class="ph" style="background-image:url('${esc(u)}')"><button type="button" class="rm" ${rmExtra} data-${rmAttr}="${i}" aria-label="Odstrániť">${icon('x', 14)}</button></div>`).join('')}
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
  const path = `${state.uid}/${postingId}/${Date.now()}-${n}.${fileExt(file, 'jpg')}`;
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
          <div class="fp-badges">${s.fpVerified ? '<span class="badge-ok">✓ Overená firma</span>' : `<span class="badge-pending">${icon('clock', 13)} Neoverená firma</span>`}</div></div>
      </div>
      <div class="fp-fields">
        <div><div class="label">Oficiálny názov</div>
          <input class="input locked" id="fp-legal" value="${esc(s.fpLegal)}" placeholder="Doplní sa po overení IČO" readonly tabindex="-1"></div>
        <div><div class="label">Zobrazovaný názov</div><input class="input" id="fp-name" value="${esc(s.fpName)}"></div>
        <div><div class="label">Sídlo (mesto) — predvyplní miesto v novom inzeráte</div><div class="place-row"><input class="input" id="fp-city" value="${esc(cityName(s.fpCityId))}" placeholder="Mesto" autocomplete="off"></div></div>
        <div><div class="label">IČO — overujeme v Registri právnických osôb</div>
          <div class="fp-ico-row"><input class="input" id="fp-ico" value="${esc(s.fpIco)}" inputmode="numeric" maxlength="8" autocomplete="off">
            ${s.fpVerified ? '' : '<button class="p-edit" data-go="fpVerify">Overiť znova</button>'}</div>
          <div class="ico-note ${s.fpVerified ? 'ok' : rpoClass(s.fpRpo)}">${esc(s.fpVerified ? (rpoOk(s.fpRpo) ? rpoText(s.fpRpo) : '✓ Overená v Registri právnických osôb') : (rpoText(s.fpRpo) || 'Zatiaľ neoverené.'))}</div></div>
        <div><div class="label">O firme — uvidia to študenti na karte</div><textarea id="fp-desc" rows="3">${esc(s.fpDesc)}</textarea></div>
      </div>
      <div class="p-stats">
        <div><div class="n">${S.active}</div><div class="l">aktívne inzeráty</div></div>
        <div><div class="n green">${S.m}</div><div class="l">zhody spolu</div></div>
      </div>
    </div>
    ${blockedCard(s.blocked, 'Zablokovaní <b>brigádnici</b>', 'nevidíte ich medzi kandidátmi', 'Odblokovať')}
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
  on('f-pay',  el => el.addEventListener('input', () => { state.fPay = el.value; document.getElementById('f-publish').style.opacity = novaCanPublish() ? 1 : .45; }));
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
  on('f-address', el => el.addEventListener('input', () => { state.fAddress = el.value; }));
  on('f-city', el => { cityAutocomplete(el, () => el.dispatchEvent(new Event('input')));
    el.addEventListener('input', () => { const c = cityByName(el.value); state.fCityId = c ? c.id : null;
      const b = document.getElementById('f-publish'); if (b) b.style.opacity = novaCanPublish() ? 1 : .45; }); });
  on('fp-city', el => cityAutocomplete(el, () => el.dispatchEvent(new Event('change'))));
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

  if (d.unblock && a === 'unblock') {
    const list = isStudent() ? state.blockedFirms : state.blocked;
    if (list.includes(d.unblock)) list.splice(list.indexOf(d.unblock), 1);
    render(); showToast(isStudent() ? 'Firmu zase uvidíš vo feede.' : 'Brigádnik je odblokovaný.');
    await setBlocked(d.unblock, false);
    if (!isStudent()) { await loadSuggestions(); render(); }
    return;
  }
  if (d.job) {
    const j = state.postings.find(x => x.id === +d.job);
    if (a === 'open')   { openDetail(j); render(); }
    if (a === 'like')   act(j, 'like');
    if (a === 'skip')   act(j, 'skip');
    if (a === 'menu')   { state.rowMenu = state.rowMenu === 'j' + j.id ? null : 'j' + j.id; render(); }
    if (a === 'report') { openReport('posting', j.id, `${j.t} — ${j.f}`); render(); }
    if (a === 'block')  {
      state.rowMenu = null; if (!state.blockedFirms.includes(j.companyId)) state.blockedFirms.push(j.companyId); state.blockNames[j.companyId] = j.f;
      showToast('Firmu sme skryli z tvojho feedu. Vrátiť ju môžeš v Profile.');
      await setBlocked(j.companyId, true);
    }
  }
  else if (d.cand) {
    const [sid, pid] = d.cand.split(':');
    const c = state.candidates.find(x => x.id === sid && x.postingId === +pid);
    if (a === 'menu')   { state.rowMenu = state.rowMenu === 'c' + d.cand ? null : 'c' + d.cand; render(); }
    if (a === 'report') { openReport('student', sid, c?.n || 'Brigádnik'); render(); }
    if (a === 'block')  {
      state.rowMenu = null; if (!state.blocked.includes(sid)) state.blocked.push(sid); state.blockNames[sid] = c?.n || 'Brigádnik';
      showToast('Profil zablokovaný. Odblokovať ho môžete vo Firemnom profile.');
      await setBlocked(sid, true);
    }
    if (a === 'contact') {
      try {
        await reachOut(sid, pid);
        render();
        await checkMatch(+pid, sid);
      } catch (err) { fail(err); }
    }
  }
  else if (d.sugg && a === 'invite') {                                          // firm reaches out first
    const [sid, pid] = d.sugg.split(':');
    try {
      await reachOut(sid, pid);
      const r =(state.suggestions[+pid] || []).find(x => x.student_id === sid); if (r) r.contacted = true;
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
        const { data: row, error } = await sb.from('postings').insert({ company_id: state.uid, title: src.title + ' (kópia)', pay: src.pay, need: src.need,
          types: src.types, only18: src.only18, ai_note: src.ai_note, description: src.description, start: src.start,
          city_id: src.city_id, remote: src.remote, address: src.address || '' }).select('id').single();
        if (error) throw error;
        if ((src.photos || []).length) {                   // own copies of the photos — deleting one posting must not break the other
          const urls = [];
          for (const [n, url] of src.photos.entries()) {
            const from = photoPath(url), to = `${state.uid}/${row.id}/${Date.now()}-${n}.${from.split('.').pop()}`;
            const { error: e } = await sb.storage.from('posting-photos').copy(from, to);
            if (e) { console.warn('photo copy', e.message); continue; }
            urls.push(sb.storage.from('posting-photos').getPublicUrl(to).data.publicUrl);
          }
          if (urls.length) await sb.from('postings').update({ photos: urls }).eq('id', row.id);
        }
        await reloadCompany(); showToast('Inzerát zduplikovaný.');
      }
      if (a === 'edit')   {                              // load the posting into the "Nový inzerát" form
        const { data: src, error } = await sb.from('postings').select('*').eq('id', o.id).single();
        if (error) throw error;
        clearNova();
        Object.assign(state, { fEditId: src.id, fT: src.title, fPay: src.pay, fNeed: String(src.need), fTypes: [...(src.types || [])], aiNote: src.ai_note || '',
          only18: src.only18, fDesc: src.description || '', fCityId: src.city_id, fRemote: !!src.remote, fAddress: src.address || '', ftab: 9, rowMenu: null });
        render(); window.scrollTo(0, 0);
      }
      if (a === 'askDel') { state.rowMenu = null; state.delIdx = i; render(); }
      if (a === 'photos') { state.rowMenu = null; state.photoEdit = { offerId: o.id, title: o.t, photos: [...o.photos] }; render(); }
    } catch (err) { fail(err); }
  }
  else if (a === 'filter') { toggleInList(state.filters, d.f); render(); track('filter', { f: d.f, on: state.filters.includes(d.f) }); }
  else if (a === 'filter-clear') { state.filters = []; render(); }
  else if (a === 'type') { toggleInList(state.fTypes, d.type); render(); }
  else if (a === 'remote') { state.fRemote = !state.fRemote; state.fTypes = state.fTypes.filter(t => t !== 'Remote').concat(state.fRemote ? ['Remote'] : []); render(); }
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
        <button data-tab="${i}" aria-label="${label}" title="${label}"><span class="glyph">${glyph}</span></button>`).join('')}</div></div>`;   // icons only — the name is for screen readers / tooltip
  }
  const active = activeTab();
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
  if (b) switchTab(+b.dataset.tab);
});
const activeTab = () => isStudent() ? state.tab : (state.ftab === 9 ? 2 : state.ftab);   // "Nový inzerát" (9) belongs to Inzeráty
function switchTab(i) {                                    // bottom dock (phones) and the top-bar tabs (desktop)
  if (i === activeTab()) return;
  if (isStudent()) state.tab = i; else state.ftab = i;
  state.rowMenu = null; state.accMenu = false;
  render();                                                // data is already in memory — no fake loading
  window.scrollTo(0, 0);
}

function layers() {                                        // banner l.946, toast l.954, delete l.957, gate l.972, detail l.988
  let h = '';
  if (state.banner) h += `<div class="banner" role="status"><div class="ok">✓</div>
    <div><b>Máš zhodu!</b><span class="s">${esc(state.bannerName)} má o teba záujem.</span></div>
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
    <div class="ic">${icon('heart', 24)}</div>
    <div class="h">Ešte krôčik — potrebujeme vedieť, kto si</div>
    <div class="p">Bez účtu nevieme komu ponuku priradiť. Registrácia trvá pár sekúnd a tvoj záujem odošleme hneď po nej.</div>
    <div class="col"><button class="b1" data-go="gateSignup">Vytvoriť účet</button>
      <button class="b2" data-go="gateLogin">Už mám účet — prihlásiť sa</button>
      <button class="b3" data-go="gateClose">Zrušiť</button></div></div></div>`;
  const d = state.detail;
  if (d) h += `<div class="overlay detail" data-go="closeDetail"><div class="dmodal" data-go="noop">
    <div class="top"><div class="who"><div class="lg" style="${logoStyle(d)}">${logoText(d)}</div>
      <div><div class="t">${esc(d.t)}</div><div class="f">${esc(d.f)}${placeTxt(d) ? ` · ${esc(placeTxt(d))}` : ''}</div>
        ${d.legal && d.legal !== d.f ? `<div class="legal">✓ ${esc(d.legal)} — podľa Registra právnických osôb</div>` : ''}</div></div>
      <button class="x" data-go="closeDetail" aria-label="Zavrieť">${icon('x')}</button></div>
    ${d.badges.length || d.tags.length ? `<div class="chips">${d.badges.map(b => `<span class="badge">${esc(b)}</span>`).join('')}${d.tags.map(t => `<span class="tag">${esc(typeLabel(t))}</span>`).join('')}</div>` : ''}
    <div class="payrow"><div class="pay">${esc(d.pay)} <small>/ hod</small></div><span class="need">${needTxt(d)}</span></div>
    ${d.remote ? '' : d.address || d.city ? `<div class="addr">${esc([d.address, d.city].filter(Boolean).join(', '))}
      ${d.address ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([d.address, d.city].filter(Boolean).join(', '))}" target="_blank" rel="noopener">mapa ↗</a>` : ''}</div>` : ''}
    ${d.desc ? `<p>${esc(d.desc)}</p>` : ''}
    ${d.photos.length ? `<div class="sec">Deň v práci</div>
    <div class="day">${d.photos.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener" class="ph" style="background-image:url('${esc(u)}')"></a>`).join('')}</div>` : ''}
    ${state.likedIds.includes(d.id) ? `<div class="sent">✓ Záujem odoslaný</div>` : isFull(d) ? `<div class="act"><button class="like" disabled>Obsadené</button></div>` : `
    <div class="act"><button class="like" data-go="detailLike">${icon('heart', 16)}Mám záujem</button>${state.authed ? `<button class="skip" data-go="detailSkip">${icon('x', 16)}Nezaujíma ma</button>` : ''}</div>`}
    ${(state.authed && !isStudent() && d.companyId === state.uid) ? '' : `<div class="report-row"><button class="link" data-go="reportPosting">${icon('flag', 14)}Nahlásiť inzerát</button></div>`}
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
const AGE_NOTE    = `Robiq je pre ľudí od ${MIN_AGE} rokov. Dátum sa neskôr nedá zmeniť.`;
const AGE_BLOCKED = `Robiq je pre ľudí od ${MIN_AGE} rokov — registrácia zatiaľ nie je možná.`;
const isOldEnough = () => (ageOf(state.birth) ?? -1) >= MIN_AGE;
const avatarTooBig = f => f.size > 5 * 1024 * 1024;       // profile photo limit (posting photos: see pickPhotos)
const AVATAR_TOO_BIG = 'Fotka je príliš veľká (max. 5 MB).';
// Latest birth date that makes someone MIN_AGE today — the date picker's upper bound.
function maxBirth() { const d = new Date(); d.setFullYear(d.getFullYear() - MIN_AGE); return d.toISOString().slice(0, 10); }
const fmtDate = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('sk-SK'); };
function obCanContinue() {
  if (state.obStep === 1) return state.obName.trim() && (state.oauth || (state.obEmail.trim() && state.obPass.length >= 6)) && isOldEnough();
  if (state.obStep === 2) return state.obSkills.length > 0;
  return state.obTerms && !!state.cityId;                  // step 3: city (required) + terms/privacy consent (also for Google sign-ups)
}
// Consent line for the last registration step (student and company). Links open in a new tab so the form is not lost.
const TERMS_LINK   = '<a href="podmienky.html" target="_blank" rel="noopener">Podmienkami používania</a>';
const PRIVACY_LINK = '<a href="ochrana-osobnych-udajov.html" target="_blank" rel="noopener">Ochranu osobných údajov</a>';
const TERMS_HTML = (key, txt) => `<button type="button" class="terms ${state[key] ? 'on' : ''}" id="terms"><span class="box">${state[key] ? '✓' : ''}</span>
  <span class="txt">${txt}</span></button>`;
function bindTerms(root, key) {                            // root: both registrations have an #terms, the other one may be hidden in the page
  root.querySelector('#terms').addEventListener('click', e => {
    if (e.target.closest('a')) return;                     // the link opens the terms; it must not toggle the checkbox
    state[key] = !state[key]; render();
  });
}
function obStep1Problem() {                                // why step 1 cannot continue — shown when the button is pressed anyway
  if (!state.obName.trim()) return 'Napíš svoje meno.';
  if (!state.oauth && !state.obEmail.trim()) return 'Zadaj e-mail.';
  if (!state.oauth && state.obPass.length < 6) return 'Heslo musí mať aspoň 6 znakov.';
  if (!state.birth) return 'Zadaj dátum narodenia.';
  if (!isOldEnough()) return AGE_BLOCKED;
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
    if (s.error) { setErr('ob-err', skError(s.error)); return; }
    await finishStudentReg();
    track('reg_done', { role: 'student', via: 'google' });
    return;
  }
  const { data, error } = await sb.auth.signUp({ email: state.obEmail.trim(), password: state.obPass,
    options: { data: { role: 'student', name: state.obName.trim(), birth: state.birth, skills: state.obSkills, hours: state.obHours, avail_days: state.availDays, avail_times: state.availTimes, city_id: state.cityId, commute: state.commute } } });
  btn.disabled = false;
  if (signUpTaken(data, error)) { state.obStep = 1; render(); setErr('ob-err', EMAIL_TAKEN_S); return; }   // back to the e-mail field
  if (error) { setErr('ob-err', skError(error)); return; }
  track('reg_done', { role: 'student', via: 'email' });
  if (!data.session) {                                    // e-mail confirmation is on
    state.screen = 'login'; render();
    setErr('login-err', 'Poslali sme ti potvrdzovací e-mail. Po potvrdení sa prihlás.');
    return;
  }
  state.uid = data.user.id;
  await finishStudentReg();
}
async function finishStudentReg() {                        // the account exists now — store the photo chosen in step 1, open the app
  if (state.obPhotoFile) {
    try { await uploadAvatar(state.obPhotoFile); } catch (e) { console.warn('avatar upload failed', e); }
    state.obPhotoFile = null; state.obPhotoPreview = '';
  }
  await enterApp({ tab: 0 });
}
// Progress dots and the "next" button of a 3-step registration (prefix 'ob' = student, 'fob' = company).
function renderStepChrome(prefix, step, lastLabel, canContinue) {
  [...document.getElementById(prefix + '-dots').children].forEach((d, i) => d.classList.toggle('on', step >= i + 1));
  const next = document.getElementById(prefix + '-next');
  next.textContent = step === 3 ? lastLabel : 'Pokračovať';
  next.style.opacity = canContinue ? 1 : .45;
}
function renderOb() {
  renderStepChrome('ob', state.obStep, 'Hotovo — pozri ponuky', obCanContinue());
  if (state.obStep === 1) obStep1();
  if (state.obStep === 2) obStep2();
  if (state.obStep === 3) obStep3();
}
const obEl = document.getElementById('ob-step');
function obStep1() {                                       // l.111–119 + e-mail a heslo (nutné pre skutočný účet)
  obEl.innerHTML = `
    <div class="s1-row">${avatarHtml('avatar', state.obPhotoPreview, initials(), ' id="avatar"')}
      <div class="col"><input class="input" id="ob-name" placeholder="Meno a priezvisko" value="${esc(state.obName)}" autocomplete="name">
        ${state.oauth ? `<div class="oauth-note" style="margin:0;text-align:left">Účet cez Google: <b>${esc(state.oauthEmail)}</b></div>` : `
        <input class="input" id="ob-email" type="email" placeholder="E-mail" value="${esc(state.obEmail)}" autocomplete="email">
        <input class="input" id="ob-pass" type="password" placeholder="Heslo (aspoň 6 znakov)" value="${esc(state.obPass)}" autocomplete="new-password">`}
        <label class="ob-birth"><span>Dátum narodenia</span><input class="input" id="ob-birth" type="date" value="${esc(state.birth)}" max="${maxBirth()}" autocomplete="bday"></label>
        <div class="ob-age-note" id="ob-age-note">${AGE_NOTE}</div>
        <label class="photo-btn">${state.obPhotoFile ? 'Zmeniť fotku' : 'Nahrať fotku (voliteľné)'}<input type="file" accept="image/*" id="ob-photo" hidden></label>
        ${state.obPhotoFile ? '<button type="button" class="photo-remove" id="ob-photo-remove">Odstrániť fotku</button>' : ''}</div></div>`;
  const upd = () => {
    document.getElementById('ob-next').style.opacity = obCanContinue() ? 1 : .45;
    const a = ageOf(state.birth), note = document.getElementById('ob-age-note');
    note.textContent = a !== null && a < MIN_AGE ? AGE_BLOCKED : AGE_NOTE;
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
    if (avatarTooBig(f)) { setErr('ob-err', AVATAR_TOO_BIG); return; }
    setErr('ob-err', ''); state.obPhotoFile = f; state.obPhotoPreview = URL.createObjectURL(f); render();
  });
  const rm = document.getElementById('ob-photo-remove');
  if (rm) rm.addEventListener('click', () => { state.obPhotoFile = null; state.obPhotoPreview = ''; render(); });
  upd();
  obEl.onclick = null;
}
const initials = () => initialsOf(state.obName.trim() || 'Tomáš Novák');   // the student's own avatar — l.1247–1248
function obStep2() {                                       // l.123–162
  obEl.innerHTML = `
    ${skillsEditor()}`;
  obEl.onclick = e => { const el = e.target.closest('button'); if (el) editorClick(el); };
  bindEditors();
}
function obStep3() {                                       // l.166–188
  obEl.innerHTML = `
    <div class="hours-label" id="hours-label">${HOURS[state.obHours]}</div>
    ${availabilityEditor()}
    <div style="margin-top:22px">${TERMS_HTML('obTerms', `Mám 16 rokov alebo viac, súhlasím s ${TERMS_LINK} a beriem na vedomie ${PRIVACY_LINK}.`)}</div>`;
  obEl.onclick = e => { const el = e.target.closest('button'); if (el && el.id !== 'terms') editorClick(el); };
  bindTerms(obEl, 'obTerms');
  bindEditors();
}

// ─── Shared editors: onboarding steps 2–3 and the profile in edit mode ───
const SKILLS_SHOWN = 6;
function skillsEditor() {                                  // l.126–162, logic l.1256–1296
  const selNames = state.obSkills.map(x => x.n);
  const rows = state.obSkills.map((x, i) => {
    const isLang = LANGS.includes(x.n), speakOn = x.speak !== false;
    const lvls = (isLang ? LANG_LVLS : LVLS).map((L, li) => `<button type="button" class="${x.lvl === li + 1 ? 'on' : ''}" data-lvl="${i}:${li + 1}">${L}</button>`).join('');
    return `<div class="sel-row"><div class="sel-name">${esc(x.n)}</div>
      <button type="button" class="speak ${speakOn ? 'on' : ''}" data-speak="${i}" style="display:${isLang ? 'inline-block' : 'none'}">${speakOn ? '✓ Rozprávam' : 'Rozprávam'}</button>
      <div class="lvls">${lvls}</div><button type="button" class="remove" aria-label="Odstrániť" data-remove="${i}">${icon('x', 14)}</button></div>`;
  }).join('');
  const groups = GROUPS.map(gr => {
    const sugg = [];
    state.obSkills.forEach(x => { if (!gr.items.includes(x.n)) return;
      (RELATED[x.n] || []).forEach(r => { if (!selNames.includes(r) && !SKILLS.includes(r) && !sugg.includes(r)) sugg.push(r); }); });
    // A group shows its first SKILLS_SHOWN skills; the rest is one tap away ("Ďalšie") — ~50 chips at once was a wall.
    const left = gr.items.filter(n => !selNames.includes(n)), open = state.skillsOpen.includes(gr.g);
    const shown = open ? left : left.slice(0, SKILLS_SHOWN), hidden = left.length - shown.length;
    const chips = shown.map(n => `<button type="button" class="chip" data-add="${esc(n)}">＋ ${esc(n)}</button>`)
      .concat(sugg.map(n => `<button type="button" class="chip sugg" data-add="${esc(n)}">${icon('sparkles', 13)}${esc(n)}</button>`))
      .concat(hidden ? [`<button type="button" class="chip more" data-more="${esc(gr.g)}">Ďalšie (${hidden})</button>`]
            : open && left.length > SKILLS_SHOWN ? [`<button type="button" class="chip more" data-more="${esc(gr.g)}">Menej</button>`] : []);
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
    <div class="place-row"><input class="input" id="city" placeholder="Tvoje mesto" value="${esc(cityName(state.cityId))}" autocomplete="off">
      ${state.cityId ? '<span class="ok">✓</span>' : ''}</div>
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
  if (el.dataset.more)   { toggleInList(state.skillsOpen, el.dataset.more); render(); return true; }
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
  if (city) cityAutocomplete(city, () => city.dispatchEvent(new Event('input')));
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
    if (avatarTooBig(f)) { showToast(AVATAR_TOO_BIG); return; }
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
// The official name always comes from the register lookup for the IČO that is typed right now —
// a stale answer for an older IČO must not stay on the screen.
const fobLegalName = () => state.fobRpo?.ico === state.fobIco && rpoOk(state.fobRpo) ? state.fobRpo.name : '';
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
  let res;
  for (let i = 0; i < 2; i++) {                            // the register is sometimes slow → one retry before "unavailable"
    res = await sb.rpc('rpo_lookup', { p_ico: ico });
    if (seq !== rpoSeq) return null;                       // a newer lookup is running — ignore this one
    if (!res.error && res.data?.reason !== 'unavailable') break;
  }
  const { data, error } = res;
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
  state.fpVerified = !!data.verified; state.fpRpo = data; state.fpLegal = data.legal_name || '';
  return data;
}
document.getElementById('fob-back').addEventListener('click', () => { if (state.fobStep > 1) state.fobStep--; else state.screen = 'pick'; render(); });
document.getElementById('fob-next').addEventListener('click', async () => {          // l.1480–1490
  if (!fobCanContinue()) { if (state.fobStep === 1) setErr('fob-err', !ICO_RE.test(state.fobIco) ? 'IČO má 8 číslic.' : 'Zadajte zobrazovaný názov firmy.'); return; }
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
    if (c.error) { setErr('fob-err', skError(c.error)); return; }
    await finishCompanyReg();
    track('reg_done', { role: 'firm', via: 'google' });
    return;
  }
  const { data, error } = await sb.auth.signUp({ email: state.fobEmail.trim(), password: state.fobPass,
    options: { data: { role: 'firm', name: state.fobName.trim(), ico: state.fobIco.trim(), fields: state.fobFields, contact_name: state.fobContact.trim() } } });
  btn.disabled = false;
  if (signUpTaken(data, error)) { setErr('fob-err', EMAIL_TAKEN_F); return; }
  if (error) { setErr('fob-err', skError(error)); return; }
  track('reg_done', { role: 'firm', via: 'email' });
  if (!data.session) {
    state.screen = 'login'; render();
    setErr('login-err', 'Poslali sme vám potvrdzovací e-mail. Po potvrdení sa prihláste.');
    return;
  }
  state.uid = data.user.id;
  await finishCompanyReg();
}
async function finishCompanyReg() {                        // the company row exists now → logo, RPO check sets `verified`, open the app
  if (state.fobLogoFile) { try { const url = await uploadLogo(state.fobLogoFile); await sb.from('companies').update({ logo_url: url }).eq('id', state.uid); } catch (e) { console.warn(e); } }
  await verifyCompany();                                   // (with e-mail confirmation on, loadCompany() does this at first sign-in)
  await enterApp({ ftab: 0 });
}
function renderFob() {
  renderStepChrome('fob', state.fobStep, 'Vytvoriť firemný účet', fobCanContinue());
  if (state.fobStep === 1) fobStep1();
  if (state.fobStep === 2) fobStep2();
  if (state.fobStep === 3) fobStep3();
}
const fobEl = document.getElementById('fob-step');
function fobStep1() {                                      // l.244–256
  fobEl.innerHTML = `
    <div class="f1-row"><label class="flogo" id="flogo" title="Nahrať logo"><span id="flogo-init"></span><span class="tag">LOGO</span><input type="file" accept="image/*" id="flogo-file"></label>
      <div class="col">
        <input class="input" id="fob-ico" placeholder="IČO (8 číslic)" value="${esc(state.fobIco)}" inputmode="numeric" maxlength="8" autocomplete="off">
        <div class="ico-note ${rpoClass(state.fobRpo)}" id="fob-ico-note">${esc(state.fobRpo?.ico === state.fobIco ? rpoText(state.fobRpo) : '')}</div>
        <div class="f1-lab">Oficiálny názov</div>
        <input class="input locked" id="fob-legal" placeholder="Doplní sa podľa IČO" value="${esc(fobLegalName())}" readonly tabindex="-1">
        <div class="f1-lab">Zobrazovaný názov</div>
        <input class="input" id="fob-name" placeholder="Napríklad skrátený názov firmy" value="${esc(state.fobName)}">
      </div></div>`;
  paintLogo();
  const upd = () => { document.getElementById('fob-next').style.opacity = fobCanContinue() ? 1 : .45; };
  const nameEl = document.getElementById('fob-name');
  nameEl.addEventListener('input', () => { state.fobName = nameEl.value; paintLogo(); upd(); });
  // IČO: digits only; as soon as there are 8 of them, ask the register and show the company under the field.
  const icoEl = document.getElementById('fob-ico'), noteEl = document.getElementById('fob-ico-note');
  const legalEl = document.getElementById('fob-legal');
  const showRpo = r => { noteEl.textContent = rpoText(r); noteEl.className = 'ico-note ' + rpoClass(r); };
  icoEl.addEventListener('input', async () => {
    icoEl.value = icoEl.value.replace(/\D/g, '').slice(0, 8);
    state.fobIco = icoEl.value; state.fobRpo = null; legalEl.value = ''; setErr('fob-err', ''); upd();
    if (!ICO_RE.test(state.fobIco)) { showRpo(null); return; }
    noteEl.textContent = 'Hľadám v registri…'; noteEl.className = 'ico-note';
    const r = await rpoLookup(state.fobIco);
    if (!r || r.ico !== state.fobIco) return;             // typed on meanwhile
    showRpo(r);
    legalEl.value = rpoOk(r) ? r.name : '';                // the official name comes from the register, never from typing
    if (rpoOk(r) && !state.fobName.trim()) { state.fobName = r.name; nameEl.value = r.name; paintLogo(); upd(); }   // display name starts as the official one
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
    <div class="label" style="margin-bottom:11px">Odvetvie</div>
    <div class="fchips">${FIELDS.map(f => `<button type="button" class="fchip ${state.fobFields.includes(f) ? 'on' : ''}" data-field="${esc(f)}">${esc(f)}</button>`).join('')}</div>`;
  fobEl.onclick = e => { const el = e.target.closest('button[data-field]'); if (!el) return; toggleInList(state.fobFields, el.dataset.field); render(); };
}
function fobStep3() {                                      // l.272–282
  fobEl.innerHTML = `
    <div class="f3-col"><input class="input" id="fob-contact" placeholder="Meno a priezvisko" value="${esc(state.fobContact)}" autocomplete="name">
      ${state.oauth ? `<div class="oauth-note" style="margin:0;text-align:left">Účet cez Google: <b>${esc(state.oauthEmail)}</b></div>` : `
      <input class="input" id="fob-email" type="email" placeholder="Pracovný e-mail" value="${esc(state.fobEmail)}" autocomplete="email">
      <input class="input" id="fob-pass" type="password" placeholder="Heslo (aspoň 6 znakov)" value="${esc(state.fobPass)}" autocomplete="new-password">`}</div>
    ${TERMS_HTML('fobTerms', `Súhlasím s ${TERMS_LINK}, beriem na vedomie ${PRIVACY_LINK} a potvrdzujem, že som oprávnený/á konať za túto firmu.`)}`;
  const upd = () => { setErr('fob-err', ''); document.getElementById('fob-next').style.opacity = fobCanContinue() ? 1 : .45; };
  bindInput('fob-contact', 'fobContact');
  if (!state.oauth) { bindInput('fob-email', 'fobEmail', upd); bindInput('fob-pass', 'fobPass', upd); }
  bindTerms(fobEl, 'fobTerms');
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
  g.addColorStop(0, 'rgba(52,32,176,.55)'); g.addColorStop(.5, 'rgba(124,108,224,.8)'); g.addColorStop(1, 'rgba(203,192,255,.95)');
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
  const fromPush = location.hash === '#spravy';
  openFromNotification();                                  // opened from a notification → chats
  track('visit', isRecovery ? { via: 'password_reset' } : fromLink ? { via: 'google_return' } : fromPush ? { via: 'notification' } : {});
})();

// Robiq — Cloudflare Worker. Statické súbory (robiq-app/) servíruje Cloudflare priamo, tento kód beží len pre /api/*
// (wrangler.jsonc → assets.run_worker_first). Všetko ostatné ide rovno na súbory, bez spúšťania kódu.
//
// TEST: POST /api/ai-onboarding — rozhovor pri registrácii študenta (app.js → aiSend).
// Appka pošle { messages: posledné správy [{ role, content }], profile: čo už vieme }; odpoveď { reply, profile, done }.
// AI beží na Cloudflare Workers AI cez binding `AI` — žiadny API kľúč; bezplatne 10 000 Neurons denne (~100–200 odpovedí).
// Povinné údaje (meno, dátum narodenia, telefón, mesto, e-mail, heslo) sa sem neposielajú — sú vo formulári po rozhovore.

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';   // otvorený model; dá sa vymeniť (Gemma 3, Mistral Small 3.1, Qwen 3…)
const MAX_MESSAGES = 12;                  // posielame len koniec rozhovoru — zvyšok nesie `profile` (menej tokenov = viac rozhovorov zadarmo)
const MAX_CHARS = 1000;                   // jedna správa
const QUOTA = /4006|neurons|allocation|quota/i;   // chyba Workers AI pri minutom dennom limite zadarmo

// Rovnaké zoznamy ako robiq-app/data.js — pri zmene tam uprav aj tu.
const SKILLS = [
  'Barista', 'Čašník / Servírka', 'Predaj', 'Pokladňa', 'Sklad', 'Eventy', 'Hostesing', 'Promo akcie', 'Doučovanie', 'Kuriér', 'Rozvoz', 'Recepcia', 'Kuchyňa', 'Upratovanie', 'Administratíva',
  'React', 'Tvorba webu', 'Grafika', 'Figma', 'Canva', 'Photoshop', 'Video strih', 'Copywriting', 'Sociálne siete', 'Excel', 'Dátová analýza', 'AI nástroje',
  'Vodičský preukaz B', 'Komunikatívnosť', 'Spoľahlivosť', 'Práca v tíme', 'Fyzická kondícia', 'Flexibilita', 'Práca pod tlakom', 'Organizovanosť', 'Rýchle učenie',
];
const LANGS = ['Angličtina', 'Nemčina', 'Španielčina', 'Francúzština', 'Taliančina', 'Ruština', 'Ukrajinčina', 'Maďarčina', 'Poľština', 'Čínština'];
const DAYS = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
const TIMES = ['Ráno', 'Poobede', 'Večer', 'Nočné zmeny'];
const COMMUTES = ['city', '15km', '30km', 'any'];

const SYSTEM = `Si Robiq, priateľský pomocník slovenskej appky na brigády pre študentov. Na začiatku registrácie sa so študentom krátko porozprávaš o tom, akú brigádu hľadá. Povinné údaje (meno, vek, telefón, mesto, e-mail, heslo) vyplní po rozhovore vo formulári, preto sa na ne nepýtaj.

Píš výhradne po slovensky (nie po česky), tykaj, krátko (1 až 3 vety), prirodzene, bez emoji. Pýtaj sa vždy len na jednu vec naraz a nadväzuj na to, čo človek povedal.

Postupne zisti:
1. Akú prácu hľadá, čo mu ide a čo už robil. Z toho vyvoď zručnosti a ku každej úroveň lvl: 1 = základy, 2 = dobré, 3 = top. Pri jazykoch je lvl 1 = A1–A2, 2 = B1–B2, 3 = C1–C2.
2. Koľko hodín týždenne môže pracovať: hours 0 = asi 5 h, 1 = asi 10 h, 2 = asi 20 h, 3 = fulltime cez leto.
3. Ktoré dni (${DAYS.join(', ')}) a kedy počas dňa (Ráno 6–12, Poobede 12–18, Večer 18–23, Nočné zmeny 23–6).
4. Voliteľne pár slov o sebe. Z rozhovoru napíš bio: 1 až 2 vety v prvej osobe, najviac 240 znakov, ktoré zaujmú firmu.

Názvy zručností ber presne z tohto zoznamu, ak sedia: ${SKILLS.join(', ')}. Jazyky: ${LANGS.join(', ')}. Ak nič nesedí, použi krátky vlastný názov s veľkým začiatočným písmenom.

Odpovedz VŽDY len jedným JSON objektom presne v tomto tvare, bez ďalšieho textu:
{"reply": "tvoja ďalšia správa študentovi", "done": false, "skills": [{"n": "Barista", "lvl": 2, "speak": true}], "hours": -1, "avail_days": [], "avail_times": [], "city": "", "commute": "", "bio": ""}

Pravidlá pre JSON:
- skills, hours, avail_days, avail_times a bio vždy vráť celé: doteraz známy profil (dostaneš ho nižšie) doplnený o to, čo pribudlo. Čo nevieš: hours = -1, prázdne pole, prázdny text. Nič si nevymýšľaj.
- speak = true, ak jazykom vie rozprávať (pri ostatných zručnostiach true).
- city a commute (city, 15km, 30km, any) vyplň len vtedy, keď ich sám spomenie; city ako názov obce v 1. páde (Žilina, nie v Žiline).
- Keď poznáš aspoň jednu zručnosť, hodiny a dni alebo časť dňa, v reply krátko zhrň, čo hľadá, a povedz, nech klikne na Pokračovať a doplní pár povinných údajov. Vtedy done = true.
- Ak sa pýta niečo mimo registrácie, krátko odpovedz a vráť sa k téme.`;

const SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    done: { type: 'boolean' },
    skills: {
      type: 'array',
      items: { type: 'object', properties: { n: { type: 'string' }, lvl: { type: 'integer', enum: [1, 2, 3] }, speak: { type: 'boolean' } }, required: ['n', 'lvl', 'speak'] },
    },
    hours: { type: 'integer', enum: [-1, 0, 1, 2, 3] },
    avail_days: { type: 'array', items: { type: 'string', enum: DAYS } },
    avail_times: { type: 'array', items: { type: 'string', enum: TIMES } },
    city: { type: 'string' },
    commute: { type: 'string', enum: ['', ...COMMUTES] },
    bio: { type: 'string' },
  },
  required: ['reply', 'done', 'skills', 'hours', 'avail_days', 'avail_times', 'city', 'commute', 'bio'],
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

// Profil, ktorý poslala appka / vrátil model → len známe polia v správnom tvare
function cleanProfile(p) {
  p = p && typeof p === 'object' ? p : {};
  return {
    skills: (Array.isArray(p.skills) ? p.skills : []).filter((x) => x && str(x.n, 30)).slice(0, 20)
      .map((x) => ({ n: str(x.n, 30), lvl: [1, 2, 3].includes(x.lvl) ? x.lvl : 2, speak: x.speak !== false })),
    hours: [0, 1, 2, 3].includes(p.hours) ? p.hours : -1,
    avail_days: (Array.isArray(p.avail_days) ? p.avail_days : []).filter((d) => DAYS.includes(d)),
    avail_times: (Array.isArray(p.avail_times) ? p.avail_times : []).filter((t) => TIMES.includes(t)),
    city: str(p.city, 60),
    commute: COMMUTES.includes(p.commute) ? p.commute : '',
    bio: str(p.bio, 240),
  };
}
function parseLoose(t) {                  // model bez JSON režimu: vyber prvý {...} z textu
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('no json in reply');
  return JSON.parse(t.slice(a, b + 1));
}
async function ask(env, messages, strict) {
  const out = await env.AI.run(MODEL, {
    messages, max_tokens: 700, temperature: 0.4,
    ...(strict && { response_format: { type: 'json_schema', json_schema: SCHEMA } }),
  });
  const r = out?.response;
  return r && typeof r === 'object' ? r : parseLoose(String(r ?? ''));
}

async function aiOnboarding(request, env, url) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const origin = request.headers.get('Origin');             // len z vlastnej stránky — cudzie weby by nám míňali denný limit
  if (origin && new URL(origin).host !== url.host) return json({ error: 'origin' }, 403);
  if (!env.AI) return json({ error: 'no ai' }, 503);
  if (env.AI_LIMIT) {                                       // najviac 10 správ za minútu z jednej IP (wrangler.jsonc → ratelimits)
    const { success } = await env.AI_LIMIT.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
    if (!success) return json({ error: 'limit' }, 429);
  }
  let input;
  try { input = await request.json(); } catch { return json({ error: 'bad request' }, 400); }

  // ─── rozhovor: striedajú sa user / assistant, začína a končí sa používateľom ───
  const chat = [];
  for (const m of (Array.isArray(input?.messages) ? input.messages : []).slice(-MAX_MESSAGES)) {
    const role = m?.role === 'assistant' ? 'assistant' : 'user';
    const content = str(m?.content, MAX_CHARS);
    if (!content) continue;
    const last = chat[chat.length - 1];
    if (last && last.role === role) last.content += '\n' + content;   // dve správy za sebou od toho istého → spoj
    else chat.push({ role, content });
  }
  if (chat[0]?.role === 'assistant') chat.unshift({ role: 'user', content: 'Ahoj' });   // úvodná veta bota je v appke
  if (chat[chat.length - 1]?.role !== 'user') return json({ error: 'bad request' }, 400);
  const known = cleanProfile(input.profile);
  const messages = [{ role: 'system', content: SYSTEM + '\n\nDoteraz známy profil: ' + JSON.stringify(known) }, ...chat];

  let out;
  try {
    try { out = await ask(env, messages, true); }           // JSON režim (presný tvar)
    catch (e) {                                             // ak zlyhá, ešte raz bez neho (ale nie pri minutom limite)
      if (QUOTA.test(String(e?.message || e))) throw e;
      console.warn('json mode', e?.message); out = await ask(env, messages, false);
    }
  } catch (e) {
    const msg = String(e?.message || e);
    console.warn('ai-onboarding', msg);
    if (QUOTA.test(msg)) return json({ error: 'quota' }, 503);   // minutý denný limit zadarmo
    return json({ error: 'ai' }, 502);
  }
  const reply = str(out?.reply, 2000);
  if (!reply) return json({ error: 'empty' }, 502);
  const p = cleanProfile(out);
  return json({
    reply,
    done: out.done === true,
    profile: { ...p, hours: p.hours >= 0 ? p.hours : null, city: p.city || null, commute: p.commute || null, bio: p.bio || null },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/ai-onboarding') return aiOnboarding(request, env, url);
    return env.ASSETS.fetch(request);                       // iné /api/… adresy → bežná 404 stránka
  },
};

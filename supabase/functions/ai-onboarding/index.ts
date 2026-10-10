// Robiq — TEST: registrácia študenta rozhovorom s AI (obrazovka „aiob" v app.js).
// Appka pošle celý doterajší rozhovor { messages: [{ role: "user" | "assistant", content }] } s anon kľúčom.
// Funkcia sa opýta Clauda a vráti { reply, profile, done }: ďalšiu vetu bota a profil, ktorý z rozhovoru zatiaľ vyplynul
// (meno, dátum narodenia, zručnosti, hodiny, dni, časy, mesto, dochádzanie, krátke „o mne").
// E-mail, heslo a súhlas s podmienkami sa AI neposielajú — tie vypĺňa študent na konci sám.
// Ochrana kreditu: najviac PER_IP_HOUR správ za hodinu z jednej IP a ALL_DAY za deň spolu (tabuľka ai_onboarding_calls).
// Kľúč: `supabase secrets set ANTHROPIC_API_KEY=...`
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-opus-5-5";
const PER_IP_HOUR = 60;
const ALL_DAY = 3000;
const MAX_MESSAGES = 40;                  // celý rozhovor
const MAX_CHARS = 1000;                   // jedna správa
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Rovnaké zoznamy ako robiq-app/data.js — pri zmene tam uprav aj tu.
const SKILLS = [
  "Barista", "Čašník / Servírka", "Predaj", "Pokladňa", "Sklad", "Eventy", "Hostesing", "Promo akcie", "Doučovanie", "Kuriér", "Rozvoz", "Recepcia", "Kuchyňa", "Upratovanie", "Administratíva",
  "React", "Tvorba webu", "Grafika", "Figma", "Canva", "Photoshop", "Video strih", "Copywriting", "Sociálne siete", "Excel", "Dátová analýza", "AI nástroje",
  "Vodičský preukaz B", "Komunikatívnosť", "Spoľahlivosť", "Práca v tíme", "Fyzická kondícia", "Flexibilita", "Práca pod tlakom", "Organizovanosť", "Rýchle učenie",
];
const LANGS = ["Angličtina", "Nemčina", "Španielčina", "Francúzština", "Taliančina", "Ruština", "Ukrajinčina", "Maďarčina", "Poľština", "Čínština"];
const DAYS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
const TIMES = ["Ráno", "Poobede", "Večer", "Nočné zmeny"];

const SYSTEM = `Si Robiq — priateľský pomocník slovenskej appky na brigády pre študentov. Rozhovorom pomáhaš študentovi vytvoriť profil, aby ho firmy našli. Píšeš po slovensky, tykáš, krátko (1–3 vety), prirodzene, bez emoji a bez odrážok. Pýtaj sa vždy len na jednu-dve veci naraz a nadväzuj na to, čo človek povedal.

Čo potrebuješ zistiť (v tomto poradí, ale pružne):
1. Meno a priezvisko.
2. Dátum narodenia (presný deň, mesiac, rok). Robiq je len pre ľudí od 16 rokov — ak je mladší, slušne vysvetli, že registrácia zatiaľ nie je možná, a ďalej sa nepýtaj.
3. Čo mu ide / akú prácu by chcel robiť a aké má skúsenosti — z toho vyvoď zručnosti. Pri každej odhadni úroveň: 1 = základy, 2 = dobré, 3 = top. Pri jazykoch je úroveň 1 = A1–A2, 2 = B1–B2, 3 = C1–C2; ak úroveň nepovedal, opýtaj sa.
4. Koľko hodín týždenne môže pracovať: 0 = asi 5 h, 1 = asi 10 h, 2 = asi 20 h, 3 = fulltime cez leto.
5. Ktoré dni (${DAYS.join(", ")}) a kedy počas dňa (Ráno 6–12, Poobede 12–18, Večer 18–23, Nočné zmeny 23–6).
6. V akom meste býva (do poľa city daj názov obce v 1. páde, napr. „Žilina", nie „v Žiline") a ako ďaleko je ochotný dochádzať: city = len moje mesto, 15km, 30km, any = celé Slovensko.
7. Voliteľne pár slov o sebe — z rozhovoru napíš krátke „o mne" (1–2 vety v prvej osobe, max 300 znakov), ktoré by zaujalo firmu.

Zručnosti: použi presne tieto názvy, ak sedia: ${SKILLS.join(", ")}. Jazyky: ${LANGS.join(", ")}. Ak niečo nesedí na žiadnu z nich, použi krátky vlastný názov (max 30 znakov, s veľkým začiatočným písmenom). Pri jazykoch nastav speak = true, ak ním vie rozprávať.

Pravidlá:
- V poli "profile" vždy vráť CELÝ profil podľa celého doterajšieho rozhovoru (nie len zmeny). Čo nevieš, nechaj null alebo prázdne pole. Nič si nevymýšľaj.
- Dátum narodenia vo formáte RRRR-MM-DD.
- Nepýtaj sa na e-mail, heslo, telefón, adresu, rodné číslo ani doklady — tie sa nezadávajú tu. Ak ich niekto napíše, nepoužívaj ich.
- Keď máš meno, dátum narodenia, aspoň jednu zručnosť, hodiny, dni a mesto, krátko zhrň profil a povedz, že ho môže skontrolovať a dokončiť dole. Vtedy nastav "done": true.
- Ak sa človek pýta niečo mimo registrácie, krátko odpovedz a vráť sa k profilu.`;

const nullable = (t: object) => ({ anyOf: [t, { type: "null" }] });
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "profile", "done"],
  properties: {
    reply: { type: "string", description: "Ďalšia správa pre študenta." },
    done: { type: "boolean", description: "true, keď je profil dosť úplný na dokončenie registrácie." },
    profile: {
      type: "object",
      additionalProperties: false,
      required: ["name", "birth", "skills", "hours", "avail_days", "avail_times", "city", "commute", "bio"],
      properties: {
        name: nullable({ type: "string" }),
        birth: nullable({ type: "string", description: "RRRR-MM-DD" }),
        skills: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["n", "lvl", "speak"],
            properties: { n: { type: "string" }, lvl: { type: "integer", enum: [1, 2, 3] }, speak: { type: "boolean" } },
          },
        },
        hours: nullable({ type: "integer", enum: [0, 1, 2, 3] }),
        avail_days: { type: "array", items: { type: "string", enum: DAYS } },
        avail_times: { type: "array", items: { type: "string", enum: TIMES } },
        city: nullable({ type: "string" }),
        commute: nullable({ type: "string", enum: ["city", "15km", "30km", "any"] }),
        bio: nullable({ type: "string" }),
      },
    },
  },
};

const anthropic = new Anthropic();     // ANTHROPIC_API_KEY zo secrets

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let input: { messages?: { role?: string; content?: unknown }[] };
  try { input = await req.json(); } catch { return json({ error: "bad request" }, 400); }

  // ─── rozhovor: striedajú sa user / assistant, začína a končí sa používateľom ───
  const raw = Array.isArray(input.messages) ? input.messages : [];
  if (!raw.length || raw.length > MAX_MESSAGES) return json({ error: "length" }, 400);
  const messages: Anthropic.MessageParam[] = [];
  for (const m of raw) {
    const role = m.role === "assistant" ? "assistant" : "user";
    const content = typeof m.content === "string" ? m.content.slice(0, MAX_CHARS).trim() : "";
    if (!content) continue;
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content += "\n" + content;   // dve správy za sebou od toho istého → spoj
    else messages.push({ role, content });
  }
  if (messages[0]?.role === "assistant") messages.unshift({ role: "user", content: "Ahoj" });   // úvodná veta bota je v appke
  if (messages[messages.length - 1]?.role !== "user") return json({ error: "bad request" }, 400);

  // ─── limit: na IP za hodinu a spolu za deň ───
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const ipHash = await sha256(ip + (Deno.env.get("SUPABASE_URL") || ""));
  const hourAgo = new Date(Date.now() - 3600_000).toISOString(), dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const [{ count: mine }, { count: all }] = await Promise.all([
    db.from("ai_onboarding_calls").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", hourAgo),
    db.from("ai_onboarding_calls").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
  ]);
  if ((mine ?? 0) >= PER_IP_HOUR || (all ?? 0) >= ALL_DAY) return json({ error: "limit" }, 429);
  await db.from("ai_onboarding_calls").insert({ ip_hash: ipHash });
  await db.from("ai_onboarding_calls").delete().lt("created_at", new Date(Date.now() - 7 * 86400_000).toISOString());   // týždeň stačí

  // ─── Claude ───
  try {
    const res = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages,
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",              // ak by model odmietol, server to skúsi na inom modeli
    } as never) as unknown as { stop_reason: string; content: { type: string; text?: string }[] };
    if (res.stop_reason === "refusal") return json({ error: "refusal" }, 502);
    const text = res.content.find((b) => b.type === "text")?.text;
    if (!text) return json({ error: "empty" }, 502);
    const out = JSON.parse(text);
    return json(out);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 503);
    if (e instanceof Anthropic.APIError) { console.warn("anthropic", e.status, e.message); return json({ error: "ai" }, 502); }
    console.warn("ai-onboarding", e);
    return json({ error: "ai" }, 502);
  }
});

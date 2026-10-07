// Robiq — hlásenie o páde appky. Volá ju obrazovka „Niečo sa pokazilo" (index.html → robiqCrash) cez obyčajný fetch
// s anon kľúčom: { reason, message, page }. Uloží záznam do crash_reports a pošle e-mail všetkým adminom (tabuľka admins)
// cez Brevo — najviac raz za 30 minút, aby jeden výpadok u stoviek ľudí nezaplavil schránku. Ďalšie pády v tom okne
// sa len zarátajú a ďalší e-mail povie, koľko ich medzitým bolo.
import { createClient } from "npm:@supabase/supabase-js@2";

const QUIET_MS = 30 * 60 * 1000;          // najviac jeden e-mail za 30 minút
const MAX_PER_HOUR = 200;                 // ochrana proti zahlteniu tabuľky
const APP_URL = "https://robiq.robiq-sk.workers.dev/";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
// Príčina a čo robiť — podľa toho, čo appka nahlásila (index.html → robiqCrash, app.js → štart)
const CAUSES: Record<string, string> = {
  script: "nenačítal sa súbor appky alebo knižnica (napr. Supabase z CDN)",
  server: "appka sa nevedela spojiť so serverom (Supabase)",
  error: "chyba v kóde appky pri štarte",
  rejection: "chyba v kóde appky pri štarte",
};
const NEXT: Record<string, string[]> = {
  script: [
    `1. Otvor ${APP_URL} — ak sa načíta, išlo o krátky výpadok CDN a netreba nič robiť.`,
    `2. Ak nie, pozri https://www.jsdelivrstatus.com a posledné nasadenie na Cloudflare.`,
  ],
  server: [
    `1. Otvor ${APP_URL} — ak sa načíta, išlo o krátky výpadok a netreba nič robiť.`,
    `2. Ak nie, pozri https://status.supabase.com a v Supabase, či projekt „robiq" beží (nie je pozastavený).`,
  ],
  error: [
    `1. Otvor ${APP_URL} — ak padá aj tebe, je to chyba v kóde.`,
    `2. Pozri poslednú zmenu na GitHube (vetva main) a ak ju spôsobila, vráť ju.`,
  ],
};
const cut = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let input: { reason?: string; message?: string; page?: string };
  try { input = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from("crash_reports").select("id", { count: "exact", head: true }).gte("created_at", hourAgo);
  if ((count ?? 0) >= MAX_PER_HOUR) return json({ skipped: "limit" });

  const row = {
    reason: cut(input.reason, 40) || "error", message: cut(input.message, 500), page: cut(input.page, 300),
    user_agent: cut(req.headers.get("user-agent"), 300),
  };
  const { data: saved, error } = await db.from("crash_reports").insert(row).select("id, created_at").single();
  if (error) { console.warn("insert failed", error.message); return json({ error: "store" }, 500); }
  await db.from("crash_reports").delete().lt("created_at", new Date(Date.now() - 30 * 86400_000).toISOString());   // 30 dní stačí

  // ─── e-mail: len ak posledný e-mail odišiel pred viac ako 30 minútami ───
  const { data: last } = await db.from("crash_reports").select("created_at").eq("emailed", true)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (last && Date.now() - Date.parse(last.created_at) < QUIET_MS) return json({ stored: true, emailed: false });
  const { count: since } = await db.from("crash_reports").select("id", { count: "exact", head: true })
    .gt("created_at", last?.created_at ?? hourAgo);

  const { data: brevoKey } = await db.rpc("notify_secret", { p_name: "brevo_api_key" });
  const { data: admins } = await db.from("admins").select("email");
  if (!brevoKey || !admins?.length) return json({ stored: true, emailed: false });
  // zaber e-mail ešte pred odoslaním — dva súbežné pády nepošlú dva e-maily
  await db.from("crash_reports").update({ emailed: true }).eq("id", saved.id);

  const when = new Date(saved.created_at).toLocaleString("sk-SK", { timeZone: "Europe/Bratislava" });
  const kind = Object.hasOwn(CAUSES, row.reason) ? row.reason : "error";   // neznámy dôvod (alebo podvrh) → ako chyba v kóde
  const cause = CAUSES[kind];
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST", headers: { "api-key": brevoKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Robiq", email: "ahoj@robiq.sk" },
      to: admins.map((a: { email: string }) => ({ email: a.email })),
      subject: "Robiq spadol",
      textContent: [
        `Robiq spadol — ${when} sa appka nespustila.${(since ?? 1) > 1 ? ` Od posledného e-mailu to padlo ${since}×.` : ""}`,
        ``,
        `Príčina: ${cause}`,
        row.message ? `Detail: ${row.message}` : ``,
        ``,
        `Čo ďalej:`,
        ...(NEXT[kind] ?? NEXT.error),
        ``,
        `Ďalší e-mail príde najskôr o 30 minút. Všetky hlásenia sú v Supabase v tabuľke crash_reports.`,
      ].join("\n"),
    }),
  });
  if (!r.ok) {
    console.warn("email failed", r.status, await r.text());
    await db.from("crash_reports").update({ emailed: false }).eq("id", saved.id);   // nech to ďalší pád skúsi znova
  }
  return json({ stored: true, emailed: r.ok });
});

// Robiq — upozornenie druhej strane na novú správu alebo novú zhodu.
// Volá ju appka odosielateľa hneď po odoslaní správy / po vzniku zhody: { message_id } alebo { match_id }.
// Overí, že volajúci je naozaj účastník a že ide o čerstvý záznam, „zaberie" ho (notified_at), aby
// upozornenie neodišlo dvakrát, a pošle push na všetky zariadenia príjemcu. E-mail ide cez Brevo,
// len ak je v trezore kľúč `brevo_api_key` (je od 27. 9. 2026) a príjemca nemá e-maily vypnuté (profiles.email_notify)
// — pri zhode vždy, pri správe len keď príjemca nemá push.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC = "BMGzQa7No4GusH4-AulW-QA0VjxNNPQhO-R7DOhEdiXyjna-rAJ5UGjHnbtADII2nq1FxSRSsC1ov4_3_zqvbNc";
const FRESH_MS = 5 * 60 * 1000;          // staršie správy / zhody sa neoznamujú (ochrana proti opakovanému volaniu)
const APP_URL = "https://robiq.robiq-sk.workers.dev/";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return json({ error: "unauthorized" }, 401);
  let input: { message_id?: number; match_id?: number };
  try { input = await req.json(); } catch { return json({ error: "bad request" }, 400); }

  // ─── what happened, who gets told ───
  const matchCols = "id, student_id, company_id, created_at, notified_at, postings(title), companies(name)";
  let match: any, title: string, body: string, kind: "message" | "match", claim: { table: string; id: number };
  if (input.message_id) {
    const { data: msg } = await db.from("messages").select("id, match_id, sender_id, body, created_at, notified_at").eq("id", input.message_id).maybeSingle();
    if (!msg || msg.sender_id !== user.id || msg.notified_at || Date.now() - Date.parse(msg.created_at) > FRESH_MS) return json({ skipped: true });
    ({ data: match } = await db.from("matches").select(matchCols).eq("id", msg.match_id).maybeSingle());
    if (!match) return json({ skipped: true });
    kind = "message"; claim = { table: "messages", id: msg.id };
    body = msg.body.length > 140 ? msg.body.slice(0, 139) + "…" : msg.body;
    title = "";                            // sender's name, filled below
  } else if (input.match_id) {
    ({ data: match } = await db.from("matches").select(matchCols).eq("id", input.match_id).maybeSingle());
    if (!match || match.notified_at || Date.now() - Date.parse(match.created_at) > FRESH_MS) return json({ skipped: true });
    kind = "match"; claim = { table: "matches", id: match.id };
    title = "Máte zhodu! 🎉"; body = "";
  } else return json({ error: "bad request" }, 400);

  if (user.id !== match.student_id && user.id !== match.company_id) return json({ error: "forbidden" }, 403);
  const recipient = user.id === match.student_id ? match.company_id : match.student_id;
  const recipientIsStudent = recipient === match.student_id;
  const { data: student } = await db.from("students").select("name").eq("id", match.student_id).maybeSingle();
  const company = match.companies?.name ?? "Firma", studentName = student?.name ?? "Brigádnik", job = match.postings?.title ?? "";
  if (kind === "message") title = recipientIsStudent ? company : studentName;
  else body = recipientIsStudent ? `${company} má o teba záujem — ${job}. Napíšte si.` : `${studentName} — ${job}. Napíšte si.`;

  // ─── claim it (only one call ever notifies) ───
  const { data: claimed } = await db.from(claim.table).update({ notified_at: new Date().toISOString() })
    .eq("id", claim.id).is("notified_at", null).select("id");
  if (!claimed?.length) return json({ skipped: true });

  // ─── push to every device of the recipient ───
  let pushed = 0;
  const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", recipient);
  const { data: vapidPrivate } = await db.rpc("notify_secret", { p_name: "vapid_private" });
  if (subs?.length && vapidPrivate) {
    webpush.setVapidDetails("mailto:support@robiq.sk", VAPID_PUBLIC, vapidPrivate);
    const payload = JSON.stringify({ title, body, url: "./#spravy", tag: `${kind}-${match.id}` });
    await Promise.all(subs.map(async (s) => {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 }); pushed++; }
      catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);   // device unsubscribed
        else console.warn("push failed", e?.statusCode, e?.body);
      }
    }));
  }

  // ─── e-mail via Brevo (only once a Brevo key is in the vault; sender must be verified in Brevo) ───
  let emailed = false;
  const { data: brevoKey } = await db.rpc("notify_secret", { p_name: "brevo_api_key" });
  const { data: pref } = await db.from("profiles").select("email_notify").eq("id", recipient).maybeSingle();
  if (brevoKey && pref?.email_notify !== false && (kind === "match" || pushed === 0)) {   // menu → E-maily Vyp. = no e-mail
    const { data: { user: to } } = await db.auth.admin.getUserById(recipient);
    if (to?.email) {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST", headers: { "api-key": brevoKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          sender: { name: "Robiq", email: "ahoj@robiq.sk" }, to: [{ email: to.email }],   // the sender verified in Brevo
          replyTo: { name: "Robiq", email: "ahoj@robiq.sk" },  // a real address to answer — Gmail files no-reply style mail as promotions more often
          subject: kind === "match" ? "Máte zhodu na Robiq" : `Nová správa: ${title}`,
          // plain, personal text without emoji (the push keeps „🎉") — reads less like a newsletter
          textContent: [
            kind === "match" ? `Máte zhodu. ${body}` : `${title} ti napísal(a):\n\n${body}`,
            ``,
            `Odpovedať môžeš v Robiq: ${APP_URL}#spravy`,
            ``,
            `Robiq`,
            `E-maily z Robiq vypneš v appke: menu účtu → E-maily.`,
          ].join("\n"),
        }),
      });
      emailed = r.ok; if (!r.ok) console.warn("email failed", r.status, await r.text());
    }
  }
  return json({ pushed, emailed });
});

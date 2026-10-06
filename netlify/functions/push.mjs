// Güncelleme bildirimleri: abonelik kaydı ve toplu gönderim. Antrenman günü hatırlatması: hatirlat.mjs (saat başı; gönderim kodu buradan).
// Antrenman verisi buraya gelmez; sadece tarayıcının anonim bildirim adresi (endpoint + anahtar) ve hatırlatma açıksa saat, günler, saat dilimi, ara haftaları saklanır.
// Ortam değişkenleri (Netlify): VAPID_PUBLIC, VAPID_PRIVATE, ADMIN_KEY. Gönderim: node bildirim.js gonder
import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import { createHash, timingSafeEqual } from "node:crypto";

export const config = { path: "/api/push" };

export const MAX_SUBS = 5000; // toplam abone üst sınırı (sahte kayıtla şişirmeye karşı); aşınca 429
export const BATCH = 20; // gönderimde aynı anda en çok bu kadar abone
export const FAIL_MAX = 3; // statusCode'suz (ağ/anahtar) hata bu kadar üst üste olursa kayıt silinir

// Sadece tarayıcıların gerçek bildirim servisleri (başka adrese istek atılmasın)
const HOSTS = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/;
const B64U = /^[A-Za-z0-9_-]+$/;
const b64len = (s) => (typeof s === "string" && B64U.test(s) ? Buffer.from(s, "base64url").length : -1);
// endpoint: https, bilinen host, kullanıcı adı/şifre/port yok; anahtarlar: p256dh 65 bayt (0x04 ile başlar), auth 16 bayt
export function okSub(s) {
  try {
    if (!s || typeof s !== "object" || typeof s.endpoint !== "string" || s.endpoint.length >= 1000) return false;
    const u = new URL(s.endpoint), k = s.keys;
    if (u.protocol !== "https:" || !HOSTS.test(u.hostname) || u.username || u.password || u.port) return false;
    return !!k && typeof k === "object" && b64len(k.p256dh) === 65 && Buffer.from(k.p256dh, "base64url")[0] === 4 && b64len(k.auth) === 16;
  } catch (e) { return false; }
}
// Hatırlatma kaydı: null = kapalı, nesne = geçerli ve temizlenmiş, false = geçersiz (400)
const ISO = /^\d{4}-\d{2}-\d{2}$/;
export function remindOf(x) {
  if (x == null) return null;
  if (typeof x !== "object" || Array.isArray(x)) return false;
  const { hour, days, tz, pauses = [] } = x;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return false;
  if (!Array.isArray(days) || !days.length || days.length > 7 || new Set(days).size !== days.length || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return false;
  if (typeof tz !== "string" || tz.length > 64) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); } catch (e) { return false; }
  if (!Array.isArray(pauses) || pauses.length > 20 || pauses.some((p) => typeof p !== "string" || !ISO.test(p))) return false;
  return { hour, days: [...days].sort(), tz, pauses: [...pauses] };
}
const idOf = (ep) => createHash("sha256").update(ep).digest("hex");
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const r = (status, body) => (body ? Response.json(body, { status }) : new Response(null, { status }));

export const vapid = () => webpush.setVapidDetails(process.env.URL || "https://tatamikampi.netlify.app", process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE);
// Tek aboneye gönderim. Kayıt silinir: adres yok (404/410), reddedildi (400-403) ya da statusCode'suz hata FAIL_MAX kez üst üste (ağ hatası tek seferde silmez).
// push: test için enjekte edilebilir. Dönüş: "sent" | "gone" | "failed"
export async function sendTo(store, key, s, payload, ttl, push = (sub, p, o) => webpush.sendNotification(sub, p, o)) {
  try {
    await push({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: ttl });
    if (s.fails) await store.setJSON(key, { ...s, fails: 0 });
    return "sent";
  } catch (e) {
    const sc = e && e.statusCode;
    if (sc === 404 || sc === 410 || (sc >= 400 && sc <= 403)) { await store.delete(key); return "gone"; }
    if (sc == null) { const fails = (s.fails || 0) + 1; if (fails >= FAIL_MAX) { await store.delete(key); return "gone"; } await store.setJSON(key, { ...s, fails }); }
    return "failed";
  }
}
// Toplu gönderim BATCH'lik gruplarla (binlerce aboneyi aynı anda denememek için)
export async function sendAll(store, payload, ttl, push) {
  const { blobs } = await store.list(), n = { sent: 0, gone: 0, failed: 0 };
  for (let i = 0; i < blobs.length; i += BATCH) {
    await Promise.all(blobs.slice(i, i + BATCH).map(async ({ key }) => {
      const s = await store.get(key, { type: "json" }); if (!s) return;
      n[await sendTo(store, key, s, payload, ttl, push)]++;
    }));
  }
  return { total: blobs.length, ...n };
}

export default async (req) => {
  if (req.method !== "POST") return r(405);
  if (+(req.headers.get("content-length") || 0) > 4000) return r(413);
  const text = await req.text();
  if (text.length > 4000) return r(413);
  let j; try { j = JSON.parse(text); } catch (e) { return r(400); }
  if (!j || typeof j !== "object" || Array.isArray(j)) return r(400);
  const store = getStore("abone");

  if (j.sub) {
    if (!okSub(j.sub)) return r(400);
    const remind = remindOf(j.remind); if (remind === false) return r(400);
    // Aynı gün ikinci hatırlatma gitmesin diye eski kaydın lastRemind'ı korunur
    const id = idOf(j.sub.endpoint), old = await store.get(id, { type: "json" });
    if (!old && (await store.list()).blobs.length >= MAX_SUBS) return r(429, { error: "Abone sınırı doldu; daha sonra tekrar dene." });
    await store.setJSON(id, { endpoint: j.sub.endpoint, keys: { p256dh: j.sub.keys.p256dh, auth: j.sub.keys.auth }, remind, lastRemind: (old || {}).lastRemind });
    return r(204);
  }
  if (j.unsub) { await store.delete(idOf(String(j.unsub))); return r(204); }

  if (j.send) {
    const key = process.env.ADMIN_KEY;
    if (!key || !same(req.headers.get("x-admin") || "", key)) return r(403);
    vapid();
    const payload = JSON.stringify({ title: String(j.send.title || "Tatami Kampı").slice(0, 80), body: String(j.send.body || "").slice(0, 300), url: "./" });
    return r(200, await sendAll(store, payload, 7 * 86400));
  }
  return r(400);
};

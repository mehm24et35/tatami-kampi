// Antrenman günü hatırlatması: saat başı çalışır (UTC), her aboneye kendi saat diliminde bakar.
// Gider: hatırlatma açık (remind), saat eşleşiyor, gün antrenman günü, hafta ara haftası değil ve o gün daha önce gitmemiş (lastRemind).
// Yalnız zamanlayıcı çağırır (adresle çağrılamaz). Elle: netlify functions:invoke hatirlat (netlify dev açıkken).
import { getStore } from "@netlify/blobs";
import { sendTo, vapid } from "./push.mjs";

export const config = { schedule: "0 * * * *" };

export const TEXT = { title: "Tatami Kampı", body: "Bugün antrenman günü. Hazır olunca Gün ekranından başla.", url: "./", tag: "hatirlatma" };
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
// Kişinin saat dilimindeki yerel tarih (YYYY-MM-DD), saat (0-23) ve haftanın günü (Pazar=0)
export function localNow(now, tz) {
  const p = {};
  new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", weekday: "short" }).formatToParts(now).forEach((x) => { p[x.type] = x.value; });
  return { date: p.year + "-" + p.month + "-" + p.day, hour: +p.hour, wd: WD[p.weekday] };
}
// Bu abone şu an hatırlatılmalı mı? Evetse yerel tarih döner (lastRemind olarak yazılır), değilse null. Saf fonksiyon: test/push.test.mjs
export function due(rec, now) {
  const R = rec.remind; if (!R) return null;
  let L; try { L = localNow(now, R.tz); } catch (e) { return null; }
  if (L.hour !== R.hour || !R.days.includes(L.wd) || rec.lastRemind === L.date) return null;
  const monday = new Date(new Date(L.date + "T00:00:00Z") - ((L.wd + 6) % 7) * 864e5).toISOString().slice(0, 10); // ara haftaları Pazartesi tarihiyle tutulur
  return (R.pauses || []).includes(monday) ? null : L.date;
}
// Tüm aboneleri tara; store ve gönderici test için dışarıdan verilebilir
export async function run(store, now, send = sendTo) {
  const { blobs } = await store.list(), n = { sent: 0, gone: 0, failed: 0 };
  // ponytail: hepsi aynı anda (push.mjs ile aynı sınır); hatırlatma 4 saat içinde ulaşmazsa düşer (TTL)
  await Promise.all(blobs.map(async ({ key }) => {
    const s = await store.get(key, { type: "json" }), d = s && due(s, now); if (!d) return;
    const res = await send(store, key, s, JSON.stringify(TEXT), 4 * 3600);
    if (res === "sent") await store.setJSON(key, { ...s, lastRemind: d });
    n[res]++;
  }));
  return { total: blobs.length, ...n };
}
export default async () => {
  vapid();
  const now = new Date(Math.round(Date.now() / 36e5) * 36e5); // zamanlayıcı saat başından birkaç saniye sapabilir: en yakın saate yuvarla
  console.log("hatirlat", now.toISOString(), JSON.stringify(await run(getStore("abone"), now)));
};

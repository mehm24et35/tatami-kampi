// Çevrimdışı çalışma: uygulama dosyalarını önbellekte tutar, internet yokken de açılır.
const CACHE = "tatami-__BUILD__";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", (e) => {
  // cache:"reload" → yeni sürüm kurulurken tarayıcının eski kopyası değil sunucudaki dosya alınır
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Önce önbellek, arkada güncelle (uygulama anında açılır; yeni sürüm gelince sayfa yenilenir ya da "Yenile" der).
// Önbellek açılamazsa / okunamazsa (kota, gizli mod) ağa düşülür: site hata vermez.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if ((!same && !fonts) || url.pathname.startsWith("/api/")) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req);
    const net = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()).catch(() => {}); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (req.mode === "navigate") return (await c.match("index.html")) || Response.error();
    return Response.error();
  }).catch(() => fetch(req)));
});

// Güncelleme bildirimi (gönderen: netlify/functions/push.mjs) ve antrenman günü hatırlatması (hatirlat.mjs, tag: "hatirlatma"); dokununca uygulama öne gelir ya da açılır
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Tatami Kampı", { body: d.body || "Yeni sürüm hazır.", icon: "icons/icon-192.png", tag: d.tag || "guncelleme", data: { url: d.url || "./" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const c = cs.find((x) => "focus" in x);
    return c ? c.focus() : self.clients.openWindow((e.notification.data && e.notification.data.url) || "./");
  }));
});

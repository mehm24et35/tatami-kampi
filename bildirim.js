// Güncelleme bildirimi
//   node bildirim.js kur <site>     → bildirim anahtarlarını üretir: push.local.json (gizli, yayına girmez)
//   node bildirim.js gonder [--evet] → src/yenilikler.json'daki en yeni maddeyi bildirim açan herkese yollar
//   Kilit: aynı metin son 10 dakika içinde gönderildiyse durur (son-gonderim.json); yine de göndermek için --evet
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const F = path.join(__dirname, "push.local.json"), LOCK = path.join(__dirname, "son-gonderim.json");
const cmd = process.argv[2];
if (cmd === "kur") {
  if (fs.existsSync(F)) { console.log("Anahtarlar zaten var:", F); process.exit(0); }
  const k = require("web-push").generateVAPIDKeys();
  fs.writeFileSync(F, JSON.stringify({ site: process.argv[3] || "", publicKey: k.publicKey, privateKey: k.privateKey, adminKey: crypto.randomBytes(24).toString("base64url") }, null, 2));
  console.log("Yazıldı:", F);
} else if (cmd === "gonder") {
  const c = JSON.parse(fs.readFileSync(F, "utf8")), n = JSON.parse(fs.readFileSync(path.join(__dirname, "src/yenilikler.json"), "utf8"))[0];
  if (!c.site) throw new Error("push.local.json içinde site adresi yok");
  const body = n.t, last = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, "utf8")) : null;
  if (last && last.body === body && Date.now() - last.at < 10 * 60e3 && !process.argv.includes("--evet")) {
    console.log("Aynı metin " + Math.round((Date.now() - last.at) / 60e3) + " dk önce gönderildi; yine de göndermek için: node bildirim.js gonder --evet");
    process.exit(1);
  }
  console.log("Gönderiliyor:", JSON.stringify(body));
  fetch(c.site.replace(/\/$/, "") + "/api/push", { method: "POST", headers: { "content-type": "application/json", "x-admin": c.adminKey }, body: JSON.stringify({ send: { title: "Tatami Kampı güncellendi", body } }) })
    .then(async (r) => { console.log(r.status, await r.text()); if (r.ok) fs.writeFileSync(LOCK, JSON.stringify({ body, at: Date.now() })); })
    .catch((e) => { console.error("Gönderilemedi:", e.message); process.exit(1); });
} else console.log("kullanım: node bildirim.js kur <site> | node bildirim.js gonder [--evet]");

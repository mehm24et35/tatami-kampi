// Derleme: node build.js
//   dist/personal.html  → kişisel program (Claude artifact olarak yayınlanır)
//   dist/web/           → herkese açık site (Netlify vb. yere olduğu gibi yüklenir)
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const R = (...p) => path.join(__dirname, ...p);
const read = (p) => fs.readFileSync(R(p), "utf8").replace(/\r\n?/g, "\n"); // CSP hash'leri ve tarayıcı LF üzerinden çalışır
const write = (p, s) => { fs.mkdirSync(path.dirname(R(p)), { recursive: true }); fs.writeFileSync(R(p), s); };
// dist/web olduğu gibi yayınlanır: içinde yalnız bu betiğin yazdıkları kalsın (kaza eseri kalan test kopyaları yayına gitmesin)
fs.rmSync(R("dist/web"), { recursive: true, force: true });
const tracker = read("src/tracker.html");
if (!tracker.includes("/*__DATA__*/")) throw new Error("tracker.html içinde /*__DATA__*/ yok");

// Yazı tipleri: web sürümü kendi sunucusundan (src/fonts), tek dosyalık Claude sürümleri Google Fonts'tan. tracker.html'de <!--__FONTS__--> yer tutucusu varsa buradan doldurulur.
const FONTS = fs.existsSync(R("src/fonts")) ? fs.readdirSync(R("src/fonts")).filter((f) => /\.(woff2|css)$/.test(f)) : [];
const LOCAL_FONTS = tracker.includes("<!--__FONTS__-->") && FONTS.includes("fonts.css");
const GOOGLE_FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Semi+Condensed:wght@600;700&display=swap">';
const withFonts = (html, local) => html.replace("<!--__FONTS__-->", local ? '<link rel="stylesheet" href="fonts/fonts.css">' : GOOGLE_FONTS);

// 1) Kişisel sürüm
if (fs.existsSync(R("personal/data.js"))) write("dist/personal.html", withFonts(tracker, false).replace("/*__DATA__*/", () => read("personal/data.js"))); // GitHub'da yok (kişisel)

// 2) Herkese açık site
const BUILD = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14); // saniyeli: aynı dakikadaki iki derleme aynı sürüm sayılmasın
// Yenilikler kartı + güncelleme bildirimi. push.local.json gizlidir (node bildirim.js kur); buradan sadece açık anahtar ve site adresi alınır.
const NEWS = JSON.stringify(JSON.parse(read("src/yenilikler.json"))).replace(/<\//g, "<\\/"); // metinde "</script>" betiği kapatmasın
const PUSH = fs.existsSync(R("push.local.json")) ? JSON.parse(read("push.local.json")) : {};
const head = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Seviyene, aletlerine, zamanına ve sakatlıklarına göre kişisel antrenman programı. Adım adım antrenman modu, sayaçlar, testler. Veriler sadece cihazında.">
<meta name="theme-color" content="#FFFFFF">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<style>[hidden]{display:none!important}body{margin:0}</style>
</head>
<body>
`;
// Android uygulaması: TK_REL = sürüm numarası (GitHub Actions'ta etiketten, v12 → "12"); TK_REPO = APK'ların indiği GitHub deposu
const REPO = process.env.TK_REPO || "mehm24et35/tatami-kampi", REL = (process.env.TK_REL || "").replace(/\D/g, "");
const scripts = "window.TK_NEWS = " + NEWS + "; window.TK_PUSH_KEY = " + JSON.stringify(PUSH.publicKey || "") + "; window.TK_REPO = " + JSON.stringify(REPO) + "; window.TK_REL = " + JSON.stringify(REL) + ";\n" +
  '</script><script src="js/lib.js?v=' + BUILD + '"></script><script src="js/engine.js?v=' + BUILD + '"></script><script src="js/public.js?v=' + BUILD + '"></script><script>';
write("dist/web/index.html", head + withFonts(tracker, LOCAL_FONTS).replace("/*__DATA__*/", () => scripts) + "\n</body>\n</html>\n");
["lib.js", "engine.js", "public.js"].forEach((f) => write("dist/web/js/" + f, read("js/" + f)));
write("dist/web/manifest.webmanifest", JSON.stringify({
  name: "Tatami Kampı", short_name: "Tatami", description: "Kişisel antrenman programı ve adım adım antrenman modu",
  start_url: "./", scope: "./", display: "standalone", orientation: "portrait", lang: "tr",
  background_color: "#FFFFFF", theme_color: "#FFFFFF", // açık palet --bg (bilgi/tasarim.md); koyu temada applyTheme meta'yı çalışma anında günceller
  icons: [
    { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}, null, 2));
// Çevrimdışı iskelete uygulama kodu da girer (sürümlü adreslerle; sayfanın istediği adresle birebir aynı olmalı)
const JS_URLS = ["lib.js", "engine.js", "public.js"].map((f) => "js/" + f + "?v=" + BUILD);
const SHELL_EXTRA = JS_URLS.concat(FONTS.map((f) => "fonts/" + f));
const sw = read("src/sw.js").replace("__BUILD__", BUILD).replace(/(const SHELL = \[[^\]]*)\]/, (m, a) => a + ", " + SHELL_EXTRA.map((u) => JSON.stringify(u)).join(", ") + "]");
if (!JS_URLS.every((u) => sw.includes(JSON.stringify(u)))) throw new Error("sw.js içinde SHELL dizisi bulunamadı");
write("dist/web/sw.js", sw);
if (fs.existsSync(R("src/icons"))) fs.readdirSync(R("src/icons")).forEach((f) => { fs.mkdirSync(R("dist/web/icons"), { recursive: true }); fs.copyFileSync(R("src/icons", f), R("dist/web/icons", f)); });
FONTS.forEach((f) => { fs.mkdirSync(R("dist/web/fonts"), { recursive: true }); fs.copyFileSync(R("src/fonts", f), R("dist/web/fonts", f)); });
// 3) Herkese açık sürümün Claude bağlantısı (tek dosya; yazdırma/indirme yerine kopyala-yapıştır)
const inline = "window.TK_ARTIFACT = true; window.TK_NEWS = " + NEWS + "; window.TK_SITE = " + JSON.stringify(PUSH.site || "") + ";\n</script><script>" + ["lib.js", "engine.js", "public.js"].map((f) => read("js/" + f)).join("\n</script><script>\n") + "\n</script><script>";
write("dist/public-artifact.html", withFonts(tracker, false).replace("<title>Tatami Kampı</title>", "<title>Tatami Kampı Koçu</title>").replace("/*__DATA__*/", () => inline));
// Güvenlik başlıkları. CSP satır içi betikleri hash'le tanır (HTML'de on*= ve eval yok); style= öznitelikleri için 'unsafe-inline' gerekli.
// Yerelde doğrulamak için: node tools/serve.js (python sunucusu _headers'ı uygulamaz).
const html = read("dist/web/index.html");
const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => "'sha256-" + crypto.createHash("sha256").update(m[1]).digest("base64") + "'");
const CSP = ["default-src 'self'", "script-src 'self' " + hashes.join(" "), "style-src 'self' 'unsafe-inline'" + (LOCAL_FONTS ? "" : " https://fonts.googleapis.com"), "font-src 'self'" + (LOCAL_FONTS ? "" : " https://fonts.gstatic.com"),
  "img-src 'self' data:", "connect-src 'self'", "manifest-src 'self'", "worker-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'"].join("; ");
write("dist/web/_headers", ["/*", "  X-Content-Type-Options: nosniff", "  Referrer-Policy: strict-origin-when-cross-origin", "  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()", "  X-Frame-Options: DENY",
  "/", "  Cache-Control: no-cache", "  Content-Security-Policy: " + CSP, "/index.html", "  Cache-Control: no-cache", "  Content-Security-Policy: " + CSP, "/sw.js", "  Cache-Control: no-cache", ""].join("\n"));
console.log("derlendi:", BUILD, REL ? "· sürüm " + REL : "", "· public-artifact.html", fs.statSync(R("dist/public-artifact.html")).size, "bayt · web/index.html", fs.statSync(R("dist/web/index.html")).size, "bayt");

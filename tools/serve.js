// Yerel doğrulama sunucusu: dist/web'i Netlify gibi, _headers dosyasındaki başlıklarla (CSP vb.) sunar.
// Kullanım: node tools/serve.js [port]   (varsayılan 8768; .claude/launch.json "web-headers")
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "dist", "web"), port = +(process.argv[2] || 8768);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".css": "text/css" };
function rules() { // _headers → [{p: yol, h: [[ad, değer]]}]
  const out = []; let cur = null;
  for (const line of fs.readFileSync(path.join(root, "_headers"), "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) { cur = { p: line.trim(), h: [] }; out.push(cur); }
    else if (cur) { const i = line.indexOf(":"); cur.h.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]); }
  }
  return out;
}
const matches = (p, u) => p === "/*" || (p.endsWith("/*") ? u.startsWith(p.slice(0, -1)) : p === u);
http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const f = path.join(root, u.endsWith("/") ? u + "index.html" : u);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("yok"); }
  for (const r of rules()) if (matches(r.p, u)) for (const [k, v] of r.h) res.setHeader(k, v);
  res.setHeader("content-type", types[path.extname(f)] || "application/octet-stream");
  fs.createReadStream(f).pipe(res);
}).listen(port, "127.0.0.1", () => console.log("dist/web → http://localhost:" + port + " (_headers uygulanıyor)"));

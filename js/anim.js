// Hareket canlandırmaları (yalnız web / Android sürümü). Tek figür, yandan (yüzü sağa) ya da önden (v: "f"); bol üst, uzun eşofman.
// Her hareket birkaç duruş (k); aradaki kareleri kod çizer. SVG, çevrimdışı. Duruşlar güvenilir kaynaklarla karşılaştırıldı (2026-10-07);
// emin olunmayan hareket (bilek, pelvik taban, Y-T-W, kardiyo makinesi) çizilmez, isim + açıklama kalır.
// Duruş: h kalça · t gövde açısı (kalça→omuz, derece; -90 dik) · c sırt eğriliği (+ karın yönü) · n baş açısı (gövdeye göre) · s omuz düşüşü (kürek kemiği, px)
//   a1/a2 ayak bileği (1 yakın / ekranın solu, 2 uzak / sağ; yoksa 1'in aynısı) · o1/o2 ayak ucu (bilekten; yoksa kaval kemiğine dik) · k1/k2 diz yönü (0 düz)
//   w1/w2 el · e1/e2 dirsek yönü (0 düz) · j1/j2 dirseği, q1/q2 dizi sabitle · tl gövde boyu (önden bakışta öne eğilme kısalır)
// Hareket: k duruşlar (döngü; aynı duruş iki kez = bekleme) ya da f(ph) · T saniye · pp: duruşlar boyunca git-gel · lin: sabit hız · v · vb görüş kutusu · fl: 0 zeminsiz
//   lf/ab (önden): bacaklar gövdenin önünde / kollar arkada · p: [[katman 0/1/2, (J, ph) → svg]]
(function () {
  if (typeof document === "undefined") return;
  const R = Math.PI / 180, D = (a) => [Math.cos(a * R), Math.sin(a * R)];
  const add = (p, v, k) => [p[0] + v[0] * (k == null ? 1 : k), p[1] + v[1] * (k == null ? 1 : k)];
  const r1 = (x) => Math.round(x * 10) / 10, pt = (p) => r1(p[0]) + "," + r1(p[1]);
  const LN = (p, q, w, c) => '<line x1="' + r1(p[0]) + '" y1="' + r1(p[1]) + '" x2="' + r1(q[0]) + '" y2="' + r1(q[1]) + '" stroke-width="' + w + '" class="' + c + '"/>';
  const CI = (p, r, c) => '<circle cx="' + r1(p[0]) + '" cy="' + r1(p[1]) + '" r="' + r + '" class="' + c + '"/>';
  // İki parçalı uzuv: kökten hedefe. s bükülme yönü (±1); 0'a yaklaştıkça uzuv düzleşir (önden bakışta kısalmış görünür). j verilirse eklem orada.
  function limb(a, b, l1, l2, s, j) {
    if (j) return [j, b];
    const dx = b[0] - a[0], dy = b[1] - a[1], d0 = Math.hypot(dx, dy) || 1, u = [dx / d0, dy / d0], L = l1 + l2;
    const end = d0 > L ? add(a, u, L) : b, st = add(a, u, Math.min(d0, L) * l1 / L), m = Math.abs(s);
    if (m < 0.01) return [st, end];
    const d = Math.max(Math.abs(l1 - l2) + 1, Math.min(d0, L - 0.3));
    const al = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))) * Math.sign(s), base = Math.atan2(dy, dx);
    const jb = [a[0] + l1 * Math.cos(base + al), a[1] + l1 * Math.sin(base + al)];
    return [add(st, [jb[0] - st[0], jb[1] - st[1]], m), end];
  }
  const DEF = { t: -90, c: 0, n: 0, s: 0, tl: 52 };
  function norm(k, f) {
    const P = Object.assign({}, DEF, { k1: f ? 0 : -1, k2: f ? 0 : -1, e1: 1, e2: f ? -1 : 1 }, k); // önden diz düz (yana bükülmesin)
    P.a2 = P.a2 || P.a1; P.w2 = P.w2 || P.w1; if (P.o1 && !k.o2 && !k.a2) P.o2 = P.o1;
    if (P.j1 && !k.j2 && !k.w2) P.j2 = P.j1; if (P.q1 && !k.q2 && !k.a2) P.q2 = P.q1; // uzak kol/bacak yakınınkini izler
    return P;
  }
  const mix = (A, B, u) => {
    const o = {};
    for (const key in A) {
      const a = A[key], b = B[key];
      o[key] = a == null || b == null ? null : Array.isArray(a) ? [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u] : typeof a === "number" ? a + (b - a) * u : a;
    }
    return o;
  };
  function pose(an, ph) {
    if (an.f) return norm(an.f(ph), an.v === "f");
    const K = an.K, n = K.length;
    if (n === 1) return K[0];
    if (an.pp) { const pos = ((1 - Math.cos(2 * Math.PI * ph)) / 2) * (n - 1), i = Math.min(n - 2, Math.floor(pos)); return mix(K[i], K[i + 1], pos - i); }
    let i, u;
    if (an.W) { let x = ph * an.W[n]; i = 0; while (i < n - 1 && x >= an.W[i + 1]) i++; u = (x - an.W[i]) / (an.W[i + 1] - an.W[i]); } // dw: evre süresi ağırlığı (hızlı sıçrama, yavaş iniş)
    else { const s = ph * n; i = Math.floor(s) % n; u = s - Math.floor(s); }
    return mix(K[i], K[(i + 1) % n], an.lin ? u : u * u * (3 - 2 * u));
  }
  function body(an, ph) {
    const P = pose(an, ph), f = an.v === "f", dir = D(P.t), pr = D(P.t + 90), FAR = f ? [0, 0] : [-3, -1];
    const h = P.h, sh = add(h, dir, P.tl), hd = add(sh, D(P.t + P.n), f ? 18 : 20), J = { h, sh, hd, P };
    const leg = (i) => {
      const n = i + 1, root = f ? add(h, pr, i ? 9 : -9) : i ? add(h, FAR) : h, tg = !f && i ? add(P["a" + n], FAR) : P["a" + n];
      const [kn, ak] = limb(root, tg, 42, 42, P["k" + n], P["q" + n]);
      let o = P["o" + n];
      if (!o) { if (f) o = [i ? 3 : -3, 6]; else { const fi = Math.atan2(ak[1] - kn[1], ak[0] - kn[0]) / R; o = add([0, 0], D(fi - 90), 13); o = add(o, D(fi), 4); } }
      J["k" + n] = kn; J["a" + n] = ak;
      const c = !f && i ? "b2" : "b";
      return LN(root, kn, 20, c) + LN(kn, ak, 16, c) + LN(ak, add(ak, o), 9, "sh");
    };
    const arm = (i) => {
      const n = i + 1, root = add(f ? add(sh, pr, i ? 15 : -15) : i ? add(sh, FAR) : sh, dir, -P.s), tg = !f && i ? add(P["w" + n], FAR) : P["w" + n];
      const [el, hn] = limb(root, tg, 30, 28, P["e" + n], P["j" + n]);
      J["e" + n] = el; J["w" + n] = hn;
      const c = !f && i ? "t2" : "t", ol = c === "t" ? LN(root, el, 15, "t2") + LN(el, hn, 13, "t2") : ""; // gövdenin önündeki kol ince kenarla ayrılır
      return ol + LN(root, el, 12, c) + LN(el, hn, 10, c) + CI(hn, 5, "sk");
    };
    const z = [[], [], []];
    (an.p || []).forEach(([l, fn]) => z[l].push(fn));
    const pz = (l) => z[l].map((fn) => fn(J, ph)).join("");
    let torso;
    if (f) torso = '<polygon points="' + [add(h, pr, -11), add(h, pr, 11), add(sh, pr, 16), add(sh, pr, -16)].map(pt).join(" ") + '" class="tp"/>';
    else { const c = add([(h[0] + sh[0]) / 2, (h[1] + sh[1]) / 2], pr, 2 * P.c); torso = '<path d="M' + pt(h) + "Q" + pt(c) + " " + pt(sh) + '" stroke-width="30" class="t"/>'; }
    const vb = an.vb, fl = an.fl === 0 ? "" : '<line x1="' + vb[0] + '" y1="178.5" x2="' + (vb[0] + vb[2]) + '" y2="178.5" stroke-width="1.5" class="fl"/>';
    // yandan: uzak bacak ve kol arkada, sonra gövde, yakın bacak, baş, yakın kol. Önden: bacaklar, gövde, baş, kollar
    let s;
    const L1 = leg(0), L2 = leg(1), A1 = arm(0), A2 = arm(1); // önce bütün eklemler (eşyalar J'yi kullanır), sonra sıra
    if (f) { const T = torso + CI(hd, 11, "sk"), L = L1 + L2, AR = A1 + A2; s = (an.ab ? AR : "") + pz(0) + (an.lf ? pz(1) + T + L : L + pz(1) + T) + (an.ab ? "" : AR); } // önden: lf bacaklar gövdenin önünde (oturuş), ab kollar arkada
    else s = pz(0) + L2 + A2 + pz(1) + torso + L1 + (an.ho ? A1 + CI(hd, 11, "sk") : CI(hd, 11, "sk") + A1); // ho: baş kolun önünde (yüzüstü, kollar ileride)
    return fl + s + pz(2);
  }

  // ---------- hareketler ----------
  const F = [13, 4], BALL = [11, 7]; // ayak düz yerde / parmak ucunda
  const line = (x1, y1, x2, y2, w) => () => LN([x1, y1], [x2, y2], w || 3, "pr");
  const wall = (x) => [0, line(x, -40, x, 178.5, 3)];
  const legArc = (h, angs, L) => angs.map((a) => add(h, D(a), L || 82));
  // Eşyalar (yandan): bar plakası halka (içi görünür), dambıl küçük halka, kettlebell, sehpa, kutu, bant
  const RING = (p, r, w) => '<circle cx="' + r1(p[0]) + '" cy="' + r1(p[1]) + '" r="' + r + '" stroke-width="' + w + '" class="pr" fill="none"/>';
  const PLATE = (fn) => [2, (J) => { const q = fn(J); return RING(q, 20, 5) + CI(q, 3, "pf"); }];
  const DBL = (fn) => [2, (J) => RING(fn(J), 7, 4)];
  const KBL = (fn) => [2, (J) => { const q = fn(J); return RING(q, 5, 3) + CI(add(q, [0, 13]), 10, "pf"); }];
  const BENCH = (x1, x2, y) => [0, () => LN([x1, y], [x2, y], 8, "pr") + LN([x1 + 7, y], [x1 + 7, 178], 3, "pr") + LN([x2 - 7, y], [x2 - 7, 178], 3, "pr")];
  const BOX = (x1, x2, y) => [0, () => '<rect x="' + x1 + '" y="' + y + '" width="' + (x2 - x1) + '" height="' + (178.5 - y) + '" rx="2" stroke-width="3" class="pr" fill="none"/>'];
  const BAND = (f1, f2) => [2, (J) => LN(f1(J), f2(J), 2.5, "pr")];
  const shp = (h, t, a, f) => add(add(h, D(t), 52 + a), D(t + 90), f); // omza göre nokta: a gövde boyunca (− kalçaya doğru), f öne
  const arc = (c, L, angs) => angs.map((g) => add(c, D(g), L));
  const pl = (ank, t) => add(ank, D(t), 83);
  const BAG = (x) => [0, () => LN([x + 14, -40], [x + 14, 6], 2, "pr") + '<rect x="' + x + '" y="6" width="28" height="104" rx="12" class="pf"/>']; // asılı torba (ön yüzü x) // düz vücut (plank, şınav): kalça ayak bileğinden gövde açısıyla
  const A = {
    // Vücut ağırlığı squat (ACE): kalça önce geri, göğüs dik, topuklar yerde; uyluk yere paralel. Kollar dengeyle öne.
    airsquat: { T: 3, k: [{ h: [99, 87], t: -88, a1: [100, 170], o1: F, w1: [104, 93] }, { h: [78, 134], t: -50, a1: [100, 170], o1: F, w1: [168, 97] }] },
    // Göğüste ağırlıkla squat: dambıl dik, göğüs hizasında; dirsekler aşağıda; gövde squat'a göre daha dik
    goblet: { T: 3.2, k: [{ h: [99, 87], t: -89, a1: [100, 170], o1: F, j1: [108, 64], w1: [116, 49] }, { h: [82, 134], t: -62, a1: [100, 170], o1: F, j1: [98, 116], w1: [114, 108] }],
      p: [[2, (J) => LN(add(J.w1, [2, 0]), add(J.w1, [2, 18]), 9, "pr") + CI(J.w1, 5, "sk")]] },
    // Kalça köprüsü: sırtüstü, dizler bükük, kollar yanda; tepede omuz-kalça-diz düz çizgi (fazla yükselmez), 2 sn sıkma
    gbridge: { T: 4.2, vb: [0, 96, 200, 90], k: [{ h: [100, 164], t: 180, n: 8, a1: [142, 170], o1: [12, 4], w1: [110, 174], e1: 0 }, { h: [96, 143], t: 156, n: 32, a1: [142, 170], o1: [12, 4], w1: [110, 174], e1: 0 }, "=1"] },
    // Pogo: kollar serbest, dizler hafif bükük ve sabit, topuk yere değmez; ayak bileğinden seri sıçrama
    pogo: { T: 0.6, k: [{ h: [100, 87], a1: [100, 167], o1: BALL, w1: [104, 92] }, { h: [100, 80], a1: [100, 160], o1: [10, 8], w1: [104, 85] }] },
    // Açma kapama: ayaklar açılırken kollar yanlardan yay çizip baş üstünde birleşir
    jj: { T: 1.3, v: "f", pp: 1, vb: [0, -32, 200, 216], k: [{ h: [100, 86.5], a1: [93, 170], a2: [107, 170], w1: [84, 92], w2: [116, 92] },
      { h: [100, 80], a1: [83, 166], a2: [117, 166], w1: [27, 30], w2: [173, 30], e1: 0, e2: 0 }, { h: [100, 84], a1: [72, 168], a2: [128, 168], w1: [97, -26], w2: [103, -26], e1: -1, e2: 1 }] },
    // Yerinde tempolu yürüyüş: diz kalça hizasına, karşı kol öne
    march: { T: 1.4, k: [{ h: [100, 87], a1: [138, 128], a2: [100, 170], w1: [86, 86], w2: [120, 74] }, { h: [100, 87], a1: [100, 170], a2: [138, 128], w1: [120, 74], w2: [86, 86] }] },
    // Yürüyüş (yerinde, koşu bandı gibi): basan ayak geriye kayar, salınan ayak öne gelir; karşı kol öne
    z2: { T: 1.1, lin: 1, k: [
      { h: [100, 92], t: -88, a1: [127, 170], a2: [75, 167], w1: [84, 90], w2: [119, 88] }, { h: [100, 87.5], t: -88, a1: [101, 170], a2: [106, 152], w1: [102, 93], w2: [102, 93] },
      { h: [100, 92], t: -88, a1: [75, 167], a2: [127, 170], w1: [119, 88], w2: [84, 90] }, { h: [100, 87.5], t: -88, a1: [106, 152], a2: [101, 170], w1: [102, 93], w2: [102, 93] }] },
    // Açılma koşusu: hafif öne eğik, dizler öne, kollar 90° bükük ve karşı bacakla
    stride: { T: 0.7, lin: 1, k: [
      { h: [100, 88], t: -80, a1: [110, 170], a2: [72, 128], w1: [113, 85], w2: [113, 85] }, { h: [100, 82], t: -80, a1: [74, 160], a2: [130, 124], w1: [131, 61], w2: [89, 75] },
      { h: [100, 88], t: -80, a1: [72, 128], a2: [110, 170], w1: [113, 85], w2: [113, 85] }, { h: [100, 82], t: -80, a1: [130, 124], a2: [74, 160], w1: [89, 75], w2: [131, 61] }] },
    // A-skip: diz 90° kalça hizasına, karşı kol öne; destek ayağı parmak ucunda seker
    askip: { T: 1.2, k: [
      { h: [100, 84], a1: [138, 124], a2: [100, 166], o2: BALL, w1: [86, 80], w2: [124, 46] }, { h: [100, 90], a1: [104, 170], a2: [98, 170], w1: [100, 94], w2: [100, 94] },
      { h: [100, 84], a1: [100, 166], o1: BALL, a2: [138, 124], w1: [124, 46], w2: [86, 80] }, "=1"] },
    // Duvar sprint drili: eller omuz hizasında duvarda, kollar kilitli, vücut 45° düz çizgi; diz gövdeye 90°, ayak ucu yukarı
    wall_drill: { T: 4, p: [wall(187)], k: [
      { h: [88.7, 106.3], t: -45, a1: [30, 165], o1: [7, 9], k1: 0, k2: 0, w1: [182, 70], e1: 0 }, { h: [88.7, 106.3], t: -45, a1: [92, 156], o1: [10, -4], a2: [30, 165], o2: [7, 9], k2: 0, w1: [182, 70], e1: 0 }, "=1",
      "=0", { h: [88.7, 106.3], t: -45, a1: [30, 165], o1: [7, 9], k1: 0, a2: [92, 156], o2: [10, -4], w1: [182, 70], e1: 0 }, "=4"] },
    // Bacak sallama: gövde dik, bacak düz, hareket kalçadan; destek bacağı sabit (el duvarda; yandan görünmez)
    bacaksal: { T: 1.8, pp: 1, k: legArc([100, 87], [30, 45, 60, 75, 90, 105, 115]).map((a) => ({ h: [100, 87], a1: a, k1: 0, a2: [100, 170], w1: [103, 92] })) },
    // Dünyanın en iyi esnemesi: hamle, dirsek ön ayağın içine, kol tavana, sonra arka diz yerde ön bacak düz (arka bacak esnemesi)
    wgs: { T: 13, vb: [0, 40, 200, 146], k: [
      { h: [96, 124], t: -5, n: 30, a1: [138, 170], a2: [36, 168], o2: [9, 7], w1: [150, 176], w2: [146, 176] },
      { h: [96, 124], t: 8, n: 20, a1: [138, 170], a2: [36, 168], o2: [9, 7], w1: [164, 174], w2: [146, 176] },
      { h: [96, 124], t: 0, n: 0, a1: [138, 170], a2: [36, 168], o2: [9, 7], w1: [156, 117], e1: 0, w2: [146, 176] },
      { h: [96, 124], t: -8, n: -30, a1: [138, 170], a2: [36, 168], o2: [9, 7], w1: [150, 58], e1: 0, w2: [146, 176] }, "=2", "=0",
      { h: [62, 132], t: -15, n: 15, a1: [138, 170], k1: 0, a2: [42, 172], o2: [-11, 3], w1: [118, 176], w2: [114, 176] }] },
    // Kedi-inek: bilekler omuz, dizler kalça altında; kedi sırt yuvarlak çene içe, inek göbek aşağı bakış ileri
    kedi: { T: 5, vb: [0, 88, 200, 98], k: [{ h: [88, 124], t: 0, c: -14, n: 50, a1: [46, 168], o1: [-11, 3], w1: [142, 176], e1: 0, e2: 0 }, { h: [88, 124], t: 0, c: 9, n: -22, a1: [46, 168], o1: [-11, 3], w1: [142, 176], e1: 0, e2: 0 }] },
    // Dört ayakta çapraz uzanma: karşı kol ve bacak yere paralel, 2-3 sn tut, gövde dönmez
    birddog: { T: 10.8, vb: [-12, 88, 214, 98], k: [
      { h: [80, 124], t: 0, n: 15, a1: [38, 168], o1: [-11, 3], w1: [134, 176], e1: 0, e2: 0 },
      { h: [80, 124], t: 0, n: 15, a1: [38, 168], o1: [-11, 3], a2: [-2, 122], k2: 0, w1: [188, 122], e1: 0, w2: [134, 176], e2: 0 }, "=1", "=0",
      { h: [80, 124], t: 0, n: 15, a1: [-2, 122], k1: 0, a2: [38, 168], o2: [-11, 3], w1: [134, 176], e1: 0, w2: [188, 122], e2: 0 }, "=4"] },
    // Gölge boks (sol ayak önde): gard yanaklarda, dirsekler içeride, çene içe; jab ön koldan, kroşe değil düz arka kol (cross)
    golge: { T: 2.4, k: [
      { h: [104, 90], t: -84, n: 12, a1: [126, 170], o1: F, a2: [82, 168], o2: BALL, w1: [129, 34], w2: [123, 32] },
      { h: [104, 90], t: -83, n: 12, a1: [126, 170], o1: F, a2: [82, 168], o2: BALL, w1: [166, 36], w2: [123, 32] }, "=0",
      { h: [107, 90], t: -78, n: 10, a1: [126, 170], o1: F, a2: [82, 168], o2: [12, 6], w1: [136, 35], w2: [174, 40] }] },
    // Omuz çevirme: geniş tutuş, kollar bükülmeden önden baş üstüne, oradan arkaya ve aynı yoldan geri
    dislo: { T: 4.4, pp: 1, vb: [0, -32, 200, 218], k: [60, 30, 0, -30, -60, -90, -120, -150, -180, -210, -240].map((a) => ({ h: [100, 87], a1: [100, 170], w1: add([100, 35], D(a), 57), e1: 0 })) },
    // Bandı göğüste açma: kollar omuz hizasında öne düz, bant göğse değene kadar yana açılır, 1 sn tut
    pullap: { T: 3, v: "f", p: [[2, (J) => LN(J.w1, J.w2, 3, "pr")]], k: [
      { h: [100, 86.5], a1: [93, 170], a2: [107, 170], w1: [93, 40], w2: [107, 40], e1: 0, e2: 0 }, { h: [100, 86.5], a1: [93, 170], a2: [107, 170], w1: [28, 38], w2: [172, 38], e1: 0, e2: 0 }, "=1"] },
    // Kürek kemiği barfiksi: kollar düz kalır, omuzlar kulaklardan uzaklaşır, vücut yalnız birkaç cm yükselir
    scap: { T: 3, vb: [0, -32, 200, 218], p: [[0, () => LN([60, -18], [140, -18], 6, "pr")]], k: [
      { h: [100, 92], a1: [80, 160], w1: [100, -18], e1: 0 }, { h: [100, 87], s: 5, a1: [80, 155], w1: [100, -18], e1: 0 }, "=1"] },
    // Duvar kaydırma: duvara dönük, ön kollar duvarda dirsekler omuz hizasında; yukarı kaydır, tepede elleri hafif ayır
    wallslide: { T: 4.5, vb: [0, -32, 200, 218], p: [wall(141)], k: [
      { h: [102, 87], t: -87, a1: [100, 170], w1: [136, 11] }, { h: [103, 87], t: -82, a1: [100, 170], w1: [136, -17] }, { h: [103, 87], t: -82, a1: [100, 170], w1: [130, -19] }] },
    // Bant dış rotasyon (önden): dirsek gövdede 90°, ön kol dışa döner; bant karşı taraftan bel hizasında
    dr: { T: 2.4, v: "f", pp: 1, p: [[2, (J) => LN(J.w1, [192, 64], 2.5, "pr") + CI([192, 64], 3, "pf")]], k: [
      { h: [100, 86.5], a1: [93, 170], a2: [107, 170], j1: [84, 66], w1: [97, 62], w2: [116, 92] }, { h: [100, 86.5], a1: [93, 170], a2: [107, 170], j1: [84, 66], w1: [58, 64], w2: [116, 92] }] },
    // Ayak ucu kaldırma: sırt duvarda, topuklar duvardan ~30 cm önde, bacaklar düz; topuk yerde, ayak ucu yukarı
    tib: { T: 1.8, p: [wall(60)], k: [{ h: [81.8, 86.6], t: -97, a1: [92, 170], o1: F, k1: 0, w1: [84, 92] }, { h: [81.8, 86.6], t: -97, a1: [92, 170], o1: [10, -7], k1: 0, w1: [84, 92] }] },
    // Tek ayak denge: destek dizi hafif bükük, öbür ayak yerden kalkık; hafif salınım
    balance: { T: 3.6, k: [{ h: [100, 89], a1: [118, 146], a2: [100, 170], w1: [106, 92] }, { h: [101.5, 89.5], t: -89, a1: [119, 145], a2: [100, 170], w1: [107, 92] }] },
    // İp atlama: dirsekler gövdeye yakın, eller kalça hizasında biraz önde, ipi bileklerle çevir; parmak ucunda 2-4 cm sıçra, ip ayak altından geçerken havada
    ip: { T: 0.5, f: (ph) => { const l = ph > 0.3 && ph < 0.7 ? 4 * Math.sin(Math.PI * (ph - 0.3) / 0.4) : 0; return { h: [100, 88 - l], a1: [100, 167 - l], o1: BALL, w1: [114, 86 - l] }; },
      p: [[0, (J, ph) => rope(J, ph, false)], [2, (J, ph) => rope(J, ph, true)]] },
    // ---------- esneklik ----------
    // Duvar dibi kalça önü (couch): arka diz duvar-zemin köşesinde, kaval duvarda, ayak ucu uzun; ön kaval dik; kalça sıkılı, gövde dikleşir
    couch: { T: 6, vb: [0, 20, 200, 166], p: [wall(27)], k: [
      { h: [44, 129], t: -72, n: 10, a1: [86, 171], q2: [36, 170], a2: [36, 128], o2: [0, -12], w1: [92, 122] },
      { h: [47, 129], t: -90, a1: [86, 171], q2: [36, 170], a2: [36, 128], o2: [0, -12], w1: [86, 122] }, "=1"] },
    // Güvercin: ön kaval önde çapraz (yandan kısa görünür), arka bacak geride düz, kalçalar yere dönük; önce eller yerde, sonra ön kollara inilir
    pigeon: { T: 8, vb: [0, 60, 200, 126], k: [
      { h: [96, 160], t: -55, n: 10, q1: [134, 170], a1: [114, 172], o1: [-8, 3], a2: [13, 172], k2: 0, o2: [-12, 3], w1: [134, 176], e1: 0 },
      { h: [96, 160], t: -12, n: 25, q1: [134, 170], a1: [114, 172], o1: [-8, 3], a2: [13, 172], k2: 0, o2: [-12, 3], j1: [152, 174], w1: [178, 176], j2: [148, 174], w2: [174, 176] }, "=1"] },
    // Derin çömelme: topuklar yerde, kalça diz altında, göğüs dik; dirsekler dizlerin içinde, eller göğüs önünde
    deepsq: { T: 4, k: [
      { h: [84, 150], t: -72, a1: [100, 170], o1: F, j1: [119, 130], w1: [117, 108] }, { h: [85, 147], t: -75, a1: [100, 170], o1: F, j1: [119, 128], w1: [117, 105] }] },
    // Ayakta öne eğilme: ayaklar bitişik, dizler düz; kalçadan katlanıp gövde bacaklara iner
    pikefold: { T: 6, k: [
      { h: [100, 87], a1: [100, 170], o1: F, k1: 0, w1: [103, 93] }, { h: [84, 87], t: 58, n: 15, a1: [100, 170], o1: F, k1: 0, w1: [120, 175] }, "=1"] },
    // Kelebek (önden): ayak tabanları birleşik, dizler yanlara düşer; sırt düz öne eğilme
    butterfly: { T: 6, v: "f", lf: 1, vb: [0, 70, 200, 116], k: [
      { h: [100, 162], q1: [62, 142], q2: [138, 142], a1: [95, 168], a2: [105, 168], o1: [4, 5], o2: [-4, 5], w1: [94, 164], w2: [106, 164] },
      { h: [100, 162], tl: 40, q1: [58, 156], q2: [142, 156], a1: [95, 168], a2: [105, 168], o1: [4, 5], o2: [-4, 5], w1: [94, 164], w2: [106, 164] }, "=1"] },
    // 90/90 geçişi (önden): oturur, eller arkada yerde; iki diz birlikte bir yana sonra öbür yana yatar (silecek gibi)
    f9090: { T: 6, v: "f", pp: 1, lf: 1, ab: 1, vb: [0, 70, 200, 116], k: [
      { h: [100, 160], q1: [52, 162], q2: [86, 152], a1: [64, 172], a2: [136, 172], w1: [74, 168], w2: [126, 168] },
      { h: [100, 160], q1: [76, 128], q2: [124, 128], a1: [64, 172], a2: [136, 172], w1: [74, 168], w2: [126, 168] },
      { h: [100, 160], q1: [114, 152], q2: [148, 162], a1: [64, 172], a2: [136, 172], w1: [74, 168], w2: [126, 168] }] },
    // Kapıda göğüs esnemesi: ön kol kapı kasasında, dirsek omuz hizasında 90°; öne adım atılır (öne eğilmeden), göğüs açılır
    doorpec: { T: 6, p: [[0, line(90, -40, 90, 178.5, 5)]], k: [
      { h: [96, 87], a1: [100, 170], a2: [96, 170], j1: [93, 36], w1: [93, 9], w2: [99, 93] },
      { h: [112, 87], a1: [126, 170], a2: [100, 170], j1: [93, 36], w1: [93, 9], w2: [115, 93] }, "=1"] },
    // Çocuk pozu: topuklara oturulur, kollar önde uzanır, alın yerde; nefesle eller biraz daha ileri
    childlat: { T: 5, vb: [0, 96, 200, 90], k: [
      { h: [74, 154], t: -2, n: 40, a1: [70, 172], o1: [-11, 3], w1: [178, 174], e1: 0 }, { h: [72, 155], t: 0, n: 40, a1: [70, 172], o1: [-11, 3], w1: [184, 174], e1: 0 }] },
    // İğne geçirme: dört ayak; bir kol öbürünün altından geçer, omuz ve baş yere iner; sonra kol tavana açılır
    thread: { T: 10, vb: [0, 40, 200, 146], k: [
      { h: [80, 124], t: 0, n: 15, a1: [38, 168], o1: [-11, 3], w1: [134, 176], e1: 0, e2: 0 },
      { h: [80, 126], t: 22, n: 30, a1: [38, 168], o1: [-11, 3], w1: [120, 174], e1: 0, w2: [134, 176], e2: 1 }, "=1", "=0",
      { h: [80, 124], t: -6, n: -35, a1: [38, 168], o1: [-11, 3], w1: [131, 61], e1: 0, w2: [134, 176], e2: 0 }, "=4"] },
    // Kertenkele: ön ayak ellerin dışında, ön kaval dik, arka diz yerde; eller yerde, sonra ön kollara inilir
    lizard: { T: 7, vb: [0, 60, 200, 126], k: [
      { h: [96, 132], t: -15, n: 25, a1: [138, 170], a2: [40, 168], o2: [-11, 3], w1: [150, 176], e1: 0, e2: 0 },
      { h: [94, 138], t: 6, n: 25, a1: [138, 170], a2: [40, 168], o2: [-11, 3], j1: [146, 172], w1: [172, 175], j2: [142, 172], w2: [168, 175] }, "=1"] },
    // Yarım spagat: arka diz yerde; kalça geriye kayar, ön bacak düzleşir (ayak ucu yukarı), sırt düz öne eğilir
    halfsplit: { T: 7, vb: [0, 60, 200, 126], k: [
      { h: [92, 132], t: -10, n: 25, a1: [138, 170], a2: [50, 172], o2: [-11, 3], w1: [148, 176], e1: 1, e2: 1 },
      { h: [62, 132], t: -15, n: 15, a1: [138, 170], k1: 0, a2: [42, 172], o2: [-11, 3], w1: [118, 176], w2: [114, 176] }, "=1"] },
    // Ön spagat basamağı: yarım spagattan ön ayak öne kayar, kalça iner, arka bacak düzleşir; eller bloklarda
    frontsplit: { T: 8, vb: [0, 60, 200, 126], p: [[1, (J) => LN([J.P.w1[0] + 2, J.P.w1[1] + 8], [J.P.w1[0] + 2, 175], 12, "pr")]], k: [
      { h: [62, 132], t: -60, n: 10, a1: [138, 170], k1: 0, a2: [42, 172], o2: [-11, 3], w1: [74, 150], e1: 0, e2: 0 },
      { h: [96, 146], t: -78, n: 5, a1: [172, 172], k1: 0, a2: [20, 172], k2: 0, o2: [-12, 3], w1: [104, 150], e1: 0, e2: 0 }, "=1"] },
    // Kazak squat (önden): geniş duruş; bir bacağa çökülür (topuk yerde), düz bacağın ayak ucu yukarı; göğüs dik
    cossack: { T: 6, v: "f", pp: 1, k: [
      { h: [72, 140], tl: 48, q1: [56, 142], a1: [52, 170], a2: [148, 170], o2: [2, -8], w1: [95, 116], w2: [101, 116] },
      { h: [100, 96], a1: [52, 170], a2: [148, 170], w1: [97, 104], w2: [103, 104] },
      { h: [128, 140], tl: 48, q2: [144, 142], a1: [52, 170], o1: [-2, -8], a2: [148, 170], w1: [99, 116], w2: [105, 116] }] },
    // Bacaklar açık öne eğilme (önden): geniş oturuş, bacaklar düz, ayak uçları yukarı; sırt düz kalçadan öne
    pancake: { T: 7, v: "f", lf: 1, vb: [0, 70, 200, 116], k: [
      { h: [100, 164], a1: [24, 170], a2: [176, 170], o1: [0, -8], o2: [0, -8], w1: [80, 172], w2: [120, 172] },
      { h: [100, 164], tl: 24, n: 0, a1: [24, 170], a2: [176, 170], o1: [0, -8], o2: [0, -8], w1: [72, 174], w2: [128, 174] }, "=1"] },
    // Pasif asılma: kollar düz, omuzlar serbest; rahat nefes
    passivehang: { T: 4, fl: 0, vb: [0, -32, 200, 218], p: [[0, () => LN([60, -18], [140, -18], 6, "pr")]], k: [
      { h: [100, 92], a1: [100, 176], k1: 0, w1: [100, -18], e1: 0 }, { h: [100, 93.5], a1: [99, 177], k1: 0, w1: [100, -18], e1: 0 }] },
    // ---------- core ----------
    // McGill mekiği: sırtüstü, bir diz bükük öbür bacak düz, eller belin altında (bel tabana bastırılmaz); baş ve omuzlar azıcık kalkar, kısa tutulur
    mcgill: { T: 4.5, vb: [0, 96, 200, 90], k: [
      { h: [100, 164], t: 180, n: 8, a1: [134, 170], o1: [12, 4], a2: [184, 170], k2: 0, j1: [64, 168], w1: [80, 170] },
      { h: [100, 164], t: 172, n: 4, a1: [134, 170], o1: [12, 4], a2: [184, 170], k2: 0, j1: [64, 168], w1: [80, 170] }, "=1"] },
    // Süperman: yüzüstü, kollar önde; kol ve bacaklar düz, ~15 cm kalkar, baş nötr (yere bakar); 2-3 sn tut
    superman: { T: 4.5, ho: 1, vb: [-10, 96, 220, 90], k: [
      { h: [90, 166], t: 0, n: 6, a1: [7, 170], k1: 0, o1: [-12, 3], w1: [200, 170], e1: 0 },
      { h: [90, 166], t: -6, n: 4, a1: [9, 152], k1: 0, o1: [-12, 2], w1: [198, 152], e1: 0 }, "=1"] },
    // Kayık tutuşu: sırtüstü, bel yerde; kürek kemikleri kalkık, çene içe, kollar baş üstünde, bacaklar düz ve alçakta
    hollow: { T: 4, vb: [0, 96, 200, 90], k: [
      { h: [118, 166], t: 165, n: -10, a1: [194, 131], k1: 0, w1: [11, 163], e1: 0 }, { h: [118, 166], t: 164, n: -10, a1: [194, 133], k1: 0, w1: [11, 162], e1: 0 }] },
    // Plank: ön kollar yerde, dirsek omuz altında; baştan topuğa düz çizgi, ayak parmakları yerde
    plank: { T: 4, vb: [0, 80, 200, 106], k: [
      { h: [111.8, 151], t: -9.7, n: 8, a1: [30, 165], o1: [7, 9], k1: 0, j1: [163, 172], w1: [188, 174] },
      { h: [111.8, 152], t: -9.2, n: 8, a1: [30, 165], o1: [7, 9], k1: 0, j1: [163, 172], w1: [188, 174] }] },
    // Yan plank (önden): dirsek omuz altında, ayaklar üst üste, kalça yukarıda; baştan ayağa düz çizgi, üst el belde
    sideplank: { T: 4, v: "f", vb: [0, 40, 200, 146], k: [
      { h: [95, 146], t: -11, a1: [12, 153], a2: [16, 170], o1: [-2, 6], o2: [-2, 6], j1: [118, 103], w1: [92, 134], j2: [149, 172], w2: [157, 174] },
      { h: [95, 140], t: -14, a1: [12, 151], a2: [17, 169], o1: [-2, 6], o2: [-2, 6], j1: [118, 100], w1: [92, 128], j2: [149, 172], w2: [157, 174] }, "=1"] },
    // Sırtüstü çapraz uzanma: kollar tavana, dizler kalça üstünde 90°; karşı kol ve bacak yere doğru uzanır, bel yerde kalır
    deadbug: { T: 6, vb: [-6, 80, 216, 106], k: [
      { h: [116, 164], t: 180, n: 8, a1: [158, 122], w1: [64, 107], e1: 0 },
      { h: [116, 164], t: 180, n: 8, a1: [158, 122], a2: [198, 147], k2: 0, w1: [8, 154], e1: 0, w2: [64, 107], e2: 0 }, "=0",
      { h: [116, 164], t: 180, n: 8, a1: [198, 147], k1: 0, a2: [158, 122], w1: [64, 107], e1: 0, w2: [8, 154], e2: 0 }] },
    // Asılı diz kaldırma: kollar düz asılı, sallanmadan dizler göğse; kontrollü iniş
    hkr: { T: 3.2, fl: 0, vb: [0, -32, 200, 218], p: [[0, () => LN([60, -18], [140, -18], 6, "pr")]], k: [
      { h: [100, 92], a1: [100, 176], k1: 0, w1: [100, -18], e1: 0 }, { h: [100, 92], t: -93, a1: [129, 113], w1: [100, -18], e1: 0 }] },
    // Duvarda plank: eller omuz hizasında duvarda, kollar düz; baştan topuğa düz çizgi
    wallplank: { T: 4, p: [wall(179)], k: [
      { h: [87.6, 100], t: -55, a1: [40, 168], o1: [7, 9], k1: 0, w1: [172, 58], e1: 0 }, { h: [87.6, 101], t: -54.5, a1: [40, 168], o1: [7, 9], k1: 0, w1: [172, 58], e1: 0 }] },
    // Pallof itişi (önden): bant yandan göğüs hizasında; eller göğüsten düz ileri itilir, gövde dönmez, 2 sn tutulur
    pallof: { T: 4, v: "f", p: [[2, (J) => LN(J.w2, [196, 60], 2.5, "pr") + CI([196, 60], 3, "pf")]], k: [
      { h: [100, 86.5], a1: [90, 170], a2: [110, 170], j1: [84, 70], w1: [97, 60], j2: [116, 70], w2: [103, 60] },
      { h: [100, 86.5], a1: [90, 170], a2: [110, 170], j1: [91, 47], w1: [97, 55], j2: [109, 47], w2: [103, 55] }, "=1"] },
    // ---------- alt vücut ----------
    // Baldır kaldırma: parmak ucuna tam yüksel, 1 sn tut, 2-3 sn'de in; tek ayakta öbür ayak geride, el duvarda
    calf: { T: 3.2, p: [wall(150)], k: [
      { h: [100, 87], a1: [100, 170], o1: F, a2: [80, 150], w1: [147, 62], e1: 1 }, { h: [101, 79], a1: [102, 162], o1: [10, 8], a2: [81, 142], w1: [147, 58], e1: 1 }, "=1"] },
    calf2: { T: 3.2, p: [wall(150)], k: [
      { h: [100, 87], a1: [100, 170], o1: F, w1: [147, 62], e1: 1 }, { h: [101, 79], a1: [102, 162], o1: [10, 8], w1: [147, 58], e1: 1 }, "=1"] },
    wcalf: { T: 3.2, p: [wall(150), DBL((J) => J.w1)], k: [
      { h: [100, 87], a1: [100, 170], o1: F, a2: [80, 150], w2: [150, 62], w1: [102, 93] }, { h: [101, 79], a1: [102, 162], o1: [10, 8], a2: [81, 142], w2: [150, 58], w1: [103, 85] }, "=1"] },
    // Sandalye squat: kalça geri, sandalyeye hafifçe dokun, ayak ortasından kalk
    chairsquat: { T: 3.4, p: [[0, () => LN([56, 133], [86, 133], 7, "pr") + LN([58, 133], [58, 78], 5, "pr") + LN([60, 133], [60, 178], 3, "pr") + LN([84, 133], [84, 178], 3, "pr")]], k: [
      { h: [99, 87], t: -88, a1: [100, 170], o1: F, w1: [104, 93] }, { h: [80, 118], t: -55, a1: [100, 170], o1: F, w1: [160, 92] }] },
    // Duvar oturuşu: sırt duvarda, uyluk yere paralel, diz 90°
    wallsit: { T: 4, p: [wall(71)], k: [
      { h: [87, 128], t: -90, a1: [129, 170], o1: F, w1: [112, 126] }, { h: [87, 128.5], t: -90, a1: [129, 170], o1: F, w1: [112, 127] }] },
    // Sırtta barla squat: bar omzun arka üstünde, ayak ortası üstünde iner-kalkar; uyluk paralelin altına
    backsquat: { T: 3.6, p: [PLATE((J) => J.w1)], k: [
      { h: [102, 87], t: -88, a1: [100, 170], o1: F, j1: shp([102, 87], -88, -24, -14), w1: shp([102, 87], -88, 0, -9) },
      { h: [80, 138], t: -48, a1: [100, 170], o1: F, j1: shp([80, 138], -48, -24, -14), w1: shp([80, 138], -48, 0, -9) }] },
    // Önde barla squat: bar ön omuzlarda, dirsekler yukarıda, gövde dik
    frontsquat: { T: 3.6, p: [PLATE((J) => J.w1)], k: [
      { h: [100, 87], t: -90, a1: [100, 170], o1: F, j1: shp([100, 87], -90, -4, 28), w1: shp([100, 87], -90, 2, 12) },
      { h: [86, 142], t: -72, a1: [100, 170], o1: F, j1: shp([86, 142], -72, -4, 28), w1: shp([86, 142], -72, 2, 12) }] },
    // Zercher squat: bar dirsek iç kıvrımında, eller kenetli, gövde dik
    zercher: { T: 3.6, p: [PLATE((J) => add(J.e1, [3, -5]))], k: [
      { h: [100, 87], t: -90, a1: [100, 170], o1: F, j1: shp([100, 87], -90, -30, 16), w1: shp([100, 87], -90, -8, 22) },
      { h: [86, 140], t: -68, a1: [100, 170], o1: F, j1: shp([86, 140], -68, -30, 16), w1: shp([86, 140], -68, -8, 22) }] },
    // Bacak itme makinesi: sırt pedde, ayaklar platformda; dizler göğse yaklaşana kadar in, kilitlemeden it
    legpress: { T: 3.4, vb: [0, 20, 200, 166], p: [[0, () => LN([14, 130], [44, 166], 7, "pr") + LN([44, 166], [86, 166], 7, "pr") + LN([60, 166], [60, 178], 4, "pr")],
      [2, (J) => { const c = add(J.a1, D(-40), 7); return LN(add(c, D(50), -24), add(c, D(50), 24), 6, "pr"); }]], k: [
      { h: [70, 148], t: -132, n: 30, a1: [104, 115], w1: [78, 152] }, { h: [70, 148], t: -132, n: 30, a1: [131, 96], w1: [78, 152] }] },
    calfpress: { T: 2.8, vb: [0, 20, 200, 166], p: [[0, () => LN([14, 130], [44, 166], 7, "pr") + LN([44, 166], [86, 166], 7, "pr") + LN([60, 166], [60, 178], 4, "pr")],
      [2, (J) => { const c = add(J.a1, J.P.o1, 1); return LN(add(c, D(50), -24), add(c, D(50), 24), 6, "pr"); }]], k: [
      { h: [70, 148], t: -132, n: 30, a1: [130, 98], k1: 0, o1: [11, -9], w1: [78, 152] }, { h: [70, 148], t: -132, n: 30, a1: [130, 98], k1: 0, o1: [14, -3], w1: [78, 152] }, "=1"] },
    // Tek bacak squat basamağı: tek ayakta, öbür bacak önde; kalça geriye, kutuya dokun, kalk
    pistolprog: { T: 3.6, p: [BOX(44, 86, 133)], k: [
      { h: [99, 87], t: -88, a1: [100, 170], o1: F, a2: [136, 158], k2: 0, w1: [104, 93] }, { h: [79, 118], t: -55, a1: [100, 170], o1: F, a2: [160, 128], k2: 0, w1: [160, 92] }] },
    // Tek bacak kalça köprüsü: bir bacak düz havada, yerdeki topuktan it; kalçalar düz
    sbridge: { T: 4.2, vb: [0, 96, 200, 90], k: [
      { h: [100, 164], t: 180, n: 8, a1: [142, 170], o1: [12, 4], a2: [168, 116], k2: 0, w1: [110, 174], e1: 0 },
      { h: [96, 143], t: 156, n: 32, a1: [142, 170], o1: [12, 4], a2: [172, 112], k2: 0, w1: [110, 174], e1: 0 }, "=1"] },
    // Barla kalça köprüsü: bar kalça kemiklerinin üstünde, eller barda; topuklardan it, tepede 1-2 sn sık
    bridge: { T: 4.2, vb: [0, 96, 200, 90], p: [PLATE((J) => add(J.h, [0, -16]))], k: [
      { h: [100, 164], t: 180, n: 8, a1: [142, 170], o1: [12, 4], w1: [100, 148] }, { h: [96, 143], t: 156, n: 32, a1: [142, 170], o1: [12, 4], w1: [96, 127] }, "=1"] },
    // Bantlı kalça köprüsü: halka bant dizlerin üstünde
    bandbridge: { T: 4.2, vb: [0, 96, 200, 90], p: [[2, (J) => RING(add(J.k1, [-8, 3]), 6, 3)]], k: [
      { h: [100, 164], t: 180, n: 8, a1: [142, 170], o1: [12, 4], w1: [110, 174], e1: 0 }, { h: [96, 143], t: 156, n: 32, a1: [142, 170], o1: [12, 4], w1: [110, 174], e1: 0 }, "=1"] },
    // Dambıl kalça köprüsü: ağırlık kalça kemiklerinin üstünde iki elle
    dbbridge: { T: 4.2, vb: [0, 96, 200, 90], p: [DBL((J) => add(J.h, [0, -17]))], k: [
      { h: [100, 164], t: 180, n: 8, a1: [142, 170], o1: [12, 4], w1: [100, 150] }, { h: [96, 143], t: 156, n: 32, a1: [142, 170], o1: [12, 4], w1: [96, 129] }, "=1"] },
    // Sehpaya yaslanarak kalça itişi: kürek kemikleri sehpa kenarında, bar kalçada; tepede gövde yere paralel, kaval dik, çene içe
    hipthrust: { T: 4, p: [BENCH(10, 62, 135), PLATE((J) => add(J.h, [0, -16]))], k: [
      { h: [95, 160], t: -138, n: 0, a1: [149, 170], o1: F, w1: [95, 144] }, { h: [107, 124], t: 180, n: 28, a1: [149, 170], o1: F, w1: [107, 108] }, "=1"] },
    // Romen deadlift: dizler hafif bükük ve sabit, kalça geri; bar bacaklara yakın diz-kaval ortasına iner, sırt düz
    rdl: { T: 4, p: [PLATE((J) => J.w1)], k: [
      { h: [100, 87], t: -88, a1: [100, 170], o1: F, w1: [105, 93], e1: 0 }, { h: [76, 92], t: -15, n: 15, a1: [100, 170], o1: F, w1: [109, 134], e1: 0 }] },
    // Bantlı Romen deadlift: bandın ortasına basılır, uçlar ellerde
    bandrdl: { T: 4, p: [BAND(() => [106, 177], (J) => J.w1)], k: [
      { h: [100, 87], t: -88, a1: [100, 170], o1: F, w1: [105, 93], e1: 0 }, { h: [76, 92], t: -15, n: 15, a1: [100, 170], o1: F, w1: [109, 134], e1: 0 }] },
    // Deadlift: bar ayak ortası üstünde, omuzlar barın biraz önünde, sırt düz; bar bacağa yakın dik yükselir, aynı yoldan iner
    dl: { T: 4, p: [PLATE((J) => J.w1)], k: [
      { h: [72, 124], t: -30, n: 10, a1: [100, 170], o1: F, w1: [106, 156], e1: 0 }, { h: [100, 87], t: -89, a1: [100, 170], o1: F, w1: [104, 93], e1: 0 }, "=1"] },
    // Tek bacak Romen deadlift: ağırlık destek bacağının karşı elinde; arka bacak gövdeyle aynı çizgide uzanır, kalçalar düz
    slrdl: { T: 4.4, p: [DBL((J) => J.w2)], k: [
      { h: [100, 87], t: -88, a1: [100, 170], o1: F, a2: [92, 160], w1: [104, 93], w2: [104, 93] },
      { h: [92, 92], t: -10, n: 10, a1: [100, 170], o1: F, a2: [11, 106], k2: 0, w1: [142, 138], e1: 0, w2: [140, 138], e2: 0 }] },
    // Bacak bükme makinesi (yüzüstü): ped aşil tendonunda; topukları kalçaya çek, yavaş indir
    legcurl: { T: 3.4, pp: 1, ho: 1, vb: [0, 60, 200, 126], p: [BENCH(74, 192, 135), [2, (J) => { const f = Math.atan2(J.a1[1] - J.k1[1], J.a1[0] - J.k1[0]) / R; return CI(add(J.a1, D(f + 90), 9), 7, "pf"); }]],
      k: arc([68, 120], 42, [180, 240, 290]).map((a) => ({ h: [110, 118], t: 0, n: 10, q1: [68, 120], a1: a, w1: [182, 134] })) },
    // Bacak açma makinesi: ped bileğin önünde; bacağı düzleştir, üstte 1 sn bekle, yavaş indir
    legext: { T: 3.4, pp: 1, p: [[0, () => LN([48, 134], [114, 134], 8, "pr") + LN([50, 134], [50, 70], 8, "pr") + LN([80, 134], [80, 178], 4, "pr")], [2, (J) => { const f = Math.atan2(J.a1[1] - J.k1[1], J.a1[0] - J.k1[0]) / R; return CI(add(J.a1, D(f - 90), 9), 7, "pf"); }]],
      k: arc([112, 120], 42, [95, 45, -2]).map((a) => ({ h: [70, 120], t: -95, q1: [112, 120], a1: a, w1: [84, 128] })) },
    // Bantla bacak açma: sandalyede; bant sandalyenin arka ayağından bileğe
    bandlegext: { T: 3.4, pp: 1, p: [[0, () => LN([50, 134], [112, 134], 7, "pr") + LN([52, 134], [52, 76], 5, "pr") + LN([54, 134], [54, 178], 3, "pr") + LN([108, 134], [108, 178], 3, "pr")], BAND(() => [56, 176], (J) => J.a1)],
      k: arc([112, 120], 42, [95, 45, -2]).map((a) => ({ h: [70, 120], t: -92, q1: [112, 120], a1: a, w1: [84, 128] })) },
    // Geriye adımla hamle: arka ayak geriye büyük adım, arka diz yere yaklaşır; ön kaval dik, gövde dik
    rlunge: { T: 3.4, pp: 1, k: [
      { h: [100, 87], t: -88, a1: [100, 170], o1: F, w1: [103, 93] },
      { h: [78, 104], t: -88, a1: [100, 170], o1: F, a2: [52, 150], w1: [81, 110] },
      { h: [58, 128], t: -88, a1: [100, 170], o1: F, a2: [12, 166], o2: BALL, w1: [61, 134] }] },
    // Sabit hamle: uzun adım duruşu, arka topuk kalkık; gövde dik, arka diz yere yaklaşır
    split: { T: 3.2, k: [
      { h: [84, 94], t: -88, a1: [120, 170], o1: F, a2: [40, 166], o2: BALL, w1: [87, 100] }, { h: [80, 126], t: -88, a1: [120, 170], o1: F, a2: [40, 166], o2: BALL, w1: [83, 132] }] },
    // Bulgar hamlesi: arka ayağın üstü sehpada; ön bacakla dik çök, ön topuktan kalk
    bss: { T: 3.4, p: [BENCH(4, 50, 135)], k: [
      { h: [86, 92], t: -86, a1: [122, 170], o1: F, a2: [40, 127], o2: [-12, 2], w1: [89, 98] }, { h: [80, 128], t: -82, a1: [122, 170], o1: F, a2: [40, 127], o2: [-12, 2], w1: [86, 134] }] },
    // Basamağa çıkış: bir ayak kutuda, üstteki bacakla it; öbür ayağı yukarı getir, kontrollü in
    stepup: { T: 3.6, vb: [0, -44, 200, 228], p: [BOX(104, 152, 128)], k: [
      { h: [86, 94], t: -86, a1: [124, 124], o1: F, a2: [88, 170], o2: F, w1: [90, 100] }, { h: [122, 43], t: -90, a1: [124, 124], o1: F, a2: [118, 124], o2: F, w1: [125, 49] }, "=1"] },
    // Bantlı squat: bant ayakların altında, uçları omuz önünde
    bandsquat: { T: 3.4, p: [BAND(() => [108, 177], (J) => J.w1)], k: [
      { h: [99, 87], t: -88, a1: [100, 170], o1: F, j1: shp([99, 87], -88, -26, 10), w1: shp([99, 87], -88, -4, 12) },
      { h: [79, 134], t: -52, a1: [100, 170], o1: F, j1: shp([79, 134], -52, -26, 10), w1: shp([79, 134], -52, -4, 12) }] },
    // Havluyla kayarak bacak bükme: kalça köprüde kalır; topuklar havluyla kalçaya çekilir, yavaş uzaklaşır
    slidecurl: { T: 4, vb: [0, 96, 200, 90], p: [[0, (J) => LN([J.a1[0] - 6, 176], [J.a1[0] + 14, 176], 4, "pr")]], k: [
      { h: [100, 150], t: 165, n: 20, a1: [186, 170], k1: 0, o1: [3, -8], w1: [110, 174], e1: 0 }, { h: [96, 143], t: 156, n: 32, a1: [142, 170], o1: [12, 4], w1: [110, 174], e1: 0 }] },
    // Ayakta bantla bacak bükme: diz öne kaçmadan topuk kalçaya; bant destek ayağından çalışan bileğe; el bir yere tutunur
    bandlegcurl: { T: 3.4, pp: 1, p: [[0, line(150, -2, 150, 178.5, 5)], BAND(() => [100, 176], (J) => J.a1)],
      k: arc([100, 129], 42, [90, 140, 190, 235]).map((a) => ({ h: [100, 87], t: -86, q1: [100, 129], a1: a, a2: [100, 170], o2: F, w1: [146, 72] })) },
    // Destekli sissy squat: tutunarak, topuklar kalkık; dizler öne giderken diz-kalça-omuz düz çizgide geriye yatar
    sissy: { T: 3.6, p: [[0, line(137, -2, 137, 178.5, 5)]], k: [
      { h: [100, 86], t: -90, a1: [100, 166], o1: BALL, w1: [134, 72] }, { h: [108.9, 105.6], t: -125, n: 15, q1: [133, 140], a1: [100, 166], o1: BALL, w1: [134, 76] }] },
    // Ters Nordic: dizüstü, diz-kalça-omuz düz çizgi; gövde yavaşça geriye yatar, aynı yoldan kalkar
    revnordic: { T: 4.4, vb: [0, 20, 200, 166], p: [[0, () => LN([94, 177], [126, 177], 4, "pr")]], k: [
      { h: [110, 128], t: -90, q1: [110, 170], a1: [68, 172], o1: [-11, 3], j1: shp([110, 128], -90, -26, 12), w1: shp([110, 128], -90, -8, 8) },
      { h: [85.9, 135.6], t: -125, n: 10, q1: [110, 170], a1: [68, 172], o1: [-11, 3], j1: shp([85.9, 135.6], -125, -26, 12), w1: shp([85.9, 135.6], -125, -8, 8) }] },
    // ---------- üst vücut ----------
    // Şınav: eller omuzdan biraz geniş, vücut baştan topuğa düz; göğüs yere yaklaşır, dirsekler gövdeye ~45° (yandan geriye bükülür)
    pushup: { T: 2.4, vb: [0, 70, 200, 116], k: [{ h: pl([20, 163], -21), t: -21, a1: [20, 163], o1: [3, 9], k1: 0, w1: [148, 172] }, { h: pl([20, 163], -6), t: -6, a1: [20, 163], o1: [3, 9], k1: 0, w1: [148, 172] }] },
    // Yumruk şınavı: yumruklar omuz altında
    kpushup: { T: 2.4, vb: [0, 70, 200, 116], k: [{ h: pl([20, 163], -21), t: -21, a1: [20, 163], o1: [3, 9], k1: 0, w1: [148, 169] }, { h: pl([20, 163], -7), t: -7, a1: [20, 163], o1: [3, 9], k1: 0, w1: [148, 169] }] },
    // Dar şınav: eller göğüs altında, dirsekler gövdeye yakın
    diamond: { T: 2.4, vb: [0, 70, 200, 116], k: [{ h: pl([24, 163], -19), t: -19, a1: [24, 163], o1: [3, 9], k1: 0, w1: [138, 172] }, { h: pl([24, 163], -6), t: -6, a1: [24, 163], o1: [3, 9], k1: 0, w1: [138, 172] }] },
    // Patlayıcı şınav: alttan hızlı itiş, eller yerden kalkar, yumuşak iniş
    exppush: { T: 1.8, vb: [0, 70, 200, 116], k: [{ h: pl([20, 163], -6), t: -6, a1: [20, 163], o1: [3, 9], k1: 0, w1: [148, 172] }, { h: pl([20, 163], -27), t: -27, a1: [20, 163], o1: [3, 9], k1: 0, w1: [148, 156], e1: 0 }, { h: pl([20, 163], -21), t: -21, a1: [20, 163], o1: [3, 9], k1: 0, w1: [148, 172] }] },
    // Dizüstü şınav: dizler yerde, dizden başa düz çizgi
    kneepush: { T: 2.4, vb: [0, 70, 200, 116], k: [
      { h: add([60, 170], D(-38), 42), t: -38, q1: [60, 170], a1: [26, 150], w1: [140, 172] }, { h: add([60, 170], D(-12), 42), t: -12, q1: [60, 170], a1: [26, 150], w1: [140, 172] }] },
    // Eğimli şınav: eller yüksek sağlam yüzeyde, vücut düz; göğüs kenara yaklaşır
    inclinepush: { T: 2.6, vb: [0, 40, 200, 146], p: [BOX(128, 176, 134)], k: [{ h: pl([22, 163], -40), t: -40, a1: [22, 163], o1: [3, 9], k1: 0, w1: [140, 131] }, { h: pl([22, 163], -29), t: -29, a1: [22, 163], o1: [3, 9], k1: 0, w1: [140, 131] }] },
    // Dambıl bench press: sehpada sırtüstü, dambıllar göğüs hizasından yukarı; üstte hafif yaklaşır
    dbbench: { T: 2.8, vb: [0, 20, 200, 166], p: [BENCH(26, 118, 136), DBL((J) => J.w1)], k: [
      { h: [110, 120], t: 180, n: 6, a1: [150, 170], o1: F, j1: [66, 140], w1: [66, 108] }, { h: [110, 120], t: 180, n: 6, j1: [59, 91], a1: [150, 170], o1: F, w1: [60, 64] }] },
    // Yerde dambılla göğüs itişi: dirsek yere yumuşakça değer, yukarı it
    floorpress: { T: 2.8, vb: [0, 60, 200, 126], p: [DBL((J) => J.w1)], k: [
      { h: [110, 164], t: 180, n: 8, a1: [146, 170], o1: [12, 4], j1: [66, 172], w1: [66, 146] }, { h: [110, 164], t: 180, n: 8, a1: [146, 170], o1: [12, 4], j1: [59, 135], w1: [60, 108] }] },
    // Bench press: kürek kemikleri sıkılı; bar göğsün alt kısmına iner, dik itilir
    bench: { T: 3, vb: [0, 20, 200, 166], p: [BENCH(26, 118, 136), PLATE((J) => J.w1)], k: [
      { h: [110, 120], t: 180, n: 6, a1: [150, 170], o1: F, j1: [72, 140], w1: [72, 108] }, { h: [110, 120], t: 180, n: 6, a1: [150, 170], o1: F, j1: [62, 91], w1: [63, 64] }] },
    // Paralel barda itiş: kollar düz başla; gövde hafif öne eğik, omuzlar dirsek hizasına iner
    dips: { T: 2.8, vb: [0, -40, 200, 226], p: [[0, () => LN([62, 55], [148, 55], 5, "pr") + LN([70, 55], [70, 178], 4, "pr") + LN([140, 55], [140, 178], 4, "pr")]], k: [
      { h: [100, 46], t: -88, a1: [82, 108], w1: [102, 51], e1: 0 }, { h: [94, 72], t: -72, a1: [76, 132], w1: [102, 51] }] },
    // Göğüs itme makinesi: oturur, tutacaklar göğüs hizasında; ileri it, yavaş geri gel
    chestpress: { T: 2.8, p: [[0, () => LN([40, 132], [96, 132], 8, "pr") + LN([42, 132], [42, 50], 8, "pr") + LN([70, 132], [70, 178], 4, "pr")], [2, (J) => LN(add(J.w1, [2, -8]), add(J.w1, [2, 8]), 5, "pr")]], k: [
      { h: [68, 120], t: -92, a1: [112, 170], o1: F, j1: [52, 90], w1: [84, 76] }, { h: [68, 120], t: -92, a1: [112, 170], o1: F, j1: [94, 72], w1: [124, 72] }] },
    // Dambıl omuz press: dambıllar omuz hizasında, karın sıkı, baş üstüne it
    dbohp: { T: 2.8, vb: [0, -32, 200, 218], p: [DBL((J) => J.w1)], k: [
      { h: [100, 87], a1: [100, 170], o1: F, j1: [108, 58], w1: [106, 30] }, { h: [100, 87], a1: [100, 170], o1: F, j1: [102, 6], w1: [101, -22] }] },
    // Barla omuz press: bar omuz önünde; burun hizasında baş geri, bar alnı geçince baş öne; bar ayak ortası üstünde kilitlenir
    ohp: { T: 3, pp: 1, vb: [0, -32, 200, 218], p: [PLATE((J) => J.w1)], k: [
      { h: [100, 87], a1: [100, 170], o1: F, j1: [110, 58], w1: [110, 33] }, { h: [100, 87], n: -14, a1: [100, 170], o1: F, j1: [114, 33], w1: [108, 8] },
      { h: [100, 87], n: 4, a1: [100, 170], o1: F, j1: [103, 6], w1: [102, -22] }] },
    // Tek kol köşe barı itişi: hafif split duruş, plakalı uç omuz önünde; yukarı-ileri it
    lmpress: { T: 3, p: [[2, (J) => LN(J.w1, add(J.w1, [118, 140]), 5, "pr") + RING(J.w1, 14, 4)]], k: [
      { h: [96, 88], a1: [114, 170], o1: F, a2: [74, 168], o2: BALL, j1: [104, 66], w1: [110, 38], w2: [99, 93] }, { h: [98, 88], t: -86, a1: [114, 170], o1: F, a2: [74, 168], o2: BALL, w1: [142, -6], e1: 0, w2: [101, 93] }] },
    // Omuz itme makinesi: oturur, tutacaklar omuz hizasında; yukarı it, yavaş indir
    machinepress: { T: 2.8, vb: [0, -32, 200, 218], p: [[0, () => LN([40, 132], [96, 132], 8, "pr") + LN([42, 132], [42, 30], 8, "pr") + LN([70, 132], [70, 178], 4, "pr")], [2, (J) => LN(add(J.w1, [-8, 0]), add(J.w1, [8, 0]), 5, "pr")]], k: [
      { h: [68, 120], t: -90, a1: [112, 170], o1: F, j1: [74, 92], w1: [74, 64] }, { h: [68, 120], t: -90, a1: [112, 170], o1: F, j1: [70, 38], w1: [70, 10] }] },
    // Yarım diz tek kol omuz press: yerdeki diz tarafındaki elde ağırlık; yukarı ve hafif öne
    hkpress: { T: 2.8, vb: [0, -32, 200, 218], p: [DBL((J) => J.w1)], k: [
      { h: [96, 128], q1: [96, 170], a1: [54, 172], o1: [-11, 3], a2: [138, 170], o2: F, j1: [104, 100], w1: [104, 72], w2: [99, 134] },
      { h: [96, 128], q1: [96, 170], a1: [54, 172], o1: [-11, 3], a2: [138, 170], o2: F, w1: [104, 18], e1: 0, w2: [99, 134] }] },
    // Bant omuz press: bandın alt ucuna basılır, uçlar omuzda; baş üstüne it
    bandpress: { T: 2.8, vb: [0, -32, 200, 218], p: [BAND(() => [104, 177], (J) => J.w1)], k: [
      { h: [100, 87], a1: [100, 170], o1: F, j1: [108, 58], w1: [106, 30] }, { h: [100, 87], a1: [100, 170], o1: F, j1: [102, 6], w1: [101, -22] }] },
    // Bant göğüs press: bant sırttan kürek kemiği hizasında dolanır; kollar öne düzleşir
    bandchest: { T: 2.6, p: [[2, (J) => LN(J.w1, shp(J.h, J.P.t, -8, -15), 2.5, "pr")]], k: [
      { h: [100, 87], a1: [100, 170], o1: F, j1: [86, 60], w1: [114, 50] }, { h: [100, 87], a1: [100, 170], o1: F, w1: [157, 48], e1: 0 }] },
    // Havluyla kapı kürek: havlu kapı kolunda; geriye yaslan, göğsü kapıya çek
    doorrow: { T: 2.8, p: [[0, () => LN([176, -2], [176, 178.5], 6, "pr") + CI([170, 110], 4, "pf")], [2, (J) => LN(J.w1, [170, 110], 3, "pr")]], k: [
      { h: pl([150, 170], -120), t: -120, a1: [150, 170], o1: F, k1: 0, w1: [129, 84], e1: 0 }, { h: pl([150, 170], -102), t: -102, a1: [150, 170], o1: F, k1: 0, j1: [112, 70], w1: [140, 60] }] },
    // Bantlı kürek: bant göğüs hizasında önde; dirsekler geriye, kürek kemikleri sıkılır
    bandrow: { T: 2.6, p: [[2, (J) => LN(J.w1, [198, 72], 2.5, "pr") + CI([198, 72], 3, "pf")]], k: [
      { h: [96, 90], t: -88, a1: [104, 170], o1: F, w1: [154, 74], e1: 0 }, { h: [96, 90], t: -90, a1: [104, 170], o1: F, j1: [80, 86], w1: [108, 82] }] },
    // Ters kürek: topuklar yerde, vücut düz; göğüs bara çekilir, dirsekler gövdeye ~45°
    invrow: { T: 2.8, vb: [-10, 60, 220, 126], p: [[0, () => LN([115, 98], [115, 178.5], 4, "pr") + CI([115, 98], 5, "pf")]], k: [
      { h: pl([4, 170], -6.4), t: -6.4, n: 10, a1: [4, 170], o1: [2, -10], k1: 0, w1: [115, 98], e1: -1 }, { h: pl([4, 170], -26.4), t: -26.4, n: 10, a1: [4, 170], o1: [2, -10], k1: 0, w1: [115, 98], e1: -1 }] },
    // Tek kol dambıl kürek: boş el ve diz sehpada, sırt düz; dambılı kalçaya doğru çek
    dbrow: { T: 2.8, p: [BENCH(38, 162, 137), DBL((J) => J.w1)], k: [
      { h: [92, 86], t: -4, n: 15, a1: [80, 170], o1: F, q2: [92, 128], a2: [50, 130], o2: [-11, 3], j1: [144, 112], w1: [145, 140], w2: [152, 129] },
      { h: [92, 86], t: -4, n: 15, a1: [80, 170], o1: F, q2: [92, 128], a2: [50, 130], o2: [-11, 3], j1: [114, 64], w1: [118, 92], w2: [152, 129] }] },
    // Barla eğilerek kürek: kalçadan ~45° eğik, dizler bükük, sırt düz; bar göbeğe çekilir
    bbrow: { T: 2.6, p: [PLATE((J) => J.w1)], k: [
      { h: [82, 96], t: -45, n: 15, a1: [100, 170], o1: F, w1: [119, 116], e1: 0 }, { h: [82, 96], t: -45, n: 15, a1: [100, 170], o1: F, w1: [105, 93] }] },
    dbbor: { T: 2.6, p: [DBL((J) => J.w1)], k: [
      { h: [82, 94], t: -42, n: 15, a1: [100, 170], o1: F, w1: [121, 114], e1: 0 }, { h: [82, 94], t: -42, n: 15, a1: [100, 170], o1: F, w1: [105, 92] }] },
    bandbor: { T: 2.6, p: [BAND(() => [106, 177], (J) => J.w1)], k: [
      { h: [82, 94], t: -42, n: 15, a1: [100, 170], o1: F, w1: [121, 114], e1: 0 }, { h: [82, 94], t: -42, n: 15, a1: [100, 170], o1: F, w1: [105, 92] }] },
    // Kablo kürek: dik otur, tutacağı göbeğe çek, kürek kemiklerini sık
    cablerow: { T: 2.8, p: [[0, () => LN([28, 152], [92, 152], 8, "pr") + LN([60, 152], [60, 178], 4, "pr") + LN([158, 128], [158, 172], 6, "pr")], [2, (J) => LN(J.w1, [196, 150], 2.5, "pr")]], k: [
      { h: [60, 140], t: -80, a1: [148, 156], w1: [118, 112], e1: 0 }, { h: [60, 140], t: -92, a1: [148, 156], j1: [42, 110], w1: [78, 118] }] },
    // Bantla aşağı çekiş: bant başın üstünde; diz çökülü, dirsekler kaburgalara çekilir
    bandpd: { T: 2.8, vb: [0, -32, 200, 218], p: [BAND(() => [124, -30], (J) => J.w1)], k: [
      { h: [110, 128], q1: [110, 170], a1: [68, 172], o1: [-11, 3], w1: [122, -24], e1: 0 }, { h: [110, 128], q1: [110, 170], a1: [68, 172], o1: [-11, 3], j1: [106, 104], w1: [120, 80] }] },
    // Sırt çekiş makinesi: bar omuzdan geniş; göğsün üstüne çek, dirsekler aşağı
    latpd: { T: 2.8, vb: [0, -32, 200, 218], p: [[0, () => LN([40, 140], [92, 140], 8, "pr") + LN([66, 140], [66, 178], 4, "pr") + CI([118, 112], 7, "pf")], [2, (J) => LN(J.w1, [J.w1[0], -40], 2.5, "pr") + CI(J.w1, 4, "pf")]], k: [
      { h: [80, 128], t: -96, q1: [122, 128], a1: [122, 170], o1: F, w1: [98, -18], e1: 0 }, { h: [80, 128], t: -104, n: -4, q1: [122, 128], a1: [122, 170], o1: F, j1: [72, 104], w1: [86, 74] }] },
    // Tek kol kabloyla aşağı çekiş: yarım diz, dirsek kaburgaya, kürek kemiği aşağı
    cablepd: { T: 2.8, vb: [0, -32, 200, 218], p: [BAND(() => [118, -34], (J) => J.w1)], k: [
      { h: [96, 128], q1: [96, 170], a1: [54, 172], o1: [-11, 3], a2: [138, 170], o2: F, w1: [114, -22], e1: 0, w2: [99, 134] },
      { h: [96, 128], q1: [96, 170], a1: [54, 172], o1: [-11, 3], a2: [138, 170], o2: F, j1: [92, 104], w1: [106, 80], w2: [99, 134] }] },
    // Pazı bükme: dirsekler gövdede sabit, ağırlık omza doğru; 2-3 sn'de iner
    dbcurl: { T: 3, pp: 1, p: [DBL((J) => J.w1)], k: arc([103, 65], 27, [88, 30, -30, -80]).map((w) => ({ h: [100, 87], a1: [100, 170], o1: F, j1: [103, 65], w1: w })) },
    bandcurl: { T: 3, pp: 1, p: [BAND(() => [104, 177], (J) => J.w1)], k: arc([103, 65], 27, [88, 30, -30, -80]).map((w) => ({ h: [100, 87], a1: [100, 170], o1: F, j1: [103, 65], w1: w })) },
    bbcurl: { T: 3, pp: 1, p: [PLATE((J) => J.w1)], k: arc([103, 65], 27, [88, 30, -30, -80]).map((w) => ({ h: [100, 87], a1: [100, 170], o1: F, j1: [103, 65], w1: w })) },
    revcurl: { T: 3, pp: 1, p: [PLATE((J) => J.w1)], k: arc([103, 65], 27, [88, 30, -30, -80]).map((w) => ({ h: [100, 87], a1: [100, 170], o1: F, j1: [103, 65], w1: w })) },
    cablecurl: { T: 3, pp: 1, p: [BAND(() => [138, 176], (J) => J.w1), [0, () => CI([138, 176], 4, "pf")]], k: arc([103, 65], 27, [88, 30, -30, -80]).map((w) => ({ h: [100, 87], a1: [100, 170], o1: F, j1: [103, 65], w1: w })) },
    // Havluyla pazı kasma: havlunun ortasına basılı, dirsekler 90°, havlu gergin; süre boyunca tut
    towelcurl: { T: 2, p: [BAND(() => [114, 176], (J) => J.w1)], k: [
      { h: [100, 87], a1: [100, 170], o1: F, a2: [114, 170], j1: [103, 65], w1: [130, 64] }, { h: [100, 87], a1: [100, 170], o1: F, a2: [114, 170], j1: [103, 65], w1: [130, 63] }] },
    // Baş üstü arka kol: dirsekler tavana bakar, ağırlık başın arkasına iner, dirsekler açılarak yukarı itilir
    ohext: { T: 3, pp: 1, vb: [0, -32, 200, 218], p: [DBL((J) => J.w1)], k: arc([97, 8], 27, [-88, -10, 60, 112]).map((w) => ({ h: [100, 87], a1: [100, 170], o1: F, j1: [97, 8], w1: w })) },
    bandohext: { T: 3, pp: 1, vb: [0, -32, 200, 218], p: [BAND(() => [70, 176], (J) => J.w1)], k: arc([97, 8], 27, [-88, -10, 60, 112]).map((w) => ({ h: [100, 87], a1: [112, 170], o1: F, a2: [76, 170], o2: F, j1: [97, 8], w1: w })) },
    // Kabloyla baş üstü arka kol: makaraya sırt dönük, gövde öne eğik; dirsekler öne-yukarı, kollar ileri düzleşir
    cableohext: { T: 3, pp: 1, p: [BAND(() => [8, 30], (J) => J.w1), [0, () => CI([8, 30], 4, "pf")]], k: arc([138, 30], 27, [-150, -100, -40, -10]).map((w) => ({ h: [96, 92], t: -62, a1: [120, 170], o1: F, a2: [76, 168], o2: BALL, j1: [138, 30], w1: w })) },
    // Arka kol itişi: dirsekler gövdeye yapışık, el aşağı itilir, kollar düzleşir
    bandpushdown: { T: 2.6, pp: 1, vb: [0, -32, 200, 218], p: [BAND(() => [118, -30], (J) => J.w1)], k: arc([104, 64], 27, [-12, 30, 60, 92]).map((w) => ({ h: [100, 87], t: -86, a1: [100, 170], o1: F, j1: [104, 64], w1: w })) },
    cablepushdown: { T: 2.6, pp: 1, vb: [0, -32, 200, 218], p: [BAND(() => [118, -30], (J) => J.w1), [0, () => CI([118, -30], 4, "pf")]], k: arc([104, 64], 27, [-12, 30, 60, 92]).map((w) => ({ h: [100, 87], t: -86, a1: [100, 170], o1: F, j1: [104, 64], w1: w })) },
    // Sandalyede arka kol itişi: eller sandalyenin kenarında, kalça önde; dirsekler geriye 90°, kollarla it
    chairdip: { T: 2.6, p: [[0, () => LN([52, 133], [88, 133], 7, "pr") + LN([54, 133], [54, 78], 5, "pr") + LN([56, 133], [56, 178], 3, "pr") + LN([86, 133], [86, 178], 3, "pr")]], k: [
      { h: [94, 124], t: -90, a1: [146, 170], o1: F, w1: [87, 128], e1: 0 }, { h: [96, 150], t: -86, a1: [146, 170], o1: F, w1: [87, 128] }] },
    // Yerde barla arka kol açma: dar tutuş, kollar düz yukarıda; dirsekler tavana bakarken bar alnın arkasına iner
    bbskull: { T: 3, pp: 1, vb: [0, 60, 200, 126], p: [PLATE((J) => J.w1)], k: arc([53, 135], 27, [-95, -150, 165]).map((w) => ({ h: [110, 164], t: 180, n: 8, a1: [146, 170], o1: [12, 4], j1: [53, 135], w1: w })) },
    // Dambıl yana açış (önden): dirsekler hafif bükük, kollar omuz hizasına kadar yana; 2-3 sn'de iner
    latraise: { T: 3, pp: 1, v: "f", p: [DBL((J) => J.w1), DBL((J) => J.w2)], k: [96, 120, 145, 172].map((g, i) => ({ h: [100, 86.5], a1: [93, 170], a2: [107, 170], w1: add([85, 35], D(g), 55), w2: add([115, 35], D(180 - g), 55), e1: 0.3, e2: -0.3 })) },
    bandlatraise: { T: 3, pp: 1, v: "f", p: [BAND(() => [96, 177], (J) => J.w1), BAND(() => [104, 177], (J) => J.w2)], k: [96, 120, 145, 172].map((g) => ({ h: [100, 86.5], a1: [93, 170], a2: [107, 170], w1: add([85, 35], D(g), 55), w2: add([115, 35], D(180 - g), 55), e1: 0.3, e2: -0.3 })) },
    // Kablo yana açış (önden): makara karşı yanda altta, tutacak karşı elde; kol omuz hizasına kadar yana
    cablelat: { T: 3, pp: 1, v: "f", p: [BAND(() => [14, 176], (J) => J.w2), [0, () => CI([14, 176], 4, "pf")]], k: [110, 80, 40, 6].map((g) => ({ h: [100, 86.5], a1: [93, 170], a2: [107, 170], w1: [84, 92], w2: add([115, 35], D(g), 55), e2: -0.3 })) },
    // Eğilerek arka omuz: kalçadan öne eğik, sırt düz; kollar hafif bükük yana açılır (yandan kısalarak omuz hizasına gelir)
    reardelt: { T: 2.8, p: [DBL((J) => J.w1)], k: [
      { h: [84, 94], t: -14, n: 15, a1: [100, 170], o1: F, w1: [134, 138], e1: 0.2 }, { h: [84, 94], t: -14, n: 15, a1: [100, 170], o1: F, w1: [132, 86], e1: 0 }, "=1"] },
    // Plakayla öne kaldırma: plaka uyluk önünde iki elle; kollar hafif bükük, omuz hizasına kalkar
    platefr: { T: 3, pp: 1, p: [[2, (J) => LN(add(J.w1, [3, -20]), add(J.w1, [3, 20]), 6, "pr")]], k: arc([100, 35], 56, [82, 50, 20, -2]).map((w) => ({ h: [100, 87], t: -91, a1: [100, 170], o1: F, w1: w, e1: 0.2 })) },
    // Yüze doğru çekiş: bant yüz hizasında önde; yüze çek, dirsekler yüksek, eller kulakların yanına ayrılır
    facepull: { T: 2.8, p: [[2, (J) => LN(J.w1, [198, 26], 2.5, "pr") + CI([198, 26], 3, "pf")]], k: [
      { h: [96, 87], a1: [104, 170], o1: F, w1: [152, 30], e1: 0 }, { h: [96, 87], a1: [104, 170], o1: F, j1: [84, 33], w1: [102, 18] }, "=1"] },
    // ---------- amut ve barfiks ----------
    // Ters V şınav: kalça yukarıda; baş ellerin biraz önüne iner (dirsekler geriye), iterek başa dön
    pike: { T: 2.8, vb: [0, 60, 200, 126], k: [
      { h: [81.5, 96.1], t: 28.2, n: 60, a1: [40, 168], o1: [5, 8], k1: 0, w1: [128, 174], e1: 0 }, { h: [100.6, 106.2], t: 50, n: 50, a1: [40, 168], o1: [5, 8], k1: 0, w1: [128, 174], e1: 1 }] },
    // Ters V tutuş: yeri iterek omuzlar kulaklara uzar, ağırlık yavaşça ellere kayar
    pikehold: { T: 4, vb: [0, 60, 200, 126], k: [
      { h: [81.5, 96.1], t: 28.2, n: 60, a1: [40, 168], o1: [5, 8], k1: 0, w1: [128, 174], e1: 0 }, { h: [85, 95], t: 32, n: 58, a1: [40, 168], o1: [6, 8], k1: 0, w1: [128, 174], e1: 0 }, "=1"] },
    // Duvarda ters V: eller duvardan bir bacak boyu uzakta, ayaklar duvarda kalça hizasında; kollar düz, omuzlar kulağa itili
    wallpike: { T: 4, vb: [0, 40, 200, 146], p: [wall(10)], k: [
      { h: [100, 66], t: 90, a1: [17, 66], k1: 0, o1: [-3, -12], w1: [100, 174], e1: 0 }, { h: [100, 67], t: 90, a1: [17, 67], k1: 0, o1: [-3, -12], w1: [100, 174], e1: 0 }] },
    // Duvara dönük amut: eller duvardan 10-20 cm, kollar düz, vücut düz çizgi, ayak uçları duvarda
    ctw: { T: 4, vb: [0, -40, 200, 226], p: [wall(84)], k: [
      { h: [100, 66], t: 90, a1: [100, -17], k1: 0, o1: [-10, -2], w1: [100, 174], e1: 0 }, { h: [100, 67], t: 90, a1: [100, -16], k1: 0, o1: [-10, -2], w1: [100, 174], e1: 0 }] },
    // Duvara yürüme: şınav pozisyonunda ayaklar duvar dibinde; ayaklar duvarda yukarı, eller duvara doğru; aynı yoldan iniş
    wallwalk: { T: 8, pp: 1, vb: [0, -40, 200, 226], p: [wall(14)], k: [
      { h: pl([24, 166], -20.8), t: -20.8, n: 10, a1: [24, 166], o1: [3, 9], k1: 0, w1: [152, 174], e1: 0 },
      { h: [100, 86], t: 36.5, n: 40, a1: [18, 104], o1: [-4, -11], k1: 0, w1: [150, 174], e1: 0 },
      { h: [36, 66], t: 90, a1: [36, -17], o1: [-10, -2], k1: 0, w1: [36, 174], e1: 0 }] },
    // Amutta yavaş iniş: sırt duvarda; baş 4-5 sn'de katlı havluya iner (dirsekler öne), sonra inilip yeniden çıkılır
    hspuneg: { T: 6, lin: 1, vb: [0, -40, 200, 226], p: [wall(116), [0, () => LN([86, 176], [108, 176], 4, "pr")]], k: [
      { h: [100, 66], t: 90, a1: [100, -17], k1: 0, o1: [9, -2], w1: [100, 174], e1: 0 },
      { h: [99, 76], t: 90, a1: [99, -7], k1: 0, o1: [9, -2], w1: [100, 174], e1: 1 },
      { h: [98, 86], t: 90, a1: [98, 3], k1: 0, o1: [9, -2], w1: [100, 174], e1: 1 },
      { h: [97, 96], t: 90, a1: [97, 13], k1: 0, o1: [9, -2], w1: [100, 174], e1: 1 }] },
    // Tekme ile amuda çıkış: eller duvardan 20-30 cm; arka bacak savrulur, ön bacak takip eder, topuklar duvara hafifçe değer
    kickup: { T: 5, vb: [0, -40, 200, 226], p: [wall(141)], k: [
      { h: [90, 87], a1: [110, 170], o1: F, a2: [70, 168], o2: BALL, w1: [96, -20], e1: 0 },
      { h: [88, 90], t: 50, n: 40, a1: [104, 168], o1: F, a2: [40, 30], k2: 0, w1: [124, 174], e1: 0 },
      { h: [124, 66], t: 90, a1: [124, -17], k1: 0, o1: [10, -2], w1: [124, 174], e1: 0 }, "=2"] },
    // Barfiks: omuzdan biraz geniş tutuş; önce kürek kemikleri, sonra dirsekler kaburgaya; çene bar üstü, kontrollü tam iniş
    pullup: { T: 3, fl: 0, vb: [0, -40, 200, 226], p: [[0, () => LN([60, -18], [140, -18], 6, "pr")]], k: [
      { h: [100, 92], a1: [86, 168], w1: [100, -18], e1: 0 }, { h: [98, 44], a1: [84, 120], j1: [105, 5], w1: [100, -18] }] },
    // Ters tutuş barfiks: göğüs bara doğru
    chinup: { T: 3, fl: 0, vb: [0, -40, 200, 226], p: [[0, () => LN([60, -18], [140, -18], 6, "pr")]], k: [
      { h: [100, 92], a1: [86, 168], w1: [100, -18], e1: 0 }, { h: [96, 52], a1: [82, 128], j1: [108, 14], w1: [100, -18] }] },
    // Negatif barfiks: çene bar üstünde başla, 5 sn'de tam asılmaya in
    pullneg: { T: 6.5, lin: 1, fl: 0, vb: [0, -40, 200, 226], p: [[0, () => LN([60, -18], [140, -18], 6, "pr")]], k: [
      { h: [100, 92], a1: [86, 168], w1: [100, -18], e1: 0 }, { h: [98, 44], a1: [84, 120], j1: [105, 5], w1: [100, -18] },
      { h: [99, 64], a1: [85, 140], j1: [107, 22], w1: [100, -18] }, { h: [100, 78], a1: [86, 154], j1: [104, 32], w1: [100, -18] }, { h: [100, 88], a1: [86, 164], j1: [101, 38], w1: [100, -18] }] },
    // Bant yardımlı barfiks: bant bara bağlı, dizler bantta
    bandpull: { T: 3, fl: 0, vb: [0, -40, 200, 226], p: [[0, () => LN([60, -18], [140, -18], 6, "pr")], [2, (J) => LN([97, -16], add(J.k1, [-3, 4]), 2.5, "pr") + LN([103, -16], add(J.k1, [3, 4]), 2.5, "pr")]], k: [
      { h: [100, 92], a1: [72, 150], w1: [100, -18], e1: 0 }, { h: [98, 44], a1: [70, 102], j1: [105, 5], w1: [100, -18] }] },
    // Ölü asılma: barı omuz genişliğinde tut, ayaklar yerden kesik; omuzlar hafifçe aşağı (aktif) ya da serbest
    hang: { T: 4, fl: 0, vb: [0, -40, 200, 226], p: [[0, () => LN([60, -18], [140, -18], 6, "pr")]], k: [
      { h: [100, 92], a1: [92, 172], w1: [100, -18], e1: 0 }, { h: [100, 89], s: 3, a1: [92, 169], w1: [100, -18], e1: 0 }, "=1"] },
    // Havlu asılma: havlu bara asılı, eller havluda
    towel: { T: 4, fl: 0, vb: [0, -40, 200, 226], p: [[0, () => LN([60, -18], [140, -18], 6, "pr")], [0, (J) => LN([100, -18], add(J.w1, [0, 6]), 6, "pr")]], k: [
      { h: [100, 114], a1: [84, 184], w1: [100, 4], e1: 0 }, { h: [100, 115], a1: [84, 185], w1: [100, 4], e1: 0 }] },
    // ---------- patlayıcı ----------
    // İniş drili: parmak ucunda kollar yukarıda; kollar hızla geri savrulurken yarım squat'a "düş", sessiz ve dengeli 2 sn tut
    snap: { T: 3.2, vb: [0, -32, 200, 218], dw: [0.5, 1.4, 1.3], k: [
      { h: [100, 82], a1: [100, 165], o1: BALL, w1: [102, -24], e1: 0 }, { h: [84, 116], t: -52, n: 10, a1: [100, 170], o1: F, w1: [60, 108], e1: 0 }, "=1"] },
    // Dikey sıçrama: kollar geri savrulup çeyrek squat; kollar yukarı fırlatılarak sıçra; yumuşak iniş
    sqj: { T: 2.6, vb: [0, -32, 200, 218], dw: [1, 0.6, 0.6, 0.5, 1], k: [
      { h: [100, 87], a1: [100, 170], o1: F, w1: [103, 93] }, { h: [88, 110], t: -62, n: 10, a1: [100, 170], o1: F, w1: [64, 104], e1: 0 },
      { h: [100, 66], a1: [100, 149], o1: [8, 9], k1: 0, w1: [104, -36], e1: 0 }, { h: [100, 84], a1: [100, 167], o1: BALL, w1: [110, -6], e1: 0 },
      { h: [88, 112], t: -60, n: 10, a1: [100, 170], o1: F, w1: [150, 92], e1: 0 }] },
    // Durarak uzun atlama: kollar geri, kalça geri; ileri-yukarı 45° patla; iniş pozisyonunda 2 sn kal
    broad: { T: 3.6, dw: [1, 0.5, 0.5, 1.6, 0.25], k: [
      { h: [56, 87], a1: [56, 170], o1: F, w1: [59, 93] }, { h: [44, 112], t: -55, n: 10, a1: [56, 170], o1: F, w1: [14, 104], e1: 0 },
      { h: [98, 92], t: -70, a1: [86, 150], a2: [90, 150], w1: [150, 60], e1: 0 }, { h: [130, 114], t: -52, n: 10, a1: [148, 170], o1: F, w1: [196, 98], e1: 0 }, "=3"] },
    // Yana sıçrama (önden): tek ayakta; yana öbür ayağın üstüne sıçra, 1 sn dengede kal
    skater: { T: 3, v: "f", pp: 1, k: [
      { h: [54, 102], tl: 44, a1: [48, 170], a2: [80, 136], o2: [3, 5], w1: [18, 122], w2: [66, 112] },
      { h: [100, 80], tl: 50, a1: [92, 152], a2: [108, 152], w1: [62, 96], w2: [138, 96] },
      { h: [146, 102], tl: 44, a1: [120, 136], o1: [-3, 5], a2: [152, 170], w1: [134, 112], w2: [182, 122] }] },
    // Kutu sıçraması: kollar geri savrulup kutuya sıç, yumuşak in, dik dur; kutudan adımla in
    boxjump: { T: 4.2, vb: [0, -40, 200, 226], p: [BOX(116, 170, 128)], dw: [1, 0.5, 0.5, 0.8, 1, 0.9, 0.6], k: [
      { h: [80, 87], a1: [80, 170], o1: F, w1: [83, 93] }, { h: [68, 110], t: -60, n: 10, a1: [80, 170], o1: F, w1: [40, 104], e1: 0 },
      { h: [118, 42], t: -80, a1: [132, 104], a2: [128, 104], w1: [170, 10], e1: 0 }, { h: [130, 74], t: -55, n: 10, a1: [146, 124], o1: F, w1: [180, 58], e1: 0 },
      { h: [144, 41], a1: [146, 124], o1: F, w1: [147, 47] }, { h: [118, 66], t: -88, a1: [134, 124], o1: F, a2: [100, 150], w1: [121, 72] },
      { h: [96, 87], a1: [100, 170], o1: F, a2: [92, 170], o2: F, w1: [99, 93] }] },
    // Hamle sıçraması: split squat'tan yukarı patla, havada ayakları değiştir, yumuşak in
    splitjump: { T: 2.4, k: [
      { h: [80, 126], t: -88, a1: [120, 170], o1: F, a2: [40, 166], o2: BALL, w1: [100, 120], w2: [64, 128] },
      { h: [80, 84], t: -88, a1: [96, 160], a2: [70, 164], w1: [86, 80], w2: [86, 80] },
      { h: [80, 126], t: -88, a1: [40, 166], o1: BALL, a2: [120, 170], o2: F, w1: [64, 128], w2: [100, 120] },
      { h: [80, 84], t: -88, a1: [70, 164], a2: [96, 160], w1: [86, 80], w2: [86, 80] }] },
    // Diz çekerek sıçrama: yerinde yüksek sıçra, dizleri göğse çek; yumuşak in, arada sıfırlan
    tuck: { T: 2.4, vb: [0, -32, 200, 218], dw: [1, 0.5, 0.5, 0.5, 1], k: [
      { h: [100, 87], a1: [100, 170], o1: F, w1: [103, 93] }, { h: [88, 110], t: -62, n: 10, a1: [100, 170], o1: F, w1: [64, 104], e1: 0 },
      { h: [100, 46], t: -96, n: 10, a1: [112, 92], w1: [140, 64] }, { h: [100, 84], a1: [100, 167], o1: BALL, w1: [120, 60] },
      { h: [88, 112], t: -60, n: 10, a1: [100, 170], o1: F, w1: [150, 92], e1: 0 }] },
    // Hızlanma sprinti: gövde öne eğik, ilk adımlar güçlü ve kısa; diz öne, kollar güçlü
    sprint: { T: 0.6, lin: 1, k: [
      { h: [94, 96], t: -55, n: -10, a1: [104, 170], a2: [60, 136], w1: [128, 92], w2: [128, 92] }, { h: [94, 90], t: -55, n: -10, a1: [56, 160], a2: [134, 118], w1: [158, 58], w2: [92, 92] },
      { h: [94, 96], t: -55, n: -10, a1: [60, 136], a2: [104, 170], w1: [128, 92], w2: [128, 92] }, { h: [94, 90], t: -55, n: -10, a1: [134, 118], a2: [56, 160], w1: [92, 92], w2: [158, 58] }] },
    // ---------- kondisyon ----------
    // Kettlebell savurma: squat değil kalçadan menteşe; ağırlık bacak arasına, kalça patlatılarak göğüs hizasına; kollar düz
    kbswing: { T: 1.8, p: [KBL((J) => J.w1)], k: [
      { h: [76, 96], t: -28, n: 15, a1: [100, 170], o1: F, w1: [92, 128], e1: 0 }, { h: [100, 87], t: -90, a1: [100, 170], o1: F, w1: [154, 60], e1: 0 }] },
    dbswing: { T: 1.8, p: [[2, (J) => LN(add(J.w1, [0, -4]), add(J.w1, [0, 18]), 8, "pr")]], k: [
      { h: [76, 96], t: -28, n: 15, a1: [100, 170], o1: F, w1: [92, 126], e1: 0 }, { h: [100, 87], t: -90, a1: [100, 170], o1: F, w1: [154, 60], e1: 0 }] },
    // Dağcı: şınav pozisyonu, dizler sırayla göğse hızlı; kalça sabit
    mountain: { T: 0.9, vb: [0, 70, 200, 116], k: [
      { h: pl([20, 163], -21), t: -21, a1: [104, 164], a2: [20, 163], o2: [3, 9], k2: 0, w1: [148, 172], e1: 0 }, { h: pl([20, 163], -21), t: -21, a1: [20, 163], o1: [3, 9], k1: 0, a2: [104, 164], w1: [148, 172], e1: 0 }] },
    // Yere kapanıp kalkma: gard pozisyonundan eller yere, bacaklar geriye fırlatılır, kalça yere; bacaklar hızla toplanır, gard
    sprawl: { T: 2.6, dw: [0.5, 0.5, 0.8, 0.5, 0.9], k: [
      { h: [104, 90], t: -84, n: 12, a1: [126, 170], o1: F, a2: [82, 168], o2: BALL, w1: [129, 34], w2: [123, 32] },
      { h: [90, 124], t: -20, n: 20, a1: [104, 170], o1: F, w1: [140, 174], e1: 0 },
      { h: [86, 160], t: -26, n: 6, a1: [6, 168], k1: 0, o1: [-10, 4], w1: [136, 174], e1: 0 }, "=1",
      { h: [104, 90], t: -84, n: 12, a1: [126, 170], o1: F, a2: [82, 168], o2: BALL, w1: [129, 34], w2: [123, 32] }] },
    // Burpee: çömel eller yerde, bacaklar geri (şınav pozisyonu), bacaklar toplanır, yukarı sıçra
    burpee: { T: 3.2, vb: [0, -32, 200, 218], dw: [0.6, 0.5, 0.6, 0.5, 0.6, 0.4], k: [
      { h: [100, 87], a1: [100, 170], o1: F, w1: [103, 93] }, { h: [88, 132], t: -30, n: 20, a1: [100, 170], o1: F, w1: [130, 174], e1: 0 },
      { h: pl([20, 163], -21), t: -21, a1: [20, 163], o1: [3, 9], k1: 0, w1: [148, 172], e1: 0 }, { h: [88, 132], t: -30, n: 20, a1: [100, 170], o1: F, w1: [130, 174], e1: 0 },
      { h: [100, 70], a1: [100, 153], o1: [8, 9], k1: 0, w1: [104, -34], e1: 0 }, { h: [100, 87], a1: [100, 170], o1: F, w1: [103, 93] }] },
    // Top çarpma: top baş üstünde, karın sıkı, yere sert çarp; al, tekrarla
    mbslam: { T: 2.4, vb: [0, -32, 200, 218], dw: [0.5, 0.7, 1.2], p: [[2, (J) => CI(J.P.b, 10, "pf")]], k: [
      { h: [100, 84], a1: [100, 167], o1: BALL, w1: [102, -22], e1: 0, b: [102, -30] }, { h: [84, 116], t: -40, n: 15, a1: [100, 170], o1: F, w1: [134, 150], e1: 0, b: [138, 166] },
      { h: [84, 116], t: -40, n: 15, a1: [100, 170], o1: F, w1: [134, 150], e1: 0, b: [138, 166] }] },
    // Tempolu yürüyüş: hızlı ve geniş adımlar, kollar aktif
    walkint: { T: 0.95, lin: 1, k: [
      { h: [100, 93], t: -86, a1: [132, 170], a2: [70, 166], w1: [80, 86], w2: [126, 82] }, { h: [100, 87.5], t: -86, a1: [101, 170], a2: [106, 150], w1: [103, 93], w2: [103, 93] },
      { h: [100, 93], t: -86, a1: [70, 166], a2: [132, 170], w1: [126, 82], w2: [80, 86] }, { h: [100, 87.5], t: -86, a1: [106, 150], a2: [101, 170], w1: [103, 93], w2: [103, 93] }] },
    // Merdiven çıkma: hızlı çık, tırabzan yanında; iniş yavaş
    stairs: { T: 1.8, lin: 1, vb: [0, -32, 200, 218], dw: [1, 1, 0.08], p: [[0, () => '<path d="M0 178.5H60V160H84V142H108V124H132V106H200" stroke-width="3" class="pr" fill="none"/>']], k: [
      { h: [72, 86], t: -84, a1: [90, 134], o1: F, a2: [66, 152], o2: F, w1: [62, 90], w2: [86, 86] },
      { h: [88, 54], t: -86, a1: [90, 134], o1: F, a2: [104, 110], w1: [100, 60], w2: [76, 62] },
      { h: [96, 68], t: -84, a1: [90, 134], o1: F, a2: [114, 116], o2: F, w1: [86, 72], w2: [110, 68] }] },
    // ---------- boks ----------
    // Yumruk plank + omuz dokunma: yumruklar üstünde şınav pozisyonu; kalça sabit, sırayla karşı omza dokunulur
    knuckleplank: { T: 3.2, vb: [0, 70, 200, 116], k: [
      { h: pl([20, 163], -21), t: -21, a1: [20, 163], o1: [3, 9], k1: 0, w1: [148, 169], e1: 0 }, { h: pl([20, 163], -21), t: -21, a1: [20, 163], o1: [3, 9], k1: 0, w1: [138, 126], w2: [148, 169], e2: 0 }, "=0",
      { h: pl([20, 163], -21), t: -21, a1: [20, 163], o1: [3, 9], k1: 0, w1: [148, 169], e1: 0, w2: [140, 124] }] },
    // Torba güç vuruşu: tam boks duruşu; ayak-kalça-omuz-yumruk sırasıyla tek sert kros; gard, 3-5 sn bekle
    powershot: { T: 3.2, p: [BAG(150)], dw: [0.25, 0.4, 1.6], k: [
      { h: [80, 90], t: -84, n: 12, a1: [102, 170], o1: F, a2: [58, 168], o2: BALL, w1: [105, 34], w2: [99, 32] },
      { h: [83, 90], t: -78, n: 10, a1: [102, 170], o1: F, a2: [58, 168], o2: [12, 6], w1: [112, 35], w2: [150, 40] },
      { h: [80, 90], t: -84, n: 12, a1: [102, 170], o1: F, a2: [58, 168], o2: BALL, w1: [105, 34], w2: [99, 32] }] },
    // Torba raundu: hareket halinde, gard korunur; jab-kros serileri
    baground: { T: 1.8, p: [BAG(150)], k: [
      { h: [80, 90], t: -84, n: 12, a1: [102, 170], o1: F, a2: [58, 168], o2: BALL, w1: [105, 34], w2: [99, 32] }, { h: [80, 90], t: -83, n: 12, a1: [102, 170], o1: F, a2: [58, 168], o2: BALL, w1: [141, 36], w2: [99, 32] }, "=0",
      { h: [83, 90], t: -78, n: 10, a1: [102, 170], o1: F, a2: [58, 168], o2: [12, 6], w1: [112, 35], w2: [150, 40] }] },
    // Yumruk yağmuru: torbaya yakın, kısa hızlı düz yumruklar; eller yukarıda
    flurry: { T: 0.7, p: [BAG(138)], k: [
      { h: [86, 90], t: -84, n: 12, a1: [108, 170], o1: F, a2: [66, 168], o2: BALL, w1: [136, 36], w2: [108, 34] }, { h: [87, 90], t: -82, n: 12, a1: [108, 170], o1: F, a2: [66, 168], o2: BALL, w1: [112, 36], w2: [138, 38] }] },
    // Bantlı yumruk: bant sırttan dolanır, uçlar yumruklarda; kros, kalça döner
    bandpunch: { T: 2.4, p: [[1, (J) => LN(J.w2, shp(J.h, J.P.t, -8, -15), 2.5, "pr")]], k: [
      { h: [104, 90], t: -84, n: 12, a1: [126, 170], o1: F, a2: [82, 168], o2: BALL, w1: [129, 34], w2: [123, 32] },
      { h: [107, 90], t: -78, n: 10, a1: [126, 170], o1: F, a2: [82, 168], o2: [12, 6], w1: [136, 35], w2: [174, 40] }, "=0"] },
    // Kablo yumruk: makara arkada omuz hizasında, tutacak arka elde; kros gibi it
    cablepunch: { T: 2.4, p: [[1, (J) => LN(J.w2, [6, 40], 2.5, "pr") + CI([6, 40], 4, "pf")]], k: [
      { h: [104, 90], t: -84, n: 12, a1: [126, 170], o1: F, a2: [82, 168], o2: BALL, w1: [129, 34], w2: [123, 32] },
      { h: [107, 90], t: -78, n: 10, a1: [126, 170], o1: F, a2: [82, 168], o2: [12, 6], w1: [136, 35], w2: [174, 40] }, "=0"] },
    // Köşe barıyla yumruk: barın ucu arka elde omuz önünde; arka ayak döner, bar kros gibi ileri-yukarı itilir
    lmpunch: { T: 2.6, p: [[2, (J) => LN(J.w2, add(J.w2, [118, 140]), 5, "pr") + RING(J.w2, 14, 4)]], k: [
      { h: [96, 90], t: -84, n: 12, a1: [118, 170], o1: F, a2: [74, 168], o2: BALL, w1: [121, 34], w2: [114, 38] },
      { h: [100, 90], t: -76, n: 10, a1: [118, 170], o1: F, a2: [74, 168], o2: [12, 6], w1: [126, 35], w2: [158, 12] }, "=0"] },
    // Sağlık topu göğüs pası: top göğüste; adım atıp duvara hızla fırlat, tut
    mbchest: { T: 2.4, dw: [0.5, 0.25, 0.25, 0.7], p: [wall(186), [2, (J) => CI(J.P.b, 10, "pf")]], k: [
      { h: [96, 87], a1: [100, 170], o1: F, a2: [92, 170], o2: F, w1: [120, 62], b: [126, 60] },
      { h: [104, 88], t: -84, a1: [124, 170], o1: F, a2: [88, 168], o2: BALL, w1: [158, 56], e1: 0, b: [164, 56] },
      { h: [104, 88], t: -84, a1: [124, 170], o1: F, a2: [88, 168], o2: BALL, w1: [158, 56], e1: 0, b: [175, 56] }, "=1"] },
    // Sağlık topu rotasyon atışı (önden): duvara yan; top arka kalçada, arka ayak dönüp kalça patlar, top duvara
    mbrot: { T: 2.6, v: "f", dw: [0.6, 0.25, 0.25, 0.7], p: [wall(190), [2, (J) => CI(J.P.b, 10, "pf")]], k: [
      { h: [96, 96], tl: 50, a1: [80, 170], a2: [118, 170], w1: [60, 104], w2: [70, 104], b: [64, 96] },
      { h: [104, 90], a1: [80, 166], o1: [-2, 6], a2: [118, 170], w1: [150, 64], w2: [160, 64], e1: 0, e2: 0, b: [166, 62] },
      { h: [104, 90], a1: [80, 166], o1: [-2, 6], a2: [118, 170], w1: [150, 64], w2: [160, 64], e1: 0, e2: 0, b: [178, 62] }, "=1"] },
    // Köşe barıyla dönüş (önden): plakalı uç iki elde; yay çizerek bir kalçanın yanına, kalça dönerek karşı tarafa
    lmrot: { T: 3.6, v: "f", pp: 1, p: [[2, (J) => { const q = [(J.w1[0] + J.w2[0]) / 2, (J.w1[1] + J.w2[1]) / 2]; return LN(q, [100, 186], 5, "pr") + RING(q, 14, 4); }]], k: [
      { h: [100, 88], tl: 50, a1: [80, 170], a2: [120, 170], o2: [3, 4], w1: [62, 108], w2: [72, 106] },
      { h: [100, 86.5], a1: [80, 170], a2: [120, 170], w1: [94, 46], w2: [106, 46] },
      { h: [100, 88], tl: 50, a1: [80, 170], o1: [-3, 4], a2: [120, 170], w1: [128, 106], w2: [138, 108] }] },
    // Ağırlıkla oduncu (önden): bir omzun üstünden karşı dizin dışına çapraz; arka ayak döner, hareket kalçadan
    woodchop: { T: 3, v: "f", pp: 1, p: [DBL((J) => [(J.w1[0] + J.w2[0]) / 2, (J.w1[1] + J.w2[1]) / 2])], k: [
      { h: [100, 86], a1: [76, 170], a2: [124, 170], w1: [138, 4], w2: [146, 4], e1: 0, e2: 0 },
      { h: [100, 98], tl: 50, a1: [76, 170], a2: [124, 170], w1: [96, 64], w2: [104, 64], e1: 0, e2: 0 },
      { h: [98, 112], tl: 46, a1: [76, 170], a2: [124, 168], o2: [2, 5], w1: [54, 138], w2: [62, 138], e1: 0, e2: 0 }] },
    // Kablo / bant oduncu (önden): makara yanda omuzun üstünde; kalça ve arka ayak dönerek çapraz aşağı çek
    cablechop: { T: 3, v: "f", pp: 1, p: [[2, (J) => LN([(J.w1[0] + J.w2[0]) / 2, (J.w1[1] + J.w2[1]) / 2], [196, -20], 2.5, "pr")]], k: [
      { h: [100, 86], a1: [76, 170], a2: [124, 170], w1: [138, 4], w2: [146, 4], e1: 0, e2: 0 },
      { h: [100, 98], tl: 50, a1: [76, 170], a2: [124, 170], w1: [96, 64], w2: [104, 64], e1: 0, e2: 0 },
      { h: [98, 112], tl: 46, a1: [76, 170], a2: [124, 168], o2: [2, 5], w1: [54, 138], w2: [62, 138], e1: 0, e2: 0 }] },
    // ---------- kavrama ----------
    // Tek el taşıma: ağırlık tek elde, dik dur, eğilmeden yürü
    suitcase: { T: 1.1, lin: 1, p: [DBL((J) => J.w1)], k: [
      { h: [100, 92], t: -89, a1: [127, 170], a2: [75, 167], w1: [104, 98], w2: [119, 88] }, { h: [100, 87.5], t: -89, a1: [101, 170], a2: [106, 152], w1: [104, 93.5], w2: [102, 93] },
      { h: [100, 92], t: -89, a1: [75, 167], a2: [127, 170], w1: [104, 98], w2: [84, 90] }, { h: [100, 87.5], t: -89, a1: [106, 152], a2: [101, 170], w1: [104, 93.5], w2: [102, 93] }] },
    // İki elde ağırlıkla yürüme: dik, kısa ve hızlı adımlar
    farmer: { T: 0.9, lin: 1, p: [DBL((J) => J.w1), DBL((J) => J.w2)], k: [
      { h: [100, 90], t: -89, a1: [118, 170], a2: [84, 168], w1: [104, 96], w2: [104, 96] }, { h: [100, 87], t: -89, a1: [101, 170], a2: [104, 158], w1: [104, 93], w2: [104, 93] },
      { h: [100, 90], t: -89, a1: [84, 168], a2: [118, 170], w1: [104, 96], w2: [104, 96] }, { h: [100, 87], t: -89, a1: [104, 158], a2: [101, 170], w1: [104, 93], w2: [104, 93] }] },
    // Plaka sıkıştırma: iki plaka birleşik, parmaklar bir yanda başparmak öbür yanda; süre boyunca tut
    pinch: { T: 4, p: [[2, (J) => LN(add(J.w1, [3, -16]), add(J.w1, [3, 18]), 9, "pr") + CI(J.w1, 5, "sk")]], k: [
      { h: [100, 87], a1: [100, 170], o1: F, w1: [104, 92] }, { h: [100, 87.5], a1: [100, 170], o1: F, w1: [104, 92.5] }] },
    // Bilek bükme: oturur, ön kollar uyluklarda avuçlar yukarı; ağırlık parmak uçlarına iner, bilek kıvrılarak kalkar
    wcurl: { T: 2.4, p: [BENCH(30, 96, 136), DBL((J) => J.w1)], k: [
      { h: [70, 122], t: -62, n: 15, q1: [112, 122], a1: [112, 170], o1: F, j1: [90, 112], w1: [121, 122] }, { h: [70, 122], t: -62, n: 15, q1: [112, 122], a1: [112, 170], o1: F, j1: [90, 112], w1: [119, 105] }] },
    rwcurl: { T: 2.4, p: [BENCH(30, 96, 136), DBL((J) => J.w1)], k: [
      { h: [70, 122], t: -62, n: 15, q1: [112, 122], a1: [112, 170], o1: F, j1: [90, 112], w1: [121, 121] }, { h: [70, 122], t: -62, n: 15, q1: [112, 122], a1: [112, 170], o1: F, j1: [90, 112], w1: [119, 107] }] },
  };
  // İp: eller etrafında dönen bir halka; ön yarıda vücudun önünde, arka yarıda arkasında çizilir
  function rope(J, ph, front) {
    const th = (-90 + 360 * ph) * R, P = [100 + 46 * Math.cos(th), 90 + 89 * Math.sin(th)];
    if ((Math.cos(th) > 0) !== front) return "";
    const a = J.w1, d = [P[0] - a[0], P[1] - a[1]], m = Math.hypot(d[0], d[1]) || 1, nrm = [-d[1] / m, d[0] / m], c = add(a, d, 1.33), w = 0.5 * m;
    return '<path d="M' + pt(a) + "C" + pt(add(c, nrm, w)) + " " + pt(add(c, nrm, -w)) + " " + pt(a) + '" stroke-width="2" class="pr"/>';
  }
  A.runint = A.stride; A.shadowround = A.golge; // aynı hareket: koşu intervali = açılma koşusu, gölge boks raundu = gölge boks
  for (const id in A) {
    const an = A[id];
    an.vb = an.vb || [0, -2, 200, 186];
    if (an.k) {
      const K = [], W = [0]; an.k.forEach((k) => K.push(typeof k === "string" ? K[+k.slice(1)] : norm(k, an.v === "f"))); an.K = K;
      if (an.dw) { an.dw.forEach((w) => W.push(W[W.length - 1] + w)); an.W = W; } // dw: her evrenin süre ağırlığı (k ile aynı uzunlukta)
    }
  }
  const css = document.createElement("style");
  const L = "--an-t:#B4B0A5;--an-t2:#9B978C;--an-b:#5C5B57;--an-b2:#45443F;--an-s:#D2A07A;--an-sh:#2E2D2A;--an-p:#8A8A93;--an-fl:#E4E4E7";
  const Dk = "--an-t:#CBC7BC;--an-t2:#A29E94;--an-b:#77766F;--an-b2:#5B5A54;--an-s:#D6A47E;--an-sh:#55544F;--an-p:#8A8A93;--an-fl:#2E2F33";
  css.textContent = ":root{" + L + "}@media (prefers-color-scheme: dark){:root:not([data-theme=\"light\"]){" + Dk + "}}:root[data-theme=\"dark\"]{" + Dk + "}" +
    ".an{display:block;width:170px;max-width:100%;height:auto;margin:4px auto 0;overflow:hidden}#player .an{width:140px}@media (max-height:760px){#player .an{width:100px}}@media (max-height:700px){#player .an{display:none}}.sheet .an{width:190px;margin:12px auto 4px}.an line,.an path{stroke-linecap:round;fill:none}" +
    ".an .t,.an .tp{stroke:var(--an-t)}.an .tp{fill:var(--an-t);stroke-width:12;stroke-linejoin:round}.an .t2{stroke:var(--an-t2)}.an .b{stroke:var(--an-b)}.an .b2{stroke:var(--an-b2)}" +
    ".an .sk{fill:var(--an-s)}.an .sh{stroke:var(--an-sh)}.an .pr{stroke:var(--an-p)}.an .pf{fill:var(--an-p)}.an .fl{stroke:var(--an-fl)}.an rect.pr{fill:none}";
  document.head.appendChild(css);
  // Tek döngü: sayfadaki bütün canlandırmalar (~30 kare/sn); sayfada canlandırma kalmayınca durur. "Hareketi azalt" açıksa ana duruş sabit çizilir.
  const RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let run = false, fr = 0;
  function loop(now) {
    const els = document.querySelectorAll("svg.an[data-x]");
    if (!els.length) { run = false; return; }
    if (!(fr++ & 1)) els.forEach((el) => { const an = A[el.dataset.x]; if (an) el.innerHTML = body(an, (now / 1000 / an.T) % 1); });
    requestAnimationFrame(loop);
  }
  const still = (an) => (an.K && an.K.length > 1 ? (an.pp ? 0.5 : 1 / an.K.length) : 0.25);
  window.TK_ANIM = {
    has: (id) => !!A[id],
    ids: () => Object.keys(A),
    html(id, ph) {
      const an = A[id]; if (!an) return "";
      if (!run && !RM && ph == null) { run = true; requestAnimationFrame(loop); }
      return '<svg class="an"' + (ph == null && !RM ? ' data-x="' + id + '"' : "") + ' viewBox="' + an.vb.join(" ") + '" role="img" aria-label="Hareketin canlandırması">' + body(an, ph != null ? ph : RM ? still(an) : 0) + "</svg>";
    },
  };
})();

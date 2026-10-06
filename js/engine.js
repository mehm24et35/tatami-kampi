// Program motoru: cevaplar (A) → kişiye özel 13 haftalık plan. Kural tabanlı, tamamen cihazda çalışır.
(function (root) {
"use strict";
const LIB = root.LIB || require("./lib.js");
const EX = LIB.EX;
const VERSION = 15; // değişince kayıtlı programlar cevaplardan yeniden üretilir

const DAYS = [
  { k: "pzt", n: "Pazartesi", s: "Pzt" }, { k: "sal", n: "Salı", s: "Sal" }, { k: "car", n: "Çarşamba", s: "Çar" },
  { k: "per", n: "Perşembe", s: "Per" }, { k: "cum", n: "Cuma", s: "Cum" }, { k: "cmt", n: "Cumartesi", s: "Cmt" }, { k: "paz", n: "Pazar", s: "Paz" },
];
const GOALS = {
  yag: "Kilo vermek / yağ yakmak", kas: "Kas kazanmak", kuvvet: "Kuvvet", kondisyon: "Kondisyon / dayanıklılık",
  esneklik: "Esneklik ve hareket özgürlüğü", kalistenik: "Kalistenik (barfiks, şınav, paralel bar)", amut: "Amut (ellerin üstünde durma)",
  patlayici: "Hız ve patlayıcı güç (sıçrama, sprint)", dovus: "Dövüş sporu gücü (yumruk, tekme)", kavrama: "Kavrama ve bilek gücü", saglik: "Genel sağlık ve formda kalmak",
};
const PARQ = [
  "Doktorun hiç kalp rahatsızlığın ya da yüksek tansiyonun olduğunu söyledi mi?",
  "Dinlenirken, günlük işlerde ya da egzersizde göğüs ağrısı hissediyor musun?",
  "Son 12 ayda baş dönmesi yüzünden dengeni kaybettin ya da bilincini kaybettin mi?",
  "Kalp ya da tansiyon dışında kronik bir hastalık tanın var mı (diyabet, astım, epilepsi gibi)?",
  "Kronik bir hastalık için düzenli ilaç kullanıyor musun?",
  "Fiziksel aktiviteyle kötüleşebilecek bir kemik, eklem, kas, tendon ya da bağ sorunun var mı (son 12 ay)?",
  "Doktorun sana sadece gözetim altında egzersiz yapmanı söyledi mi?",
];

// ---------------- yardımcılar ----------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uniq = (a) => [...new Set(a)];
// Testte gerçekçi üst sınırlar (varsayım, bilgi/antrenman-bilimi.md): dışındaki değer yazım hatası sayılır, yok sayılır
const TEST_MAX = { pushup: 150, pullup: 60, plank: 900, run: 3 };
// 5RM (kg) gerçekçi aralığı (varsayım, bilgi/antrenman-bilimi.md): dışındaki değer yazım hatası sayılır, yok sayılır; arayüz girişte aynı sınırlarla sorar
const RM_MIN = 10, RM_MAX = { squat: 300, dl: 350, bench: 250 };
const REP_CAP = 25; // vücut ağırlığıyla itişte tek setteki en fazla tekrar; üstü daha zor varyasyon

// ---------------- giriş soruları (bilgi/sorular.md; etkiler bilgi/antrenman-bilimi.md › Giriş soruları) ----------------
// Hamilelikte sırtüstü / yüzüstü yatılan ve karın içi basıncı artıran yoğun hareketler yok (esneklik rutinleri dahil)
const PREG_NO = ["hollow", "deadbug", "mcgill", "hkr", "burpee", "sprawl", "mountain", "kbswing", "dbswing", "mbslam", "bikesprint",
  "floorpress", "dbbench", "bench", "bbskull", "gbridge", "sbridge", "bridge", "dbbridge", "bandbridge", "hipthrust", "slidecurl", "superman", "ytw", "bridgeF", "wallstraddle"];
// Barla öğrenilmesi gereken kaldırışlar: A.lifts'te yoksa Faz 1'de girmez, Faz 2'den itibaren hafif yükle teknik öğrenme (eski cevaplarda hepsi öğrenilmiş sayılır)
const LIFT_OF = { backsquat: "squat", frontsquat: "squat", zercher: "squat", dl: "dl", bench: "bench", ohp: "ohp" }, ALL_LIFTS = ["squat", "dl", "bench", "ohp"];
// Kemik erimesi: yük altında omurgayı öne bükme ve döndürme yok
const FLEX_LOAD = ["hollow", "hkr", "mbslam", "woodchop", "cablechop", "lmrot", "mbrot", "pikefold", "pancake"];
// Doğum sonrası ilk 12 hafta: core yalnız nazik hareketler (POST_CORE dışındaki core kalıbı yok), karın içi basıncı artıran kondisyon yok
const POST_CORE = ["deadbug", "birddog"], POST_NO = ["mountain", "sprawl", "burpee", "kbswing", "dbswing", "mbslam", "knuckleplank"];
// "Yere yatıp kalkmak zor" tercihi: yerde yatarak, dizüstü ya da ellerle yere basarak yapılan hareketler
const FLOOR = ["kedi", "wgs", "bilek", "ytw", "mcgill", "birddog", "superman", "gbridge", "sbridge", "bridge", "dbbridge", "bandbridge", "hipthrust", "slidecurl", "floorpress",
  "pushup", "kpushup", "exppush", "archer", "diamond", "kneepush", "pike", "hspuneg", "wallwalk", "ctw", "kickup", "pikehold", "wallpike", "hollow", "plank", "sideplank", "deadbug",
  "mountain", "knuckleplank", "sprawl", "burpee", "revnordic", "bbskull", "hkpress", "cablepd", "bandpd", "couch", "pigeon", "frog", "butterfly", "childlat", "thread", "sleeper",
  "bridgeF", "lizard", "halfsplit", "frontsplit", "pancake", "wallstraddle", "f9090"];
// Sessiz ortam (apartman, üst kat): sıçrama, ip ve çarpma sesi çıkaran hareketler yok; dışarıda yapılanlar ve sessiz darbeli hareketler serbest
const QUIET_OK = ["mountain", "exppush", "snap", "wall_drill"];
const noisy = (e) => e.id === "mbslam" || ((e.imp || 0) >= 1 && !QUIET_OK.includes(e.id) && !e.eq.some((alt) => alt.includes("outdoor")));
// Kardiyo tercihi → kondisyon bloğunda öne alınan hareketler (sırayla; alet yoksa sıradaki)
const CARDIO_PREF = { yuru: ["walkint", "bikeint", "stairs", "march"], kos: ["runint", "bikeint", "stairs"], ip: ["ip", "bikeint"] };
const num = (v, lo, hi) => { const x = +String(v == null ? "" : v).replace(",", "."); return Number.isFinite(x) && x >= lo && x <= hi ? x : null; };
// Sabit dambıl çiftleri: "4 6 8 10" ya da "2,5 5 7,5" (boşluk / noktalı virgül ayırır, virgül ondalık; yalnız virgül varsa ayırıcı sayılır) → sıralı tekil kg listesi
function kgList(s) { s = String(s == null ? "" : s).trim(); if (!s) return []; let t = s.split(/[;\s]+/); if (t.length === 1 && s.includes(",")) t = s.split(","); return uniq(t.map((v) => num(v, 0.5, 100)).filter((v) => v != null)).sort((a, b) => a - b); }
const monOf = (iso) => { const d = new Date(String(iso) + "T00:00:00"); if (isNaN(d)) return null; const js = d.getDay(); d.setDate(d.getDate() + (js === 0 ? -6 : 1 - js)); return d; };
// Etkinlik / müsabaka tarihi → program haftası (1-12). Ara haftalar (settings.pauses) motorda bilinmez; varsayım: yok. Aralık dışı → null (dikkate alınmaz).
function eventWeek(A) { const a = A && A.start ? monOf(A.start) : null, b = A && A.event ? monOf(A.event) : null; if (!a || !b) return null; const w = Math.round((b - a) / 6048e5); return w >= 1 && w <= 12 ? w : null; }
const phaseOfWeek = (w) => (w % 4 === 0 ? null : w <= 3 ? ["F1", w - 1] : w <= 7 ? ["F2", w - 5] : ["F3", w - 9]); // test haftaları zaten hafif

// ---------------- aletler ----------------
// Eski "gym" kalemi (tek kalemde tüm makineler) ve eski "Spor salonunda" cevabının otomatik eklediği aletler.
// A.eqV >= 2: alet listesi yeni kalemlerle tek tek soruldu, A.eq tam liste; hiçbir şey eklenmez (varsayım yok).
const GYM_EQ = ["cable", "latmach", "lpmach", "legmach", "pressmach"];
const GYM_DEFAULT = ["db", "barbell", "rack", "bench", "cardio", "pullbar", "kb", "box"].concat(GYM_EQ);
// Alet listesi yeni kalemlerle bir kez yeniden sorulmalı mı: salon (makineler), bant (bağlama yeri), bar (landmine) sahipleri
const eqLegacy = (A) => !(A.eqV >= 2) && (A.place === "spor" || ["gym", "band", "barbell"].some((k) => (A.eq || []).includes(k)));
function expandEq(A) {
  const eq = new Set(["none"]), v2 = A.eqV >= 2;
  (A.eq || []).forEach((k) => (k === "gym" ? (v2 ? [] : GYM_EQ) : [k]).forEach((x) => eq.add(x)));
  if (A.place === "spor" && !v2) GYM_DEFAULT.forEach((k) => eq.add(k));
  if (A.outdoor) eq.add("outdoor");
  return eq;
}

// ---------------- profil ----------------
function profile(A) {
  const age = +A.age || 30, h = +A.height || 175, w = +A.weight || 75;
  const bmi = w / Math.pow(h / 100, 2);
  const eq = expandEq(A);
  // Sağlık durumları (A.cond), doğum sonrası (A.postp), tercihler (A.dislike), ortam (A.env): bilgi/sorular.md
  const cond = new Set(A.cond || []), dislike = new Set(A.dislike || []), env = new Set(A.env || []);
  const bp = cond.has("tansiyon"), asthma = cond.has("astim"), diab = cond.has("seker"), osteo = cond.has("kemik"), arth = cond.has("artrit"), fall = cond.has("denge");
  // injA: kişinin işaretlediği eklemler (metinler için); eklem romatizmasında her eklem en az "geçmiş" sayılır (en yüklü varyasyon yok, koruyucu ısınma)
  const injA = {}, inj = {};
  Object.keys(LIB.JOINTS).forEach((j) => { const v = A.inj && A.inj[j]; injA[j] = v === "agri" ? 2 : v === "gecmis" ? 1 : 0; inj[j] = arth ? Math.max(injA[j], 1) : injA[j]; });
  const preg = A.sex === "k" && !!A.preg;
  const postp = A.sex === "k" && !preg && ["0-6", "6-12", "12-24"].includes(A.postp) ? A.postp : ""; // doğum sonrası kaçıncı hafta (aralık)
  // PAR-Q'da "evet" olsa da doktor onayı ve kontrol altındaki durum temkinli modu kaldırır (65+, hamilelik ve doğum sonrası ilk 6 hafta hariç)
  const parqYes = (A.parq || []).some(Boolean), medOK = parqYes && !!A.parqOK;
  const cautious = (parqYes && !medOK) || age >= 65 || preg || postp === "0-6";
  // Deneyim: yeni sorular (süre + son 3 ay sıklığı + türler); eski kayıtlar için exp/gap
  const expBase = { yok: 1, az: 1, orta: 2, cok: 3 }[A.yil || A.exp] || 1;
  let L = expBase;
  if (A.freq === "0" || (!A.freq && A.gap === "uzun")) L -= expBase > 1 ? 1 : 0;
  if (A.freq === "1-2" && L === 3) L = 2;
  const t = A.tests || {};
  const given = (k) => t[k] !== "" && t[k] != null;
  const n = (k) => { const x = given(k) ? +t[k] : NaN; return x >= 0 && x <= TEST_MAX[k] ? x : null; };
  const pushN = n("pushup"), pullN = n("pullup"), plankN = n("plank"), runCap = n("run");
  const badTests = ["pushup", "pullup", "plank"].filter((k) => given(k) && n(k) == null).map((k) => [k, t[k]]);
  if (pushN != null && pushN < 10) L = Math.min(L, 1);
  if (pushN != null && pushN >= 30 && (pullN == null || pullN >= 8) && expBase >= 2) L = Math.max(L, 3);
  // Testler iyiyse başlangıç seviyesinden çık (yeniden ayarlamada önemli)
  if (L === 1 && pushN != null && pushN >= 15 && (plankN == null || plankN >= 45) && (pullN == null || pullN >= 3)) L = 2;
  if (plankN != null && plankN < 30) L = Math.min(L, 1);
  if (postp === "6-12") L = Math.min(L, 1); // doğum sonrası 6-12. hafta: temel seviye, darbe yok
  if (cautious) L = 1;
  L = clamp(L, 1, 3);
  const bg = new Set(A.bg || []);
  // Ağırlık geçmişi yoksa ana kaldırışlarda en temel varyasyonlar; kondisyon seviyesi kesintisiz yürüyüş/koşu cevabından
  const liftL = A.bg && !bg.has("agirlik") ? Math.min(L, 1) : L;
  const condL = cautious ? 1 : runCap != null ? clamp(runCap, 1, 3) : L;
  const pushLvl = pushN == null ? (cautious || L === 1 ? 0 : L - 1) : pushN < 5 ? 0 : pushN < 15 ? 1 : pushN < 30 ? 2 : 3;
  const pullLvl = !eq.has("pullbar") ? 0 : pullN == null ? Math.max(0, L - 1) : pullN === 0 ? 0 : pullN < 5 ? 1 : pullN < 12 ? 2 : 3;
  // darbe sınırı faz başına [H0/F1, F2, F3]
  let imp = L >= 3 ? [2, 3, 3] : L === 2 ? [2, 2, 3] : [1, 2, 2];
  if (bmi >= 30) imp = [1, 1, 2];
  if (bmi >= 35) imp = [1, 1, 1];
  if (age >= 50) imp = imp.map((v) => Math.min(v, 2));
  if (runCap === 0) imp = imp.map((v) => Math.min(v, 1));
  if (runCap >= 2 && bmi < 30 && age < 50) imp = imp.map((v, i) => Math.max(v, i ? 2 : 1));
  if (inj.knee === 2 || inj.ankle === 2 || inj.back === 2) imp = [1, 1, 1];
  if (inj.knee === 1 || inj.ankle === 1) imp = imp.map((v) => Math.min(v, 2));
  if (osteo || arth || postp === "12-24") imp = imp.map((v) => Math.min(v, 1)); // kemik erimesi, eklem romatizması, doğum sonrası 3-6. ay: en fazla hafif darbe
  if (fall || postp === "6-12" || dislike.has("sicrama")) imp = [0, 0, 0]; // denge / düşme riski, doğum sonrası 6-12. hafta, "sıçrama istemiyorum"
  if (cautious) imp = [0, 0, 0];
  if (medOK) imp = imp.map((v) => Math.min(v, 2));
  // Çıkarılan hareketler ve nedeni (swapBlocked gösterir): kullanıcının çıkardıkları, hamilelik, kemik erimesi, doğum sonrası, "yere yatmak zor", hafif bant
  const avoid = new Set(A.avoid || []), why = {};
  const ban = (ids, w) => ids.forEach((id) => { if (EX[id]) { avoid.add(id); if (!why[id]) why[id] = w; } });
  if (preg) ban(PREG_NO, "Hamilelikte bu hareket programa girmez (sırtüstü/yüzüstü ya da karın içi basıncı artıran).");
  if (osteo) ban(FLEX_LOAD, "Kemik erimesi: yük altında omurgayı öne bükmek ya da döndürmek yok.");
  if (postp && postp !== "12-24") ban(Object.keys(EX).filter((id) => EX[id].pat.includes("core") && !POST_CORE.includes(id)).concat(POST_NO), "Doğum sonrası ilk 12 hafta: karın içi basıncı artıran hareket yok; karın ve gövde nazik hareketlerle.");
  if (dislike.has("yerde")) ban(FLOOR, "Yere yatarak ya da dizüstü yapılan hareketleri istemedin.");
  const bands = new Set(A.bands || []), bandLight = Array.isArray(A.bands) && bands.size > 0 && !bands.has("orta") && !bands.has("sert"); // yalnız hafif bant
  if (bandLight) ban(["bandpull"], "Yardımlı barfiks için en az orta sertlikte bant gerekir.");
  const avoidPat = new Set(dislike.has("basustu") ? ["vpush", "skill_hs"] : []); // "baş üstü itiş istemiyorum": kalıp hiç gelmez, yatay itişe düşülür
  // Kilo verme yok (K1): 18 yaş altı (büyüme çağı, yetişkin BMI eşiği de uygulanmaz), hamilelik, doğum sonrası ilk 6 ay.
  // "Kilo vermek" hedefi kondisyon olarak alınır: kalori açığı, hedef kilo süresi ve "Yağ Yakımı" günü yok.
  const noLoss = age < 18 || preg || !!postp;
  let goals = uniq((A.goals || []).filter((g) => GOALS[g]));
  const yagOff = noLoss && goals.includes("yag");
  if (yagOff) goals = uniq(goals.map((g) => (g === "yag" ? "kondisyon" : g)));
  if (!goals.length) goals.push(bmi >= 27 && !noLoss ? "yag" : "saglik");
  const days0 = DAYS.map((d) => d.k).filter((k) => (A.days || []).includes(k)), days = days0.length >= 2 ? days0 : ["pzt", "car", "cmt"];
  let scheme = firstOf(goals, { kuvvet: "kuvvet", kas: "kas", yag: "genel", kondisyon: "genel", saglik: "genel" }) || (goals.includes("kalistenik") ? "genel" : "genel");
  if (bp && scheme === "kuvvet") scheme = "kas"; // yüksek tansiyon: ağır düşük tekrar şeması (nefes tutmalı) yok, 6-12 tekrar
  // Kısa günler: A.shortDays o günlerin süresi A.shortMins (seçili ve normal süreden kısa olanlar)
  const mins = +A.mins || 60, short = {};
  if (days.length >= 3) (A.shortDays || []).forEach((dk) => { const m = num(A.shortMins, 15, 90) || 20; if (days.includes(dk) && m < mins) short[dk] = m; }); // 2 günde kısa gün yok: testler tek güne yığılırdı
  // Dambıl: sabit çiftler listesi (dbList) ya da ayarlanabilir en ağır (dbMaxKg) + en küçük artış (dbStep); eski cevaplar: "5 kg'a kadar" → 5, "6-15 kg" → 15, diğerleri bilinmiyor
  const dbList = kgList(A.dbList), dbKnown = A.place !== "spor" && eq.has("db");
  const dbMax = dbKnown ? (dbList.length ? dbList[dbList.length - 1] : num(A.dbMaxKg, 1, 100) || { hafif: 5, orta: 15 }[A.dbMax] || null) : null;
  const dbStep = dbKnown && !dbList.length ? num(A.dbStep, 0.25, 10) : null;
  // Halter: barın ağırlığı (başlangıç kilosu barın altına inmez) ve en küçük plaka (adım = 2 plaka)
  const barKg = eq.has("barbell") ? num(A.barKg, 5, 30) : null, plateMin = eq.has("barbell") ? num(A.plateMin, 0.25, 10) : null;
  // "Kalıcı" alternatif: A.swap = { eskiId: yeniId } (eski ayrıca A.avoid'da). swapTo: yeni → yerine geçtiği eskiler (kalıbı ve slotu devralır)
  const swap = A.swap || {}, swapTo = {};
  Object.keys(swap).forEach((old) => { if (swap[old]) (swapTo[swap[old]] = swapTo[swap[old]] || []).push(old); });
  // 5RM denetimi: sayı değil, 10 kg altı ya da kaldırışın tavanı üstü → yok sayılır, özette söylenir (2. döngüde kayıttan gelen değer de buradan geçer)
  const rm = {}, badRm = [];
  Object.keys(RM_MAX).forEach((k) => { const v = (A.rm || {})[k]; if (v === "" || v == null) return; const x = +String(v).replace(",", "."); if (Number.isFinite(x) && x >= RM_MIN && x <= RM_MAX[k]) rm[k] = x; else badRm.push([k, v]); });
  return {
    age, sex: A.sex === "k" ? "k" : "e", h, w, bmi, goalW: +A.goalWeight || null, noLoss, yagOff, cautious, preg, medOK, L, expBase, liftL, condL: asthma ? Math.min(condL, 2) : condL, runCap, pushN, pullN, plankN, badTests, pushLvl, pullLvl, imp, eq, inj, injA, goals, avoid, why, avoidPat,
    rm, badRm, dbLight: dbMax != null ? dbMax <= 5 : A.dbMax === "hafif", lowSleep: A.sleep === "az", highStress: A.stress === "cok", lowRec: A.sleep === "az" || A.stress === "cok", act: A.act || "",
    dbMax, dbStep, dbList, barKg, barStep: plateMin ? plateMin * 2 : null, bandLight, // ağırlık önerisi ve başlangıç kilosu için (summary'ye de yazılır)
    bp, asthma, diab, osteo, arth, fall, postp, postpEarly: !!postp && postp !== "12-24", quiet: env.has("sessiz"), narrow: env.has("dar"), morning: A.tod === "sabah", cardioPref: CARDIO_PREF[A.cardio] || [], noJump: dislike.has("sicrama"), floorNo: dislike.has("yerde"),
    gates: new Set([A.cardio === "yuru" ? "walk" : A.cardio === "kos" ? "run" : ""].concat(dislike.has("yerde") ? ["floor"] : []).filter(Boolean)), // lib `gate`: yalnız bu cevaplarla gelen hareketler
    learned: Array.isArray(A.lifts) ? new Set(A.lifts) : new Set(ALL_LIFTS), evWeek: eventWeek(A), short,
    prefer: new Set(Object.values(swap).filter(Boolean)), swapTo, userAvoid: new Set(A.avoid || []), cycle: +A.cycle || 1, focus: A.focus || "",
    days, mins, home: A.home !== false, outdoor: !!A.outdoor, scheme,
    sprintOK: !cautious && !fall && (eq.has("outdoor") || eq.has("cardio")),
  };
}
function firstOf(goals, map) { for (const g of goals) if (map[g]) return map[g]; return null; }
const has = (P, g) => P.goals.includes(g);

// ---------------- hareket seçimi ----------------
function eqOK(ex, P) { return ex.eq.some((alt) => alt.every((k) => k === "none" || P.eq.has(k))); }
// Kilo yazılacak bir yük aleti (dambıl, kettlebell, bar, makine, sağlık topu) var mı? Yoksa hareket vücut ağırlığıyla yapılır, sadece tekrar sorulur.
const LOAD = new Set(["db", "kb", "barbell", "medball"].concat(GYM_EQ));
function loaded(ex, P) { return ex.eq.some((alt) => alt.some((k) => LOAD.has(k)) && alt.every((k) => k === "none" || P.eq.has(k))); }
function injOK(ex, P) {
  for (const j in ex.st) { const s = P.inj[j] || 0, v = ex.st[j]; if ((s === 2 && v >= 2) || (s === 1 && v >= 3)) return false; }
  return true;
}
function bwOnly(ex) { return ex.eq.some((alt) => alt.every((k) => ["none", "pullbar", "dip", "rings", "band", "anchor", "box"].includes(k))); }
// Ortam ve tercih süzgeci: sessiz ortamda gürültülü hareket yok, dar alanda taşıma / merdiven drili yok, istenmeyen kalıp (baş üstü) yok
const prefOK = (ex, P) => !(P.quiet && noisy(ex)) && !(P.narrow && (ex.pat.includes("carry") || ex.id === "ladder")) && !ex.pat.some((q) => P.avoidPat.has(q)) && (!ex.gate || P.gates.has(ex.gate)); // gate: yalnız o cevapla gelen hareket (lib)
const liftOK = (ex, P, pi) => !(pi === 0 && LIFT_OF[ex.id] && !P.learned.has(LIFT_OF[ex.id])); // öğrenilmemiş bar kaldırışı Faz 1'de yok, Faz 2'den itibaren teknik öğrenme
const FULL_PUSH = ["pushup", "kpushup", "exppush", "archer"];
function lvlFor(pat, P, pi) {
  // Faz 3'te bir üst itiş seviyesi: şınav testi biliniyorsa en az 20 şınav gerekir (15 şınavla okçu şınavına geçilmez)
  if (pat === "hpush") return clamp(Math.max(1, P.pushLvl) + (pi >= 2 && (P.pushN == null || P.pushN >= 20) ? 1 : 0), 1, 3);
  if (pat === "vpull") return clamp(P.pullLvl + (pi >= 1 ? 1 : 0), 1, 3);
  if (["squat", "hinge", "lunge", "vpush"].includes(pat)) return P.liftL;
  return P.L;
}
function candidates(pat, P, pi, o) {
  o = o || {};
  const L = o.L || lvlFor(pat, P, pi), impMax = P.imp[Math.min(pi, 2)];
  // Kişinin "Kalıcı" seçimi (A.swap): seviye kapısına, vücut ağırlığı tercihine ve slot listesine takılmaz, yerine geçtiği hareketin kalıbını devralır.
  // Alet, sakatlık, darbe, hamilelik ve temkinli-şınav kuralları aynen (swapBlocked bunların sebebini verir).
  const chosen = (e) => P.prefer.has(e.id), replaces = (e, pred) => chosen(e) && (P.swapTo[e.id] || []).some((old) => EX[old] && pred(EX[old]));
  const base = Object.values(EX).filter((e) => (e.pat.includes(pat) || replaces(e, (x) => x.pat.includes(pat))) && eqOK(e, P) && injOK(e, P) && (e.imp || 0) <= impMax && prefOK(e, P) && liftOK(e, P, pi) && (!o.bw || bwOnly(e) || replaces(e, bwOnly)) && !(o.avoid && o.avoid.has(e.id)) && !P.avoid.has(e.id) && (!o.only || o.only.includes(e.id) || replaces(e, (x) => o.only.includes(x.id))) && !(o.noRound && e.pat.includes("box_round")));
  // Başlangıçta, temkinli kişilerde ve doğum sonrası ilk 12 haftada tam şınav yok (eğimli / dizüstü ile başlanır); bilinçli seçim başlangıç kapısını aşar, temkinli kuralını aşmaz
  const noFull = pat === "hpush" && (P.cautious || P.postpEarly || (P.pushLvl === 0 && pi === 0));
  const base2 = noFull ? base.filter((e) => (chosen(e) && !P.cautious && !P.postpEarly) || !FULL_PUSH.includes(e.id)) : base;
  // wide (hareket değiştirme): kişinin seviyesini aşmayan her şey; daha kolay seçenek de alternatiftir
  let list = o.wide ? [] : base2.filter((e) => chosen(e) || (e.lv[0] <= L && L <= e.lv[1]));
  if (!list.length) list = base2.filter((e) => e.lv[0] <= L);
  if (!list.length) list = base2.slice();
  const anyLoaded = list.some((e) => loaded(e, P)); // yük aleti olan kalıpta vücut ağırlığı merdiveni (okçu şınavı, pistol) ağırlıklı hareketin önüne geçmez
  const score = (e) => {
    let s = e.pr;
    for (const j in e.st) s -= 1.5 * (P.inj[j] || 0) * e.st[j];
    if (has(P, "dovus") && e.id === "kpushup") s += 2;
    if (o.prefer && o.prefer.includes(e.id)) s += 4 - o.prefer.indexOf(e.id) * 0.5;
    if (P.prefer.has(e.id)) s += 20; // kullanıcının değiştirip seçtiği hareket her zaman önde
    if (pat === "cond" && P.cardioPref.includes(e.id)) s += 10 - P.cardioPref.indexOf(e.id); // kardiyo tercihi (yürüyüş / koşu / ip) kondisyonda önde
    if (o.bw && e.eq.every((alt) => alt.includes("none"))) s += 0.5;
    if (L >= 2 && !anyLoaded && !loaded(e, P)) s += 0.75 * (L - 1) * (e.lv[0] - 1);
    if (pat === "hpush" && P.pushLvl === 0 && pi === 0 && e.id === "inclinepush") s += 5;
    if (pat === "hpush" && P.pushLvl === 0 && (pi === 1 || (P.cautious && pi >= 1)) && e.id === "kneepush") s += 5;
    return s;
  };
  return list.sort((a, b) => score(b) - score(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)); // eşit puanda id sırası: yerelden bağımsız, deterministik
}
// Hareket değiştirme (ikame) seçenekleri, en uygunu önce. Sıra bilgi/antrenman-bilimi.md: kalıp → tek/çok eklem → kasın başlangıç boyu (len) → direnç tipi → seviyeye uyum.
// Aleti olmayan, sakatlığa ya da kaçınma listesine takılan, kişinin seviyesini aşan hareket gelmez (candidates süzer). Döner: LIB.EX kayıtları dizisi (id hariç).
// Aynı kalıpta 3'ten az seçenek varsa en yakın kalıba da bakılır (SWAP_FB; sıralamada sona düşer).
const SINGLE_PAT = ["arm_flex", "arm_ext", "delt", "quad_iso", "calf"], SINGLE_ID = ["legcurl", "slidecurl", "bandlegcurl", "wcurl", "rwcurl", "revcurl", "lever"];
const single = (e) => SINGLE_ID.includes(e.id) || e.pat.some((q) => SINGLE_PAT.includes(q));
const resist = (e, P) => (loaded(e, P) ? "yuk" : e.eq.some((alt) => alt.includes("band") && alt.every((k) => P.eq.has(k))) ? "lastik" : "vucut");
const SWAP_FB = { vpull: ["hpull"], hpull: ["vpull", "prehab_sh"], vpush: ["hpush"], upow: ["hpush"], box_pow: ["upow", "rot"], rot: ["core_lat"], quad_iso: ["squat"], lunge: ["squat"],
  arm_ext: ["hpush"], arm_flex: ["hpull"], delt: ["vpush", "prehab_sh"], prehab_ankle: ["lunge"], prehab_pf: ["prehab_back"], sprint: ["sprint_drill", "plyo"], sprint_drill: ["plyo"], z2: ["warm_cardio"], warm_box: ["box_round", "warm_cardio"] };
// pi: içinde bulunulan faz (0 Faz 1 / alışma, 1 Faz 2 / test, 2 Faz 3); darbe sınırı o faza göre. Verilmezse Faz 2.
function swapOptions(id, P, pi) {
  const ex = EX[id]; if (!ex) return [];
  const own = ex.pat.filter((q) => !/^(warm|mob|z2)/.test(q));
  const pats = own.length ? own : ex.pat.filter((q) => q !== "mob"), main = pats[0], seen = new Set([id]), out = []; // esneme (mob) hareketlerine alternatif yok
  const add = (q) => candidates(q, P, pi == null ? 1 : pi, { wide: true }).forEach((e) => { if (!seen.has(e.id)) { seen.add(e.id); out.push(e); } });
  pats.forEach(add);
  if (out.length < 3) pats.forEach((q) => (SWAP_FB[q] || []).forEach(add));
  const L = lvlFor(main, P, 1);
  const res0 = eqOK(ex, P) ? resist(ex, P) : resist(ex, { eq: new Set(ex.eq[0].concat("none")) }); // kişinin yapamadığı hareket: kendi aletiyle
  const calm = P.bp || P.cautious || P.age >= 60; // tansiyon, temkinli, 60+: savurma/çarpma (balistik) alternatifler en sona
  const rank = (e) => [
    calm && (e.pat.includes("power_low") || e.id === "mbslam") ? 1 : 0,
    e.pat[0] === main ? 0 : e.pat.includes(main) || pats.includes(e.pat[0]) ? 1 : 2,
    single(e) === single(ex) ? 0 : 1,
    !ex.len || e.len === ex.len ? 0 : e.len ? 2 : 1,
    resist(e, P) === res0 ? 0 : 1,
    !e.uni === !ex.uni ? 0 : 1, // tek kol / tek bacak yerine yine tek taraflı
    e.lv[0] <= L && L <= e.lv[1] ? 0 : 1,
  ];
  const key = new Map(out.map((e) => [e.id, rank(e)]));
  return out.sort((a, b) => { const x = key.get(a.id), y = key.get(b.id); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; }); // eşitlikte candidates sırası (puan) korunur
}
// "Kalıcı" seçim engeli: seçilen hareket alet, kaçınma/hamilelik, sakatlık, darbe (faz) ya da temkinli-şınav kuralını ihlal ediyorsa sebep metni (arayüz gösterir), uygunsa null.
// Uygunsa generate(A2) o hareketi, yerine geçtiği hareketin slotunda ve o fazda getirir (seviye kapısı yok). pi: swapOptions ile aynı (varsayılan Faz 2).
function swapBlocked(id, P, pi) {
  const ex = EX[id]; if (!ex) return "Bilinmeyen hareket.";
  const J = LIB.JOINTS, k = ph3(pi == null ? 1 : pi);
  if (!eqOK(ex, P)) { const need = ex.eq.map((alt) => alt.filter((q) => q !== "none" && !P.eq.has(q))).sort((a, b) => a.length - b.length)[0].map((q) => (LIB.EQUIPMENT.find((e) => e.k === q) || { n: q }).n); return "Bu hareket için gereken alet sende yok: " + need.join(", ") + "."; }
  if (P.userAvoid.has(id)) return "Bu hareketi daha önce programdan çıkarmıştın; önce geri al.";
  if (P.avoid.has(id)) return P.why[id] || "Bu hareket bu programda yok.";
  for (const j in ex.st) { const s = P.inj[j] || 0, v = ex.st[j]; if (s === 2 && v >= 2) return "Şu anki " + J[j].toLocaleLowerCase("tr") + " ağrın için bu hareket uygun değil."; if (s === 1 && v >= 3) return (P.arth && !P.injA[j] ? "Eklem romatizması: " + J[j].toLocaleLowerCase("tr") + " için en yüklü hareketlerden; programa girmez." : "Geçmiş " + J[j].toLocaleLowerCase("tr") + " sorunun için en yüklü hareketlerden; programa girmez."); }
  if ((ex.imp || 0) > P.imp[k]) return P.cautious ? "Sağlık cevapların" + (P.preg ? " (hamilelik)" : P.age >= 65 ? " (65 yaş üstü)" : P.postp ? " (doğum sonrası)" : "") + " nedeniyle sıçramalı ve darbeli hareket yok." : P.fall ? "Denge / düşme riski nedeniyle sıçramalı hareket yok." : P.postp ? "Doğum sonrası bu dönemde sıçramalı ve darbeli hareket yok." : P.noJump ? "Sıçramalı hareket istemediğini söylemiştin." : "Darbeli hareket: eklemlerini korumak için bu fazda programa girmiyor.";
  if (P.quiet && noisy(ex)) return "Sessiz ortam: sıçrama, ip ve çarpma sesi çıkaran hareketler programa girmez.";
  if (P.narrow && (ex.pat.includes("carry") || id === "ladder")) return "Alanın dar: taşıma ve merdiven drili yok.";
  if (ex.pat.some((q) => P.avoidPat.has(q))) return "Baş üstü itiş istemediğini söylemiştin.";
  if (!liftOK(ex, P, k)) return "Bu kaldırışı barla daha önce öğrenmemişsin: Faz 1'de girmez, Faz 2'den itibaren hafif yükle öğrenerek başlarsın.";
  if (ex.gate && !P.gates.has(ex.gate)) return "Bu hareket yalnız " + ({ walk: "kardiyo tercihi yürüyüş", run: "kardiyo tercihi koşu", floor: "yere yatmak zor" }[ex.gate] || ex.gate) + " cevabıyla programa girer; Cevapları düzenle'den değiştirebilirsin.";
  if (P.postpEarly && FULL_PUSH.includes(id)) return "Doğum sonrası ilk 12 hafta tam şınav yerine eğimli ya da dizüstü şınav.";
  if (P.cautious && FULL_PUSH.includes(id)) return "Sağlık cevapların nedeniyle tam şınav yerine eğimli ya da dizüstü şınav.";
  return null;
}
// "Sadece bugün" alternatifi: programdaki maddeyi (it) başka bir hareketle (id) değiştirir, plan değişmez.
// Süre/raunt reçeteli maddelerde (t "x": ısınma, kondisyon, devre, sıçrama) reçete aynı kalır; diğerlerinde yeni hareketin reçetesi motorla yazılır.
// pi: faz sırası (0 = Faz 1 ve alışma, 1 = Faz 2 ve test, 2 = Faz 3). Döner: yeni madde ya da null.
function swapItem(it, id, P, pi) {
  const ex = EX[id]; if (!ex || !it) return null;
  if (it.t === "x") return Object.assign({}, it, { x: id, n: "" });
  const kind = ex.pat.includes("box_pow") ? "boxpow" : ex.pat.includes("rot") ? "rot" : it.pri >= 10 ? "main" : it.pri >= 8 ? "sec" : "acc";
  const rx = prescribe(ex, kind, P, pi || 0, {});
  const out = { x: id, p: rx.p, r: rx.r || 0, t: ex.t === "w" ? (loaded(ex, P) ? "w" : "r") : ex.t === "r" || ex.t === "s" ? ex.t : "x", s: maxSets(rx.p), n: rx.n || "", pri: it.pri };
  if (rx.kg0 && out.t === "w") out.kg0 = rx.kg0;
  return out;
}
function pick(pat, P, pi, o) {
  let c = candidates(pat, P, pi, o);
  if (!c.length) return null;
  if (o && o.want) { const w = c.find((e) => e.id === o.want); if (w) return w; } // eski plandaki hareket hâlâ geçerliyse slot onu korur (sıra/rank bakılmaz)
  if (o && o.reserved) { const c2 = c.filter((e) => !o.reserved.has(e.id)); if (c2.length) c = c2; } // başka slotun koruduğu hareketi kapma
  return c[Math.min((o && o.rank) || 0, c.length - 1)];
}

// ---------------- reçeteler ----------------
const PH = ["F1", "F2", "F3"];
const SCHEME = {
  kuvvet: { main: [["3×8", "4×6", "4×6"], ["4×5", "4×5", "5×4"], ["5×3", "5×3", "4×3"]], r: 180, sec: [["3×8", "3×8", "3×10"], ["3×8", "4×6", "4×6"], ["4×6", "4×5", "4×5"]], sr: 120 },
  kas: { main: [["3×12", "3×10", "4×10"], ["4×10", "4×8", "4×8"], ["4×8", "4×6-8", "5×6-8"]], r: 120, sec: [["3×12", "3×12", "3×15"], ["3×10", "4×10", "4×10"], ["4×8-10", "4×8", "4×8"]], sr: 90 },
  genel: { main: [["2×12", "3×12", "3×10"], ["3×10", "3×10", "4×10"], ["4×8", "4×8", "4×8"]], r: 90, sec: [["2×12", "3×12", "3×12"], ["3×12", "3×12", "3×10"], ["3×10", "3×10", "4×10"]], sr: 75 },
};
const ACC = [["2×12", "3×12", "3×12"], ["3×12", "3×12", "3×15"], ["3×10", "3×12", "3×12"]];
const RIR = ["Her sette 3 tekrar yedekte bırak.", "Her sette 2 tekrar yedekte bırak.", "Zorlan ama tekniği bozma: 1-2 tekrar yedekte bırak."]; // yedekte tekrar (RIR); terim ekranda geçmez
const ph3 = (pi) => Math.min(pi, 2);
function capBeginner(arr, P) {
  if (P.L > 1 && !P.cautious) return arr;
  return arr.map((s) => s.replace(/^(\d+)×/, (m, n) => Math.min(+n, 3) + "×"));
}
function tag(arr, ex) { return ex.uni ? arr.map((s) => s.replace(/^(\d+×[^ (]+(?: (?:sn|m|dk)\b)?)/, "$1/taraf")) : arr; }
function holdBase(P) { return { 1: 20, 2: 30, 3: 40 }[P.L]; }

// Ağır kuvvet şeması (5×3 gibi) yalnız ağır yüklenebilen hareketlerde: bar kaldırışları (mx) ve, dambılın üst sınırı bilinmiyorsa (salon, 16 kg+, ayarlanabilir), dambıl/makine presleri. RDL, goblet ve vücut ağırlığı 6-12 tekrarda kalır.
const HEAVY_OK = new Set(["hipthrust", "bridge", "legpress", "chestpress", "machinepress", "dbbench", "floorpress", "dbohp", "hkpress", "lmpress"]);
const longRest = (ex) => !!ex.mx || ex.id === "rdl" || ex.id === "hipthrust"; // büyük çok eklemli kaldırış: hangi blokta olursa olsun en az 120 sn
function prescribe(ex, kind, P, pi, ctx) {
  const k = ph3(pi), L = P.L;
  let p, r = 60, n = "", kg0 = null;
  const t = ex.t === "w" && !loaded(ex, P) ? "r" : ex.t; // yük aleti yoksa vücut ağırlığı reçetesi (ağırlık şemasının tekrar düşürmesi anlamsız)
  if (kind === "warm") return { p: ctx.p, r: 0 };
  if (kind === "circ") return { p: t === "s" ? ctx.p.map((v) => v.replace(/× \d+$/, "× 30 sn")) : ctx.p, r: 0, n: ctx.n || "" };
  // Güç kalıpları (yumruk gücü, rotasyon): alet ne olursa olsun az tekrar, tam hız
  if (kind === "boxpow" || kind === "rot") {
    p = kind === "rot" ? ["3×5", "4×5", "4×5"] : [["4×5", "5×5", "5×5"], ["5×5", "5×5", "6×5"], ["6×5", "6×5", "6×5"]][k];
    if (ex.uni) p = p.map((s) => s + "/taraf");
    const kg0 = t === "w" ? startKg(ex, P, p[0]) : null; // kg'lı güç hareketi (oduncu, köşe barı): başlangıç kilosu
    return { p, r: 60, n: (ex.id === "powershot" ? "Arka el düz, ön kroşe, arka kroşe/aparkat sırayla. Her vuruştan önce tam sıfırlan." : "Her tekrar maksimum hız; hız düşerse seti bitir.") + (kg0 ? " Başlangıç ~" + kg0 + " kg." : ""), kg0 };
  }
  const heavy = !!ex.mx || (HEAVY_OK.has(ex.id) && (P.dbMax == null || P.dbMax >= 20)); // dambılın üst sınırı bilinmiyor ya da 20 kg+: ağır şema olabilir (varsayım)
  const sch = P.scheme !== "kuvvet" ? P.scheme : heavy && ex.pat.some((q) => ["squat", "hinge", "hpush", "vpush"].includes(q)) ? "kuvvet" : "kas";
  const learning = LIFT_OF[ex.id] && !P.learned.has(LIFT_OF[ex.id]); // barla ilk kez: teknik öğrenme (Faz 2+), 5RM'den başlangıç kilosu yok
  if (t === "w") {
    if (ex.pat.includes("carry")) { p = ["3×20 m", "4×20 m", "4×20 m"]; r = 60; n = "5 m git-dön. Ağırlığı haftadan haftaya artır."; }
    else if (kind === "main") { p = capBeginner(SCHEME[sch].main[k], P); r = SCHEME[sch].r; n = RIR[k] + " Tüm setlerde üst sınıra ulaşınca ağırlığı artır."; }
    else if (kind === "sec") { p = capBeginner(SCHEME[sch].sec[k], P); r = SCHEME[sch].sr; }
    else { p = ACC[k]; r = 60; }
    if (ex.pat.includes("grip") && !ex.pat.includes("carry")) { p = ["2×15", "3×15", "3×12"]; r = 45; }
    // Sadece hafif dambılı olanlar: tekrar yüksek, iniş yavaş, dinlenme kısa (yük hafif: büyük kaldırış dinlenmesi uygulanmaz)
    const light = P.dbLight && (kind === "main" || kind === "sec") && !P.eq.has("barbell") && !P.eq.has("kb") && !GYM_EQ.some((k) => P.eq.has(k)) && ex.eq.some((a) => a.includes("db"));
    if (light) { p = ["3×15-20", "3×15-20", "4×15-20"]; r = 60; n = "Dambılların hafif: her tekrarı 3 saniyede indir, setin sonu zor gelmeli."; }
    if (longRest(ex) && !light) r = Math.max(r, 120);
    if (ex.mx) p = p.map((v) => v.replace(/×(\d+)(?:-(\d+))?/, (m, a, b) => (+(b || a) > ex.mx ? "×" + ex.mx : m))); // tekrar tavanı başlangıç kilosundan önce (deadlift 2×12 değil 2×8 → %75)
    if (learning) { n = "Teknik öğrenme: boş bar ya da çok hafif yük, her sette 4+ tekrar yedekte; ağırlık ancak teknik düzgünse artar." + (n ? " " + n : ""); kg0 = P.barKg; } // boş bar (biliniyorsa)
    else { kg0 = startKg(ex, P, p[0]); if (kg0) n = (n ? n + " " : "") + "Başlangıç ~" + kg0 + " kg."; }
    if (P.bp && (kind === "main" || kind === "sec")) n = (n ? n + " " : "") + "Nefesini tutma: kaldırırken ver, indirirken al.";
  } else if (t === "r") {
    if (["pullup", "chinup"].includes(ex.id)) { p = [["3 set × (max − 1)", "4 set × (max − 1)", "4 set × (max − 1)"], ["4 set × (max − 1)", "4 set × (max − 1)", "5 set × (max − 1)"], ["5 set × (max − 1)", "5 set × (max − 1)", "5 set × (max − 1)"]][k]; r = 120; n = "Sette 3'ten az çıkıyorsa kalan tekrarları negatif ya da bantla tamamla."; }
    else if (ex.id === "pullneg") { p = ["3×3 (5 sn iniş)", "3×4 (5 sn iniş)", "4×4 (5 sn iniş)"]; r = 120; }
    else if (ex.id === "bandpull") { p = ["3×6", "3×8", "4×8"]; r = 90; n = "8 temiz tekrar olunca daha ince banda geç."; }
    else if (["archer", "pistolprog"].includes(ex.id)) { p = ["3×3-5", "3×4-6", "4×5-6"]; r = 120; }
    else if (ex.id === "hspuneg") { p = ["3×2", "3×2-3", "4×3"]; r = 120; }
    else if (ex.pat.includes("prehab_sh") || ex.pat.includes("prehab_back") || ex.pat.includes("prehab_wr")) { p = ["2×12", "2×15", "3×15"]; r = 30; }
    else if (ex.pat.includes("calf") || ex.pat.includes("prehab_knee")) { p = ["2×12", "3×12", "3×15"]; r = 45; }
    else if (kind === "cond") { p = ctx.p; r = 0; }
    else if (["pushup", "kpushup"].includes(ex.id) && P.pushN >= 6 && (kind === "main" || kind === "sec")) {
      // Test edilen maksimumun %50-70'i
      const lo = clamp(Math.round(P.pushN * 0.5), 3, REP_CAP - 5), hi = clamp(Math.round(P.pushN * 0.7), lo + 2, REP_CAP);
      const sets = kind === "main" ? ["3", "3", "4"] : ["2", "3", "3"];
      p = sets.map((x, i) => x + "×" + Math.min(lo + i, REP_CAP - 2) + "-" + Math.min(hi + i, REP_CAP)); r = 90;
      n = hi + 2 > REP_CAP ? "Sette en fazla " + REP_CAP + " tekrar. Hepsi rahat geliyorsa daha zor bir şınava geç (Değiştir) ya da her tekrarı 3 saniyede indir." : "Tekrarlar test ettiğin maksimumun %50-70'i; testler güncellendikçe değişir.";
    }
    else if (P.bandLight && (kind === "main" || kind === "sec") && ex.eq.every((alt) => alt.includes("band"))) { p = ["3×15-20", "3×15-20", "4×15-20"]; r = 60; n = "Bandın hafif: her tekrarı 3 saniyede geri bırak, setin sonu zor gelmeli; daha sert bant alınca aralık düşer."; } // yalnız hafif bant: yüksek tekrar
    else {
      const rng = { 1: "6-10", 2: "8-12", 3: "10-15" }[L];
      const sets = kind === "main" ? (L === 1 ? ["2", "3", "3"] : ["3", "4", "4"]) : L === 1 ? ["2", "2", "3"] : ["3", "3", "4"];
      p = sets.map((s) => s + "×" + rng); r = kind === "main" ? 90 : 60;
      if (kind === "main" || kind === "sec") n = "Aralığın üstüne rahat ulaşınca daha zor varyasyona geç.";
    }
  } else if (t === "s") {
    const b = holdBase(P) + k * 10;
    if (ex.pat.includes("skill_hs")) { const hb = ex.id === "pikehold" ? 20 : 10 + k * 5; p = ["3×" + hb + " sn", "3×" + (hb + 5) + " sn", "4×" + (hb + 10) + " sn"]; r = 90; }
    else if (ex.pat.includes("grip")) { p = L >= 2 ? ["3×max", "3×max", "3×max"] : ["3×" + b + " sn", "3×" + (b + 5) + " sn", "3×" + (b + 10) + " sn"]; r = 90; n = "Toplam süreyi her hafta artırmaya çalış."; }
    else { p = ["3×" + Math.min(b, 60) + " sn", "3×" + Math.min(b + 5, 60) + " sn", "3×" + Math.min(b + 10, 60) + " sn"]; r = 45; }
  } else {
    // x: sayılan işaret
    if (kind === "plyo") { const s = [3, 4, 5][L - 1] + (k > 0 ? 1 : 0); p = [clamp(s - 1, 2, 5) + "×3", clamp(s, 2, 5) + "×3", clamp(s, 2, 5) + "×3"]; r = 90; n = "Maksimum niyet, yumuşak iniş; tekrarlar arasında sıfırlan."; }
    else if (kind === "skill") { p = ["3×2", "3×3", "4×3"]; r = 90; }
    else if (kind === "sprint") { p = ctx.p; r = ctx.r; n = ctx.n || ""; }
    else if (ex.id === "ytw") { p = ["2×6 her harf", "2×8 her harf", "3×8 her harf"]; r = 30; }
    else { p = ctx.p || ["1 set"]; r = ctx.r || 0; n = ctx.n || ""; }
  }
  if (P.lowRec && Array.isArray(p) && t !== "x") p = p.map((v) => v.replace(/^(\d+)×/, (m, a) => Math.min(+a, 3) + "×")); // az uyku ya da yüksek stres: en fazla 3 set
  if (Array.isArray(p) && t !== "x") p = tag(p, ex);
  return { p, r, n, kg0 };
}

// 5 tekrar maksimum (biliniyorsa) → ilk hafta başlangıç kilosu (RIR 3 bırakacak şekilde)
// Halter → dambıl (dbbench): toplam yükün ~%80'i, iki dambıla bölünür = dambıl başına 0.4 (bilgi/antrenman-bilimi.md, varsayım)
const RM_OF = { backsquat: ["squat", 1], frontsquat: ["squat", 0.8], dl: ["dl", 1], rdl: ["dl", 0.6], bench: ["bench", 1], dbbench: ["bench", 0.4], ohp: ["bench", 0.6] };
// 5RM yoksa muhafazakâr başlangıç tahmini (Ö5; varsayım, bilgi/antrenman-bilimi.md › Başlangıç kilosu). Katsayı × referans kilo (BMI 25'e kadarki kısmı):
// [dambıl/kettlebell (tek alet), bar ya da plaka (toplam), makine/kablo]; acemi erkek, ~10 tekrar, 3+ tekrar yedekte. Kullanıcı ilk sette düzeltir.
const KG0 = { squat: [0.15, 0.4, 0.8], hinge: [0.15, 0.5, 0.2], lunge: [0.08, 0.25, 0.3], hpush: [0.12, 0.35, 0.3], vpush: [0.08, 0.2, 0.2], hpull: [0.12, 0.3, 0.4], vpull: [0.1, 0.3, 0.4],
  arm_flex: [0.06, 0.15, 0.1], arm_ext: [0.08, 0.12, 0.12], delt: [0.03, 0.05, 0.04], quad_iso: [0.08, 0.2, 0.25], calf: [0.1, 0.2, 0.5], carry: [0.2, 0.3, 0.3], grip: [0.05, 0.15, 0.1], rot: [0.06, 0.05, 0.08], upow: [0.06, 0.1, 0.1] };
const LOWER = ["squat", "hinge", "lunge", "quad_iso", "calf"], PLATE = ["platefr", "wcalf", "woodchop"]; // PLATE: "barbell" kalemi burada tek plaka demek (bar kaldırılmaz)
const down = (v, st, lo) => Math.max(lo, +(Math.floor(v / st + 1e-9) * st).toFixed(2));
function guessKg(ex, P, rx) {
  const alt = ex.eq.find((a) => a.some((k) => LOAD.has(k)) && a.every((k) => k === "none" || P.eq.has(k))); // kütüphanedeki ilk uygun alet
  let pat = alt && ex.pat.find((q) => KG0[q]); if (!pat) return null;
  const tool = alt.includes("barbell") ? (PLATE.includes(ex.id) || alt.includes("landmine") ? "plate" : "bar") : GYM_EQ.some((k) => alt.includes(k)) ? "mach" : alt.includes("db") ? "db" : alt.includes("kb") ? "kb" : null;
  if (!tool) return null;
  if (ex.uni && (pat === "squat" || pat === "hinge")) pat = "lunge"; // tek bacak: hamle katsayısı
  const m = /×\s*(\d+)\s*(m\b|sn|dk)?/.exec(String(rx)), reps = m && !m[2] ? +m[1] : 10;
  let kg = Math.min(P.w, 25 * Math.pow(P.h / 100, 2)) * KG0[pat][tool === "db" || tool === "kb" ? 0 : tool === "mach" ? 2 : 1]
    * [1, 1.25, 1.5][P.liftL - 1] // seviye (ağırlık geçmişi yoksa 1)
    * (P.sex === "k" ? (LOWER.includes(pat) ? 0.85 : 0.7) : 1) // kadında vücut ağırlığına oranla üst vücut belirgin, alt vücut az düşük
    * (P.age >= 60 || P.age < 18 || P.cautious || P.postp ? 0.8 : 1) // 60+, 18 yaş altı, temkinli, doğum sonrası: daha hafif başla
    * (40 / 30) / (1 + reps / 30); // reçetenin tekrarına göre (Epley oranı; katsayılar ~10 tekrar için)
  if (ex.uni && tool !== "db" && tool !== "kb" && pat !== "delt") kg /= 2; // tek kol makine/kablo/köşe barı
  if (tool === "db") {
    if (P.dbList.length) { const fit = P.dbList.filter((v) => v <= kg); return fit.length ? fit[fit.length - 1] : P.dbList[0]; } // yalnız eldeki dambıl
    const st = P.dbStep || (kg >= 20 ? 2 : 1); kg = down(kg, st, st); // ayarlanabilir adımı; bilinmiyorsa 20 kg altı 1, üstü 2 kg (suggestKg ile aynı varsayım)
    return P.dbMax ? Math.min(kg, P.dbMax) : kg;
  }
  if (tool === "kb") return down(kg, 2, 4); // varsayım: kettlebell 2 kg aralıklı satılır (4, 6, 8 … 16)
  if (tool === "mach") return down(kg, 2.5, 5);
  if (tool === "plate") return down(kg, 2.5, 2.5);
  return Math.max(down(kg, P.barStep || 2.5, 0), P.barKg || 20); // bar: boş bardan hafif olamaz (bar kilosu bilinmiyorsa 20 kg)
}
function startKg(ex, P, rx) {
  const m = RM_OF[ex.id], rm = m && +P.rm[m[0]]; if (!rm) return guessKg(ex, P, rx);
  const reps = +((/×(\d+)/.exec(String(rx)) || [0, 8])[1]);
  const f = reps <= 3 ? 0.9 : reps <= 5 ? 0.85 : reps <= 8 ? 0.75 : 0.68;
  const withBar = P.eq.has("barbell") && ex.eq.some((alt) => alt.includes("barbell"));
  const step = withBar ? P.barStep || 2.5 : P.dbStep || 2.5; // aletin adımına yuvarla (bar: 2 × en küçük plaka; ayarlanabilir dambıl: en küçük artış)
  let kg = Math.min(Math.round((rm * m[1] * f) / step) * step, RM_MAX[m[0]]); // tavan: denetlenmiş 5RM'den türediği için zaten altında; yine de aşamaz
  if (withBar) return P.barKg ? Math.max(kg, P.barKg) : kg; // boş bardan hafif olamaz
  if (P.dbList && P.dbList.length) { const fit = P.dbList.filter((v) => v <= kg); return fit.length ? fit[fit.length - 1] : P.dbList[0]; } // sabit çiftlerde eldeki en yakın dambıl
  return P.dbMax ? Math.min(kg, P.dbMax) : kg; // dambılla yapılan hareket en ağır dambılı geçemez
}

// ---------------- kondisyon, sprint, raunt ----------------
function condPlan(P, pi, mode) {
  // EMOM (sprawl, burpee, swing): dakikadaki tekrar kuvvet seviyesini aşmaz, süre en fazla 14 dk (varsayım; 10 sprawl × 18 dk kimseye verilmez)
  const lvl = clamp(P.condL + ph3(pi), 1, P.mins <= 35 || P.asthma ? 2 : 5), reps = [5, 8, 10][clamp(Math.min(P.condL, P.L), 1, 3) - 1], el = Math.min(lvl, 3); // astım: iş ≤ dinlenme (varsayım)
  const IV = {
    1: ["6×(20 sn / 40 sn)", "8×(20 sn / 40 sn)", "8×(30 sn / 30 sn)"],
    2: ["8×(30 sn / 30 sn)", "10×(30 sn / 30 sn)", "10×(30 sn / 30 sn)"],
    3: ["10×(30 sn / 30 sn)", "10×(40 sn / 20 sn)", "12×(40 sn / 20 sn)"],
    4: ["10×(40 sn / 20 sn)", "12×(40 sn / 20 sn)", "6×(1 dk / 1 dk)"],
    5: ["8×(20 sn / 10 sn)", "6×(1 dk / 1 dk)", "8×(1 dk / 1 dk)"],
  };
  if (mode === "emom" && P.cautious) mode = "";
  const emomN = "EMOM = her dakika başı: dakika başlayınca " + reps + " tekrar yap, dakikanın kalanında dinlen.";
  if (mode === "emom" && P.mins <= 35) return { p: ["EMOM 8 dk", "EMOM 8 dk", "EMOM 8 dk"], n: emomN };
  if (mode === "emom") return { p: ["EMOM " + (6 + el * 2) + " dk", "EMOM " + (8 + el * 2) + " dk", "EMOM " + (8 + el * 2) + " dk"], n: emomN };
  if (P.cautious) return { p: ["6×(30 sn / 60 sn)", "6×(40 sn / 60 sn)", "8×(40 sn / 60 sn)"], n: "Tempolu ama konuşabileceğin hızda; nefesin sıkışırsa yavaşla." };
  return { p: IV[lvl], n: "İş kısmında konuşamayacak tempoda, dinlenmede yavaşla." };
}
function roundsPlan(P, pi) {
  const lvl = clamp(P.condL + ph3(pi), 1, 5);
  return [
    ["3×2 dk / 1 dk", "4×2 dk / 1 dk", "4×2 dk / 1 dk"],
    ["4×2 dk / 1 dk", "5×2 dk / 1 dk", "5×3 dk / 1 dk"],
    ["5×3 dk / 1 dk", "6×3 dk / 1 dk", "6×3 dk / 1 dk"],
    ["6×3 dk / 1 dk", "7×3 dk / 1 dk", "7×3 dk / 1 dk"],
    ["7×3 dk / 1 dk", "8×3 dk / 1 dk", "8×3 dk / 1 dk"],
  ][lvl - 1];
}
function z2Plan(P, pi, long) {
  const base = { 1: 20, 2: 30, 3: 35 }[P.condL] + ph3(pi) * 5 + (long ? 10 : 0);
  return [base + " dk", base + 5 + " dk", base + 5 + " dk"];
}
function sprintPlan(ex, P, pi) {
  const k = ph3(pi);
  if (ex.id === "bikesprint") return { p: [["6×(10 sn / 50 sn)", "8×(10 sn / 50 sn)", "8×(15 sn / 45 sn)"], ["8×(15 sn / 45 sn)", "8×(20 sn / 40 sn)", "10×(20 sn / 40 sn)"], ["10×(20 sn / 40 sn)", "8×(30 sn / 60 sn)", "8×(30 sn / 60 sn)"]][k], r: 0, n: "İş süresinde maksimum çaba, dinlenmede çok yavaş." };
  if (ex.id === "stride") return { p: ["6×40 m %70", "6×40 m %75", "8×40 m %80"], r: 90, n: "Dönüşte yürü; hız değil rahat ve uzun adım." };
  return { p: k === 1 ? ["6×15 m %90", "8×15 m %90", "8×20 m %90-95"] : ["6×20 m %95", "6×20 m %100", "6×25 m %100"], r: k === 1 ? 120 : 180, n: "Tam dinlen. Arka bacakta çekme hissi olursa bırak." };
}

// ---------------- seans şablonları ----------------
function warmup(type, P, pi) {
  const items = [];
  const add = (id, p) => { if (id && EX[id] && eqOK(EX[id], P) && injOK(EX[id], P) && (EX[id].imp || 0) <= P.imp[ph3(pi)] && prefOK(EX[id], P) && !P.avoid.has(id) && !items.some((i) => i.x === id)) { items.push({ x: id, p, t: "x", pri: 100 }); return true; } return false; };
  // Kardiyo: ip (varsa, darbe serbest, sessiz ortam değil) → makine → jumping jack → yerinde yürüyüş; "yürüyüş" tercihi makine yoksa yerinde yürüyüş
  const walk = P.cardioPref[0] === "walkint", hop = P.imp[0] >= 1 && !P.quiet;
  const cardio = P.eq.has("rope") && hop && type !== "z2flex" && !walk ? "ip" : P.eq.has("cardio") ? "bikeeasy" : hop && !walk ? "jj" : "march";
  if (type === "sprint") { add(P.eq.has("outdoor") ? "z2" : cardio, "5 dk hafif tempo"); add("bacaksal", "10/taraf"); add("askip", "2×15 m"); add("wall_drill", "2×5/bacak"); if (P.imp[ph3(pi)] >= 1) add("pogo", "2×15"); if (P.eq.has("outdoor")) add("stride", "2×30 m %60"); }
  else if (type === "box") { add(cardio, "5 dk, farklı adımlar"); add("kedi", "8"); add("wgs", "3/taraf"); add("dislo", "10"); add("golge", "2×2 dk (hafif → orta)"); }
  else if (type === "upper" || type === "cali") { add(cardio, "3 dk hafif"); add("bilek", "2 dk"); add("dislo", "10"); add(P.eq.has("band") ? "pullap" : "ytw", P.eq.has("band") ? "15" : "1 tur"); add(P.eq.has("pullbar") ? "scap" : "wallslide", P.eq.has("pullbar") ? "2×8" : "10"); add("dr", "12/taraf"); }
  // Tüm vücut ve devre günlerinde itiş/çekiş de var: omuz hazırlığı (dislo) kısa ısınmada da kalsın diye öne
  else if (type === "cond") { add(cardio, "3 dk hafif"); add("wgs", "3/taraf"); add("dislo", "10"); add("airsquat", "10 yavaş"); add("kedi", "8"); }
  else { add(cardio, "3 dk hafif"); add("wgs", "4/taraf"); if (type === "fb") add("dislo", "10"); add("bacaksal", "10/taraf"); add("airsquat", "10 yavaş"); add("gbridge", "10"); if (P.imp[ph3(pi)] >= 1) add("pogo", "2×10 hafif"); }
  // eklem sorunlarına özel hazırlık
  if (P.inj.wrist && (type === "upper" || type === "cali" || type === "box" || type === "fb")) add("bilek", "2 dk");
  if (P.inj.knee) add("tib", "2×15");
  if (P.inj.ankle) add("balance", "30 sn/taraf");
  if (P.inj.back) add("birddog", "6/taraf");
  if (P.inj.shoulder && type !== "lower" && type !== "sprint" && !add("dr", "12/taraf") && !items.some((i) => i.x === "dr")) add("sideer", "12/taraf"); // bant bağlanamıyorsa yan yatarak
  if (P.postp) add("pelvic", "10 × 5 sn"); // doğum sonrası: her ısınmada pelvik taban
  // Sabah antrenmanı +2 dk, astım +3 dk ve kademeli başlangıç (ATS 2013: ısınma egzersiz kaynaklı nefes darlığını azaltır); kardiyo her zaman ilk madde
  const extra = (P.asthma ? 3 : 0) + (P.morning ? 2 : 0);
  const longer = (it, i) => (extra && i === 0 && /\d+ dk/.test(String(it.p)) ? Object.assign({}, it, { p: String(it.p).replace(/(\d+) dk/, (m, k) => +k + extra + " dk") + (P.asthma ? ", hafiften başla ve kademeli artır" : "") }) : it);
  if (P.mins <= 45) {
    const pre = items.filter((i) => ["tib", "balance", "birddog", "dr", "sideer", "pelvic"].includes(i.x) || (P.inj.wrist && i.x === "bilek")).sort((a, b) => (b.x === "pelvic") - (a.x === "pelvic")); // pelvik taban kısa ısınmada da kalır
    const main = items.filter((i) => !pre.includes(i)).slice(0, P.mins <= 35 ? 3 : 4);
    if (main[0]) main[0] = longer(Object.assign({}, main[0], { p: String(main[0].p).replace(/\d+ dk/, "2 dk") }), 0);
    return { name: "Isınma", warm: true, items: main.concat(pre.slice(0, P.postp ? 2 : 1)) };
  }
  return { name: "Isınma", warm: true, items: items.map(longer) };
}
const COOL = (P) => ({ name: "Soğuma", warm: true, items: [{ x: "z2", p: (P && P.mins <= 35 ? "3" : "5") + " dk yürüyüş + burundan nefes", t: "x", pri: 100 }] });

const FOCUS = {
  bacak: { n: "Bacak ve kalça", types: ["lower", "fb", "sprint"], pats: [["lunge"], ["quad_iso"], ["calf"]] },
  ust: { n: "Göğüs ve omuz", types: ["upper", "cali", "fb"], pats: [["hpush"], ["delt"]] },
  sirt: { n: "Sırt", types: ["upper", "cali", "fb"], pats: [["hpull"], ["vpull"]] },
  kol: { n: "Kollar", types: ["upper", "cali", "fb"], pats: [["arm_flex"], ["arm_ext"]], alt: true }, // biceps/triceps dönüşümlü, aynı gün aynı kas iki kez yok
  karin: { n: "Karın ve gövde", types: ["lower", "upper", "cali", "fb", "box"], pats: [["core"], ["core_lat"]] },
  // Duruş: arka omuz / kürek kemiği ve bel koruyucu hareketler (ısınmadakiler tekrar etmez: noWarm)
  durus: { n: "Duruş", types: ["lower", "upper", "cali", "fb"], pats: [["prehab_sh"], ["prehab_back"]], only: { prehab_sh: ["facepull", "ytw", "pullap", "dr", "wallslide"], prehab_back: ["birddog", "deadbug", "sideplank"] } },
};
// Alet yoksa kalıp boş kalmasın: dikey çekiş yoksa yatay çekiş vb.
const FALLBACK = { vpull: "hpull", hpull: "vpull", vpush: "hpush" };
// Bir blok tanımı: [ad, [[kalıp, tür, öncelik, seçenekler], ...]]
// wants: { slotSıraNo: hareketId } — iki geçişli kurulumda (buildStable) eski plandaki hareketi o slotta tercih et; reserved: başka slotların istedikleri
function buildSession(type, variant, P, pi, ord, wants) {
  const used = new Set();
  const blocks = type === "z2flex" ? [] : [warmup(type, P, pi)]; // aerobik günde yürüyüşün kendisi ısınma
  const warmIds = new Set(blocks[0] ? blocks[0].items.map((i) => i.x) : []);
  let sn = 0; // slot sıra numarası: şablon aynı olduğu sürece iki geçişte de aynı; çıktıdan generate sonunda silinir
  const reservedAll = wants ? new Set(Object.values(wants)) : null;
  const slot = (pat, kind, pri, o) => {
    const mySn = sn++;
    o = Object.assign({}, o || {}); o.avoid = pat === "plyo" || o.noWarm ? new Set([...used, ...warmIds]) : used; // ısınmadaki sıçrama güç bloğunda (ve duruş bloğunda ısınma hareketi) tekrar etmez
    if (wants) { if (wants[mySn]) o.want = wants[mySn]; o.reserved = new Set([...reservedAll].filter((x) => x !== wants[mySn])); }
    // Yeni döngüde yardımcı hareketler değişsin (ana kaldırışlar aynı kalır, ilerleme takip edilsin)
    if (P.cycle >= 2 && ["core", "core_lat", "lunge", "calf", "grip", "plyo"].includes(pat) && !o.only) o.rank = (o.rank || 0) + ((P.cycle - 1) % 2);
    let ex;
    if (pat === "skill_hs") {
      const ladder = ["pikehold", "wallpike", "wallwalk", "ctw", "kickup", "hspuneg"];
      let st = clamp((P.L - 1) * 2 + ph3(pi) - (o.rank ? 1 : 0), 0, 5);
      while (st >= 0 && (!injOK(EX[ladder[st]], P) || used.has(ladder[st]))) st--;
      ex = st >= 0 ? EX[ladder[st]] : null;
    } else ex = pick(pat, P, pi, o) || (FALLBACK[pat] && !o.only && pick(FALLBACK[pat], P, pi, o));
    if (!ex) return null;
    used.add(ex.id);
    let ctx = { p: o.p, r: o.r, n: o.n };
    if (kind === "cond") {
      if (ex.pat.includes("box_round")) ctx = { p: roundsPlan(P, pi), r: 60, n: "Zorluk 10 üzerinden 7-8. Her raundun son 30 sn'si tempoyu artır." };
      else if (["kbswing", "dbswing", "sprawl", "burpee", "mbslam"].includes(ex.id)) ctx = condPlan(P, pi, "emom");
      else if (ex.id === "ladder") ctx = { p: ["3 tur · 2 desen × 2 geçiş", "4 tur · 3 desen × 2 geçiş", "4 tur · 3 desen × 3 geçiş"], n: "Önce temiz ritim, sonra hız." };
      else ctx = condPlan(P, pi);
      if (P.asthma) ctx = Object.assign({}, ctx, { n: (ctx.n ? ctx.n + " " : "") + "İnhalerin yanında olsun; nefesin sıkışırsa dur." });
    }
    if (kind === "z2") ctx = { p: z2Plan(P, pi, o.long).map((v) => (o.maxMin && parseInt(v) > o.maxMin ? o.maxMin + " dk" : v)), r: 0, n: "Rahat tempo (Zone 2): konuşabildiğin hız; nabız aralığı Profil › Kilo ve nabız'da." };
    if (kind === "sprint") ctx = sprintPlan(ex, P, pi);
    const rx = prescribe(ex, kind, P, pi, ctx);
    const injNotes = Object.keys(ex.inj || {}).filter((j) => P.inj[j]).map((j) => ex.inj[j]);
    const note = [o.note || rx.n, ...injNotes].filter(Boolean).join(" ");
    const xOnly = kind === "cond" || kind === "z2" || kind === "circ" || kind === "warm";
    const rounds = kind === "circ" ? Math.max.apply(null, rx.p.map((v) => +(/^(\d+)\s*tur/.exec(v) || [0, 1])[1])) : 0;
    const out = { x: ex.id, p: rx.p, r: rx.r || 0, t: xOnly ? "x" : ex.t === "w" ? (loaded(ex, P) ? "w" : "r") : ex.t === "r" || ex.t === "s" ? ex.t : "x", s: rounds || (xOnly ? 1 : maxSets(rx.p)), n: note, pri, sn: mySn };
    if (rx.kg0 && out.t === "w") out.kg0 = rx.kg0; // ilk sette kutuya gelen başlangıç kilosu (arayüz); yoksa alan yok
    return out;
  };
  const block = (name, defs, extra) => { const items = defs.map((d) => d && slot.apply(null, d)).filter(Boolean); if (items.length) blocks.push(Object.assign({ name, items }, extra || {})); };
  const goalPri = (g, hi, lo) => (has(P, g) ? hi : lo);
  const condPri = has(P, "yag") || has(P, "kondisyon") ? 6 : 3;
  // İlk hedef kas/kuvvetse kondisyon haftada 2 günle sınırlı (üst vücut günlerinde yok)
  const condLight = ["kas", "kuvvet"].includes(P.goals[0]) && !has(P, "yag") && !has(P, "kondisyon");
  const arms = has(P, "kas") ? [["arm_flex", "acc", 6], ["arm_ext", "acc", 6], ["delt", "acc", 5]] : null;
  const balance = P.age >= 60 || P.fall || P.osteo ? ["prehab_ankle", "acc", 10, { only: ["balance"] }] : null; // 60+, denge sorunu ve kemik erimesinde düşme riskine karşı; süre kısa olsa da kalır
  const skillOK = (has(P, "amut") || has(P, "kalistenik")) && P.inj.wrist < 2 && P.inj.shoulder < 2 && !P.cautious && !P.bp && !P.avoidPat.has("skill_hs"); // tansiyonda baş aşağı duruş yok (varsayım)
  let title = "";

  if (type === "lower") {
    const plyo = P.imp[ph3(pi)] >= 1 && (has(P, "patlayici") || P.L >= 2);
    title = variant ? "Alt Vücut · Arka Zincir" : "Alt Vücut · Kuvvet" + (plyo ? " + Sıçrama" : "");
    if (plyo && !variant) block("A · Sıçrama (taze iken)", [["plyo", "plyo", goalPri("patlayici", 8, P.L >= 2 ? 6 : 5)], P.L >= 2 && has(P, "patlayici") ? ["plyo", "plyo", 5] : null]);
    block("B · Kuvvet", variant
      ? [["hinge", "main", 10], ["squat", "sec", 9, { rank: 1 }]]
      : [["squat", "main", 10], ["hinge", "sec", 9]]);
    block("C · Yardımcı", [["lunge", "acc", 7, { rank: variant }], variant ? ["hinge", "acc", 5] : ["calf", "acc", 4], P.inj.knee ? ["prehab_knee", "acc", 5] : null, has(P, "kas") && !variant ? ["quad_iso", "acc", 5] : null, balance]);
    block("D · Karın ve gövde", [["core", "acc", 5, { rank: variant }], ["core_lat", "acc", 4]]);
    block("E · Kondisyon", [["cond", "cond", condPri, { rank: variant, noRound: true }]]);
  } else if (type === "upper") {
    title = "Üst Vücut · Kuvvet";
    if (skillOK && !variant) block("A · Amut becerisi", [["skill_hs", "skill", goalPri("amut", 8, 5)]]);
    block("B · Kuvvet", variant
      ? [["vpush", "main", 10], ["vpull", "main", 10], ["hpush", "sec", 8, { rank: 1 }], ["hpull", "sec", 8, { rank: 1 }]]
      : [["hpush", "main", 10], ["hpull", "main", 10], ["vpush", "sec", 8], ["vpull", "sec", 8]]);
    block("C · Omuz sağlığı", [["prehab_sh", "acc", P.inj.shoulder ? 7 : 5, { rank: variant }], P.inj.shoulder ? ["prehab_sh", "acc", 6] : null]);
    if (arms) block("D · Kol ve omuz", variant ? [arms[1], arms[0], ["delt", "acc", 5, { rank: 1 }]] : arms);
    block(arms ? "E · Karın ve kavrama" : "D · Karın ve kavrama", [["grip", "acc", goalPri("kavrama", 7, has(P, "dovus") ? 6 : 3)], ["core", "acc", 4, { rank: 1 }]]);
    if (!condLight) block("E · Kondisyon", [["cond", "cond", condPri, { rank: 1, noRound: true }]]);
  } else if (type === "cali") {
    title = skillOK ? "Kalistenik + Amut" : "Kalistenik";
    if (skillOK) block("A · Amut becerisi", [["core", "acc", 7, { only: ["hollow"] }], ["skill_hs", "skill", 9], P.L >= 2 ? ["skill_hs", "skill", 6] : null]);
    block("B · Kuvvet", [["vpull", "main", 10, { bw: true }], P.pullLvl <= 1 ? ["vpull", "sec", 8, { bw: true }] : null, ["hpush", "main", 10, { bw: true }], ["vpush", "sec", 8, { bw: true }], ["hpull", "acc", 7, { bw: true }]]);
    block("C · Omuz ve kavrama", [["prehab_sh", "acc", 5], ["grip", "acc", goalPri("kavrama", 7, 4)]]);
    block("D · Karın ve gövde", [["core", "acc", 5, { prefer: ["hkr"] }]]);
    if (!condLight) block("E · Kondisyon", [["cond", "cond", condPri, { noRound: true }]]);
  } else if (type === "fb") {
    title = "Tüm Vücut " + "ABC"[variant];
    if (skillOK && variant === 0) block("A · Amut becerisi", [["skill_hs", "skill", 5]]);
    const V = [
      [["squat", "main", 10], ["hpush", "main", 10], ["hpull", "main", 10], ["hinge", "sec", 8], ["vpush", "acc", 6]],
      [["hinge", "main", 10], ["vpull", "main", 10], ["hpush", "sec", 9, { rank: 1 }], ["lunge", "sec", 8], ["vpush", "acc", 6]],
      [["squat", "main", 10, { rank: 1 }], ["vpush", "main", 10], ["hpull", "main", 10, { rank: 1 }], ["lunge", "sec", 8, { rank: 1 }], ["vpull", "acc", 6]],
    ][variant];
    block("B · Kuvvet", V);
    block("C · Karın ve taşıma", [["core", "acc", 5, { rank: variant }], variant === 1 ? ["carry", "carry", 4] : ["core_lat", "acc", 4], arms ? arms[variant] : null, balance]);
    if (has(P, "dovus") && variant === 1) block("D · Boks", [["box_round", "cond", 6]]);
    if (!condLight || variant !== 1) block("E · Kondisyon", [["cond", "cond", has(P, "yag") || has(P, "kondisyon") ? 6 : condLight ? 3 : 4, { rank: variant, noRound: true }]]);
  } else if (type === "box") {
    title = "Boks · Güç + Kondisyon";
    block("A · Güç (taze iken)", [["box_pow", "boxpow", 10], ["rot", "rot", 7]]);
    block("B · Raundlar", [["box_round", "cond", 10]]);
    block("C · Kondisyon", [["cond", "cond", 7, { prefer: ["flurry", "sprawl", "ip"], noRound: true }], P.eq.has("ladder") ? ["footwork", "cond", 5] : null]);
    block("D · Karın ve bilek", [["core_lat", "acc", 6], P.inj.wrist < 2 ? ["core_lat", "acc", 5, { only: ["knuckleplank"] }] : null]);
    block("E · Kavrama", [["grip", "acc", goalPri("kavrama", 6, 4)]]);
  } else if (type === "cond") {
    title = has(P, "yag") ? "Kondisyon · Yağ Yakımı" : "Kondisyon · Dayanıklılık";
    block("A · İnterval", [["cond", "cond", 10, { noRound: true }]]);
    const circ = P.mins <= 35 ? ["2 tur × 10", "3 tur × 10", "3 tur × 10"] : P.L === 1 ? ["3 tur × 10", "3 tur × 12", "4 tur × 12"] : ["4 tur × 12", "4 tur × 15", "5 tur × 15"];
    block("B · Devre (hareketler arası dinlenme yok, turlar arası 90 sn)", [
      ["squat", "circ", 8, { p: circ, n: "Devre", L: 1 }], ["hpush", "circ", 8, { p: circ, L: 1 }], ["hpull", "circ", 7, { p: circ, L: 1 }], ["core", "circ", 6, { p: circ, only: ["mountain", "deadbug", "birddog", "plank", "hollow"] }]], { circ: true });
    block("C · Soğuma yürüyüşü", [["z2", "z2", 6, { maxMin: P.mins >= 60 ? 10 : 6 }]]);
  } else if (type === "sprint") {
    title = "Sprint · Hız + Arka Zincir";
    block("A · Sprint", [["sprint", "sprint", 10], P.imp[ph3(pi)] >= 1 ? ["plyo", "plyo", 6, { rank: 1 }] : null]);
    block("B · Kuvvet", [["hinge", "main", 9, { prefer: ["rdl", "slrdl"] }], ["lunge", "acc", 7, { prefer: ["slrdl", "bss", "stepup"] }], ["hinge", "acc", 6, { prefer: ["hipthrust", "bridge", "sbridge"] }]]);
    block("C · Kavrama", [["carry", "carry", 5], ["grip", "acc", 4]]);
    block("D · Karın ve gövde", [["core_lat", "acc", 4]]);
  } else if (type === "z2flex") {
    title = "Aerobik Taban + Uzun Esneklik";
    // 35 dk altı (30 dk ve kısa günler): esneklik kısalır, yürüyüş kalan süreye sığar (+%5 pay, 2 geçiş × 30 sn); iki madde de öncelik 10, fitTime kırpamaz
    const flow = P.mins >= 60 ? 30 : P.mins >= 35 ? 20 : Math.max(5, Math.floor(P.mins / 10) * 5);
    const z2Max = P.mins >= 35 ? Math.max(15, P.mins - flow - 5) : Math.floor(P.mins * 1.05 - 1 - flow);
    block("A · Rahat tempo (Zone 2)", [["z2", "z2", 10, { long: true, maxMin: z2Max }]]);
    block("B · Uzun esneklik", [["mob", "warm", 10, { only: ["akis"], p: "~" + flow + " dk" }]]);
  }
  // Öncelikli bölge: o bölgeyi çalıştıran günlere ek hareket (kondisyondan önce)
  const F = FOCUS[P.focus];
  if (F && F.types.includes(type)) {
    let pats = F.pats.map(([q]) => q);
    if (F.alt) {
      // Seansta zaten olan kas için ikinci varyant yok; olanlar süre kırpmasına karşı öncelik kazanır; sıra öncelikli günler arasında döner (ord)
      const own = (q) => blocks.some((b) => !b.warm && b.items.some((it) => EX[it.x].pat.includes(q)));
      blocks.forEach((b) => { if (!b.warm) b.items.forEach((it) => { if (pats.some((q) => EX[it.x].pat.includes(q))) it.pri = Math.max(it.pri, 8); }); });
      pats = ((ord || 0) % 2 ? pats.reverse() : pats).filter((q) => !own(q));
    }
    const before = blocks.length; block("F · Öncelik: " + F.n, pats.slice(0, P.mins >= 60 ? 2 : 1).map((q) => [q, "acc", 8, F.only ? { only: F.only[q], noWarm: true } : undefined]));
    if (blocks.length > before) { const fb = blocks.pop(), ci = blocks.findIndex((b) => /Kondisyon/.test(b.name)); blocks.splice(ci < 0 ? blocks.length : ci, 0, fb); }
  }
  if (type !== "z2flex" && type !== "sprint" && type !== "cond") blocks.push(COOL(P)); // kondisyon gününün C bloğu zaten soğuma yürüyüşü
  // Blok adı içindeki "circ" tipli maddeler için reçeteyi düzelt
  blocks.forEach((b) => b.items.forEach((it) => { if (Array.isArray(it.p) && it.p[0] && /tur ×/.test(it.p[0]) && EX[it.x].t === "s") it.p = it.p.map((s) => s.replace(/× (\d+)$/, "× $1 sn")); }));
  const s = { type, title, blocks };
  fitTime(s, P);
  // Darbe sınırı yüzünden sprint yoksa gün "Sprint" diye anılmaz
  if (type === "sprint" && !s.blocks.some((b) => !b.warm && b.items.some((it) => EX[it.x].pat.includes("sprint")))) { s.title = "Hız Hazırlığı · Arka Zincir"; const a = s.blocks.find((b) => /^A · Sprint/.test(b.name)); if (a) a.name = "A · Sıçrama"; }
  // Blok harfleri sırayla (süre kırpması ya da atlanan blok sonrası A, B, C ... boşluksuz)
  let li = 0; s.blocks.forEach((b) => { if (!b.warm && /^[A-F] · /.test(b.name)) b.name = "ABCDEFG"[li++] + b.name.slice(1); });
  return s;
}
// Sürümler arası slot kararlılığı (Ö7): önce serbest kurulum; eski planın aynı anahtarındaki (bi-ii) hareket farklıysa ama hâlâ geçerli adaysa
// (alet, sakatlık, seviye, kaçınma) o slotlar istenerek bir kez daha kurulur. Yalnız gerçekten geçersizleşen slotlar değişir. prevSess: { "bi-ii": x }.
function buildStable(type, variant, P, pi, ord, prevSess) {
  const s1 = buildSession(type, variant, P, pi, ord, null);
  if (!prevSess) return s1;
  const wants = {}; let n = 0;
  s1.blocks.forEach((b, bi) => b.items.forEach((it, ii) => { const px = prevSess[bi + "-" + ii]; if (px && it.sn != null && px !== it.x && EX[px]) { wants[it.sn] = px; n++; } }));
  return n ? buildSession(type, variant, P, pi, ord, wants) : s1;
}
// Eski planın slot → hareket haritası (generate(A, { prev }) için): anahtar "faz/gün/blok-madde", ör. "F1/pzt/1-0"; yalnız F1-F3 (Hafta 0 ve test haftaları bunlardan türer)
function prevOf(gen) {
  const o = {};
  ["F1", "F2", "F3"].forEach((ph) => Object.entries((gen && gen.S && gen.S[ph]) || {}).forEach(([dk, s]) => (s.blocks || []).forEach((b, bi) => (b.items || []).forEach((it, ii) => { o[ph + "/" + dk + "/" + bi + "-" + ii] = it.x; }))));
  return o;
}
function maxSets(p) {
  const arr = Array.isArray(p) ? p : [p];
  let m = 0; arr.forEach((s) => { const r = /^(\d+)\s*(?:set\s*)?[×x]/.exec(String(s)); if (r) m = Math.max(m, +r[1]); });
  return m || 1;
}

// ---------------- süre tahmini ve sığdırma ----------------
function itemSec(it, wi) {
  const ex = EX[it.x], rx = String(Array.isArray(it.p) ? it.p[Math.min(wi, it.p.length - 1)] : it.p);
  let m;
  if ((m = /EMOM\s*(\d+)/.exec(rx))) return +m[1] * 60;
  if ((m = /^(\d+)\s*[×x]\s*\(\s*(\d+)\s*(sn|dk)?[^/]*\/\s*(\d+)\s*(sn|dk)?/.exec(rx))) { const u = (x) => (x === "dk" ? 60 : 1); return +m[1] * (+m[2] * u(m[3] || m[5]) + +m[4] * u(m[5] || m[3])); }
  if ((m = /^(\d+)\s*[×x]\s*(\d+)\s*dk[^/]*\/\s*(\d+)\s*dk/.exec(rx))) return +m[1] * (+m[2] + +m[3]) * 60;
  if ((m = /^~?\s*(\d+)\s*dk/.exec(rx))) return +m[1] * 60;
  if ((m = /^(\d+)\s*tur/.exec(rx))) return +m[1] * 50 + 60;
  const sets = maxSetsOne(rx), uni = ex && ex.uni ? 2 : 1;
  if (it.t === "s") { const s = /(\d+)\s*sn/.exec(rx); const hold = s ? +s[1] : 30; return sets * (hold * uni + (it.r || 45)); }
  if (it.t === "x" && !it.r) return 60;
  return sets * (35 * uni + (it.r || 60));
}
function maxSetsOne(rx) { const r = /^(\d+)\s*(?:set\s*)?[×x]/.exec(rx); return r ? +r[1] : 1; }
// Test süreleri (dk, varsayım; bilgi/antrenman-bilimi.md › Süre): ölçüm ~1 dk; maksimum tekrar/tutuş testleri dinlenmesiyle 2-3 dk; 1,6 km testi yürüyüşün kendisi (~16 dk), 6 dk yürüme + ölçüm 7 dk.
// Listede olmayanlar sayılmaz: isteğe bağlı ölçümler, sabah ölçülen dinlenik nabız, hesaplanan değerler (yağ oranı, VO₂max, toparlanma, 1RM). Deadlift 5RM kendi maddesiyle (5×5) sayılır.
const TEST_MIN = { kilo: 1, bel: 1, boyun: 1, kalca: 1, egilme: 1, dikey: 3, barfiks: 3, sinav: 3, squat60: 2, plank_t: 3, sandalye: 2, denge: 2, amut: 2, km_sure: 16, km_hr: 1, yuruyus6: 7, sprint20: 5 };
function estimate(s, wi) {
  let sec = 0;
  s.blocks.forEach((b) => {
    if (b.warm) sec += b.items.reduce((a, it) => { const m = /(\d+)\s*dk/.exec(String(it.p)); return a + (m ? +m[1] * 60 : 60); }, 0);
    else if (b.tests) sec += b.tests.reduce((a, id) => a + (TEST_MIN[id] || 0) * 60, 0) + b.items.reduce((a, it) => a + (it.x === "z2" ? 0 : itemSec(it, wi) + 30), 0); // yürüyüş maddesi testin kendisi
    else if (b.circ) { const rx = String(Array.isArray(b.items[0].p) ? b.items[0].p[Math.min(wi, b.items[0].p.length - 1)] : b.items[0].p); const rounds = +((/^(\d+)\s*tur/.exec(rx) || [0, 3])[1]); sec += rounds * (b.items.length * 40 + 90); }
    else b.items.forEach((it) => { sec += itemSec(it, wi) + 30; });
  });
  return Math.round(sec / 60);
}
// Kondisyon maddesi çıkarılmadan önce kısaltılır: EMOM −2 dk (en az 6), interval −2 tekrar (en az 4), raunt −1 (en az 3)
function shrinkCond(it) {
  if (!Array.isArray(it.p)) return false;
  const f = (v) => String(v).replace(/EMOM (\d+) dk/, (m, n) => (+n > 6 ? "EMOM " + (n - 2) + " dk" : m)).replace(/^(\d+)×\(/, (m, n) => (+n > 4 ? n - 2 + "×(" : m)).replace(/^(\d+)×(\d+ dk \/ )/, (m, n, rest) => (+n > 3 ? n - 1 + "×" + rest : m));
  const np = it.p.map(f); if (np.join("|") === it.p.join("|")) return false; it.p = np; return true;
}
const estMax = (s) => Math.max(estimate(s, 0), estimate(s, 1), estimate(s, 2)); // fazın en uzun haftası (5×3 → 4×3 gibi düşüşlerde 2. hafta en uzun olabilir)
// Gösterilen süre: 5 dk'ya yuvarlı, seçilen süreyi geçmez ("Seans bu süreyi aşmaz"); yalnız sığmayan bir test gününde gerçek tahmin. 20 dk tabanı yok (kısa gün 15 dk olabilir).
function durOf(e, mins) { const r5 = Math.max(5, Math.round(e / 5) * 5); return "~" + (e <= mins * 1.05 ? Math.min(r5, mins) : r5) + " dk"; }
function fitTime(s, P) {
  // %5 tolerans tahminin hata payı; gösterilen süre (durOf) seçilen süreyi geçmez. ponytail: tam sınır (P.mins) slot konumlarını kaydırıyor (Kararlılık testi), slotlar konumdan bağımsız olursa daraltılabilir
  const limit = P.mins * 1.05;
  for (let guard = 0; guard < 60 && estMax(s) > limit; guard++) {
    let low = null;
    s.blocks.forEach((b) => {
      if (b.warm) return;
      const bp = b.circ ? Math.max.apply(null, b.items.map((i) => i.pri)) : null;
      b.items.forEach((it) => { const pr = bp != null ? bp : it.pri; if (pr < 10 && (!low || pr < low.pr)) low = { b, it, pr }; });
    });
    if (!low) break;
    if (low.it.t === "x" && !low.b.circ && shrinkCond(low.it)) continue;
    if (low.b.circ) low.b.items = []; else low.b.items.splice(low.b.items.indexOf(low.it), 1);
    s.blocks = s.blocks.filter((b) => b.items.length);
  }
  // Hâlâ uzunsa set sayısını azalt (en az 2), en düşük öncelikli ve en çok setli hareketten başla
  for (let guard = 0; guard < 40 && estMax(s) > limit; guard++) {
    let best = null;
    s.blocks.forEach((b) => { if (b.warm || b.circ) return; b.items.forEach((it) => { if (!Array.isArray(it.p) || !/^\d+\s*(?:set\s*)?[×x]/.test(String(it.p[it.p.length - 1]))) return; const n = maxSets(it.p); if (n > 2 && (!best || it.pri < best.pri || (it.pri === best.pri && n > maxSets(best.p)))) best = it; }); });
    if (!best) break;
    best.p = best.p.map((v) => String(v).replace(/^(\d+)(\s*(?:set\s*)?[×x])/, (m, a, rest) => Math.max(2, +a - 1) + rest));
    best.s = maxSets(best.p);
  }
  // Son çare: ilk iki ana hareket kalacak şekilde en düşük öncelikli hareketi çıkar
  for (let guard = 0; guard < 10 && estMax(s) > limit; guard++) {
    const all = []; s.blocks.forEach((b) => { if (!b.warm) b.items.forEach((it) => all.push({ b, it })); });
    if (all.length <= 2) break;
    const last = all.slice(2).sort((a, b) => a.it.pri - b.it.pri)[0];
    if (last.b.circ) last.b.items = []; else last.b.items.splice(last.b.items.indexOf(last.it), 1);
    s.blocks = s.blocks.filter((b) => b.items.length);
  }
  s.dur = durOf(estMax(s), P.mins);
}

// ---------------- haftalık düzen ----------------
function specials(P) {
  const map = { dovus: "box", yag: "cond", kondisyon: "cond", patlayici: "sprint", esneklik: "z2flex" };
  const out = [];
  const box = has(P, "dovus");
  P.goals.forEach((g) => { let t = map[g]; if (t === "cond" && box) t = "box"; if (t && !out.includes(t) && !(t === "sprint" && !P.sprintOK)) out.push(t); });
  return out;
}
function split(P) {
  const N = P.days.length, sp = specials(P), cali = has(P, "kalistenik") || has(P, "amut");
  const up1 = cali ? ["cali", 0] : ["upper", 0], up2 = cali ? ["upper", 0] : ["upper", 1];
  if (N <= 2) return [["fb", 0], ["fb", 1]];
  if (N === 3) {
    // Art arda günler varsa aynı bölgeyi üst üste yüklememek için alt / üst / ... düzeni
    const ix = P.days.map((k) => DAYS.findIndex((d) => d.k === k)), adj = ix.some((v, i) => i && v - ix[i - 1] === 1);
    if (adj) return [["lower", 0], up1, sp[0] ? [sp[0], 0] : ["fb", 1]];
    return [["fb", 0], sp[0] ? [sp[0], 0] : ["fb", 2], ["fb", 1]];
  }
  if (N === 4) return [["lower", 0], up1, sp[0] ? [sp[0], 0] : ["lower", 1], sp[0] ? ["fb", 1] : up2];
  if (N === 5) return [["lower", 0], up1, sp[0] ? [sp[0], 0] : ["lower", 1], up2, sp[1] ? [sp[1], 0] : sp[0] ? ["lower", 1] : ["z2flex", 0]];
  const third = [sp[0] || "cond", 0];
  const fourth = sp.includes("sprint") && third[0] !== "sprint" ? ["sprint", 0] : ["lower", 1];
  const sixth = sp.find((t) => t !== third[0] && t !== fourth[0] && t !== "sprint");
  return [["lower", 0], up1, third, fourth, up2, [sixth || "z2flex", 0]];
}
const HOME_OF = { lower: "A", upper: "B", cali: "B", box: "C", sprint: "A", cond: "C", fb: null };

// ---------------- testler ----------------
function testList(P) {
  const T = [
    ["kilo", "Vücut", "Kilo", "kg", "down", "Sabah, tuvaletten sonra, aç ve aynı kıyafetle. Günlük dalgalanır; haftalık ortalamaya bak."],
    ["bel", "Vücut", "Bel çevresi", "cm", "down", "Göbek deliği hizasında, nefes verdikten sonra; mezura yere paralel, sıkmadan."],
    ["boyun", "Vücut", "Boyun çevresi", "cm", null, "Gırtlağın hemen altından."],
  ];
  if (P.sex === "k") T.push(["kalca", "Vücut", "Kalça çevresi", "cm", "down", "Kalçanın en geniş yerinden (yağ oranı hesabı için gerekli)."]);
  else T.push(["kalca", "Vücut", "Kalça çevresi", "cm", "down", "Kalçanın en geniş yerinden."]);
  T.push(["kol", "Vücut", "Kol çevresi", "cm", null, "Pazının en kalın yeri, kol gevşek.", false, false, true]);
  T.push(["yag", "Vücut", "Yağ oranı (tahmini)", "%", "down", "ABD Donanması formülüyle bel, boyun (kadınlarda kalça) ve boydan hesaplanır. Kesin değil; eğilime bak.", true]);
  T.push(["rhr", "Kondisyon", "Dinlenik nabız", "atım/dk", "down", "Uyanınca yataktan kalkmadan bileğinden ya da boynundan 60 sn say. Üç sabahın ortalamasını yaz."]);
  const soft = P.cautious || P.age >= 60 || P.fall; // denge / düşme riskinde de yumuşak testler
  if (soft) {
    T.push(["yuruyus6", "Kondisyon", "6 dakika yürüme", "m", "up", "Düz bir yerde 6 dakika boyunca rahat ama tempolu yürü; mesafeyi telefonun GPS'iyle ölç. Nefesin sıkışırsa yavaşla ya da dur."]);
  } else {
    T.push(["km_sure", "Kondisyon", "1.6 km süresi", "dk:sn", "down", "Düz bir parkurda olabildiğince hızlı yürü" + (P.imp[0] >= 2 ? " ya da koş-yürü" : "") + ". Mesafeyi telefonun GPS'i ile ölç; her testte aynı parkur.", false, true]);
    T.push(["km_hr", "Kondisyon", "1.6 km bitiş nabzı", "atım/dk", null, "Bitirir bitirmez 15 sn say, 4 ile çarp."]);
    T.push(["km_hr1", "Kondisyon", "1 dk sonraki nabız", "atım/dk", "down", "Bitişten tam 1 dk sonra 15 sn say, 4 ile çarp.", false, false, true]);
    T.push(["vo2", "Kondisyon", "VO₂max (tahmini)", "ml/kg/dk", "up", "Rockport formülüyle hesaplanır. Sadece kendi gelişimini karşılaştırmak için.", true]);
    T.push(["hrr", "Kondisyon", "Nabız toparlanması (1 dk)", "atım", "up", "Bitiş nabzı eksi 1 dk sonraki nabız. Büyüdükçe kondisyon iyileşiyor.", true]);
  }
  if (P.imp[0] >= 2) {
    T.push(["dikey", "Patlayıcılık", "Dikey sıçrama", "cm", "up", "Duvarın yanında dur, parmak ucunu ıslat. Ayakta uzanabildiğin en yüksek noktaya, sonra sıçrayıp en yükseğe dokun. Fark = sıçrama. 3 deneme."]);
    T.push(["uzun", "Patlayıcılık", "Durarak uzun atlama", "cm", "up", "Çizgiden iki ayakla sıçra; çizgiden en arkadaki topuğa kadar ölç. 3 deneme.", false, false, true]);
  }
  if (P.sprintOK && P.eq.has("outdoor") && P.imp[1] >= 2 && P.L >= 2) T.push(["sprint20", "Patlayıcılık", "20 m sprint", "sn", "down", "4. haftadan itibaren. Telefonu 20 m'yi yandan görecek şekilde koyup videoya al; ilk hareketten bitiş çizgisine kadar süreyi videodan oku."]);
  if (P.eq.has("pullbar") && !soft) T.push(["barfiks", "Kuvvet", "Barfiks (maks)", "tekrar", "up", "Tam asılmadan başla, çene bar üstüne. Sallanmak yok. Hiç çıkamıyorsan 0 yaz."]);
  if (soft) {
    T.push(["sandalye", "Kuvvet", "30 sn sandalyeden kalkma", "tekrar", "up", "Kollar göğüste çapraz, standart yükseklikte sağlam bir sandalye. 30 saniyede kaç kez tam kalkıp oturabildiğin."]);
    T.push(["denge", "Kuvvet", "Tek ayak denge", "sn", "up", "Duvarın yanında, tek ayak üstünde; en fazla 60 sn. Gerekirse parmakla duvara dokunarak başla."]);
  } else {
    T.push(["sinav", "Kuvvet", "Şınav (maks)", "tekrar", "up", "Göğüs yere yaklaşsın, vücut düz. Form bozulunca biter. Tam şınav yapamıyorsan 0 yaz."]);
    T.push(["squat60", "Kuvvet", "1 dakikada squat", "tekrar", "up", "Vücut ağırlığıyla, uyluk yere paralel olacak derinlikte 60 sn'de kaç squat."]);
    T.push(["plank_t", "Kuvvet", "Plank", "sn", "up", "Önkol plank; kalça düştüğü an biter."]);
  }
  if (P.eq.has("pullbar") && !soft) T.push(["asilma", "Kuvvet", "Ölü asılma", "sn", "up", "Omuz genişliğinde tutuş; bırakana kadar geçen süre.", false, false, true]);
  if (has(P, "amut") || has(P, "kalistenik")) T.push(["amut", "Kuvvet", "Amut / ters V tutuşu", "sn", "up", "Seviyeni nota yaz: yerde ters V, duvarda ters V ya da duvara dönük amut."]);
  // 5RM testi yok: 18 yaş altı, temkinli, bel ağrısı, yüksek tansiyon (nefes tutmalı maksimum), deadlift'i barla öğrenmemiş
  if (P.eq.has("barbell") && P.L >= 2 && !P.cautious && P.inj.back < 2 && P.age >= 18 && !P.bp && P.learned.has("dl")) { T.push(["dl5", "Kuvvet", "Deadlift 5RM", "kg", "up", "4. haftadan itibaren. 5 temiz tekrar yapabildiğin en ağır yük."]); T.push(["e1rm", "Kuvvet", "Deadlift 1RM (tahmini)", "kg", "up", "5 tekrarlık kilo × 1,167 (Epley formülü).", true]); }
  T.push(["egilme", "Esneklik", "Öne eğilme", "cm", "up", "Ayakta, dizler düz öne eğil. Parmak uçları yere değmiyorsa mesafeyi eksi (−8), geçiyorsa artı (+3) yaz."]);
  T.push(["apley_s", "Esneklik", "Sırtta el birleştirme · sağ el üstte", "cm", "up", "Sağ el omuz üstünden, sol el belden sırtta birleşsin. Arada mesafe eksi, üst üste binme artı.", false, false, true]);
  T.push(["apley_l", "Esneklik", "Sırtta el birleştirme · sol el üstte", "cm", "up", "Sol el omuz üstünden, sağ el belden.", false, false, true]);
  T.push(["bilek_s", "Esneklik", "Diz-duvar ayak bileği · sağ", "cm", "up", "Diz duvara değerken topuk kalkmadan ayak ucunun duvara en uzak mesafesi.", false, false, true]);
  T.push(["bilek_l", "Esneklik", "Diz-duvar ayak bileği · sol", "cm", "up", "Sağ ile aynı şekilde.", false, false, true]);
  if (has(P, "esneklik") && !soft) { T.push(["onspagat", "Esneklik", "Ön spagat (kötü taraf)", "cm", "down", "Ellerle destekli, kasık ile yer arası.", false, false, true]); T.push(["yanspagat", "Esneklik", "Yan açılma", "cm", "down", "Ellerle destekli, kasık ile yer arası.", false, false, true]); }
  if (!soft) T.push(["comelme", "Esneklik", "Derin çömelme", "sn", "up", "Topuklar yerde, destek almadan tutabildiğin süre (en fazla 120).", false, false, true]);
  return T.map(([id, g, n, u, b, how, calc, time, opt]) => ({ id, g, n, u, b, how, calc: !!calc, time: !!time, opt: !!opt }));
}
const TEST_GROUPS = {
  A: { name: "Test A · Vücut ve hareketlilik", ids: ["kilo", "bel", "boyun", "kalca", "kol", "yag", "rhr", "egilme", "apley_s", "apley_l", "bilek_s", "bilek_l", "onspagat", "yanspagat", "comelme", "dikey", "uzun"] },
  B: { name: "Test B · Kuvvet ve kalistenik", ids: ["barfiks", "sinav", "squat60", "plank_t", "sandalye", "denge", "asilma", "amut", "dl5", "e1rm"] },
  C: { name: "Test C · Kondisyon", ids: ["sprint20", "km_sure", "km_hr", "km_hr1", "vo2", "hrr", "yuruyus6"] },
};

function testSession(base, groups, P, first, wiLight) {
  const tl = testList(P).map((t) => t.id);
  const blocks = [base.blocks[0]];
  groups.forEach((g) => {
    let ids = TEST_GROUPS[g].ids.filter((id) => tl.includes(id));
    if (first) ids = ids.filter((id) => id !== "sprint20" && id !== "dl5" && id !== "e1rm");
    const measured = ids.filter((id) => !["yag", "vo2", "hrr", "e1rm"].includes(id));
    if (!measured.length) return;
    const items = [];
    if (g === "C") items.push({ x: "z2", p: ids.includes("yuruyus6") ? "6 dk rahat tempolu yürüyüş" : "1.6 km olabildiğince hızlı" + (P.imp[0] >= 2 ? " (yürü veya koş-yürü)" : " yürüyüş"), t: "x", pri: 100 });
    if (g === "B" && ids.includes("dl5")) items.push({ x: "dl", p: "5×5 artan ağırlık, son set 5RM", t: "w", s: 5, r: 180, n: "5 temiz tekrar yapabildiğin en ağır yük. Teknik bozulursa dur.", pri: 100 });
    blocks.push({ name: TEST_GROUPS[g].name, tests: ids, items });
  });
  // hafif antrenman: en önemli 3 hareket, 2 set (devre maddeleri tek başına değil; kondisyon kısaltılmış)
  const main = [];
  base.blocks.forEach((b) => { if (!b.warm && !b.circ) b.items.forEach((it) => { if (it.x !== "z2" && it.x !== "z2m") main.push(it); }); }); // yürüyüş testin kendisi ya da soğuma
  main.sort((a, b) => b.pri - a.pri);
  const light = main.slice(0, 3).map((it) => {
    const p = lightRx(String(Array.isArray(it.p) ? it.p[0] : it.p), true);
    return Object.assign({}, it, { p, s: lightSets(p, it), n: first ? "Alışma: rahat, hiç zorlamadan." : "Hafif hafta: rahat, teknik odaklı." });
  });
  const lb = light.length ? { name: first ? "Alışma antrenmanı" : "Hafif antrenman", items: light } : null;
  if (lb) blocks.push(lb);
  blocks.push(COOL(P));
  const title = groups.length ? groups.map((g) => "Test " + g).join(" + ") + " · " + (first ? "Alışma" : "Hafif hafta") : (first ? "Alışma · " : "Hafif hafta · ") + base.title;
  const s = { type: base.type, title, blocks };
  // Testler süreye sayılır (Ö6): seçilen süreyi aşıyorsa hafif antrenmanın en düşük öncelikli hareketi çıkar (testler kalır)
  while (lb && lb.items.length && estimate(s, 0) > P.mins * 1.05) lb.items.pop();
  if (lb && !lb.items.length) s.blocks = s.blocks.filter((b) => b !== lb);
  s.dur = durOf(estimate(s, 0), P.mins);
  return s;
}
// Hafif hafta reçetesi: set sayısı (test haftası 2, deload bir eksik ve en az 2; "3 set × (max − 1)" dahil), EMOM 6 dk, devre 2 tur, interval yarıya (en az 4)
function lightRx(rx, test) {
  const m = /^(\d+)(\s*(?:set\s*)?[×x](?!\().*)$/.exec(rx);
  if (m) return (test ? 2 : Math.max(2, +m[1] - 1)) + m[2];
  return rx.replace(/EMOM (\d+) dk/, "EMOM 6 dk").replace(/^(\d+)( tur)/, "2$2").replace(/^(\d+)×\(/, (x, n) => Math.max(4, Math.round(n / 2)) + "×(");
}
function lightSets(p, it) { const tur = /^(\d+)\s*tur/.exec(p); return tur ? +tur[1] : /^\d+\s*(?:set\s*)?[×x]/.test(p) ? maxSetsOne(p) : it.s; }
function deloadSession(base, P, first, label) {
  const blocks = base.blocks.map((b) => b.warm ? b : Object.assign({}, b, { items: b.items.map((it) => {
    const p = lightRx(String(Array.isArray(it.p) ? it.p[0] : it.p), false);
    return Object.assign({}, it, { p, s: lightSets(p, it), n: first ? "Alışma: rahat, hiç zorlamadan." : "Hafif hafta: rahat, teknik odaklı." });
  }) }));
  const s = { type: base.type, title: (label || (first ? "Alışma · " : "Hafif hafta · ")) + base.title, blocks };
  s.dur = durOf(estimate(s, 0), P.mins);
  return s;
}

// ---------------- beslenme, kurallar, hedefler ----------------
function nutrition(P) {
  const bmr = 10 * P.w + 6.25 * P.h - 5 * P.age + (P.sex === "k" ? -161 : 5);
  // Antrenman günü sayısı + gün içindeki hareketlilik (masa başı / ayakta / ağır iş)
  const act = (P.days.length <= 3 ? 1.4 : P.days.length <= 5 ? 1.5 : 1.6) + ({ ayakta: 0.1, agir: 0.2 }[P.act] || 0);
  const tdee = bmr * act, minor = P.age < 18;
  // Büyüme çağında, hamilelikte ve doğum sonrası ilk 6 ayda (emzirme) kalori açığı yok
  const lose = !P.noLoss && (has(P, "yag") || P.bmi >= 27 || (P.goalW && P.goalW < P.w - 1));
  const gain = !lose && !P.preg && has(P, "kas") && P.bmi < 25;
  let kcal = lose ? tdee * 0.8 : gain ? tdee * 1.1 : tdee;
  kcal = Math.max(kcal, P.sex === "k" ? 1300 : 1600);
  const refW = Math.min(P.w, 25 * Math.pow(P.h / 100, 2));
  const prot = Math.round((refW * (gain ? 1.8 : lose ? 1.6 : 1.4)) / 5) * 5;
  const water = Math.round(P.w * 0.035 * 2) / 2;
  const r50 = (v) => Math.round(v / 50) * 50;
  const rows = [
    ["Günlük kalori", "~" + r50(kcal - 50) + "-" + r50(kcal + 50) + " kcal. Tahmini harcaman ~" + r50(tdee) + " kcal" + (lose ? "; hafif açık ile kilo kaybı. Her 5 kg'da 100 kcal düşür." : gain ? "; hafif fazlayla kas kazanımı." : "; kilonu korursun.")],
    ["Protein", "~" + prot + " g/gün. Her öğünde 30-50 g: yumurta, tavuk, et, balık, yoğurt, lor, peynir, baklagil."],
    ["Karbonhidrat", "Çoğunu antrenman öncesi ve sonrasına koy: yulaf, bulgur, pirinç, patates, tam buğday ekmek, meyve."],
    ["Yağ", "Zeytinyağı, fındık-ceviz (avuç), yumurta. Kızartma ve paketli atıştırmalıkları azalt."],
    ["Sebze", "Her öğünde tabağın yarısı."],
    ["Su", "Günde ~" + String(water).replace(".", ",") + " litre (kilo başına ~35 ml); antrenman günleri ve sıcakta daha fazla."],
    ["Adım", "Günde 7-10 bin adım."],
    ["Uyku", "7-9 saat. Toparlanmanın ve kilo kontrolünün en ucuz yolu."],
  ];
  if (lose) rows.push(["Takip", "Her sabah tartıl, haftalık ortalamaya bak. İki hafta üst üste haftada 0,3 kg'dan az düşüş olursa günlük 150 kcal azalt ya da 2000 adım ekle."]);
  if (minor) rows.unshift(["Büyüme çağı", "18 yaşından küçüksün: kalori kısıtlaması yapma. Kilo kontrolünü hareket ve beslenme kalitesiyle sağla; öğün atlama."]);
  if (P.preg) rows.unshift(["Hamilelik", "Kalori ve beslenme ihtiyacın değişir; hesapları doktoruna ya da diyetisyenine danışarak kullan."]);
  if (P.postp) rows.unshift(["Doğum sonrası", "İlk aylarda kalori açığı yok; emziriyorsan ihtiyacın artar. Kilo hedefini doktorunla konuş, bu hesapları yol gösterici say."]);
  if (P.diab) rows.unshift(["Şeker hastalığı", "Kalori ve karbonhidrat planını doktorun ya da diyetisyeninle yap; buradaki sayılar genel çerçeve. Antrenmandan önce ve sonra şekerini ölç, yanında hızlı şeker (meyve suyu, kesme şeker) bulundur."]);
  rows.push(["Oruç", "Oruçluysan antrenmanı iftardan 1-2 saat sonraya ya da iftardan hemen önceye hafif olarak al; sahurda protein ve su ağırlıklı ye."]);
  return { intro: "Genel bir çerçevedir, tıbbi diyet değildir. Sağlık sorunun varsa bir diyetisyene danış.", rows, kcal: Math.round(kcal), prot };
}
function rules(P) {
  const R = [
    { h: "Aralıkları okuma", t: "“3×8 → 3×10 → 4×10” fazın 1., 2. ve 3. haftasının reçetesidir. “/taraf” her taraf için demektir." },
    { h: "Yedekte tekrar", t: "Faz 1'de her seti 3 tekrar yapabilecek güç kalmışken bitir, Faz 2'de 2, Faz 3'te 1-2. Tükenişe gitmek yok." },
    { h: "İlerleme", t: "Tüm setlerde aralığın üst sınırına ulaşınca bir sonraki antrenmanda ağırlığı artır (yükün yaklaşık %5'i; kol, omuz ve baldır gibi tek eklemli hareketlerde yarısı) ya da daha zor varyasyona geç. Seans zorluğunu 9-10 işaretlediysen önce aynı kiloyu pekiştir. Uygulama her ağırlıklı harekette bugünkü kiloyu ve nedenini gösterir." },
    { h: "Dinlenme", t: "Kuvvet, sıçrama ve sprintte dinlenme kalite içindir; kısaltma. Kondisyon bölümünde süreler reçetede yazar." },
    { h: "Ağrı kuralı", t: "Ağrı 10 üzerinden 0-3 ise devam. 4 ve üstüyse o hareketi hafiflet ya da değiştir. Eklemde keskin ağrı olursa bırak." },
    { h: "Isınma", t: "Isınmayı hiçbir zaman atlama; özellikle sabah antrenmanlarında." },
    { h: "Yoğun hafta", t: "Günü kaçırırsan programı kaydır; iki antrenmanı bir güne sıkıştırma. Tempolu yürüyüş her zaman iyi bir yedektir." },
  ];
  const J = LIB.JOINTS;
  const pain = Object.keys(P.injA).filter((j) => P.injA[j] === 2).map((j) => J[j].toLowerCase());
  const past = Object.keys(P.injA).filter((j) => P.injA[j] === 1).map((j) => J[j].toLowerCase());
  if (pain.length) R.unshift({ h: "Şu anki ağrın", t: "Ağrı olan bölgeyi (" + pain.join(", ") + ") zorlayan hareketleri programdan çıkardım ve güvenli alternatifler koydum. Ağrı devam ediyorsa ya da artıyorsa bir fizyoterapiste veya doktora görün." });
  if (past.length) R.push({ h: "Geçmiş sakatlıklar", t: "Geçmişte sorun yaşadığın bölgeler (" + past.join(", ") + ") için en yüksek yüklü hareketleri çıkardım, ısınmaya koruyucu hareketler ekledim." });
  if (P.arth) R.push({ h: "Eklem romatizması", t: "Her eklem için en yüklü varyasyonları çıkardım, ısınmaya eklem hazırlığı ekledim, sıçrama en fazla hafif. Alevlenme döneminde o eklemi zorlayan hareketi atla; ağrı 10 üzerinden 4'ü geçerse hafiflet." });
  if (P.preg) R.unshift({ h: "Hamilelik", t: "Programı en düşük yoğunlukta, sıçrama, sırtüstü uzun süre yatılan ve karın içi basıncı artıran hareketler olmadan kurdum. Nefesini tutma, aşırı ısınma, baş dönmesi, kanama ya da ağrı olursa dur. Doktorunun onayı olmadan başlama." });
  else if (P.postp) R.unshift({ h: "Doğum sonrası", t: { "0-6": "İlk 6 hafta: en düşük yoğunluk, sıçrama yok, karın içi basıncı artıran hareket yok; her ısınmada pelvik taban. Doktor kontrolünden geçmeden başlama.", "6-12": "6-12. hafta: temel seviye, sıçrama ve koşu yok, karın ve gövde nazik hareketlerle; her ısınmada pelvik taban. Kanama, ağrı ya da idrar kaçırma olursa o hareketi bırak ve doktoruna söyle.", "12-24": "3-6. ay: yük artabilir, sıçrama ve koşu hafif tutuldu; her ısınmada pelvik taban. İdrar kaçırma ya da karında bombeleşme olursa yükü düşür." }[P.postp] });
  else if (P.cautious) R.unshift({ h: "Sağlık taraması", t: "Sağlık sorularından en az birine “evet” dedin (ya da 65 yaş üstündesin). Programı en düşük yoğunlukta, sıçrama ve maksimum testler olmadan kurdum; testler de zorlanmadan yapılır. Başlamadan önce doktoruna danış." });
  else if (P.medOK) R.unshift({ h: "Sağlık durumun", t: "Doktor onayın olduğunu belirttin. Yine de yüksek darbeli hareketleri sınırlı tuttum. Göğüs ağrısı, baş dönmesi ya da olağan dışı nefes darlığında hemen dur." });
  if (P.bp) R.unshift({ h: "Yüksek tansiyon", t: "Ağır düşük tekrarlı setler ve maksimum kaldırış testleri yok; nefesini tutarak zorlanmak yok, kaldırırken nefes ver. Baş aşağı duruşlar yok. İlacını doktorunun dediği gibi al; baş ağrısı, baş dönmesi ya da göğüste baskı olursa dur." });
  if (P.asthma) R.unshift({ h: "Astım", t: "Isınma uzun ve kademeli; kondisyonda iş süresi dinlenmeyi geçmez. İnhalerin her antrenmanda yanında olsun, soğuk ve kuru havada dışarıda ağır kondisyon yapma. Nefes sıkışırsa dur." });
  if (P.diab) R.unshift({ h: "Şeker hastalığı", t: "Antrenmandan önce ve sonra şekerini ölç; titreme, terleme ya da baş dönmesi olursa dur ve hızlı şeker al. Ayaklarını ve ayakkabını her antrenmandan sonra kontrol et." });
  if (P.osteo) R.unshift({ h: "Kemik erimesi", t: "Yük altında öne eğilip omurgayı yuvarlayan ve döndüren hareketler yok, sıçrama en fazla hafif; denge çalışması her haftada. Kuvvet çalışması kemik için faydalı: sırt düz, yük kademeli." });
  if (P.fall) R.unshift({ h: "Denge", t: "Sıçrama ve koşu yok, her haftada denge çalışması var. Tek ayak hareketlerinde duvara ya da sağlam bir şeye yakın dur." });
  if (P.lowSleep && P.highStress) R.push({ h: "Toparlanma", t: "Uykun az ve stresin yüksek; set sayılarını 3 ile sınırladım. Düzelince Cevapları düzenle'den güncelle." });
  else if (P.lowSleep) R.push({ h: "Uyku", t: "6 saatten az uyuduğunu söyledin; set sayılarını 3 ile sınırladım. Uykun düzelince Cevapları düzenle'den güncelle." });
  else if (P.highStress) R.push({ h: "Stres", t: "Stresinin yüksek olduğunu söyledin; set sayılarını 3 ile sınırladım, kısa ve düzenli antrenman uzun ve seyrek olandan iyidir. Rahatlayınca Cevapları düzenle'den güncelle." });
  if (P.evWeek) R.push({ h: "Etkinlik haftası", t: "Etkinliğin / müsabakan programın " + P.evWeek + ". haftasına denk geliyor: " + (P.evWeek % 4 === 0 ? "o hafta zaten hafif test haftası; testleri etkinlikten sonraya bırak." : "o hafta tüm setler 2'ye, kondisyon yarıya indi (hafif hafta).") + " Etkinlikten önceki 2 gün antrenman yapma, hafif yürüyüş yeter." });
  if (P.bmi >= 30) R.push({ h: "Eklemlerini koru", t: (P.noLoss ? "Sıçrama ve koşu gibi darbeli hareketler sınırlı tutuldu." : "Kilon düştükçe sıçrama ve koşu gibi darbeli hareketler kademeli olarak programa giriyor.") + " Şimdilik darbesiz kondisyon ağırlıklı." });
  if (P.eq.has("barbell") && P.eq.has("landmine")) R.push({ h: "Landmine hareketleri", t: "Landmine aparatın yoksa barın bir ucunu sağlam bir oda köşesine yerleştir; ucu havluya ya da eski bir ayakkabıya sar ki duvar ve zemin zarar görmesin. Bar kayıyorsa hareketi yapma, alternatifini seç." });
  return R;
}
function targets(P) {
  const T = [];
  if (P.noLoss && (P.yagOff || (P.goalW && P.goalW < P.w))) T.push(["Kilo", "Bu dönemde kilo verme hedefi yok; kilonu korursun."]); // nutrition() ile aynı koruma (K1)
  else if (P.goalW && P.goalW < P.w) {
    const loss12 = Math.min(P.w - P.goalW, Math.round(P.w * 0.0075 * 12));
    const weeks = Math.ceil((P.w - P.goalW) / (P.w * 0.0075));
    T.push(["Kilo", Math.round(P.w) + " kg → yaklaşık " + Math.round(P.w - loss12) + " kg (haftada ~%0,5-1). " + Math.round(P.goalW) + " kg hedefine yaklaşık " + weeks + " haftada ulaşılır."]);
  } else if (has(P, "yag")) T.push(["Kilo", "Haftada vücut ağırlığının ~%0,5-1'i kadar kayıp; bel çevresinde belirgin azalma."]);
  if (has(P, "kas")) T.push(["Kas", "Yeni başlayanlarda ayda ~0,5-1 kg yağsız kütle; kol ve göğüs çevresinde artış."]);
  if (has(P, "kuvvet")) T.push(["Kuvvet", "Ana hareketlerde %10-30 artış (yeni başlayanlarda daha fazla)."]);
  if (has(P, "kalistenik") || has(P, "amut")) T.push(["Kalistenik", "Barfiks ve şınav sayında belirgin artış; amutta duvara dönük 30-60 sn tutuş. Serbest amut genelde 6-12 ay sürer."]);
  if (has(P, "kondisyon") || has(P, "yag")) T.push(["Kondisyon", "Dinlenik nabızda 3-10 atım düşüş, 1.6 km süresinde belirgin iyileşme."]);
  if (has(P, "esneklik")) T.push(["Esneklik", "Öne eğilme, omuz ve spagat testlerinde ölçülebilir ilerleme."]);
  if (has(P, "patlayici")) T.push(["Patlayıcılık", "Dikey sıçramada birkaç cm artış, sprint süresinde düşüş."]);
  if (has(P, "dovus")) T.push(["Dövüş", "Raund dayanıklılığında ve vuruş hızında belirgin artış."]);
  if (!T.length) T.push(["Genel", "Düzenli antrenman alışkanlığı, daha iyi kondisyon, kuvvet ve hareketlilik."]);
  return T;
}

// Programın neden böyle kurulduğu (özet ekranında gösterilir)
// Sihirbazdaki aralık düğmelerinin motora giden değeri (public.js TB) → özet ölçülmüş sayı değil aralığı yazar
const RANGE = { pushup: { 3: "1-5", 10: "6-15", 22: "16-30", 35: "30'dan fazla" }, pullup: { 2: "1-3", 6: "4-8", 12: "9-15", 18: "15'ten fazla" } };
function reasons(P, A, S) {
  const out = [], J = LIB.JOINTS, lvl = ["", "Başlangıç", "Orta", "İleri"][P.L];
  // Planda gerçekten olan (ısınma dışı) hareketler: kondisyon ve kardiyo cümleleri yalnız o bölüm varsa yazılır (Ö7)
  const inPlan = new Set(); ["F1", "F2", "F3"].forEach((ph) => Object.values(S[ph]).forEach((s) => s.blocks.forEach((b) => { if (!b.warm) b.items.forEach((it) => inPlan.add(it.x)); })));
  const condIn = [...inPlan].some((id) => EX[id].pat.some((q) => q === "cond" || q === "z2"));
  const yil = { yok: "hiç ya da 3 aydan az", az: "3-12 ay", orta: "1-3 yıl", cok: "3 yıldan fazla" }[A.yil || A.exp];
  const frq = { "0": "son 3 ayda ara vermişsin", "1-2": "son 3 ayda haftada 1-2 gün", "3-4": "son 3 ayda haftada 3-4 gün", "5+": "son 3 ayda haftada 5+ gün" }[A.freq];
  const capped = !P.cautious && P.L < P.expBase && ((P.pushN != null && P.pushN < 10) || (P.plankN != null && P.plankN < 30));
  out.push("Seviye " + lvl + ": " + [yil ? "deneyim " + yil : "", frq || "", P.pushN != null ? (RANGE.pushup[P.pushN] || P.pushN) + " şınav" : "", P.pullN != null ? (RANGE.pullup[P.pullN] || P.pullN) + " barfiks" : ""].filter(Boolean).join(", ") +
    (P.cautious ? " (sağlık cevapların nedeniyle en düşük yoğunluk)" : capped ? " (deneyimin var ama şınav/plank sonucun kuvvette temelden başlamayı gerektiriyor; testlerle yükselir)" : "") + ".");
  P.badTests.forEach(([k, v]) => out.push({ pushup: "Şınav", pullup: "Barfiks", plank: "Plank" }[k] + " testindeki " + v + " gerçekçi görünmediği için dikkate alınmadı; testi yeniden yapıp düzelt."));
  P.badRm.forEach(([k, v]) => out.push({ squat: "Squat", dl: "Deadlift", bench: "Bench press" }[k] + " 5RM değeri (" + v + ") gerçekçi görünmediği için dikkate alınmadı (" + RM_MIN + "-" + RM_MAX[k] + " kg); Cevapları düzenle'den düzelt."));
  if (P.noLoss && (P.yagOff || (P.goalW && P.goalW < P.w))) out.push((P.preg ? "Hamilelikte" : P.postp ? "Doğum sonrası ilk 6 ayda" : "18 yaşından küçükken") + " kilo verme hedefi uygulanmaz: kalori açığı ve hedef kilo süresi yok" + (P.yagOff ? "; “Kilo vermek” hedefin kondisyon çalışması olarak alındı." : "."));
  if (A.bg && !(A.bg || []).includes("agirlik") && P.L > 1) out.push("Ağırlık geçmişin olmadığı için ana hareketler en kolay şekilleriyle başlıyor.");
  if (P.pushLvl === 0) out.push("Şınav eğimli ve dizüstü şınavla başlıyor; tam şınava testlerle geçilecek.");
  if (P.runCap != null && condIn) out.push("Kondisyon bölümünün (tempolu yürüyüş, koşu, interval) zorluğu, kesintisiz " + ["10 dakikadan az yürüyüş", "30 dakika tempolu yürüyüş", "20-30 dakika hafif koşu", "30+ dakika koşu"][P.runCap] + " cevabına göre ayarlandı.");
  if (P.imp[0] === 0) out.push("Sıçrama ve darbeli hareket yok.");
  else if (P.imp[2] <= 1) out.push("Eklemlerini korumak için sıçrama ve koşu sınırlı.");
  Object.keys(P.injA).forEach((j) => { if (P.injA[j] === 2) out.push(J[j] + " ağrısı: bu bölgeyi zorlayan hareketler çıkarıldı."); else if (P.injA[j] === 1) out.push(J[j] + " geçmişi: en yüklü varyasyonlar yok, ısınmaya koruyucu hareket eklendi."); });
  if (P.arth) out.push("Eklem romatizması: her eklemde en yüklü varyasyonlar yok, ısınmada eklem hazırlığı, sıçrama en fazla hafif.");
  if (P.bp) out.push("Yüksek tansiyon: ağır düşük tekrarlı setler, maksimum kaldırış testi ve baş aşağı duruş yok; her kaldırışta nefes notu.");
  if (P.asthma) out.push("Astım: ısınma 3 dk daha uzun ve kademeli, kondisyon bölümünde çalışma süresi dinlenmeyi geçmiyor.");
  if (P.diab) out.push("Şeker hastalığı: beslenme ve kurallara şeker ölçümü notu eklendi.");
  if (P.osteo) out.push("Kemik erimesi: yük altında omurgayı büken/döndüren hareketler yok, sıçrama sınırlı, denge çalışması eklendi.");
  if (P.fall) out.push("Denge / düşme riski: sıçrama ve koşu yok, denge çalışması ve yumuşak testler.");
  if (P.postp) out.push("Doğum sonrası " + { "0-6": "ilk 6 hafta: en düşük yoğunluk, karın ve gövde nazik hareketlerle, her ısınmada pelvik taban.", "6-12": "6-12. hafta: temel seviye, sıçrama yok, karın ve gövde nazik hareketlerle, her ısınmada pelvik taban.", "12-24": "3-6. ay: sıçrama ve koşu hafif, her ısınmada pelvik taban." }[P.postp]);
  if (!P.eq.has("pullbar")) out.push("Barfiks barın olmadığı için çekişler " + (P.eq.has("band") ? "bant ve " : "") + "havluyla kapı kürek ile yapılıyor.");
  if (P.dbLight) out.push("Dambılların hafif olduğu için tekrarlar yüksek ve iniş yavaş.");
  else if (P.dbList.length) out.push("Dambılların (" + P.dbList.join(", ") + " kg) bilindiği için başlangıç kiloları ve ağırlık önerileri eldekine göre.");
  else if (P.dbStep) out.push("Ayarlanabilir dambılın en ağır " + P.dbMax + " kg, adım " + String(P.dbStep).replace(".", ",") + " kg: öneriler buna göre yuvarlanır.");
  if (P.barKg || P.barStep) out.push("Halter: bar " + (P.barKg || "?") + " kg, en küçük artış " + String(P.barStep || 2.5).replace(".", ",") + " kg; başlangıç kiloları buna göre.");
  if (P.bandLight) out.push("Bandın hafif: bantlı hareketlerde tekrar yüksek, yardımlı barfiks yok.");
  if (Array.isArray(A.lifts) && P.eq.has("barbell") && ALL_LIFTS.some((k) => !P.learned.has(k))) out.push("Barla öğrenmediğin kaldırışlar (" + ALL_LIFTS.filter((k) => !P.learned.has(k)).map((k) => ({ squat: "squat", dl: "deadlift", bench: "bench press", ohp: "omuz press" }[k])).join(", ") + ") Faz 1'de dambıl/vücut ağırlığıyla, Faz 2'den itibaren hafif barla teknik öğrenerek.");
  if (P.lowSleep && P.highStress) out.push("Uykun az ve stresin yüksek olduğu için set sayıları 3 ile sınırlı.");
  else if (P.lowSleep) out.push("Uykun az olduğu için set sayıları 3 ile sınırlı.");
  else if (P.highStress) out.push("Stresin yüksek olduğu için set sayıları 3 ile sınırlı.");
  if (P.mins <= 45) out.push(P.mins + " dakikaya sığması için ısınma kısa, set sayıları ayarlandı.");
  if (Object.keys(P.short).length) out.push("Kısa günler (" + Object.keys(P.short).map((dk) => DAYS.find((d) => d.k === dk).n + " " + P.short[dk] + " dk").join(", ") + "): o günler yalnız ana hareketler, kısa ısınma.");
  if (P.morning) out.push("Sabah antrenmanı: ısınma 2 dk daha uzun.");
  if (P.quiet) out.push("Sessiz ortam: sıçrama, ip ve çarpma sesi çıkaran hareketler yok.");
  if (P.narrow) out.push("Alan dar: taşıma ve merdiven drili yok.");
  if (P.cardioPref.length) { const nm = { walkint: "yürüyüş", runint: "koşu", ip: "ip atlama" }[P.cardioPref[0]]; out.push(P.cardioPref.some((id) => inPlan.has(id)) ? "Kondisyon bölümünde tercihin (" + nm + ") önde." : "Kondisyon tercihin (" + nm + ") bu programa girmedi: " + (condIn ? "gereken alan ya da alet yok." : "programda kondisyon bölümü yok; Kondisyon hedefini eklersen gelir.")); }
  if (P.avoidPat.has("vpush")) out.push("Baş üstü itiş istemediğin için omuz çalışması yatay itiş ve omuz sağlığı hareketleriyle.");
  if (P.floorNo) out.push("Yere yatarak yapılan hareketler yok; karın ve göğüs ayakta / sehpada seçeneklerle.");
  if (P.noJump) out.push("Sıçrama istemediğin için sıçramalı ve darbeli hareket yok.");
  if (P.age >= 60 && !P.fall && !P.osteo) out.push("Düşme riskine karşı denge çalışması eklendi.");
  if (P.preg) out.push("Hamilelik: sırtüstü ve karın içi basıncı artıran hareketler yok.");
  if (P.evWeek) out.push("Etkinlik " + P.evWeek + ". haftada: o hafta hafif (setler 2, kondisyon yarı).");
  if (FOCUS[P.focus]) out.push("Öncelik " + FOCUS[P.focus].n.toLocaleLowerCase("tr") + ": ilgili günlere ek hareket eklendi.");
  return out;
}

// ---------------- ana üretici ----------------
// opts.prev: eski planın slot haritası (prevOf(gen)); verilirse hâlâ geçerli hareketler aynı slotta kalır (kayıt anahtarları bozulmaz)
function generate(A, opts) {
  const P = profile(A), prev = (opts && opts.prev) || null;
  const prevSess = (ph, dk) => { if (!prev) return null; const pre = ph + "/" + dk + "/", o = {}; let n = 0; Object.keys(prev).forEach((k) => { if (k.startsWith(pre)) { o[k.slice(pre.length)] = prev[k]; n++; } }); return n ? o : null; };
  const seq = split(P);
  const S = { H0: {}, F1: {}, T: {}, F2: {}, F3: {} };
  const dayType = {};
  P.days.forEach((dk, i) => { dayType[dk] = seq[i]; });
  // eğer 6 günde aynı özel gün iki kez gelirse ikinciyi z2flex yap
  const seen = {};
  P.days.forEach((dk) => { const [t] = dayType[dk]; if (["box", "cond", "sprint", "z2flex"].includes(t)) { if (seen[t]) dayType[dk] = ["z2flex", 0]; seen[t] = 1; } });
  // Öncelikli bölgenin çalıştığı günlerin sırası (kollarda biceps/triceps dönüşümü) ve tüm vücut günlerinin harfi gün sırasıyla (A, B, C)
  const F = FOCUS[P.focus], ord = {}, fbDays = P.days.filter((dk) => dayType[dk][0] === "fb");
  P.days.filter((dk) => F && F.types.includes(dayType[dk][0])).forEach((dk, i) => { ord[dk] = i; });
  // Kısa günler: o günün profili yalnız süreyle farklı (ısınma, kondisyon dozu ve sığdırma o süreye göre)
  const PD = {}; P.days.forEach((dk) => { PD[dk] = P.short[dk] ? Object.assign({}, P, { mins: P.short[dk] }) : P; });
  ["F1", "F2", "F3"].forEach((ph, pi) => {
    P.days.forEach((dk) => { const [t, v] = dayType[dk]; const s = buildStable(t, v, PD[dk], pi, ord[dk], prevSess(ph, dk)); if (t === "fb") s.title = "Tüm Vücut " + "ABC"[fbDays.indexOf(dk)]; s.home = P.home ? (t === "fb" ? "ABC"[v] : HOME_OF[t] || null) : null; if (t === "sprint" && P.eq.has("outdoor")) s.alt = "Yağmur yağarsa içeride: duvar drili 4×5/bacak, yerinde diz çekerek sekme 3×20, " + (P.imp[pi] >= 1 ? "pogo 3×15, " : "") + "tempolu merdiven çıkma veya bisiklet 10 dk."; S[ph][dk] = s; });
  });
  // test/alışma haftaları: test grupları ilk üç antrenman gününe dağıtılır
  // Testler kısa güne konmaz (Ö6: 1,6 km testi tek başına ~16 dk); normal gün yoksa eski düzen
  const groupsForDay = {};
  const tdays = P.days.filter((dk) => dayType[dk][0] !== "z2flex"), tdN = tdays.filter((dk) => !P.short[dk]);
  const td = tdN.length ? tdN : tdays.length ? tdays : P.days;
  if (td.length >= 3) { groupsForDay[td[0]] = ["A"]; groupsForDay[td[1]] = ["B"]; groupsForDay[td[2]] = ["C"]; }
  else { groupsForDay[td[0]] = ["A", "B"]; groupsForDay[td[1] || td[0]] = (groupsForDay[td[1] || td[0]] || []).concat(["C"]); }
  P.days.forEach((dk) => {
    const base = S.F1[dk];
    const g = groupsForDay[dk];
    // İkinci döngüden itibaren Hafta 0 test değil geçiş haftası (testler 12. haftada yapıldı)
    S.H0[dk] = P.cycle >= 2 ? deloadSession(base, PD[dk], true, "Geçiş · ") : g ? testSession(base, g, PD[dk], true) : deloadSession(base, PD[dk], true);
    S.T[dk] = g ? testSession(S.F2[dk], g, PD[dk], false) : deloadSession(S.F2[dk], PD[dk], false);
    S.H0[dk].home = base.home; S.T[dk].home = base.home;
  });
  Object.values(S).forEach((d) => Object.values(d).forEach((s) => s.blocks.forEach((b) => b.items.forEach((it) => { delete it.sn; })))); // slot numarası iç kullanım
  // Etkinlik / müsabaka haftası: o haftanın reçetesi hafif (setler 2, kondisyon yarı); test haftasına denk geliyorsa zaten hafif
  const ev = P.evWeek ? phaseOfWeek(P.evWeek) : null;
  if (ev) Object.values(S[ev[0]]).forEach((s) => s.blocks.forEach((b) => { if (!b.warm) b.items.forEach((it) => { if (Array.isArray(it.p) && it.p[ev[1]] != null) { it.p = it.p.slice(); it.p[ev[1]] = lightRx(String(it.p[ev[1]]), true); } }); }));
  const routines = JSON.parse(JSON.stringify(LIB.ROUTINES));
  Object.values(routines).forEach((R) => { R.items = R.items.filter(([id]) => eqOK(EX[id], P) && injOK(EX[id], P) && !P.avoid.has(id)).map(([x, p]) => ({ x, p })); }); // hamilelikte köprü ve duvarda V yok
  const phases = [
    P.cycle >= 2 ? { key: "H0", name: "Hafta 0 · Geçiş", short: "Geçiş", weeks: [0], goal: "Önceki döngüden sonra hafif bir hafta. Seviye, son testlerine göre ayarlandı." }
      : { key: "H0", name: "Hafta 0 · Alışma + Başlangıç Testi", short: "Alışma", weeks: [0], goal: "Vücudu harekete alıştır, başlangıç değerlerini ölç. Hiçbir set zorlanarak yapılmaz." },
    { key: "F1", name: "Faz 1 · Temel", short: "Temel", weeks: [1, 2, 3], rir: RIR[0], goal: "Teknik, eklem hazırlığı ve temel kondisyon." },
    { key: "T", name: "Hafif Hafta + Test", short: "Test", weeks: [4, 8, 12], goal: "Set sayısı azalır, vücut toparlanır ve testler tekrarlanır." },
    { key: "F2", name: "Faz 2 · Gelişim", short: "Gelişim", weeks: [5, 6, 7], rir: RIR[1], goal: "Daha ağır yükler, daha zor varyasyonlar, daha uzun kondisyon." },
    { key: "F3", name: "Faz 3 · Güç", short: "Güç", weeks: [9, 10, 11], rir: RIR[2], goal: "En yüksek yoğunluk ve patlayıcılık." },
  ];
  return {
    v: VERSION, created: new Date().toISOString().slice(0, 10),
    summary: { reasons: reasons(P, A, S), L: P.L, levelName: ["", "Başlangıç", "Orta", "İleri"][P.L], cautious: P.cautious, bmi: Math.round(P.bmi * 10) / 10, days: P.days, mins: P.mins, goals: P.goals, scheme: P.scheme, types: P.days.map((dk) => dayType[dk][0]),
      // Ağırlık önerisi için (src/tracker.html kgAdvice): en ağır dambıl (kg, bilinmiyorsa null), halter var mı, dambıl adımı / sabit çiftler listesi, bar ağırlığı ve adımı
      dbMax: P.dbMax, bar: P.eq.has("barbell"), dbStep: P.dbStep, dbList: P.dbList.length ? P.dbList : null, barKg: P.barKg, barStep: P.barStep,
      shortDays: Object.keys(P.short), eventWeek: P.evWeek },
    profile: { age: P.age, sex: P.sex, height: P.h, weight: P.w, goalWeight: P.goalW },
    DAYS: DAYS.map((d) => Object.assign({}, d, { train: P.days.includes(d.k) })),
    S, ROUTINES: routines, TESTS: testList(P), PHASES: phases, RULES: rules(P), TARGETS: targets(P), NUTRITION: nutrition(P),
  };
}

const api = { generate, prevOf, profile, candidates, swapOptions, swapItem, swapBlocked, expandEq, RM_MIN, RM_MAX, eqLegacy, GYM_EQ, GYM_DEFAULT, estimate, DAYS, GOALS, PARQ, VERSION, TEST_GROUPS, eventWeek, kgList };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.ENGINE = api;
})(typeof window !== "undefined" ? window : globalThis);

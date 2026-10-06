// Herkese açık sürüm: soru sihirbazı, motor çıktısını takip çekirdeğine bağlama, yedek/yazdırma.
// Tüm veriler kullanıcının cihazında (localStorage) kalır; hiçbir sunucuya gönderilmez.
(function () {
"use strict";
const LIB = window.LIB, E = window.ENGINE;
const KEY_ANS = "tk_web_answers", KEY_PLAN = "tk_web_plan", KEY_DATA = "tk_web_data";
window.TK_PUBLIC = true;
window.TK_LSKEY = KEY_DATA;

const $ = (s, el) => (el || document).querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
window.TK_BUILD = (/[?&]v=([\w.-]+)/.exec((document.currentScript && document.currentScript.src) || "") || [])[1] || ""; // derleme damgası (Profil › Uygulama › Sürüm)
const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"], GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
// ISO tarih → "5 Ekim" (başka yılsa "5 Ekim 2025"); wd: gün adıyla ("5 Ekim Pazartesi"). Kullanıcıya ISO tarih gösterilmez.
function trDate(s, wd) { const d = new Date(String(s) + "T00:00:00"); if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s)) || isNaN(d)) return String(s || ""); return d.getDate() + " " + AYLAR[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? " " + d.getFullYear() : "") + (wd ? " " + GUNLER[d.getDay()] : ""); }
function nextMonday() { const d = new Date(); const js = d.getDay(); d.setDate(d.getDate() + (js === 1 ? 0 : (8 - js) % 7)); return iso(d); }
function phaseOf(week) {
  if (week <= 0) return { key: "H0", wi: 0 };
  if (week === 4 || week === 8 || week === 12) return { key: "T", wi: 0 };
  if (week <= 3) return { key: "F1", wi: week - 1 };
  if (week <= 7) return { key: "F2", wi: week - 5 };
  if (week <= 11) return { key: "F3", wi: week - 9 };
  return { key: "T", wi: 0 };
}

// ---------------- motor çıktısı → takip çekirdeğinin beklediği plan ----------------
function adapt(gen, A) {
  const injured = Object.keys(A.inj || {}).filter((j) => A.inj[j] === "gecmis" || A.inj[j] === "agri");
  const EX = {};
  Object.keys(LIB.EX).forEach((id) => {
    const e = LIB.EX[id], notes = injured.map((j) => e.inj && e.inj[j]).filter(Boolean);
    EX[id] = notes.length ? Object.assign({}, e, { l: notes.join(" ") }) : e;
  });
  const OFF = { title: "Dinlenme", dur: "—", off: true, blocks: [], note: "Bugün dinlenme günü. İstersen hafif bir yürüyüş yap." };
  // Program yeniden kurulduysa eski haftalar eski planla gösterilir (kayıtlar yerli yerinde kalır)
  const pickS = (week) => { const h = (gen.hist || []).find((x) => week < x.until); return h ? h.S : gen.S; };
  return {
    CATS: LIB.CATS, EX, S: gen.S, OFF, ROUTINES: gen.ROUTINES, TESTS: gen.TESTS, TEST_GROUPS: E.TEST_GROUPS, PHASES: gen.PHASES, DAYS: gen.DAYS,
    RULES: gen.RULES, TARGETS: gen.TARGETS, NUTRITION: gen.NUTRITION, NOTE_LABEL: "Senin için not", summary: gen.summary,
    PROFILE: { start: A.start || nextMonday(), age: +A.age, height: +A.height, sex: A.sex === "k" ? "k" : "e", weight: +A.weight || null, goalWeight: +A.goalWeight || null },
    phaseOf,
    session: (week, dk) => { const ph = pickS(week)[phaseOf(week).key]; return (ph && ph[dk]) || OFF; },
    rx: (item, wi) => (Array.isArray(item.p) ? item.p[Math.min(wi, item.p.length - 1)] : item.p),
  };
}

// ---------------- soru sihirbazı (bilgi/sorular.md: 12 adım + karşılama + özet) ----------------
// @sihirbaz-baslangic — saf mantık (DOM yok): varsayılanlar, eski cevap geçişi, adımlar, koşullu alanlar, doğrulama. test/arayuz.test.mjs bu bloğu okuyup çalıştırır.
const STEPS = ["hosgeldin", "sen", "saglik1", "saglik2", "durum", "sakatlik", "gecmis", "hedef", "zaman", "yer", "alet", "yasam", "seviye", "ozet"];
const NAMES = { hosgeldin: "Hoş geldin", sen: "Sen", saglik1: "Sağlık taraması 1/2", saglik2: "Sağlık taraması 2/2", durum: "Sağlık durumların", sakatlik: "Sakatlık ve ağrı", gecmis: "Spor geçmişin", hedef: "Hedeflerin",
  zaman: "Zamanın", yer: "Yerin", alet: "Aletlerin", yasam: "Günlük hayat ve tercihler", seviye: "Şu anki seviyen", ozet: "Programın" };
// null = henüz cevaplanmadı; [] = "Hiçbiri"; "" = tek seçimde Bilmiyorum / Fark etmez / Hayır. Motor boş alanları yok sayar: eski cevaplarda plan birebir aynı kalır (test/engine.test.js › Sorular).
const DEF = () => ({ age: "", sex: "", height: "", weight: "", goalWeight: "", parq: [null, null, null, null, null, null, null], parqOK: null, parqAck: false,
  cond: null, preg: null, postp: null, inj: {}, yil: "", freq: "", bg: null, goals: [], focus: null, home: null,
  days: [], mins: null, shortDays: null, shortMins: null, tod: "", start: nextMonday(), event: "", place: "", outdoor: null, env: null,
  eq: [], dbKind: "", dbList: "", dbMaxKg: "", dbStep: "", barKg: null, plateMin: null, bands: null, lifts: null, dbMax: "",
  act: "", sleep: "", stress: "", cardio: null, dislike: null, tests: {}, rm: {}, rmOK: {} });
// Kayıtlı cevap + yeni alanların varsayımları; eski alan adları yeni sorulara taşınır (exp→yil, gap→freq, dbMax→dbKind)
function merge(prev) {
  const A = Object.assign(DEF(), prev || {}), old = !!prev && !(prev.qV >= 2); // eski sihirbazın cevabı: o zaman önceden işaretli gelen sorular (PAR-Q hayır, dengeli, 60 dk…) cevaplanmış sayılır
  A.parq = (A.parq || []).concat(Array(7).fill(old ? false : null)).slice(0, 7).map((v) => (v == null ? null : !!v));
  if (old) { if (A.focus == null) A.focus = ""; if (A.home == null) A.home = true; if (!(+A.mins > 0)) A.mins = 60; if (A.outdoor == null) A.outdoor = false; if (A.preg == null) A.preg = false; }
  if (!A.yil && A.exp) A.yil = A.exp;
  if (!A.freq && A.gap) A.freq = { aktif: "3-4", kisa: "1-2", uzun: "0" }[A.gap] || "";
  if (A.parq.some(Boolean) && A.parqOK == null && A.parqAck) A.parqOK = false;
  ["inj", "tests", "rm", "rmOK"].forEach((k) => { if (!A[k] || typeof A[k] !== "object") A[k] = {}; });
  ["goals", "days", "eq"].forEach((k) => { if (!Array.isArray(A[k])) A[k] = []; });
  if (!(A.eqV >= 2) && A.place) A.eq = [...E.expandEq(A)].filter((k) => k !== "none" && k !== "outdoor"); // eski "gym"/salon varsayımları çip olarak gösterilir, kişi düzeltir
  if (!A.dbKind && A.dbMax) A.dbKind = A.dbMax === "ayar" ? "ayar" : A.dbMax === "hafif" ? "sabit" : ""; // eski dambıl cevabı yeni soruya ön değer
  return A;
}
const hasDb = (A) => A.eq.includes("db") && A.place !== "spor", hasBar = (A) => A.eq.includes("barbell"), parqYes = (A) => A.parq.some(Boolean);
const shortOn = (A) => Array.isArray(A.shortDays) && A.shortDays.length > 0;
// Adımda görünen alanlar (koşullu alt sorular dahil), ekrandaki sırayla
const FIELDS = {
  sen: () => ["age", "sex", "height", "weight", "goalWeight"],
  saglik1: () => ["parq0", "parq1", "parq2", "parq3"],
  saglik2: (A) => ["parq4", "parq5", "parq6"].concat(parqYes(A) ? ["parqOK"] : [], parqYes(A) && A.parqOK === false ? ["parqAck"] : []),
  durum: (A) => ["cond"].concat(A.sex === "k" ? ["preg"] : [], A.sex === "k" && A.preg === false ? ["postp"] : []),
  sakatlik: () => ["inj"],
  gecmis: () => ["yil", "freq", "bg"],
  hedef: () => ["goals", "focus", "home"],
  zaman: (A) => ["days", "mins"].concat(A.days.length >= 3 ? ["shortDays"] : [], shortOn(A) ? ["shortMins"] : [], ["tod", "start", "event"]), // 2 günde kısa gün yok: testler tek güne yığılır
  yer: (A) => ["place", "outdoor"].concat(A.place && A.place !== "spor" ? ["env"] : []),
  alet: (A) => ["eq"].concat(hasDb(A) ? ["dbKind"] : [], hasDb(A) && A.dbKind === "sabit" ? ["dbList"] : [], hasDb(A) && A.dbKind === "ayar" ? ["dbMaxKg", "dbStep"] : [], hasBar(A) ? ["barKg", "plateMin"] : [], A.eq.includes("band") ? ["bands"] : [], hasBar(A) ? ["lifts"] : []),
  yasam: () => ["act", "sleep", "stress", "cardio", "dislike"],
  seviye: (A) => ["tests.pushup"].concat(A.eq.includes("pullbar") ? ["tests.pullup"] : [], ["tests.plank", "tests.run"], hasBar(A) && (A.bg || []).includes("agirlik") ? ["rm"] : []),
};
const fieldsOf = (A, key) => (FIELDS[key] ? FIELDS[key](A) : []);
const numOf = (v) => (v === "" || v == null ? NaN : +String(v).replace(",", "."));
const inRange = (v, lo, hi) => numOf(v) >= lo && numOf(v) <= hi;
// Hamile, doğum sonrası (0-24 hafta) ya da 18 yaş altı: kilo verme hedefi yok (motorun beslenme/hedef kuralıyla aynı). Önceden seçilmişse adım geçişinde kalkar; tek hedefse yerine genel sağlık.
const noLose = (A) => (A.sex === "k" && (A.preg === true || !!A.postp)) || (numOf(A.age) > 0 && numOf(A.age) < 18);
function dropLose(A) { if (!noLose(A) || !A.goals.includes("yag")) return; A.goals = A.goals.filter((g) => g !== "yag"); if (!A.goals.length) A.goals = ["saglik"]; }
// Alan cevaplanmamış mı? İsteğe bağlı alanlar (hedef kilo, etkinlik, 5 tekrar kiloları) ve varsayılanı olanlar (sakatlık "sorun yok", test "bilmiyorum", alet listesi) hiç eksik sayılmaz.
function missing(A, k) {
  if (/^parq\d$/.test(k)) return A.parq[+k[4]] == null;
  switch (k) {
    case "age": case "height": case "weight": case "dbMaxKg": return isNaN(numOf(A[k]));
    case "sex": case "yil": case "freq": case "act": case "sleep": case "stress": case "tod": case "place": case "dbKind": case "start": return !A[k];
    case "mins": case "shortMins": case "dbStep": return !(numOf(A[k]) > 0);
    case "parqOK": case "preg": case "outdoor": case "home": return typeof A[k] !== "boolean";
    case "parqAck": return !A.parqAck;
    case "cond": case "bg": case "env": case "bands": case "lifts": case "dislike": case "shortDays": return !Array.isArray(A[k]);
    case "postp": case "focus": case "cardio": case "barKg": case "plateMin": return A[k] == null;
    case "goals": return !A.goals.length;
    case "days": return A.days.length < 2;
    case "dbList": return !E.kgList(A.dbList).length;
    default: return false;
  }
}
// Görünen adımlar: yeni kullanıcı hepsi; "edit" karşılamasız; "q2" (sorular yenilendi) yalnız cevaplanmamış alanı olan adımlar + özet
function wizardSteps(A, mode) {
  if (!mode) return STEPS.slice();
  if (mode === "q2") return STEPS.filter((s) => s !== "hosgeldin" && s !== "ozet" && fieldsOf(A, s).some((k) => missing(A, k))).concat("ozet");
  return STEPS.slice(1);
}
const rmOdd = (A, id) => { const v = A.rm[id]; return v != null && (v < E.RM_MIN || v > (E.RM_MAX[id] || 400)); };
const rmAsk = (A) => Object.keys(A.rm).filter((id) => rmOdd(A, id) && (A.rmOK || {})[id] !== A.rm[id]);
const dateOk = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) && !isNaN(new Date(s + "T00:00:00"));
const NONE = "“Hiçbiri” de.";
// Adımın ilk hatası (kullanıcı diliyle, çözümüyle) ya da ""
function validStep(A, key) {
  const F = fieldsOf(A, key), miss = (k) => F.includes(k) && missing(A, k);
  switch (key) {
    case "sen":
      if (miss("age") || !inRange(A.age, 12, 90)) return "Yaşını yaz (12-90).";
      if (miss("sex")) return "Cinsiyetini seç.";
      if (miss("height") || !inRange(A.height, 120, 230)) return "Boyunu yaz (120-230 cm).";
      if (miss("weight") || !inRange(A.weight, 30, 250)) return "Kilonu yaz (30-250 kg).";
      if (!(A.goalWeight === "" || A.goalWeight == null) && !inRange(A.goalWeight, 30, 250)) return "Hedef kiloyu 30-250 kg arasında yaz ya da boş bırak.";
      return "";
    case "saglik1": case "saglik2":
      if (F.some((k) => /^parq\d$/.test(k) && miss(k))) return "Her soruya Evet ya da Hayır de.";
      if (miss("parqOK")) return "Doktor onayı sorusunu cevapla.";
      if (miss("parqAck")) return "Devam etmek için doktoruna danışacağını onayla.";
      return "";
    case "durum":
      if (miss("cond")) return "Doktorun söylediği bir durum varsa seç; yoksa " + NONE;
      if (miss("preg")) return "Hamile misin sorusuna Evet ya da Hayır de.";
      if (miss("postp")) return "Doğum sorusunu cevapla; yoksa “Hayır” de.";
      return "";
    case "gecmis":
      if (miss("yil")) return "Toplam deneyimini seç.";
      if (miss("freq")) return "Son 3 aydaki sıklığını seç.";
      if (miss("bg")) return "Düzenli yaptığın sporları seç; yoksa " + NONE;
      return "";
    case "hedef":
      if (miss("goals")) return "En az bir hedef seç.";
      if (miss("focus")) return "Bir bölge seç; yoksa “Dengeli” de.";
      if (miss("home")) return "Akşam esneklik rutini sorusuna Evet ya da Hayır de.";
      return "";
    case "zaman": {
      if (miss("days")) return "En az 2 gün seç.";
      if (miss("mins")) return "Bir antrenmana ayırdığın süreyi seç.";
      if (A.days.length >= 3 && miss("shortDays")) return "Kısa günler sorusunu cevapla; yoksa “Hayır, hepsi aynı” de.";
      if (shortOn(A) && A.shortDays.some((d) => !A.days.includes(d))) return "Kısa gün olarak yalnız antrenman günlerinden seçebilirsin.";
      if (miss("shortMins")) return "Kısa günlerin süresini seç.";
      if (shortOn(A) && numOf(A.shortMins) >= numOf(A.mins)) return "Kısa gün süresi normal süreden (" + numOf(A.mins) + " dk) kısa olmalı.";
      if (miss("tod")) return "Günün hangi saatinde antrenman yaptığını seç.";
      if (miss("start") || !dateOk(A.start)) return "Başlangıç tarihini seç.";
      const d = (new Date(A.start + "T00:00:00") - Date.now()) / 864e5;
      if (d < -366 || d > 366) return "Başlangıç tarihi bugünden en çok 1 yıl önce ya da sonra olabilir.";
      if (A.event && !dateOk(A.event)) return "Etkinlik tarihini düzelt ya da boş bırak.";
      return ""; // program dışındaki etkinlik tarihi kabul edilir; ekranda "dikkate alınmaz" notu
    }
    case "yer":
      if (miss("place")) return "Nerede antrenman yapacağını seç.";
      if (miss("outdoor")) return "Koşu alanı sorusuna Var ya da Yok de.";
      if (miss("env")) return "Yerin için uygun olanı işaretle; yoksa " + NONE;
      return "";
    case "alet": {
      if (miss("dbKind")) return "Dambıllarının sabit mi ayarlanabilir mi olduğunu seç.";
      if (miss("dbList")) return "Dambıl kilolarını boşlukla ayırarak yaz; ondalık için virgül: 2,5 5 7,5";
      if (F.includes("dbList") && E.kgList(A.dbList).some((v) => v < 1 || v > 60)) return "Dambıl kiloları 1-60 kg arasında olmalı.";
      if (miss("dbMaxKg") || (F.includes("dbMaxKg") && !inRange(A.dbMaxKg, 1, 100))) return "En ağır dambılını yaz (1-100 kg).";
      if (miss("dbStep")) return "Dambılın en küçük artışını seç.";
      if (miss("barKg")) return "Barının ağırlığını seç; bilmiyorsan “Bilmiyorum” de.";
      if (miss("plateMin")) return "En küçük plakanı seç; bilmiyorsan “Bilmiyorum” de.";
      if (miss("bands")) return "Bantlarının sertliğini seç; bilmiyorsan “Bilmiyorum” de.";
      if (miss("lifts")) return "Barla öğrendiğin kaldırışları seç; yoksa " + NONE;
      return "";
    }
    case "yasam":
      if (miss("act")) return "Gün içindeki hareketliliğini seç.";
      if (miss("sleep")) return "Uyku süreni seç.";
      if (miss("stress")) return "Stres düzeyini seç.";
      if (miss("cardio")) return "Kondisyon tercihini seç; fark etmiyorsa “Fark etmez” de.";
      if (miss("dislike")) return "Yapmak istemediklerini seç; yoksa " + NONE;
      return "";
    case "seviye": return rmAsk(A).length ? "5 tekrar kilosunu kontrol et: Düzelt ya da Evet de." : "";
    default: return "";
  }
}
// @sihirbaz-bitis
let A = null, step = 0, editing = false, VIS = STEPS; // editing: false | "edit" (Cevapları düzenle) | "q2" (yalnız yeni sorular)
const RM_LBL = { squat: "Squat", dl: "Deadlift", bench: "Bench press" };
// Kapasite soruları aralıklı düğmelerle: [etiket, en az, en çok, motora giden değer]
const TB = {
  pushup: { q: "En fazla kaç tam şınav çekebilirsin?", h: "Dizler yerde değil, göğüs yere yaklaşarak.", o: [["Tam şınav yapamıyorum", 0, 0, 0], ["1-5", 1, 5, 3], ["6-15", 6, 15, 10], ["16-30", 16, 30, 22], ["30'dan fazla", 31, 999, 35]] },
  pullup: { q: "En fazla kaç barfiks çekebilirsin?", h: "Tam asılıdan çene demirin üstüne.", o: [["Hiç çıkamıyorum", 0, 0, 0], ["1-3", 1, 3, 2], ["4-8", 4, 8, 6], ["9-15", 9, 15, 12], ["15'ten fazla", 16, 999, 18]] },
  plank: { q: "Önkol plankta ne kadar durabilirsin?", h: "Dirsekler yerde, vücut düz; kalça düşmeden.", o: [["30 sn'den az", 0, 29, 20], ["30-60 sn", 30, 60, 45], ["1-2 dk", 61, 120, 90], ["2 dk'dan fazla", 121, 9999, 150]] },
  run: { q: "Kesintisiz ne kadar yürüyüp koşabilirsin?", h: "Kondisyon bloklarının zorluğunu belirler.", o: [["10 dk'dan az yürüyüş", 0, 0, 0], ["30 dk tempolu yürüyüş", 1, 1, 1], ["20-30 dk hafif koşu", 2, 2, 2], ["30 dk'dan fazla koşu", 3, 3, 3]] },
};
function tb(id) {
  const T = TB[id], v = A.tests[id], known = v != null && v !== "";
  return '<div class="wz-field"><span>' + esc(T.q) + '</span><div class="wz-two">' + T.o.map(([l, lo, hi, val]) => {
    const on = known && +v >= lo && +v <= hi;
    return '<button type="button" class="wz-opt' + (on ? " on" : "") + '" data-wz-tb="' + id + '" data-v="' + val + '" aria-pressed="' + on + '"><b>' + esc(l) + "</b></button>";
  }).join("") + '<button type="button" class="wz-opt' + (!known ? " on" : "") + '" data-wz-tb="' + id + '" data-v=""><b>Bilmiyorum</b><small>İlk hafta test edilecek</small></button></div><small>' + esc(T.h) + "</small></div>";
}
const DAYS = E.DAYS;

// Yapı taşları (bilgi/tasarim.md › Sihirbaz): soru + seçenekler + ipucu; koşullu alt soru .wz-field.sub
const field = (q, body, hint, sub) => '<div class="wz-field' + (sub ? " sub" : "") + '"><span>' + esc(q) + "</span>" + body + (hint ? "<small>" + esc(hint) + "</small>" : "") + "</div>";
function opt(fld, val, label, sub) { // tek seçim; sayı alanları (mins, dbStep, barKg…) tıklanınca sayıya çevrilir
  const cur = A[fld], on = cur != null && String(cur) === String(val);
  return '<button type="button" class="wz-opt' + (on ? " on" : "") + '" data-wz-set="' + fld + '" data-v="' + esc(val) + '" aria-pressed="' + on + '"><b>' + esc(label) + "</b>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</button>";
}
const seg = (fld, opts) => '<div class="wz-seg">' + opts.map((o) => opt(fld, o[0], o[1], o[2])).join("") + "</div>";
const col = (fld, opts) => '<div class="wz-col">' + opts.map((o) => opt(fld, o[0], o[1], o[2])).join("") + "</div>";
function yesno(fld, pairs) { // evet/hayır: cevaplanmadıysa hiçbiri seçili değil
  return '<div class="wz-seg">' + pairs.map(([v, l, sub]) => '<button type="button" class="wz-opt' + (A[fld] === v ? " on" : "") + '" data-wz-bool="' + fld + '" data-v="' + (v ? 1 : 0) + '" aria-pressed="' + (A[fld] === v) + '"><b>' + esc(l) + "</b>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</button>").join("") + "</div>";
}
function chips(fld, opts, none) { // çok seçim; none: "Hiçbiri / Bilmiyorum" çipi → []
  const cur = A[fld], arr = Array.isArray(cur) ? cur : null;
  const chip = (v, l, on) => '<button type="button" class="wz-chip' + (on ? " on" : "") + '" data-wz-multi="' + fld + '" data-v="' + esc(v) + '" aria-pressed="' + on + '">' + esc(l) + "</button>";
  return '<div class="wz-chips">' + opts.map(([v, l]) => chip(v, l, !!arr && arr.includes(v))).join("") + (none ? chip("", none, !!arr && !arr.length) : "") + "</div>";
}
function num(label, fld, unit, ph, hint, sub) {
  return '<label class="wz-field' + (sub ? " sub" : "") + '"><span>' + esc(label) + '</span><div class="wz-inp"><input inputmode="decimal" maxlength="8" data-wz-num="' + fld + '" value="' + esc(A[fld] == null ? "" : A[fld]) + '" placeholder="' + esc(ph || "") + '"><em>' + esc(unit) + "</em></div>" + (hint ? '<small id="h-' + fld + '">' + esc(hint) + "</small>" : "") + "</label>";
}
const dateIn = (fld) => '<input class="inp" type="date" data-wz-date="' + fld + '" value="' + esc(A[fld] || "") + '">';
const dbRead = (s) => (E.kgList(s).length ? " · Okudum: " + E.kgList(s).map((v) => String(v).replace(".", ",")).join(", ") + " kg" : ""); // yazılan listenin anlaşılan hâli
const evOut = (A) => !!(A.event && dateOk(A.event) && !E.eventWeek(A)); // etkinlik tarihi 1-12. hafta dışında: kabul edilir, dikkate alınmaz
function bmi() { return inRange(A.height, 120, 230) && inRange(A.weight, 30, 250) ? numOf(A.weight) / Math.pow(numOf(A.height) / 100, 2) : null; } // yarım yazılmış boy/kiloda (1, 17…) saçma değer çıkmasın
// Seni tanıyalım: yazarken yerinde güncellenen satırlar (ekran yenilenmez)
const bmiHTML = () => { const b = bmi(); return b ? "Vücut kitle indeksin: <b>" + b.toFixed(1).replace(".", ",") + "</b>" + (b >= 30 ? " · Eklemlerini korumak için sıçrama ve koşu kademeli eklenecek." : "") : ""; };
const LOSE_NO = "Bu dönemde kilo verme hedefi yok.";
const gwHint = () => (noLose(A) ? LOSE_NO + " İstersen boş bırak." : "İstersen boş bırak. Yazarsan kalori ve süre hedefi buna göre.");
const MED = "Program tıbbi tavsiye değildir. Sağlık sorunun varsa önce doktoruna danış.";
// Alet çipleri (LIB.EQUIPMENT, gruplu): sihirbazda data-wz-multi, "Aletlerini doğrula" alt sayfasında data-pub
const EQ_GROUPS = ["Temel", "Ağırlık", "Salon", "Kalistenik", "Dövüş"];
const eqChips = (sel, attr) => EQ_GROUPS.map((g) => '<div class="wz-eqg"><em>' + g + '</em><div class="wz-chips">' + LIB.EQUIPMENT.filter((e) => e.g === g).map((e) =>
  '<button type="button" class="wz-chip' + (sel.includes(e.k) ? " on" : "") + '" data-' + attr + '="eq" data-v="' + e.k + '" aria-pressed="' + sel.includes(e.k) + '">' + esc(e.n) + "</button>").join("") + "</div></div>").join("");
const SALON_EQ = LIB.EQUIPMENT.filter((e) => e.g === "Salon").map((e) => e.k);
const parqRows = (from, to) => E.PARQ.slice(from, to).map((q, j) => { const i = from + j; return '<div class="wz-q"><p>' + esc(q) + '</p><div class="wz-seg">' +
  '<button type="button" class="wz-opt' + (A.parq[i] === false ? " on" : "") + '" data-wz-parq="' + i + '" data-v="0" aria-pressed="' + (A.parq[i] === false) + '"><b>Hayır</b></button>' +
  '<button type="button" class="wz-opt' + (A.parq[i] === true ? " on" : "") + '" data-wz-parq="' + i + '" data-v="1" aria-pressed="' + (A.parq[i] === true) + '"><b>Evet</b></button></div></div>'; }).join("");

const VIEW = {
  hosgeldin: () => '<h1 class="wz-h">Sana özel antrenman programı</h1>' +
    '<p class="wz-lead">Birkaç soruya cevap ver; sağlığına, seviyene, aletlerine, zamanına ve yerine göre 13 haftalık bir program kuralım. Sonra program seni antrenmanda adım adım götürür: setler, dinlenme, süreli hareketler ve testler tek ekranda.</p>' +
    wzInstall() + '<ul class="wz-list"><li>12 kısa adım, yaklaşık 5 dakika. Spor terimi bilmen gerekmez.</li><li>Cevapların ve kayıtların <b>sadece bu cihazda</b> tutulur; hiçbir yere gönderilmez. ' + PRIV_BTN + "</li><li>" + MED + "</li></ul>" +
    '<p class="small muted" style="margin:18px 0 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap">Başka cihazdan yedeğin mi var? ' + '<button type="button" class="btn ghost sm" data-pub="paste">Yedek metnini yapıştır</button>' +
      (inArt() ? "" : '<label class="btn ghost sm" style="cursor:pointer">Yedek dosyası seç<input type="file" accept="application/json,.json" data-pub-file="1" hidden></label>') + "</p>",
  sen: () => '<h1 class="wz-h">Seni tanıyalım</h1><div class="wz-grid">' + num("Yaş", "age", "yıl", "örn. 28") +
    field("Cinsiyet", seg("sex", [["e", "Erkek"], ["k", "Kadın"]]), "Kalori ve yağ oranı hesabı için; kadın sağlığı soruları yalnız kadına sorulur.") +
    num("Boy", "height", "cm", "örn. 175") + num("Kilo", "weight", "kg", "örn. 78") + num("Hedef kilo", "goalWeight", "kg", "örn. 72", gwHint()) + "</div>" +
    '<p class="wz-note" id="bmiNote"' + (bmi() ? "" : " hidden") + ">" + bmiHTML() + "</p>",
  saglik1: () => '<h1 class="wz-h">Sağlık taraması</h1><p class="wz-lead">Sağlık ön kontrolü: 7 soru, iki ekranda. Dürüst cevap, programın güvenliği için önemli.</p>' + parqRows(0, 4),
  saglik2: () => '<h1 class="wz-h">Sağlık taraması</h1><p class="wz-lead">Son üç soru.</p>' + parqRows(4, 7) +
    (parqYes(A) ? '<div class="wz-q"><p><b>Doktorun egzersiz yapmana onay verdi mi ve durumun kontrol altında mı?</b></p>' + yesno("parqOK", [[true, "Evet", "Onaylı, kontrol altında"], [false, "Hayır / bilmiyorum"]]) + "</div>" +
      (A.parqOK === false ? '<div class="wz-warn"><b>Önce doktoruna danış.</b> Programı en düşük yoğunlukta, sıçrama ve maksimum testler olmadan kuracağım; yine de başlamadan önce doktorunla konuşman gerekiyor.' +
        '<label class="wz-check"><input type="checkbox" data-wz-ack="1"' + (A.parqAck ? " checked" : "") + '> Anladım, doktoruma danışacağım</label></div>' : "") +
      (A.parqOK === true ? '<p class="wz-note">Normal yoğunlukta kuracağım ama yüksek darbeli hareketleri sınırlı tutacağım. Olağan dışı bir belirti olursa dur.</p>' : "") : ""),
  durum: () => '<h1 class="wz-h">Sağlık durumların</h1><p class="wz-lead">Programı buna göre güvenli kurarım: hangi hareketler girmez, ısınma nasıl olur, beslenme notu ne der.</p>' +
    field("Doktorun söylediği bir durumun var mı?", chips("cond", [["tansiyon", "Yüksek tansiyon"], ["astim", "Astım ya da egzersizde nefes darlığı"], ["seker", "Şeker hastalığı"], ["kemik", "Kemik erimesi (osteoporoz)"], ["artrit", "Eklem romatizması (artrit)"], ["denge", "Denge sorunu ya da son 1 yılda düşme"]], "Hiçbiri"), "Birden çok seçebilirsin.") +
    (A.sex === "k" ? field("Hamile misin?", yesno("preg", [[false, "Hayır"], [true, "Evet"]]), A.preg ? "Program en düşük yoğunlukta ve hamileliğe uygun kurulur. Doktorunun onayı olmadan başlama." : "") : "") +
    (A.sex === "k" && A.preg === false ? field("Son 6 ayda doğum yaptın mı? Ne kadar oldu?", col("postp", [["", "Hayır"], ["0-6", "0-6 hafta önce"], ["6-12", "6-12 hafta önce"], ["12-24", "3-6 ay önce"]]), "Doğumdan sonra karın çalışması ve sıçrama kademeli döner; her ısınmaya pelvik taban eklenir.", true) : ""),
  sakatlik: () => '<h1 class="wz-h">Sakatlık ve ağrılar</h1><p class="wz-lead">Her bölge için işaretle. Şu an ağrı olan bölgeyi zorlayan hareketleri çıkarırım; geçmişte sorun yaşadığın bölgelere koruyucu hareketler eklerim. Ameliyat olduğun bölgeyi de burada işaretle.</p>' +
    Object.keys(LIB.JOINTS).map((j) => { const v = A.inj[j] || "yok"; return '<div class="wz-q"><p>' + esc(LIB.JOINTS[j]) + '</p><div class="wz-seg">' +
      [["yok", "Sorun yok"], ["gecmis", "Geçmişte"], ["agri", "Şu an ağrı"]].map(([k, l]) => '<button type="button" class="wz-opt' + (v === k ? " on" : "") + '" data-wz-inj="' + j + '" data-v="' + k + '" aria-pressed="' + (v === k) + '"><b>' + l + "</b></button>").join("") + "</div></div>"; }).join("") +
    (Object.values(A.inj).includes("agri") ? '<div class="wz-warn">Ağrı devam ediyorsa ya da artıyorsa bir fizyoterapiste veya doktora görün.</div>' : ""),
  gecmis: () => '<h1 class="wz-h">Spor geçmişin</h1>' +
    field("Toplamda ne kadar süre düzenli antrenman yaptın?", col("yil", [["yok", "Hiç ya da 3 aydan az"], ["az", "3-12 ay"], ["orta", "1-3 yıl"], ["cok", "3 yıldan fazla"]])) +
    field("Son 3 ayda haftada ortalama kaç gün antrenman yaptın?", seg("freq", [["0", "Hiç"], ["1-2", "1-2"], ["3-4", "3-4"], ["5+", "5+"]]), "Ara vermişsen program bir seviye aşağıdan başlar.") +
    field("Hangilerini en az birkaç ay düzenli yaptın?", chips("bg", [["agirlik", "Ağırlık / fitness salonu"], ["kalistenik", "Vücut ağırlığı (şınav, barfiks)"], ["kosu", "Koşu, bisiklet, yüzme"], ["dovus", "Dövüş sporu"], ["takim", "Takım sporu"], ["yoga", "Yoga, pilates, esneklik"]], "Hiçbiri"), "Birden çok seçebilirsin. Ağırlık geçmişin yoksa ana kaldırışlar en temel biçimleriyle başlar."),
  hedef: () => {
    const b = bmi(), no = noLose(A), sug = !no && b && b >= 27 && !A.goals.includes("yag"); // kilo verme önerisi yalnız 18+, hamile ya da doğum sonrası değilse
    return '<h1 class="wz-h">Hedeflerin</h1><p class="wz-lead">En önemliden başlayarak en fazla 4 tane seç. Seçim sırası önceliği belirler.</p>' +
      (sug ? '<p class="wz-note">Kilona göre “Kilo vermek” hedefini de düşünebilirsin.</p>' : "") +
      '<div class="wz-field"><span>Hedeflerin</span><div class="wz-chips">' + Object.keys(E.GOALS).map((g) => { const r = A.goals.indexOf(g), off = no && g === "yag"; return '<button type="button" class="wz-chip' + (r >= 0 ? " on" : "") + '" data-wz-goal="' + g + '" aria-pressed="' + (r >= 0) + '"' + (off ? ' disabled aria-describedby="loseNo"' : "") + ">" + (r >= 0 ? "<i>" + (r + 1) + "</i>" : "") + esc(E.GOALS[g]) + "</button>"; }).join("") + "</div>" +
      (no ? '<small id="loseNo">“Kilo vermek” seçilemez. ' + LOSE_NO + "</small>" : "") + "</div>" +
      field("Özellikle geliştirmek istediğin bir bölge var mı?", '<div class="wz-chips">' + [["", "Dengeli"], ["bacak", "Bacak ve kalça"], ["ust", "Göğüs ve omuz"], ["sirt", "Sırt"], ["kol", "Kollar"], ["karin", "Karın ve gövde"], ["durus", "Duruş (yuvarlak omuz, bel)"]].map(([k, l]) => '<button type="button" class="wz-chip' + (A.focus === k ? " on" : "") + '" data-wz-set="focus" data-v="' + k + '" aria-pressed="' + (A.focus === k) + '">' + l + "</button>").join("") + "</div>", "Seçtiğin bölgeyi çalıştıran günlere ek bir hareket eklenir.") +
      field("Akşamları evde 15-20 dakikalık esneklik rutini ister misin?", yesno("home", [[true, "Evet"], [false, "Hayır"]]), "Antrenman günlerinin akşamına kısa bir esneklik akışı eklenir; rehberli yaparsın.");
  },
  zaman: () => {
    const picked = DAYS.filter((d) => A.days.includes(d.k));
    return '<h1 class="wz-h">Zamanın</h1><div class="wz-field"><span>Hangi günler antrenman yapabilirsin? (en az 2)</span><div class="wz-days">' +
      DAYS.map((d) => '<button type="button" class="wz-day' + (A.days.includes(d.k) ? " on" : "") + '" data-wz-multi="days" data-v="' + d.k + '" aria-pressed="' + A.days.includes(d.k) + '" aria-label="' + d.n + '">' + d.s + "</button>").join("") + "</div>" +
      (A.days.length > 6 ? "<small>Haftada en az bir gün dinlenmeni öneririm; 6 gün yeterli.</small>" : "") + "</div>" +
      field("Bir antrenmana ne kadar ayırabilirsin?", '<div class="wz-seg">' + [30, 45, 60, 75, 90].map((m) => '<button type="button" class="wz-opt' + (+A.mins === m ? " on" : "") + '" data-wz-set="mins" data-v="' + m + '" aria-pressed="' + (+A.mins === m) + '"><b>' + m + "</b><small>dk</small></button>").join("") + "</div>", "Seans bu süreyi aşmaz.") +
      (picked.length >= 3 ? field("Bazı günler daha az vaktin var mı?", chips("shortDays", picked.map((d) => [d.k, d.n]), "Hayır, hepsi aynı"), "O günlerde seans kısa ısınma ve yalnız ana hareketlerle o süreye sığar.")
        : picked.length === 2 ? '<p class="wz-note">Haftada 2 gün antrenmanda iki gün de tam süre olur; ölçüm haftalarında testler bu iki güne dağılır.</p>' : "") +
      (shortOn(A) ? field("O günler kaç dakikan var?", seg("shortMins", [[20, "20", "dk"], [30, "30", "dk"]]), "", true) : "") +
      field("Genelde günün hangi saatinde antrenman yaparsın?", seg("tod", [["sabah", "Sabah"], ["gun", "Gün içi"], ["aksam", "Akşam"]]), "Sabah eklemler daha sert: ısınma biraz daha uzun olur.") +
      '<label class="wz-field"><span>Ne zaman başlıyorsun?</span>' + dateIn("start") + "<small>İlk hafta alışma ve başlangıç testleridir.</small></label>" +
      '<label class="wz-field sub"><span>Belirli bir tarihe hazırlanıyor musun? (müsabaka, etkinlik, düğün)</span>' + dateIn("event") + "<small>İstersen boş bırak. Yazarsan o hafta program hafifler; dinç olursun.</small>" +
      '<small class="wz-err" id="evNote" style="min-height:0;margin:0"' + (evOut(A) ? "" : " hidden") + ">Bu tarih 13 haftalık programın dışında kalıyor; dikkate alınmaz. İstersen başlangıcı değiştir ya da boş bırak.</small></label>";
  },
  yer: () => '<h1 class="wz-h">Yerin</h1>' +
    field("Nerede antrenman yapacaksın?", col("place", [["ev", "Evde", "Kendi aletlerimle"], ["salon", "Kendi küçük salonumda", "Kendi aletlerimle"], ["spor", "Spor salonunda", "Bir sonraki adımda salonunda gerçekten olanları işaretle"]])) +
    field("Koşabileceğin düz bir açık alan var mı? (en az 30-40 m)", yesno("outdoor", [[true, "Var"], [false, "Yok"]]), "Park, sokak, bahçe. Varsa sprint ve koşu programa girebilir.") +
    (A.place && A.place !== "spor" ? field("Antrenman yaptığın yer için işaretle", chips("env", [["sessiz", "Üst kattayım, sıçrama sesi sorun olur"], ["dar", "Yerim dar (5 metre yürüyecek yer yok)"]], "Hiçbiri"), "Sessiz yerde sıçrama ve ip yok; dar yerde yürüyerek taşıma yok.") : ""),
  alet: () => '<h1 class="wz-h">Aletlerin</h1>' +
    '<div class="wz-field"><span>Elinde olan aletler</span><p class="wz-note" style="margin:0 0 8px">' + (A.place === "spor" ? "Salonlarda yaygın aletler işaretli geldi; salonunda olmayanı kaldır. Program yalnız işaretli olanlarla kurulur." : "Hiçbiri yoksa boş bırak: aletsiz program kurulur. Duvar, kapı, havlu ve sandalye her evde var sayılır.") + "</p>" +
    eqChips(A.eq, "wz-multi") + "</div>" +
    (hasDb(A) ? field("Dambılların nasıl?", col("dbKind", [["sabit", "Sabit ağırlıklı çiftler", "Her çiftin kilosu bellidir: 4, 6, 8 kg gibi"], ["ayar", "Ayarlanabilir", "Plaka ya da kademe değiştirerek kilo ayarlanır"]])) : "") +
    (hasDb(A) && A.dbKind === "sabit" ? '<label class="wz-field sub"><span>Hangi kilolar var? (tek dambılın kilosu)</span><div class="wz-inp"><input maxlength="60" inputmode="decimal" data-wz-txt="dbList" value="' + esc(A.dbList) + '" placeholder="örn. 4 6 8 10"><em>kg</em></div>' +
      '<small>Kiloları boşlukla ayır; ondalık için virgül: 2,5 5 7,5<span id="dbRead">' + dbRead(A.dbList) + "</span></small></label>" : "") +
    (hasDb(A) && A.dbKind === "ayar" ? num("En ağır kaç kg olabiliyor? (tek dambıl)", "dbMaxKg", "kg", "örn. 24", "", true) + field("En küçük artış kaç kg?", seg("dbStep", [[0.5, "0,5"], [1, "1"], [1.25, "1,25"], [2, "2"], [2.5, "2,5"]]), "Kilo önerileri bu adımla artar.", true) : "") +
    (hasBar(A) ? field("Barın kaç kg?", seg("barKg", [[20, "20", "olimpik"], [15, "15", "kadın barı"], [10, "10", ""], [7.5, "7,5", "kısa bar"], ["", "Bilmiyorum"]]), "Başlangıç kiloları boş barın altına inmez.") +
      field("En küçük plakan kaç kg?", seg("plateMin", [[0.5, "0,5"], [1.25, "1,25"], [2.5, "2,5"], [5, "5"], ["", "Bilmiyorum"]]), "Halter önerileri iki plaka (bir çift) adımıyla artar.", true) : "") +
    (A.eq.includes("band") ? field("Bantların sertliği", chips("bands", [["hafif", "Hafif"], ["orta", "Orta"], ["sert", "Sert"]], "Bilmiyorum"), "Birden çok seçebilirsin. Hafif bantla ağır çalışma olmaz; yardımlı barfiks için orta ya da sert bant gerekir.") : "") +
    (hasBar(A) ? field("Bunlardan hangilerini barla daha önce öğrendin?", chips("lifts", [["squat", "Squat (barla çömelme)"], ["dl", "Deadlift (yerden kaldırış)"], ["bench", "Bench press (sırtüstü itiş)"], ["ohp", "Omuz press (baş üstü itiş)"]], "Hiçbiri"), "Öğrenmediklerine önce dambılla, sonra hafif barla teknik çalışarak geçeriz.") : ""),
  yasam: () => '<h1 class="wz-h">Günlük hayat ve tercihler</h1><p class="wz-lead">Kalori ihtiyacını, toparlanmanı ve hareket seçimini etkiler.</p>' +
    field("Gün içinde ne kadar hareketlisin?", col("act", [["otur", "Çoğunlukla oturarak", "Masa başı, öğrenci, şoför"], ["ayakta", "Ayakta ve yürüyerek", "Öğretmen, satış, garson"], ["agir", "Ağır fiziksel iş", "İnşaat, depo, tarım"]])) +
    field("Genelde gecede kaç saat uyuyorsun?", seg("sleep", [["az", "6'dan az"], ["orta", "6-7"], ["iyi", "7+"]]), "Az uykuda set sayısı sınırlı tutulur.") +
    field("Stresin nasıl?", seg("stress", [["az", "Düşük"], ["orta", "Orta"], ["cok", "Yüksek", "iş, okul, bakım…"]]), "Yüksek streste vücut daha geç toparlanır; set sayısı azaltılır.") +
    field("Kondisyonda neyi tercih edersin?", seg("cardio", [["yuru", "Yürüyüş"], ["kos", "Koşu"], ["ip", "İp atlama"], ["", "Fark etmez"]]), "Seçtiğin, kondisyon bloklarında önde gelir.") +
    field("Yapmak istemediğin ya da yapamadığın bir şey var mı?", chips("dislike", [["sicrama", "Sıçramak"], ["yerde", "Yere yatıp kalkmak zor"], ["basustu", "Baş üstüne itmek (omuz)"]], "Hiçbiri"), "Birden çok seçebilirsin. Seçtiklerin programa hiç girmez."),
  seviye: () => {
    const F = fieldsOf(A, "seviye");
    const rm = (id, label) => '<label class="wz-field"><span>' + esc(label) + '</span><div class="wz-inp"><input inputmode="decimal" maxlength="6" data-wz-rm="' + id + '" value="' + esc(A.rm[id] == null ? "" : A.rm[id]) + '" placeholder="bilmiyorum"><em>kg</em></div></label>';
    return '<h1 class="wz-h">Şu anki seviyen</h1><p class="wz-lead">En yakın aralığı seç; bilmiyorsan “Bilmiyorum” de. İlk hafta zaten ölçüp programı sonuçlarına göre güncelleyeceğiz.</p>' +
      tb("pushup") + (F.includes("tests.pullup") ? tb("pullup") : "") + tb("plank") + tb("run") +
      (F.includes("rm") ? '<div class="wz-field"><span>Biliyorsan 5 tekrar kiloların</span><small style="margin-top:-4px">5 tekrar kilosu: 5 kez üst üste kaldırabildiğin en ağır kilo. Bilmiyorsan boş bırak.</small><div class="wz-grid">' + rm("squat", "Squat (barla çömelme)") + rm("dl", "Deadlift (yerden kaldırış)") + rm("bench", "Bench press (sırtüstü itiş)") + "</div>" +
        rmAsk(A).map((id) => '<div class="ask" role="alert"><span>' + RM_LBL[id] + " " + esc(A.rm[id]) + " kg mı? Gerçekçi aralık " + E.RM_MIN + "-" + E.RM_MAX[id] + ' kg.</span><button type="button" class="btn ghost sm" data-wz-rmfix="' + id + '">Düzelt</button><button type="button" class="btn sm" data-wz-rmok="' + id + '">Evet</button></div>').join("") +
        "<small>İlk haftanın başlangıç kilolarını buna göre öneririm.</small></div>" : "");
  },
  ozet: () => {
    let gen;
    try { gen = E.generate(A); } catch (e) { console.error(e); return '<h1 class="wz-h">Bir sorun oldu</h1><p>Program oluşturulamadı. Geri dönüp cevaplarını kontrol eder misin?</p>'; }
    const sm = gen.summary, n = gen.NUTRITION;
    return '<h1 class="wz-h">Sana göre kuruldu</h1>' +
      '<div class="wz-sum"><div><em>Seviye</em><b>' + esc(sm.levelName) + (sm.cautious ? " · temkinli" : "") + "</b></div><div><em>Haftada</em><b>" + sm.days.length + " gün · " + sm.mins + " dk</b></div><div><em>Günlük</em><b>~" + n.kcal + " kcal · " + n.prot + " g protein</b></div></div>" +
      '<div class="wz-field"><span>Haftanın düzeni</span><table class="wz-week">' + DAYS.map((d) => { const s = gen.S.F1[d.k]; return "<tr><td>" + d.s + "</td><td>" + (s ? esc(s.title) + ' <small>' + esc(s.dur) + ((sm.shortDays || []).includes(d.k) ? " · kısa gün" : "") + "</small>" : '<span class="muted">Dinlenme</span>') + "</td></tr>"; }).join("") + "</table></div>" +
      (gen.RULES.slice(0, 2).filter((r) => /Sağlık|ağrın|Hamilelik/.test(r.h)).map((r) => '<div class="wz-warn"><b>' + esc(r.h) + ":</b> " + esc(r.t) + "</div>").join("")) +
      (sm.reasons && sm.reasons.length ? '<div class="wz-field"><span>Neden böyle kurdum?</span><ul class="wz-list">' + sm.reasons.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ul></div>" : "") +
      (+A.age < 18 ? '<div class="wz-warn"><b>18 yaşından küçüksün:</b> Ağırlık çalışmalarını bir yetişkin veya antrenör gözetiminde yap.</div>' : "") +
      '<p class="wz-note">' + (editing === "q2" ? "Program gelecek Pazartesi'den itibaren yeni cevaplarınla kurulur; bu hafta ve kayıtların olduğu gibi kalır." : editing ? "Program hemen yenilenir; bu hafta yaptığın günler ve kayıtların olduğu gibi kalır." : "Başlangıç: " + esc(trDate(A.start, true)) + ".") + " Her şeyi sonradan Program → Cevapları düzenle'den değiştirebilirsin.</p>";
  },
};

function render(keep) {
  const m = $("#main"), key = VIS[step], qs = VIS.filter((s) => s !== "hosgeldin" && s !== "ozet"), qi = qs.indexOf(key);
  document.body.classList.add("wz-mode");
  m.innerHTML = '<div class="wz"><div class="wz-top"><span>' + (qi >= 0 ? "Adım " + (qi + 1) + " / " + qs.length + " · " + esc(NAMES[key]) : key === "ozet" ? esc(NAMES.ozet) : "") + "</span>" +
    (editing ? '<button type="button" class="btn ghost sm" data-wz-go="cancel">Vazgeç</button>' : "") + '</div><div class="wz-bar"><i style="width:' + Math.round((step / Math.max(1, VIS.length - 1)) * 100) + '%"></i></div>' +
    '<div class="wz-body">' + VIEW[key]() + '</div><p class="wz-err" id="wzErr" role="alert"></p><div class="wz-nav">' +
    (step ? '<button type="button" class="btn ghost" data-wz-go="back">‹ Geri</button>' : "") +
    '<button type="button" class="btn acc" data-wz-go="next">' + (key === "hosgeldin" ? "Başlayalım" : key === "ozet" ? (editing ? "Programı güncelle" : "Programımı başlat") : "Devam →") + "</button></div></div>";
  if (!keep) window.scrollTo(0, 0);
}
function saveDraft() { if (!editing) save(KEY_ANS + "_draft", A); } // yarım kalan ilk kurulum; düzenlemede kayıtlı cevap zaten var
// ---------------- program sürümleri ----------------
function monOf(isoStr) { const d = new Date(isoStr + "T00:00:00"), js = d.getDay(); d.setDate(d.getDate() + (js === 0 ? -6 : 1 - js)); return d; }
// Bugünün program haftası: tek formül src/tracker.html › TK_WEEK; başlangıç ve ara haftaları takip ayarlarından (tek kaynak), bellekteyse oradan
function curWeek(ans) {
  const st = (window.TK && window.TK.state.settings) || (load(KEY_DATA) || {}).settings || {};
  return window.TK_WEEK.week(st.start || ans.start, iso(new Date()), st.pauses);
}
// Ayarlar'da başlangıç tarihi değişince cevaplardaki tarih de eşitlenir ("Cevapları düzenle" eskiye çevirmesin)
window.TK_START_CHANGED = (s) => { const a = load(KEY_ANS); if (a && a.start !== s) { a.start = s; save(KEY_ANS, a); } };
// Yeni cevaplarla programı kur; fromWeek öncesi haftalar eski planla kalır. prev: eski slot→hareket haritası, hâlâ geçerli hareketler aynı slotta kalır (kayıt anahtarları bozulmaz)
function rebuild(A2, fromWeek) {
  const old = load(KEY_PLAN), oldA = load(KEY_ANS), gen = E.generate(A2, old ? { prev: E.prevOf(old) } : undefined);
  if (old && old.S && oldA && oldA.start === A2.start && fromWeek > 0) {
    // Her sürüm [önceki sınır, until) haftalarını kapsar; fromWeek öncesi aynen kalır, sonrası yeni plana geçer
    const cut = Math.min(fromWeek, 13), hist = [];
    for (const h of old.hist || []) { if (h.until <= cut) hist.push(h); else { hist.push({ until: cut, S: h.S }); break; } }
    if (!hist.length || hist[hist.length - 1].until < cut) hist.push({ until: cut, S: old.S });
    gen.hist = hist;
  }
  gen.calib = iso(new Date());
  return save(KEY_ANS, A2) && save(KEY_PLAN, gen) ? gen : null;
}
// @hafta-baslangic — program değişikliği bu haftayı nasıl etkiler (saf; test/arayuz.test.mjs). Kural: bilgi/arayuz-kurallari.md › Hata önleme
const okSets = (I) => ((I && I.sets) || []).filter((s) => s && s.ok).length;
// days: bu haftanın günleri [{ date, dk }]. İçinde onaylı set olan gün varsa yeni plan gelecek haftadan başlar (yapılmış günler eski planla kalır), yoksa bu haftadan.
const weekFrom = (w, days, logs) => (days.some((d) => Object.values((logs[d.date] || {}).items || {}).some((I) => okSets(I) > 0)) ? w + 1 : w);
// Bu hafta eski planla bitiyorsa kayıtsız slotlara yeni planın farklı maddesi gün düzeyinde ikame ("sadece bugün" mekanizması): { tarih: { slot: madde } }. Kişinin kendi "sadece bugün" seçimine dokunulmaz.
// ponytail: yalnız aynı slottaki madde değişir; yeni planda eklenen ya da kalkan slotlar bu hafta eski planla biter (gelecek Pazartesi yeni plan tam gelir).
function weekSwaps(days, oldSess, newSess, logs) {
  const out = {};
  days.forEach(({ date, dk }) => {
    const o = oldSess(dk), n = newSess(dk), L = logs[date] || {};
    if (!o || o.off || !n || n.off) return;
    (o.blocks || []).forEach((b, bi) => (b.items || []).forEach((it, ii) => {
      const k = bi + "-" + ii, x = ((((n.blocks || [])[bi]) || {}).items || [])[ii];
      if (x && x.x !== it.x && !okSets((L.items || {})[k]) && !(L.swap && L.swap[k])) (out[date] = out[date] || {})[k] = x;
    }));
  });
  return out;
}
// @hafta-bitis
// Değişikliği kur (alet, hareket geri alma / kalıcı değiştirme, cevap düzenleme): yapılmış günler bozulmaz, değişiklik bugünden görünür.
function rebuildNow(A2) {
  const ans = load(KEY_ANS), w = Math.max(0, curWeek(ans)), T = window.TK, data = T ? null : load(KEY_DATA) || { settings: {}, logs: {}, tests: {}, weights: {} };
  const st = T ? T.state : data, set = st.settings || {}, logs = st.logs || (st.logs = {});
  const days = DAYS.map((d, i) => ({ date: iso(window.TK_WEEK.dateOf(set.start || ans.start, w, set.pauses, i)), dk: d.k }));
  const from = weekFrom(w, days, logs), gen = rebuild(A2, from);
  if (!gen || from === w || w > 12) return gen;
  const P2 = adapt(gen, A2), ph = phaseOf(w).key, sw = weekSwaps(days, (dk) => P2.session(w, dk), (dk) => (gen.S[ph] || {})[dk], logs);
  Object.keys(sw).forEach((date) => {
    const L = logs[date] || (logs[date] = { date, week: w, day: days.find((d) => d.date === date).dk, items: {}, rpe: null, note: "", home: false });
    L.swap = Object.assign({}, L.swap, sw[date]);
    if (T) T.Store.put("logs", date);
  });
  if (!T && Object.keys(sw).length) save(KEY_DATA, data);
  return gen;
}
function finish() {
  let gen;
  // Cevapları düzenle: rebuildNow (yapılmış günler bozulmaz); yalnız yeni sorular (q2): gelecek haftadan (bu hafta olduğu gibi biter); ilk kurulum ya da başlangıç değiştiyse baştan
  const prevA = load(KEY_ANS), same = editing && prevA && prevA.start === A.start;
  A.eq = A.eq.filter((k) => k !== "gym"); A.eqV = 2; A.qV = 2; dropLose(A); // alet listesi tek tek soruldu, yeni sorular cevaplandı: motor hiçbir şey eklemez
  try { gen = !same ? rebuild(A, 0) : editing === "q2" ? rebuild(A, Math.max(0, curWeek(A) + 1)) : rebuildNow(A); } catch (e) { console.error(e); $("#wzErr").textContent = "Program oluşturulamadı. Cevaplarını kontrol edip tekrar dene."; return; }
  if (!gen) { $("#wzErr").textContent = "Cihazın depolama alanı dolu ya da kapalı; kaydedemedim."; return; }
  // Takip verisinde ayarları cevaplarla eşitle (kayıtlar korunur)
  const data = load(KEY_DATA) || { settings: {}, logs: {}, tests: {}, weights: {} };
  data.settings = Object.assign({}, data.settings, { start: A.start, age: +A.age, height: +A.height, sex: A.sex });
  if (!save(KEY_DATA, data)) { $("#wzErr").textContent = "Cihazın depolama alanı dolu ya da kapalı; kaydedemedim."; return; }
  try { localStorage.removeItem(KEY_ANS + "_draft"); sessionStorage.removeItem("tatami_view"); } catch (e) {}
  location.reload();
}
// mode: yok = ilk kurulum (yarım kalan taslak sürer) · "edit" = Cevapları düzenle · "q2" = Sorular yenilendi (yalnız cevaplanmamış alanı olan adımlar)
function start(prev, mode) {
  A = merge(prev || load(KEY_ANS + "_draft"));
  if (!mode) A.qV = 2; // yeni sihirbazın taslağı: hiçbir soru önceden işaretli gelmez
  editing = mode || false; VIS = wizardSteps(A, editing); step = 0;
  document.querySelector(".nav") && (document.querySelector(".nav").hidden = true);
  render();
}
// Eski cevapta yeni soruların cevabı yoksa Gün'de "Sorular yenilendi" şeridi (bir kez; "Sonra" ertesi gün yine)
const needQ2 = (ans) => !!ans && !(ans.qV >= 2) && wizardSteps(merge(ans), "q2").length > 1;
const NUMF = { mins: 1, shortMins: 1, dbStep: 1, barKg: 1, plateMin: 1 }; // tek seçimde sayı olarak saklananlar ("" = Bilmiyorum)
document.addEventListener("click", (ev) => {
  if (!A || !document.body.classList.contains("wz-mode")) return;
  const t = ev.target.closest("[data-wz-go],[data-wz-set],[data-wz-multi],[data-wz-bool],[data-wz-parq],[data-wz-goal],[data-wz-inj],[data-wz-tb],[data-wz-rmfix],[data-wz-rmok]");
  if (!t) return;
  const d = t.dataset;
  if (d.wzGo === "cancel") { location.reload(); return; }
  if (d.wzGo === "back") { step = Math.max(0, step - 1); return render(); }
  if (d.wzGo === "next") {
    const key = VIS[step], err = validStep(A, key);
    if (err) { if (key === "seviye") render(true); $("#wzErr").textContent = err; return; } // seviye adımında soru satırı (Düzelt / Evet) görünsün
    dropLose(A); // hamile / doğum sonrası / 18 altı: önceden seçilmiş "Kilo vermek" kalkar (yazarken değil, adım geçerken: 45 yazılırken "4" reşit değil sayılmasın)
    if (key === "ozet") return finish();
    step++; saveDraft(); return render();
  }
  if (d.wzRmfix) { delete A.rm[d.wzRmfix]; saveDraft(); render(true); const inp = $('[data-wz-rm="' + d.wzRmfix + '"]'); if (inp) inp.focus(); return; }
  if (d.wzRmok) A.rmOK = Object.assign({}, A.rmOK, { [d.wzRmok]: A.rm[d.wzRmok] });
  if (d.wzSet === "place" && d.v !== A.place) {
    // Spor salonu seçilince yaygın aletler işaretli gelir (kişi kaldırır); salondan çıkınca Salon grubu kalkar. Varsayım yok: kaydedilen yalnız işaretli olanlar.
    A.eq = d.v === "spor" ? [...new Set(A.eq.concat(E.GYM_DEFAULT))] : A.place === "spor" ? A.eq.filter((k) => !SALON_EQ.includes(k)) : A.eq;
  }
  if (d.wzSet) A[d.wzSet] = NUMF[d.wzSet] && d.v !== "" ? +d.v : d.v;
  if (d.wzMulti) { // çok seçim; "" = Hiçbiri → []
    const f = d.wzMulti;
    if (d.v === "") A[f] = [];
    else { const a = Array.isArray(A[f]) ? A[f].slice() : []; const i = a.indexOf(d.v); if (i >= 0) a.splice(i, 1); else a.push(d.v); A[f] = a; }
    if (f === "days" && Array.isArray(A.shortDays)) A.shortDays = A.days.length < 3 ? [] : A.shortDays.filter((k) => A.days.includes(k)); // kısa gün yalnız antrenman günlerinden, en az 3 günde
  }
  if (d.wzBool) A[d.wzBool] = d.v === "1";
  if (d.wzParq) { A.parq[+d.wzParq] = d.v === "1"; if (!A.parq.some(Boolean)) { A.parqAck = false; A.parqOK = null; } }
  if (d.wzGoal) { const i = A.goals.indexOf(d.wzGoal); if (i >= 0) A.goals.splice(i, 1); else if (A.goals.length < 4) A.goals.push(d.wzGoal); else { $("#wzErr").textContent = "En fazla 4 hedef seçebilirsin; önce birini kaldır."; return; } }
  if (d.wzInj) A.inj[d.wzInj] = d.v;
  if (d.wzTb) { if (d.v === "") delete A.tests[d.wzTb]; else A.tests[d.wzTb] = +d.v; }
  saveDraft(); render(true); // seçim yaparken sayfa başa atlamasın
});
document.addEventListener("input", (ev) => {
  if (!A || !document.body.classList.contains("wz-mode")) return;
  const t = ev.target, d = t.dataset;
  if (d.wzNum) {
    A[d.wzNum] = t.value.replace(",", ".").trim();
    const bn = $("#bmiNote"), gh = $("#h-goalWeight"); // yazarken yerinde: vücut kitle indeksi ve hedef kilo notu
    if (bn) { bn.innerHTML = bmiHTML(); bn.hidden = !bmi(); }
    if (gh) gh.textContent = gwHint();
  } else if (d.wzTxt) { A[d.wzTxt] = t.value; const n = $("#dbRead"); if (n && d.wzTxt === "dbList") n.textContent = dbRead(A.dbList); } // yazarken yerinde: ekran yenilenmez, yazı bozulmaz
  else if (d.wzRm) { const v = t.value.replace(",", ".").trim(); if (v === "" || isNaN(+v)) delete A.rm[d.wzRm]; else A.rm[d.wzRm] = +v; }
  else if (d.wzDate) { A[d.wzDate] = t.value; const n = $("#evNote"); if (n) n.hidden = !evOut(A); }
  else if (d.wzAck) { A.parqAck = t.checked; }
  else return;
  const err = $("#wzErr"); if (err) err.textContent = ""; // düzeltmeye başlayınca eski hata kalkar
  saveDraft();
});
document.addEventListener("change", (ev) => { if (A && ev.target.dataset && ev.target.dataset.wzAck) { A.parqAck = ev.target.checked; saveDraft(); } });

// ---------------- program kartı, ayarlar, yedek, yazdırma ----------------
const GOALN = E.GOALS;
const inArt = () => !!(window.TK_ARTIFACT || window.claude); // Claude bağlantısı: yazdırma ve dosya indirme yok
const noPrint = () => inArt() || window.TK_NATIVE; // Android uygulamasında (WebView) yazdırma çalışmaz
const printBtn = (cls) => (noPrint() ? "" :'<button class="btn ghost' + cls + '" data-pub="print">Programı yazdır</button>');
// Alt sayfa (kapatma tracker.html'deki data-act="close" ile)
const sheet = (label, body) => {
  const html = '<div class="sheet-bg" data-act="close"><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(label) + '"><button class="iconbtn x" data-act="close" aria-label="Kapat">×</button>' + body + "</div></div>";
  if (window.TK_SHEET_OPEN) return window.TK_SHEET_OPEN(html); // takip çekirdeği: odak içeri, kapanınca geri
  $("#sheetRoot").innerHTML = html; const x = $("#sheetRoot .x"); if (x) x.focus({ preventScroll: true });
};
// Program kurulmadan (karşılama ekranı) takip çekirdeği çalışmaz: uyarı ve alt sayfayı kapatma burada
const toast = (m) => {
  if (window.TK) return window.TK.toast(m);
  let el = $("#toast"); if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; document.body.appendChild(el); }
  el.textContent = m; el.hidden = false; setTimeout(() => { el.hidden = true; }, 3200);
};
const closeSheet = () => { if (!window.TK) $("#sheetRoot").innerHTML = ""; };
document.addEventListener("click", (ev) => { const el = ev.target.closest('[data-act="close"]'); if (el && (ev.target === el || el.classList.contains("x"))) closeSheet(); });
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") closeSheet(); });
// Gizlilik (bilgi/veri-gizlilik.md "Yapıyoruz" bölümünün kullanıcı dili)
const PRIV_BTN = '<button type="button" class="backlink" style="margin:-11px -6px;padding:11px 6px;font-size:inherit" data-pub="privacy">Gizlilik</button>';
const privacy = () => sheet("Gizlilik", '<h2>Gizlilik</h2><ul style="margin-top:10px">' + [
  "Cevapların, programın, kayıtların; kilo, sakatlık ve hamilelik bilgilerin <b>sadece bu cihazda</b> durur. Hiçbir sunucuya gitmez, biz de göremeyiz.",
  !inArt() && window.TK_PUSH_KEY ? "Bildirimleri açarsan sunucuda sadece anonim bir bildirim adresi saklanır; adın, e-postan ya da antrenman verin değil. Bildirimleri kapatınca silinir." : "",
  !inArt() && window.TK_PUSH_KEY ? "Antrenman hatırlatması açıkken sunucuda yalnız saat, antrenman günlerin ve saat dilimin tutulur; kapatınca silinir. Kayıtların ve cevapların telefonunda kalır." : "",
  "Reklam, analitik ya da takip kodu yok.",
  "Hepsini silmek için Profil › Yedek ve kayıtlar › <b>Tüm verileri sil</b>.",
  "Telefon değiştirirken önce Profil › Yedek ve kayıtlar › <b>Yedek al</b>, yeni telefonda yedeği yükle.",
  MED,
].filter(Boolean).map((x) => "<li>" + x + "</li>").join("") + "</ul>");
// Program ekranı: "head" = başlığın altındaki tek satır özet; "more" = Daha fazla altındaki işler (cevaplar, yazdırma, çıkarılan hareketler)
window.TK_PROGRAM_EXTRA = (part) => {
  const P = window.PLAN, sm = P.summary || {}, ans = load(KEY_ANS) || {};
  if (part === "head") return '<p class="small muted" style="margin:0 0 16px"><b style="color:var(--ink);font-weight:600">' + esc(sm.levelName || "") + (sm.cautious ? " · temkinli" : "") + "</b> · " + (sm.days || []).length + " gün · " + esc(sm.mins) + " dk · Hedef: " +
    esc((sm.goals || []).map((g) => GOALN[g]).join(", ")) + "</p>";
  return '<div class="card">' + ((ans.avoid || []).length ? '<p class="small" style="margin:0 0 8px">Çıkardığın hareketler: ' + ans.avoid.map((id) => esc((LIB.EX[id] || {}).n || id) + ' <button class="backlink" style="margin:0;font-size:var(--fs-s)" data-pub="unavoid" data-v="' + esc(id) + '">geri al</button>').join(" · ") + "</p>" : "") +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" data-pub="edit">Cevapları düzenle</button>' + printBtn(" sm") + "</div></div>";
};
// Profil › Ayarlar alt sayfalarının web satırları (bilgi/tasarim.md › Ayar listesi): sol etiket + alt açıklama, sağda ›.
// "answers": Cevaplarım ve ekipman · "backup": Yedek ve kayıtlar (üst) · "danger": aynı sayfanın altı, tehlikeli bölüm (kırmızı yalnız orada) · "app": Uygulama · "appsub": Uygulama satırının alt metni
const srowAct = (lbl, attr, sub) => '<button class="srow" ' + attr + "><span>" + lbl + (sub ? "<small>" + sub + "</small>" : "") + '</span><i aria-hidden="true">›</i></button>';
window.TK_SETTINGS_EXTRA = (part) => {
  if (part === "danger") return '<section class="slist bad"><h3 class="catlbl">Tehlikeli</h3><button class="srow" data-pub="wipe">Tüm verileri sil</button></section>';
  if (part === "answers") return '<section class="slist">' + srowAct("Cevapları düzenle", 'data-pub="edit"', "Program hemen yenilenir; yaptığın günler ve kayıtların kalır") +
    (noPrint() ? "" : srowAct("Programı yazdır", 'data-pub="print"')) + "</section>";
  if (part === "app") return appSettings();
  if (part === "appsub") return inArt() ? "Telefona kurulan sürüm" : "Kurulum, bildirim, hatırlatma, sürüm";
  const last = lsGet("tk_web_lastbackup"), lastT = last && window.TK ? window.TK.fmtDate(window.TK.parseISO(last)) : last;
  return '<section class="slist"><h3 class="catlbl">Yedek</h3>' +
    srowAct("Yedek al", 'data-pub="backup"', last ? "Son yedek " + esc(lastT) : "Henüz yedek yok · veriler yalnız bu cihazda") +
    (inArt() ? "" : '<label class="srow" style="cursor:pointer"><span>Yedek dosyası yükle<small>Başka cihazdan alınan .json dosyası</small></span><i aria-hidden="true">›</i><input type="file" accept="application/json,.json" data-pub-file="1" hidden></label>') +
    srowAct("Yedek metnini yapıştır", 'data-pub="paste"') +
    (load(KEY_PREV) ? srowAct("Son yedek yüklemesini geri al", 'data-pub="restoreundo"') : "") +
    srowAct("Gizlilik", 'data-pub="privacy"', "Veriler nerede durur, ne gönderilir") + "</section>";
};

const BK_V = 1; // yedek biçimi sürümü
const KEY_PREV = "tk_web_prev"; // yedek yüklemeden önceki durum (bir kez geri alınabilir)
const BK_MAX = 6e6; // yedek metni üst sınırı (karakter)
const isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
async function backup() {
  const blob = { app: "tatami-kampi", v: BK_V, saved: new Date().toISOString(), answers: load(KEY_ANS), plan: load(KEY_PLAN), data: load(KEY_DATA) };
  if (await window.TK.saveFile("tatami-yedek-" + iso(new Date()) + ".json", JSON.stringify(blob), "application/json")) { lsSet("tk_web_lastbackup", iso(new Date())); rr(); }
}
// ---- yedek süzgeci: yalnız bilinen alanlar, doğru türde ve aralıkta (yedek dışarıdan gelebilir; bilinmeyen alan atılır) ----
const ISO_D = /^\d{4}-\d{2}-\d{2}$/;
const bool = (v) => (typeof v === "boolean" ? v : undefined);
const numIn = (lo, hi) => (v) => { const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? +v.replace(",", ".") : NaN; return n >= lo && n <= hi ? v : undefined; };
const oneOf = (list) => (v) => (list.includes(v) ? v : undefined);
const listOf = (list, max) => (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => list.includes(x)))].slice(0, max || 99) : undefined);
const mapOf = (keys, f) => (v) => { if (!isObj(v)) return undefined; const o = {}; keys.forEach((k) => { const x = f(v[k]); if (x !== undefined) o[k] = x; }); return o; };
const str = (max) => (v) => (typeof v === "string" ? v.slice(0, max) : typeof v === "number" ? String(v) : undefined);
const EXK = Object.keys(LIB.EX), EQK = LIB.EQUIPMENT.map((e) => e.k).concat("gym"), DAYK = E.DAYS.map((d) => d.k);
const emptyOr = (f) => (v) => (v === "" ? "" : f(v)); // "" = Bilmiyorum / boş; aksi hâlde aralık denetimi
const ANS_SCHEMA = { age: numIn(12, 90), sex: oneOf(["e", "k"]), height: numIn(100, 250), weight: numIn(30, 250), goalWeight: (v) => (v === "" || v == null ? "" : numIn(30, 250)(v)),
  preg: bool, parq: (v) => (Array.isArray(v) ? v.slice(0, 7).map((x) => (x == null ? null : !!x)) : undefined), parqAck: bool, parqOK: (v) => (v === null || typeof v === "boolean" ? v : undefined),
  cond: listOf(["tansiyon", "astim", "seker", "kemik", "artrit", "denge"]), postp: oneOf(["", "0-6", "6-12", "12-24"]),
  yil: oneOf(["yok", "az", "orta", "cok"]), freq: oneOf(["0", "1-2", "3-4", "5+"]), bg: listOf(["agirlik", "kalistenik", "kosu", "dovus", "takim", "yoga"]), act: oneOf(["otur", "ayakta", "agir"]), sleep: oneOf(["az", "orta", "iyi"]),
  stress: oneOf(["az", "orta", "cok"]), cardio: oneOf(["", "yuru", "kos", "ip"]), dislike: listOf(["sicrama", "yerde", "basustu"]),
  goals: listOf(Object.keys(E.GOALS), 4), focus: oneOf(["", "bacak", "ust", "sirt", "kol", "karin", "durus"]), days: listOf(DAYK), mins: numIn(20, 180), home: bool, start: (v) => (ISO_D.test(v) ? v : undefined),
  shortDays: listOf(DAYK), shortMins: numIn(15, 90), tod: oneOf(["sabah", "gun", "aksam"]), event: (v) => (v === "" ? "" : ISO_D.test(v) ? v : undefined),
  place: oneOf(["ev", "salon", "spor"]), outdoor: bool, env: listOf(["sessiz", "dar"]), eq: listOf(EQK), dbMax: oneOf(["", "hafif", "orta", "agir", "ayar"]), inj: mapOf(Object.keys(LIB.JOINTS), oneOf(["yok", "gecmis", "agri"])),
  dbKind: oneOf(["", "sabit", "ayar"]), dbList: str(60), dbMaxKg: emptyOr(numIn(1, 100)), dbStep: emptyOr(numIn(0.25, 10)), barKg: emptyOr(numIn(5, 30)), plateMin: emptyOr(numIn(0.25, 10)), bands: listOf(["hafif", "orta", "sert"]), lifts: listOf(["squat", "dl", "bench", "ohp"]),
  tests: mapOf(["pushup", "pullup", "plank", "run"], numIn(0, 9999)), rm: mapOf(["squat", "dl", "bench"], numIn(0, 9999)), eqV: numIn(0, 9), qV: numIn(0, 9), cycle: numIn(1, 99), avoid: listOf(EXK), swap: mapOf(EXK, oneOf(EXK)),
  exp: oneOf(["yok", "az", "orta", "cok"]), gap: oneOf(["aktif", "kisa", "uzun"]) };
function cleanAnswers(a) { const o = {}; Object.keys(ANS_SCHEMA).forEach((k) => { if (!isObj(a) || a[k] === undefined) return; const v = ANS_SCHEMA[k](a[k]); if (v !== undefined) o[k] = v; }); return o; }
const SET_CLEAN = { start: (v) => (ISO_D.test(v) ? v : undefined), age: numIn(12, 90), height: numIn(100, 250), sex: oneOf(["e", "k"]), pauses: (v) => (Array.isArray(v) ? v.filter((p) => typeof p === "string" && ISO_D.test(p)).slice(0, 60) : undefined), calTime: (v) => (/^\d{2}:\d{2}$/.test(v) ? v : undefined) };
const strMap = (o, max) => { const r = {}; Object.keys(isObj(o) ? o : {}).slice(0, 200).forEach((k) => { const v = str(max || 20)(o[k]); if (v !== undefined) r[k.slice(0, 40)] = v; }); return r; };
const cleanSets = (a) => (Array.isArray(a) ? a.slice(0, 30).map((s) => (isObj(s) ? { kg: str(12)(s.kg), v: str(12)(s.v), ok: !!s.ok } : {})) : []);
const cleanItem = (I) => (isObj(I) && typeof I.x === "string" && I.x.length < 40 ? { x: I.x, sets: cleanSets(I.sets), n: numIn(0, 30)(I.n) } : null);
// Plan maddesi (günlük "sadece bugün" ikamesi): yalnız kütüphanedeki hareket, kısa reçete
const cleanSwapItem = (it) => (isObj(it) && EXK.includes(it.x) ? { x: it.x, p: Array.isArray(it.p) ? it.p.slice(0, 3).map((p) => str(40)(p) || "") : str(40)(it.p) || "", r: numIn(0, 600)(it.r) || 0, t: oneOf(["w", "r", "s", "x"])(it.t) || "x", s: numIn(0, 30)(it.s) || 0, n: str(200)(it.n) || "", pri: numIn(0, 99)(it.pri) } : undefined);
function cleanLog(L) {
  const o = { date: str(10)(L.date), week: numIn(-99, 99)(L.week), day: oneOf(DAYK)(L.day), items: {}, rpe: numIn(1, 10)(L.rpe) == null ? null : L.rpe, note: str(2000)(L.note) || "", home: !!L.home };
  Object.keys(isObj(L.items) ? L.items : {}).slice(0, 200).forEach((k) => { const I = cleanItem(L.items[k]); if (I && k.length < 40) o.items[k] = I; });
  if (typeof L.start === "string" && !isNaN(Date.parse(L.start))) o.start = L.start; if (typeof L.end === "string" && !isNaN(Date.parse(L.end))) o.end = L.end;
  if (isObj(L.tdone)) o.tdone = mapOf(Object.keys(L.tdone).slice(0, 20), bool)(L.tdone); if (isObj(L.circ)) o.circ = mapOf(Object.keys(L.circ).slice(0, 20), numIn(0, 99))(L.circ);
  if (Array.isArray(L.acts)) o.acts = L.acts.slice(0, 20).filter(isObj).map((a) => ({ t: str(20)(a.t) || "diger", min: numIn(1, 600)(a.min) || 1, rpe: numIn(1, 10)(a.rpe) == null ? null : a.rpe, note: str(200)(a.note) }));
  if (Array.isArray(L.free)) o.free = L.free.slice(0, 30).map((x) => (EXK.includes(x) ? x : null));
  if (isObj(L.swap)) { const sw = {}; Object.keys(L.swap).slice(0, 40).forEach((k) => { const it = cleanSwapItem(L.swap[k]); if (it && k.length < 10) sw[k] = it; }); if (Object.keys(sw).length) o.swap = sw; }
  return o;
}
function cleanData(d) {
  const out = { settings: {}, logs: {}, tests: {}, weights: {} };
  if (!isObj(d)) return out;
  const s = isObj(d.settings) ? d.settings : {};
  Object.keys(SET_CLEAN).forEach((k) => { const v = SET_CLEAN[k](s[k]); if (v !== undefined) out.settings[k] = v; });
  Object.keys(isObj(d.logs) ? d.logs : {}).forEach((k) => { const L = d.logs[k]; if (ISO_D.test(k) && isObj(L)) out.logs[k] = cleanLog(L); });
  Object.keys(isObj(d.tests) ? d.tests : {}).forEach((k) => { const t = d.tests[k]; if (ISO_D.test(k) && isObj(t) && isObj(t.v)) out.tests[k] = { date: k, v: strMap(t.v) }; });
  Object.keys(isObj(d.weights) ? d.weights : {}).forEach((k) => { const w = d.weights[k]; if (/^\d{4}-\d{2}$/.test(k) && isObj(w) && isObj(w.d)) out.weights[k] = { d: strMap(w.d, 8) }; });
  return out;
}
// Plan yapısal olarak takip çekirdeğinin beklediği gibi mi (yalnız kütüphane hareketleri)? Değilse cevaplardan yeniden üretilir.
function okPlan(p) {
  const sessOK = (s) => isObj(s) && (s.blocks == null || (Array.isArray(s.blocks) && s.blocks.every((b) => isObj(b) && (b.items == null || (Array.isArray(b.items) && b.items.every((it) => isObj(it) && EXK.includes(it.x)))))));
  const SOK = (S) => isObj(S) && isObj(S.F1) && Object.values(S).every((ph) => isObj(ph) && Object.values(ph).every(sessOK));
  return isObj(p) && typeof p.v === "number" && SOK(p.S) && Array.isArray(p.PHASES) && p.PHASES.every((ph) => isObj(ph) && typeof ph.key === "string" && Array.isArray(ph.weeks)) &&
    Array.isArray(p.DAYS) && p.DAYS.every((d) => isObj(d) && DAYK.includes(d.k)) && isObj(p.ROUTINES) && Object.values(p.ROUTINES).every((R) => isObj(R) && Array.isArray(R.items) && R.items.every((it) => isObj(it) && EXK.includes(it.x))) &&
    Array.isArray(p.TESTS) && Array.isArray(p.RULES) && Array.isArray(p.TARGETS) && isObj(p.NUTRITION) && Array.isArray(p.NUTRITION.rows) && isObj(p.summary) &&
    (p.hist == null || (Array.isArray(p.hist) && p.hist.every((h) => isObj(h) && typeof h.until === "number" && SOK(h.S))));
}
// Yedek metni → süzülmüş {answers, plan, data} ya da { err }. Saf: test/arayuz.test.mjs
function parseBackup(text) {
  if (typeof text !== "string" || text.length > BK_MAX) return { err: "Yedek çok büyük (6 MB üstü); yüklenmedi." };
  let j; try { j = JSON.parse(text); } catch (e) { j = null; }
  const NOT = "Bu bir Tatami Kampı yedeği değil.";
  if (!isObj(j) || j.app !== "tatami-kampi" || (j.v != null && typeof j.v !== "number")) return { err: NOT };
  if (j.v > BK_V) return { err: "Bu yedek uygulamanın daha yeni bir sürümünden. Önce uygulamayı güncelle, sonra tekrar dene." };
  if (!isObj(j.answers) || !isObj(j.plan)) return { err: NOT };
  const a = cleanAnswers(j.answers), miss = [[a.age != null, "yaş"], [!!a.sex, "cinsiyet"], [(a.days || []).length >= 2, "günler"], [!!a.place, "antrenman yeri"], [!!a.start, "başlangıç tarihi"], [j.data == null || isObj(j.data), "kayıtlar"]].filter((x) => !x[0]).map((x) => x[1]);
  if (miss.length) return { err: "Bu yedek eksik ya da bozuk (" + miss.join(", ") + "). Hiçbir şeyi değiştirmedim." };
  let plan = j.plan, regen = false;
  if (!okPlan(plan)) { // yapı tutmuyor: planı yedekten alma, cevaplardan kur (eski slotlar korunmaya çalışılır)
    let prev = null; try { prev = E.prevOf(plan); } catch (e) {}
    try { plan = E.generate(a, prev ? { prev } : undefined); regen = true; } catch (e) { console.error(e); return { err: "Yedekteki cevaplardan program kurulamadı; yüklenmedi." }; }
  }
  return { answers: a, plan, data: cleanData(j.data), saved: typeof j.saved === "string" ? j.saved.slice(0, 10) : "", regen };
}
let pendingRestore = null;
function restoreText(text) {
  const r = parseBackup(text);
  if (r.err) { toast(r.err); return; }
  const n = Object.keys(r.data.logs).length, m = Object.values(r.data.logs).reduce((x, L) => x + Object.keys(L.items || {}).length, 0), cur = load(KEY_DATA), nCur = cur && isObj(cur.logs) ? Object.keys(cur.logs).length : 0;
  pendingRestore = r;
  sheet("Yedeği yükle", "<h2>Yedeği yükle</h2><p>Yedekte <b>" + n + " gün</b> antrenman kaydı, başlangıç <b>" + esc(trDate(r.answers.start)) + "</b>, <b>" + m + "</b> hareket kaydı" + (r.saved ? " (alınma " + esc(trDate(r.saved)) + ")" : "") + "." + (r.regen ? " Yedekteki program okunamadı; cevaplardan yeniden kurulacak." : "") + "</p>" +
    "<p>Bu cihazdaki " + (nCur ? "<b>" + nCur + " günlük</b> kaydın" : "mevcut verinin") + " yerine geçecek. Yükledikten sonra Profil › Yedek ve kayıtlar'dan bir kez geri alabilirsin. Yüklensin mi?</p>" +
    '<div style="display:grid;gap:8px;margin-top:12px"><button class="btn" data-pub="restorego">Yüklensin</button><button class="btn ghost" data-act="close">Vazgeç</button></div>');
}
// Onaylandı: mevcut durum önce _prev anahtarına alınır; yazma yarım kalırsa eskisi geri yazılır ve sayfa yenilenmez
function restoreGo() {
  const p = pendingRestore; pendingRestore = null; if (!p) return;
  const prev = { answers: load(KEY_ANS), plan: load(KEY_PLAN), data: load(KEY_DATA), at: iso(new Date()) }, FAIL = "Kaydedemedim; depolama dolu olabilir. Hiçbir şey değişmedi.";
  if (!save(KEY_PREV, prev)) { toast(FAIL); return; }
  if (!(save(KEY_ANS, p.answers) && save(KEY_PLAN, p.plan) && save(KEY_DATA, p.data))) {
    const w = (k, v) => { try { v == null ? localStorage.removeItem(k) : save(k, v); } catch (e) {} };
    w(KEY_ANS, prev.answers); w(KEY_PLAN, prev.plan); w(KEY_DATA, prev.data); w(KEY_PREV, null); toast(FAIL); return;
  }
  try { sessionStorage.setItem("tk_restored", "1"); sessionStorage.removeItem("tatami_view"); } catch (e) {}
  location.reload();
}
function restoreUndo() {
  const p = load(KEY_PREV); if (!p) { toast("Geri alınacak yükleme yok."); return; }
  const w = (k, v) => { if (v == null) { try { localStorage.removeItem(k); } catch (e) {} return true; } return save(k, v); };
  if (!(w(KEY_ANS, p.answers) && w(KEY_PLAN, p.plan) && w(KEY_DATA, p.data))) { toast("Geri alamadım; depolama dolu olabilir."); return; }
  try { localStorage.removeItem(KEY_PREV); sessionStorage.removeItem("tatami_view"); } catch (e) {}
  location.reload();
}
function restore(file) { if (file.size > BK_MAX * 2) { toast("Yedek çok büyük (6 MB üstü); yüklenmedi."); return; } const r = new FileReader(); r.onload = () => restoreText(r.result); r.readAsText(file); }
document.addEventListener("click", (ev) => {
  const t = ev.target.closest("[data-pub]"); if (!t) return;
  const a = t.dataset.pub;
  if (a === "edit") { start(load(KEY_ANS), "edit"); return; }
  if (a === "q2") { start(load(KEY_ANS), "q2"); return; } // Sorular yenilendi: yalnız cevaplanmamış alanı olan adımlar
  if (a === "q2later") { lsSet("tk_q2_later", iso(new Date())); rr(); return; }
  if (a === "hide") { try { sessionStorage.setItem(t.dataset.v, "1"); } catch (e) {} window.TK.render(); return; }
  if (a === "recal") { const r = recal(), ans = load(KEY_ANS); if (r && rebuild(r.A2, Math.max(0, curWeek(ans) + 1))) location.reload(); return; }
  if (a === "recalok") { const g = load(KEY_PLAN); g.calib = iso(new Date()); save(KEY_PLAN, g); window.TK.render(); return; }
  if (a === "cycle") return nextCycle();
  if (a === "swapto") { if (swapPerm(t.dataset.old, t.dataset.v)) location.reload(); return; }
  if (a === "eqcheck") { eqSel = null; eqSheet(); return; }
  if (a === "eqlater") { lsSet("tk_eq_later", iso(new Date())); eqSel = null; $("#sheetRoot").innerHTML = ""; rr(); return; }
  if (a === "eq") { // çip: yerinde değişir
    const i = eqSel.indexOf(t.dataset.v); if (i >= 0) eqSel.splice(i, 1); else eqSel.push(t.dataset.v);
    t.classList.toggle("on", i < 0); t.setAttribute("aria-pressed", i < 0);
    return;
  }
  if (a === "eqsave") { // dambıl ayrıntısı burada sorulmaz: hemen ardından "Sorular yenilendi" şeridi (q2) sorar
    const ans = load(KEY_ANS);
    const A2 = Object.assign({}, ans, { eq: eqSel.filter((k) => k !== "gym"), eqV: 2 });
    let g = null; try { g = rebuildNow(A2); } catch (e) { console.error(e); }
    if (g) location.reload(); else toast("Program kurulamadı; depolama dolu olabilir."); return;
  }
  if (a === "unavoid") {
    const ans = load(KEY_ANS), sw = Object.assign({}, ans.swap); delete sw[t.dataset.v];
    const A2 = Object.assign({}, ans, { avoid: (ans.avoid || []).filter((x) => x !== t.dataset.v), swap: sw });
    if (rebuildNow(A2)) location.reload(); else toast("Kaydedemedim; depolama dolu olabilir."); return;
  }
  if (a === "backup") return backup();
  if (a === "print") return printPlan();
  if (a === "privacy") return privacy();
  if (a === "paste") return sheet("Yedekten yükle", '<h2>Yedekten yükle</h2><p class="small muted">Sakladığın yedek metnini buraya yapıştır. Bu cihazdaki mevcut program ve kayıtların yerini alır.</p>' +
    '<textarea id="pasteIn" style="min-height:150px;font-size:var(--fs-s)" placeholder="{&quot;app&quot;:&quot;tatami-kampi&quot;…"></textarea><button class="btn" style="width:100%;margin-top:10px;height:46px" data-pub="pastego">Yükle</button>');
  if (a === "pastego") { const ta = $("#pasteIn"); if (ta && ta.value.trim()) restoreText(ta.value.trim()); return; }
  if (a === "restorego") return restoreGo();
  if (a === "restoreundo") return restoreUndo();
  if (a === "wipe") {
    if (!t.classList.contains("danger")) {
      // 1. dokunuş: 5 sn kırmızı onay (geri sayımlı), yanında "Önce yedek al"; süre dolunca ya da yedek alınınca eski haline döner
      const bk = document.createElement("button"); bk.className = "btn sm"; bk.dataset.pub = "backup"; bk.textContent = "Önce yedek al";
      let n = 5; const tick = () => { if (n > 0) { t.textContent = "Evet, hepsini sil · " + n--; return; } clearInterval(iv); t.classList.remove("danger"); t.textContent = "Tüm verileri sil"; bk.remove(); };
      bk.addEventListener("click", () => { n = 0; tick(); });
      t.classList.add("danger"); t.after(bk); const iv = setInterval(tick, 1000); tick(); return;
    }
    // Önce bildirim aboneliği sunucudan silinir (hatırlatma kaydı da onunla gider), sonra tk_* anahtarlarının hepsi (tema tercihi kalır)
    (async () => {
      try { if (APP.sub) await pushOff(); } catch (e) {}
      try { Object.keys(localStorage).filter((k) => k.startsWith("tk_") && k !== "tk_theme").forEach((k) => localStorage.removeItem(k)); } catch (e) {}
      try { sessionStorage.clear(); } catch (e) {}
      location.reload();
    })();
  }
});
document.addEventListener("change", (ev) => { if (ev.target.dataset && ev.target.dataset.pubFile && ev.target.files[0]) restore(ev.target.files[0]); });

// ---------------- test sonuçlarıyla yeniden ayarlama ----------------
const LV = ["", "Başlangıç", "Orta", "İleri"];
const nm = (x) => { const n = parseFloat(String(x == null ? "" : x).replace(",", ".")); return isNaN(n) ? null : n; };
const mins = (v) => { const s = String(v || ""); if (s.includes(":")) { const [m, x] = s.split(":"); return +m + (+x || 0) / 60; } return nm(s); };
function recal() {
  const ans = load(KEY_ANS), gen = load(KEY_PLAN), st = window.TK && window.TK.state; if (!ans || !gen || !st) return null;
  const since = gen.calib || gen.created || "0000", latest = {};
  Object.keys(st.tests).sort().forEach((d) => { if (d < since) return; const v = (st.tests[d] && st.tests[d].v) || {}; for (const k in v) if (v[k] !== "" && v[k] != null && !(window.TK.oddTest && window.TK.oddTest(k, v[k]))) latest[k] = v[k]; }); // mantık dışı test değeri (şınav 500 gibi) hesaba katılmaz
  const P0 = E.profile(ans), t2 = Object.assign({}, ans.tests);
  if (!P0.cautious) { if (nm(latest.sinav) != null) t2.pushup = nm(latest.sinav); if (nm(latest.barfiks) != null) t2.pullup = nm(latest.barfiks); if (nm(latest.plank_t) != null) t2.plank = nm(latest.plank_t); }
  const km = mins(latest.km_sure); if (km) t2.run = km < 10 ? 3 : km < 13 ? 2 : km < 17 ? 1 : 0;
  const w6 = nm(latest.yuruyus6); if (w6) t2.run = w6 >= 600 ? 2 : w6 >= 450 ? 1 : 0;
  const A2 = Object.assign({}, ans, { tests: t2 });
  // Kalibrasyondan beri en az 3 hafta geçtiyse son dönemin gerçek sıklığı kullanılır
  const wk = (Date.now() - new Date(since + "T00:00:00")) / 6048e5;
  if (wk >= 3) {
    const n = Object.keys(st.logs).filter((d) => d >= since && Object.values(st.logs[d].items || {}).some((I) => (I.sets || []).some((x) => x && x.ok))).length, rate = n / wk;
    A2.freq = rate >= 4.5 ? "5+" : rate >= 2.5 ? "3-4" : rate >= 0.8 ? "1-2" : "0";
  }
  const hasNew = ["sinav", "barfiks", "plank_t", "km_sure", "yuruyus6"].some((k) => latest[k] != null);
  if (!hasNew) return null;
  const P2 = E.profile(A2), ch = [];
  if (P2.L !== P0.L) ch.push("Genel seviye: " + LV[P0.L] + " → " + LV[P2.L]);
  if (P2.pushLvl !== P0.pushLvl) ch.push("Şınav: " + (P2.pushLvl > P0.pushLvl ? "daha zor varyasyonlar" : "daha kolay varyasyonlar"));
  if (t2.pushup != null && t2.pushup !== ans.tests.pushup && t2.pushup >= 6) ch.push("Şınav tekrarları yeni maksimumuna (" + t2.pushup + ") göre");
  if (P2.pullLvl !== P0.pullLvl) ch.push("Çekişler: " + (P2.pullLvl > P0.pullLvl ? "daha zor" : "daha kolay"));
  if (P2.condL !== P0.condL) ch.push("Kondisyon: " + (P2.condL > P0.condL ? "daha uzun ve yoğun" : "daha hafif"));
  if (A2.freq !== ans.freq) ch.push("Son haftalardaki düzenin (" + ({ "0": "ara", "1-2": "haftada 1-2 gün", "3-4": "haftada 3-4 gün", "5+": "haftada 5+ gün" }[A2.freq]) + ") hesaba katıldı");
  return { A2, ch };
}
// Yeni döngünün başlangıcı: 12. hafta bitmeden (son test haftası) 13. haftanın Pazartesi'si, sonrasında gelecek Pazartesi
function cycleStart(ans) { return curWeek(ans) > 12 || !window.TK ? nextMonday() : iso(window.TK.dateOf(13, "pzt")); }
// 12. haftanın testleri girildi mi (girilmeden döngü başlatılmaz)
function week12Tested() {
  const st = window.TK && window.TK.state; if (!st) return false;
  return Object.keys(st.tests).some((d) => window.TK.weekOfDate(window.TK.parseISO(d)) === 12 && Object.values((st.tests[d] || {}).v || {}).some((x) => x !== "" && x != null));
}
function nextCycle() {
  const r = recal(), ans = load(KEY_ANS), base = r ? r.A2 : ans, cyc = (base.cycle || 1) + 1;
  const A2 = Object.assign({}, base, { start: cycleStart(ans), cycle: cyc, yil: base.yil === "yok" ? "az" : base.yil === "az" && cyc >= 4 ? "orta" : base.yil });
  const gen = E.generate(A2); gen.calib = iso(new Date());
  const data = load(KEY_DATA) || { settings: {}, logs: {}, tests: {}, weights: {} };
  data.settings = Object.assign({}, data.settings, { start: A2.start, pauses: [] });
  if (!save(KEY_DATA, data)) return toast("Kaydedemedim; depolama dolu olabilir."); // önce takip ayarı (başlangıç tek kaynak), sonra cevap ve plan; biri yazılamazsa yarım bırakılmaz
  if (!save(KEY_ANS, A2) || !save(KEY_PLAN, gen)) { const old = load(KEY_DATA); if (old) { old.settings.start = ans.start; save(KEY_DATA, old); } return toast("Kaydedemedim; depolama dolu olabilir."); }
  location.reload();
}
// Bilgi şeridi (bilgi/tasarim.md › Bileşenler): tek satır metin + tek eylem + kapat. Metne dokununca kartın tam metni alt sayfada açılır (bilgi kaybı yok).
const STRIP = {};
let stripsAll = false;
function strip(o) {
  STRIP[o.id] = o;
  return '<div class="strip' + (o.warn ? " warn" : "") + '"' + (o.warn ? ' role="alert"' : "") + '><button class="strip-t" data-pub="strip" data-v="' + o.id + '">' + o.t + "</button>" + (o.act || "") + (o.x ? '<button class="x" ' + o.x + ' aria-label="Kapat">×</button>' : "") + "</div>"; // warn: sol kenarda ince kırmızı çizgi
}
function hidden(k) { try { return sessionStorage.getItem(k) === "1"; } catch (e) { return false; } }
// ---------------- telefona kurulum, yeni sürüm, yenilikler ve güncelleme bildirimi ----------------
const NEWS = window.TK_NEWS || [];
const APP = { prompt: null, reg: null, sub: false, fresh: false };
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const standalone = () => window.TK_NATIVE || matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
// Android uygulaması (APK, GitHub Releases): sürüm = derlemedeki TK_REL; internet varsa son sürüme bakılır, yeniyse "İndir" kartı
const APK_URL = window.TK_REPO ? "https://github.com/" + window.TK_REPO + "/releases/latest/download/tatami-kampi.apk" : "";
async function apkCheck() {
  if (!window.TK_NATIVE || !window.TK_REPO || !window.TK_REL || APP.apk || !navigator.onLine) return;
  try {
    const r = await fetch("https://api.github.com/repos/" + window.TK_REPO + "/releases/latest", { cache: "no-store" });
    const v = r.ok ? parseInt(String((await r.json()).tag_name).replace(/\D/g, ""), 10) : 0;
    if (v > +window.TK_REL) { APP.apk = v; rr(); }
  } catch (e) {}
}
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = () => /android/i.test(navigator.userAgent);
const canPush = () => !!(window.TK_PUSH_KEY && APP.reg && APP.reg.pushManager && "Notification" in window);
// Soru ekranındaysa sadece karşılama adımını yenile (yazılan cevaplar bozulmasın), değilse takip ekranını
const rr = () => {
  if (document.body.classList.contains("wz-mode")) { if (A && VIS[step] === "hosgeldin") render(true); }
  else if (window.PLAN && window.TK && window.TK.softRender) window.TK.softRender();
};
const HOW_IOS = "Safari'de alttaki <b>Paylaş</b> düğmesine (kare ve yukarı ok) dokun, listeden <b>Ana Ekrana Ekle</b>'yi seç.";
const IOS_SEP = "iPhone'da ana ekrandaki uygulama, Safari'de girilen bilgileri görmez.";
const IOS_7 = "Safari, 7 gün açmadığın sitenin verilerini silebilir; ana ekrandaki uygulamada bu olmaz.";
// Karşılama ekranı: sorulardan önce kur (iPhone'da sonradan kurulursa cevaplar uygulamaya geçmez)
function wzInstall() {
  if (inArt() || standalone() || !(APP.prompt || isIOS() || isAndroid())) return "";
  return '<div class="wz-note"><b>Önce telefonuna kur.</b> Ana ekrandan uygulama gibi açılır, internetsiz çalışır' + (window.TK_PUSH_KEY ? ", güncellemeleri bildirir" : "") + ". " +
    (APP.prompt ? '<div style="margin-top:8px"><button type="button" class="btn sm" data-pub="install">Yükle</button></div>'
      : isIOS() ? HOW_IOS + " Sonra uygulamayı ana ekrandan aç, sorulara orada başla. " + IOS_7 + " " + IOS_SEP : HOW_AND + " Sonra uygulamayı ana ekrandan aç.") + "</div>";
}
const HOW_AND = window.TK_REPO ? '<a href="https://github.com/' + window.TK_REPO + '/releases/latest/download/tatami-kampi.apk">Android uygulamasını indir</a>, inen dosyayı açıp kur (bir kereliğine "bilinmeyen kaynaklara izin ver" ister). İnternetsiz çalışır.'
  : "Tarayıcı menüsünden (⋮) <b>Uygulamayı yükle</b> ya da <b>Ana ekrana ekle</b>'yi seç.";
const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const siteLink = () => '<a href="' + esc(window.TK_SITE) + '" target="_blank" rel="noopener">' + esc(window.TK_SITE.replace(/^https?:\/\//, "").replace(/\/$/, "")) + "</a>";
function appStrips() {
  const out = [], n = NEWS[0];
  if (APP.apk) out.push(strip({ id: "apk", h: "Yeni sürüm var", t: "<b>Yeni sürüm var</b> · kayıtların yerinde kalır",
    body: "<p>İndir'e dokun, inen dosyayı aç ve <b>Güncelle</b> de. Kayıtların yerinde kalır.</p>", act: '<a class="btn sm" style="text-decoration:none" href="' + esc(APK_URL) + '">İndir</a>' }));
  if (APP.fresh) out.push(strip({ id: "fresh", h: "Yeni sürüm hazır", t: "<b>Yeni sürüm hazır</b> · kayıtların yerinde kalır", body: "<p>Uygulamanın yeni sürümü indirildi. Kayıtların yerinde kalır.</p>", act: '<button class="btn sm" data-pub="reload">Yenile</button>' }));
  if (inArt()) {
    if (window.TK_SITE && lsGet("tk_site_no") !== "1") out.push(strip({ id: "site", h: "Telefonuna kur", t: "<b>Telefonuna kur</b> · internetsiz çalışır",
      body: "<p>Uygulama sürümü ana ekrandan açılır, internetsiz çalışır ve güncellemeleri bildirir: " + siteLink() + '</p><p class="small muted">Kayıtlarını taşımak için burada Profil › Yedek ve kayıtlar › Yedek al ile metni kopyala, uygulamada “Yedek metnini yapıştır”a dokun.</p>',
      act: '<button class="btn sm" data-pub="strip" data-v="site">Nasıl?</button>', sAct: "", x: 'data-pub="keep" data-v="tk_site_no"' }));
  } else if (!standalone() && lsGet("tk_inst_no") !== "1" && (APP.prompt || isIOS() || isAndroid()))
    out.push(strip({ id: "inst", h: "Telefonuna kur", t: "<b>Telefonuna kur</b> · internetsiz çalışır",
      body: "<p>Ana ekrandan uygulama gibi açılır, internetsiz çalışır" + (window.TK_PUSH_KEY ? " ve güncellemeleri bildirir" : "") + ". " + (APP.prompt ? "" : isIOS() ? HOW_IOS : HOW_AND) + "</p>" +
        (isIOS() ? '<p class="small muted">' + IOS_7 + " " + IOS_SEP + " Kurmadan önce Profil › Yedek ve kayıtlar › <b>Yedek al</b>, sonra uygulamada “Yedek dosyası seç” ile kaydını taşı.</p>" : ""),
      act: APP.prompt ? '<button class="btn sm" data-pub="install">Yükle</button>' : '<button class="btn sm" data-pub="strip" data-v="inst">Nasıl?</button>', sAct: APP.prompt ? undefined : "", x: 'data-pub="keep" data-v="tk_inst_no"' }));
  else if (canPush() && !APP.sub && Notification.permission === "default" && lsGet("tk_push_no") !== "1")
    out.push(strip({ id: "push", h: "Güncellemelerden haberin olsun", t: "<b>Güncelleme bildirimi</b> · yalnız anonim adres saklanır",
      body: "<p>Yeni özellik ya da düzeltme gelince telefonuna bildirim gelir; başka bildirim gönderilmez. Sadece anonim bir bildirim adresi saklanır, antrenman verilerin telefonunda kalır.</p>",
      act: '<button class="btn sm" data-pub="push">Aç</button>', x: 'data-pub="keep" data-v="tk_push_no"' }));
  if (n && lsGet("tk_news") !== n.v) out.push(strip({ id: "news", h: "Yenilikler", t: "<b>Yenilikler</b> · " + n.m.length + " değişiklik", body: "<ul>" + n.m.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>",
    act: '<button class="btn sm" data-pub="strip" data-v="news">Oku</button>', sAct: '<button class="btn" data-pub="newsok">Tamam</button>', x: 'data-pub="newsok"' }));
  return out;
}
// ---- antrenman günü hatırlatması (gönderen: netlify/functions/hatirlat.mjs, saat başı) ----
// Yerelde yalnız açık/kapalı (tk_remind) ve sunucuya son gönderilen kayıt (tk_remind_sent) durur. Saat = ayarlardaki calTime (Program › Takvime aktar ile ortak), günler programdan.
const DAYN = { paz: 0, pzt: 1, sal: 2, car: 3, per: 4, cum: 5, cmt: 6 }, HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 05:00–22:00
const remindOn = () => lsGet("tk_remind") === "1";
const calHour = () => parseInt((((load(KEY_DATA) || {}).settings || {}).calTime) || "07:00", 10) || 0;
const dayNames = () => { const ds = (load(KEY_ANS) || {}).days || []; return DAYS.filter((d) => ds.includes(d.k)).map((d) => d.s).join(", "); };
// Sunucuya giden hatırlatma kaydı: saat, günler (0-6, Pazar=0), saat dilimi, bu haftadan itibaren ara haftaları; kapalıysa null
function remindPayload() {
  const ans = load(KEY_ANS); if (!remindOn() || !ans) return null;
  const st = (load(KEY_DATA) || {}).settings || {}, mon = iso(monOf(iso(new Date())));
  let tz = "UTC"; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) {}
  return { hour: calHour(), days: [...new Set((ans.days || []).map((k) => DAYN[k]).filter((n) => n != null))].sort(), tz, pauses: (st.pauses || []).filter((p) => p >= mon).sort().slice(0, 20) };
}
// Abone kaydı (adres + hatırlatma) sunucuya yazılır; başarılıysa gönderilen hatırlatma yerelde tutulur, aynı kayıt bir daha gönderilmez
async function pushRegister(sub) {
  const remind = remindPayload();
  const res = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sub, remind }) });
  if (!res.ok) throw new Error(res.status);
  lsSet("tk_remind_sent", JSON.stringify(remind));
}
// Saat, günler ya da ara haftası değiştiyse (ya da çevrimdışıyken gönderilemediyse) kaydı yeniden gönder: açılışta, bağlantı gelince ve her değişiklikte
async function remindSync() {
  if (!APP.sub || (lsGet("tk_remind_sent") || "null") === JSON.stringify(remindPayload())) return;
  try { const s = await APP.reg.pushManager.getSubscription(); if (s) await pushRegister(s); } catch (e) {}
}
// Hatırlatma: durum satırı (Açık · günler · saat / Kapalı) + Aç/Kapat, altında saat satırı
function remindHTML() {
  if (!canPush()) return "";
  if (Notification.permission === "denied") return '<div class="srow"><span>Antrenman hatırlatması<small>Bildirim izni kapalı. Telefon ayarlarında bu uygulamanın bildirimlerini aç, sonra buraya dön.</small></span></div>';
  const on = remindOn() && APP.sub, hr = calHour(), hs = HOURS.includes(hr) ? HOURS : HOURS.concat(hr).sort((a, b) => a - b);
  const pending = on && lsGet("tk_remind_sent") !== JSON.stringify(remindPayload());
  return '<div class="srow"><span>Antrenman hatırlatması<small>' + (on ? "Açık · " + esc(dayNames()) + " · " + pad(hr) + ":00" + (pending ? " · internet gelince sunucuya iletilir" : "") : "Kapalı · " + esc(dayNames()) + " · " + pad(hr) + ":00") + "</small></span>" +
    '<button class="btn ghost sm" data-pub="' + (on ? "remindoff" : "remind") + '">' + (on ? "Kapat" : "Aç") + "</button></div>" +
    '<label class="srow"><span>Hatırlatma saati<small>Günler programından; Takvime aktar\'daki saatle ortak</small></span><select class="inp" id="remhour" aria-label="Hatırlatma saati" style="width:110px">' + hs.map((x) => '<option value="' + x + '"' + (x === hr ? " selected" : "") + ">" + pad(x) + ":00</option>").join("") + "</select></label>" +
    '<p class="snote">Hatırlatma açıkken sunucuda yalnız saat, antrenman günlerin ve saat dilimin tutulur; kapatınca silinir. Kayıtların ve cevapların telefonunda kalır.</p>';
}
function appSettings() {
  if (inArt()) return window.TK_SITE ? '<section class="slist"><div class="srow"><span>Telefona kurulan sürüm<small>' + siteLink() + "</small></span></div></section>" : "";
  let h = window.TK_NATIVE && window.TK_REL ? '<div class="srow"><span>Sürüm<small>' + esc(window.TK_REL) + (APP.apk ? " · yeni sürüm hazır" : "") + "</small></span></div>" : "";
  if (!standalone()) h += srowAct("Telefonuna kur", 'data-pub="installhow"', "Ana ekrandan açılır, internetsiz çalışır");
  if (canPush()) h += Notification.permission === "denied" ? '<div class="srow"><span>Güncelleme bildirimleri<small>Telefon ayarlarından kapalı</small></span></div>'
    : '<div class="srow"><span>Güncelleme bildirimleri<small>' + (APP.sub ? "Açık · yalnız anonim bildirim adresi saklanır" : "Kapalı") + '</small></span><button class="btn ghost sm" data-pub="' + (APP.sub ? "pushoff" : "push") + '">' + (APP.sub ? "Kapat" : "Aç") + "</button></div>";
  h += remindHTML();
  return h ? '<section class="slist">' + h + "</section>" : "";
}
// forRemind: hatırlatma açılırken izin ve abonelik de bu akıştan geçer; olmazsa hatırlatma kapalı kalır
async function pushOn(forRemind) {
  try {
    if ((await Notification.requestPermission()) !== "granted") { if (forRemind) lsSet("tk_remind", "0"); toast("İzin verilmedi. İstersen telefon ayarlarından açabilirsin."); return rr(); }
    const pm = APP.reg.pushManager;
    const sub = (await pm.getSubscription()) || (await pm.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(window.TK_PUSH_KEY) }));
    await pushRegister(sub);
    APP.sub = true; toast(forRemind ? "Hatırlatma açık: " + dayNames() + " · " + pad(calHour()) + ":00." : "Bildirimler açık. Güncelleme gelince haber vereceğim.");
  } catch (e) { if (forRemind) lsSet("tk_remind", "0"); toast("Bildirim açılamadı. İnternet bağlantını kontrol edip tekrar dene."); }
  rr();
}
// Güncelleme bildirimi kapanınca abonelik silinir; hatırlatma da onunla gider (aynı kayıt)
async function pushOff() {
  const had = remindOn();
  try {
    const s = await APP.reg.pushManager.getSubscription();
    if (s) { await s.unsubscribe(); fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ unsub: s.endpoint }) }).catch(() => {}); }
  } catch (e) {}
  APP.sub = false; lsSet("tk_remind", "0"); lsSet("tk_remind_sent", "null"); toast(had ? "Güncelleme bildirimleri ve antrenman hatırlatması kapatıldı." : "Güncelleme bildirimleri kapatıldı."); rr();
}
async function remindSet(on) {
  lsSet("tk_remind", on ? "1" : "0");
  if (on && !APP.sub) return pushOn(true);
  const msg = on ? "Hatırlatma açık: " + dayNames() + " · " + pad(calHour()) + ":00." : "Hatırlatma kapatıldı.";
  try { const s = await APP.reg.pushManager.getSubscription(); if (!s) throw new Error("abonelik yok"); await pushRegister(s); toast(msg); }
  catch (e) { toast(msg + " İnternet gelince sunucuya iletilir."); } // çevrimdışı: yerel ayar kaldı, remindSync bağlantı gelince gönderir
  rr();
}
document.addEventListener("change", (ev) => {
  if (ev.target.id !== "remhour" || !window.TK) return;
  window.TK.state.settings.calTime = pad(+ev.target.value) + ":00"; window.TK.Store.put("settings", "main"); remindSync(); rr();
});
document.addEventListener("input", (ev) => { if (ev.target.id === "caltime") setTimeout(remindSync, 0); }); // Takvime aktar'daki saat (tracker.html kaydeder) hatırlatmayı da günceller
window.TK_PAUSES_CHANGED = remindSync;
window.addEventListener("online", remindSync);
document.addEventListener("click", (ev) => {
  const t = ev.target.closest("[data-pub]"); if (!t) return;
  const a = t.dataset.pub;
  if (a === "reload") location.reload();
  else if (a === "newsok") { lsSet("tk_news", NEWS[0].v); rr(); }
  else if (a === "strip") { const o = STRIP[t.dataset.v], b = o && (o.sAct !== undefined ? o.sAct : o.act); if (o) sheet(o.h, '<div class="strip-sheet"><h2>' + esc(o.h) + "</h2>" + o.body + (b ? '<div style="display:flex;gap:8px;margin-top:16px">' + b + "</div>" : "") + "</div>"); }
  else if (a === "strips") { stripsAll = true; rr(); }
  else if (a === "keep") { lsSet(t.dataset.v, "1"); rr(); }
  else if (a === "push") pushOn();
  else if (a === "pushoff") pushOff();
  else if (a === "remind") remindSet(true);
  else if (a === "remindoff") remindSet(false);
  else if (a === "install" || (a === "installhow" && APP.prompt)) { const p = APP.prompt; APP.prompt = null; p.prompt(); p.userChoice.finally(rr); }
  else if (a === "installhow") sheet("Telefonuna kur", "<h2>Telefonuna kur</h2><p><b>iPhone:</b> " + HOW_IOS + " " + IOS_7 + "</p><p><b>Android:</b> " + HOW_AND + '</p><p class="small muted">Kurduktan sonra uygulamayı ana ekrandaki simgeden aç. Android\'de kayıtların uygulamada da görünür. ' + IOS_SEP + " Önce Yedek al, uygulamada “Yedek dosyası seç” ile yükle.</p>");
});
// Şerit alt sayfasındaki bir eyleme dokununca alt sayfa kapanır (eylem yeni alt sayfa açarsa o kalır)
document.addEventListener("click", (ev) => { if (ev.target.closest(".strip-sheet [data-pub]")) $("#sheetRoot").innerHTML = ""; }, true);
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); if (window.TK_REPO && isAndroid()) return; APP.prompt = e; rr(); }); // Android'de APK önerilir
window.addEventListener("appinstalled", () => { APP.prompt = null; lsSet("tk_inst_no", "1"); rr(); });
if (window.TK_NATIVE) { // dosyalar APK'nın içinde: service worker gerekmez; güncelleme apkCheck ile
  apkCheck(); window.addEventListener("online", apkCheck);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) apkCheck(); });
} else if (!inArt() && "serviceWorker" in navigator && window.isSecureContext) {
  const hadCtl = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadCtl) return; // ilk kurulum, yeni sürüm değil
    const pl = $("#player");
    // Uygulama yeni açıldıysa ve antrenman ekranı kapalıysa sessizce yeni sürüme geç; yoksa sor
    if (performance.now() < 10000 && (!pl || pl.hidden)) location.reload();
    else { APP.fresh = true; rr(); }
  });
  navigator.serviceWorker.register("sw.js").then((reg) => {
    APP.reg = reg;
    if (reg.pushManager) reg.pushManager.getSubscription().then((s) => { APP.sub = !!s; rr(); if (s) remindSync(); }).catch(() => {});
    // Telefonda uygulama günlerce arka planda açık kalabilir: öne gelince yeni sürüm var mı bak
    document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
}

// Bugün ekranı: şeritler önem sırasıyla (test > yedek > yeni sürüm > kurulum/bildirim > yenilikler); birden çoksa yalnız ilki, gerisi "N bildirim daha" ile açılır
window.TK_DAY_BANNER = () => {
  const ans = load(KEY_ANS); if (!ans) return "";
  const w = curWeek(ans), st = window.TK && window.TK.state, S = [];
  if (BOOT_ERR && !hidden("tk_boot_no")) S.push(strip({ id: "boot", warn: true, h: "Program güncellenemedi", t: "<b>Program güncellenemedi</b> · eski planla devam", body: "<p>Motor güncellemesi cevaplarından yeni plan kuramadı; önceki planınla devam ediyorsun, kayıtların yerinde. Program › Cevapları düzenle › Programı güncelle ile tekrar deneyebilirsin.</p>", x: 'data-pub="hide" data-v="tk_boot_no"' }));
  if (w >= 12 && !hidden("tk_cycle_no")) {
    // 12. hafta son test haftası: testler girilmeden "Başlat" yok (Pazartesi tek dokunuşla test haftası atlanmasın)
    const ok = w > 12 || week12Tested(), hd = w > 12 ? "Program tamamlandı" : ok ? "Program bitiyor" : "Son hafta";
    S.push(strip({ id: "cycle", h: hd, t: "<b>" + hd + "</b> · " + (ok ? "yeni döngü " + esc(window.TK.fmtDate(window.TK.parseISO(cycleStart(ans)))) : "önce bu haftanın testlerini gir"),
      body: "<p>13 haftalık döngünün sonuna geldin. " + (ok ? "Yeni döngü " + esc(trDate(cycleStart(ans), true)) + " son test sonuçlarınla, alışma haftası olmadan ve yardımcı hareketleri değiştirerek başlar." : "Bu hafta son testler var; sonuçları girince yeni döngüyü buradan başlatırsın. Yeni döngü sonuçlarına göre kurulur.") + " Kayıtların ve grafiklerin kalır.</p>",
      act: ok ? '<button class="btn sm" data-pub="cycle">Başlat</button>' : "", x: 'data-pub="hide" data-v="tk_cycle_no"' }));
  } else if (!hidden("tk_recal_no")) {
    const r = recal();
    if (r && r.ch.length) S.push(strip({ id: "recal", h: "Test sonuçların geldi", t: "<b>Test sonuçların geldi</b> · programı güncelle",
      body: "<p>Programını sonuçlarına göre güncelleyebilirim. Hafta " + Math.min(12, w + 1) + "'den itibaren geçerli; geçmiş kayıtların değişmez:</p><ul>" + r.ch.map((c) => "<li>" + esc(c) + "</li>").join("") + "</ul>",
      act: '<button class="btn sm" data-pub="recal">Güncelle</button>', x: 'data-pub="hide" data-v="tk_recal_no"' }));
    else if (r) S.push(strip({ id: "recalok", h: "Test sonuçların geldi", t: "<b>Test sonuçların geldi</b> · değişiklik gerekmiyor", body: "<p>Sonuçların şu anki programınla uyumlu; bir değişiklik gerekmiyor. Böyle devam.</p>", act: '<button class="btn sm" data-pub="recalok">Tamam</button>' }));
  }
  // Eski alet cevabı (salon / "gym" / bant / bar): yeni kalemlerle bir kez doğrulat; "Sonra" dense ertesi gün yine gelir. Bitince (ya da gerekmiyorsa) yeni sorular şeridi.
  if (E.eqLegacy(ans)) { if (lsGet("tk_eq_later") !== iso(new Date())) S.push(strip({ id: "eq", h: "Aletlerini doğrula", t: "<b>Aletlerini doğrula</b> · program yalnız sende olanlarla kurulsun",
    body: "<p>Alet soruları yenilendi: salon makineleri, bandı bağlayacak yer ve landmine artık ayrı soruluyor; hiçbir alet var sayılmıyor. Sende gerçekten olanları işaretle; program hemen yalnız onlarla kurulur, yaptığın günler ve kayıtların kalır.</p>",
    act: '<button class="btn sm" data-pub="eqcheck">Doğrula</button>', x: 'data-pub="eqlater"' })); }
  // Giriş soruları derinleşti (bilgi/sorular.md): eski cevapta boş kalan yeni alanlar için kısa sihirbaz; mevcut cevaplar korunur, program gelecek haftadan yenilenir
  else if (needQ2(ans) && lsGet("tk_q2_later") !== iso(new Date())) S.push(strip({ id: "q2", h: "Sorular yenilendi", t: "<b>Sorular yenilendi</b> · birkaç yeni soruyla programın daha sana göre olsun",
    body: "<p>Giriş soruları derinleşti: sağlık durumu, yaşadığın yer, aletlerinin ayrıntısı, günün saati, kısa günler, hedef tarih… Yalnız yeni soruların olduğu adımlar gelir; mevcut cevapların korunur. Program gelecek Pazartesi'den itibaren güncellenir, bu hafta ve kayıtların olduğu gibi kalır.</p>",
    act: '<button class="btn sm" data-pub="q2">Cevapla</button>', x: 'data-pub="q2later"' }));
  // Yedek hatırlatması: 4 haftada bir; iPhone Safari'de haftada bir (7 gün kuralı)
  const logs = st ? Object.keys(st.logs).length : 0, ios7 = isIOS() && !standalone(); let last = null; try { last = localStorage.getItem("tk_web_lastbackup"); } catch (e) {}
  if (logs >= 4 && (!last || (Date.now() - new Date(last + "T00:00:00")) / 864e5 > (ios7 ? 7 : 28)) && !hidden("tk_bk_no")) {
    const d = last ? esc(window.TK.fmtDate(window.TK.parseISO(last))) : "";
    S.push(strip({ id: "bk", h: "Yedek al", t: "<b>" + (last ? "Son yedek " + d : "Henüz yedek yok") + "</b> · veriler yalnız bu cihazda",
      body: "<p>Verilerin sadece bu cihazda. " + (last ? "Son yedeğin " + d + " tarihli." : "Henüz yedek almadın.") + " " + (ios7 && lsGet("tk_inst_no") === "1" ? IOS_7 : "Tarayıcı verisi silinirse kayıtların gider.") + "</p>",
      act: '<button class="btn sm" data-pub="backup">Yedek al</button>', x: 'data-pub="hide" data-v="tk_bk_no"' }));
  }
  S.push(...appStrips());
  return S.length > 1 && !stripsAll ? S[0] + '<button class="strips-more" data-pub="strips">' + (S.length - 1) + " bildirim daha</button>" : S.join("");
};
window.TK_PROFILE_EXTRA = () => { const ans = load(KEY_ANS) || {}; return ans.cycle > 1 ? '<p class="small muted" style="margin:6px 0 0">' + ans.cycle + ". döngü</p>" : ""; };
// "Aletlerini doğrula" alt sayfası: çipler mevcut (açılmış) listeyle işaretli; Kaydet → A.eq + eqV=2 + rebuildNow (yapılmış günler bozulmaz)
let eqSel = null;
function eqSheet() {
  const ans = load(KEY_ANS);
  if (!eqSel) eqSel = [...E.expandEq(ans)].filter((k) => k !== "none" && k !== "outdoor");
  sheet("Aletlerini doğrula", '<h2>Aletlerini doğrula</h2><p class="small muted" style="margin:6px 0 12px">Sende gerçekten olanlar işaretli kalsın; olmayanı kaldır. Program hemen yalnız bunlarla kurulur; yaptığın günler ve kayıtların kalır. Dambıl, bar ve bant ayrıntısını bir sonraki adımda soracağım.</p>' + eqChips(eqSel, "pub") +
    '<div style="display:grid;gap:8px;margin-top:8px"><button class="btn" data-pub="eqsave">Kaydet ve programı güncelle</button><button class="btn ghost" data-pub="eqlater">Sonra</button></div>');
}
// Alternatif hareket (tracker.html › altSheet): motorun ikame listesi, "sadece bugün" maddesi ve kalıcı değişiklik
const ALTM = {};
window.TK_ALTS = (id, pi) => { // pi: faz sırası (darbe sınırı faza göre); liste faz başına önbelleklenir
  const key = id + "/" + (pi || 0); if (ALTM[key]) return ALTM[key];
  const ans = load(KEY_ANS), ex = LIB.EX[id]; if (!ans || !ex) return [];
  return (ALTM[key] = okAlts(id, E.profile(ans), pi).slice(0, 3).map((e) => ({ id: e.id, why: e.pat.includes(ex.pat[0]) ? "aynı kalıp" : e.eq.some((a) => ex.eq.some((b) => a.join() === b.join())) ? "aynı alet" : "" })));
};
// Motorun kalıcı değişikliğe izin vermediği hareket (alet, kaçınma, sakatlık, darbe…) listeye hiç girmez: listedeki her seçenek hem "Sadece bugün" hem "Kalıcı" seçilebilir
const okAlts = (id, P, pi) => E.swapOptions(id, P, pi).filter((e) => !E.swapBlocked(e.id, P, pi));
window.TK_SWAP_ITEM = (it, id, pi) => E.swapItem(it, id, E.profile(load(KEY_ANS)), pi);
function swapPerm(old, nu) {
  const ans = load(KEY_ANS), A2 = Object.assign({}, ans, { avoid: [...new Set((ans.avoid || []).concat(old))], swap: Object.assign({}, ans.swap, { [old]: nu }) });
  const g = rebuildNow(A2); if (!g) toast("Kaydedemedim; depolama dolu olabilir.");
  return g;
}
// Antrenman sırasında sayfa yenilenmez: plan yerinde değiştirilir (tracker.html'deki P aynı nesne), çekirdek adımları yeniden kurar
window.TK_SWAP_PERM = (old, nu) => { const g = swapPerm(old, nu); if (!g) return false; Object.keys(ALTM).forEach((k) => delete ALTM[k]); Object.assign(window.PLAN, adapt(g, load(KEY_ANS))); return true; };
// Hareket değiştirme: aynı kalıptan, aletine ve sakatlığına uygun seçenekler
window.TK_SWAP = (id) => {
  const ans = load(KEY_ANS), P = E.profile(ans), ex = LIB.EX[id]; if (!ex) return;
  const alts = okAlts(id, P, { F2: 1, T: 1, F3: 2 }[phaseOf(Math.max(0, curWeek(ans))).key] || 0); // sıralama: bilgi/antrenman-bilimi.md › ikame; darbe sınırı bu haftanın fazına göre
  sheet("Hareketi değiştir", '<div class="eyebrow">Değiştir</div><h2>' + esc(ex.n) + ' yerine</h2><p class="small muted" style="margin:6px 0 10px">Seçtiğin hareket bugünden itibaren programda bunun yerine gelir. Yaptığın günler ve kayıtların değişmez; istersen Program ekranından geri alırsın.</p>' +
    (alts.length ? '<ul class="lib" style="border-top:1px solid var(--line)">' + alts.slice(0, 4).map((e) => '<li><button data-pub="swapto" data-v="' + e.id + '" data-old="' + id + '"><span><b>' + esc(e.n) + "</b><small>" + esc(e.en || "") + "</small></span></button></li>").join("") + "</ul>"
      : '<p>Aletlerine ve sakatlıklarına uygun başka bir seçenek bulamadım. Hareketi hafifletebilir ya da atlayabilirsin.</p>'));
};
function printPlan() {
  const P = window.PLAN, ex = (id) => (P.EX[id] || {}).n || id;
  const rxAll = (it) => (Array.isArray(it.p) ? [...new Set(it.p)].join(" → ") : it.p);
  const rest = (s) => (s ? " · " + Math.floor(s / 60) + ":" + pad(s % 60) : "");
  const days = P.DAYS.filter((d) => d.train);
  let h = "";
  P.PHASES.forEach((ph) => {
    const S = P.S[ph.key]; if (!S) return;
    h += '<section class="pp"><h1>' + esc(ph.name) + '</h1><p class="pp-g">' + esc(ph.goal) + (ph.rir ? " · " + esc(ph.rir.replace(/^RIR\s*[\d-]+\s*:\s*/, "")) : "") + ' · Haftalar: ' + ph.weeks.join(", ") + '</p><div class="pp-cols" style="grid-template-columns:repeat(' + days.length + ',1fr)">' +
      days.map((d) => { const s = S[d.k]; return '<div class="pp-col"><h2>' + d.n + "</h2><h3>" + esc(s.title) + " <small>" + esc(s.dur) + "</small></h3>" +
        s.blocks.map((b) => '<div class="pp-b">' + esc(b.name) + "</div>" + (b.warm ? '<div class="pp-w">' + b.items.map((it) => esc(ex(it.x)) + " " + esc(rxAll(it))).join(" · ") + "</div>"
          : (b.tests ? '<div class="pp-i"><b>Ölçümler:</b> ' + b.tests.map((t) => esc((P.TESTS.find((x) => x.id === t) || {}).n || t)).join(", ") + "</div>" : "") +
            b.items.map((it) => '<div class="pp-i"><b>' + esc(ex(it.x)) + "</b> " + esc(rxAll(it)) + esc(rest(it.r)) + "</div>").join(""))).join("") +
        (s.home && P.ROUTINES[s.home] ? '<div class="pp-w"><b>Akşam:</b> ' + esc(P.ROUTINES[s.home].name) + "</div>" : "") + "</div>"; }).join("") + "</div></section>";
  });
  h += '<section class="pp pp-port"><h1>Esneklik rutinleri</h1>' + Object.keys(P.ROUTINES).map((k) => { const R = P.ROUTINES[k]; return "<h2>" + esc(R.name) + " <small>" + esc(R.dur) + "</small></h2><p>" + R.items.map((it) => "<b>" + esc(ex(it.x)) + "</b> " + esc(it.p)).join(" · ") + "</p>"; }).join("") +
    "<h1>Kurallar</h1>" + P.RULES.map((r) => "<p><b>" + esc(r.h) + ":</b> " + esc(r.t) + "</p>").join("") + "</section>";
  let root = document.getElementById("printRoot");
  if (!root) { root = document.createElement("div"); root.id = "printRoot"; document.body.appendChild(root); }
  root.innerHTML = h;
  setTimeout(() => window.print(), 50);
}

// ---------------- stiller (sihirbaz + yazdırma) ----------------
const css = document.createElement("style");
css.textContent = `
body.wz-mode{padding-bottom:40px}
/* Sihirbaz bileşenleri (bilgi/tasarim.md › Sihirbaz): seçenek (.wz-opt) ve çip (.wz-chip) görünümü tracker.html'de (.opt/.chip ile ortak); burada yalnız yerleşim.
   Genel parçalar: .wz-field (soru + seçenekler + ipucu), .wz-seg (kısa seçenekler yan yana), .wz-two (2 sütun), .wz-col (açıklamalı seçenekler alt alta), .wz-chips (çok seçim), .wz-inp (sayı + birim), .inp[type=date], .wz-field.sub (koşullu alt soru), .ask (doğrulama sorusu satırı) */
.wz{max-width:620px;margin:0 auto;padding:6px 0 30px}
.wz-top{display:flex;justify-content:space-between;align-items:center;min-height:34px;color:var(--muted);font-size:var(--fs-s)}
.wz-bar{height:3px;background:var(--sunk);border-radius:2px;overflow:hidden;margin:4px 0 20px}.wz-bar i{display:block;height:100%;background:var(--accent);transition:width .3s}
.wz-h{font-size:var(--fs-xl);margin:0 0 8px}
.wz-lead{color:var(--muted);margin:0 0 20px;font-size:var(--fs-m)}
.wz-list{margin:0;padding-left:20px;display:grid;gap:6px}
.wz-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px 16px}
.wz-field{display:flex;flex-direction:column;gap:8px;margin:0 0 24px}
.wz-field>span{font-weight:600}
.wz-field small{color:var(--muted);font-size:var(--fs-s)}
.wz-field.sub{padding-left:12px;border-left:2px solid var(--line)}
.wz-inp{display:flex;align-items:center;border:1px solid var(--edge);border-radius:var(--r-s);background:transparent;height:48px;padding:0 12px}
.wz-inp input{flex:1;min-width:0;height:100%;border:0;background:transparent;font-size:var(--fs-l);font-variant-numeric:tabular-nums;outline:none}
.wz-inp em{font-style:normal;color:var(--muted);font-size:var(--fs-s)}
.wz-inp:focus-within{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
.wz-seg{display:flex;gap:8px;flex-wrap:wrap}.wz-seg .wz-opt{flex:1;min-width:64px;align-items:center;text-align:center}
.wz-col{display:grid;gap:8px}
.wz-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.wz-two .wz-opt{min-height:52px}
.wz-q{padding:12px 0;border-top:1px solid var(--line)}.wz-q p{margin:0 0 8px;font-size:var(--fs-m)}
.wz-chips{display:flex;flex-wrap:wrap;gap:8px}.wz-chips .wz-chip{max-width:100%;flex:0 1 auto;text-align:left} /* uzun çip metni (landmine) ekrandan taşmasın, satır kırsın */
.wz-chip i{font-style:normal;background:var(--on-cta);color:var(--cta);border-radius:50%;width:20px;height:20px;display:grid;place-items:center;font-size:var(--fs-s);font-weight:600}
.wz-days{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px} /* 7 × 44 + 6 × 8 ancak 388 px'ten geniş ekranda tek satıra sığar; dar ekranda 4 + 3 */
@media (min-width:388px){.wz-days{grid-template-columns:repeat(7,minmax(0,1fr))}}
.wz-day{height:52px;border:0;background:var(--sunk);border-radius:var(--r-s);font-family:var(--display);font-weight:600;font-size:var(--fs-m);color:var(--ink)}
.wz-day.on{background:var(--cta);color:var(--on-cta)}
.wz-eqg{margin:0 0 12px}.wz-eqg em{display:block;font-style:normal;font-size:var(--fs-s);color:var(--muted);margin:0 0 8px}
.wz-note{color:var(--muted);font-size:var(--fs-s);margin:0 0 16px}
.wz-warn{background:var(--sunk);border-radius:var(--r);box-shadow:inset 3px 0 0 var(--bad);padding:12px 12px 12px 16px;font-size:var(--fs-s);margin:12px 0}
.wz-check{display:flex;gap:10px;align-items:center;min-height:44px;margin-top:10px;font-weight:600}.wz-check input{width:22px;height:22px}
.wz-err{color:var(--bad);font-weight:600;min-height:22px;margin:6px 0}
.wz-nav{display:flex;justify-content:space-between;gap:10px;position:sticky;bottom:0;background:var(--bg);padding:10px 0 calc(10px + env(safe-area-inset-bottom,0px))}
.wz-nav .btn{height:52px;padding:0 22px;font-size:var(--fs-m)}.wz-nav .btn.acc{flex:1} /* tek ana düğme tam genişlik; Geri varsa solda, ana düğme kalan alanı doldurur */
.wz-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:8px 16px;margin:0 0 24px;border-top:1px solid var(--line);padding-top:12px}
.wz-sum div{min-width:0}.wz-sum em{display:block;font-style:normal;color:var(--muted);font-size:var(--fs-s)}.wz-sum b{font-family:var(--display);font-weight:600;font-size:var(--fs-l);line-height:1.15}
.wz-week{width:100%;border-collapse:collapse;font-size:var(--fs-s)}.wz-week td{padding:8px 4px;border-top:1px solid var(--line)}.wz-week td:first-child{font-family:var(--display);font-weight:600;width:48px;color:var(--muted)}.wz-week small{color:var(--muted);white-space:nowrap}
#printRoot{display:none}
@media print{
  @page{size:A4 landscape;margin:9mm}
  body{padding:0!important;background:#fff!important;color:#000!important}
  body>*:not(#printRoot){display:none!important}
  #printRoot{display:block}
  .pp{break-after:page;font:8pt/1.25 "Barlow",Arial,sans-serif}
  .pp h1{font:600 20pt "Barlow Semi Condensed","Arial Narrow",sans-serif;margin:0 0 2mm}
  .pp-g{margin:0 0 3mm;color:#555}
  .pp-cols{display:grid;gap:0;border-top:2px solid #000}
  .pp-col{padding:2mm;border-right:1px solid #ccc}.pp-col:last-child{border-right:0}
  .pp-col h2{font:600 12pt "Barlow Semi Condensed",sans-serif;margin:0}
  .pp-col h3{font:600 10pt "Barlow Semi Condensed",sans-serif;margin:1mm 0 2mm}.pp-col h3 small{font-weight:400;color:#666}
  .pp-b{font:600 7pt "Barlow Semi Condensed",sans-serif;color:#555;margin:1.6mm 0 .4mm;border-bottom:1px solid #ccc}
  .pp-i{margin:0 0 .7mm}.pp-w{color:#555;font-size:7pt}
  .pp-port h2{font:600 12pt "Barlow Semi Condensed",sans-serif;margin:3mm 0 1mm}.pp-port p{margin:0 0 1.5mm}
}`;
document.head.appendChild(css);

// ---------------- açılış ----------------
// Plan kurulumu tracker.html'in kuyruğundan çağrılır (TK_PLAN_INIT): hafta hesabı oradaki TK_WEEK'i kullanır
const ans = load(KEY_ANS);
let gen = load(KEY_PLAN), BOOT_ERR = false;
window.TK_PLAN_INIT = () => {
  if (ans && (!gen || gen.v !== E.VERSION)) {
    // Motor güncellendi: aynı cevaplardan gelecek haftadan itibaren yeniden üret (bu hafta ve geçmiş eski planla biter, kayıtlar korunur).
    // Kurulamazsa eski plan korunur ve Gün'de şerit çıkar (kullanıcı sihirbaza düşmez).
    try { gen = rebuild(ans, gen ? Math.max(0, curWeek(ans) + 1) : 0) || gen || E.generate(ans); }
    catch (e) { console.error(e); BOOT_ERR = true; if (!(gen && gen.S)) gen = null; }
  }
  // Tarayıcıdan verileri kendiliğinden silmemesini iste (özellikle iPhone Safari)
  try { if (ans && navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  if (ans && gen) window.PLAN = adapt(gen, ans);
};
if (!ans && NEWS[0] && !lsGet("tk_news")) lsSet("tk_news", NEWS[0].v); // yeni kullanıcıya eski yenilikler gösterilmez
window.TK_WIZARD = { start, adapt };
let started = false;
const firstRun = () => { if (!window.PLAN && !started) { started = true; start(ans, false); } };
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", firstRun);
else setTimeout(firstRun, 0);
// Yedek yüklemesinden sonra: 5 sn "Geri al"
setTimeout(() => { let r = false; try { r = sessionStorage.getItem("tk_restored") === "1"; sessionStorage.removeItem("tk_restored"); } catch (e) {} if (r && window.TK) window.TK.toast("Yedek yüklendi.", restoreUndo); }, 300);
})();

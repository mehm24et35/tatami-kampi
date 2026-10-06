// Hareket kütüphanesi. Her hareket: metin + motorun seçim yapmak için kullandığı etiketler.
// pat: kalıplar (virgülle), eq: gereken alet ("|" = veya, "+" = birlikte, "none" = aletsiz),
// lv: seviye aralığı (1 başlangıç, 2 orta, 3 ileri), st: eklem yükü (1 az, 2 orta, 3 yüksek),
// imp: darbe (0 yok … 3 yüksek), t: kayıt tipi (w kg+tekrar, r tekrar, s saniye, x işaret),
// pr: aynı kalıpta tercih önceliği, uni: tek taraflı ("/taraf"), inj: eklem sorunu olana özel not,
// len: kasın başlangıç boyu ("uzun" = uzamış pozisyon, "notr"); hareket değiştirmede aynı boydaki seçenek öne alınır.
(function (root) {
"use strict";

const CATS = {
  isinma: "Isınma & Eklem Sağlığı",
  alt: "Alt Vücut Kuvvet",
  patlayici: "Hız ve patlayıcı güç",
  ust: "Üst Vücut Kuvvet",
  amut: "Kalistenik & Amut",
  core: "Karın ve gövde",
  boks: "Boks & Yumruk Gücü",
  kavrama: "Kavrama & Bilek",
  kondisyon: "Kondisyon",
  esneklik: "Esneklik",
};

// Varsayım yok (2026-10-03): hareketin gerektirdiği her şey burada ayrı kalem. Eski "gym" kalemi
// (tek kalemde tüm makineler) motorda expandEq ile aşağıdaki beş salon kalemine açılır.
const EQUIPMENT = [
  { k: "pullbar", n: "Barfiks demiri", g: "Temel" },
  { k: "band", n: "Direnç bandı (halka tipi)", g: "Temel" },
  { k: "anchor", n: "Bandı bağlayacak sağlam yer (kapı ankrajı, direk)", g: "Temel" },
  { k: "rope", n: "Atlama ipi", g: "Temel" },
  { k: "stairs", n: "Merdiven (en az bir kat; evde ya da yakında)", g: "Temel" },
  { k: "db", n: "Dambıl", g: "Ağırlık" },
  { k: "kb", n: "Kettlebell (kulplu gülle)", g: "Ağırlık" },
  { k: "barbell", n: "Uzun bar ve plakalar (halter)", g: "Ağırlık" },
  { k: "rack", n: "Squat sehpası (rack)", g: "Ağırlık" },
  { k: "bench", n: "Düz sehpa (bench)", g: "Ağırlık" },
  { k: "landmine", n: "Bar ucu sabitleyici (landmine) ya da barın ucunu yaslayacağın sağlam köşe: bir ucu yerde sabit barla itiş ve dönüş", g: "Ağırlık" },
  { k: "cable", n: "Makaralı kablo istasyonu (cable)", g: "Salon" },
  { k: "latmach", n: "Sırt çekiş makinesi (lat pulldown)", g: "Salon" },
  { k: "lpmach", n: "Bacak itme makinesi (leg press)", g: "Salon" },
  { k: "legmach", n: "Bacak bükme / açma makinesi (leg curl / extension)", g: "Salon" },
  { k: "pressmach", n: "Göğüs / omuz itme makinesi (press)", g: "Salon" },
  { k: "cardio", n: "Koşu bandı, kondisyon bisikleti veya kürek makinesi", g: "Salon" },
  { k: "rings", n: "Askı kayışı ya da jimnastik halkası (TRX), asacak yeriyle", g: "Kalistenik" },
  { k: "dip", n: "Paralel bar (dips)", g: "Kalistenik" },
  { k: "box", n: "Kutu (plyo kutusu) ya da sağlam basamak", g: "Kalistenik" },
  { k: "bag", n: "Boks torbası", g: "Dövüş" },
  { k: "medball", n: "Sağlık topu", g: "Dövüş" },
  { k: "ladder", n: "Koordinasyon merdiveni", g: "Dövüş" },
];

const JOINTS = { wrist: "Bilek", elbow: "Dirsek", shoulder: "Omuz", neck: "Boyun", back: "Bel / sırt", hip: "Kalça / arka bacak", knee: "Diz", ankle: "Ayak bileği" };

const EX = {};
function x(id, o) {
  const st = {};
  (o.st || "").split(",").filter(Boolean).forEach((p) => { const [j, v] = p.split(":"); st[j] = +v; });
  const [lo, hi] = (o.lv || "1-3").split("-").map(Number);
  EX[id] = Object.assign({ id, pat: [], eq: [["none"]], lv: [lo, hi || lo], st, imp: 0, t: "x", pr: 5, i: [], h: [], inj: {} }, o, {
    pat: (o.pat || "").split(",").filter(Boolean),
    eq: (o.eq || "none").split("|").map((alt) => alt.split("+")),
    lv: [lo, hi || lo], st,
  });
}

// ================= ISINMA & EKLEM SAĞLIĞI =================
x("jj", { n: "Açma Kapama Sıçrama", en: "Jumping jacks", c: "isinma", pat: "warm_cardio,cond", lv: "1-2", imp: 1, st: "ankle:1",
  d: "Aletsiz ısınma ve hafif kondisyon hareketi.", s: ["Ayaklar bitişik, kollar yanda.", "Sıçrayarak ayakları aç, kolları baş üstünde birleştir.", "Sıçrayarak başa dön; ritmik devam et."],
  i: ["Parmak ucunda, yumuşak iniş"], h: ["Topuğa sert inmek"], q: "jumping jacks proper form" });
x("march", { n: "Yerinde Tempolu Yürüyüş", en: "High-knee march", c: "isinma", pat: "warm_cardio,cond", lv: "1-3", imp: 0, pr: 3,
  d: "Darbesiz ısınma: dizlerin ve bel için en nazik başlangıç.", s: ["Yerinde dizleri kalça hizasına doğru kaldırarak yürü.", "Kolları karşı bacakla birlikte salla.", "Tempoyu yavaşça artır."],
  i: ["Dik gövde"], h: ["Öne eğilmek"], q: "high knee march warm up" });
x("ip", { n: "İp Atlama", en: "Jump rope", c: "kondisyon", pat: "warm_cardio,cond", eq: "rope", lv: "1-3", imp: 1, st: "ankle:1", pr: 8,
  d: "Kondisyonun ve ayak bileği yayının temeli; ısınmanın ilk dakikaları.", s: ["Dirsekler gövdeye yakın, ipi omuzla değil bileklerle çevir.", "Parmak uçlarında kal, yerden sadece 2-3 cm sıçra.", "Çeşitlendir: iki ayak → koşar adım → boks adımı."],
  i: ["Dizler hafif bükük, iniş sessiz"], h: ["Gereğinden yüksek zıplamak", "Topuğa inmek"],
  inj: { ankle: "Ayak bileğinde sorun varsa sürelerini kısa tut, iki ayakla ve alçak atla." }, q: "jump rope basics tutorial" });
x("bikeeasy", { n: "Kardiyo Makinesinde Isınma", en: "Easy bike / rower / treadmill", c: "isinma", pat: "warm_cardio", eq: "cardio", lv: "1-3", imp: 0, pr: 6,
  d: "Bisiklet, kürek ya da koşu bandında hafif tempoda ısınma.", s: ["Konuşabileceğin rahat tempoda başla.", "Son dakikada tempoyu biraz artır."], q: "how to warm up on exercise bike" });
x("bilek", { n: "Bilek Hazırlığı", en: "Wrist prep routine", c: "isinma", pat: "prehab_wr,warm_up_upper", lv: "1-3",
  d: "Şınav, amut ve torba öncesi bilekleri yüke hazırlar.", s: ["Dört ayak pozisyonuna geç, eller omuzların altında.", "Parmaklar ileri bakarken gövdeyi öne-arkaya 10 kez sallandır.", "Parmaklar dizlere dönük: 10 hafif sallanma.", "El sırtları yerde: 10 hafif sallanma.", "Avuçlar yerde, parmakları tek tek kaldır, 5 tur."],
  i: ["Ağrı 10 üzerinden 3'ü geçerse dur"], h: ["Birden tüm ağırlığı bileğe vermek"],
  inj: { wrist: "Bilek sorunun varsa bu hazırlık her üst vücut gününde zorunlu. Açıyı 2-3 haftada yavaş yavaş aç." }, q: "wrist warm up routine" });
x("kedi", { n: "Kedi-İnek", en: "Cat-cow", c: "isinma", pat: "warm_mob", lv: "1-3",
  d: "Omurgayı omur omur hareketlendirir.", s: ["Dört ayak pozisyonu.", "Nefes verirken sırtı yuvarla (kedi).", "Nefes alırken göğsü öne-aşağı bırak (inek)."], q: "cat cow stretch" });
x("wgs", { n: "Dünyanın En İyi Esnemesi", en: "World's greatest stretch", c: "isinma", pat: "warm_mob", lv: "1-3", st: "knee:1",
  d: "Kalça önü, arka bacak ve göğüs omurgası rotasyonunu tek harekette açar.", s: ["Uzun bir hamle pozisyonu al, arka diz yerden kalkık.", "Ön ayağın iç tarafına aynı taraftaki dirseği indir.", "Aynı kolu tavana aç, gözlerin eli takip etsin.", "Elleri yere koy, ön bacağı düzleştir, başa dön."], q: "worlds greatest stretch" });
x("bacaksal", { n: "Bacak Sallama", en: "Leg swings", c: "isinma", pat: "warm_mob,warm_lower", lv: "1-3",
  d: "Kalça eklemini koşu ve sıçramaya hazırlar.", s: ["Bir elinle duvara tutun.", "Bacağı öne-arkaya 10 kez kontrollü salla.", "Sonra yana 10 kez; her turda açıyı büyüt."], q: "leg swings dynamic warm up" });
x("dislo", { n: "Omuz Çevirme (bant veya havlu)", en: "Shoulder pass-through", c: "isinma", pat: "warm_up_upper,prehab_sh", lv: "1-3",
  d: "Omuzun baş üstü hareketini ve göğüs açılımını geliştirir. Bant yoksa havlu ya da süpürge sapıyla yapılır.", s: ["Bandı veya havluyu iki elle geniş tut, kollar düz önde.", "Kolları bükmeden başın üstünden arkaya geçir.", "Aynı yoldan öne getir; rahatladıkça tutuşu daralt."],
  i: ["Kaburgalar içeride"], h: ["Dirsekleri bükmek"], inj: { shoulder: "Takılma hissinde tutuşu genişlet; ağrı değil hafif gerilme hedef." }, q: "shoulder pass through dislocates" });
x("pullap", { n: "Bandı Göğüste Açma", en: "Band pull-apart", c: "isinma", pat: "warm_up_upper,prehab_sh", eq: "band", lv: "1-3",
  d: "Arka omuz ve kürek kemiği arası kasları uyandırır.", s: ["Bandı omuz hizasında, kollar düz önde tut.", "Kürek kemiklerini birbirine yaklaştırarak bandı göğse doğru aç.", "1 sn tut, kontrollü bırak."], h: ["Omuzları kulağa kaldırmak"], q: "band pull apart" });
x("dr", { n: "Bant Dış Rotasyon", en: "Band / cable external rotation", c: "isinma", pat: "prehab_sh", eq: "band+anchor|cable", lv: "1-3", t: "r", pr: 7, uni: true,
  d: "Rotator manşeti (omuz içindeki küçük kaslar) güçlendirir. Bant dirsek hizasında sağlam bir yere bağlanır; salonda kabloyla yapılır.", s: ["Bandı (ya da kabloyu) dirsek hizasında sağlam bir yere sabitle.", "Dirsek 90° bükülü ve gövdeye yapışık (araya katlı havlu sıkıştır).", "Ön kolu dışa çevir, 2 sn'de geri dön."],
  i: ["Hafif gerilim yeter"], h: ["Dirseği gövdeden ayırmak"], inj: { shoulder: "Sorunlu omza her seferinde 1 set fazla yap." }, q: "band external rotation shoulder" });
x("sideer", { n: "Yan Yatarak Dış Rotasyon", en: "Side-lying external rotation", c: "isinma", pat: "prehab_sh", lv: "1-3", t: "r", pr: 5, uni: true,
  d: "Bant yoksa rotator manşet güçlendirmesi. Hafif bir dambıl ya da dolu su şişesiyle yapılır.", s: ["Yan yat, üstteki kolun dirseği gövdeye yapışık ve 90° bükülü.", "Ön kolu yukarı doğru çevir, 2 sn'de indir."], i: ["Çok hafif yük (0,5-2 kg)"], q: "side lying external rotation" });
x("wallslide", { n: "Duvar Kaydırma", en: "Serratus wall slide", c: "isinma", pat: "warm_up_upper,prehab_sh", lv: "1-3",
  d: "Kürek kemiğinin yukarı dönüşünü ve serratus kasını çalıştırır; amut ve baş üstü itişler için şart.", s: ["Duvara dön, ön kollar duvarda, dirsekler omuz hizasında.", "Ön kolları yukarı kaydır, kürek kemikleri öne-yukarı açılsın.", "Tepede kolları duvardan hafifçe uzaklaştır, sonra in."], q: "serratus wall slide" });
x("scap", { n: "Kürek Kemiği Barfiksi", en: "Scapular pull-up", c: "amut", pat: "warm_up_upper,prehab_sh", eq: "pullbar", lv: "1-3", t: "r",
  d: "Barfiksin ilk hareketi: kolları bükmeden kürek kemiklerini aşağı çekmek.", s: ["Bara tam asıl, kollar düz.", "Kolları bükmeden omuzları kulaklardan uzaklaştır.", "1-2 sn tut, kontrollü bırak."], h: ["Dirsekleri bükmek"], q: "scapular pull ups" });
x("ytw", { n: "Yüzüstü Y-T-W", en: "Prone Y-T-W raises", c: "isinma", pat: "prehab_sh", lv: "1-3", pr: 6,
  d: "Orta-alt trapez ve arka omuz: kürek kemiği kontrolü ve duruş.", s: ["Yüzüstü yat, alnını katlı havluya koy.", "Kollar Y şeklinde, başparmaklar yukarı; kolları 2 sn yerden kaldır.", "Aynısını T (yana) ve W (dirsekler bükük) şeklinde yap."], h: ["Başı kaldırmak"], q: "prone Y T W exercise" });
x("facepull", { n: "Yüze Doğru Çekiş", en: "Face pull (band or cable)", c: "isinma", pat: "prehab_sh", eq: "band+anchor|band+pullbar|cable", lv: "1-3", t: "r", pr: 8,
  d: "Arka omuz ve dış rotasyon; itiş hareketlerini dengeler.", s: ["Bandı yüz hizasında sağlam bir yere ya da barfiks demirine bağla; salonda kabloyu yüz hizasına ayarla.", "Yüzüne doğru çek, elleri kulakların yanına ayır.", "1 sn tut, kontrollü bırak."], h: ["Gövdeyi geri savurmak"], q: "face pull band" });
x("golge", { n: "Gölge Boks", en: "Shadow boxing", c: "boks", pat: "warm_box", lv: "1-3", st: "shoulder:1",
  d: "Isınma ve teknik: ayak, kalça ve omuzun birlikte çalışması.", s: ["Boks duruşuna geç, gard yukarıda.", "Kombinasyonları hayali rakibe at, sürekli hareket et.", "İlk dakika hafif, sonra orta tempo."], h: ["Bilek ağırlığıyla hızlı yumruk atmak (dirseğe zarar)"], q: "shadow boxing beginner" });
x("tib", { n: "Ayak Ucu Kaldırma (Kaval Kası)", en: "Tibialis raise", c: "alt", pat: "prehab_knee,calf", lv: "1-3", t: "r", pr: 4,
  d: "Kaval kemiği önündeki kas: diz ve kaval ağrılarını önler.", s: ["Sırtını duvara yasla, topuklar duvardan 30-40 cm ileride.", "Ayak uçlarını olabildiğince kaldır, 1 sn tut, indir."], q: "tibialis raise wall" });
x("calf", { n: "Tek Bacak Baldır Kaldırma", en: "Single-leg calf raise", c: "alt", pat: "calf,prehab_ankle", lv: "1-3", t: "r", pr: 6, uni: true,
  d: "Aşil tendonu ve baldır: sıçramanın, koşunun ve ayak bileği sağlığının temeli.", s: ["Tek ayak üstünde, gerekirse bir basamağın kenarında dur.", "Duvara tutun, tamamen parmak ucuna yüksel, 1 sn tut.", "2-3 sn'de topuğu indir."],
  inj: { ankle: "Ayak bileği sorununda önce iki ayakla başla." }, q: "single leg calf raise" });
x("balance", { n: "Tek Ayak Denge", en: "Single-leg balance", c: "isinma", pat: "prehab_ankle", lv: "1-2", t: "s", pr: 4, uni: true,
  d: "Ayak bileği ve diz stabilitesi; burkulmaları önler.", s: ["Tek ayak üstünde dur, diz hafif bükük.", "Zorlaştırmak için gözlerini kapat veya boş bacakla harfler çiz."], q: "single leg balance exercises ankle" });
x("birddog", { n: "Dört Ayakta Çapraz Uzanma", en: "Bird dog", c: "core", pat: "core,prehab_back", lv: "1-2", t: "r", pr: 4, uni: true,
  d: "Beli koruyarak derin sırt ve karın kaslarını çalıştırır.", s: ["Dört ayak pozisyonu, sırt düz.", "Karşı kol ve bacağı yere paralel uzat, 2 sn tut.", "Kontrollü geri getir, taraf değiştir."], h: ["Beli çukurlaştırmak"], q: "bird dog exercise" });
x("mcgill", { n: "Bel Dostu Yarım Mekik", en: "McGill curl-up", c: "core", pat: "core,prehab_back", lv: "1-2", t: "r", pr: 3,
  d: "Bel dostu karın hareketi.", s: ["Sırtüstü, bir diz bükük diğeri düz; ellerini belinin altına koy.", "Baş ve omuzları birkaç cm kaldır, 8-10 sn tut.", "Bel yerde kalsın."], q: "mcgill curl up" });

// ================= ALT VÜCUT =================
x("chairsquat", { n: "Sandalye Squat", en: "Box/chair squat", c: "alt", pat: "squat", lv: "1-1", st: "knee:1", t: "r", pr: 4,
  d: "Squat'ı öğrenmenin en güvenli yolu: arkandaki sandalyeye hafifçe dokunup kalk.", s: ["Sandalyenin önünde, ayaklar omuz genişliğinde dur.", "Kalçayı geri iterek otur gibi in, sandalyeye hafifçe dokun.", "Ayak ortasından iterek kalk."], i: ["Dizler ayak uçları yönünde"], h: ["Sandalyeye çökmek"],
  inj: { knee: "Diz ağrısında sandalyeyi yükselt (yastık koy) ve açıyı sınırla." }, q: "box squat bodyweight beginner" });
x("airsquat", { n: "Vücut Ağırlığı Squat", en: "Bodyweight squat", c: "alt", pat: "squat,warm_lower", lv: "1-2", st: "knee:1", t: "r", pr: 5,
  d: "Aletsiz squat. Yavaş iniş (3 sn) ile zorlaştırılır.", s: ["Ayaklar omuz genişliğinde, uçlar hafif dışa.", "Kalça geri ve aşağı, göğüs dik; uyluk yere paralel veya altına in.", "Ayak ortasından iterek kalk."], i: ["Kollar önde denge için"], h: ["Topukların kalkması", "Dizlerin içe çökmesi"], q: "bodyweight squat form" });
x("wallsit", { n: "Duvar Oturuşu", en: "Wall sit", c: "alt", pat: "squat", lv: "1-2", st: "knee:1", t: "s", pr: 2,
  d: "Diz dostu izometrik bacak kuvveti.", s: ["Sırtını duvara yasla, dizler 90° olana kadar kay.", "Süre boyunca bekle."], inj: { knee: "Ağrı olursa açıyı küçült (daha yukarıda dur)." }, q: "wall sit exercise" });
x("goblet", { n: "Göğüste Ağırlıkla Squat", en: "Goblet squat", c: "alt", pat: "squat", eq: "db|kb", lv: "1-3", st: "knee:1", t: "w", pr: 8,
  d: "Tek dambıl veya kettlebell ile squat. Kalça ve ayak bileği hareketliliğini de açar.", s: ["Ağırlığı göğsünün önünde tut.", "Ayaklar omuz genişliğinde, uçlar hafif dışa.", "Dirsekler dizlerin arasından geçecek kadar derin çök.", "Ayak ortasından iterek kalk."], i: ["Gövde dik"], h: ["Dizlerin içe çökmesi", "Topukların kalkması"], q: "goblet squat form" });
x("backsquat", { mx: 10, n: "Sırtta Barla Squat", en: "Barbell back squat", c: "alt", pat: "squat", eq: "barbell+rack", lv: "2-3", st: "knee:2,back:2", t: "w", pr: 10,
  d: "Alt vücut kuvvetinin ana hareketi. Squat sehpasıyla, güvenlik kolları ayarlanarak yapılır.", s: ["Barı sehpadan omzunun arka üst kısmına al, bir iki adım geri çık.", "Ayaklar omuz genişliğinde; nefes al, karnı sık.", "Kalça ve dizler birlikte bükülerek uyluk paralelin altına in.", "Ayak ortasından iterek kalk."], i: ["Güvenlik kollarını iniş yüksekliğinin hemen altına ayarla"], h: ["Dizlerin içe çökmesi", "Kalçanın göğüsten önce kalkması"],
  inj: { back: "Bel sorununda goblet ya da front squat tercih et; ağırlığı düşük tut.", knee: "Diz ağrısında derinliği ağrısız aralıkla sınırla." }, q: "barbell back squat technique" });
x("frontsquat", { mx: 10, n: "Önde Barla Squat", en: "Barbell front squat", c: "alt", pat: "squat", eq: "barbell+rack", lv: "2-3", st: "knee:2,wrist:2", t: "w", pr: 7,
  d: "Bar önde; gövdeyi daha dik tutar, bel dostudur.", s: ["Barı ön omuzlara al, dirsekler yukarı (kollar çapraz tutuş da olur).", "Dik gövdeyle derin squat.", "Dirsekler düşmeden kalk."], inj: { wrist: "Bilek sorununda kollar çapraz tutuş kullan." }, q: "front squat technique" });
x("zercher", { mx: 10, n: "Dirsek İçinde Barla Squat", en: "Zercher squat", c: "alt", pat: "squat", eq: "barbell", lv: "2-3", st: "knee:2,back:2,elbow:1", t: "w", pr: 6,
  d: "Squat sehpası olmadan barla ağır squat. Bileği yormaz, karın ve gövdeyi çok çalıştırır.", s: ["Barı deadlift ile kaldır, yarım çömelip uyluklarına dayandır.", "Barı dirsek iç kıvrımına al, ellerini kenetle.", "Dikleş ve squat yap.", "Bitince barı uyluklara, oradan yere indir."], i: ["Barı havluyla sar"], h: ["Sırtın yuvarlanması"], q: "zercher squat from the floor" });
x("legpress", { n: "Bacak İtme Makinesi", en: "Leg press machine", c: "alt", pat: "squat", eq: "lpmach", lv: "1-3", st: "knee:2", t: "w", pr: 6,
  d: "Makinede güvenli bacak kuvveti; bel yükü az.", s: ["Ayakları platformda omuz genişliğinde koy.", "Dizler göğse yaklaşana kadar kontrollü indir.", "Dizleri kilitlemeden it."], h: ["Kalçanın koltuktan kalkması"], q: "leg press proper form" });
x("pistolprog", { n: "Tek Bacak Squat Basamakları", en: "Pistol squat progression", c: "alt", pat: "squat", lv: "3-3", st: "knee:3,ankle:2", t: "r", pr: 6, uni: true,
  d: "Tek bacak squat. Önce bir kutuya/sandalyeye oturarak, sonra tam derinlikte.", s: ["Tek ayak üstünde dur, diğer bacak önde.", "Kalçayı geri iterek sandalyeye/kutuya in, dokun, kalk.", "Kolay gelince yüksekliği azalt."], q: "pistol squat progression" });
x("gbridge", { n: "Kalça Köprüsü", en: "Glute bridge", c: "alt", pat: "hinge,warm_lower", lv: "1-2", t: "r", pr: 4,
  d: "Aletsiz kalça kuvveti; bel dostu.", s: ["Sırtüstü yat, dizler bükük, ayaklar yerde.", "Topuklardan iterek kalçayı kaldır, tepede 2 sn sık.", "Kontrollü in."], h: ["Belden kavis yapmak"], q: "glute bridge" });
x("sbridge", { n: "Tek Bacak Kalça Köprüsü", en: "Single-leg glute bridge", c: "alt", pat: "hinge", lv: "1-3", t: "r", pr: 5, uni: true,
  d: "Aletsizken kalça ve arka bacak için güçlü seçenek.", s: ["Kalça köprüsü pozisyonunda bir bacağı havaya kaldır.", "Yerdeki topuktan iterek kalçayı kaldır.", "Kalçalar yere paralel kalsın."], q: "single leg glute bridge" });
x("bridge", { n: "Barla Kalça Köprüsü", en: "Barbell glute bridge", c: "alt", pat: "hinge", eq: "barbell", lv: "2-3", t: "w", pr: 6,
  d: "Yüklü kalça kuvveti: sıçrama, sprint ve yumruk için itici motor.", s: ["Sırtüstü, dizler bükük; barı kalça kemiklerinin üstüne al (araya havlu).", "Topuklardan it, kalçayı kaldır.", "Tepede 1-2 sn sık, kontrollü in."], h: ["Belden kavis"], q: "barbell glute bridge floor" });
x("hipthrust", { n: "Sehpaya Yaslanarak Kalça İtişi", en: "Hip thrust", c: "alt", pat: "hinge", eq: "bench+barbell|bench+db", lv: "2-3", t: "w", pr: 7,
  d: "Sırt sehpaya dayalı kalça köprüsü; en güçlü kalça hareketi.", s: ["Kürek kemikleri sehpanın kenarında, ağırlık kalçanın üstünde.", "Topuklardan iterek gövde ile uyluk düz çizgi olana kadar kalk.", "Tepede sık, kontrollü in."], q: "hip thrust form" });
x("rdl", { n: "Romen Deadlift", en: "Romanian deadlift", c: "alt", pat: "hinge", eq: "barbell|db|kb", lv: "1-3", st: "back:2,hip:1", t: "w", pr: 8,
  d: "Arka bacak (hamstring) ve kalça. Sprint hızının ve sakatlıktan korunmanın temeli.", s: ["Ağırlığı ayakta tut, dizler hafif bükük ve sabit.", "Kalçayı geri iterek ağırlığı bacaklarının önünden indir.", "Arka bacakta güçlü gerilme hissedince dur.", "Kalçayı öne iterek kalk."], i: ["Sırt düz, bakış 2 m ileri"], h: ["Beli yuvarlamak", "Dizleri fazla bükmek"],
  inj: { back: "Bel sorununda hafif başla ve hareket aralığını kısalt." }, q: "romanian deadlift form" });
x("dl", { mx: 8, n: "Deadlift", en: "Conventional deadlift", c: "alt", pat: "hinge", eq: "barbell", lv: "2-3", st: "back:2,hip:1", t: "w", pr: 9,
  d: "Tüm vücut kuvvetinin ana hareketi.", s: ["Bar ayak ortasının üstünde, ayaklar kalça genişliğinde.", "Kalçayı geri iterek eğil, barı omuz genişliğinde tut.", "Göğüs yukarı, sırt düz; derin nefes, karın sıkı.", "Yeri itiyormuş gibi kalk, bar bacağına yakın yükselsin.", "Aynı yoldan kontrollü indir."], i: ["Bar hep bacağa yakın"], h: ["Sırtı yuvarlamak", "Barı yere çarpmak"],
  inj: { back: "Bel sorunu varsa önce RDL ve kalça köprüsüyle başla; deadlift'i hafif ve teknik odaklı yap." }, q: "conventional deadlift technique" });
x("kbswing", { n: "Kettlebell Savurma", en: "Kettlebell swing", c: "kondisyon", pat: "hinge,cond,power_low", eq: "kb", lv: "1-3", st: "back:2", t: "r", pr: 6,
  d: "Kalça patlayıcılığı ve kondisyon bir arada.", s: ["Kettlebell'i iki elle tut, ayaklar omuzdan geniş.", "Kalçayı geri it, kettlebell bacak arasına gitsin.", "Kalçayı patlatarak kettlebell'i göğüs hizasına savur."], i: ["Kollar ip gibi, gücü kalça verir"], h: ["Squat yapar gibi çökmek"], q: "kettlebell swing form" });
x("dbswing", { n: "Dambıl Savurma", en: "Dumbbell swing", c: "kondisyon", pat: "hinge,cond,power_low", eq: "db", lv: "1-3", st: "back:2", t: "r", pr: 5,
  d: "Kettlebell yoksa swing: kalça patlayıcılığı ve kondisyon.", s: ["Dambılı bir ucundan iki elle tut.", "Kalçayı geri it, dambıl bacaklarının arasına gitsin.", "Kalçayı patlatarak göğüs hizasına savur."], h: ["Kolla kaldırmak"], q: "dumbbell swing" });
x("slrdl", { n: "Tek Bacak Romen Deadlift", en: "Single-leg RDL", c: "alt", pat: "hinge,lunge", eq: "db|kb|none", lv: "1-3", st: "back:1,ankle:1", t: "w", pr: 5, uni: true,
  d: "Denge, kalça stabilitesi ve arka bacak. Aletsiz de yapılır.", s: ["Ağırlığı yerdeki ayağın karşı elinde tut (varsa).", "Arka bacak geriye uzanırken gövdeyi öne eğ.", "Kalçalar yere paralel; kalçayı sıkarak kalk."], i: ["Gerekirse duvara hafifçe dokun"], q: "single leg romanian deadlift" });
x("superman", { n: "Süperman", en: "Superman hold", c: "core", pat: "hinge,prehab_back", lv: "1-1", st: "back:1", t: "s", pr: 2,
  d: "Aletsiz sırt ve kalça kuvveti.", s: ["Yüzüstü yat, kollar önde.", "Kolları ve bacakları birkaç cm kaldır, bekle."], q: "superman exercise" });
x("legcurl", { n: "Bacak Bükme Makinesi", en: "Leg curl machine", c: "alt", pat: "hinge", eq: "legmach", lv: "1-3", st: "knee:1", t: "w", pr: 5,
  d: "Makinede arka bacak (hamstring) kuvveti.", s: ["Makinede pedi aşil tendonunun üstüne ayarla.", "Topukları kalçaya doğru çek, yavaş indir."], q: "leg curl machine form" });
x("rlunge", { n: "Geriye Adımla Hamle", en: "Reverse lunge", c: "alt", pat: "lunge", eq: "none|db|kb", lv: "1-3", st: "knee:2", t: "w", pr: 7, uni: true,
  d: "Tek bacak kuvveti ve denge; dizlere öne lunge'dan daha dostça.", s: ["Dik dur, bir ayakla geriye büyük adım at.", "Arka diz yere yaklaşana kadar in.", "Ön topuktan iterek başa dön."], i: ["Ağırlık yoksa vücut ağırlığıyla yap"], h: ["Adımı kısa atmak"], q: "reverse lunge" });
x("split", { n: "Sabit Hamle", en: "Split squat", c: "alt", pat: "lunge", eq: "none|db|kb", lv: "1-3", st: "knee:2", t: "w", pr: 6, uni: true,
  d: "Ayaklar sabit tek bacak squat.", s: ["Uzun adım duruşu, arka topuk kalkık.", "Gövde dik, arka diz yere yaklaşana kadar in ve kalk.", "Setin sonunda taraf değiştir."], q: "split squat" });
x("bss", { n: "Arka Ayak Yüksekte Hamle", en: "Bulgarian split squat", c: "alt", pat: "lunge", eq: "bench|box", lv: "2-3", st: "knee:2", t: "w", pr: 8, uni: true,
  d: "Arka ayak yüksekte: en etkili tek bacak hareketlerinden.", s: ["Arka ayağının üstünü sehpa/kutu üstüne koy.", "Ön bacakla dik şekilde çök.", "Ön topuktan iterek kalk."], i: ["Varsa elde dambıl"], q: "bulgarian split squat" });
x("stepup", { n: "Basamağa Çıkış", en: "Step-up", c: "alt", pat: "lunge", eq: "box|bench", lv: "1-3", st: "knee:2", t: "w", pr: 6, uni: true,
  d: "Kutuya veya basamağa çıkış: diz dostu tek bacak kuvveti.", s: ["Bir ayağını kutunun üstüne koy.", "Üstteki bacakla iterek çık, diğer ayağı yukarı getir.", "Kontrollü in."], h: ["Alttaki ayakla sıçramak"], q: "step up exercise" });

// ================= PATLAYICILIK & SPRİNT =================
x("snap", { n: "İniş Drili", en: "Snap down", c: "patlayici", pat: "plyo", lv: "1-3", imp: 1, st: "knee:1", t: "x", pr: 3,
  d: "Doğru iniş: sıçrama çalışmasının önkoşulu.", s: ["Parmak ucunda yüksel, kolları yukarı uzat.", "Kolları hızla geri savururken yarım squat pozisyonuna 'düş'.", "Sessiz ve dengeli dur, 2 sn tut."], h: ["Dizlerin içe çökmesi"], q: "snap down landing drill" });
x("sqj", { n: "Dikey Sıçrama", en: "Countermovement jump", c: "patlayici", pat: "plyo", lv: "1-3", imp: 2, st: "knee:2,ankle:1", t: "x", pr: 7,
  d: "Patlayıcı alt vücut gücü; her tekrar maksimum niyetle ve tam dinlenerek.", s: ["Kolları geri savurup çeyrek squat'a in.", "Kolları yukarı fırlatarak olabildiğince yükseğe sıçra.", "Yumuşak in, sıfırlan."], h: ["Yorgunken arka arkaya yapmak"], q: "countermovement jump technique" });
x("broad", { n: "Durarak Uzun Atlama", en: "Standing broad jump", c: "patlayici", pat: "plyo", lv: "2-3", imp: 2, st: "knee:2", t: "x", pr: 6,
  d: "Yatay patlayıcılık; sprint çıkışlarıyla doğrudan ilişkili.", s: ["Kolları geri savur, kalçayı geri it.", "İleri-yukarı 45° patla.", "İniş pozisyonunda 2 sn kal."], q: "standing broad jump technique" });
x("pogo", { n: "Pogo Sıçraması", en: "Pogo jumps", c: "patlayici", pat: "plyo,warm_lower", lv: "1-3", imp: 1, st: "ankle:1", t: "x", pr: 4,
  d: "Ayak bileği sertliği ve elastik güç.", s: ["Dizler neredeyse düz; ayak bileklerinden seri sıçra.", "Yere temas çok kısa olsun."], q: "pogo jumps" });
x("skater", { n: "Yana Sıçrama", en: "Skater jump", c: "patlayici", pat: "plyo", lv: "2-3", imp: 2, st: "knee:2,ankle:2", t: "x", pr: 5, uni: true,
  d: "Yanal güç ve denge.", s: ["Tek ayak üstünde dur.", "Yana, diğer ayağın üstüne sıçra; 1 sn dengede kal.", "Karşı tarafa sıçra."], q: "skater jumps" });
x("boxjump", { n: "Kutu Sıçraması", en: "Box jump", c: "patlayici", pat: "plyo", eq: "box", lv: "2-3", imp: 2, st: "knee:1,ankle:1", t: "x", pr: 7,
  d: "Kutuya iniş, yere inişe göre eklemleri daha az yorar.", s: ["Kutunun önünde dur, kolları geri savur.", "Kutuya sıçra, yumuşak in, dik dur.", "Kutudan adımla in (atlama)."], h: ["Kutudan aşağı atlamak"], q: "box jump technique" });
x("splitjump", { n: "Hamle Sıçraması", en: "Split squat jump", c: "patlayici", pat: "plyo", lv: "3-3", imp: 3, st: "knee:3", t: "x", pr: 5, uni: true,
  d: "Tek bacak patlayıcılığı.", s: ["Split squat pozisyonuna gel.", "Yukarı patla, havada ayakları değiştir.", "Yumuşak in."], q: "split squat jump" });
x("tuck", { n: "Diz Çekerek Sıçrama", en: "Tuck jump", c: "patlayici", pat: "plyo", lv: "3-3", imp: 3, st: "knee:2", t: "x", pr: 4,
  d: "Hızlı kalça fleksiyonu ve reaktif güç.", s: ["Yerinde yüksek sıçra, dizleri göğse çek.", "Yumuşak in, her tekrar arasında sıfırlan."], q: "tuck jump" });
x("wall_drill", { n: "Duvar Sprint Drili", en: "Wall drill", c: "patlayici", pat: "sprint_drill", lv: "1-3", imp: 1, t: "x", pr: 5,
  d: "Hızlanma pozisyonunu öğretir; küçük alanda yapılır.", s: ["Ellerini duvara koy, vücut 45° eğik ve düz.", "Bir dizini kalça hizasına çek, ayak ucu yukarı.", "Tek tek veya 3'lü seri hızlı ayak değiştir."], q: "wall drill sprint" });
x("askip", { n: "Diz Çekerek Sekme", en: "A-skip", c: "patlayici", pat: "sprint_drill", lv: "1-3", imp: 1, t: "x", pr: 5,
  d: "Sprint mekaniği: diz sürüşü ve ayak basışı.", s: ["Önce yürüyerek: diz kalça hizasına, karşı kol ileri.", "Sonra ritmik sekerek.", "Ayak kalçanın altına bassın."], q: "A skip drill" });
x("stride", { n: "Açılma Koşusu", en: "Running strides", c: "patlayici", pat: "sprint", eq: "outdoor", lv: "1-3", imp: 2, st: "hip:1,ankle:1", t: "x", pr: 6,
  d: "Sprinte güvenli geçiş: %70-80 hız.", s: ["İlk 10-15 m'de kademeli hızlan.", "Kalanı rahat ve uzun adımlarla koş.", "Yürüyerek dön."], h: ["İlk haftadan maksimum hıza çıkmak"], q: "running strides how to" });
x("sprint", { n: "Hızlanma Sprinti", en: "Acceleration sprint", c: "patlayici", pat: "sprint", eq: "outdoor", lv: "2-3", imp: 3, st: "hip:2,ankle:2", t: "x", pr: 8,
  d: "10-25 m kısa ve hızlı koşular, her tekrar arasında tam dinlenme.", s: ["Yarı çömelik duruştan başla.", "İlk adımlar güçlü ve kısa, gövde öne eğik.", "Kademeli olarak dikleş."], i: ["Arka bacakta çekme hissinde dur"], q: "acceleration sprint technique" });
x("bikesprint", { n: "Makinede Sprint", en: "Bike / rower sprints", c: "patlayici", pat: "sprint,cond", eq: "cardio", lv: "1-3", imp: 0, t: "x", pr: 5,
  d: "Darbesiz sprint: bisiklet veya kürekte kısa maksimum çabalar.", s: ["Hafif tempoda pedal çevir/kürek çek.", "İşaretle birlikte süre boyunca maksimum çaba.", "Dinlenmede çok yavaş devam et."], q: "bike sprint intervals" });

// ================= ÜST VÜCUT =================
x("inclinepush", { n: "Eğimli Şınav", en: "Incline push-up", c: "ust", pat: "hpush", lv: "1-1", st: "wrist:1", t: "r", pr: 6,
  d: "Eller masa, tezgah ya da duvarda: şınava başlangıç.", s: ["Ellerini yüksek sağlam bir yüzeye koy, vücut düz.", "Göğsü kenara yaklaştır.", "İterek kalk; zamanla daha alçak yüzeye geç."], q: "incline push up beginner" });
x("pushup", { n: "Şınav", en: "Push-up", c: "ust", pat: "hpush", lv: "1-3", st: "wrist:2,shoulder:1", t: "r", pr: 7,
  d: "Temel itiş hareketi.", s: ["Eller omuz genişliğinden biraz geniş, vücut baştan topuğa düz.", "Göğüs yere yaklaşana kadar in, dirsekler gövdeye ~45°.", "Yeri iterek kalk."], h: ["Kalçanın düşmesi", "Dirsekleri yana açmak"],
  inj: { wrist: "Bilek ağrısında yumruk üstünde ya da şınav tutacağıyla yap." }, q: "push up proper form" });
x("kpushup", { n: "Yumruk Şınavı", en: "Knuckle push-up", c: "ust", pat: "hpush", lv: "1-3", st: "wrist:1,shoulder:1", t: "r", pr: 6,
  d: "Yumruk üstünde şınav bileği düz tutar; bilek dostu ve yumruk hattını güçlendirir. Minderde yap.", s: ["Yumruklar omuz altında, ilk iki parmak boğumu yerde.", "Vücut düz, karın sıkı.", "Göğüs yumruk hizasına inene kadar in, it."], q: "knuckle push up" });
x("dbbench", { n: "Dambıl Bench Press", en: "Dumbbell bench press", c: "ust", pat: "hpush", eq: "db+bench", lv: "1-3", st: "shoulder:1", t: "w", pr: 8,
  d: "Sehpada göğüs itişi; omuza bardan daha dostça.", s: ["Sehpaya yat, dambıllar göğüs hizasında.", "Yukarı it, dambıllar üstte hafif yaklaşsın.", "Kontrollü indir."], q: "dumbbell bench press form" });
x("floorpress", { n: "Yerde Dambılla Göğüs İtişi", en: "Dumbbell floor press", c: "ust", pat: "hpush", eq: "db", lv: "1-3", st: "shoulder:1", t: "w", pr: 6,
  d: "Sehpa yoksa yerde göğüs itişi; yer dirsek inişini sınırlayıp omzu korur.", s: ["Sırtüstü yat, dizler bükük.", "Dambılı göğüs yanında tut, dirsek yerde.", "Yukarı it, dirsek yere yumuşakça değene kadar indir."], i: ["Tek dambıl varsa tek kolla yap"], q: "dumbbell floor press" });
x("bench", { mx: 10, n: "Bench Press", en: "Barbell bench press", c: "ust", pat: "hpush", eq: "barbell+bench+rack", lv: "2-3", st: "shoulder:2", t: "w", pr: 9,
  d: "Klasik göğüs kuvveti hareketi. Güvenlik kolları veya yardımcıyla yap.", s: ["Sehpaya yat, gözler barın altında; kürek kemiklerini sık.", "Barı omuzdan biraz geniş tut, raftan al.", "Göğsün alt kısmına indir, it."], h: ["Kalçayı kaldırmak", "Barı göğüste sektirmek"],
  inj: { shoulder: "Omuz sorununda dambıl bench ya da floor press tercih et." }, q: "bench press technique" });
x("dips", { n: "Paralel Barda İtiş", en: "Parallel bar dips", c: "ust", pat: "hpush", eq: "dip|rings", lv: "2-3", st: "shoulder:3,elbow:2", t: "r", pr: 7,
  d: "Göğüs, omuz önü ve arka kol için güçlü vücut ağırlığı hareketi.", s: ["Paralel barda kollar düz dur.", "Gövde hafif öne eğik, omuzlar dirsek hizasına inene kadar in.", "İterek kalk."], h: ["Çok derine inmek"], q: "dips proper form" });
x("chestpress", { n: "Göğüs İtme Makinesi", en: "Chest press machine", c: "ust", pat: "hpush", eq: "pressmach", lv: "1-3", t: "w", pr: 6,
  d: "Makinede kontrollü göğüs itişi.", s: ["Tutacaklar göğüs hizasında.", "İleri it, yavaş geri gel."], q: "chest press machine" });
x("exppush", { n: "Patlayıcı Şınav", en: "Explosive push-up", c: "ust", pat: "upow", lv: "2-3", imp: 1, st: "wrist:2", t: "r", pr: 6,
  d: "Üst vücut patlayıcı gücü: yumruğun itiş hızı.", s: ["Şınavın alt noktasına in.", "Olabildiğince hızlı it, eller yerden kalksın.", "Yumuşak in, sıfırlan."], q: "explosive push up" });
x("archer", { n: "Okçu Şınavı", en: "Archer push-up", c: "amut", pat: "hpush", lv: "3-3", st: "wrist:2,shoulder:2", t: "r", pr: 5, uni: true,
  d: "Tek kol şınava hazırlık.", s: ["Elleri geniş aç.", "Bir kola doğru in, diğer kol düz yana uzansın.", "Taraf değiştir."], q: "archer push up" });
x("pike", { n: "Ters V Şınav", en: "Pike push-up", c: "amut", pat: "vpush", lv: "1-3", st: "wrist:2,shoulder:2", t: "r", pr: 6,
  d: "Baş üstü itiş kuvveti; amutta şınavın temeli.", s: ["Kalça yukarıda, vücut ters V.", "Başını ellerinin biraz önüne doğru indir.", "Yeri iterek başa dön."], i: ["İleri seviyede ayaklar duvarda yapılır"], h: ["Kalçayı indirip normal şınava çevirmek"], q: "pike push up" });
x("dbohp", { n: "Dambıl Omuz Press", en: "Dumbbell overhead press", c: "ust", pat: "vpush", eq: "db", lv: "1-3", st: "shoulder:2", t: "w", pr: 7,
  d: "Ayakta ya da oturarak baş üstü itiş. Tek kolla da yapılır.", s: ["Dambılları omuz hizasında tut.", "Karın sıkı, baş üstüne it.", "Kontrollü indir."], h: ["Belden geriye yaslanmak"], inj: { shoulder: "Omuz sorununda avuçlar birbirine bakacak şekilde ve biraz önden it." }, q: "dumbbell shoulder press" });
x("ohp", { mx: 10, n: "Barla Omuz Press", en: "Barbell overhead press", c: "ust", pat: "vpush", eq: "barbell+rack", lv: "2-3", st: "shoulder:2,back:1", t: "w", pr: 8,
  d: "Ayakta bar ile baş üstü itiş.", s: ["Barı sehpadan omuz önüne al.", "Karın ve kalça sıkı, barı baş üstüne it; baş öne gelsin.", "Kontrollü indir."], h: ["Belden kavis"], q: "overhead press technique" });
x("lmpress", { n: "Tek Kol Köşe Barı İtişi", en: "Landmine press", c: "ust", pat: "vpush", eq: "barbell+landmine", lv: "1-3", st: "shoulder:1", t: "w", pr: 7, uni: true,
  d: "Açılı baş üstü itiş; kısıtlı veya hassas omuzlar için en dostça seçenek. Landmine aparatı ya da barın ucunu sabitleyecek sağlam bir köşe gerekir.", s: ["Barın bir ucunu landmine aparatına ya da sağlam bir oda köşesine yerleştir (ucu havluya sar). Diğer uca plaka tak.", "Plakalı ucu tek elle omuz önünde tut, hafif split duruş.", "Yukarı-ileri it, sonra kontrollü indir."], i: ["Karın sıkı, gövde dönmesin"], q: "single arm landmine press" });
x("hspuneg", { n: "Amutta Yavaş İniş", en: "Handstand push-up negative", c: "amut", pat: "vpush,skill_hs", lv: "3-3", st: "wrist:3,shoulder:3,neck:2", t: "r", pr: 5,
  d: "Amutta shoulder press hedefinin ana antrenmanı. Önce duvara dönük amutta 45 sn durabilmelisin.", s: ["Sırt duvara dönük amuda çık.", "4-5 sn'de başını katlı havluya indir.", "Dizleri bükerek in, tekrar çık."], q: "handstand push up negatives" });
x("machinepress", { n: "Omuz İtme Makinesi", en: "Shoulder press machine", c: "ust", pat: "vpush", eq: "pressmach", lv: "1-3", st: "shoulder:1", t: "w", pr: 5,
  d: "Makinede güvenli baş üstü itiş.", s: ["Tutacaklar omuz hizasında.", "Yukarı it, yavaş indir."], q: "shoulder press machine" });
x("doorrow", { n: "Havluyla Kapı Kürek", en: "Towel door row", c: "ust", pat: "hpull", lv: "1-2", t: "r", pr: 3,
  d: "Aletsiz çekiş: havluyu sağlam bir kapının iki koluna dolayarak kürek çekmek.", s: ["Havluyu kapı kollarına dola, kapı kapalı ve sağlam olsun.", "Havlunun uçlarını tut, geriye yaslan.", "Göğsünü kapıya doğru çek, yavaş geri git."], i: ["Ayakları kapıya yaklaştırdıkça zorlaşır"], q: "towel door row" });
x("bandrow", { n: "Bantlı Kürek", en: "Band row", c: "ust", pat: "hpull", eq: "band+anchor", lv: "1-2", t: "r", pr: 4,
  d: "Bantla sırt çekişi; bant göğüs hizasında sağlam bir yere bağlanır.", s: ["Bandı göğüs hizasında sağlam bir yere (kapı ankrajı, direk) bağla.", "Dirsekleri geriye çek, kürek kemiklerini sık.", "Yavaş bırak."], q: "resistance band row" });
x("invrow", { n: "Ters Kürek", en: "Inverted row", c: "ust", pat: "hpull", eq: "rings|barbell+rack", lv: "1-3", t: "r", pr: 7,
  d: "Vücut ağırlığıyla sırt çekişi; barfiksin en iyi yardımcısı.", s: ["Halkayı veya barı bel hizasına ayarla, altına yat.", "Vücut düz, göğsünü bara/halkalara çek.", "Kontrollü in; ayakları ileri aldıkça zorlaşır."], q: "inverted row" });
x("dbrow", { n: "Tek Kol Dambıl Kürek", en: "Single-arm dumbbell row", c: "ust", pat: "hpull", eq: "db", lv: "1-3", st: "back:1", t: "w", pr: 8, uni: true,
  d: "Sırt kalınlığı ve sol-sağ dengesi.", s: ["Boş elini sehpaya ya da öndeki dizine daya, sırt düz.", "Dambılı kalçana doğru çek.", "Aşağıda kürek kemiğinin öne uzanmasına izin ver."], h: ["Gövdeyi döndürüp savurmak"], q: "single arm dumbbell row" });
x("bbrow", { n: "Barla Eğilerek Kürek", en: "Barbell bent-over row", c: "ust", pat: "hpull", eq: "barbell", lv: "2-3", st: "back:2", t: "w", pr: 8,
  d: "Ağır çekiş kuvveti: sırt, arka omuz ve kavrama.", s: ["Barı al, kalçadan 45° öne eğil, dizler bükük.", "Barı göbek hizasına çek.", "Kontrollü indir; sırt düz."], inj: { back: "Bel sorununda tek kol dambıl row tercih et." }, q: "barbell bent over row" });
x("cablerow", { n: "Kablo Kürek", en: "Seated cable row", c: "ust", pat: "hpull", eq: "cable", lv: "1-3", t: "w", pr: 7,
  d: "Makinede kontrollü sırt çekişi.", s: ["Dik otur, tutacağı göbeğine doğru çek.", "Kürek kemiklerini sık, yavaş bırak."], q: "seated cable row" });
x("bandpd", { n: "Bantla Aşağı Çekiş", en: "Band lat pulldown", c: "ust", pat: "vpull", eq: "band+anchor|band+pullbar", lv: "1-1", t: "r", pr: 3,
  d: "Bantla dikey çekiş; bant baş üstünde barfiks demirine ya da sağlam bir yere bağlanır.", s: ["Bandı barfiks demirine ya da başının üstünde sağlam bir yere geçir; altında diz çök.", "Dirsekleri kaburgalarına doğru çek.", "Yavaş bırak."], q: "band lat pulldown" });
x("latpd", { n: "Sırt Çekiş Makinesi", en: "Lat pulldown", c: "ust", pat: "vpull", eq: "latmach", lv: "1-3", st: "shoulder:1", t: "w", pr: 7,
  d: "Makinede barfiks hareketi.", s: ["Barı omuzdan geniş tut.", "Göğsün üstüne doğru çek, dirsekler aşağı.", "Yavaş bırak."], q: "lat pulldown form" });
x("pullneg", { n: "Negatif Barfiks", en: "Negative pull-up", c: "amut", pat: "vpull", eq: "pullbar", lv: "1-2", st: "shoulder:1,elbow:1", t: "r", pr: 6,
  d: "Barfiks sayısını en hızlı artıran yöntem: sadece iniş.", s: ["Zıplayarak ya da bir basamaktan çeneni barın üstüne getir.", "5 sn boyunca yavaşça tam asılmaya in.", "Yere in, tekrarla."], q: "negative pull ups" });
x("bandpull", { n: "Bant Yardımlı Barfiks", en: "Band-assisted pull-up", c: "amut", pat: "vpull", eq: "pullbar+band", lv: "1-2", st: "shoulder:1", t: "r", pr: 7,
  d: "Kalın bant çok, ince bant az yardım eder. 8 temiz tekrar olunca daha ince banda geç.", s: ["Bandı bara bağla, dizini ya da ayağını içine koy.", "Önce kürek kemiklerini, sonra dirsekleri çek.", "Kontrollü tam in."], q: "band assisted pull up" });
x("pullup", { n: "Barfiks", en: "Pull-up", c: "amut", pat: "vpull", eq: "pullbar", lv: "2-3", st: "shoulder:2,elbow:1", t: "r", pr: 9,
  d: "Temel çekiş kuvveti.", s: ["Omuzdan biraz geniş tut, avuçlar öne.", "Önce kürek kemikleri, sonra dirsekler kaburgaya.", "Çene bar üstü; kontrollü tam in."], h: ["Yarım tekrar", "Bacak savurmak"], q: "strict pull up technique" });
x("chinup", { n: "Ters Tutuş Barfiks", en: "Chin-up", c: "amut", pat: "vpull", eq: "pullbar", lv: "2-3", st: "elbow:2,shoulder:2", t: "r", pr: 8,
  d: "Avuçlar sana dönük barfiks; biseps daha çok yardım eder.", s: ["Avuçlar yüzüne dönük, omuz genişliğinde tut.", "Göğsünü bara doğru çek.", "Kontrollü tam in."], inj: { elbow: "Dirsek sorununda normal barfiks veya nötr tutuş tercih et." }, q: "chin up technique" });

// ================= KALİSTENİK BECERİ (AMUT) =================
x("pikehold", { n: "Ters V Tutuş", en: "Pike hold", c: "amut", pat: "skill_hs", lv: "1-1", st: "wrist:2,shoulder:1", t: "s", pr: 5,
  d: "Amuda hazırlık: ağırlığı ellere almayı öğretir.", s: ["Ters V pozisyonuna geç.", "Yeri iterek omuzları kulaklara doğru uzat.", "Ağırlığı yavaşça ellere kaydır."], q: "pike hold handstand prep" });
x("wallpike", { n: "Duvarda Ters V Tutuş", en: "Wall pike hold", c: "amut", pat: "skill_hs", lv: "1-2", st: "wrist:2,shoulder:2", t: "s", pr: 6,
  d: "Kalça omuzların üstünde, vücut L şeklinde: amut yüküne ilk adım.", s: ["Sırtın duvara dönük, eller duvardan bir bacak boyu uzakta.", "Ayakları duvarda kalça hizasına kadar yürüt.", "Kollar düz, omuzlar kulağa itili.", "Ayakları tek tek indir."], q: "wall pike hold" });
x("wallwalk", { n: "Duvara Yürüme", en: "Wall walk", c: "amut", pat: "skill_hs", lv: "2-3", st: "wrist:2,shoulder:2", t: "x", pr: 6,
  d: "Amut için kuvvet ve güven.", s: ["Şınav pozisyonu, ayaklar duvar dibinde.", "Ayakları duvarda yukarı, elleri duvara doğru yürüt.", "Rahat olduğun yüksekliğe kadar çık, aynı yoldan in."], h: ["Belin çökmesi"], q: "wall walk" });
x("ctw", { n: "Duvara Dönük Amut", en: "Chest-to-wall handstand", c: "amut", pat: "skill_hs", lv: "2-3", st: "wrist:2,shoulder:2", t: "s", pr: 7,
  d: "Doğru amut hattını öğreten ana hareket.", s: ["Duvara yürüyerek çık, eller duvardan 10-20 cm.", "Kollar düz, omuzlar kulaklara itili, kaburgalar içeride.", "Ayak uçları duvarda, vücut düz çizgi."], i: ["Parmaklarla yeri kavra"], h: ["Muz gibi bel kavisi"], q: "chest to wall handstand" });
x("kickup", { n: "Tekme ile Amuda Çıkış", en: "Handstand kick-up", c: "amut", pat: "skill_hs", lv: "3-3", st: "wrist:2,shoulder:2", t: "x", pr: 6,
  d: "Serbest amuda geçişin ilk adımı.", s: ["Ellerini duvardan 20-30 cm uzağa koy.", "Arka bacağı yukarı savur, ön bacak takip etsin.", "Topuklar duvara hafifçe değsin; birini ayırmayı dene."], i: ["Düşerken yana dönerek in; önce yerde prova et"], q: "handstand kick up" });

// ================= CORE =================
x("hollow", { n: "Kayık Tutuşu", en: "Hollow body hold", c: "core", pat: "core", lv: "1-3", t: "s", pr: 6,
  d: "Amudun ve tüm kalistenik hareketlerin gövde şekli.", s: ["Sırtüstü yat, belini yere bastır.", "Kollar baş üstünde, bacaklar düz; ikisini de yerden kaldır.", "Bel kalkarsa dizleri kır."], q: "hollow body hold" });
x("plank", { n: "Plank", en: "Plank", c: "core", pat: "core", lv: "1-3", st: "shoulder:1", t: "s", pr: 5,
  d: "Gövde sertliği. Kısa ve çok sıkı tutmak, uzun ve gevşek tutmaktan iyidir.", s: ["Önkollar yerde, dirsekler omuz altında.", "Kalça, karın ve bacaklar sıkı; düz çizgi."], h: ["Kalçanın düşmesi"], q: "plank proper form" });
x("sideplank", { n: "Yan Plank", en: "Side plank", c: "core", pat: "core_lat,prehab_back", lv: "1-3", st: "shoulder:1", t: "s", pr: 6, uni: true,
  d: "Yan karın ve kalça: gövde dengesi.", s: ["Dirsek omuzun altında, ayaklar üst üste.", "Kalçayı kaldır, düz çizgi."], i: ["Zorsa alttaki dizi yere koy"], q: "side plank" });
x("deadbug", { n: "Sırtüstü Çapraz Uzanma", en: "Dead bug", c: "core", pat: "core,prehab_back", lv: "1-2", t: "r", pr: 5, uni: true,
  d: "Beli koruyarak derin karın kasları.", s: ["Sırtüstü; kollar tavana, dizler 90° yukarıda.", "Karşı kol ve bacağı yavaşça uzat, bel yerde.", "Geri getir, taraf değiştir."], q: "dead bug exercise" });
x("hkr", { n: "Asılı Diz / Bacak Kaldırma", en: "Hanging knee / leg raise", c: "core", pat: "core", eq: "pullbar", lv: "1-3", st: "shoulder:1", t: "r", pr: 7,
  d: "Alt karın ve kavrama birlikte.", s: ["Bara asıl, omuzlar aktif.", "Dizleri göğse çek; ilerledikçe bacakları düz kaldır.", "Sallanmadan indir."], q: "hanging knee raise" });
x("pallof", { n: "Dönmeye Direnç İtişi", en: "Pallof press", c: "core", pat: "core_lat", eq: "band+anchor|cable", lv: "1-3", t: "r", pr: 6, uni: true,
  d: "Dönmeye direnç: yumruk ve tekmede gövde kontrolü.", s: ["Bandı göğüs hizasında yandaki sağlam bir yere bağla (salonda kablo).", "Bandı göğsünden ileri it, gövde dönmesin.", "2 sn tut, geri getir."], q: "pallof press band" });
x("mountain", { n: "Dağcı Hareketi", en: "Mountain climbers", c: "kondisyon", pat: "cond", lv: "1-3", imp: 1, st: "wrist:2", t: "x", pr: 4,
  d: "Aletsiz kondisyon ve karın.", s: ["Şınav pozisyonu.", "Dizleri sırayla göğse hızlı çek.", "Kalça sabit."], q: "mountain climbers form" });
x("knuckleplank", { n: "Yumruk Plank + Omuz Dokunma", en: "Knuckle plank shoulder taps", c: "boks", pat: "core_lat,prehab_wr", lv: "1-3", st: "wrist:1", t: "s", pr: 4,
  d: "Bilek ve yumruk hattını güçlendirir; sert vuruşta bileğin bükülmemesi için.", s: ["Yumruklar üstünde şınav pozisyonu, bilekler düz.", "Önce sadece tut; ilerledikçe sırayla karşı omza dokun.", "Kalça sabit."], q: "knuckle plank" });
x("suitcase", { n: "Tek El Taşıma", en: "Suitcase carry", c: "kavrama", pat: "carry,core_lat,grip", eq: "db|kb|barbell", lv: "1-3", t: "w", pr: 7, uni: true,
  d: "Kavrama ve yan karın: yana eğilmeye direnmek.", s: ["Ağırlığı tek elinle al.", "Dik dur, eğilmeden yürü.", "Taraf değiştir."], h: ["Yükün tarafına eğilmek"], q: "suitcase carry" });
x("farmer", { n: "İki Elde Ağırlıkla Yürüme", en: "Farmer's walk", c: "kavrama", pat: "carry,grip", eq: "db|kb", lv: "1-3", t: "w", pr: 6,
  d: "İki elde ağırlıkla yürüme: kavrama, omuz ve karın.", s: ["İki ağırlığı yanlarda tut.", "Dik, kısa ve hızlı adımlarla yürü.", "Ağırlığı yere kontrollü bırak."], q: "farmers walk" });

// ================= BOKS & GÜÇ =================
x("powershot", { n: "Torba Güç Vuruşu", en: "Heavy bag power shots", c: "boks", pat: "box_pow", eq: "bag", lv: "1-3", st: "wrist:2,shoulder:1", t: "x", pr: 9,
  d: "Nakavt gücü için tek ve maksimum niyetli vuruşlar.", s: ["Tam boks duruşu, sıfırlan.", "Ayak, kalça, omuz, yumruk sırasıyla tek sert vuruş; nefesi kısa ver.", "Gard; 3-5 sn bekle, tekrarla."], i: ["Torbanın 5-10 cm içine vurmayı hedefle"], h: ["Yorgunken seri vuruş", "Kalçayı kullanmamak"],
  inj: { wrist: "Bandajı mutlaka sar; bilek sorunun varsa güç vuruşlarını az ve kontrollü tut." }, q: "how to punch harder heavy bag" });
x("baground", { n: "Torba Raundu", en: "Heavy bag rounds", c: "boks", pat: "box_round,cond", eq: "bag", lv: "1-3", st: "wrist:1", t: "x", pr: 9,
  d: "Boksa özgü kondisyon.", s: ["Her raundun bir teması olsun (notlara bak).", "Hareket et, gardı koru; son 30 sn tempoyu artır.", "Dinlenmede yürü, burundan nefes al."], q: "heavy bag workout rounds" });
x("shadowround", { n: "Gölge Boks Raundu", en: "Shadow boxing rounds", c: "boks", pat: "box_round,cond", lv: "1-3", t: "x", pr: 5,
  d: "Torba yoksa raund çalışması: ayak, savunma ve kombinasyon.", s: ["Raund boyunca sürekli hareket et.", "Kombinasyon, savunma (eğilme, kayma) ve ayak oyunu karıştır.", "Son 30 sn hızlı düz yumruklar."], q: "shadow boxing workout rounds" });
x("flurry", { n: "Yumruk Yağmuru", en: "Punch flurries", c: "kondisyon", pat: "cond", eq: "bag", lv: "1-3", st: "wrist:1", t: "x", pr: 6,
  d: "Kısa ve çok hızlı düz yumruk serileri.", s: ["Torbaya yakın dur; kısa hızlı düz yumruklar.", "Süre boyunca durma, eller yukarıda."], q: "heavy bag flurry drill" });
x("bandpunch", { n: "Bantlı Yumruk", en: "Band-resisted punches", c: "boks", pat: "box_pow,upow", eq: "band", lv: "1-3", st: "shoulder:1", t: "x", pr: 5, uni: true,
  d: "Bant sırttan dolanır, yumruğa direnç verir: itiş hızı ve gücü. Bağlama yeri gerekmez.", s: ["Halka bandı sırtından, kürek kemiklerinin hizasından dola; iki ucunu yumruklarınla tut.", "Boks duruşunda kros at, kalçayı döndür.", "Kontrollü geri al; setin sonunda diğer kol."], q: "resistance band punches" });
x("mbchest", { n: "Sağlık Topu Göğüs Pası", en: "Medicine ball chest pass", c: "boks", pat: "upow,box_pow", eq: "medball", lv: "1-3", t: "x", pr: 7,
  d: "Duvara patlayıcı itiş: yumruk gücüne aktarılır.", s: ["Duvarın önünde, top göğüste.", "Adım atarak topu duvara olabildiğince hızlı fırlat.", "Tut, sıfırlan."], q: "medicine ball chest pass wall" });
x("mbrot", { n: "Sağlık Topu Rotasyon Atışı", en: "Medicine ball rotational throw", c: "boks", pat: "rot", eq: "medball", lv: "1-3", st: "back:1", t: "x", pr: 8, uni: true,
  d: "Kalçadan başlayan dönüş gücü: yumruğun ve tekmenin motoru.", s: ["Duvara yan dur, top arka kalçada.", "Arka ayağı döndürüp kalçayı patlatarak topu duvara fırlat.", "Tut, sıfırlan."], q: "medicine ball rotational throw" });
x("mbslam", { n: "Top Çarpma", en: "Medicine ball slam", c: "kondisyon", pat: "cond", eq: "medball", lv: "1-3", st: "back:2", t: "x", pr: 6,
  d: "Tüm vücut patlayıcı kondisyon.", s: ["Topu baş üstüne kaldır.", "Karnı sıkarak yere olabildiğince sert çarp.", "Al, tekrarla."], q: "medicine ball slam" });
x("lmrot", { n: "Köşe Barıyla Dönüş", en: "Landmine rotation", c: "boks", pat: "rot", eq: "barbell+landmine", lv: "2-3", st: "back:1", t: "w", pr: 7, uni: true,
  d: "Kalçadan dönüş gücü. Barın bir ucu landmine aparatında ya da sağlam bir köşede sabit.", s: ["Barın plakalı ucunu iki elle göğüs önünde tut.", "Barı yay çizerek bir kalçanın yanına indir; arka ayağı döndür.", "Kalçayı döndürerek karşı tarafa taşı."], q: "landmine rotation" });
x("lmpunch", { n: "Köşe Barıyla Yumruk", en: "Landmine punch", c: "boks", pat: "upow,box_pow", eq: "barbell+landmine", lv: "2-3", st: "shoulder:1", t: "w", pr: 7, uni: true,
  d: "Yüklü yumruk hareketi; hemen ardından torbada güç vuruşu (kontrast). Barın bir ucu landmine aparatında ya da sağlam bir köşede sabit.", s: ["Barın ucunu arka elinle omuz önünde tut, boks duruşu.", "Arka ayağı döndürüp kalçayı çevir, barı kros gibi ileri it.", "Kontrollü geri al."], q: "landmine punch" });
x("sprawl", { n: "Yere Kapanıp Kalkma", en: "Sprawl", c: "kondisyon", pat: "cond", lv: "1-3", imp: 2, st: "wrist:1,knee:1,back:1", t: "x", pr: 6,
  d: "Dövüş sporu kondisyonu; burpee'nin dizlere daha dost hali.", s: ["Gard pozisyonundan ellerini yere koy.", "Bacakları geriye fırlat, kalçayı yere bastır.", "Bacakları hızla geri çek, gard pozisyonuna dön."], q: "sprawl drill" });
x("burpee", { n: "Burpee", en: "Burpee", c: "kondisyon", pat: "cond", lv: "2-3", imp: 2, st: "wrist:2,knee:1", t: "x", pr: 5,
  d: "Tüm vücut kondisyon hareketi.", s: ["Çömel, elleri yere koy.", "Bacakları geri at, şınav pozisyonu.", "Bacakları geri çek, yukarı sıçra."], q: "burpee proper form" });
x("ladder", { n: "Merdiven Drilleri", en: "Agility ladder drills", c: "kondisyon", pat: "cond,footwork", eq: "ladder", lv: "1-3", imp: 1, t: "x", pr: 6,
  d: "Ayak hızı, ritim ve koordinasyon.", s: ["Tek adım: her kareye bir ayak.", "İçeri-içeri: her kareye iki ayak.", "Yanlamasına içeri-içeri, sonra içeri-dışarı."], q: "agility ladder drills beginner" });
x("bikeint", { n: "Kardiyo Makinesi İntervali", en: "Cardio machine intervals", c: "kondisyon", pat: "cond", eq: "cardio", lv: "1-3", imp: 0, t: "x", pr: 7,
  d: "Bisiklet, kürek veya koşu bandında darbesiz aralıklı antrenman.", s: ["İş süresinde zorlayıcı tempo (konuşamazsın).", "Dinlenmede çok hafif devam et."], q: "exercise bike interval workout" });
x("z2", { n: "Rahat Tempo Yürüyüş / Hafif Koşu (Zone 2)", en: "Zone 2 cardio", c: "kondisyon", pat: "z2", lv: "1-3", imp: 0, t: "x", pr: 6,
  d: "Aerobik taban: yağ yakımı, toparlanma ve kondisyonun temeli.", s: ["Rahat tempo: nabzı kişisel zone 2 aralığında tut (Profil › Kilo ve nabız).", "Konuşma testi: cümle kurabiliyorsun ama şarkı söyleyemiyorsun.", "Kilon yüksekse koşu yerine hızlı ya da yokuş yürüyüşü yap."], q: "zone 2 training explained" });
x("z2m", { n: "Rahat Tempo Kardiyo Makinesi (Zone 2)", en: "Zone 2 on bike / rower / treadmill", c: "kondisyon", pat: "z2", eq: "cardio", lv: "1-3", imp: 0, t: "x", pr: 7,
  d: "Makinede aerobik taban; eklemleri yormaz.", s: ["Nabzı zone 2 aralığında tut.", "Konuşabileceğin tempoda devam et."], q: "zone 2 cycling" });

// ================= KAVRAMA =================
x("hang", { n: "Ölü Asılma", en: "Dead hang", c: "kavrama", pat: "grip", eq: "pullbar", lv: "1-3", st: "shoulder:1", t: "s", pr: 7,
  d: "Kavrama dayanıklılığı, omuz ve kanat açılımı.", s: ["Barı omuz genişliğinde tut, ayaklarını yerden kes.", "Aktif: omuzları hafifçe aşağı çek. Pasif: tamamen gevşe.", "Süreyi kaydet."], i: ["Başparmak barı sarsın"], q: "dead hang" });
x("towel", { n: "Havlu Asılma", en: "Towel hang", c: "kavrama", pat: "grip", eq: "pullbar", lv: "2-3", st: "shoulder:1", t: "s", pr: 6,
  d: "Kalın ve kayan tutuş: kavramayı en hızlı geliştiren hareketlerden.", s: ["Bir havluyu bara as.", "Önce bir el havluda bir el barda, sonra iki el havluda.", "Süre boyunca asıl."], q: "towel hang grip" });
x("pinch", { n: "Plaka Sıkıştırma", en: "Plate pinch", c: "kavrama", pat: "grip", eq: "barbell", lv: "1-3", t: "s", pr: 5,
  d: "Parmak ve başparmak kuvveti.", s: ["İki plakayı düz yüzleri dışa gelecek şekilde birleştir.", "Parmaklar bir tarafta, başparmak diğerinde; sıkıştırarak kaldır.", "Süre boyunca tut."], q: "plate pinch grip" });
x("wcurl", { n: "Bilek Bükme", en: "Wrist curl", c: "kavrama", pat: "grip,prehab_wr", eq: "db|barbell", lv: "1-3", t: "w", pr: 4,
  d: "Önkolun iç yüzü ve kavrama.", s: ["Önkollarını uyluklarına koy, avuçlar yukarı.", "Ağırlığı parmak uçlarına kadar indir, bileği kıvırarak kaldır."], q: "wrist curl" });
x("rwcurl", { n: "Ters Bilek Bükme", en: "Reverse wrist curl", c: "kavrama", pat: "grip,prehab_wr", eq: "db|barbell", lv: "1-3", t: "w", pr: 4,
  d: "Önkolun dış yüzü; bilek dengesi ve dirsek sağlığı.", s: ["Önkollar uyluk üstünde, avuçlar aşağı.", "Bileği yukarı kaldır, yavaş indir."], q: "reverse wrist curl" });
x("revcurl", { n: "Ters Tutuş Pazı Bükme", en: "Reverse curl", c: "kavrama", pat: "grip", eq: "barbell|db", lv: "1-3", st: "elbow:1", t: "w", pr: 5,
  d: "Önkol ve biseps; yumrukta bileği sabitleyen kaslar.", s: ["Ağırlığı avuçlar aşağı bakacak şekilde tut.", "Dirsekler sabit, omuzlara kaldır.", "Yavaş indir."], q: "reverse curl" });
x("towelwring", { n: "Havlu Burma", en: "Towel wring", c: "kavrama", pat: "grip,prehab_wr", lv: "1-3", t: "s", pr: 3,
  d: "Aletsiz kavrama: havluyu iki elle ters yönlere bura. Islak havlu daha zor.", s: ["Havluyu rulo yap, iki elle omuz genişliğinde tut.", "Elleri ters yönlere çevirerek havluyu olabildiğince sert bur, süre boyunca gevşetme.", "Sonraki sette yönü değiştir."], i: ["Dirsekler gövdeye yakın, omuzlar gevşek"], h: ["Nefesi tutmak"],
  inj: { wrist: "Bilek ağrısında hafif bur; ağrı olursa bırak." } });
x("lever", { n: "Dambıl Kaldıraç", en: "Dumbbell leverage", c: "kavrama", pat: "grip,prehab_wr", eq: "db", lv: "1-3", t: "r", pr: 5, uni: true,
  d: "Bileğin yan kuvveti; sert vuruşta bileğin bükülmesini engeller.", s: ["Ayarlı dambılda sapın sadece bir ucuna plaka tak; sabit dambılda dambılı bir başının dibinden tut.", "Boş ucundan tut, kol yanında.", "Plakalı ucu sadece bileği hareket ettirerek kaldır; öne ve arkaya."], i: ["Elini plakadan uzaklaştırdıkça zorlaşır"],
  inj: { wrist: "Çok hafif başla; ağrısızsa yavaşça ilerlet." }, q: "dumbbell leverage wrist" });

// ================= ESNEKLİK =================
const F = (id, n, en, d, s, q, o) => x(id, Object.assign({ n, en, c: "esneklik", pat: "mob", d, s, q }, o || {}));
F("f9090", "90/90 Kalça Geçişi", "90/90 hip switch", "Kalçanın iç ve dış rotasyonu.", ["Otur; bir bacak önde, diğeri yanda, iki diz de 90°.", "Dizleri yavaşça diğer tarafa çevir.", "Göğüs dik."], "90 90 hip switch", { st: "knee:1" });
F("couch", "Duvar Dibi Kalça Önü Esnemesi", "Couch stretch", "Kalça önü ve ön bacak.", ["Arka dizini duvar-zemin köşesine koy, kaval duvara dayalı.", "Ön ayak yerde; kalçayı sık, gövdeyi dikleştir."], "couch stretch", { st: "knee:2" });
F("pigeon", "Güvercin", "Pigeon stretch", "Kalça dış yüzü.", ["Ön bacağın kaval kemiği önünde çapraz, arka bacak geride düz.", "Kalçalar yere paralel; gövdeyi öne indir."], "pigeon stretch", { st: "knee:2" });
F("deepsq", "Derin Çömelme Bekleme", "Deep squat hold", "Kalça, ayak bileği ve bel için günlük hareketlilik.", ["Topuklar yerde tam çömel.", "Dirseklerle dizleri dışa it, göğüs dik.", "Zorsa bir şeye tutun."], "deep squat hold", { st: "knee:2" });
F("pikefold", "Ayakta Öne Eğilme", "Standing forward fold", "Arka bacak.", ["Ayaklar bitişik, dizler düz ama kilitli değil.", "Kalçadan katlan.", "Nefes verirken biraz daha in."], "standing pike stretch", { st: "back:1" });
F("frog", "Kurbağa", "Frog stretch", "İç bacak.", ["Dört ayak pozisyonunda dizleri yana aç.", "Kalçayı yavaşça geriye it."], "frog stretch", { st: "knee:1" });
F("butterfly", "Kelebek", "Butterfly stretch", "İç bacak ve kalça.", ["Otur, ayak tabanlarını birleştir.", "Dizleri yere bırak, sırt dik öne eğil."], "butterfly stretch");
F("doorpec", "Kapıda Göğüs Esnemesi", "Doorway pec stretch", "Göğüs ve omuz önü.", ["Ön kolunu kapı kasasına koy, dirsek omuz hizasında.", "Öne adım at, göğsü aç."], "doorway pec stretch", { st: "shoulder:1" });
F("childlat", "Çocuk Pozunda Kanat Esnemesi", "Child's pose lat stretch", "Kanat (lat) kası ve omuz.", ["Dizlerinin üstüne otur, kolları önde uzat.", "Elleri bir yana yürüt, karşı kanat esner; sonra tersi."], "child pose lat stretch");
F("thread", "İğne Geçirme", "Thread the needle", "Sırtın üst bölümünde rotasyon.", ["Dört ayak pozisyonunda bir kolu diğerinin altından geçir.", "Omuz yere değsin, sonra kolu tavana aç."], "thread the needle stretch");
F("sleeper", "Yan Yatarak Omuz Esnemesi", "Sleeper stretch", "Omuzun iç rotasyonu.", ["Esneyecek omuz altta, yan yat; dirsek omuz hizasında 90°.", "Diğer elinle önkolu nazikçe yere bastır.", "Hafif gerilme, ağrı yok."], "sleeper stretch", { st: "shoulder:2" });
F("bridgeF", "Köprü Progresyonu", "Bridge progression", "Omuz, göğüs ve sırt açılımı.", ["Başlangıç: kalça köprüsü tutuşu.", "Orta: masa pozu.", "İleri: tam köprü."], "bridge progression beginner", { st: "wrist:2,back:2" });
F("lizard", "Kertenkele", "Lizard stretch", "Kalça önü ve iç bacak.", ["Derin hamle, ön ayak ellerin dışında.", "Kalçayı aşağı bırak."], "lizard stretch", { st: "knee:1" });
F("halfsplit", "Yarım Spagat", "Half split", "Arka bacak ve ön spagat hazırlığı.", ["Arka diz yerde, ön bacak düz.", "Kalçayı geri it, sırt düz öne eğil."], "half split stretch");
F("frontsplit", "Ön Spagat Progresyonu", "Front split progression", "Kalça önü ve arka bacak.", ["Yarım spagattan ön ayağı ileri kaydır.", "Ellerin altına yastık koy.", "Gerilme 10 üzerinden 6."], "front split progression", { st: "hip:2,knee:1" });
F("cossack", "Kazak Squat", "Cossack squat", "İç bacak esnekliği ve tek bacak kuvveti.", ["Geniş dur; bir bacağa çök, diğeri düz.", "Taraf değiştir."], "cossack squat", { st: "knee:2" });
F("pancake", "Bacaklar Açık Öne Eğilme", "Pancake stretch", "Yan açılma ve arka bacak.", ["Otur, bacaklar geniş açık.", "Sırt düz, kalçadan öne eğil.", "5 sn bacakları yere bastır, gevşe, derinleş."], "pancake stretch", { st: "hip:1" });
F("wallstraddle", "Duvarda V", "Wall straddle", "Pasif yan açılma.", ["Sırtüstü, kalça duvar dibinde, bacaklar duvarda.", "Bacakları V şeklinde aç, 2-3 dk rahat nefes."], "wall straddle stretch");
F("passivehang", "Pasif Asılma", "Passive hang", "Omuz ve kanat açılımı, omurga gevşemesi.", ["Bara asıl, omuzları tamamen bırak.", "Rahat nefes al."], "passive hang shoulder", { eq: "pullbar", st: "shoulder:1" });
F("akis", "Uzun Esneklik Akışı", "Full-body flexibility flow", "A, B ve C rutinlerinin kısaltılmış hali: tüm vücut için tek akış.", ["Rutin A (kalça, arka bacak) hareketlerini yarım süreyle yap.", "Rutin B (omuz, sırt, bilek) ile devam et.", "Rutin C (spagat, pancake) ile bitir; son birkaç dakikada kas-gevşe tekniği: 5 sn kasıl, 10 sn gevşe ve derinleş."], "full body flexibility routine follow along");

// Esneklik rutinleri (akşam, evde)
// ================= EK: DİZÜSTÜ ŞINAV VE İZOLE HAREKETLER (kas hedefi) =================
x("kneepush", { n: "Dizüstü Şınav", en: "Knee push-up", c: "ust", pat: "hpush", lv: "1-1", st: "wrist:1", t: "r", pr: 6,
  d: "Tam şınava hazırlık: dizler yerde, gövde tek parça.", s: ["Dizlerini yere koy, eller omuz genişliğinden biraz geniş.", "Dizden başa düz bir çizgi kur, karnını sık.", "Göğsünü yere yaklaştır, iterek kalk."], i: ["Kalçayı kırma; gövde tek parça insin çıksın"], h: ["Kalçayı havaya dikmek", "Yarım inmek"] });
x("dbcurl", { n: "Dambılla Pazı Bükme", en: "Dumbbell biceps curl", c: "ust", pat: "arm_flex", eq: "db|kb", lv: "1-3", st: "elbow:1", t: "w", pr: 5,
  d: "Ön kol kası (pazı) için izole hareket.", s: ["Dik dur, dambıllar yanda, avuçlar öne.", "Dirsekleri gövdede sabit tutarak dambılları omza doğru kaldır.", "2-3 saniyede yavaşça indir."], h: ["Gövdeyi sallayarak kaldırmak", "Dirsekleri öne kaçırmak"] });
x("bandcurl", { n: "Bantla Pazı Bükme", en: "Band biceps curl", c: "ust", pat: "arm_flex", eq: "band", lv: "1-3", st: "elbow:1", t: "r", pr: 4,
  d: "Bantla pazı çalışması.", s: ["Bandın ortasına iki ayakla bas, uçları avuçlar öne bakacak şekilde tut.", "Dirsekler sabit, ellerini omza doğru kaldır.", "Yavaşça geri bırak."], h: ["Bandı sallayarak çekmek"] });
x("ohext", { n: "Dambılla Baş Üstü Arka Kol", en: "Overhead dumbbell triceps extension", c: "ust", pat: "arm_ext", len: "uzun", eq: "db|kb", lv: "1-3", st: "elbow:1,shoulder:1", t: "w", pr: 5,
  d: "Arka kol kası (triceps) için izole hareket.", s: ["Bir dambılı iki elle baş üstünde tut.", "Dirsekler tavana bakarken dambılı başının arkasına indir.", "Dirsekleri açarak yukarı it."], h: ["Dirsekleri yana açmak", "Beli boşluğa düşürmek"] });
x("bandohext", { n: "Bantla Baş Üstü Arka Kol", en: "Band overhead triceps extension", c: "ust", pat: "arm_ext", len: "uzun", eq: "band", lv: "1-3", st: "elbow:1,shoulder:1", t: "r", pr: 3,
  d: "Bantla baş üstü arka kol çalışması; dambıl baş üstü triceps ile aynı pozisyon (kol baş üstünde, kas uzamış).", s: ["Bandın bir ucuna arka ayağınla bas ya da bandı alçak bir yere bağla; sırtın banda dönük.", "Bandı iki elle başının arkasında tut, dirsekler tavana baksın.", "Dirsekleri açarak elleri yukarı it, üstte 1 saniye bekle.", "2-3 saniyede başının arkasına indir."], i: ["Dirsekler kulak hizasında sabit"], h: ["Dirsekleri yana açmak", "Beli boşluğa düşürmek"] });
x("bandpushdown", { n: "Bantla Arka Kol İtişi", en: "Band triceps pushdown", c: "ust", pat: "arm_ext", len: "notr", eq: "band+anchor|band+pullbar", lv: "1-3", st: "elbow:1", t: "r", pr: 4,
  d: "Bantla arka kol çalışması; bant baş hizasının üstünde bir yere bağlanır.", s: ["Bandı barfiks demirine ya da kapı ankrajıyla kapının üstüne geçir.", "Dirsekler gövdeye yapışık, bandı aşağı iterek kolları düzleştir.", "Yavaşça geri bırak."], h: ["Omuzları öne düşürmek"] });
x("chairdip", { n: "Sandalyede Arka Kol İtişi", en: "Bench / chair dips", c: "ust", pat: "arm_ext", lv: "1-2", st: "shoulder:2,wrist:1", t: "r", pr: 4,
  d: "Aletsiz arka kol çalışması. Omzu hassas olanlara uygun değil.", s: ["Sağlam bir sandalyenin kenarına ellerini koy, kalça sandalyenin önünde.", "Dirsekleri geriye bükerek 90 dereceye kadar in.", "Kollarla iterek kalk."], h: ["Omuz öne düşecek kadar derin inmek"] });
x("latraise", { n: "Dambıl Yana Açış", en: "Dumbbell lateral raise", c: "ust", pat: "delt", eq: "db|kb", lv: "1-3", st: "shoulder:1", t: "w", pr: 5,
  d: "Omzun yan kısmı için izole hareket; omuzları genişletir.", s: ["Dambıllar yanda, dirsekler hafif bükük.", "Kolları omuz hizasına kadar yana kaldır.", "2-3 saniyede indir."], h: ["Ağırlığı sallayarak kaldırmak", "Omuzları kulaklara çekmek"] });
x("bandlatraise", { n: "Bant Yana Açış", en: "Band lateral raise", c: "ust", pat: "delt", eq: "band", lv: "1-3", st: "shoulder:1", t: "r", pr: 4,
  d: "Bantla omzun yan kısmı.", s: ["Bandın ortasına bas, uçlarını iki elle tut.", "Kolları omuz hizasına kadar yana aç.", "Yavaşça indir."], h: ["Omuzları kulaklara çekmek"] });
x("reardelt", { n: "Eğilerek Arka Omuz", en: "Bent-over rear delt fly", c: "ust", pat: "delt", eq: "db|band", lv: "1-3", st: "back:1", t: "w", pr: 4,
  d: "Arka omuz ve kürek kemiği; duruş için iyi.", s: ["Kalçadan öne eğil, sırt düz, dambıllar aşağıda.", "Kolları hafif bükük yana aç, kürek kemiklerini sık.", "Yavaşça indir."], h: ["Sırtı yuvarlamak"] });
x("legext", { n: "Bacak Açma Makinesi", en: "Leg extension machine", c: "alt", pat: "quad_iso", len: "notr", eq: "legmach", lv: "1-3", st: "knee:2", t: "w", pr: 4,
  d: "Makinede ön bacak (quadriceps) izole.", s: ["Pedi ayak bileğinin hemen üstüne ayarla.", "Bacakları düzleştir, üstte 1 saniye bekle.", "Yavaşça indir."], h: ["Ağırlığı savurmak"] });

// ================= EK: ALTERNATİFLER (2026-10-03) =================
// Makinesi olmayan, yalnız dambılı ya da yalnız bandı olan ve landmine'ı olmayan biri için aynı kalıpta karşılıklar.
// len yalnız kasın boyu net olan izole hareketlerde (kalça açıkken diz bükülü = ön bacak uzamış).
x("hkpress", { n: "Yarım Diz Tek Kol Omuz Press", en: "Half-kneeling single-arm dumbbell press", c: "ust", pat: "vpush", eq: "db|kb", lv: "1-3", st: "shoulder:2", imp: 0, t: "w", pr: 6, uni: true,
  d: "Köşe barı itişinin (landmine press) dambıl ya da kettlebell ile yapılan karşılığı: tek kol, yarım diz; avuç içe bakar ve hafif önden itilir.", s: ["Bir dizin yerde (altına katlı havlu), diğer ayak önde; ağırlık yerdeki dizin tarafındaki elde.", "Ağırlığı omuz önünde tut, avuç içe baksın.", "Karın ve kalça sıkı; yukarı ve hafif öne it.", "Kontrollü indir; setin sonunda taraf değiştir."], i: ["Gövde yana eğilmesin"], h: ["Belden geriye yaslanmak"],
  inj: { shoulder: "Ağrısız aralıkta it; takılma olursa itiş açısını daha öne al." } });
x("bandpress", { n: "Bant Omuz Press", en: "Band overhead press", c: "ust", pat: "vpush", eq: "band", lv: "1-2", st: "shoulder:2", imp: 0, t: "r", pr: 4,
  d: "Bantla baş üstü itiş; bağlama yeri gerekmez.", s: ["Bandın alt ucuna iki ayakla (ya da öndeki ayakla) bas, üst ucunu iki elle omuz hizasında tut.", "Karın sıkı, baş üstüne it.", "Yavaşça indir."], h: ["Belden geriye yaslanmak"] });
x("bandchest", { n: "Bant Göğüs Press", en: "Band chest press (band around back)", c: "ust", pat: "hpush", eq: "band", lv: "1-2", st: "shoulder:1", imp: 0, t: "r", pr: 4,
  d: "Bant sırttan dolanır; ayakta göğüs itişi. Bağlama yeri gerekmez.", s: ["Halka bandı sırtından, kürek kemiklerinin hizasından dola; iki ucunu göğüs hizasında tut.", "Kolları öne iterek düzleştir, 1 sn bekle.", "Yavaşça geri gel."], h: ["Omuzları kulaklara çekmek"] });
x("bandbor", { n: "Bantla Eğilerek Kürek", en: "Band bent-over row", c: "ust", pat: "hpull", eq: "band", lv: "1-2", st: "back:1", imp: 0, t: "r", pr: 5,
  d: "Bantla sırt çekişi; banda ayakla basılır, bağlama yeri gerekmez.", s: ["Bandın ortasına iki ayakla bas, uçlarını tut.", "Kalçadan öne eğil, sırt düz.", "Dirsekleri geriye çek, kürek kemiklerini sık; yavaş bırak."], h: ["Sırtı yuvarlamak"] });
x("dbbor", { n: "Dambıl Eğilerek Kürek", en: "Dumbbell bent-over row", c: "ust", pat: "hpull", eq: "db|kb", lv: "1-3", st: "back:2", imp: 0, t: "w", pr: 6,
  d: "İki kolla eğilerek kürek; sehpa gerekmez.", s: ["Ağırlıkları al, kalçadan 45° öne eğil, dizler hafif bükük.", "Dirsekleri kalçana doğru çek, kürek kemiklerini sık.", "Kontrollü indir; sırt düz."], h: ["Gövdeyi savurmak"],
  inj: { back: "Bel sorununda tek kol dambıl row tercih et (boş el dizde destek)." } });
x("bandsquat", { n: "Bantlı Squat", en: "Band squat", c: "alt", pat: "squat", eq: "band", lv: "1-2", st: "knee:1", imp: 0, t: "r", pr: 4,
  d: "Banda ayakla basılan squat; tepeye doğru zorlaşır.", s: ["Bandın alt ucuna ayaklarınla bas (omuz genişliği), üst ucunu omuz önünde tut.", "Kalça geri ve aşağı, squat'a in.", "Bandı gererek kalk."], h: ["Dizlerin içe çökmesi"] });
x("bandrdl", { n: "Bantlı Romen Deadlift", en: "Band Romanian deadlift", c: "alt", pat: "hinge", eq: "band", lv: "1-2", st: "back:1", imp: 0, t: "r", pr: 4,
  d: "Bantla kalça menteşesi: arka bacak ve kalça.", s: ["Bandın ortasına iki ayakla bas, uçlarını tut.", "Dizler hafif bükük, kalçayı geri iterek öne eğil.", "Kalçayı sıkarak dikleş."], h: ["Beli yuvarlamak"] });
x("bandbridge", { n: "Bantlı Kalça Köprüsü", en: "Banded glute bridge", c: "alt", pat: "hinge", eq: "band", lv: "1-2", imp: 0, t: "r", pr: 4,
  d: "Halka bant dizlerin üstünde; kalça köprüsüne yan kalça da eklenir.", s: ["Halka bandı dizlerinin hemen üstüne geçir.", "Sırtüstü, dizler bükük; dizleri banda karşı hafif dışa it.", "Topuklardan iterek kalçayı kaldır, tepede 2 sn sık."], h: ["Belden kavis yapmak"] });
x("dbbridge", { n: "Dambıl Kalça Köprüsü", en: "Dumbbell glute bridge", c: "alt", pat: "hinge", eq: "db|kb", lv: "1-3", imp: 0, t: "w", pr: 4,
  d: "Sehpa yoksa yüklü kalça köprüsü: yerde, ağırlık kalçanın üstünde.", s: ["Sırtüstü yat, dizler bükük; ağırlığı kalça kemiklerinin üstünde iki elle tut (araya havlu).", "Topuklardan iterek kalçayı kaldır, tepede 2 sn sık.", "Kontrollü in."], h: ["Belden kavis yapmak"] });
x("slidecurl", { n: "Havluyla Kayarak Bacak Bükme", en: "Towel slider leg curl", c: "alt", pat: "hinge", eq: "none", lv: "1-3", st: "knee:1", imp: 0, t: "r", pr: 3,
  d: "Makine yoksa arka bacak (hamstring) için diz bükme. Kaygan zemin (parke, fayans) ve havlu ister.", s: ["Kaygan zeminde sırtüstü yat, topukların altında katlı havlu.", "Kalçayı köprü gibi kaldır.", "Kalça havadayken topuklarla havluyu kalçana doğru çek, sonra yavaşça uzaklaştır."], i: ["Zorsa önce kalçayı indirerek yap"], h: ["Kalçanın düşmesi"] });
x("bandlegcurl", { n: "Ayakta Bantla Bacak Bükme", en: "Standing band leg curl", c: "alt", pat: "hinge", eq: "band", lv: "1-3", st: "knee:1", imp: 0, t: "r", pr: 3, uni: true,
  d: "Bantla arka bacak izole; bandın bir ucuna diğer ayakla basılır.", s: ["Halka bandın bir ucunu yerdeki ayağının altına, diğer ucunu çalışan ayağın bileğine geçir; bir yere tutun.", "Dizini öne kaçırmadan topuğunu kalçana doğru çek.", "Yavaşça indir; setin sonunda taraf değiştir."], h: ["Dizi öne getirmek"] });
x("sissy", { n: "Destekli Geriye Yaslanarak Diz Bükme", en: "Assisted sissy squat", c: "alt", pat: "quad_iso", len: "uzun", eq: "none", lv: "2-3", st: "knee:2", imp: 0, t: "r", pr: 2,
  d: "Makine yoksa ön bacak izole: kalça açık kalırken diz bükülür.", s: ["Kapı kasasına ya da sağlam bir yere tutun, ayaklar kalça genişliğinde.", "Topukları kaldır; dizler öne giderken kalça ve gövde düz bir çizgide geriye yatsın.", "Rahat olduğun derinliğe in, ön bacakla geri kalk."], h: ["Kalçayı kırıp squat'a çevirmek"],
  inj: { knee: "Geçmişte diz sorunu varsa kısa açıyla başla; ağrı olursa bırak." } });
x("revnordic", { n: "Dizüstü Geriye Yatma", en: "Reverse Nordic", c: "alt", pat: "quad_iso", len: "uzun", eq: "none", lv: "2-3", st: "knee:2", imp: 0, t: "r", pr: 2,
  d: "Dizüstünde geriye yatarak ön bacak izole. Açı küçükten başlar.", s: ["Dizlerinin üstüne çök (altına minder ya da katlı havlu), gövde dik.", "Kalça ile omuzlar düz bir çizgide kalarak gövdeyi yavaşça geriye yatır.", "Ön bacakta gerilmeyi hissettiğin yerde dur, aynı yoldan kalk."], i: ["Başlangıçta açıyı küçük tut"], h: ["Kalçayı kırmak"],
  inj: { knee: "Geçmişte diz sorunu varsa çok kısa açıyla başla; ağrı olursa bırak." } });
x("bandlegext", { n: "Bantla Bacak Açma", en: "Band leg extension", c: "alt", pat: "quad_iso", len: "notr", eq: "band", lv: "1-3", st: "knee:1", imp: 0, t: "r", pr: 3, uni: true,
  d: "Sandalyede bantla ön bacak izole; bant oturduğun sandalyenin arka ayağına geçirilir.", s: ["Sandalyeye otur; halka bandı sandalyenin arka ayağına, diğer ucunu ayak bileğine geçir.", "Bacağı düzleştir, üstte 1 sn bekle.", "Yavaşça indir; setin sonunda taraf değiştir."], h: ["Bacağı savurmak"] });
x("calf2", { n: "İki Ayak Baldır Kaldırma", en: "Double-leg calf raise", c: "alt", pat: "calf", eq: "none", lv: "1-2", imp: 0, t: "r", pr: 3,
  d: "Tek bacak baldır kaldırmanın kolay hali.", s: ["İki ayak üstünde, gerekirse bir basamağın kenarında dur; duvara tutun.", "Tamamen parmak ucuna yüksel, 1 sn tut.", "2-3 sn'de topukları indir."] });
x("wcalf", { n: "Ağırlıklı Baldır Kaldırma", en: "Weighted single-leg calf raise", c: "alt", pat: "calf", eq: "db|kb|barbell", lv: "1-3", st: "ankle:1", imp: 0, t: "w", pr: 5, uni: true,
  d: "Tek bacak baldır kaldırma; elde dambıl, kettlebell ya da bir plaka.", s: ["Ağırlığı çalışan bacak tarafındaki elinde tut, diğer elle duvara tutun.", "Tek ayak üstünde, gerekirse basamak kenarında, tamamen parmak ucuna yüksel; 1 sn tut.", "2-3 sn'de topuğu indir; taraf değiştir."] });
x("calfpress", { n: "Bacak İtme Makinesinde Baldır", en: "Leg press calf raise", c: "alt", pat: "calf", eq: "lpmach", lv: "1-3", st: "ankle:1", imp: 0, t: "w", pr: 5,
  d: "Leg press makinesinde baldır.", s: ["Ayak uçlarını platformun alt kenarına koy, dizler düz ama kilitli değil.", "Platformu ayak uçlarıyla it, 1 sn tut.", "Topukları yavaşça geri bırak."], h: ["Dizleri bükmek"] });
x("bbcurl", { n: "Barla Pazı Bükme", en: "Barbell biceps curl", c: "ust", pat: "arm_flex", eq: "barbell", lv: "1-3", st: "elbow:1", imp: 0, t: "w", pr: 4,
  d: "Barla pazı izole.", s: ["Barı omuz genişliğinde, avuçlar öne tut.", "Dirsekler gövdede sabit, barı omuzlara kaldır.", "2-3 sn'de indir."], h: ["Gövdeyi sallamak"] });
x("cablecurl", { n: "Kabloyla Pazı Bükme", en: "Cable biceps curl", c: "ust", pat: "arm_flex", eq: "cable", lv: "1-3", st: "elbow:1", imp: 0, t: "w", pr: 4,
  d: "Alçak makarada pazı izole.", s: ["Makarayı en alta al, tutacağı avuçlar öne tut.", "Dirsekler sabit, ellerini omuzlara kaldır.", "Yavaş indir."], h: ["Dirsekleri öne kaçırmak"] });
x("towelcurl", { n: "Havluyla Pazı Kasma", en: "Towel biceps curl (isometric)", c: "ust", pat: "arm_flex", eq: "none", lv: "1-2", st: "elbow:1", imp: 0, t: "s", pr: 2,
  d: "Aletsiz pazı: havluyu ayakla sabitleyip kendi direncine karşı çekersin.", s: ["Havlunun ortasına bir ayağınla bas, uçlarını avuçlar yukarı bakacak şekilde tut; dirsekler 90°.", "Havluyu yukarı çekiyormuş gibi pazıyı güçlü kas; havlu gergin kalsın.", "Süre boyunca tut, nefesini tutma."] });
x("bbskull", { n: "Yerde Barla Arka Kol Açma", en: "Barbell floor skull crusher", c: "ust", pat: "arm_ext", eq: "barbell", lv: "2-3", st: "elbow:2", imp: 0, t: "w", pr: 3,
  d: "Sehpa yoksa yerde yatarak arka kol izole.", s: ["Sırtüstü yat, barı dar tutuşla göğsünün üstünde düz kollarla tut.", "Dirsekler tavana bakarken barı alnının arkasına doğru indir.", "Dirsekleri açarak yukarı it."], h: ["Dirsekleri yana açmak"] });
x("diamond", { n: "Dar Şınav", en: "Diamond push-up", c: "ust", pat: "arm_ext", eq: "none", lv: "2-3", st: "wrist:2,elbow:1", imp: 0, t: "r", pr: 3,
  d: "Eller yakın: arka kol ağırlıklı şınav.", s: ["Eller göğüs altında, başparmak ve işaret parmakları birbirine yakın.", "Dirsekler gövdeye yakın, göğsü ellere indir.", "İterek kalk."], h: ["Dirsekleri yana açmak"],
  inj: { wrist: "Bilek ağrısında dizüstü yap ya da bant / sandalye ile arka kol çalış." } });
x("cablepushdown", { n: "Kabloyla Arka Kol İtişi", en: "Cable triceps pushdown", c: "ust", pat: "arm_ext", len: "notr", eq: "cable", lv: "1-3", st: "elbow:1", imp: 0, t: "w", pr: 4,
  d: "Yüksek makarada arka kol izole.", s: ["Makarayı en üste al, tutacağı tut.", "Dirsekler gövdeye yapışık, tutacağı aşağı iterek kolları düzleştir.", "Yavaşça geri bırak."], h: ["Omuzları öne düşürmek"] });
x("cableohext", { n: "Kabloyla Baş Üstü Arka Kol", en: "Cable overhead triceps extension", c: "ust", pat: "arm_ext", len: "uzun", eq: "cable", lv: "1-3", st: "elbow:1,shoulder:1", imp: 0, t: "w", pr: 4,
  d: "Kabloyla baş üstü arka kol: kol baş üstünde, kas uzamış.", s: ["Makaraya sırtını dön, ipi iki elle başının arkasında tut.", "Dirsekler öne-yukarı bakarken kolları düzleştir.", "Yavaşça başının arkasına bırak."], h: ["Dirsekleri yana açmak"] });
x("platefr", { n: "Plakayla Öne Kaldırma", en: "Plate front raise", c: "ust", pat: "delt", eq: "barbell", lv: "1-3", st: "shoulder:1", imp: 0, t: "w", pr: 3,
  d: "Bir plakayla omzun ön kısmı.", s: ["Plakayı iki elle kenarlarından, uyluk önünde tut.", "Kollar hafif bükük, plakayı omuz hizasına kaldır.", "2-3 sn'de indir."], h: ["Belden sallamak"] });
x("cablelat", { n: "Kablo Yana Açış", en: "Cable lateral raise", c: "ust", pat: "delt", eq: "cable", lv: "1-3", st: "shoulder:1", imp: 0, t: "w", pr: 4, uni: true,
  d: "Alçak makarada omzun yan kısmı.", s: ["Makarayı en alta al, tutacağı karşı elinle tut.", "Kolu omuz hizasına kadar yana aç.", "Yavaşça indir; taraf değiştir."], h: ["Omzu kulağa çekmek"] });
x("cablepd", { n: "Tek Kol Kabloyla Aşağı Çekiş", en: "Half-kneeling single-arm cable pulldown", c: "ust", pat: "vpull", eq: "cable", lv: "1-3", st: "shoulder:1", imp: 0, t: "w", pr: 4, uni: true,
  d: "Lat makinesi yoksa yüksek makarada dikey çekiş.", s: ["Makarayı en üste al, altında yarım diz çök.", "Dirseği kaburgana doğru çek, kürek kemiğini aşağı indir.", "Yavaş bırak; taraf değiştir."], h: ["Gövdeyi döndürüp çekmek"] });
x("woodchop", { n: "Ağırlıkla Oduncu", en: "Woodchop (dumbbell, kettlebell or plate)", c: "boks", pat: "rot", eq: "db|kb|barbell", lv: "1-3", st: "back:1", imp: 0, t: "w", pr: 6, uni: true,
  d: "Landmine rotasyonun karşılığı: dambıl, kettlebell ya da bir plakayla kalçadan dönüş.", s: ["Ağırlığı iki elle tut; ayaklar omuzdan geniş.", "Ağırlığı bir omzunun üstünden karşı dizinin dışına doğru çapraz indir; arka ayağı döndür, hareket kalçadan başlasın.", "Aynı yoldan kontrollü kaldır; setin sonunda taraf değiştir."], h: ["Sadece kollarla sallamak", "Beli yuvarlamak"] });
x("cablechop", { n: "Kablo / Bant Oduncu", en: "Cable or band woodchop", c: "boks", pat: "rot", eq: "cable|band+anchor", lv: "1-3", st: "back:1", imp: 0, t: "w", pr: 6, uni: true,
  d: "Makara ya da bağlı bantla kalçadan dönüş.", s: ["Makarayı (ya da bandı) omuz hizasının üstüne yanda sabitle, iki elle tut.", "Kalçayı ve arka ayağı döndürerek çapraz aşağı çek.", "Kontrollü geri gel; taraf değiştir."], h: ["Sadece kollarla çekmek"] });
x("cablepunch", { n: "Kablo Yumruk", en: "Cable punch", c: "boks", pat: "upow,box_pow", eq: "cable", lv: "1-3", st: "shoulder:1", imp: 0, t: "x", pr: 5, uni: true,
  d: "Makara arkada omuz hizasında; yumruğa direnç. Hemen ardından torbada güç vuruşu yapılabilir.", s: ["Makarayı omuz hizasına al, sırtını dönüp tutacağı arka elinle tut; boks duruşu.", "Arka ayağı döndürüp kalçayı çevir, kros atar gibi it.", "Kontrollü geri al."], h: ["Sadece kolla itmek"] });

// ================= EK: GİRİŞ SORULARI (2026-10-03, bilgi/sorular.md) =================
// Kardiyo tercihi (yürüyüş / koşu), merdiven, doğum sonrası ve "yere yatmak zor" tercihi için. pr düşük: yalnız tercih ya da kısıtla öne geçerler, eski planlar değişmez.
// gate: hareket yalnız o cevapla gelir (walk / run: kardiyo tercihi; floor: "yere yatmak zor"); böylece eski cevaplarla kurulan planlar değişmez.
x("walkint", { n: "Tempolu Yürüyüş İntervali", en: "Brisk walking intervals", c: "kondisyon", pat: "cond", eq: "none|outdoor", lv: "1-3", imp: 0, t: "x", pr: 2, gate: "walk",
  d: "Darbesiz kondisyon: iş kısmında olabildiğince hızlı yürü (yokuş ya da merdiven varsa kullan), dinlenmede yavaşla. Yerinde de yapılır.", s: ["İş süresinde hızlı ve geniş adımlarla yürü; kolları aktif salla.", "Dinlenme süresinde yavaş yürü, nefesini topla.", "Nefesin sıkışırsa tempoyu düşür."], i: ["Konuşmakta zorlanacağın ama durmayacağın tempo"], h: ["Öne eğilmek"] });
x("runint", { n: "Koşu İntervali", en: "Running intervals", c: "kondisyon", pat: "cond", eq: "outdoor", lv: "1-3", imp: 2, st: "knee:1,ankle:1", t: "x", pr: 2, gate: "run",
  d: "Açık alanda aralıklı koşu: iş kısmında tempolu, dinlenmede yürü.", s: ["İş süresinde konuşamayacağın tempoda koş.", "Dinlenmede yürü ya da çok hafif koş.", "Son tekrarda tempo düşüyorsa seti bitir."], h: ["İlk tekrarda tüm gücü harcamak"] });
x("stairs", { n: "Merdiven Çıkma İntervali", en: "Stair climbing intervals", c: "kondisyon", pat: "cond", eq: "stairs", lv: "1-3", imp: 0, st: "knee:1", t: "x", pr: 3,
  d: "Merdivende kondisyon: iş kısmında tempolu çık, dinlenmede yavaş in.", s: ["İş süresinde hızlı çık; tırabzan yanında dursun.", "İnişi her zaman yavaş ve kontrollü yap (dinlenme).", "Dizde ağrı olursa bırak."], i: ["Ayağın tamamı basamakta"], h: ["Koşarak inmek"], inj: { knee: "Diz sorununda iniş daha yüklüdür; yavaş in, ağrı olursa bırak." } });
x("pelvic", { n: "Pelvik Taban Sıkma", en: "Pelvic floor contraction (Kegel)", c: "core", pat: "prehab_pf", lv: "1-3", imp: 0, t: "r", pr: 1,
  d: "Doğum sonrası ilk aylarda karın ve gövde çalışmasının temeli: nefesle birlikte pelvik tabanı sıkıp bırakmak. Oturarak ya da ayakta.", s: ["Rahat otur ya da dik dur; burundan nefes al, karnını gevşet.", "Nefes verirken idrarı tutar gibi pelvik tabanı yukarı-içe çek, 5 sn tut.", "Tamamen gevşet; kalça ve karın kaslarını sıkmadan tekrarla."], i: ["Nefesini tutma"], h: ["Karnı içeri çekip nefesi tutmak"] });
x("wallplank", { n: "Duvarda Plank", en: "Wall plank", c: "core", pat: "core", lv: "1-2", imp: 0, t: "s", pr: 2, gate: "floor",
  d: "Yere inmeden karın çalışması: eller duvarda ya da tezgahta, vücut düz, karın sıkı. Ayakları geriye aldıkça zorlaşır.", s: ["Ellerini omuz hizasında duvara (ya da sağlam bir tezgaha) koy, ayakları geriye al.", "Baştan topuğa düz çizgi; karnı ve kalçayı sık, süre boyunca tut.", "Zorlaştırmak için ayakları biraz daha geriye al."], h: ["Kalçayı kırmak", "Omuzları kulaklara çekmek"] });

const ROUTINES = {
  A: { name: "Esneklik A · Kalça ve Arka Bacak", dur: "15-18 dk", items: [["f9090", "10 geçiş"], ["couch", "60-90 sn/taraf"], ["pigeon", "60 sn/taraf"], ["deepsq", "2×60 sn"], ["pikefold", "60 sn + 10 yavaş esnetme"], ["frog", "90 sn"], ["butterfly", "60 sn"]] },
  B: { name: "Esneklik B · Omuz, Sırt ve Bilek", dur: "15-20 dk", items: [["bilek", "60 sn"], ["dislo", "2×10"], ["doorpec", "45 sn/taraf"], ["childlat", "45 sn/taraf"], ["thread", "8/taraf"], ["sleeper", "45 sn/taraf (hafif)"], ["passivehang", "3×20-30 sn, 30 sn ara"], ["bridgeF", "3×20 sn, 30 sn ara (seviyene göre)"], ["kedi", "8"]] },
  C: { name: "Esneklik C · Spagat ve Pancake", dur: "15-18 dk", items: [["lizard", "60 sn/taraf"], ["halfsplit", "60 sn/taraf"], ["frontsplit", "60 sn/taraf"], ["cossack", "8/taraf"], ["pancake", "2×60 sn + 10 öne uzanma"], ["wallstraddle", "2-3 dk"]] },
};

const api = { CATS, EQUIPMENT, JOINTS, EX, ROUTINES };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.LIB = api;
})(typeof window !== "undefined" ? window : globalThis);

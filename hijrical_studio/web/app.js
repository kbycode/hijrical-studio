/* ============================================================
   hijrical GUI — front-end logic
   ============================================================ */
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };

let META = null;
let LANG = "tr";
const RTL = new Set(["ar"]);
let CUR = { year: 1447, month: 1, day: 1 };      // today in Hijri (filled at init)
let ACTIVE_TAB = "convert";

const ENGINE = {
  engine: "diyanet", variant: "kuwaiti",
  observer: "mecca", criterion: "ircica", scope: "local",
  lat: 41.0082, lon: 28.9784, tz: 3, obs_name: "Özel",
};
const epars = () => ({ ...ENGINE, lang: LANG });

const HOLIDAY_EMOJI = {
  new_year: "🎊", ashura: "🍲", mawlid: "🌟", raghaib: "✨", isra_miraj: "🕌",
  baraat: "🌙", ramadan_start: "🌙", laylat_al_qadr: "⭐", eid_al_fitr: "🎉",
  arafah: "🏔️", eid_al_adha: "🐑",
};
const KIND_EMOJI = { feast: "🎉", holy_night: "🌙", observance: "📿", fast: "🌅" };
// Unambiguous weekday abbreviations (the generic 3-char slice collides in some
// languages, e.g. Turkish Pazartesi/Pazar and Cuma/Cumartesi).
const WD_ABBR = {
  tr: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

/* ---------------- i18n (UI strings) ---------------- */
const I18N = {
  tr: {
    appTitle: "Hicri Takvim Stüdyosu", appSub: "tüm özellikleri deneyin",
    engineTitle: "Hesaplama Motoru", diyanet: "Diyanet (Türkiye)", arithmetic: "Aritmetik (tablo)", astronomical: "Astronomik (hilal)",
    diyanetHint: "Diyanet İşleri Başkanlığı'nın resmî yayımlanmış takvimi. Yayımlanan yıllar için birebir aynıdır; sonrası için birleşik astronomik kurala düşer.",
    officialBadge: "resmî", predictedBadge: "tahmini",
    variant: "Tablo varyantı", variantHint: "Aritmetik motor tersine çevrilebilir ve sınırsız tarih aralığına sahiptir.",
    observer: "Gözlemci (konum)", name: "İsim", criterion: "Görünürlük kriteri", scope: "Kapsam",
    local: "Yerel", global: "Küresel",
    astroHint: "Astronomik motor gerçek hilal görünürlüğünü modeller; 1–1600 H aralığında geçerlidir ve daha yavaştır.",
    apply: "Uygula", tabConvert: "Dönüştürücü", tabCalendar: "Takvim", tabHolidays: "Dini Günler",
    tabCrescent: "Hilal Görünürlüğü", tabFormat: "Biçim & Ayrıştırma", tabLanguages: "Diller",
    g2h: "Miladi → Hicri", h2g: "Hicri → Miladi", day: "Gün", month: "Ay", year: "Yıl",
    today: "Bugün", convert: "Dönüştür", show: "Göster",
    upcomingTitle: "Yaklaşan Dini Günler", yearHolidaysTitle: "Yıla Göre Dini Günler",
    nightNote: "gece bu akşam başlar",
    hijriYear: "Hicri yıl", list: "Listele", crescentTitle: "Hilal Görünürlüğü",
    crescentHint: "Bir konum, kriter ve akşam için yeni hilalin görünüp görünmediğini (ve ayın başlayıp başlamayacağını) hesaplayın.",
    date: "Miladi tarih", compute: "Hesapla", formatTitle: "Biçimlendirme", parseTitle: "Ayrıştırma",
    parseHint: "İngilizce, Türkçe veya Arapça ay adlarını ve rakamlarını tanır.", parseInput: "Hicri tarih metni",
    parse: "Ayrıştır", instantTitle: "Anlık (gün batımı sınırı)",
    instantHint: "İslami gün akşam (maghrib) ile başlar; gün batımından sonraki an ertesi Hicri güne geçer.",
    time: "Saat", langTablesTitle: "İçerik Dilleri",
    langTablesHint: "Ay adları, gün adları ve dini gün adları her dilde. Üstteki dil düğmeleriyle arayüz ve içerik dilini değiştirin.",
    addLangTitle: "Yeni Dil Ekle (register_locale)",
    addLangHint: "Çalışma anında yeni bir içerik dili kaydedin; tüm açılır menülerde belirir.",
    months12: "12 ay adı (virgülle)", weekdays7: "7 gün adı (Pazartesi'den, virgülle)", register: "Kaydet",
    footer: "Yerel hijrical kaynağı doğrudan çağrılır · saf Python, sıfır bağımlılık",
    // dynamic
    custom: "Özel konum…", hijri: "Hicri", gregorian: "Miladi", weekday: "Gün adı", jdn: "Jülyen Gün No (JDN)",
    monthName: "Ay adı", monthLength: "Ay uzunluğu", yearLength: "Yıl uzunluğu", dayOfYear: "Yılın günü",
    leapYear: "Artık yıl", method: "Yöntem", holiday: "Dini gün", yes: "Evet", no: "Hayır",
    daysLeft: "{n} gün kaldı", daysPassed: "{n} gün geçti", todayIs: "Bugün!", noHoliday: "—",
    visible: "GÖRÜNÜR", notVisible: "GÖRÜNMEZ", visibleSub: "Hilal görülebilir → ay başlayabilir",
    notVisibleSub: "Hilal görülemez → ay 30 güne tamamlanır", sunset: "Gün batımı", sunrise: "Gün doğumu",
    elong: "Uzanım (ARCL)", altitude: "Yükseklik", arcv: "Görüş yayı (ARCV)", daz: "Bağıl azimut",
    ageH: "Ay yaşı", lag: "Gecikme", width: "Hilal genişliği", deg: "derece", hours: "saat", min: "dk", arcmin: "yay-dk",
    samples: "Örnekler", fields: "Alanlar (yıl, ay, gün)", afterSunset: "Gün batımından sonra (ertesi Hicri gün)",
    beforeSunset: "Gün batımından önce", localeAdded: "Dil eklendi:", fillAll: "Lütfen tüm alanları doldurun.",
    parsedFrom: "Metinden ayrıştırıldı", eveLabel: "Gece başlangıcı (akşam)", kindLabel: "Tür",
  },
  en: {
    appTitle: "Hijri Calendar Studio", appSub: "try every feature",
    engineTitle: "Calculation Engine", diyanet: "Diyanet (Türkiye)", arithmetic: "Arithmetic (tabular)", astronomical: "Astronomical (crescent)",
    diyanetHint: "Turkey's official published calendar. Exact for the published years; falls back to the unified astronomical rule beyond them.",
    officialBadge: "official", predictedBadge: "predicted",
    variant: "Tabular variant", variantHint: "The arithmetic engine is reversible and unbounded in range.",
    observer: "Observer (location)", name: "Name", criterion: "Visibility criterion", scope: "Scope",
    local: "Local", global: "Global",
    astroHint: "The astronomical engine models real crescent visibility; valid for 1–1600 AH and slower.",
    apply: "Apply", tabConvert: "Converter", tabCalendar: "Calendar", tabHolidays: "Religious Days",
    tabCrescent: "Crescent Visibility", tabFormat: "Format & Parse", tabLanguages: "Languages",
    g2h: "Gregorian → Hijri", h2g: "Hijri → Gregorian", day: "Day", month: "Month", year: "Year",
    today: "Today", convert: "Convert", show: "Show",
    upcomingTitle: "Upcoming Religious Days", yearHolidaysTitle: "Religious Days by Year",
    nightNote: "the night begins this evening",
    hijriYear: "Hijri year", list: "List", crescentTitle: "Crescent Visibility",
    crescentHint: "Compute whether the new crescent is visible (and the month would begin) for a location, criterion and evening.",
    date: "Gregorian date", compute: "Compute", formatTitle: "Formatting", parseTitle: "Parsing",
    parseHint: "Recognizes English, Turkish or Arabic month names and digits.", parseInput: "Hijri date text",
    parse: "Parse", instantTitle: "Instant (sunset boundary)",
    instantHint: "The Islamic day begins at sunset (maghrib); an instant after sunset rolls to the next Hijri day.",
    time: "Time", langTablesTitle: "Content Languages",
    langTablesHint: "Month, weekday and religious-day names in every language. Switch UI and content language with the buttons above.",
    addLangTitle: "Add a Language (register_locale)",
    addLangHint: "Register a new content language at runtime; it appears in every dropdown.",
    months12: "12 month names (comma-separated)", weekdays7: "7 weekday names (Monday-first, comma-separated)", register: "Register",
    footer: "Calls the local hijrical source directly · pure Python, zero dependencies",
    custom: "Custom location…", hijri: "Hijri", gregorian: "Gregorian", weekday: "Weekday", jdn: "Julian Day Number (JDN)",
    monthName: "Month name", monthLength: "Month length", yearLength: "Year length", dayOfYear: "Day of year",
    leapYear: "Leap year", method: "Method", holiday: "Religious day", yes: "Yes", no: "No",
    daysLeft: "{n} days left", daysPassed: "{n} days ago", todayIs: "Today!", noHoliday: "—",
    visible: "VISIBLE", notVisible: "NOT VISIBLE", visibleSub: "Crescent can be seen → month may begin",
    notVisibleSub: "Crescent not seen → month completes to 30 days", sunset: "Sunset", sunrise: "Sunrise",
    elong: "Elongation (ARCL)", altitude: "Altitude", arcv: "Arc of vision (ARCV)", daz: "Rel. azimuth",
    ageH: "Moon age", lag: "Lag", width: "Crescent width", deg: "deg", hours: "h", min: "min", arcmin: "arcmin",
    samples: "Samples", fields: "Fields (year, month, day)", afterSunset: "After sunset (next Hijri day)",
    beforeSunset: "Before sunset", localeAdded: "Language added:", fillAll: "Please fill in all fields.",
    parsedFrom: "Parsed from text", eveLabel: "Night begins (evening)", kindLabel: "Kind",
  },
  ar: {
    appTitle: "استوديو التقويم الهجري", appSub: "جرّب كل الميزات",
    engineTitle: "محرك الحساب", diyanet: "ديانت (تركيا)", arithmetic: "حسابي (جدولي)", astronomical: "فلكي (الهلال)",
    diyanetHint: "التقويم الرسمي المنشور لرئاسة الشؤون الدينية التركية.",
    officialBadge: "رسمي", predictedBadge: "تقديري",
    variant: "النمط الجدولي", variantHint: "المحرك الحسابي عكوسٌ وغير محدود المدى.",
    observer: "الموقع (الراصد)", name: "الاسم", criterion: "معيار الرؤية", scope: "النطاق",
    local: "محلي", global: "عالمي",
    astroHint: "المحرك الفلكي يحاكي رؤية الهلال الحقيقية؛ صالح من 1 إلى 1600 هـ وأبطأ.",
    apply: "تطبيق", tabConvert: "المحوّل", tabCalendar: "التقويم", tabHolidays: "المناسبات الدينية",
    tabCrescent: "رؤية الهلال", tabFormat: "التنسيق والتحليل", tabLanguages: "اللغات",
    g2h: "ميلادي ← هجري", h2g: "هجري ← ميلادي", day: "اليوم", month: "الشهر", year: "السنة",
    today: "اليوم", convert: "تحويل", show: "عرض",
    upcomingTitle: "المناسبات الدينية القادمة", yearHolidaysTitle: "المناسبات حسب السنة",
    nightNote: "تبدأ الليلة هذا المساء",
    hijriYear: "السنة الهجرية", list: "عرض", crescentTitle: "رؤية الهلال",
    crescentHint: "احسب ما إذا كان الهلال الجديد مرئيًا (وبدء الشهر) لموقع ومعيار ومساء معيّن.",
    date: "تاريخ ميلادي", compute: "احسب", formatTitle: "التنسيق", parseTitle: "التحليل",
    parseHint: "يتعرّف على أسماء الأشهر والأرقام بالإنجليزية والتركية والعربية.", parseInput: "نص تاريخ هجري",
    parse: "حلّل", instantTitle: "لحظة (حدّ الغروب)",
    instantHint: "يبدأ اليوم الإسلامي عند المغرب؛ اللحظة بعد الغروب تنتقل إلى اليوم الهجري التالي.",
    time: "الوقت", langTablesTitle: "لغات المحتوى",
    langTablesHint: "أسماء الأشهر والأيام والمناسبات بكل اللغات. بدّل لغة الواجهة والمحتوى من الأزرار أعلاه.",
    addLangTitle: "أضف لغة (register_locale)",
    addLangHint: "سجّل لغة محتوى جديدة أثناء التشغيل؛ تظهر في كل القوائم.",
    months12: "12 اسم شهر (مفصولة بفواصل)", weekdays7: "7 أسماء أيام (تبدأ بالاثنين، بفواصل)", register: "تسجيل",
    footer: "يستدعي مصدر hijrical المحلي مباشرة · بايثون خالص، بلا اعتماديات",
    custom: "موقع مخصص…", hijri: "هجري", gregorian: "ميلادي", weekday: "اليوم", jdn: "رقم اليوم اليولياني",
    monthName: "اسم الشهر", monthLength: "طول الشهر", yearLength: "طول السنة", dayOfYear: "يوم السنة",
    leapYear: "سنة كبيسة", method: "الطريقة", holiday: "مناسبة دينية", yes: "نعم", no: "لا",
    daysLeft: "باقٍ {n} يومًا", daysPassed: "مضى {n} يومًا", todayIs: "اليوم!", noHoliday: "—",
    visible: "مرئي", notVisible: "غير مرئي", visibleSub: "يمكن رؤية الهلال ← قد يبدأ الشهر",
    notVisibleSub: "لا يُرى الهلال ← يُكمل الشهر 30 يومًا", sunset: "الغروب", sunrise: "الشروق",
    elong: "الاستطالة (ARCL)", altitude: "الارتفاع", arcv: "قوس الرؤية (ARCV)", daz: "السمت النسبي",
    ageH: "عمر القمر", lag: "التأخر", width: "عرض الهلال", deg: "°", hours: "س", min: "د", arcmin: "دق-قوس",
    samples: "أمثلة", fields: "الحقول (سنة، شهر، يوم)", afterSunset: "بعد الغروب (اليوم الهجري التالي)",
    beforeSunset: "قبل الغروب", localeAdded: "أُضيفت اللغة:", fillAll: "يرجى ملء جميع الحقول.",
    parsedFrom: "حُلّل من النص", eveLabel: "تبدأ الليلة (المساء)", kindLabel: "النوع",
  },
};
// --- v2 i18n keys (merged in to keep the literals above readable) ---
Object.assign(I18N.tr, {
  tabTools: "Araçlar", monthView: "Ay", yearView: "Yıl", print: "Yazdır",
  pickOnMap: "Haritadan konum seç", mapHint: "Haritaya tıklayarak gözlemci konumunu seçin. Saat dilimi boylamdan tahmin edilir.",
  useLocation: "Bu konumu kullan", compareTitle: "Şehirlere Göre Karşılaştırma",
  compareHint: "Aynı akşam için farklı şehirlerde hilalin görünürlüğü — Ramazan'ın neden bazı ülkelerde bir gün geç başladığını gösterir.",
  compareBtn: "Karşılaştır", ageTitle: "Hicri Yaş Hesaplayıcı",
  ageHint: "Miladi doğum tarihinizi girin; Hicri doğum tarihiniz, Hicri yaşınız ve sonraki Hicri doğum gününüze kalan gün gösterilir.",
  birthDate: "Miladi doğum tarihi", arithTitle: "Tarih Aritmetiği", addDays: "Gün ekle/çıkar",
  dateDiff: "İki tarih farkı", hijriDateGAY: "Hicri tarih (Gün / Ay / Yıl)",
  addDaysLabel: "Eklenecek gün (negatif olabilir)", firstDate: "1. Hicri tarih (G / A / Y)", secondDate: "2. Hicri tarih (G / A / Y)",
  ageYears: "Hicri yaş", daysLived: "Yaşanan gün", hijriBirth: "Hicri doğum",
  nextBirthday: "Sonraki Hicri doğum günü", resultLabel: "Sonuç", baseLabel: "Başlangıç",
  diffDays: "Aradaki gün", weeksLabel: "Hafta", hijriYearsApprox: "≈ Hicri yıl",
  cityCol: "Şehir", visibleCol: "Görünür mü?", mapOffline: "Harita yüklenemedi (çevrimdışı olabilirsiniz). Enlem/boylamı elle girebilirsiniz.",
});
Object.assign(I18N.en, {
  tabTools: "Tools", monthView: "Month", yearView: "Year", print: "Print",
  pickOnMap: "Pick location on map", mapHint: "Click the map to choose the observer location. The time zone is estimated from longitude.",
  useLocation: "Use this location", compareTitle: "Compare Across Cities",
  compareHint: "Crescent visibility in different cities for the same evening — shows why Ramadan starts a day later in some countries.",
  compareBtn: "Compare", ageTitle: "Hijri Age Calculator",
  ageHint: "Enter your Gregorian birth date to see your Hijri birth date, your Hijri age and days until your next Hijri birthday.",
  birthDate: "Gregorian birth date", arithTitle: "Date Arithmetic", addDays: "Add/subtract days",
  dateDiff: "Difference between dates", hijriDateGAY: "Hijri date (Day / Month / Year)",
  addDaysLabel: "Days to add (can be negative)", firstDate: "1st Hijri date (D / M / Y)", secondDate: "2nd Hijri date (D / M / Y)",
  ageYears: "Hijri age", daysLived: "Days lived", hijriBirth: "Hijri birth",
  nextBirthday: "Next Hijri birthday", resultLabel: "Result", baseLabel: "Start",
  diffDays: "Days between", weeksLabel: "Weeks", hijriYearsApprox: "≈ Hijri years",
  cityCol: "City", visibleCol: "Visible?", mapOffline: "Map could not load (you may be offline). You can enter latitude/longitude manually.",
});
Object.assign(I18N.ar, {
  tabTools: "أدوات", monthView: "شهر", yearView: "سنة", print: "طباعة",
  pickOnMap: "اختر الموقع على الخريطة", mapHint: "انقر على الخريطة لاختيار موقع الراصد. تُقدَّر المنطقة الزمنية من خط الطول.",
  useLocation: "استخدم هذا الموقع", compareTitle: "مقارنة بين المدن",
  compareHint: "رؤية الهلال في مدن مختلفة لنفس المساء — يوضّح لماذا يبدأ رمضان متأخرًا يومًا في بعض الدول.",
  compareBtn: "قارن", ageTitle: "حاسبة العمر الهجري",
  ageHint: "أدخل تاريخ ميلادك الميلادي لرؤية تاريخ ميلادك الهجري وعمرك الهجري والأيام حتى عيد ميلادك الهجري القادم.",
  birthDate: "تاريخ الميلاد الميلادي", arithTitle: "حساب التواريخ", addDays: "إضافة/طرح أيام",
  dateDiff: "الفرق بين تاريخين", hijriDateGAY: "تاريخ هجري (يوم / شهر / سنة)",
  addDaysLabel: "الأيام المضافة (يمكن أن تكون سالبة)", firstDate: "التاريخ الهجري 1 (ي / ش / س)", secondDate: "التاريخ الهجري 2 (ي / ش / س)",
  ageYears: "العمر الهجري", daysLived: "الأيام المعاشة", hijriBirth: "الميلاد الهجري",
  nextBirthday: "عيد الميلاد الهجري القادم", resultLabel: "النتيجة", baseLabel: "البداية",
  diffDays: "الأيام بينهما", weeksLabel: "أسابيع", hijriYearsApprox: "≈ سنوات هجرية",
  cityCol: "المدينة", visibleCol: "مرئي؟", mapOffline: "تعذّر تحميل الخريطة (قد تكون غير متصل). يمكنك إدخال خط العرض/الطول يدويًا.",
});
Object.assign(I18N.tr, {
  illumination: "Aydınlanma", citiesVisible: "şehirde görünür",
  timeSensitive: "Saat & konuma göre (gün batımı sınırı)", hijriLayout: "🌙 Hicri", gregLayout: "📆 Miladi",
  calendarRuleNote: "📋 Bu bir takvim kuralıdır — çıplak gözle görünürlük garantisi değil.",
});
Object.assign(I18N.en, {
  illumination: "Illumination", citiesVisible: "cities can see it",
  timeSensitive: "By time & location (sunset boundary)", hijriLayout: "🌙 Hijri", gregLayout: "📆 Gregorian",
  calendarRuleNote: "📋 This is a calendar rule — not a guarantee of naked-eye visibility.",
});
Object.assign(I18N.ar, {
  illumination: "الإضاءة", citiesVisible: "مدينة ترى الهلال",
  timeSensitive: "حسب الوقت والموقع (حدّ الغروب)", hijriLayout: "🌙 هجري", gregLayout: "📆 ميلادي",
  calendarRuleNote: "📋 هذه قاعدة تقويمية — وليست ضمانًا للرؤية بالعين المجردة.",
});
const LENIENT_CRITERIA = new Set(["conjunction", "umm_al_qura"]);
function critNote(name) { return LENIENT_CRITERIA.has(name) ? `<p class="hint">${t("calendarRuleNote")}</p>` : ""; }

function t(key) { return (I18N[LANG] && I18N[LANG][key]) || I18N.en[key] || key; }

// Draw a crescent moon from the illuminated fraction (0-100 %). A minimum
// visual thickness keeps a real (but very thin) crescent recognizable; the true
// percentage is still shown in the metric grid.
function moonSVG(illumPct) {
  const f = Math.max(0, Math.min(1, (illumPct || 0) / 100));
  const fv = f < 0.5 ? Math.max(0.05, f) : Math.min(0.95, f);
  const R = 46, c = 50;
  const tr = (R * (1 - 2 * fv)).toFixed(2);
  const sweep = fv < 0.5 ? 0 : 1;
  const path = `M ${c} ${c - R} A ${R} ${R} 0 0 1 ${c} ${c + R} A ${Math.abs(tr)} ${R} 0 0 ${sweep} ${c} ${c - R} Z`;
  return `<svg viewBox="0 0 100 100" class="moon-svg" aria-hidden="true">
      <circle cx="${c}" cy="${c}" r="${R}" fill="var(--moon-dark)"></circle>
      <path d="${path}" fill="var(--moon-lit)"></path>
    </svg>`;
}
// Estimate UTC offset from the nearest preset city (better than longitude/15).
function nearestTz(lat, lon) {
  let best = null, bestD = Infinity;
  (META.observers || []).forEach(o => {
    const d = (o.lat - lat) ** 2 + (o.lon - lon) ** 2;
    if (d < bestD) { bestD = d; best = o; }
  });
  return best ? best.tz : Math.round(lon / 15);
}

/* ---------------- networking ----------------
   `post("/api/<name>", body)` is transport-neutral: boot.js installs
   `window.HJ_CALL`, which either POSTs to a live server (fetch) or runs the
   Python `studio_api.handle` in-browser via Pyodide. Call sites stay identical. */
async function post(path, body) {
  await window.HJ_BACKEND_READY;
  const name = path.replace(/^\/api\//, "");
  const j = await window.HJ_CALL(name, body || {});
  if (j && j.error) throw new Error(j.error);
  return j;
}
function showErr(target, msg) { target.innerHTML = `<div class="err">⚠️ ${msg}</div>`; }

/* ---------------- helpers ---------------- */
function countdownText(days) {
  if (days === 0) return { text: t("todayIs"), cls: "soon" };
  if (days > 0) return { text: t("daysLeft").replace("{n}", days), cls: days <= 14 ? "soon" : "" };
  return { text: t("daysPassed").replace("{n}", Math.abs(days)), cls: "past" };
}
function tag(holiday) {
  if (!holiday) return "";
  return `<span class="holiday-tag tag-${holiday.kind}">${KIND_EMOJI[holiday.kind] || "🕌"} ${holiday.name}</span>`;
}

/* ---------------- language + i18n apply ---------------- */
function applyLang(lang) {
  LANG = lang;
  document.documentElement.lang = lang;
  document.body.dir = RTL.has(lang) ? "rtl" : "ltr";
  $$("[data-i18n]").forEach(node => { node.textContent = t(node.dataset.i18n); });
  $$(".lang-switch button").forEach(b => b.classList.toggle("active", b.dataset.lang === lang));
  refreshDynamicSelects();
  updateEngineChip();
  renderTab(ACTIVE_TAB, true);
}

function buildLangSwitch() {
  const box = $("#langSwitch");
  box.innerHTML = "";
  META.languages.forEach(code => {
    const name = META.locales[code] ? META.locales[code].name : code;
    const b = el(`<button data-lang="${code}">${name}</button>`);
    b.onclick = () => applyLang(code);
    box.appendChild(b);
  });
}

/* ---------------- selects ---------------- */
function monthOptions(selectedMonth) {
  const months = META.locales[LANG] ? META.locales[LANG].months : META.locales.en.months;
  return months.map((m, i) => `<option value="${i + 1}" ${i + 1 === selectedMonth ? "selected" : ""}>${i + 1}. ${m}</option>`).join("");
}
function fillSelect(sel, options, keep) {
  const prev = keep ? sel.value : null;
  sel.innerHTML = options;
  if (prev !== null && [...sel.options].some(o => o.value === prev)) sel.value = prev;
}
function observerOptions(sel) {
  const opts = META.observers.map(o => `<option value="${o.key}">${o.name}</option>`).join("")
    + `<option value="custom">${t("custom")}</option>`;
  fillSelect(sel, opts, true);
}
function criterionOptions(sel) {
  fillSelect(sel, META.criteria.map(c => `<option value="${c.name}">${c.name}</option>`).join(""), true);
}

function refreshDynamicSelects() {
  fillSelect($("#variantSel"), META.variants.map(v => `<option value="${v.key}">${v.label}</option>`).join(""), true);
  $("#variantSel").value = ENGINE.variant;
  observerOptions($("#obsSel")); $("#obsSel").value = ENGINE.observer;
  observerOptions($("#cr_obs"));
  observerOptions($("#g_obs"));
  criterionOptions($("#critSel")); $("#critSel").value = ENGINE.criterion;
  criterionOptions($("#cr_crit"));
  criterionOptions($("#cmp_crit"));
  if (CALLAYOUT === "greg") fillSelect($("#cal_month"), gregMonthOptions(GCAL.month), false);
  else fillSelect($("#cal_month"), monthOptions(+($("#cal_month").value || CUR.month)), false);
  updateCritDesc();
}
function updateCritDesc() {
  const c = META.criteria.find(c => c.name === $("#critSel").value);
  $("#critDesc").textContent = c ? c.description : "";
}

/* ---------------- engine popover ---------------- */
function updateEngineChip() {
  if (ENGINE.engine === "diyanet") { $("#engineLabel").textContent = t("diyanet"); }
  else $("#engineLabel").textContent = ENGINE.engine === "astronomical"
    ? `${t("astronomical").split(" ")[0]} · ${ENGINE.observer === "custom" ? ENGINE.obs_name : (META.observers.find(o => o.key === ENGINE.observer) || {}).name} · ${ENGINE.criterion}`
    : `${t("arithmetic").split(" ")[0]} · ${ENGINE.variant}`;
  $("#engineChip").classList.toggle("astro", ENGINE.engine !== "arithmetic");
}
function openEnginePop() {
  $("#variantSel").value = ENGINE.variant;
  $("#obsSel").value = ENGINE.observer;
  $("#critSel").value = ENGINE.criterion;
  $$("#engineSeg button").forEach(b => b.classList.toggle("active", b.dataset.engine === ENGINE.engine));
  $$("#scopeSeg button").forEach(b => b.classList.toggle("active", b.dataset.scope === ENGINE.scope));
  $("#arithPanel").hidden = ENGINE.engine !== "arithmetic";
  $("#astroPanel").hidden = ENGINE.engine !== "astronomical";
  const dp = $("#diyanetPanel"); if (dp) dp.hidden = ENGINE.engine !== "diyanet";
  const cov = $("#diyanetCoverage");
  if (cov && META.engines) {
    const d = META.engines.find(e => e.key === "diyanet");
    if (d) cov.textContent = `Resmî veri: ${d.official_from} … ${d.official_to} (hicri)`;
  }
  $("#customObs").hidden = ENGINE.observer !== "custom";
  updateCritDesc();
  $("#enginePop").hidden = false;
}
function readEnginePop() {
  ENGINE.engine = $("#engineSeg button.active").dataset.engine;
  ENGINE.variant = $("#variantSel").value;
  ENGINE.observer = $("#obsSel").value;
  ENGINE.criterion = $("#critSel").value;
  ENGINE.scope = $("#scopeSeg button.active").dataset.scope;
  if (ENGINE.observer === "custom") {
    ENGINE.lat = +$("#obsLat").value; ENGINE.lon = +$("#obsLon").value;
    ENGINE.tz = +$("#obsTz").value; ENGINE.obs_name = $("#obsName").value || "Özel";
  }
  updateEngineChip();
  // "Today" in Hijri depends on the engine (e.g. ircica can be a day off the
  // arithmetic date), so recompute it before re-rendering.
  recomputeToday().then(() => renderTab(ACTIVE_TAB, true));
}
async function recomputeToday() {
  const now = new Date();
  try {
    const { result } = await post("/api/convert/g2h", { ...epars(), year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
    CUR = { year: result.year, month: result.month, day: result.day };
    $("#h_day").value = CUR.day; $("#h_month").value = CUR.month; $("#h_year").value = CUR.year;
  } catch (_) { /* keep previous */ }
}

/* ---------------- tabs ---------------- */
function renderTab(name, force) {
  const fn = TAB_RENDER[name];
  if (fn) fn(force);
}
const TAB_RENDER = {
  convert: () => { if ($("#g_result").dataset.has) doG2H(); if ($("#h_result").dataset.has) doH2G(); },
  calendar: () => renderCalendarView(),
  holidays: () => renderHolidays(),
  crescent: () => { if ($("#cr_result").dataset.has) doCrescent(); if ($("#cmp_result").dataset.has) doCompare(); },
  tools: () => { if ($("#age_result").dataset.has) doAge(); if ($("#ar_result").dataset.has) doArith(); },
};

/* ============================================================
   CONVERT
   ============================================================ */
function hijriDetailRows(d) {
  return `
    <div class="kv">
      <div class="k">${t("hijri")}</div><div class="v">${d.iso} — ${d.formatted}</div>
      <div class="k">${t("gregorian")}</div><div class="v">${d.gregorian_long} (${d.gregorian})</div>
      <div class="k">${t("weekday")}</div><div class="v">${d.weekday}</div>
      <div class="k">${t("monthName")}</div><div class="v">${d.month_name}</div>
      <div class="k">${t("jdn")}</div><div class="v">${d.jdn}</div>
      <div class="k">${t("monthLength")}</div><div class="v">${d.month_length}</div>
      <div class="k">${t("dayOfYear")}</div><div class="v">${d.day_of_year} / ${d.year_length}</div>
      <div class="k">${t("leapYear")}</div><div class="v">${d.is_leap_year ? t("yes") : t("no")}</div>
      <div class="k">${t("method")}</div><div class="v">${d.method}</div>
      <div class="k">${t("holiday")}</div><div class="v">${d.holiday || t("noHoliday")}</div>
    </div>`;
}
function renderConvert(target, d, primary) {
  const hero = primary === "hijri"
    ? `<div class="big">${d.formatted}</div><div class="small">${d.weekday} · ${d.gregorian_long}</div>`
    : `<div class="big">${d.gregorian_long}</div><div class="small">${d.formatted} · ${d.weekday}</div>`;
  target.innerHTML = `<div class="hero">${hero}${d.holiday ? `<div class="holiday-tag">🕌 ${d.holiday}</div>` : ""}</div>${hijriDetailRows(d)}`;
}
async function doG2H() {
  const r = $("#g_result");
  const base = { ...epars(), year: +$("#g_year").value, month: +$("#g_month").value, day: +$("#g_day").value };
  try {
    if ($("#g_useTime").checked) {
      const [hh, mm] = ($("#g_time").value || "12:00").split(":").map(Number);
      const obs = $("#g_obs").value;
      const body = { ...base, observer: obs, hour: hh, minute: mm };
      if (obs === "custom") Object.assign(body, { lat: ENGINE.lat, lon: ENGINE.lon, tz: ENGINE.tz, obs_name: ENGINE.obs_name });
      const res = await post("/api/at", body);
      renderConvert(r, res.result, "hijri");
      r.insertAdjacentHTML("beforeend",
        `<div class="hint" style="margin-top:10px">${res.after_sunset ? "🌙 " + t("afterSunset") : "☀️ " + t("beforeSunset")} · ${res.observer} · ${t("sunset")} ${res.sunset || "—"}</div>`);
    } else {
      const { result } = await post("/api/convert/g2h", base);
      renderConvert(r, result, "hijri");
    }
    r.dataset.has = "1";
  } catch (e) { showErr(r, e.message); }
}
async function doH2G() {
  const r = $("#h_result");
  try {
    const { result } = await post("/api/convert/h2g", { ...epars(), year: +$("#h_year").value, month: +$("#h_month").value, day: +$("#h_day").value });
    renderConvert(r, result, "greg"); r.dataset.has = "1";
  } catch (e) { showErr(r, e.message); }
}

/* ============================================================
   CALENDAR
   ============================================================ */
let CAL = { year: 1447, month: 1 };        // Hijri anchor (hijri layout)
let GCAL = { year: 2026, month: 6 };       // Gregorian anchor (miladi layout)
let CALVIEW = "month";                      // month | year
let CALLAYOUT = "hijri";                    // hijri | greg
let GRID_DATA = null;                       // last month grid (for cell lookup)

const GREG_MONTHS = {
  tr: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
};
const MINI_DOW = { tr: ["Pz", "Sa", "Ça", "Pe", "Cu", "Cm", "Pa"], en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] };

function gregMonthOptions(sel) {
  const names = GREG_MONTHS[LANG] || GREG_MONTHS.en;
  return names.map((m, i) => `<option value="${i + 1}" ${i + 1 === sel ? "selected" : ""}>${i + 1}. ${m}</option>`).join("");
}

function renderCalendarView() {
  const yearView = CALVIEW === "year";
  $("#calGrid").hidden = yearView;
  $("#calYear").hidden = !yearView;
  $("#cal_month").style.visibility = yearView ? "hidden" : "visible";
  if (CALLAYOUT === "greg") yearView ? renderGYear() : renderGMonth();
  else yearView ? renderYear() : renderCalendar();
}
function calStep(dir) {
  const anchor = CALLAYOUT === "greg" ? GCAL : CAL;
  if (CALVIEW === "year") anchor.year += dir;
  else {
    anchor.month += dir;
    if (anchor.month < 1) { anchor.month = 12; anchor.year--; }
    else if (anchor.month > 12) { anchor.month = 1; anchor.year++; }
  }
  renderCalendarView();
}
function _allCells(data) {
  if (!data) return [];
  if (data.weeks) return data.weeks.flat().filter(Boolean);
  if (data.months) return data.months.flatMap(m => m.weeks.flat()).filter(Boolean);
  return [];
}
// Keep the two layouts roughly aligned when toggling between them.
function syncCalAnchors() {
  const cells = _allCells(GRID_DATA);
  if (!cells.length) return;
  const mid = cells[Math.floor(cells.length / 2)];
  const [gy, gm] = mid.gregorian.split("-").map(Number);
  if (CALLAYOUT === "greg") { GCAL.year = gy; GCAL.month = gm; }
  else if (mid.hyear) { CAL.year = mid.hyear; CAL.month = mid.hmonth; }
}
// The Hijri year a calendar ICS export should cover, in either layout.
function calHijriYear() {
  if (CALLAYOUT === "hijri") return CAL.year;
  const f = _allCells(GRID_DATA).find(c => c.hyear);
  return f ? f.hyear : CUR.year;
}

/* -------- Hijri-primary -------- */
async function renderCalendar() {
  const grid = $("#calGrid");
  try {
    const data = await post("/api/month", { ...epars(), year: CAL.year, month: CAL.month });
    GRID_DATA = data;
    $("#cal_title").textContent = `${data.month_name} ${data.year}`;
    $("#cal_engine").textContent = data.engine;
    $("#cal_year").value = data.year;
    fillSelect($("#cal_month"), monthOptions(data.month), false);
    const abbr = WD_ABBR[LANG];
    let html = data.weekday_names.map((w, i) => `<div class="dow" title="${w}">${abbr ? abbr[i] : w}</div>`).join("");
    data.weeks.forEach(week => week.forEach(cell => {
      if (!cell) { html += `<div class="cell empty"></div>`; return; }
      const h = cell.holiday;
      html += `<div class="cell has ${cell.is_today ? "today" : ""} ${h ? "hol" : ""}" data-greg="${cell.gregorian}">
        ${h ? `<span class="dot k-${h.kind}"></span>` : ""}
        <span class="dnum">${cell.day}</span>
        ${h ? `<span class="hname hcol-${h.kind}">${h.name}</span>` : ""}
        <span class="greg">${cell.gregorian_short}</span>
      </div>`;
    }));
    grid.innerHTML = html;
    $$(".cell.has", grid).forEach(c => { c.onclick = () => openDayModal(findCell(c.dataset.greg), data); });
    renderLegend();
  } catch (e) { showErr(grid, e.message); }
}

async function renderYear() {
  const box = $("#calYear");
  try {
    const data = await post("/api/year_grid", { ...epars(), year: CAL.year });
    GRID_DATA = data;
    $("#cal_title").textContent = `${data.year}`;
    $("#cal_engine").textContent = data.engine;
    $("#cal_year").value = data.year;
    const dow = MINI_DOW[LANG] || data.weekday_names.map(w => w.slice(0, 2));
    box.innerHTML = data.months.map((mo, mi) => {
      let cells = dow.map(d => `<div class="mdow">${d}</div>`).join("");
      mo.weeks.forEach(week => week.forEach(c => {
        if (!c) { cells += `<div class="mcell"></div>`; return; }
        const k = c.holiday ? ` hol k-${c.holiday.kind}` : "";
        cells += `<div class="mcell has${c.is_today ? " today" : ""}${k}" data-m="${mi}" data-greg="${c.gregorian}" title="${c.holiday ? c.holiday.name : ""}">${c.day}</div>`;
      }));
      return `<div class="mini-month"><h4>${mo.month_name}</h4><div class="mini-grid">${cells}</div></div>`;
    }).join("");
    $$(".mcell.has", box).forEach(c => {
      c.onclick = () => {
        const mo = data.months[+c.dataset.m];
        const cell = mo.weeks.flat().find(x => x && x.gregorian === c.dataset.greg);
        openDayModal(cell, { month_name: mo.month_name, year: data.year, weekday_names: data.weekday_names });
      };
    });
    renderLegend();
  } catch (e) { showErr(box, e.message); }
}

/* -------- Gregorian-primary (dual view) -------- */
async function renderGMonth() {
  const grid = $("#calGrid");
  try {
    const data = await post("/api/gmonth", { ...epars(), year: GCAL.year, month: GCAL.month });
    GRID_DATA = data;
    $("#cal_title").textContent = `${data.gmonth_name} ${data.gyear}`;
    $("#cal_engine").textContent = data.engine;
    $("#cal_year").value = data.gyear;
    fillSelect($("#cal_month"), gregMonthOptions(data.gmonth), false);
    const abbr = WD_ABBR[LANG];
    let html = data.weekday_names.map((w, i) => `<div class="dow" title="${w}">${abbr ? abbr[i] : w}</div>`).join("");
    data.weeks.forEach(week => week.forEach(cell => {
      if (!cell) { html += `<div class="cell empty"></div>`; return; }
      const h = cell.holiday;
      html += `<div class="cell has ${cell.is_today ? "today" : ""} ${h ? "hol" : ""}" data-greg="${cell.gregorian}">
        ${h ? `<span class="dot k-${h.kind}"></span>` : ""}
        <span class="dnum">${cell.gday}</span>
        ${h ? `<span class="hname hcol-${h.kind}">${h.name}</span>` : ""}
        <span class="greg">${cell.hday} ${cell.hmonth_name}</span>
      </div>`;
    }));
    grid.innerHTML = html;
    $$(".cell.has", grid).forEach(c => { c.onclick = () => openGDay(findCell(c.dataset.greg), data); });
    renderLegend();
  } catch (e) { showErr(grid, e.message); }
}

async function renderGYear() {
  const box = $("#calYear");
  try {
    const data = await post("/api/gyear", { ...epars(), year: GCAL.year });
    GRID_DATA = data;
    $("#cal_title").textContent = `${data.gyear}`;
    $("#cal_engine").textContent = data.engine;
    $("#cal_year").value = data.gyear;
    const dow = MINI_DOW[LANG] || data.weekday_names.map(w => w.slice(0, 2));
    box.innerHTML = data.months.map((mo, mi) => {
      let cells = dow.map(d => `<div class="mdow">${d}</div>`).join("");
      mo.weeks.forEach(week => week.forEach(c => {
        if (!c) { cells += `<div class="mcell"></div>`; return; }
        const k = c.holiday ? ` hol k-${c.holiday.kind}` : "";
        cells += `<div class="mcell has${c.is_today ? " today" : ""}${k}" data-m="${mi}" data-greg="${c.gregorian}" title="${c.holiday ? c.holiday.name : ""}">${c.gday}</div>`;
      }));
      return `<div class="mini-month"><h4>${mo.gmonth_name}</h4><div class="mini-grid">${cells}</div></div>`;
    }).join("");
    $$(".mcell.has", box).forEach(c => {
      c.onclick = () => {
        const mo = data.months[+c.dataset.m];
        const cell = mo.weeks.flat().find(x => x && x.gregorian === c.dataset.greg);
        openGDay(cell, { gmonth_name: mo.gmonth_name, gyear: data.gyear, weekday_names: data.weekday_names });
      };
    });
    renderLegend();
  } catch (e) { showErr(box, e.message); }
}

function findCell(greg) {
  const weeks = GRID_DATA.weeks || [];
  for (const w of weeks) for (const c of w) if (c && c.gregorian === greg) return c;
  return null;
}
function renderLegend() {
  $("#calLegend").innerHTML = [
    ["observance", META.kind_labels[LANG] ? META.kind_labels[LANG].observance : "Observance"],
    ["holy_night", META.kind_labels[LANG] ? META.kind_labels[LANG].holy_night : "Holy night"],
    ["fast", META.kind_labels[LANG] ? META.kind_labels[LANG].fast : "Fast"],
    ["feast", META.kind_labels[LANG] ? META.kind_labels[LANG].feast : "Feast"],
  ].map(([k, label]) => `<span><i class="dot k-${k}" style="position:static"></i>${label}</span>`).join("");
}

/* -------- day detail modal (shared) -------- */
function dayDetailHTML(primary, secondary, weekday, h) {
  if (h) {
    const cd = countdownText(h.days_until);
    return `<div class="holiday-tag tag-${h.kind}" style="margin-bottom:10px">${KIND_EMOJI[h.kind] || "🕌"} ${h.kind_label || ""}</div>
      <h3>${h.name}</h3>
      <div class="dm-greg">${primary} · ${secondary} · ${weekday}</div>
      <div class="dm-desc">${h.description || ""}</div>
      ${h.eve ? `<div class="hint">🌇 ${t("eveLabel")}: ${h.eve}</div>` : ""}
      <div class="dm-cd ${cd.cls === "past" ? "past" : ""}">${cd.text}</div>`;
  }
  return `<h3>${primary}</h3><div class="dm-greg">${secondary} · ${weekday}</div>
    <div class="hint">${t("noHoliday")} ${t("holiday").toLowerCase()}</div>`;
}
function showDay(primary, secondary, weekday, h) {
  $("#dayModalBody").innerHTML = dayDetailHTML(primary, secondary, weekday, h);
  $("#dayModal").hidden = false;
}
function openDayModal(cell, data) {   // Hijri-primary grid
  showDay(`${cell.day} ${data.month_name} ${data.year}`, cell.gregorian, data.weekday_names[cell.weekday], cell.holiday);
}
function openGDay(cell, data) {        // Gregorian-primary grid
  showDay(`${cell.gday} ${data.gmonth_name} ${data.gyear}`, `${cell.hday} ${cell.hmonth_name}`, data.weekday_names[cell.weekday], cell.holiday);
}

/* ============================================================
   HOLIDAYS
   ============================================================ */
async function renderHolidays() {
  try {
    const { upcoming } = await post("/api/upcoming", { ...epars(), count: 8 });
    $("#upcoming").innerHTML = upcoming.map(rd => {
      const cd = countdownText(rd.days_until);
      return `<div class="up-card b-${rd.kind}">
        <div class="nm">${HOLIDAY_EMOJI[rd.key] || "🕌"} ${rd.name}</div>
        <div class="dt">${rd.hijri_str} · ${rd.gregorian_long}</div>
        <div class="countdown ${cd.cls}">${cd.text}</div>
      </div>`;
    }).join("");
  } catch (e) { showErr($("#upcoming"), e.message); }
  loadYearHolidays();
}
async function loadYearHolidays() {
  const box = $("#holidayList");
  try {
    const { holidays } = await post("/api/holidays", { ...epars(), year: +$("#hol_year").value || CUR.year });
    box.innerHTML = holidays.map((rd, i) => {
      const cd = countdownText(rd.days_until);
      return `<div class="hrow" data-i="${i}">
        <div class="hl-icon">${HOLIDAY_EMOJI[rd.key] || "🕌"}</div>
        <div class="hl-main">
          <div class="hl-name">${rd.name} <span class="holiday-tag tag-${rd.kind}" style="font-size:10px;padding:2px 8px">${rd.kind_label}</span></div>
          <div class="hl-sub">${rd.hijri_str} · ${rd.gregorian_long} (${rd.gregorian_weekday})${rd.is_holy_night ? " · 🌇 " + t("nightNote") : ""}</div>
        </div>
        <div class="hl-cd"><span class="countdown ${cd.cls}">${cd.text}</span></div>
      </div>`;
    }).join("");
    $$(".hrow", box).forEach(row => { row.onclick = () => openHolidayModal(holidays[+row.dataset.i]); });
  } catch (e) { showErr(box, e.message); }
}
function openHolidayModal(rd) {
  const cd = countdownText(rd.days_until);
  $("#dayModalBody").innerHTML = `
    <div class="holiday-tag tag-${rd.kind}" style="margin-bottom:10px">${KIND_EMOJI[rd.kind] || "🕌"} ${rd.kind_label}</div>
    <h3>${rd.name}</h3>
    <div class="dm-greg">${rd.hijri_str} · ${rd.gregorian_long} (${rd.gregorian_weekday})</div>
    <div class="dm-desc">${rd.description || ""}</div>
    ${rd.is_holy_night ? `<div class="hint">🌇 ${t("nightNote")} · ${rd.night_hijri_str}</div>` : ""}
    <div class="dm-cd ${cd.cls === "past" ? "past" : ""}">${cd.text}</div>`;
  $("#dayModal").hidden = false;
}

/* ============================================================
   CRESCENT
   ============================================================ */
async function doCrescent() {
  const box = $("#cr_result");
  const d = $("#cr_date").value;
  if (!d) return;
  const [y, m, day] = d.split("-").map(Number);
  const obs = $("#cr_obs").value;
  const body = { observer: obs, criterion: $("#cr_crit").value, year: y, month: m, day, lang: LANG };
  if (obs === "custom") { const c = CR_CUSTOM || ENGINE; Object.assign(body, { lat: c.lat, lon: c.lon, tz: c.tz, obs_name: c.name || c.obs_name }); }
  box.innerHTML = "<div class='hint'>…</div>";
  try {
    const r = await post("/api/crescent", body);
    const v = r.visible;
    const metric = (label, val, unit) => `<div class="metric"><div class="ml">${label}</div><div class="mv">${val}</div><div class="mu">${unit}</div></div>`;
    box.innerHTML = `
      <div class="cr-verdict ${v ? "yes" : "no"}">
        <div class="moon-wrap">${moonSVG(r.illumination)}</div>
        <div class="txt">${v ? t("visible") : t("notVisible")}</div>
        <div class="sub">${v ? t("visibleSub") : t("notVisibleSub")}</div>
        <div class="sub">${r.observer} · ${r.criterion} · ${r.date} · ${t("sunset")} ${r.sunset}${r.sunrise ? " · " + t("sunrise") + " " + r.sunrise : ""}</div>
      </div>
      <div class="metrics">
        ${metric(t("illumination"), r.illumination, "%")}
        ${metric(t("elong"), r.elongation, t("deg"))}
        ${metric(t("altitude"), r.altitude, t("deg"))}
        ${metric(t("arcv"), r.arc_of_vision, t("deg"))}
        ${metric(t("daz"), r.relative_azimuth, t("deg"))}
        ${metric(t("ageH"), r.age_hours, t("hours"))}
        ${metric(t("lag"), r.lag_minutes, t("min"))}
        ${metric(t("width"), r.width_arcmin, t("arcmin"))}
      </div>
      <p class="hint">${r.criterion_desc}</p>${critNote(r.criterion)}`;
    box.dataset.has = "1";
  } catch (e) { showErr(box, e.message); }
}

/* ============================================================
   TOOLS: age + arithmetic
   ============================================================ */
async function doAge() {
  const r = $("#age_result"); const d = $("#age_date").value; if (!d) return;
  const [y, m, day] = d.split("-").map(Number);
  try {
    const res = await post("/api/age", { ...epars(), year: y, month: m, day });
    const cd = countdownText(res.next_birthday.days_until);
    r.innerHTML = `<div class="stat-row">
        <div class="stat"><div class="sv">${res.age_years}</div><div class="sl">${t("ageYears")}</div></div>
        <div class="stat"><div class="sv">${res.days_lived.toLocaleString()}</div><div class="sl">${t("daysLived")}</div></div>
      </div>
      <div class="kv">
        <div class="k">${t("hijriBirth")}</div><div class="v">${res.birth.formatted} (${res.birth.weekday})</div>
        <div class="k">${t("nextBirthday")}</div><div class="v">${res.next_birthday.hijri_str} · ${res.next_birthday.gregorian_long}</div>
      </div>
      <div class="dm-cd ${cd.cls === "past" ? "past" : ""}" style="margin-top:12px">🎂 ${cd.text}</div>`;
    r.dataset.has = "1";
  } catch (e) { showErr(r, e.message); }
}
function arithOp() { return $("#arithSeg button.active").dataset.op; }
async function doArith() {
  const r = $("#ar_result");
  try {
    if (arithOp() === "add") {
      const days = +$("#ar_days").value;
      const res = await post("/api/arith", { ...epars(), op: "add", year: +$("#ar_y").value, month: +$("#ar_m").value, day: +$("#ar_d").value, days });
      r.innerHTML = `<div class="kv"><div class="k">${t("baseLabel")}</div><div class="v">${res.base.formatted} · ${res.base.gregorian}</div>
          <div class="k">${days >= 0 ? "+" : ""}${days} ${t("day").toLowerCase()}</div><div class="v">→</div></div>
        <div class="hero"><div class="big">${res.result.formatted}</div><div class="small">${res.result.weekday} · ${res.result.gregorian_long}</div></div>`;
    } else {
      const res = await post("/api/arith", { ...epars(), op: "diff", year: +$("#ar2_y").value, month: +$("#ar2_m").value, day: +$("#ar2_d").value, year2: +$("#ar3_y").value, month2: +$("#ar3_m").value, day2: +$("#ar3_d").value });
      r.innerHTML = `<div class="stat-row">
          <div class="stat"><div class="sv">${res.days}</div><div class="sl">${t("diffDays")}</div></div>
          <div class="stat"><div class="sv">${res.weeks}</div><div class="sl">${t("weeksLabel")}</div></div>
          <div class="stat"><div class="sv">${res.approx_hijri_years}</div><div class="sl">${t("hijriYearsApprox")}</div></div>
        </div>
        <div class="kv"><div class="k">${res.a.formatted}</div><div class="v">${res.a.gregorian}</div>
          <div class="k">${res.b.formatted}</div><div class="v">${res.b.gregorian}</div></div>`;
    }
    r.dataset.has = "1";
  } catch (e) { showErr(r, e.message); }
}

/* ============================================================
   CRESCENT: multi-city comparison
   ============================================================ */
async function doCompare() {
  const box = $("#cmp_result"); const d = $("#cmp_date").value; if (!d) return;
  const [y, m, day] = d.split("-").map(Number);
  box.innerHTML = "<div class='hint'>…</div>";
  try {
    const res = await post("/api/crescent_compare", { criterion: $("#cmp_crit").value, year: y, month: m, day });
    const rows = res.rows.map(r => `<tr>
        <td><span class="cmp-badge ${r.visible ? "y" : "n"}"></span>${r.name}</td>
        <td class="${r.visible ? "cmp-yes" : "cmp-no"}">${r.visible ? t("yes") : t("no")}</td>
        <td class="num">${r.sunset}</td><td class="num">${r.elongation}°</td><td class="num">${r.altitude}°</td>
        <td class="num">${r.age_hours}</td><td class="num">${r.lag_minutes}</td></tr>`).join("");
    const vis = res.rows.filter(x => x.visible).length;
    box.innerHTML = `<div class="cmp-summary"><span class="cmp-summary-num">${vis} / ${res.rows.length}</span> ${t("citiesVisible")}</div>
      <table class="cmp-table"><thead><tr>
        <th>${t("cityCol")}</th><th>${t("visibleCol")}</th><th class="num">${t("sunset")}</th>
        <th class="num">${t("elong")}</th><th class="num">${t("altitude")}</th>
        <th class="num">${t("ageH")} (${t("hours")})</th><th class="num">${t("lag")} (${t("min")})</th>
      </tr></thead><tbody>${rows}</tbody></table>
      <p class="hint">${res.criterion} · ${res.criterion_desc}</p>${critNote(res.criterion)}`;
    box.dataset.has = "1";
  } catch (e) { showErr(box, e.message); }
}

/* ============================================================
   ICS export + print
   ============================================================ */
function icsEscape(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
function plusDay(iso) { const dt = new Date(iso + "T00:00:00Z"); dt.setUTCDate(dt.getUTCDate() + 1); return dt.toISOString().slice(0, 10); }
function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
async function exportICSForYear(year) {
  const { holidays } = await post("/api/holidays", { ...epars(), year });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//hijrical//GUI//", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  holidays.forEach((rd, i) => L.push(
    "BEGIN:VEVENT", `UID:${rd.key}-${year}-${i}@hijrical`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${rd.gregorian.replace(/-/g, "")}`,
    `DTEND;VALUE=DATE:${plusDay(rd.gregorian).replace(/-/g, "")}`,
    `SUMMARY:${icsEscape(rd.name)}`,
    `DESCRIPTION:${icsEscape((rd.description || "") + " (" + rd.hijri_str + ")")}`,
    "TRANSP:TRANSPARENT", "END:VEVENT"));
  L.push("END:VCALENDAR");
  download(`hicri-dini-gunler-${year}.ics`, L.join("\r\n"), "text/calendar;charset=utf-8");
}

/* ============================================================
   THEME + MAP picker (Leaflet, lazy, graceful fallback)
   ============================================================ */
function applyTheme(theme) {
  document.body.classList.toggle("light", theme === "light");
  $("#themeBtn").textContent = theme === "light" ? "☀️" : "🌙";
  try { localStorage.setItem("hj_theme", theme); } catch (_) { /* ignore */ }
}

let CR_CUSTOM = null;
let MAP = null, MAP_PICK = null, MAP_MARKER = null, MAP_TARGET = null, LEAFLET_TRIED = false;
function tzFromLon(lon) { return Math.round(lon / 15); }
function openMap(target) { MAP_TARGET = target; MAP_PICK = null; $("#mapCoords").textContent = "—"; $("#mapModal").hidden = false; ensureLeaflet(); }
function showMapFallback() { $("#leafletMap").innerHTML = `<div class="map-fallback">🗺️ ${t("mapOffline")}</div>`; }
function ensureLeaflet() {
  if (window.L) return initMap();
  if (LEAFLET_TRIED) return showMapFallback();
  LEAFLET_TRIED = true;
  const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(css);
  const s = document.createElement("script"); s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  s.onload = () => initMap(); s.onerror = () => showMapFallback(); document.head.appendChild(s);
}
function initMap() {
  if (!window.L) return showMapFallback();
  if (!MAP) {
    MAP = L.map("leafletMap", { worldCopyJump: true }).setView([21.42, 39.82], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 12, attribution: "© OpenStreetMap" }).addTo(MAP);
    MAP.on("click", e => setMapPick(e.latlng.lat, e.latlng.lng));
  }
  setTimeout(() => MAP.invalidateSize(), 150);
}
function setMapPick(lat, lon) {
  MAP_PICK = { lat: +lat.toFixed(4), lon: +(((lon + 540) % 360) - 180).toFixed(4) };
  if (MAP_MARKER) MAP_MARKER.setLatLng([lat, lon]); else MAP_MARKER = L.marker([lat, lon]).addTo(MAP);
  const tz = nearestTz(MAP_PICK.lat, MAP_PICK.lon);
  $("#mapCoords").innerHTML = `<b>${MAP_PICK.lat}</b>, <b>${MAP_PICK.lon}</b> · UTC<b>${tz >= 0 ? "+" : ""}${tz}</b>`;
}
function useMapLocation() {
  if (!MAP_PICK) { $("#mapModal").hidden = true; return; }
  const tz = nearestTz(MAP_PICK.lat, MAP_PICK.lon);
  if (MAP_TARGET === "crescent") {
    CR_CUSTOM = { lat: MAP_PICK.lat, lon: MAP_PICK.lon, tz, name: "Harita" };
    observerOptions($("#cr_obs")); $("#cr_obs").value = "custom";
    const chip = $("#cr_coords"); chip.hidden = false;
    chip.textContent = `📍 ${MAP_PICK.lat}, ${MAP_PICK.lon} (UTC${tz >= 0 ? "+" : ""}${tz})`;
  } else {
    ENGINE.observer = "custom"; ENGINE.lat = MAP_PICK.lat; ENGINE.lon = MAP_PICK.lon; ENGINE.tz = tz; ENGINE.obs_name = "Harita";
    $("#obsSel").value = "custom"; $("#customObs").hidden = false;
    $("#obsLat").value = MAP_PICK.lat; $("#obsLon").value = MAP_PICK.lon; $("#obsTz").value = tz; $("#obsName").value = "Harita";
    updateEngineChip();
  }
  $("#mapModal").hidden = true;
}

/* ============================================================
   INIT
   ============================================================ */
function todayISO() { return new Date().toISOString().slice(0, 10); }

function wire() {
  // tabs
  $$("#tabs button").forEach(b => b.onclick = () => {
    ACTIVE_TAB = b.dataset.tab;
    $$("#tabs button").forEach(x => x.classList.toggle("active", x === b));
    $$(".panel").forEach(p => p.classList.toggle("active", p.dataset.panel === ACTIVE_TAB));
    renderTab(ACTIVE_TAB, true);
  });
  // engine popover
  $("#engineChip").onclick = openEnginePop;
  $$("[data-close-pop]").forEach(b => b.onclick = () => { readEnginePop(); $("#enginePop").hidden = true; });
  $("#enginePop").onclick = (e) => { if (e.target.id === "enginePop") { readEnginePop(); $("#enginePop").hidden = true; } };
  $$("#engineSeg button").forEach(b => b.onclick = () => {
    $$("#engineSeg button").forEach(x => x.classList.toggle("active", x === b));
    $("#arithPanel").hidden = b.dataset.engine !== "arithmetic";
    $("#astroPanel").hidden = b.dataset.engine !== "astronomical";
  });
  $$("#scopeSeg button").forEach(b => b.onclick = () => $$("#scopeSeg button").forEach(x => x.classList.toggle("active", x === b)));
  $("#obsSel").onchange = () => { $("#customObs").hidden = $("#obsSel").value !== "custom"; };
  $("#critSel").onchange = updateCritDesc;
  // convert
  $("#g_go").onclick = doG2H; $("#h_go").onclick = doH2G;
  $("#g_useTime").onchange = () => { $("#g_timeRow").hidden = !$("#g_useTime").checked; };
  $("#g_today").onclick = () => {
    const d = new Date();
    $("#g_day").value = d.getDate(); $("#g_month").value = d.getMonth() + 1; $("#g_year").value = d.getFullYear();
    // When the sunset-boundary toggle is on, "Today" means *now* -- fill the
    // current clock time too, otherwise a stale default time (e.g. 20:00) would
    // wrongly roll the result to the next Hijri day.
    if ($("#g_useTime").checked) {
      $("#g_time").value = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    doG2H();
  };
  $("#h_today").onclick = () => { $("#h_day").value = CUR.day; $("#h_month").value = CUR.month; $("#h_year").value = CUR.year; doH2G(); };
  // theme
  $("#themeBtn").onclick = () => applyTheme(document.body.classList.contains("light") ? "dark" : "light");
  // calendar
  $$("#layoutSeg button").forEach(b => b.onclick = () => {
    $$("#layoutSeg button").forEach(x => x.classList.toggle("active", x === b));
    CALLAYOUT = b.dataset.layout; syncCalAnchors(); renderCalendarView();
  });
  $$("#viewSeg button").forEach(b => b.onclick = () => {
    $$("#viewSeg button").forEach(x => x.classList.toggle("active", x === b));
    CALVIEW = b.dataset.view; renderCalendarView();
  });
  $("#cal_prev").onclick = () => calStep(-1);
  $("#cal_next").onclick = () => calStep(1);
  $("#cal_go").onclick = () => {
    if (CALLAYOUT === "greg") { GCAL.year = +$("#cal_year").value; if (CALVIEW !== "year") GCAL.month = +$("#cal_month").value; }
    else { CAL.year = +$("#cal_year").value; if (CALVIEW !== "year") CAL.month = +$("#cal_month").value; }
    renderCalendarView();
  };
  $("#cal_today_btn").onclick = () => {
    if (CALLAYOUT === "greg") { const d = new Date(); GCAL.year = d.getFullYear(); GCAL.month = d.getMonth() + 1; }
    else { CAL.year = CUR.year; CAL.month = CUR.month; }
    renderCalendarView();
  };
  $("#cal_ics").onclick = () => exportICSForYear(calHijriYear());
  $("#cal_print").onclick = () => window.print();
  // holidays
  $("#hol_go").onclick = loadYearHolidays;
  $("#hol_ics").onclick = () => exportICSForYear(+$("#hol_year").value || CUR.year);
  $("#hol_print").onclick = () => window.print();
  // crescent
  $("#cr_go").onclick = doCrescent;
  $("#cmp_go").onclick = doCompare;
  $("#cr_map").onclick = () => openMap("crescent");
  $("#eng_map").onclick = () => openMap("engine");
  // tools
  $("#age_go").onclick = doAge;
  $("#ar_go").onclick = doArith;
  $$("#arithSeg button").forEach(b => b.onclick = () => {
    $$("#arithSeg button").forEach(x => x.classList.toggle("active", x === b));
    $("#arithAdd").hidden = b.dataset.op !== "add";
    $("#arithDiff").hidden = b.dataset.op !== "diff";
  });
  // map modal
  $("#mapModalClose").onclick = () => $("#mapModal").hidden = true;
  $("#mapModal").onclick = (e) => { if (e.target.id === "mapModal") $("#mapModal").hidden = true; };
  $("#mapUse").onclick = useMapLocation;
  // modal
  $("#dayModalClose").onclick = () => $("#dayModal").hidden = true;
  $("#dayModal").onclick = (e) => { if (e.target.id === "dayModal") $("#dayModal").hidden = true; };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { $("#dayModal").hidden = true; $("#enginePop").hidden = true; $("#mapModal").hidden = true; } });
}

async function init() {
  META = await post("/api/meta", {});
  $("#version").textContent = "v" + META.version;
  LANG = META.default_language || "en";

  buildLangSwitch();
  refreshDynamicSelects();
  wire();

  // figure out today's Hijri date
  const now = new Date();
  try {
    const { result } = await post("/api/convert/g2h", { ...epars(), year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
    CUR = { year: result.year, month: result.month, day: result.day };
  } catch (_) { /* keep defaults */ }

  // seed inputs
  $("#g_day").value = now.getDate(); $("#g_month").value = now.getMonth() + 1; $("#g_year").value = now.getFullYear();
  $("#h_day").value = CUR.day; $("#h_month").value = CUR.month; $("#h_year").value = CUR.year;
  $("#hol_year").value = CUR.year;
  $("#cr_date").value = todayISO();
  $("#cmp_date").value = todayISO();
  $("#age_date").value = "1990-01-01";
  CAL = { year: CUR.year, month: CUR.month };
  GCAL = { year: now.getFullYear(), month: now.getMonth() + 1 };

  applyTheme((() => { try { return localStorage.getItem("hj_theme") || "dark"; } catch (_) { return "dark"; } })());
  applyLang(LANG);
  doG2H();

  // Deep-link to a tab, e.g. .../#calendar -- handy for sharing and screenshots.
  const hashTab = location.hash.replace("#", "");
  const hashBtn = hashTab && $(`#tabs button[data-tab="${hashTab}"]`);
  if (hashBtn) hashBtn.click();
}

init();

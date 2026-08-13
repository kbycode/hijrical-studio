"""
hijrical Studio -- the API layer.

Every public feature of the ``hijrical`` package, exposed as small
JSON-returning functions plus a single :func:`handle` dispatcher. This module is
transport-agnostic (no web-server code), so the *same* logic runs in two places:

* server-side, behind the tiny standard-library HTTP server in ``server.py``
  (for ``python -m hijrical_studio`` / the ``hijrical-studio`` command), and
* fully client-side in the browser via **Pyodide** (the GitHub Pages demo),
  where the front-end calls :func:`handle` directly -- no backend at all.

It depends only on ``hijrical`` (pure Python, zero dependencies), which is what
makes the in-browser build possible.
"""

from __future__ import annotations

import calendar as pycal
import json
import math
from datetime import date, datetime

import hijrical as hj
from hijrical import (
    ArithmeticCalendar,
    AstronomicalCalendar,
    DiyanetCalendar,
    HijriDate,
    Observer,
    PRESETS,
    VARIANTS,
    available_criteria,
    available_languages,
    compute_crescent,
    get_criterion,
    get_locale,
    gregorian_to_jdn,
    register_locale,
    sunrise,
    sunset,
    upcoming_holidays,
    year_holidays,
)
from hijrical._moon import SYNODIC_MONTH, new_moon_jd_ut
from hijrical._sun import datetime_to_jd_ut

# ---------------------------------------------------------------------------
# Content the library does not ship: short religious-day descriptions + labels
# ---------------------------------------------------------------------------

DESCRIPTIONS = {
    "tr": {
        "new_year": "Hicri takvimin ilk günü (1 Muharrem). Hz. Peygamber'in Mekke'den Medine'ye hicretiyle başlayan takvimin yılbaşıdır.",
        "ashura": "Muharrem'in 10'u. Pek çok peygamberin kurtuluşuyla anılan, oruç tutulması müstehap olan gün.",
        "mawlid": "Hz. Muhammed'in (s.a.v.) doğum gecesi; Rebiülevvel ayının 12'si.",
        "raghaib": "Recep ayının ilk cuma gecesi. Rahmet ve mağfiret gecesi olarak kabul edilir.",
        "isra_miraj": "Recep'in 27'si. İsra ve Miraç mucizesinin yaşandığı gece.",
        "baraat": "Şaban'ın 15'i. Günahlardan arınma ve af gecesi.",
        "ramadan_start": "Oruç ayı Ramazan'ın ilk günü (1 Ramazan).",
        "laylat_al_qadr": "Ramazan'ın 27'si. Kur'an'ın inmeye başladığı, bin aydan hayırlı gece.",
        "eid_al_fitr": "Şevval'in 1'i. Ramazan orucunun ardından kutlanan üç günlük bayram.",
        "arafah": "Zilhicce'nin 9'u. Hacıların Arafat'ta vakfeye durduğu, Kurban Bayramı'nın arefesi.",
        "eid_al_adha": "Zilhicce'nin 10'u. Hac ibadetiyle aynı döneme denk gelen dört günlük bayram.",
    },
    "en": {
        "new_year": "The first day of the Hijri calendar (1 Muharram); its epoch is the Prophet's migration (Hijra) from Mecca to Medina.",
        "ashura": "The 10th of Muharram, a day of fasting commemorating the deliverance of many prophets.",
        "mawlid": "The night of the Prophet Muhammad's birth, on 12 Rabi al-awwal.",
        "raghaib": "The first Friday eve of Rajab, regarded as a night of mercy and forgiveness.",
        "isra_miraj": "27 Rajab, marking the Prophet's miraculous Night Journey and Ascension.",
        "baraat": "The 15th of Sha'ban, a night of forgiveness and spiritual cleansing.",
        "ramadan_start": "The first day of Ramadan, the month of fasting (1 Ramadan).",
        "laylat_al_qadr": "The Night of Decree, 27 Ramadan, when the Qur'an began to be revealed; better than a thousand months.",
        "eid_al_fitr": "The festival on 1 Shawwal celebrating the end of Ramadan fasting (three days).",
        "arafah": "9 Dhu al-Hijjah, when pilgrims stand at Arafat; the eve of Eid al-Adha.",
        "eid_al_adha": "The Feast of Sacrifice on 10 Dhu al-Hijjah, coinciding with the Hajj (four days).",
    },
    "ar": {
        "new_year": "أول يوم في التقويم الهجري (1 محرم)، الذي يبدأ بهجرة النبي ﷺ من مكة إلى المدينة.",
        "ashura": "العاشر من محرم، يوم صيام يُذكر فيه نجاة كثير من الأنبياء.",
        "mawlid": "ليلة مولد النبي محمد ﷺ في 12 ربيع الأول.",
        "raghaib": "أول ليلة جمعة من رجب، تُعدّ ليلة رحمة ومغفرة.",
        "isra_miraj": "27 رجب، ذكرى الإسراء والمعراج.",
        "baraat": "ليلة النصف من شعبان (15 شعبان)، ليلة المغفرة.",
        "ramadan_start": "أول أيام شهر رمضان، شهر الصيام (1 رمضان).",
        "laylat_al_qadr": "ليلة القدر في 27 رمضان، حين بدأ نزول القرآن؛ خير من ألف شهر.",
        "eid_al_fitr": "عيد الفطر في 1 شوال بعد انتهاء صيام رمضان (ثلاثة أيام).",
        "arafah": "9 ذو الحجة، يوم وقوف الحجاج بعرفة؛ عشية عيد الأضحى.",
        "eid_al_adha": "عيد الأضحى في 10 ذو الحجة، يتزامن مع الحج (أربعة أيام).",
    },
}

KIND_LABELS = {
    "tr": {"feast": "Bayram", "holy_night": "Kandil", "observance": "Mübarek Gün", "fast": "Oruç"},
    "en": {"feast": "Feast", "holy_night": "Holy Night", "observance": "Observance", "fast": "Fast"},
    "ar": {"feast": "عيد", "holy_night": "ليلة مباركة", "observance": "يوم مبارك", "fast": "صيام"},
}

# Curated (alias-free) lists for the UI.
OBSERVER_KEYS = ["mecca", "medina", "istanbul", "ankara", "izmir", "cairo",
                 "jakarta", "kuala_lumpur", "jerusalem", "london", "new_york", "rabat"]
CRITERION_KEYS = ["ircica", "mabims", "umm_al_qura", "conjunction", "odeh"]


def _desc(lang: str, key: str) -> str:
    table = DESCRIPTIONS.get(lang) or DESCRIPTIONS["en"]
    return table.get(key, DESCRIPTIONS["en"].get(key, ""))


def _kind_label(lang: str, kind: str) -> str:
    table = KIND_LABELS.get(lang) or KIND_LABELS["en"]
    return table.get(kind, kind)


# ---------------------------------------------------------------------------
# Engine / observer construction from request params
# ---------------------------------------------------------------------------

def build_observer(p: dict) -> Observer:
    obs = p.get("observer", "mecca")
    if obs == "custom":
        return Observer(
            p.get("obs_name") or "Custom",
            float(p["lat"]), float(p["lon"]), float(p.get("tz", 0)),
            float(p.get("elevation", 0) or 0),
        )
    return Observer.preset(obs)


def build_calendar(p: dict):
    engine = (p or {}).get("engine", "diyanet")
    if engine == "diyanet":
        return DiyanetCalendar()
    if engine == "astronomical":
        return AstronomicalCalendar(
            build_observer(p),
            p.get("criterion", "ircica"),
            scope=p.get("scope", "local"),
        )
    return ArithmeticCalendar(p.get("variant", "kuwaiti"))


# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------

def hijri_payload(hd: HijriDate, lang: str) -> dict:
    d = hd.to_dict(lang)
    d.update({
        "formatted": hd.format("{day} {month_name} {year} {era}", lang),
        "strftime": hd.strftime("%d %B %Y (%A)", lang),
        "day_of_year": hd.day_of_year(),
        "month_length": hd.month_length(),
        "year_length": hd.year_length(),
        "is_leap_year": hd.is_leap_year(),
        "holiday_key": hj.holiday_key(hd.month, hd.day),
        "gregorian_long": hd.to_gregorian().strftime("%d.%m.%Y"),
        "engine": hd.calendar.name,
        # For the Diyanet engine: is this month straight from the official
        # published table, or the astronomical fallback beyond it?
        "official": (hd.calendar.is_official(hd.year, hd.month)
                     if isinstance(hd.calendar, DiyanetCalendar) else None),
    })
    return d


def rd_payload(rd, lang: str, today: date) -> dict:
    """Serialize a religious day.

    The primary date fields are the ones the day is **published/observed** on --
    for a holy night, the evening it begins, which is what calendars print and
    what people mean by "when is Mawlid". The Hijri day the night belongs to is
    kept alongside as ``night_*`` so a UI can show both without ever displaying
    the wrong day (or exporting it to a calendar file).
    """
    loc = get_locale(lang)
    g = rd.observed
    oy, om, od = rd.observed_hijri_date
    ny, nm, nd = rd.hijri
    return {
        "key": rd.key,
        "kind": rd.kind,
        "kind_label": _kind_label(lang, rd.kind),
        "name": rd.name(lang),
        "hijri": [oy, om, od],
        "hijri_str": f"{od} {loc['months'][om - 1]} {oy}",
        "gregorian": g.isoformat(),
        "gregorian_long": g.strftime("%d.%m.%Y"),
        "gregorian_weekday": loc["weekdays"][g.weekday()],
        "is_holy_night": rd.is_holy_night,
        # The Hijri day a holy night belongs to (it starts the evening before).
        "night_hijri_str": (f"{nd} {loc['months'][nm - 1]} {ny}"
                            if rd.is_holy_night else None),
        "night_gregorian": rd.gregorian.isoformat() if rd.is_holy_night else None,
        "eve": rd.eve.isoformat() if rd.eve else None,
        "observed": g.isoformat(),
        "day_index": rd.day_index,
        "description": _desc(lang, rd.key),
        "days_until": (g - today).days,
    }


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

def api_meta(_p: dict) -> dict:
    locales = {}
    for code in available_languages():
        loc = get_locale(code)
        locales[code] = {
            "name": loc["name"], "era": loc["era"], "day_suffix": loc["day_suffix"],
            "months": list(loc["months"]), "weekdays": list(loc["weekdays"]),
            "holidays": dict(loc["holidays"]),
        }
    diy = DiyanetCalendar()
    (cf_y, cf_m), (ct_y, ct_m) = diy.coverage()
    return {
        "version": hj.__version__,
        "engines": [
            {"key": "diyanet", "label": "Diyanet (Türkiye)",
             "official_from": f"{cf_y}-{cf_m:02d}", "official_to": f"{ct_y}-{ct_m:02d}"},
            {"key": "arithmetic", "label": "Arithmetic"},
            {"key": "astronomical", "label": "Astronomical"},
        ],
        "languages": available_languages(),
        "default_language": "en",
        "criteria": [{"name": k, "description": get_criterion(k).description}
                     for k in CRITERION_KEYS],
        "variants": [{"key": k, "label": v.label} for k, v in VARIANTS.items()],
        "observers": [{"key": k, "name": PRESETS[k].name,
                       "lat": PRESETS[k].latitude, "lon": PRESETS[k].longitude,
                       "tz": PRESETS[k].utc_offset} for k in OBSERVER_KEYS],
        "locales": locales,
        "descriptions": DESCRIPTIONS,
        "kind_labels": KIND_LABELS,
        "today": date.today().isoformat(),
        "today_hijri": list(HijriDate.today().to_dict("tr").values())[:3],
    }


def api_g2h(p: dict) -> dict:
    lang = p.get("lang", "tr")
    cal = build_calendar(p)
    hd = HijriDate.from_gregorian(int(p["year"]), int(p["month"]), int(p["day"]), calendar=cal)
    return {"result": hijri_payload(hd, lang)}


def api_h2g(p: dict) -> dict:
    lang = p.get("lang", "tr")
    cal = build_calendar(p)
    hd = HijriDate(int(p["year"]), int(p["month"]), int(p["day"]), calendar=cal)
    return {"result": hijri_payload(hd, lang)}


def api_parse(p: dict) -> dict:
    lang = p.get("lang", "tr")
    cal = build_calendar(p)
    hd = HijriDate.parse(p["text"], calendar=cal)
    return {"result": hijri_payload(hd, lang), "fields": [hd.year, hd.month, hd.day]}


def api_at(p: dict) -> dict:
    lang = p.get("lang", "tr")
    cal = build_calendar(p)
    obs = build_observer(p)
    instant = datetime(int(p["year"]), int(p["month"]), int(p["day"]),
                       int(p.get("hour", 12)), int(p.get("minute", 0)))
    hd = HijriDate.at(instant, obs, calendar=cal)
    ss = sunset(instant.date(), obs.latitude, obs.longitude, obs.utc_offset)
    after_sunset = ss is not None and instant.replace(tzinfo=ss.tzinfo) >= ss
    return {
        "result": hijri_payload(hd, lang),
        "observer": obs.name,
        "sunset": ss.strftime("%H:%M") if ss else None,
        "after_sunset": after_sunset,
    }


def api_format(p: dict) -> dict:
    lang = p.get("lang", "tr")
    cal = build_calendar(p)
    hd = HijriDate(int(p["year"]), int(p["month"]), int(p["day"]), calendar=cal)
    pattern = p.get("pattern", "{day} {month_name} {year} {era}")
    strf = p.get("strftime", "%d %B %Y (%A)")
    return {
        "format": hd.format(pattern, lang),
        "strftime": hd.strftime(strf, lang),
        "isoformat": hd.isoformat(),
        "samples": {
            "{day} {month_name} {year}": hd.format("{day} {month_name} {year}", lang),
            "{weekday}, {day02}.{month02}.{year}": hd.format("{weekday}, {day02}.{month02}.{year}", lang),
            "%A %d %B %Y": hd.strftime("%A %d %B %Y", lang),
            "%d/%m/%y": hd.strftime("%d/%m/%y", lang),
            "%j. gün / %E": hd.strftime("%j (%E)", lang),
        },
    }


_GREG_MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz",
                   "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]


_GREG_MONTH_NAMES = {
    "tr": ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
           "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
    "en": ["January", "February", "March", "April", "May", "June",
           "July", "August", "September", "October", "November", "December"],
    "ar": ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
           "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
}


def _greg_month_name(gmonth, lang):
    return (_GREG_MONTH_NAMES.get(lang) or _GREG_MONTH_NAMES["en"])[gmonth - 1]


def _greg_short(g, lang):
    return f"{g.day} {_GREG_MONTHS_TR[g.month - 1] if lang == 'tr' else g.strftime('%b')}"


def _build_index(cal, year):
    """Holiday lookup for a whole Hijri year, indexed by (month, day).

    Keyed on the date each day is *marked* on: for a holy night that is the
    evening it begins, so a calendar cell and the religious-day list always name
    the same Gregorian day (Mawlid shows on 11 Rabi al-awwal, as Diyanet prints
    it, not on the 12th).
    """
    idx: dict[tuple, list] = {}
    for rd in year_holidays(year, cal):
        _, month, day = rd.observed_hijri_date
        idx.setdefault((month, day), []).append(rd)
    return idx


def _holiday_dict(rd, lang, g, today):
    # ``g`` is the cell's own Gregorian date, which now equals rd.observed.
    return {
        "key": rd.key, "kind": rd.kind, "kind_label": _kind_label(lang, rd.kind),
        "name": rd.name(lang), "description": _desc(lang, rd.key),
        "is_holy_night": rd.is_holy_night,
        "eve": rd.eve.isoformat() if rd.eve else None,
        "observed": rd.observed.isoformat(),
        "days_until": (rd.observed - today).days,
    }


def _weeks_payload(cal, year, month, lang, today, holiday_index):
    """Hijri-primary month grid (each row is a Hijri week)."""
    weeks = []
    for week in hj.month_calendar(year, month, calendar=cal):
        row = []
        for cell in week:
            if cell is None:
                row.append(None)
                continue
            g = cell.to_gregorian()
            rds = holiday_index.get((cell.month, cell.day), [])
            row.append({
                "day": cell.day, "weekday": cell.weekday(),
                "gregorian": g.isoformat(), "gregorian_short": _greg_short(g, lang),
                "is_today": g == today,
                "holiday": _holiday_dict(rds[0], lang, g, today) if rds else None,
            })
        weeks.append(row)
    return weeks


def _greg_weeks_payload(cal, gyear, gmonth, lang, today, year_idx):
    """Gregorian-primary month grid (each row is a Gregorian week)."""
    loc = get_locale(lang)
    weeks = []
    for week in pycal.Calendar(firstweekday=0).monthdayscalendar(gyear, gmonth):
        row = []
        for dd in week:
            if dd == 0:
                row.append(None)
                continue
            g = date(gyear, gmonth, dd)
            hy, hm, hd = cal.from_jdn(gregorian_to_jdn(gyear, gmonth, dd))
            idx = year_idx.get(hy)
            if idx is None:
                idx = _build_index(cal, hy)
                year_idx[hy] = idx
            rds = idx.get((hm, hd), [])
            row.append({
                "gday": dd, "weekday": g.weekday(), "gregorian": g.isoformat(),
                "hday": hd, "hmonth": hm, "hyear": hy, "hmonth_name": loc["months"][hm - 1],
                "is_today": g == today,
                "holiday": _holiday_dict(rds[0], lang, g, today) if rds else None,
            })
        weeks.append(row)
    return weeks


def api_month(p: dict) -> dict:
    lang = p.get("lang", "tr")
    cal = build_calendar(p)
    year, month = int(p["year"]), int(p["month"])
    today = date.today()
    loc = get_locale(lang)
    idx = _build_index(cal, year)
    return {
        "year": year, "month": month,
        "month_name": loc["months"][month - 1],
        "weekday_names": list(loc["weekdays"]),
        "weeks": _weeks_payload(cal, year, month, lang, today, idx),
        "engine": cal.name,
    }


def api_year_grid(p: dict) -> dict:
    lang = p.get("lang", "tr")
    cal = build_calendar(p)
    year = int(p["year"])
    today = date.today()
    loc = get_locale(lang)
    idx = _build_index(cal, year)
    months = [{
        "month": m, "month_name": loc["months"][m - 1],
        "weeks": _weeks_payload(cal, year, m, lang, today, idx),
    } for m in range(1, 13)]
    return {
        "year": year, "engine": cal.name,
        "weekday_names": list(loc["weekdays"]), "months": months,
    }


def api_gmonth(p: dict) -> dict:
    """Gregorian-primary month, each day annotated with its Hijri date."""
    lang = p.get("lang", "tr")
    cal = build_calendar(p)
    gyear, gmonth = int(p["year"]), int(p["month"])
    today = date.today()
    loc = get_locale(lang)
    return {
        "gyear": gyear, "gmonth": gmonth,
        "gmonth_name": _greg_month_name(gmonth, lang),
        "weekday_names": list(loc["weekdays"]),
        "weeks": _greg_weeks_payload(cal, gyear, gmonth, lang, today, {}),
        "engine": cal.name,
    }


def api_gyear(p: dict) -> dict:
    lang = p.get("lang", "tr")
    cal = build_calendar(p)
    gyear = int(p["year"])
    today = date.today()
    loc = get_locale(lang)
    year_idx: dict = {}
    months = [{
        "gmonth": mm, "gmonth_name": _greg_month_name(mm, lang),
        "weeks": _greg_weeks_payload(cal, gyear, mm, lang, today, year_idx),
    } for mm in range(1, 13)]
    return {
        "gyear": gyear, "engine": cal.name,
        "weekday_names": list(loc["weekdays"]), "months": months,
    }


def api_age(p: dict) -> dict:
    lang = p.get("lang", "tr")
    cal = build_calendar(p)
    today = date.today()
    birth = HijriDate.from_gregorian(int(p["year"]), int(p["month"]), int(p["day"]), calendar=cal)
    today_h = HijriDate.today(calendar=cal)
    age_years = birth.age_in_years()
    nxt = hj.next_occurrence(birth.month, birth.day, after=today_h, calendar=cal)
    ng = nxt.to_gregorian()
    return {
        "birth": hijri_payload(birth, lang),
        "age_years": age_years,
        "days_lived": today_h.jdn - birth.jdn,
        "next_birthday": {
            "hijri_str": nxt.format("{day} {month_name} {year}", lang),
            "gregorian": ng.isoformat(), "gregorian_long": ng.strftime("%d.%m.%Y"),
            "weekday": nxt.weekday_name(lang), "days_until": (ng - today).days,
        },
    }


def api_arith(p: dict) -> dict:
    lang = p.get("lang", "tr")
    cal = build_calendar(p)
    op = p.get("op", "add")
    if op == "add":
        base = HijriDate(int(p["year"]), int(p["month"]), int(p["day"]), calendar=cal)
        result = base + int(p.get("days", 0))
        return {"op": "add", "base": hijri_payload(base, lang), "result": hijri_payload(result, lang)}
    # diff
    a = HijriDate(int(p["year"]), int(p["month"]), int(p["day"]), calendar=cal)
    b = HijriDate(int(p["year2"]), int(p["month2"]), int(p["day2"]), calendar=cal)
    days = b - a
    return {
        "op": "diff", "a": hijri_payload(a, lang), "b": hijri_payload(b, lang),
        "days": days, "weeks": round(days / 7, 1),
        "approx_hijri_years": round(days / 354.367, 2),
    }


def _crescent_for(obs, crit, d):
    ss = sunset(d, obs.latitude, obs.longitude, obs.utc_offset)
    if ss is None:
        return None
    jd_ss = datetime_to_jd_ut(ss)
    # Anchor to the conjunction *closest* to this sunset -- the new moon the
    # crescent of this evening belongs to. Picking merely the most-recent
    # conjunction would, on evenings just before a new moon, point at the
    # previous month's month-old moon and wrongly report a large positive age
    # (so 'conjunction'/'umm_al_qura' would claim visibility a day or two early).
    k0 = round((jd_ss - 2451550.09766) / SYNODIC_MONTH)
    k = min((k0 - 1, k0, k0 + 1), key=lambda kk: abs(new_moon_jd_ut(kk) - jd_ss))
    info = compute_crescent(obs, ss, new_moon_jd_ut(k))
    return ss, info, crit.is_visible(info)


def api_crescent_compare(p: dict) -> dict:
    crit = get_criterion(p.get("criterion", "ircica"))
    d = date(int(p["year"]), int(p["month"]), int(p["day"]))
    rows = []
    for key in OBSERVER_KEYS:
        obs = Observer.preset(key)
        res = _crescent_for(obs, crit, d)
        if res is None:
            continue
        ss, info, visible = res
        rows.append({
            "key": key, "name": obs.name, "visible": visible,
            "sunset": ss.strftime("%H:%M"),
            "elongation": round(info.elongation, 1),
            "altitude": round(info.altitude, 1),
            "age_hours": round(info.age_hours, 1),
            "lag_minutes": round(info.lag_minutes, 0),
        })
    rows.sort(key=lambda r: (not r["visible"], -r["altitude"]))
    return {"date": d.isoformat(), "criterion": p.get("criterion", "ircica"),
            "criterion_desc": crit.description, "rows": rows}


def api_holidays(p: dict) -> dict:
    lang = p.get("lang", "tr")
    cal = build_calendar(p)
    year = int(p["year"])
    today = date.today()
    days = [rd_payload(rd, lang, today) for rd in year_holidays(year, cal)]
    return {"year": year, "holidays": days}


def api_upcoming(p: dict) -> dict:
    lang = p.get("lang", "tr")
    cal = build_calendar(p)
    count = int(p.get("count", 8))
    today = date.today()
    items = upcoming_holidays(count=count, calendar=cal)
    return {"upcoming": [rd_payload(rd, lang, today) for rd in items]}


def api_crescent(p: dict) -> dict:
    obs = build_observer(p)
    crit = get_criterion(p.get("criterion", "ircica"))
    d = date(int(p["year"]), int(p["month"]), int(p["day"]))
    sr = sunrise(d, obs.latitude, obs.longitude, obs.utc_offset)
    res = _crescent_for(obs, crit, d)
    if res is None:
        return {"error": "Bu konum/tarih için gün batımı hesaplanamadı."}
    ss, info, visible = res

    return {
        "observer": obs.name,
        "criterion": p.get("criterion", "ircica"),
        "criterion_desc": crit.description,
        "date": d.isoformat(),
        "sunset": ss.strftime("%H:%M"),
        "sunrise": sr.strftime("%H:%M") if sr else None,
        "visible": visible,
        "elongation": round(info.elongation, 2),
        "altitude": round(info.altitude, 2),
        "arc_of_vision": round(info.arc_of_vision, 2),
        "relative_azimuth": round(info.relative_azimuth, 2),
        "age_hours": round(info.age_hours, 1),
        "lag_minutes": round(info.lag_minutes, 0),
        "width_arcmin": round(info.width_arcmin, 2),
        # Illuminated fraction of the lunar disk (phase angle ~= 180 - elongation).
        "illumination": round((1 - math.cos(math.radians(info.elongation))) / 2 * 100, 2),
    }


def api_sun(p: dict) -> dict:
    obs = build_observer(p)
    d = date(int(p["year"]), int(p["month"]), int(p["day"]))
    ss = sunset(d, obs.latitude, obs.longitude, obs.utc_offset)
    sr = sunrise(d, obs.latitude, obs.longitude, obs.utc_offset)
    return {
        "observer": obs.name, "date": d.isoformat(),
        "sunrise": sr.strftime("%H:%M") if sr else None,
        "sunset": ss.strftime("%H:%M") if ss else None,
    }


def api_register_locale(p: dict) -> dict:
    """Demonstrate register_locale(): add a content language at runtime."""
    loc = p["locale"]
    # months/weekdays may arrive as lists; the library accepts any sequence.
    register_locale({
        "code": loc["code"], "name": loc["name"], "era": loc["era"],
        "day_suffix": loc.get("day_suffix", " ({n})"),
        "months": list(loc["months"]), "weekdays": list(loc["weekdays"]),
        "holidays": dict(loc["holidays"]),
    })
    DESCRIPTIONS.setdefault(loc["code"], DESCRIPTIONS["en"])
    KIND_LABELS.setdefault(loc["code"], KIND_LABELS["en"])
    return {"ok": True, "languages": available_languages()}


def api_ping(_p: dict) -> dict:
    """Liveness probe -- lets the front-end detect a real API server."""
    return {"ok": True, "version": hj.__version__}


#: Endpoint name -> handler. Names are transport-neutral (no ``/api`` prefix);
#: the HTTP server strips the prefix and Pyodide calls them verbatim.
ROUTES = {
    "ping": api_ping,
    "meta": api_meta,
    "convert/g2h": api_g2h,
    "convert/h2g": api_h2g,
    "parse": api_parse,
    "at": api_at,
    "format": api_format,
    "month": api_month,
    "year_grid": api_year_grid,
    "gmonth": api_gmonth,
    "gyear": api_gyear,
    "holidays": api_holidays,
    "upcoming": api_upcoming,
    "crescent": api_crescent,
    "crescent_compare": api_crescent_compare,
    "sun": api_sun,
    "age": api_age,
    "arith": api_arith,
    "register_locale": api_register_locale,
}


def handle(name, params=None):
    """Run endpoint ``name`` and return a JSON **string**.

    ``params`` may be a dict or a JSON string (the latter is convenient from
    Pyodide). Errors are returned as ``{"error": ...}`` rather than raised, so a
    single code path serves both the HTTP server and the in-browser build.
    """
    if isinstance(params, str):
        try:
            params = json.loads(params or "{}")
        except ValueError:
            return json.dumps({"error": "invalid JSON"})
    params = params or {}
    fn = ROUTES.get(name)
    if fn is None:
        return json.dumps({"error": f"unknown endpoint: {name}"})
    try:
        return json.dumps(fn(params), ensure_ascii=False, default=str)
    except (hj.HijriError, ValueError, KeyError, TypeError) as exc:
        return json.dumps({"error": str(exc)}, ensure_ascii=False)
    except Exception as exc:  # pragma: no cover - defensive
        return json.dumps({"error": f"{type(exc).__name__}: {exc}"}, ensure_ascii=False)

# Names of every endpoint, handy for the server's allow-list and for tests.
ENDPOINTS = tuple(ROUTES)

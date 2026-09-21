#!/usr/bin/env python3
"""
structure_cruises.py

Перетворює "сирі" items з ajax.php?act=getitems (4gates.cruises) у чисту,
компактну структуру даних (замість купи HTML-фрагментів у полях).

На вході: список dict-ів (як повертає fetch_cruises()["items"]).
На виході: список чистих dict-ів, готових під JSON / БД / CSV.

Використання:
    from structure_cruises import structure_item, structure_items

    clean = structure_items(raw_items)
    print(json.dumps(clean, ensure_ascii=False, indent=2))
"""

import json
import re
from bs4 import BeautifulSoup


# ---------- допоміжні парсери окремих "брудних" полів ----------

def _clean_money(text: str) -> int | None:
    """'217 655 ₴' -> 217655; '' -> None"""
    if not text:
        return None
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits else None


def _ddmmyyyy_to_iso(text: str) -> str | None:
    """'15.08.2026' -> '2026-08-15'"""
    if not text:
        return None
    m = re.match(r"(\d{2})\.(\d{2})\.(\d{4})", text.strip())
    if not m:
        return None
    d, mo, y = m.groups()
    return f"{y}-{mo}-{d}"


def parse_cabins_block(ul_tag) -> dict:
    """<ul class="cruise__cabins">...</ul> -> {'Внутрішня': {'NAT':.., 'USD':.., 'EUR':..}, ...}"""
    cabins = {}
    if ul_tag is None:
        return cabins
    for li in ul_tag.find_all("li"):
        name_tag = li.find("p")
        cabin_name = name_tag.get_text(strip=True) if name_tag else None
        if not cabin_name:
            continue
        prices = {}
        for span in li.select("strong._prices span"):
            cls = span.get("class", [""])[0]
            currency = cls.replace("_", "")  # NAT / USD / EUR
            prices[currency] = _clean_money(span.get_text(strip=True))
        cabins[cabin_name] = prices
    return cabins


def parse_price_cabins(html: str) -> dict:
    """Поле price_cabins — це стартова (найдешевша) ціна по категоріях кают, без прив'язки до дати."""
    if not html:
        return {}
    soup = BeautifulSoup(html, "html.parser")
    return parse_cabins_block(soup.find("ul", class_="cruise__cabins"))


def parse_price_cabins_next(html: str) -> list[dict]:
    """
    Поле price_cabins_next — список усіх доступних дат відправлення,
    кожна зі своїм блоком цін по категоріях кают і посиланням на бронювання.
    """
    if not html:
        return []
    soup = BeautifulSoup(html, "html.parser")
    dates = []
    for block in soup.find_all("div", class_="cruise__dates"):
        date_span = block.select_one(".cruise__dates-current span")
        date_str = date_span.get_text(strip=True) if date_span else None
        link_tag = block.find("a", class_="cruise__btn-select")
        dates.append({
            "date": _ddmmyyyy_to_iso(date_str),
            "date_raw": date_str,
            "booking_url": ("https://4gates.cruises" + link_tag["href"])
                            if link_tag and link_tag.get("href", "").startswith("/")
                            else (link_tag["href"] if link_tag else None),
            "cabins": parse_cabins_block(block.find("ul", class_="cruise__cabins")),
        })
    return dates


def parse_route(html: str) -> list[str]:
    """iteraty: '<span>Порт А - Порт Б - Порт В</span>' -> ['Порт А', 'Порт Б', 'Порт В']"""
    if not html:
        return []
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(strip=True)
    return [p.strip() for p in text.split(" - ") if p.strip()]


def parse_flags(html: str) -> list[str]:
    """flag: набір <a class='flag' title='Країна'> -> ['Італія', 'Хорватія', ...] (без службового 'У маршруті є візові країни')"""
    if not html:
        return []
    soup = BeautifulSoup(html, "html.parser")
    countries = []
    for el in soup.select(".flag[title]"):
        title = el.get("title", "").strip()
        if title:
            countries.append(title)
    return countries


def parse_class_field(html: str) -> str | None:
    """classes / classes__company: витягує назву класу лайнера/компанії з <b>...</b>"""
    if not html:
        return None
    soup = BeautifulSoup(html, "html.parser")
    b = soup.find("b")
    return b.get_text(strip=True) if b else soup.get_text(strip=True) or None


def parse_renov_year(html: str) -> int | None:
    """date_renov: '<div ...><span>2025 р.</span></div>' -> 2025"""
    if not html:
        return None
    m = re.search(r"(\d{4})", html)
    return int(m.group(1)) if m else None


def parse_liner_size(html: str) -> str | None:
    """icons_serv_cruises іноді містить 'Размер лайнера : <b>XL</b>'"""
    if not html:
        return None
    m = re.search(r"Размер лайнера\s*:\s*<b>([^<]+)</b>", html)
    return m.group(1).strip() if m else None


def _to_number(value):
    if value in (None, ""):
        return None
    try:
        if isinstance(value, str) and "." in value:
            return float(value)
        return int(value)
    except (TypeError, ValueError):
        return value


# ---------- головна функція структуризації одного круїзу ----------

def structure_item(item: dict) -> dict:
    return {
        # ідентифікація
        "key": _to_number(item.get("key")),
        "cruise_id": item.get("cruise_id"),
        "cruise_title": item.get("cruise_title"),
        "cruise_logo": item.get("cruise_logo"),

        # лайнер / судно
        "liner_slug": item.get("liner_slug"),
        "liner_name": item.get("liner_name"),
        "ship_id": item.get("ship_id"),
        "ship_built_year": _to_number(item.get("date_spusc")),
        "ship_renovated_year": parse_renov_year(item.get("date_renov")),
        "ship_class": parse_class_field(item.get("classes")),
        "company_class": parse_class_field(item.get("classes__company")),
        "ship_size": parse_liner_size(item.get("icons_serv_cruises")),
        "liner_logo": item.get("logo_liner"),

        # маршрут / регіон
        "region_name": (item.get("region_name") or "").strip() or None,
        "region_id": item.get("region_id"),
        "route": parse_route(item.get("iteraty")),
        "visa_countries": parse_flags(item.get("flag")),
        "port_from_id": _to_number(item.get("port_from_id")),

        # тривалість / базова дата
        "duration_days": _to_number(item.get("durations")),
        "duration_days_str": item.get("durations_str"),
        "nights": _to_number(item.get("nights")),
        "nights_str": item.get("nights_str"),
        "base_date_start": item.get("date_start") or _ddmmyyyy_to_iso(item.get("dstart")),
        "base_date_end": _ddmmyyyy_to_iso(item.get("dend")),

        # ціни
        "from_price": parse_price_cabins(item.get("price_cabins")),
        "available_dates": parse_price_cabins_next(item.get("price_cabins_next")),

        # відгуки/рейтинг
        "star_rating": _to_number(item.get("star")),
        "review_score": _to_number(item.get("starid")) or None,
        "review_count": _to_number(item.get("countreview")),

        "locale": item.get("locale"),
    }


def structure_items(items: list[dict]) -> list[dict]:
    return [structure_item(it) for it in items]


if __name__ == "__main__":
    import sys
    raw = json.load(sys.stdin)
    items = raw.get("items", raw) if isinstance(raw, dict) else raw
    print(json.dumps(structure_items(items), ensure_ascii=False, indent=2))

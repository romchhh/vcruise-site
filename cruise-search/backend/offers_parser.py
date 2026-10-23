#!/usr/bin/env python3
"""Parse 4gates get_cabins HTML into offer rows (mirrors lib/cruise-search/fourgates-offers.ts)."""

import re
from typing import Any

CATEGORY_BY_TAB: dict[str, str] = {
    "INTERIO": "Внутрішня",
    "SWINDOWS": "З вікном",
    "SBALCON": "З балконом",
    "SWITS": "Сьют",
    "SWITS_AUREA": "Сьют",
    "SWITS_YC": "Сьют",
}


def _parse_money(value: str) -> int | None:
    digits = re.sub(r"[^\d]", "", value or "")
    if not digits:
        return None
    try:
        return int(digits)
    except ValueError:
        return None


def _parse_cabin_meta(name: str) -> dict[str, Any]:
    deck_match = re.search(r"\(пал:\s*([^)]+)\)", name, re.I)
    area_m2 = None
    area_match = re.search(r"(\d+(?:[.,]\d+)?)\s*м\s*2", name, re.I)
    if area_match and not re.search(r"\+\s*\d+\s*м\s*2", name, re.I):
        area_m2 = float(area_match.group(1).replace(",", "."))
    return {
        "areaM2": area_m2,
        "decks": deck_match.group(1).strip() if deck_match else None,
    }


def _strip_tags(html: str) -> str:
    text = re.sub(r"<br\s*/?>", " ", html, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _parse_prices_from_row(row_html: str) -> dict[str, int]:
    price: dict[str, int] = {}
    for match in re.finditer(
        r'<span[^>]*class="[^"]*_?(NAT|USD|EUR)[^"]*"[^>]*>([^<]+)</span>',
        row_html,
        re.I,
    ):
        code = match.group(1).upper()
        amount = _parse_money(match.group(2))
        if amount is not None:
            price[code] = amount
    if price:
        return price

    fallback = re.search(
        r"([\d\s]+)\s*₴|([\d\s]+)\s*\$|([\d\s.,]+)\s*€",
        row_html,
    )
    if fallback:
        nat = _parse_money(fallback.group(1) or "")
        usd = _parse_money(fallback.group(2) or "")
        eur = _parse_money(fallback.group(3) or "")
        if nat is not None:
            price["NAT"] = nat
        if usd is not None:
            price["USD"] = usd
        if eur is not None:
            price["EUR"] = eur
    return price


def _extract_booking_rows(tab_html: str) -> list[str]:
    marker = "booking-table__row"
    rows: list[str] = []
    search_from = 0
    close_tag = "</div>"

    while search_from < len(tab_html):
        row_start = tab_html.find(marker, search_from)
        if row_start < 0:
            break
        content_start = tab_html.find(">", row_start)
        if content_start < 0:
            break

        depth = 1
        index = content_start + 1
        while index < len(tab_html) and depth > 0:
            next_open = tab_html.find("<div", index)
            next_close = tab_html.find(close_tag, index)
            if next_close < 0:
                break
            if next_open >= 0 and next_open < next_close:
                depth += 1
                index = next_open + 4
                continue
            depth -= 1
            index = next_close + len(close_tag)

        if depth == 0:
            rows.append(tab_html[content_start + 1 : index - len(close_tag)])
        search_from = index

    return rows


def _normalize_tariff_name(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return " ".join(str(part).strip() for part in value if str(part).strip())
    if value is None:
        return ""
    return str(value).strip()


def _parse_row_html(row_html: str, category: str) -> dict[str, Any] | None:
    cells: list[str] = []
    for match in re.finditer(r"<div[^>]*>([\s\S]*?)</div>", row_html, re.I):
        inner = match.group(1)
        if 'class="_prices"' in inner or "booking-table" in inner:
            continue
        text = _strip_tags(inner)
        if text and text != "Вибрати":
            cells.append(text)
        if len(cells) >= 4:
            break

    if len(cells) < 3:
        return None

    price = _parse_prices_from_row(row_html)
    if not price:
        return None

    meta = _parse_cabin_meta(cells[1])
    offer: dict[str, Any] = {
        "cabinCode": cells[0],
        "cabinName": cells[1],
        "cabinCategory": category,
        "tariffName": _normalize_tariff_name(cells[2]),
        "price": price,
    }
    if meta["areaM2"] is not None:
        offer["areaM2"] = meta["areaM2"]
    if meta["decks"]:
        offer["decks"] = meta["decks"]
    return offer


def parse_cabins_html(cabins_html: str) -> list[dict[str, Any]]:
    if not cabins_html or "notify" in cabins_html:
        return []

    tab_keys = re.findall(r'id=["\']tab-([^"\']+)["\']', cabins_html)
    offers: list[dict[str, Any]] = []

    for i, tab_key in enumerate(tab_keys):
        category = CATEGORY_BY_TAB.get(tab_key)
        if not category:
            continue

        start = cabins_html.find(f'id="tab-{tab_key}"')
        if start < 0:
            continue

        next_starts = []
        for key in tab_keys[i + 1 :]:
            pos = cabins_html.find(f'id="tab-{key}"', start + 1)
            if pos > start:
                next_starts.append(pos)
        end = min(next_starts) if next_starts else len(cabins_html)
        tab_html = cabins_html[start:end]

        for row_html in _extract_booking_rows(tab_html):
            parsed = _parse_row_html(row_html, category)
            if parsed:
                offers.append(parsed)

    return offers


def booking_url_to_slug(booking_url: str) -> str | None:
    url = (booking_url or "").strip()
    if not url:
        return None
    if url.startswith("/"):
        path = url
    else:
        m = re.search(r"4gates\.cruises(/ua/search/[^?\s]+)", url)
        if m:
            path = m.group(1)
        else:
            path = url
    slug = path.rstrip("/").split("/")[-1]
    if re.match(r"^cruise-.+\.html$", slug, re.I):
        return slug
    return None

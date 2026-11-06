#!/usr/bin/env python3
"""Compare /api/cruise-search results with live 4gates getitems for the same filters."""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

BASE = "https://4gates.cruises"
AGENT = "06138bc5af6023646ede0e1f7c1eac75"
API = "http://localhost:3000/api/cruise-search"
HEADERS = {
    "X-Requested-With": "XMLHttpRequest",
    "Referer": f"{BASE}/ua/search/?",
    "User-Agent": "VcruiseParity/1.0",
}

REGION_IDS = {
    "Південна Європа": "1",
    "Грецькі острови": "4",
    "Західне Середземноморья": "2",
    "Канарські острови": "5",
    "Східне Середземноморья": "3",
    "Північна Європа": "6",
    "Карибські острови": "13",
    "Західні Кариби": "14",
    "Аляска": "21",
    "Азія": "22",
}

COMPANY_IDS = {
    "MSC Cruises": "MSC",
    "Norwegian Cruise Line": "NCL",
    "Costa Cruises": "COS",
    "Royal Caribbean International": "RCC",
    "Celebrity Cruises": "CEL",
}


def slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def http_json(url: str, timeout: int = 60):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def load_filter_meta() -> tuple[str, dict[str, str]]:
    """Widget date window + ship_id index from 4gates getfilter."""
    url = f"{BASE}/search_agent/ajax.php?act=getfilter&agentidmodule={AGENT}&locale=ua"
    data = http_json(url)
    date_min = str(data.get("date_min") or "")
    date_max = str(data.get("date_max") or "")
    if date_min and date_max:
        dates = f"{date_min}-{date_max}"
    else:
        today = date.today()
        start = today - timedelta(days=14)
        end = today + timedelta(days=365 * 3)
        dates = f"{start.strftime('%d.%m.%Y')}-{end.strftime('%d.%m.%Y')}"

    by_slug: dict[str, str] = {}
    for row in data.get("filters", {}).get("ship_id") or []:
        if not isinstance(row, list) or len(row) < 3:
            continue
        name = str(row[1])
        ship_id = str(row[2])
        by_slug[slugify(name)] = ship_id
    return dates, by_slug


def collect_fourgates_keys(
    *,
    dates: str,
    cruise_id: str = "",
    region_id: str = "",
    ship_id: str = "",
) -> tuple[int, set[int]]:
    params = {
        "act": "getitems",
        "pg_num": "0",
        "dates": dates,
        "pr_min": "1",
        "pr_max": "999999",
        "p_min": "1",
        "p_max": "999999",
        "sort": "date_start,duration",
        "curs": "EUR",
        "locale": "ua",
    }
    if cruise_id:
        params["cruise_id"] = cruise_id
    if region_id:
        params["region_id"] = region_id
    if ship_id:
        params["ship_id"] = ship_id

    qs = urllib.parse.urlencode(params)
    first = http_json(f"{BASE}/search/ajax.php?{qs}")
    claimed = int(first.get("total") or 0)
    page_size = len(first.get("items") or []) or 10
    pages = max(1, (claimed + page_size - 1) // page_size) + 6

    def fetch(page: int):
        p = dict(params)
        p["pg_num"] = str(page)
        return http_json(f"{BASE}/search/ajax.php?{urllib.parse.urlencode(p)}")

    with ThreadPoolExecutor(8) as ex:
        rows = list(ex.map(fetch, range(pages)))

    keys: set[int] = set()
    for data in rows:
        for item in data.get("items") or []:
            try:
                keys.add(int(item["key"]))
            except (KeyError, TypeError, ValueError):
                pass
    return claimed, keys


def collect_ours(query: dict[str, str]) -> tuple[int | None, set[int], bool]:
    """Probe total, then pull the full set in one large progressive request."""
    probe_params = dict(query)
    probe_params["offset"] = "0"
    probe_params["limit"] = "12"
    probe = http_json(f"{API}?{urllib.parse.urlencode(probe_params)}", timeout=180)
    if probe.get("error") and not probe.get("cruises"):
        raise RuntimeError(probe["error"])
    total = int(probe.get("total") or 0)
    limit = max(total, 12)

    full_params = dict(query)
    full_params["offset"] = "0"
    full_params["limit"] = str(limit)
    data = http_json(f"{API}?{urllib.parse.urlencode(full_params)}", timeout=300)
    if data.get("error") and not data.get("cruises"):
        raise RuntimeError(data["error"])

    keys = {int(c["key"]) for c in data.get("cruises") or []}
    # If still incomplete / short, page through leftovers.
    offset = data.get("nextOffset")
    complete = bool(data.get("complete"))
    guards = 0
    while offset is not None and guards < 200:
        guards += 1
        page_params = dict(query)
        page_params["offset"] = str(int(offset))
        page_params["limit"] = "100"
        page = http_json(f"{API}?{urllib.parse.urlencode(page_params)}", timeout=300)
        for cruise in page.get("cruises") or []:
            keys.add(int(cruise["key"]))
        complete = bool(page.get("complete"))
        total = int(page.get("total") or total)
        nxt = page.get("nextOffset")
        if nxt is None or int(nxt) <= int(offset):
            break
        offset = nxt
    return total, keys, complete


def ddmmyyyy_to_iso(value: str) -> str:
    day, month, year = value.split(".")
    return f"{year}-{month}-{day}"


def main() -> int:
    dates, ships = load_filter_meta()
    date_from, date_to = dates.split("-")
    print(f"dates={dates}")
    print(f"ships_loaded={len(ships)}")

    cases = [
        # Pin the same date window as 4gates widget so totals match exactly.
        {
            "name": "south + MSC",
            "ours": {
                "where": "Південна Європа",
                "company": "MSC Cruises",
                "dateFrom": ddmmyyyy_to_iso(date_from),
                "dateTo": ddmmyyyy_to_iso(date_to),
            },
            "fg": {"region_id": "1", "cruise_id": "MSC"},
        },
        {
            "name": "south + NCL",
            "ours": {
                "where": "Південна Європа",
                "company": "Norwegian Cruise Line",
                "dateFrom": ddmmyyyy_to_iso(date_from),
                "dateTo": ddmmyyyy_to_iso(date_to),
            },
            "fg": {"region_id": "1", "cruise_id": "NCL"},
        },
        {
            "name": "south + MSC + Magnifica",
            "ours": {
                "where": "Південна Європа",
                "company": "MSC Cruises",
                "liner": "msc-magnifica",
                "dateFrom": ddmmyyyy_to_iso(date_from),
                "dateTo": ddmmyyyy_to_iso(date_to),
            },
            "fg": {
                "region_id": "1",
                "cruise_id": "MSC",
                "ship_id": ships.get("msc-magnifica", ""),
            },
        },
        {
            "name": "Canaries only + Costa",
            "ours": {
                "where": "Канарські острови",
                "company": "Costa Cruises",
                "dateFrom": ddmmyyyy_to_iso(date_from),
                "dateTo": ddmmyyyy_to_iso(date_to),
            },
            "fg": {"region_id": "5", "cruise_id": "COS"},
        },
        {
            "name": "Greek isles + MSC",
            "ours": {
                "where": "Грецькі острови",
                "company": "MSC Cruises",
                "dateFrom": ddmmyyyy_to_iso(date_from),
                "dateTo": ddmmyyyy_to_iso(date_to),
            },
            "fg": {"region_id": "4", "cruise_id": "MSC"},
        },
        {
            "name": "Caribbean + RCC",
            "ours": {
                "where": "Карибські острови",
                "company": "Royal Caribbean International",
                "dateFrom": ddmmyyyy_to_iso(date_from),
                "dateTo": ddmmyyyy_to_iso(date_to),
            },
            "fg": {"region_id": "13", "cruise_id": "RCC"},
        },
        {
            "name": "Alaska + NCL",
            "ours": {
                "where": "Аляска",
                "company": "Norwegian Cruise Line",
                "dateFrom": ddmmyyyy_to_iso(date_from),
                "dateTo": ddmmyyyy_to_iso(date_to),
            },
            "fg": {"region_id": "21", "cruise_id": "NCL"},
        },
        {
            "name": "MSC Magnifica no region",
            "ours": {
                "company": "MSC Cruises",
                "liner": "msc-magnifica",
                "dateFrom": ddmmyyyy_to_iso(date_from),
                "dateTo": ddmmyyyy_to_iso(date_to),
            },
            "fg": {"cruise_id": "MSC", "ship_id": ships.get("msc-magnifica", "")},
        },
        {
            "name": "company only Costa",
            "ours": {
                "company": "Costa Cruises",
                "dateFrom": ddmmyyyy_to_iso(date_from),
                "dateTo": ddmmyyyy_to_iso(date_to),
            },
            "fg": {"cruise_id": "COS"},
        },
        {
            "name": "south + MSC fixed dates",
            "ours": {
                "where": "Південна Європа",
                "company": "MSC Cruises",
                "dateFrom": "2026-11-29",
                "dateTo": "2026-12-31",
            },
            "fg": {
                "region_id": "1",
                "cruise_id": "MSC",
                "dates": "29.11.2026-31.12.2026",
            },
        },
        {
            "name": "west med + Celebrity",
            "ours": {
                "where": "Західне Середземноморья",
                "company": "Celebrity Cruises",
                "dateFrom": ddmmyyyy_to_iso(date_from),
                "dateTo": ddmmyyyy_to_iso(date_to),
            },
            "fg": {"region_id": "2", "cruise_id": "CEL"},
        },
        {
            "name": "north europe + NCL",
            "ours": {
                "where": "Північна Європа",
                "company": "Norwegian Cruise Line",
                "dateFrom": ddmmyyyy_to_iso(date_from),
                "dateTo": ddmmyyyy_to_iso(date_to),
            },
            "fg": {"region_id": "6", "cruise_id": "NCL"},
        },
        {
            "name": "year 2027 + MSC + south",
            "ours": {
                "where": "Південна Європа",
                "company": "MSC Cruises",
                "year": "2027",
            },
            "fg": {
                "region_id": "1",
                "cruise_id": "MSC",
                "dates": "01.01.2027-31.12.2027",
            },
        },
    ]

    failed = 0
    for case in cases:
        name = case["name"]
        fg = case["fg"]
        case_dates = fg.get("dates") or dates
        ship_id = fg.get("ship_id", "")
        if "liner" in case["ours"] and not ship_id:
            print(f"FAIL {name}: no ship_id for liner {case['ours'].get('liner')}")
            failed += 1
            continue

        t0 = time.time()
        claimed, fg_keys = collect_fourgates_keys(
            dates=case_dates,
            cruise_id=fg.get("cruise_id", ""),
            region_id=fg.get("region_id", ""),
            ship_id=ship_id,
        )
        t1 = time.time()
        try:
            our_total, our_keys, complete = collect_ours(case["ours"])
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL {name}: API error {exc}")
            failed += 1
            continue
        t2 = time.time()

        missing = fg_keys - our_keys
        extra = our_keys - fg_keys
        ok = (
            our_total == claimed
            and len(our_keys) == len(fg_keys)
            and not missing
            and not extra
            and complete
        )
        status = "OK" if ok else "FAIL"
        if not ok:
            failed += 1
        print(
            f"{status} {name}: 4gates claimed={claimed} unique={len(fg_keys)} | "
            f"ours total={our_total} unique={len(our_keys)} complete={complete} | "
            f"missing={len(missing)} extra={len(extra)} | "
            f"fg={t1 - t0:.1f}s api={t2 - t1:.1f}s"
        )
        if missing:
            print(f"  missing sample {sorted(missing)[:8]}")
        if extra:
            print(f"  extra sample {sorted(extra)[:8]}")

    print(f"\n{'ALL PASSED' if failed == 0 else f'{failed} FAILED'}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

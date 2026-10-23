#!/usr/bin/env python3
"""
Завантажує матрицю кают × тарифів (get_cabins) для найближчих N днів.

Результат: data/cruise-search/offers_by_slug.json
Без popup m² — швидший bulk; площа з назви каюти, якщо є в HTML.
"""

import argparse
import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests

from offers_parser import booking_url_to_slug, parse_cabins_html

BASE_URL = "https://4gates.cruises"
SEARCH_PAGE = f"{BASE_URL}/ua/search/"
AJAX_ENDPOINT = f"{BASE_URL}/search/ajax.php"

ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_CRUISES = ROOT / "data" / "cruise-search" / "cruises_output.json"
DEFAULT_OUTPUT = ROOT / "data" / "cruise-search" / "offers_by_slug.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; VcruiseBot/1.0; +https://vcruise.ua)"
    ),
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
}

DEFAULT_DAYS = 90
DEFAULT_WORKERS = 8
DEFAULT_PAUSE = 0.05
SAVE_EVERY = 40


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_cruises(path: Path) -> list[dict[str, Any]]:
    raw = path.read_text(encoding="utf-8")
    data = json.loads(raw)
    if not isinstance(data, list):
        raise ValueError("cruises_output.json must be a JSON array")
    return data


def collect_slugs(cruises: list[dict[str, Any]], horizon_days: int) -> dict[str, str]:
    """slug -> canonical booking_url (referer)."""
    today = date.today()
    end = today + timedelta(days=horizon_days)
    slugs: dict[str, str] = {}

    for cruise in cruises:
        for entry in cruise.get("available_dates") or []:
            sailing = entry.get("date")
            if not sailing:
                continue
            try:
                y, m, d = sailing.split("-")
                sailing_date = date(int(y), int(m), int(d))
            except (ValueError, TypeError):
                continue
            if sailing_date < today or sailing_date > end:
                continue
            booking_url = (entry.get("booking_url") or "").strip()
            if not booking_url:
                continue
            slug = booking_url_to_slug(booking_url)
            if not slug:
                continue
            referer = booking_url if booking_url.startswith("http") else f"{BASE_URL}/ua/search/{slug}"
            slugs.setdefault(slug, referer)

    return slugs


def load_output(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"meta": {}, "offers": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and "offers" in data:
            return data
    except json.JSONDecodeError:
        pass
    return {"meta": {}, "offers": {}}


def save_output(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    tmp.replace(path)


def make_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(HEADERS)
    resp = session.get(SEARCH_PAGE, timeout=45)
    resp.raise_for_status()
    return session


def cabins_empty(html: str) -> bool:
    if not html or not html.strip():
        return True
    return "notify" in html or "booking-table__row" not in html


class CabinsFetcher:
    def __init__(self, pause_sec: float):
        self.pause_sec = max(0.0, pause_sec)
        self._local = threading.local()

    def _session(self) -> requests.Session:
        if not getattr(self._local, "session", None):
            self._local.session = make_session()
        return self._local.session

    def fetch(self, slug: str, referer: str) -> list[dict[str, Any]]:
        params = {
            "act": "get_cabins",
            "urls": slug,
            "locale": "ua",
            "aduls": "2",
            "childs": "0",
            "childs1": "0",
        }
        session = self._session()
        headers = {**HEADERS, "Referer": referer}

        last_html = ""
        for attempt in range(2):
            try:
                resp = session.get(
                    AJAX_ENDPOINT,
                    params=params,
                    headers=headers,
                    timeout=90,
                )
                resp.raise_for_status()
                data = resp.json()
                last_html = (data.get("cabins") or "") if isinstance(data, dict) else ""
            except (requests.RequestException, json.JSONDecodeError, ValueError):
                last_html = ""

            if not cabins_empty(last_html):
                break

            self._local.session = make_session()
            session = self._local.session
            time.sleep(min(2 ** attempt, 4))

        if self.pause_sec:
            time.sleep(self.pause_sec)

        return parse_cabins_html(last_html)


def parse_cli() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync 4gates cabin offers (90d horizon)")
    parser.add_argument("--days", type=int, default=DEFAULT_DAYS)
    parser.add_argument("--workers", type=int, default=DEFAULT_WORKERS)
    parser.add_argument("--pause", type=float, default=DEFAULT_PAUSE)
    parser.add_argument("--input", type=Path, default=DEFAULT_CRUISES)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", type=int, default=0, help="max slugs (debug)")
    parser.add_argument(
        "--refresh-hours",
        type=float,
        default=72,
        help="skip slugs fetched within this many hours",
    )
    return parser.parse_args()


def slug_fetched_recently(
    offers: dict[str, Any],
    slug: str,
    refresh_hours: float,
) -> bool:
    if refresh_hours <= 0:
        return False
    entry = offers.get(slug)
    if not isinstance(entry, dict):
        return False
    fetched_at = entry.get("fetchedAt")
    if not fetched_at:
        return False
    try:
        ts = datetime.fromisoformat(str(fetched_at).replace("Z", "+00:00"))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
    except ValueError:
        return False
    age = datetime.now(timezone.utc) - ts.astimezone(timezone.utc)
    return age.total_seconds() < refresh_hours * 3600


def main() -> None:
    args = parse_cli()
    cruises_path = args.input.resolve()
    output_path = args.output.resolve()

    if not cruises_path.exists():
        raise SystemExit(f"Немає файлу круїзів: {cruises_path}")

    cruises = load_cruises(cruises_path)
    slug_map = collect_slugs(cruises, args.days)
    slugs = list(slug_map.items())
    if args.limit > 0:
        slugs = slugs[: args.limit]

    payload = load_output(output_path)
    offers_store: dict[str, Any] = payload.setdefault("offers", {})

    to_fetch: list[tuple[str, str]] = []
    for slug, referer in slugs:
        if slug_fetched_recently(offers_store, slug, args.refresh_hours):
            continue
        to_fetch.append((slug, referer))

    print(
        f"[offers] горизонт {args.days} дн.: унікальних URL {len(slugs)}, "
        f"до завантаження {len(to_fetch)} (workers={args.workers})"
    )

    fetcher = CabinsFetcher(args.pause)
    done = 0
    errors = 0

    def work(item: tuple[str, str]) -> tuple[str, list[dict[str, Any]] | None]:
        slug, referer = item
        try:
            rows = fetcher.fetch(slug, referer)
            return slug, rows
        except Exception:
            return slug, None

    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
        futures = {pool.submit(work, item): item[0] for item in to_fetch}
        for future in as_completed(futures):
            slug, rows = future.result()
            done += 1
            if rows is None:
                errors += 1
                continue
            offers_store[slug] = {
                "fetchedAt": utc_now_iso(),
                "offers": rows,
            }
            if done % SAVE_EVERY == 0 or done == len(to_fetch):
                payload["meta"] = {
                    "updatedAt": utc_now_iso(),
                    "horizonDays": args.days,
                    "slugCount": len(offers_store),
                    "referenceGuests": {"adults": 2, "children": 0},
                }
                save_output(output_path, payload)
                print(f"[offers] збережено {done}/{len(to_fetch)} → {output_path.name}")

    payload["meta"] = {
        "updatedAt": utc_now_iso(),
        "horizonDays": args.days,
        "slugCount": len(offers_store),
        "referenceGuests": {"adults": 2, "children": 0},
    }
    save_output(output_path, payload)
    print(
        f"[offers] готово: {len(to_fetch)} запитів, помилок {errors}, "
        f"у файлі {len(offers_store)} slug → {output_path}"
    )


if __name__ == "__main__":
    main()

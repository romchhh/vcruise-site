#!/usr/bin/env python3
"""
Парсер пошуку круїзів 4gates.cruises — повне вивантаження + структуризація.

Логіка:
1. Йде на сторінку /ua/search/, щоб отримати сесійні cookie (PHPSESSID, Nat).
2. Дергає ajax.php?act=getitems сторінка за сторінкою (ліміт — MAX_ITEMS).
3. Кожен batch структурує через structure_cruises і дописує у файл одразу.
4. Результат — data/cruise-search/cruises_output.json (приватна папка data).

Потребує: pip install requests beautifulsoup4
Запуск:
  ../run-parser.sh --force
  python3 cruise_parser.py [--limit N] [--output PATH]
"""

import argparse
import json
import time
from pathlib import Path

import requests

from structure_cruises import structure_items

BASE_URL = "https://4gates.cruises"
SEARCH_PAGE = f"{BASE_URL}/ua/search/"
AJAX_ENDPOINT = f"{BASE_URL}/search/ajax.php"
OUTPUT_FILE = (
    Path(__file__).resolve().parent.parent.parent
    / "data"
    / "cruise-search"
    / "cruises_output.json"
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": SEARCH_PAGE + "?",
}

# Максимально широкі фільтри — щоб забрати геть усі круїзи з видачі.
FILTERS = {
    "act": "getitems",
    "pg_num": "0",
    "dates": "01.01.2020-31.12.2035",
    "pr_min": "1",
    "pr_max": "999",
    "p_min": "1",
    "p_max": "999999999",
    "sort": "date_start,duration",
    "curs": "NAT",
    "locale": "ua",
}

REQUEST_PAUSE_SEC = 0.35
MAX_RETRIES = 5

# Ліміт круїзів для вивантаження. None або 0 = без ліміту (все).
MAX_ITEMS = None


class IncrementalJsonArrayWriter:
    """Пише компактний JSON-масив у .tmp, потім атомарно замінює цільовий файл."""

    def __init__(self, path: Path):
        self.path = path
        self.tmp_path = path.with_suffix(path.suffix + ".tmp")
        path.parent.mkdir(parents=True, exist_ok=True)
        if self.tmp_path.exists():
            self.tmp_path.unlink()
        self._file = self.tmp_path.open("w", encoding="utf-8")
        self._file.write("[")
        self.count = 0
        self._closed = False
        self._finalized = False

    def append_items(self, items: list) -> None:
        if not items:
            return
        for item in items:
            if self.count > 0:
                self._file.write(",")
            json.dump(
                item,
                self._file,
                ensure_ascii=False,
                separators=(",", ":"),
            )
            self.count += 1
        self._file.flush()

    def close(self) -> None:
        if self._closed:
            return
        self._file.write("]")
        self._file.close()
        self._closed = True
        if self.count > 0:
            backup = self.path.with_suffix(self.path.suffix + ".bak")
            if self.path.exists():
                try:
                    if backup.exists():
                        backup.unlink()
                    self.path.replace(backup)
                except OSError:
                    pass
            self.tmp_path.replace(self.path)
            self._finalized = True
        elif self.tmp_path.exists():
            self.tmp_path.unlink()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc_type is not None:
            try:
                if not self._closed:
                    self._file.close()
                    self._closed = True
                if self.tmp_path.exists() and not self._finalized:
                    self.tmp_path.unlink()
            except OSError:
                pass
            return False
        self.close()
        return False


def get_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(HEADERS)
    resp = session.get(SEARCH_PAGE, timeout=30)
    resp.raise_for_status()
    print(f"[session] статус завантаження сторінки: {resp.status_code}")
    print(f"[session] отримані cookie: {dict(session.cookies)}")
    return session


def fetch_cruises(session: requests.Session, filters: dict, page: int = 0) -> dict:
    params = dict(filters)
    params["pg_num"] = str(page)
    params["_"] = str(int(time.time() * 1000))

    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = session.get(AJAX_ENDPOINT, params=params, timeout=60)
            resp.raise_for_status()
            try:
                data = resp.json()
            except json.JSONDecodeError:
                print(f"[ajax] стор. {page}: відповідь не JSON (спроба {attempt}/{MAX_RETRIES})")
                print(resp.text[:500])
                last_err = RuntimeError("відповідь не JSON")
                time.sleep(min(2 ** attempt, 20))
                continue

            if not isinstance(data, dict):
                print(f"[ajax] стор. {page}: JSON не dict (спроба {attempt}/{MAX_RETRIES})")
                last_err = RuntimeError("JSON не dict")
                time.sleep(min(2 ** attempt, 20))
                continue

            # "items": null — помилкова/порожня відповідь API, повторюємо запит
            if data.get("items") is None:
                print(
                    f"[ajax] стор. {page}: items=null "
                    f"(спроба {attempt}/{MAX_RETRIES})"
                )
                last_err = RuntimeError("items is null")
                time.sleep(min(2 ** attempt, 20))
                continue

            if not isinstance(data["items"], list):
                print(
                    f"[ajax] стор. {page}: items не list "
                    f"(спроба {attempt}/{MAX_RETRIES})"
                )
                last_err = RuntimeError("items is not a list")
                time.sleep(min(2 ** attempt, 20))
                continue

            return data

        except requests.RequestException as exc:
            last_err = exc
            print(f"[ajax] стор. {page}: помилка {exc} (спроба {attempt}/{MAX_RETRIES})")
        time.sleep(min(2 ** attempt, 20))

    raise RuntimeError(f"Не вдалося завантажити сторінку {page}: {last_err}")


def get_page_count(total: int, page_size: int) -> int:
    if page_size <= 0:
        return 0
    return (total + page_size - 1) // page_size


def parse_cli() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Завантаження круїзів з 4gates.cruises у cruises_output.json"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="максимум круїзів (0 = без ліміту)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_FILE,
        help=f"шлях до JSON (за замовч.: {OUTPUT_FILE})",
    )
    parser.add_argument(
        "--pause",
        type=float,
        default=REQUEST_PAUSE_SEC,
        help="пауза між сторінками, сек",
    )
    return parser.parse_args()


def main():
    args = parse_cli()
    output_path = args.output.resolve()
    pause_sec = max(0.0, args.pause)
    limit = args.limit if args.limit > 0 else (MAX_ITEMS if MAX_ITEMS else None)

    session = get_session()

    first_page = fetch_cruises(session, FILTERS, page=0)
    total = int(first_page.get("total", 0) or 0)
    items_first = first_page.get("items") or []
    page_size = len(items_first) or 10

    print(f"\nВсього круїзів під ці фільтри: {total}")
    print(f"Елементів на сторінку: {page_size}")

    total_pages = get_page_count(total, page_size)
    if limit:
        total_pages = min(total_pages, get_page_count(limit, page_size))
        print(f"Ліміт: {limit} круїзів → сторінок: {total_pages}\n")
    else:
        print(f"Всього сторінок: {total_pages}")
        print("Ліміту немає — качаємо все.\n")

    print(f"Пишемо результати одразу → {output_path}\n")

    with IncrementalJsonArrayWriter(output_path) as writer:
        for page in range(total_pages):
            data = first_page if page == 0 else fetch_cruises(session, FILTERS, page=page)
            if page != 0:
                time.sleep(pause_sec)

            batch = data.get("items") or []
            if limit:
                remaining = limit - writer.count
                if remaining <= 0:
                    break
                batch = batch[:remaining]

            structured = structure_items(batch)
            writer.append_items(structured)

            if page == 0 or (page + 1) % 25 == 0 or page + 1 == total_pages:
                target = limit or total
                print(
                    f"[progress] сторінка {page + 1}/{total_pages} "
                    f"({writer.count}/{target} items) → {output_path.name}"
                )

            if limit and writer.count >= limit:
                print(
                    f"[progress] досягнуто ліміт {limit} "
                    f"(сторінка {page + 1}/{total_pages})"
                )
                break

    print(f"\nЗбережено {writer.count} круїзів → {output_path}")


if __name__ == "__main__":
    main()

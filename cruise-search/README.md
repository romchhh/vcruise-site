# Парсер круїзів (4gates.cruises)

Джерело даних для пошуку на сайті VCRUISE (Next.js).

| Файл | Призначення |
|------|-------------|
| `backend/cruise_parser.py` | Завантаження сторінок `ajax.php?act=getitems` |
| `backend/structure_cruises.py` | Перетворення HTML-полів у JSON для фронтенду |
| `backend/sync_offers.py` | Тарифи кают (`get_cabins`) для найближчих **90 днів** |
| `run-parser.sh` | **Єдиний скрипт запуску** (venv, логи, інтервал 3 дні) |

**Результат:** `data/cruise-search/cruises_output.json` + `offers_by_slug.json` (у git не комітяться).

Після основного парсера автоматично запускається `sync_offers.py` (8 потоків, без popup m²).  
Окремо: `npm run cruises:offers` або `python sync_offers.py --days 90 --workers 8`.

## Швидкий старт

```bash
chmod +x cruise-search/run-parser.sh

# Повне оновлення (10–40 хв, залежно від мережі)
./cruise-search/run-parser.sh --force

# У фоні
./cruise-search/run-parser.sh --force --background
tail -f data/cruise-search/logs/update-*.log

# Тест на 200 круїзах
./cruise-search/run-parser.sh --force --limit 200

# Швидше: лише каталог (без get_cabins на 90 днів)
./cruise-search/run-parser.sh --force --skip-offers

# Більше паралелізму (обережно з навантаженням на 4gates)
./cruise-search/run-parser.sh --force --workers 6 --offers-workers 16
```

### Що впливає на швидкість

| Етап | Було | Зараз |
|------|------|--------|
| `getitems` (каталог) | 1 сторінка за раз + пауза 0.15 с, warm cookie | до **4** сторінок паралельно, без PHPSESSID, пауза **0.05 с** між пакетами |
| Структуризація HTML | багато BeautifulSoup | **lxml** + regex для маршруту/класів |
| `get_cabins` (90 днів) | 8 потоків, warm cookie кожного воркера | **12** потоків, без cookie; slug молодші **72 год** пропускаються (`--refresh-hours`) |

Найдовший крок — **offers** (~2–3 тис. URL × 0.1–7 с). Для щоденного оновлення цін достатньо `npm run cruises:offers`; повний `--force` раз на 3 дні.

Або з кореня проєкту:

```bash
npm run cruises:update
```

## Автооновлення кожні 3 дні

```bash
chmod +x scripts/cruise-scheduler.sh
./scripts/cruise-scheduler.sh install
./scripts/cruise-scheduler.sh status
```

## Локальна розробка без парсера

Скопіюй `cruises_output.json` з сервера в `data/cruise-search/`.  
Сайт віддає дані через `GET /api/cruises`.

## Залежності

- Python 3.10+
- `requests`, `beautifulsoup4` (ставляться у `cruise-search/.venv` автоматично)

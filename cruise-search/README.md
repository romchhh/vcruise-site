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
```

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

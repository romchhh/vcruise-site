# База круїзів для пошуку

`cruises_output.json` **не зберігається в git** (див. `.gitignore`) — файл великий
(~70+ MB) і оновлюється парсером на сервері.

## Перший запуск на сервері

```bash
sudo apt-get install -y python3 python3-venv python3-pip
git pull
chmod +x scripts/update-cruises.sh scripts/cruise-scheduler.sh

# у фоні — термінал можна закрити
./scripts/update-cruises.sh --force --background
tail -f data/cruise-search/logs/update-*.log
```

Парсер качає всі круїзи з 4gates.cruises — **10–40 хвилин** на слабкому VPS.
Поки йде завантаження, у логах з'являються рядки `[progress] сторінка X/Y`.

## Автоматичне оновлення кожні 3 дні

```bash
./scripts/cruise-scheduler.sh install
./scripts/cruise-scheduler.sh status
```

Планувальник (systemd на Linux) запускає оновлення **у фоні** сам.

## Корисні команди

```bash
./scripts/cruise-scheduler.sh run --force --background
./scripts/cruise-scheduler.sh logs
tail -f data/cruise-search/logs/update-*.log
ls -lh data/cruise-search/cruises_output.json
```

## Локальна розробка

Скопіюй файл з сервера або згенеруй локально:

```bash
./scripts/update-cruises.sh --force
```

Сайт читає цей файл через `/api/cruises`.

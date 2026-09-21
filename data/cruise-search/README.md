# База круїзів для пошуку

`cruises_output.json` **не зберігається в git** — файл великий (~70+ MB) і
оновлюється парсером.

## Перший запуск на сервері

```bash
sudo apt-get update
sudo apt-get install -y python3 python3-venv python3-pip
git pull
chmod +x scripts/update-cruises.sh scripts/cruise-scheduler.sh
./scripts/update-cruises.sh --force
```

## Автоматичне оновлення кожні 3 дні

```bash
./scripts/cruise-scheduler.sh install
./scripts/cruise-scheduler.sh status
```

## Локальна розробка

Скопіюй файл з сервера або згенеруй локально:

```bash
./scripts/update-cruises.sh --force
```

Сайт читає цей файл через `/api/cruises`.

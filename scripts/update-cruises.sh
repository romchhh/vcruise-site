#!/usr/bin/env bash
#
# Оновлення бази круїзів з 4gates.cruises для Next.js сайту.
# За замовчуванням запускається не частіше ніж раз на 3 дні.
#
# Ручний запуск:
#   ./scripts/update-cruises.sh
#   ./scripts/update-cruises.sh --force
#
# Автоматично кожні 3 дні (launchd на macOS / systemd на Linux):
#   ./scripts/cruise-scheduler.sh install
#
set -euo pipefail

INTERVAL_DAYS=3
FORCE=0

for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=1 ;;
    --help|-h)
      echo "Usage: $0 [--force]"
      echo "  --force  оновити зараз, ігноруючи інтервал у ${INTERVAL_DAYS} дні"
      exit 0
      ;;
    *)
      echo "Невідомий аргумент: $arg (допомога: --help)" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PARSER_DIR="${PROJECT_ROOT}/cruise-search/backend"
VENV_DIR="${PROJECT_ROOT}/cruise-search/.venv"
OUTPUT_FILE="${PROJECT_ROOT}/data/cruise-search/cruises_output.json"
STATE_FILE="${PROJECT_ROOT}/data/cruise-search/.last-update"
LOG_DIR="${PROJECT_ROOT}/data/cruise-search/logs"
LOG_FILE="${LOG_DIR}/update-$(date +%Y-%m-%d_%H-%M-%S).log"

log() {
  local message="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$message"
  echo "$message" >>"$LOG_FILE"
}

days_since_last_run() {
  if [[ ! -f "$STATE_FILE" ]]; then
    echo "999"
    return
  fi

  local last_run now diff
  last_run="$(cat "$STATE_FILE")"
  now="$(date +%s)"
  diff=$(( (now - last_run) / 86400 ))
  echo "$diff"
}

should_run() {
  if [[ "$FORCE" -eq 1 ]]; then
    return 0
  fi

  local elapsed
  elapsed="$(days_since_last_run)"
  if [[ "$elapsed" -lt "$INTERVAL_DAYS" ]]; then
    log "Пропуск: останнє оновлення було ${elapsed} дн. тому (інтервал: ${INTERVAL_DAYS} дн.)."
    log "Для примусового запуску: $0 --force"
    return 1
  fi

  return 0
}

ensure_python_env() {
  if [[ ! -d "$PARSER_DIR" ]]; then
    log "Помилка: не знайдено ${PARSER_DIR}"
    log "Зроби git pull — парсер має бути в репозиторії (cruise-search/backend/)."
    exit 1
  fi

  if [[ ! -f "${PARSER_DIR}/cruise_parser.py" ]]; then
    log "Помилка: не знайдено cruise_parser.py"
    exit 1
  fi

  if [[ ! -d "$VENV_DIR" ]]; then
    log "Створюю Python venv: ${VENV_DIR}"
    python3 -m venv "$VENV_DIR"
  fi

  # shellcheck disable=SC1091
  source "${VENV_DIR}/bin/activate"

  log "Встановлюю/оновлюю залежності Python..."
  python -m pip install --upgrade pip >/dev/null
  python -m pip install -r "${PARSER_DIR}/requirements.txt" >/dev/null
}

backup_output() {
  if [[ -f "$OUTPUT_FILE" ]]; then
    local backup_file="${OUTPUT_FILE}.bak"
    cp "$OUTPUT_FILE" "$backup_file"
    log "Резервна копія: ${backup_file}"
  fi
}

run_parser() {
  log "Запуск парсера 4gates.cruises..."
  (
    cd "$PARSER_DIR"
    python cruise_parser.py
  ) 2>&1 | tee -a "$LOG_FILE"
}

verify_output() {
  if [[ ! -s "$OUTPUT_FILE" ]]; then
    log "Помилка: файл результату порожній або відсутній: ${OUTPUT_FILE}"
    exit 1
  fi

  local count
  count="$(python - "$OUTPUT_FILE" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
raw = path.read_text(encoding="utf-8").strip()
data = json.loads(raw if raw.startswith("[") else f"[{raw}]")
if not isinstance(data, list) or len(data) == 0:
    raise SystemExit("JSON не містить круїзів")
print(len(data))
PY
)"
  log "Перевірка OK: ${count} круїзів у ${OUTPUT_FILE}"
}

mark_success() {
  date +%s >"$STATE_FILE"
  log "Оновлення завершено. Наступний запуск після ${INTERVAL_DAYS} днів (або з --force)."
}

main() {
  mkdir -p "$LOG_DIR"
  mkdir -p "$(dirname "$OUTPUT_FILE")"

  log "=== Старт оновлення бази круїзів ==="
  log "Проєкт: ${PROJECT_ROOT}"

  if ! should_run; then
    exit 0
  fi

  ensure_python_env
  backup_output
  run_parser
  verify_output
  mark_success

  log "=== Готово ==="
}

main "$@"

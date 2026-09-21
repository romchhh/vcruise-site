#!/usr/bin/env bash
#
# Оновлення бази круїзів з 4gates.cruises для Next.js сайту.
# За замовчуванням запускається не частіше ніж раз на 3 дні.
#
# Ручний запуск:
#   ./scripts/update-cruises.sh
#   ./scripts/update-cruises.sh --force
#   ./scripts/update-cruises.sh --force --background
#
# Автоматично кожні 3 дні (launchd на macOS / systemd на Linux):
#   ./scripts/cruise-scheduler.sh install
#
set -euo pipefail

INTERVAL_DAYS=3
FORCE=0
BACKGROUND=0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PARSER_DIR="${PROJECT_ROOT}/cruise-search/backend"
VENV_DIR="${PROJECT_ROOT}/cruise-search/.venv"
OUTPUT_FILE="${PROJECT_ROOT}/data/cruise-search/cruises_output.json"
STATE_FILE="${PROJECT_ROOT}/data/cruise-search/.last-update"
LOG_DIR="${PROJECT_ROOT}/data/cruise-search/logs"
PID_FILE="${LOG_DIR}/update.pid"
LOG_FILE="${LOG_DIR}/update-$(date +%Y-%m-%d_%H-%M-%S).log"

for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=1 ;;
    --background|-b) BACKGROUND=1 ;;
    --help|-h)
      cat <<EOF
Usage: $0 [--force] [--background]

  --force       оновити зараз, ігноруючи інтервал у ${INTERVAL_DAYS} дні
  --background  запустити у фоні (термінал можна закрити)
EOF
      exit 0
      ;;
    *)
      echo "Невідомий аргумент: $arg (допомога: --help)" >&2
      exit 1
      ;;
  esac
done

start_background() {
  mkdir -p "$LOG_DIR"

  if [[ -f "$PID_FILE" ]]; then
    local running_pid
    running_pid="$(cat "$PID_FILE")"
    if kill -0 "$running_pid" 2>/dev/null; then
      echo "Оновлення вже виконується (PID ${running_pid})."
      echo "Прогрес: tail -f ${LOG_DIR}/update-*.log"
      exit 0
    fi
    rm -f "$PID_FILE"
  fi

  local args=()
  [[ "$FORCE" -eq 1 ]] && args+=(--force)

  nohup "$0" "${args[@]}" >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"

  echo "Запущено у фоні (PID $(cat "$PID_FILE"))."
  echo "Лог: ${LOG_FILE}"
  echo "Прогрес: tail -f ${LOG_FILE}"
}

if [[ "$BACKGROUND" -eq 1 ]]; then
  start_background
  exit 0
fi

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

cleanup() {
  rm -f "$PID_FILE"
}

main() {
  mkdir -p "$LOG_DIR"
  mkdir -p "$(dirname "$OUTPUT_FILE")"
  trap cleanup EXIT

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

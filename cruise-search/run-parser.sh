#!/usr/bin/env bash
#
# Запуск парсера круїзів 4gates.cruises → data/cruise-search/cruises_output.json
#
# Приклади:
#   ./cruise-search/run-parser.sh              # оновити, якщо минуло ≥3 дні
#   ./cruise-search/run-parser.sh --force      # завжди зараз
#   ./cruise-search/run-parser.sh --force -b   # у фоні (лог у data/cruise-search/logs/)
#   ./cruise-search/run-parser.sh --force --limit 500
#
set -euo pipefail

INTERVAL_DAYS=3
FORCE=0
BACKGROUND=0
LIMIT=""
WORKERS=4
OFFERS_WORKERS=12
SKIP_OFFERS=0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PARSER_DIR="${SCRIPT_DIR}/backend"
VENV_DIR="${SCRIPT_DIR}/.venv"
OUTPUT_FILE="${PROJECT_ROOT}/data/cruise-search/cruises_output.json"
STATE_FILE="${PROJECT_ROOT}/data/cruise-search/.last-update"
LOG_DIR="${PROJECT_ROOT}/data/cruise-search/logs"
PID_FILE="${LOG_DIR}/update.pid"
LOG_FILE="${LOG_DIR}/update-$(date +%Y-%m-%d_%H-%M-%S).log"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

  --force, -f       ігнорувати інтервал ${INTERVAL_DAYS} дні між оновленнями
  --background, -b  запуск у фоні (nohup)
  --limit N         завантажити лише N круїзів (тест / дебаг)
  --workers N       паралельних сторінок getitems (за замовч.: 4)
  --offers-workers N  потоків get_cabins (за замовч.: 12)
  --skip-offers     лише каталог cruises_output.json, без offers_by_slug
  --help, -h        ця довідка

Результат: ${OUTPUT_FILE}
Сайт читає дані через /api/cruises (Next.js).
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force|-f) FORCE=1; shift ;;
    --background|-b) BACKGROUND=1; shift ;;
    --limit)
      LIMIT="${2:?потрібно число після --limit}"
      shift 2
      ;;
    --workers)
      WORKERS="${2:?потрібно число після --workers}"
      shift 2
      ;;
    --offers-workers)
      OFFERS_WORKERS="${2:?потрібно число після --offers-workers}"
      shift 2
      ;;
    --skip-offers)
      SKIP_OFFERS=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Невідомий аргумент: $1" >&2
      usage >&2
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
      echo "Парсер уже працює (PID ${running_pid})."
      echo "Лог: tail -f ${LOG_DIR}/update-*.log"
      exit 0
    fi
    rm -f "$PID_FILE"
  fi

  local args=(--force)
  [[ -n "$LIMIT" ]] && args+=(--limit "$LIMIT")

  nohup "$0" "${args[@]}" >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"

  echo "Парсер запущено у фоні (PID $(cat "$PID_FILE"))."
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
  mkdir -p "$LOG_DIR"
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
    log "Пропуск: останнє оновлення ${elapsed} дн. тому (інтервал ${INTERVAL_DAYS} дн.)."
    log "Примусово: $0 --force"
    return 1
  fi
  return 0
}

PYTHON=""

resolve_python() {
  if [[ -x "${VENV_DIR}/bin/python" ]]; then
    PYTHON="${VENV_DIR}/bin/python"
  elif [[ -x "${VENV_DIR}/bin/python3" ]]; then
    PYTHON="${VENV_DIR}/bin/python3"
  else
    PYTHON=""
  fi
}

ensure_python_env() {
  if [[ ! -f "${PARSER_DIR}/cruise_parser.py" ]]; then
    log "Помилка: не знайдено ${PARSER_DIR}/cruise_parser.py"
    exit 1
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    log "Помилка: немає python3. На Ubuntu: apt install python3 python3-venv python3-pip"
    exit 1
  fi

  resolve_python
  if [[ -z "$PYTHON" ]]; then
    log "Створюю venv: ${VENV_DIR}"
    rm -rf "$VENV_DIR"
    python3 -m venv "$VENV_DIR"
    resolve_python
  fi

  if [[ -z "$PYTHON" ]]; then
    log "Помилка: venv без інтерпретатора. На Ubuntu: apt install python3-venv"
    exit 1
  fi

  log "Залежності Python (requests, beautifulsoup4)..."
  "$PYTHON" -m pip install -q --upgrade pip
  "$PYTHON" -m pip install -q -r "${PARSER_DIR}/requirements.txt"
}

backup_output() {
  if [[ -f "$OUTPUT_FILE" ]]; then
    cp "$OUTPUT_FILE" "${OUTPUT_FILE}.bak"
    log "Резервна копія: ${OUTPUT_FILE}.bak"
  fi
}

run_parser() {
  log "Парсер 4gates.cruises..."
  (
    cd "$PARSER_DIR"
    # macOS bash + set -u: empty "${arr[@]}" is "unbound variable"
    if [[ -n "$LIMIT" ]]; then
      "$PYTHON" cruise_parser.py --limit "$LIMIT" --workers "$WORKERS"
    else
      "$PYTHON" cruise_parser.py --workers "$WORKERS"
    fi
  ) 2>&1 | tee -a "$LOG_FILE"
}

run_offers_sync() {
  log "Синхронізація тарифів кают (90 днів)..."
  (
    cd "$PARSER_DIR"
    if [[ -n "$LIMIT" ]]; then
      "$PYTHON" sync_offers.py --days 90 --workers "$OFFERS_WORKERS" --limit "$LIMIT"
    else
      "$PYTHON" sync_offers.py --days 90 --workers "$OFFERS_WORKERS"
    fi
  ) 2>&1 | tee -a "$LOG_FILE"
}

verify_output() {
  if [[ ! -s "$OUTPUT_FILE" ]]; then
    log "Помилка: порожній або відсутній ${OUTPUT_FILE}"
    exit 1
  fi

  local count
  count="$("$PYTHON" - "$OUTPUT_FILE" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
data = json.loads(path.read_text(encoding="utf-8"))
if not isinstance(data, list) or len(data) == 0:
    raise SystemExit("JSON не містить круїзів")
print(len(data))
PY
)"
  log "OK: ${count} круїзів → ${OUTPUT_FILE}"
}

cleanup() {
  rm -f "$PID_FILE"
}

main() {
  mkdir -p "$LOG_DIR" "$(dirname "$OUTPUT_FILE")"
  trap cleanup EXIT

  log "=== VCRUISE cruise parser ==="
  log "Проєкт: ${PROJECT_ROOT}"

  if ! should_run; then
    exit 0
  fi

  ensure_python_env
  backup_output
  run_parser
  verify_output
  if [[ "$SKIP_OFFERS" -eq 1 ]]; then
    log "Пропуск sync_offers (--skip-offers)."
  else
    run_offers_sync
  fi
  date +%s >"$STATE_FILE"
  log "Готово. Наступний запуск через ${INTERVAL_DAYS} дн. або з --force."
}

main

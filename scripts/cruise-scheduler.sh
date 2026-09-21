#!/usr/bin/env bash
#
# Планувальник оновлення бази круїзів через macOS launchd (без cron).
#
# Встановити (кожні 3 дні):
#   ./scripts/cruise-scheduler.sh install
#
# Статус / зупинити / запустити зараз:
#   ./scripts/cruise-scheduler.sh status
#   ./scripts/cruise-scheduler.sh uninstall
#   ./scripts/cruise-scheduler.sh run
#
set -euo pipefail

LABEL="com.vcruise.update-cruises"
INTERVAL_SECONDS=$((3 * 24 * 60 * 60)) # 3 дні

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
UPDATE_SCRIPT="${SCRIPT_DIR}/update-cruises.sh"
LOG_DIR="${PROJECT_ROOT}/data/cruise-search/logs"
PLIST_PATH="${HOME}/Library/LaunchAgents/${LABEL}.plist"
DOMAIN="gui/$(id -u)"

usage() {
  cat <<EOF
Usage: $0 <command>

Commands:
  install     встановити launchd-планувальник (кожні 3 дні)
  uninstall   вимкнути і видалити планувальник
  status      показати стан планувальника
  run         запустити оновлення зараз (вручну)
  logs        показати останні рядки логів планувальника
EOF
}

require_update_script() {
  if [[ ! -x "$UPDATE_SCRIPT" ]]; then
    echo "Помилка: не знайдено ${UPDATE_SCRIPT}" >&2
    exit 1
  fi
}

write_plist() {
  mkdir -p "$LOG_DIR"

  cat >"$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${UPDATE_SCRIPT}</string>
  </array>

  <key>WorkingDirectory</key>
  <string>${PROJECT_ROOT}</string>

  <key>StartInterval</key>
  <integer>${INTERVAL_SECONDS}</integer>

  <key>RunAtLoad</key>
  <false/>

  <key>StandardOutPath</key>
  <string>${LOG_DIR}/scheduler.out.log</string>

  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/scheduler.err.log</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>
EOF
}

is_loaded() {
  launchctl print "${DOMAIN}/${LABEL}" >/dev/null 2>&1
}

cmd_install() {
  require_update_script
  write_plist

  if is_loaded; then
    launchctl bootout "$DOMAIN" "$PLIST_PATH" 2>/dev/null || true
  fi

  launchctl bootstrap "$DOMAIN" "$PLIST_PATH"
  launchctl enable "${DOMAIN}/${LABEL}" 2>/dev/null || true
  launchctl kickstart -k "${DOMAIN}/${LABEL}" 2>/dev/null || true

  echo "Планувальник встановлено."
  echo "  Label:    ${LABEL}"
  echo "  Інтервал: кожні 3 дні (${INTERVAL_SECONDS} сек)"
  echo "  Plist:    ${PLIST_PATH}"
  echo "  Логи:     ${LOG_DIR}/scheduler.{out,err}.log"
  echo ""
  echo "Перевірка: $0 status"
}

cmd_uninstall() {
  if [[ -f "$PLIST_PATH" ]]; then
    if is_loaded; then
      launchctl bootout "$DOMAIN" "$PLIST_PATH" 2>/dev/null || true
    fi
    rm -f "$PLIST_PATH"
    echo "Планувальник видалено."
  else
    echo "Планувальник не встановлений."
  fi
}

cmd_status() {
  if [[ ! -f "$PLIST_PATH" ]]; then
    echo "Не встановлено (немає ${PLIST_PATH})"
    exit 0
  fi

  echo "Plist: ${PLIST_PATH}"
  echo ""

  if is_loaded; then
    echo "Стан: активний"
    launchctl print "${DOMAIN}/${LABEL}" 2>/dev/null | grep -E "state =|last exit code =|runs =|last run time =|next run time =" || \
      launchctl print "${DOMAIN}/${LABEL}" 2>/dev/null | head -30
  else
    echo "Стан: plist є, але job не завантажений"
    echo "Спробуй: $0 install"
  fi

  if [[ -f "${PROJECT_ROOT}/data/cruise-search/.last-update" ]]; then
    local last_ts last_human
    last_ts="$(cat "${PROJECT_ROOT}/data/cruise-search/.last-update")"
    last_human="$(date -r "$last_ts" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "$last_ts")"
    echo ""
    echo "Останнє успішне оновлення: ${last_human}"
  fi
}

cmd_run() {
  require_update_script
  exec "$UPDATE_SCRIPT" "$@"
}

cmd_logs() {
  local out="${LOG_DIR}/scheduler.out.log"
  local err="${LOG_DIR}/scheduler.err.log"

  if [[ -f "$out" ]]; then
    echo "=== scheduler.out.log (останні 30 рядків) ==="
    tail -n 30 "$out"
  else
    echo "Лог scheduler.out.log ще не створений."
  fi

  if [[ -f "$err" && -s "$err" ]]; then
    echo ""
    echo "=== scheduler.err.log (останні 30 рядків) ==="
    tail -n 30 "$err"
  fi
}

main() {
  local command="${1:-}"

  case "$command" in
    install) cmd_install ;;
    uninstall) cmd_uninstall ;;
    status) cmd_status ;;
    run)
      shift || true
      cmd_run "$@"
      ;;
    logs) cmd_logs ;;
    -h|--help|help|"") usage ;;
    *)
      echo "Невідома команда: $command" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"

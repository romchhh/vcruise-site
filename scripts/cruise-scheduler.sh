#!/usr/bin/env bash
#
# Планувальник оновлення бази круїзів (без cron):
#   macOS  -> launchd
#   Linux  -> systemd timer
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
SYSTEMD_UNIT="vcruise-update-cruises"
INTERVAL_SECONDS=$((3 * 24 * 60 * 60)) # 3 дні

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
UPDATE_SCRIPT="${SCRIPT_DIR}/update-cruises.sh"
LOG_DIR="${PROJECT_ROOT}/data/cruise-search/logs"
OS="$(uname -s)"

usage() {
  cat <<EOF
Usage: $0 <command>

Commands:
  install     встановити планувальник (кожні 3 дні)
  uninstall   вимкнути і видалити планувальник
  status      показати стан планувальника
  run         запустити оновлення зараз (додай --background для фону)
  logs        показати останні рядки логів планувальника

Platform: ${OS} ($(scheduler_name))
EOF
}

scheduler_name() {
  case "$OS" in
    Darwin) echo "launchd" ;;
    Linux) echo "systemd" ;;
    *) echo "unsupported" ;;
  esac
}

require_platform() {
  case "$OS" in
    Darwin|Linux) ;;
    *)
      echo "Помилка: ОС ${OS} не підтримується. Потрібен macOS (launchd) або Linux (systemd)." >&2
      exit 1
      ;;
  esac
}

require_update_script() {
  if [[ ! -x "$UPDATE_SCRIPT" ]]; then
    echo "Помилка: не знайдено ${UPDATE_SCRIPT}" >&2
    exit 1
  fi
}

print_last_update() {
  if [[ -f "${PROJECT_ROOT}/data/cruise-search/.last-update" ]]; then
    local last_ts last_human
    last_ts="$(cat "${PROJECT_ROOT}/data/cruise-search/.last-update")"
    last_human="$(date -d "@${last_ts}" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r "$last_ts" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "$last_ts")"
    echo ""
    echo "Останнє успішне оновлення: ${last_human}"
  fi
}

# --- macOS launchd ---

PLIST_PATH="${HOME}/Library/LaunchAgents/${LABEL}.plist"
DOMAIN="gui/$(id -u)"

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

launchd_is_loaded() {
  launchctl print "${DOMAIN}/${LABEL}" >/dev/null 2>&1
}

launchd_install() {
  require_update_script
  write_plist

  if launchd_is_loaded; then
    launchctl bootout "$DOMAIN" "$PLIST_PATH" 2>/dev/null || true
  fi

  launchctl bootstrap "$DOMAIN" "$PLIST_PATH"
  launchctl enable "${DOMAIN}/${LABEL}" 2>/dev/null || true
  launchctl kickstart -k "${DOMAIN}/${LABEL}" 2>/dev/null || true

  echo "Планувальник launchd встановлено."
  echo "  Label:    ${LABEL}"
  echo "  Інтервал: кожні 3 дні (${INTERVAL_SECONDS} сек)"
  echo "  Plist:    ${PLIST_PATH}"
  echo "  Логи:     ${LOG_DIR}/scheduler.{out,err}.log"
  echo ""
  echo "Перевірка: $0 status"
}

launchd_uninstall() {
  if [[ -f "$PLIST_PATH" ]]; then
    if launchd_is_loaded; then
      launchctl bootout "$DOMAIN" "$PLIST_PATH" 2>/dev/null || true
    fi
    rm -f "$PLIST_PATH"
    echo "Планувальник launchd видалено."
  else
    echo "Планувальник не встановлений."
  fi
}

launchd_status() {
  if [[ ! -f "$PLIST_PATH" ]]; then
    echo "Не встановлено (немає ${PLIST_PATH})"
    exit 0
  fi

  echo "Plist: ${PLIST_PATH}"
  echo ""

  if launchd_is_loaded; then
    echo "Стан: активний"
    launchctl print "${DOMAIN}/${LABEL}" 2>/dev/null | grep -E "state =|last exit code =|runs =|last run time =|next run time =" || \
      launchctl print "${DOMAIN}/${LABEL}" 2>/dev/null | head -30
  else
    echo "Стан: plist є, але job не завантажений"
    echo "Спробуй: $0 install"
  fi

  print_last_update
}

# --- Linux systemd ---

systemd_scope() {
  if [[ "${EUID}" -eq 0 ]]; then
    echo "system"
  else
    echo "user"
  fi
}

systemd_unit_dir() {
  if [[ "$(systemd_scope)" == "system" ]]; then
    echo "/etc/systemd/system"
  else
    echo "${HOME}/.config/systemd/user"
  fi
}

systemd_ctl() {
  if [[ "$(systemd_scope)" == "system" ]]; then
    systemctl
  else
    systemctl --user
  fi
}

SYSTEMD_SERVICE_PATH="$(systemd_unit_dir)/${SYSTEMD_UNIT}.service"
SYSTEMD_TIMER_PATH="$(systemd_unit_dir)/${SYSTEMD_UNIT}.timer"

write_systemd_units() {
  mkdir -p "$LOG_DIR"
  mkdir -p "$(systemd_unit_dir)"

  cat >"$SYSTEMD_SERVICE_PATH" <<EOF
[Unit]
Description=VCRUISE cruise database update
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=${PROJECT_ROOT}
ExecStart=${UPDATE_SCRIPT}
StandardOutput=append:${LOG_DIR}/scheduler.out.log
StandardError=append:${LOG_DIR}/scheduler.err.log
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[Install]
WantedBy=multi-user.target
EOF

  cat >"$SYSTEMD_TIMER_PATH" <<EOF
[Unit]
Description=Run VCRUISE cruise update every 3 days

[Timer]
OnBootSec=15min
OnUnitActiveSec=3d
Persistent=true
Unit=${SYSTEMD_UNIT}.service

[Install]
WantedBy=timers.target
EOF
}

systemd_install() {
  require_update_script

  if ! command -v systemctl >/dev/null 2>&1; then
    echo "Помилка: systemctl не знайдено. На Linux потрібен systemd." >&2
    exit 1
  fi

  write_systemd_units
  systemd_ctl daemon-reload
  systemd_ctl enable --now "${SYSTEMD_UNIT}.timer"

  echo "Планувальник systemd встановлено."
  echo "  Unit:     ${SYSTEMD_UNIT}.timer"
  echo "  Scope:    $(systemd_scope)"
  echo "  Інтервал: кожні 3 дні після останнього запуску"
  echo "  Service:  ${SYSTEMD_SERVICE_PATH}"
  echo "  Timer:    ${SYSTEMD_TIMER_PATH}"
  echo "  Логи:     ${LOG_DIR}/scheduler.{out,err}.log"
  echo ""
  echo "Перевірка: $0 status"
}

systemd_uninstall() {
  if [[ -f "$SYSTEMD_TIMER_PATH" || -f "$SYSTEMD_SERVICE_PATH" ]]; then
    systemd_ctl disable --now "${SYSTEMD_UNIT}.timer" 2>/dev/null || true
    rm -f "$SYSTEMD_TIMER_PATH" "$SYSTEMD_SERVICE_PATH"
    systemd_ctl daemon-reload
    echo "Планувальник systemd видалено."
  else
    echo "Планувальник не встановлений."
  fi
}

systemd_status() {
  if [[ ! -f "$SYSTEMD_TIMER_PATH" ]]; then
    echo "Не встановлено (немає ${SYSTEMD_TIMER_PATH})"
    exit 0
  fi

  echo "Timer: ${SYSTEMD_TIMER_PATH}"
  echo "Scope: $(systemd_scope)"
  echo ""
  systemd_ctl status "${SYSTEMD_UNIT}.timer" --no-pager || true
  echo ""
  systemd_ctl list-timers "${SYSTEMD_UNIT}.timer" --no-pager || true
  print_last_update
}

# --- shared ---

cmd_install() {
  require_platform
  case "$OS" in
    Darwin) launchd_install ;;
    Linux) systemd_install ;;
  esac
}

cmd_uninstall() {
  require_platform
  case "$OS" in
    Darwin) launchd_uninstall ;;
    Linux) systemd_uninstall ;;
  esac
}

cmd_status() {
  require_platform
  case "$OS" in
    Darwin) launchd_status ;;
    Linux) systemd_status ;;
  esac
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

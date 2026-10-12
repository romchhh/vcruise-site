#!/usr/bin/env bash
# Зворотна сумісність — основний скрипт: cruise-search/run-parser.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "${ROOT}/cruise-search/run-parser.sh" "$@"

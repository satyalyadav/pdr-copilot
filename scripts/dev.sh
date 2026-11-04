#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
duration="${PDR_DEV_SECONDS:-14400}"
if [[ ! "$duration" =~ ^[1-9][0-9]*$ ]]; then
  echo 'PDR_DEV_SECONDS must be a positive number.' >&2
  exit 1
fi
exec timeout -k 15s "${duration}s" python3 scripts/dev.py

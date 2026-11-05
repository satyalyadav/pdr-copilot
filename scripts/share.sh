#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
duration="${PDR_SHARE_SECONDS:-28800}"
if [[ ! "$duration" =~ ^[1-9][0-9]*$ ]]; then
  echo 'PDR_SHARE_SECONDS must be a positive number.' >&2
  exit 1
fi
exec timeout -k 15s "${duration}s" python3 -m scripts.share

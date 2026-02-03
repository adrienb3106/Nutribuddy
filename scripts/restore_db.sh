#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() {
  echo ""
  echo "==> $1"
}

usage() {
  cat <<'EOF'
Usage: scripts/restore_db.sh --input PATH [--clean]

Options:
  --input PATH   Dump file to restore (.dump or .sql)
  --clean        Drop existing objects before restore (destructive)

Notes:
  - .dump uses pg_restore
  - .sql uses psql
  - this script reads .env (or .env.example) for POSTGRES_* values
EOF
}

if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
elif [ -f ".env.example" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.example
  set +a
fi

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Missing env var: $name"
    exit 1
  fi
}

require_env "POSTGRES_USER"
require_env "POSTGRES_DB"

input=""
clean="false"

while [ $# -gt 0 ]; do
  case "$1" in
    --input)
      input="$2"
      shift 2
      ;;
    --clean)
      clean="true"
      shift 1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if [ -z "$input" ]; then
  echo "Missing required option: --input"
  usage
  exit 1
fi

if [ ! -f "$input" ]; then
  echo "Input file not found: $input"
  exit 1
fi

log "Checking database readiness"
docker compose exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null

ext="${input##*.}"
if [ "$ext" = "sql" ]; then
  if [ "$clean" = "true" ]; then
    echo "Warning: --clean is ignored for .sql dumps (use a clean database)."
  fi
  log "Restoring plain SQL dump"
  docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$input"
else
  log "Restoring custom dump"
  restore_args=("--no-owner" "--no-acl" "-U" "$POSTGRES_USER" "-d" "$POSTGRES_DB")
  if [ "$clean" = "true" ]; then
    restore_args+=("--clean" "--if-exists")
  fi
  docker compose exec -T db pg_restore "${restore_args[@]}" < "$input"
fi

log "Done"

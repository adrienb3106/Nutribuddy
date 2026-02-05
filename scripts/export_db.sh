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
Usage: scripts/export_db.sh [--output PATH] [--format custom|plain]

Defaults:
  --output backups/nutribuddy_YYYYMMDD_HHMMSS.dump
  --format custom

Notes:
  - custom format is recommended for large databases
  - this script reads .env.prod, .env (or .env.example) for POSTGRES_* values
EOF
}

compose_env_file=""
if [ -f ".env.prod" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.prod
  set +a
  compose_env_file=".env.prod"
elif [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
  compose_env_file=".env"
elif [ -f ".env.example" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.example
  set +a
  compose_env_file=".env.example"
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

compose() {
  if [ -n "$compose_env_file" ]; then
    docker compose --env-file "$compose_env_file" "$@"
  else
    docker compose "$@"
  fi
}

timestamp="$(date +%Y%m%d_%H%M%S)"
output="backups/nutribuddy_${timestamp}.dump"
format="custom"

while [ $# -gt 0 ]; do
  case "$1" in
    --output)
      output="$2"
      shift 2
      ;;
    --format)
      format="$2"
      shift 2
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

mkdir -p "$(dirname "$output")"

dump_args=("--no-owner" "--no-acl")
if [ "$format" = "plain" ]; then
  dump_args+=("-Fp")
  if [[ "$output" != *.sql ]]; then
    echo "Warning: plain format usually uses .sql extension."
  fi
else
  dump_args+=("-Fc")
  if [[ "$output" != *.dump ]]; then
    echo "Warning: custom format usually uses .dump extension."
  fi
fi

log "Checking database readiness"
compose exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null

log "Exporting database to $output"
compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" "${dump_args[@]}" > "$output"

log "Done"
echo "Dump file: $output"

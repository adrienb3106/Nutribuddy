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
Usage: scripts/deploy_prod.sh [--db-dump PATH] [--clean] [--no-build]

Options:
  --db-dump PATH   Restore a database dump after startup (.dump or .sql)
  --clean          Drop existing objects before restore (destructive)
  --no-build       Skip image build

Notes:
  - Requires .env.prod (copy from .env.prod.example)
  - Uses docker-compose.prod.yml
EOF
}

if [ ! -f ".env.prod" ]; then
  echo "Missing .env.prod. Copy .env.prod.example and set values."
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env.prod
set +a

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Missing env var: $name"
    exit 1
  fi
}

require_env "POSTGRES_USER"
require_env "POSTGRES_DB"

db_dump=""
clean="false"
do_build="true"

while [ $# -gt 0 ]; do
  case "$1" in
    --db-dump)
      db_dump="$2"
      shift 2
      ;;
    --clean)
      clean="true"
      shift 1
      ;;
    --no-build)
      do_build="false"
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

compose() {
  docker compose --env-file .env.prod -f docker-compose.prod.yml "$@"
}

export COMPOSE_FILE="docker-compose.prod.yml"

log "Starting containers"
if [ "$do_build" = "true" ]; then
  compose up -d --build
else
  compose up -d
fi

if [ -n "$db_dump" ]; then
  log "Restoring database dump"
  if [ "$clean" = "true" ]; then
    scripts/restore_db.sh --input "$db_dump" --clean
  else
    scripts/restore_db.sh --input "$db_dump"
  fi
fi

log "Waiting for database"
max_attempts=30
delay_seconds=2
db_ready="false"
for i in $(seq 1 "$max_attempts"); do
  if compose exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; then
    db_ready="true"
    break
  fi
  sleep "$delay_seconds"
done
if [ "$db_ready" != "true" ]; then
  echo "Postgres is not ready after $((max_attempts * delay_seconds)) seconds."
  exit 1
fi

log "Running migrations"
compose exec -T web python manage.py migrate

log "Done"
echo "Tip: create admin with:"
echo "  docker compose --env-file .env.prod -f docker-compose.prod.yml exec web python manage.py createsuperuser"

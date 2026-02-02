#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/backups"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-7}"

mkdir -p "${BACKUP_DIR}"

while true; do
  ts=$(date +%Y%m%d_%H%M%S)
  file="${BACKUP_DIR}/backup_${ts}.sql"

  echo "[backup] starting ${file}"
  PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    -h "${POSTGRES_HOST:-db}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    > "${file}"
  echo "[backup] done ${file}"

  find "${BACKUP_DIR}" -type f -name "backup_*.sql" -mtime +"${RETAIN_DAYS}" -delete

  sleep 86400
 done
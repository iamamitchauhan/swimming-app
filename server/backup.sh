#!/usr/bin/env bash
#
# MongoDB Backup Script
# ---------------------
# Takes a full database dump and stores it
# in a date/time-organised directory structure:
#
#   backups/
#     2025-07-17/
#       20250717_122700/
#         <mongodump output>
#
# Usage:
#   ./backup.sh              # run continuously (every 6 hours)
#   ./backup.sh --once       # take a single backup and exit
#
# Requires: mongodump (part of mongodb-tools / mongodb-database-tools)

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
BACKUP_ROOT="${SCRIPT_DIR}/backups"
INTERVAL_SECONDS=21600         # 6 hours
LOG_PREFIX="[mongo-backup]"

# ── Helpers ────────────────────────────────────────────────────
log() {
  echo "${LOG_PREFIX} $(date '+%Y-%m-%d %H:%M:%S') — $*"
}

# Extract MONGODB_URI from .env (falls back to default)
get_mongo_uri() {
  local uri=""
  if [[ -f "${ENV_FILE}" ]]; then
    uri="$(grep -E '^MONGODB_URI=' "${ENV_FILE}" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d '\r')"
  fi
  if [[ -z "${uri}" ]]; then
    uri="mongodb://127.0.0.1:27017/swimming_app"
  fi
  echo "${uri}"
}

# Parse the database name out of the URI
get_db_name() {
  local uri="$1"
  # Strip query params and auth
  local path="${uri#*://}"
  path="${path#*@}"        # remove credentials if present
  path="${path%%\?*}"      # remove query string
  local db="${path#*/}"    # remove host:port
  if [[ -z "${db}" || "${db}" == "${path}" ]]; then
    echo "admin"
  else
    echo "${db}"
  fi
}

# Perform a single backup
run_backup() {
  local uri db ts date_dir backup_dir
  uri="$(get_mongo_uri)"
  db="$(get_db_name "${uri}")"
  ts="$(date '+%Y%m%d_%H%M%S')"
  date_dir="$(date '+%Y-%m-%d')"
  backup_dir="${BACKUP_ROOT}/${date_dir}/${ts}"

  mkdir -p "${backup_dir}"

  log "Starting backup of database '${db}' → ${backup_dir}"

  if mongodump --uri="${uri}" --out="${backup_dir}" 2>&1 | tee -a "${BACKUP_ROOT}/backup.log"; then
    # Verify the dump actually produced files
    local file_count
    file_count="$(find "${backup_dir}" -type f | wc -l)"
    if [[ "${file_count}" -eq 0 ]]; then
      log "ERROR: mongodump produced no files — dump is empty"
      rm -rf "${backup_dir}"
      return 1
    fi

    log "Backup completed: ${file_count} files in ${backup_dir}"

    # Compress the dump to save space
    local archive="${backup_dir}.tar.gz"
    tar -czf "${archive}" -C "${backup_dir}" .
    if [[ $? -eq 0 ]]; then
      rm -rf "${backup_dir}"
      log "Compressed to: ${archive}"
    else
      log "ERROR: tar failed — keeping raw dump at ${backup_dir}"
      return 1
    fi
  else
    log "ERROR: mongodump failed for database '${db}'"
    rm -rf "${backup_dir}"
    return 1
  fi
}

# ── Main ───────────────────────────────────────────────────────
main() {
  # Ensure mongodump is available
  if ! command -v mongodump &>/dev/null; then
    log "ERROR: 'mongodump' not found. Install mongodb-database-tools first."
    exit 1
  fi

  mkdir -p "${BACKUP_ROOT}"

  # Single backup mode
  if [[ "${1:-}" == "--once" ]]; then
    run_backup
    exit $?
  fi

  # Continuous mode — loop every 5 minutes
  log "Starting continuous backup (every ${INTERVAL_SECONDS}s). Press Ctrl+C to stop."
  while true; do
    run_backup || log "Backup attempt failed — will retry next cycle."
    log "Next backup in ${INTERVAL_SECONDS}s..."
    sleep "${INTERVAL_SECONDS}"
  done
}

main "$@"

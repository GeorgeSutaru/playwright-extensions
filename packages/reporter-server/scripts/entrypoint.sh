#!/bin/sh
set -e

ARTIFACTS_DIR="${REPORTER_ARTIFACTS_DIR:-/data/artifacts}"
SNAPSHOTS_DIR="${REPORTER_SNAPSHOTS_DIR:-/data/snapshots}"
DB_DIR="${REPORTER_DB_DIR:-/data/db}"
PGPORT="${REPORTER_DB_PORT:-8401}"

mkdir -p "$ARTIFACTS_DIR" "$SNAPSHOTS_DIR" "$DB_DIR"

export PGPORT
DB_HOST="${REPORTER_DB_HOST:-localhost}"

if [ "$DB_HOST" = "localhost" ] || [ "$DB_HOST" = "127.0.0.1" ]; then
  echo "Starting PostgreSQL on port $PGPORT..."
  pg_ctlcluster 16 main start -- -p "$PGPORT" 2>/dev/null || \
    su - postgres -c "pg_ctl -D /etc/postgresql/16/main -l /var/log/postgresql/postgresql.log start -- -p $PGPORT" 2>/dev/null || \
    postgres -D "$DB_DIR" -p "$PGPORT" &
fi

echo "Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  if pg_isready -q -h "$DB_HOST" -p "$PGPORT" 2>/dev/null; then
    echo "PostgreSQL is ready on $DB_HOST:$PGPORT."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "PostgreSQL failed to start."
    exit 1
  fi
  sleep 1
done

if [ "${REPORTER_SKIP_MIGRATIONS}" != "true" ]; then
  echo "Running database migrations..."
  cd packages/reporter-server && npx drizzle-kit migrate 2>/dev/null || echo "Migration skipped (may already be up to date)"
  cd /app
fi

echo "Starting reporter server..."
exec node packages/reporter-server/dist/index.js

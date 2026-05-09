#!/bin/sh
set -e

ARTIFACTS_DIR="${REPORTER_ARTIFACTS_DIR:-/data/artifacts}"
SNAPSHOTS_DIR="${REPORTER_SNAPSHOTS_DIR:-/data/snapshots}"
DB_DIR="${REPORTER_DB_DIR:-/data/db}"
PGPORT="${REPORTER_DB_PORT:-5432}"

mkdir -p "$ARTIFACTS_DIR" "$SNAPSHOTS_DIR" "$DB_DIR" /run/postgresql
chown -R postgres:postgres "$DB_DIR" /run/postgresql

export PGPORT
DB_HOST="${REPORTER_DB_HOST:-localhost}"

if [ "$DB_HOST" = "localhost" ] || [ "$DB_HOST" = "127.0.0.1" ]; then
  echo "Starting local PostgreSQL on port $PGPORT..."
  
  if [ -z "$(ls -A "$DB_DIR")" ]; then
    echo "Initializing database in $DB_DIR..."
    su-exec postgres initdb -D "$DB_DIR" --username=postgres --auth=trust
  fi
  
  su-exec postgres postgres -D "$DB_DIR" -p "$PGPORT" &
fi

echo "Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  if pg_isready -U postgres -h "$DB_HOST" -p "$PGPORT" -q; then
    echo "PostgreSQL is ready on $DB_HOST:$PGPORT."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "PostgreSQL failed to start."
    exit 1
  fi
  sleep 1
done

# Create the database if it doesn't exist
RESULT=$(psql -U postgres -h "$DB_HOST" -p "$PGPORT" -tc "SELECT 1 FROM pg_database WHERE datname = '${REPORTER_DB_NAME}'" | tr -d ' ' || true)
if [ "$RESULT" != "1" ]; then
  echo "Creating database ${REPORTER_DB_NAME}..."
  psql -U postgres -h "$DB_HOST" -p "$PGPORT" -c "CREATE DATABASE ${REPORTER_DB_NAME};"
fi

if [ "${REPORTER_SKIP_MIGRATIONS}" != "true" ]; then
  echo "Running database migrations..."
  cd packages/reporter-server && npx drizzle-kit migrate 2>/dev/null || echo "Migration failed or already up to date"
  cd /app
fi

echo "Starting reporter server..."
exec node packages/reporter-server/dist/index.js

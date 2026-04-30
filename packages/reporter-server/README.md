# @playwright-extensions/reporter-server

Dashboard server for the extended Playwright reporter. Stores test run history, trace metadata, and provides a web UI with snapshot diffing and trend analysis.

## Deployment

### Docker (Recommended)

```bash
cd packages/reporter-server
docker-compose up -d
```

The server is available at `http://localhost:8400`. PostgreSQL runs inside the container on port 8401.

### Docker Compose Configuration

```yaml
services:
  reporter:
    build: .
    ports:
      - "8400:8400"
    environment:
      - REPORTER_PORT=8400
      - REPORTER_DB_HOST=localhost
      - REPORTER_DB_PORT=8401
      - REPORTER_DB_USER=postgres
      - REPORTER_DB_NAME=reporter
      - REPORTER_API_KEY=your-secret-key
      - REPORTER_LOG_LEVEL=info
    volumes:
      - reporter-data:/data

volumes:
  reporter-data:
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REPORTER_PORT` | `8400` | HTTP server port |
| `REPORTER_DB_HOST` | `localhost` | PostgreSQL host |
| `REPORTER_DB_PORT` | `8401` | PostgreSQL port |
| `REPORTER_DB_USER` | `postgres` | PostgreSQL user |
| `REPORTER_DB_NAME` | `reporter` | Database name |
| `REPORTER_DB_DIR` | `/data/db` | PostgreSQL data directory |
| `REPORTER_API_KEY` | *(none)* | API key for auth (header: `x-api-key`) |
| `REPORTER_ARTIFACTS_DIR` | `/data/artifacts` | Artifact storage path |
| `REPORTER_SNAPSHOTS_DIR` | `/data/snapshots` | Snapshot cache path |
| `REPORTER_LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `REPORTER_SKIP_MIGRATIONS` | `false` | Skip DB migrations on startup |

## API Endpoints

All API routes are prefixed with `/api/v1/`. If `REPORTER_API_KEY` is set, include `x-api-key` header.

### Runs

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/runs` | Create a new test run |
| `GET` | `/runs` | List all runs |
| `GET` | `/runs/:id` | Get run details |
| `DELETE` | `/runs/:id` | Delete a run |

### Tests

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/runs/:runId/tests` | Record a test result |
| `GET` | `/tests/search?file=&line=` | Search test history |

### Artifacts

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/runs/:runId/tests/:testId/artifacts` | Upload an artifact |
| `GET` | `/artifacts/:id` | Get artifact metadata |
| `GET` | `/artifacts/:id/download` | Download artifact file |

### Traces

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/runs/:runId/tests/:testId/traces` | Upload trace entries |
| `GET` | `/traces/:testId` | Get trace entries for a test |

### Search & Diff

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/search?q=` | Search trace entries |
| `GET` | `/diff?fingerprint=&runA=&runB=&type=` | Compare snapshots by fingerprint |

### Trends

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/trends?file=&line=&window=` | Get trend data for a test |

### Import

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/import` | Import a local fallback report |

## Database Schema

- **runs** — Test run metadata, timestamps, pass/fail counts
- **tests** — Individual test results per run
- **artifacts** — Videos, screenshots, trace files
- **trace_entries** — Indexed action metadata with fingerprints

Migrations are managed by Drizzle ORM and run automatically on container start.

## Dashboard UI

The web UI includes:

- **Dashboard** — Overview of recent runs and pass rates
- **Runs** — Browse and filter test runs
- **Run Detail** — Test results, artifacts, and trace actions for a run
- **Test History** — Status history for a specific test across runs
- **Trace Viewer** — Indexed actions with timing and error data
- **Snapshot Diff** — Side-by-side HTML snapshot comparison
- **Trends** — Pass rate and duration charts (Chart.js)
- **Search** — Full-text search across trace entries

## Development

```bash
npm install
npm run build
npm run dev
```

## License

MIT

# @playwright-extensions/reporter

Extended Playwright reporter with trace indexing, snapshot fingerprinting, and server-side history.

## Installation

```bash
npm install @playwright-extensions/reporter
```

## Quick Start

Add the `@playwright-extensions/reporter` to your `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['@playwright-extensions/reporter', {
      serverUrl: 'http://localhost:8400',
      apiKey: 'your-api-key',
      indexTraces: true,
      fingerprintActions: true,
    }],
  ],
});
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `serverUrl` | `http://localhost:8400` | Reporter server URL |
| `apiKey` | *(none)* | API key for server authentication |
| `artifacts` | `['video', 'screenshot', 'trace']` | Attachment types to upload |
| `indexTraces` | `true` | Parse and index trace action metadata |
| `fingerprintActions` | `true` | Compute SHA-256 fingerprints for actions |
| `fallbackDir` | `./.playwright-reporter` | Local storage path when server is unreachable |

## Local Fallback

If the reporter server is unreachable, all data is stored locally in `.playwright-reporter/`. Import it later:

```bash
extended-playwright-cli reporter-import ./.playwright-reporter/runs/<run-id>
```

## CLI Commands

### Query Test History

```bash
extended-playwright-cli reporter-history tests/checkout.spec.ts:42
```

### Compare Snapshots Across Runs

```bash
extended-playwright-cli reporter-diff <fingerprint> <runA> <runB> [before|after]
```

### View Trend Data

```bash
extended-playwright-cli reporter-trends tests/checkout.spec.ts:42 --window 10
```

### Import Local Reports

```bash
extended-playwright-cli reporter-import ./.playwright-reporter/runs/<run-id>
```

## Action Fingerprints

Each action is fingerprinted using:

```
SHA-256(actionType|selector|sourceLocation|actionIndex)
```

This enables deterministic snapshot comparison across test runs.

## License

MIT

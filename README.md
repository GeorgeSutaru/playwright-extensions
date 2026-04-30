# Playwright Extensions

Extended Playwright CLI ecosystem with race locator patterns and native session management.

## Packages

| Package | Description |
|---------|-------------|
| [@playwright-extensions/core](packages/core) | Core extensions library with race locator patterns |
| [@playwright-extensions/cli-skill](packages/cli-skill) | CLI skill extension using daemon socket protocol |
| [@playwright-extensions/extended-playwright-cli](packages/extended-playwright-cli) | Extended CLI with native playwright session management |
| [@playwright-extensions/reporter](packages/reporter) | Extended Playwright reporter package sending test results to server |
| [@playwright-extensions/reporter-server](packages/reporter-server) | The backend server storing and displaying test snapshots and analytics |
| [@playwright-extensions/reporter-e2e](packages/reporter-e2e) | Native testing package verifying the dashboard UI functionality |

## Usage Examples

### 1. Send Test Results to Dashboard
Simply add the reporter package (`@playwright-extensions/reporter`) to your `playwright.config.ts`. The library will natively handle the connection and automatically send your test results to the server while scripts execute.

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['@playwright-extensions/reporter', {
      serverUrl: 'http://localhost:8400',
    }],
  ],
});
```

### 2. Compare Snapshots Using CLI
You can use the extended Playwright CLI to seamlessly inspect and compare visual test snapshots across different test runs.

```bash
extended-playwright-cli reporter-diff <fingerprint> <runA> <runB> [before|after]
```

## Prerequisites

- Node.js 22+
- `@playwright/cli` installed globally (`npm install -g @playwright/cli`)

## Getting Started

```bash
npm install
npm run build
npm test
```

## Development

This is a monorepo using npm workspaces. Each package can be built and tested independently:

```bash
npm run build -w packages/<package-name>
npm test -w packages/<package-name>
```

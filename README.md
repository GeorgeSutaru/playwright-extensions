# Playwright Extensions

Extended Playwright CLI ecosystem with race locator patterns and native session management.

## Packages

| Package | Description |
|---------|-------------|
| [@playwright-extensions/core](packages/core) | Core extensions library with element watchers, query responses, API locators, and race patterns |
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

## Getting Started

To install the latest version of the core extensions and the reporter, simply add them via npm:

```bash
npm install @playwright-extensions/core@latest @playwright-extensions/reporter@latest
```

After installation, update your `playwright.config.ts` to use the custom extended wrapper. This natively provides typescript intellisense for all our custom integrations:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright-extensions/core/config';

export default defineConfig({
  use: {
    // Ecosystem overrides
    watchElements: true,
    interceptors: { requests: true, console: true, errors: true }
  },
  reporter: [
    ['@playwright-extensions/reporter', { serverUrl: 'http://localhost:8400' }],
    ['list']
  ],
});
```

To execute, ensure your `package.json` maps your test script correctly to the standard `playwright test` command (the extensions will automatically latch on thanks to the modified config!). 

```json
{
  "scripts": {
    "test:e2e": "playwright test"
  }
}
```

For a comprehensive explanation of the wrapper interface, check out the full [Extended Configuration](https://www.sutaru.ro/docs/playwright-extensions/extended-config) guide!

## Development

This is a monorepo using npm workspaces. Each package can be built and tested independently:

```bash
npm run build -w packages/<package-name>
npm test -w packages/<package-name>
```

## Releasing and Publishing

NPM clients (`core`, `reporter`, `extended-playwright-cli`, etc.) can be directly patched and published to the NPM registry normally:

```bash
cd packages/core && npm version patch && npm publish --access public
```

### Reporter Server (Docker)
The `reporter-server` application should **not** be published as an NPM module. Instead, it natively distributes as a Docker container.

To manually publish a new version of the dashboard image:
```bash
# Authenticate to GHCR
echo $CR_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Build and Tag
docker build -t ghcr.io/georgesutaru/playwright-extensions-reporter-server:latest -f packages/reporter-server/Dockerfile .

# Push
docker push ghcr.io/georgesutaru/playwright-extensions-reporter-server:latest
```

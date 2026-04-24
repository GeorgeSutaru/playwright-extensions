# Playwright Extensions

Extended Playwright CLI ecosystem with race locator patterns and native session management.

## Packages

| Package | Description |
|---------|-------------|
| [@playwright-extensions/core](packages/core) | Core extensions library with race locator patterns |
| [@playwright-extensions/cli-skill](packages/cli-skill) | CLI skill extension using daemon socket protocol |
| [@playwright-extensions/extended-playwright-cli](packages/extended-playwright-cli) | Extended CLI with native playwright session management |

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

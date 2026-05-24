---
name: extended-playwright-cli
description: Extended Playwright CLI for browser session management, test result analysis, and reporter integration. Use when debugging test failures, analyzing historical test data, comparing snapshots, or managing browser sessions from the command line.
allowed-tools: Bash(extended-playwright-cli:*)
---

# Extended Playwright CLI

The `extended-playwright-cli` provides browser session management built on Playwright internals, plus extended commands for test result analysis through the reporter server.

## Browser Session Management

Start and manage browser sessions for debugging and exploration.

### Starting a Session

```bash
extended-playwright-cli open [url]
```

Options:
- `--headed` — Run in headed mode
- `--browser <name>` — Specify browser (chromium, firefox, webkit)
- `--persistent` — Use persistent context
- `--profile <dir>` — Profile directory
- `--session <name>` or `-s <name>` — Session name (default: default)

### Navigating and Interacting

```bash
extended-playwright-cli goto <url>
extended-playwright-cli click <ref>
extended-playwright-cli type <text>
extended-playwright-cli eval <func>
```

### Snapshots and Screenshots

```bash
extended-playwright-cli snapshot
extended-playwright-cli screenshot [ref]
```

### Tab Management

```bash
extended-playwright-cli tab-list
extended-playwright-cli tab-new [url]
extended-playwright-cli tab-close [index]
extended-playwright-cli tab-select <index>
```

### Session Management

```bash
extended-playwright-cli list           # List all browser sessions
extended-playwright-cli close          # Close current session
extended-playwright-cli close-all      # Close all sessions
extended-playwright-cli go-back        # Navigate back
extended-playwright-cli go-forward     # Navigate forward
extended-playwright-cli reload         # Reload page
extended-playwright-cli show           # Show DevTools
```

## Reporter Commands

Connect to the extended Playwright reporter to analyze test results. The CLI automatically loads `playwright.config.ts` from the current working directory to find the reporter server URL.

### Test History

Query past runs of a test to differentiate between consistent failures and flaky tests.

```bash
extended-playwright-cli reporter-history <test-file:line>
extended-playwright-cli reporter-history <test-title>

# Example: Check history using file and line number
extended-playwright-cli reporter-history tests/checkout.spec.ts:42

# Example: Check history using the test title
extended-playwright-cli reporter-history "Login test"
```

### Snapshot Diff

Compare DOM snapshots between two runs using the action fingerprint.

```bash
extended-playwright-cli reporter-diff <fingerprint> <runA> <runB> [snapshot-type]

# Example: Compare the "after" DOM snapshot between two runs
extended-playwright-cli reporter-diff a1b2c3d4e5f60708 run-success-123 run-failed-456 after
```

Parameters:
- `fingerprint` — 16-character hex action fingerprint
- `runA` — Baseline run ID
- `runB` — Comparison run ID
- `snapshot-type` — `before` or `after` (default: after)

### Trends

Show pass/fail rate trends and recurring failures across the test suite.

```bash
extended-playwright-cli reporter-trends [--from <date>] [--to <date>] [--file <file>] [--group-by <field>]

# Example: Show trends for the last 7 days
extended-playwright-cli reporter-trends --from 2024-01-01 --to 2024-01-07

# Example: Filter by specific test file
extended-playwright-cli reporter-trends --file tests/checkout.spec.ts
```

### Import Reports

Import locally stored reports into the reporter server.

```bash
extended-playwright-cli reporter-import <local-report-directory>

# Example: Import from local reporter output
extended-playwright-cli reporter-import ./.playwright-reporter/runs/my-run
```

## Race Locator (CLI)

Race multiple locators in an active browser session and return the first visible one.

```bash
extended-playwright-cli race-locator <selector1> [selector2 ...] [options]

# Example: Race two variant selectors
extended-playwright-cli race-locator "#variant-a" "#variant-b"

# Example: With timeout and visibility mode
extended-playwright-cli race-locator "#login-form" "#signup-form" --timeout 5000 --visibility presence
```

Options:
- `--timeout <ms>` — Timeout in milliseconds (default: 0, no timeout)
- `--visibility <mode>` — Visibility mode: default, visible, presence
- `--session <name>` or `-s <name>` — Session name (default: default)

## Configuration

The CLI automatically resolves the local `@playwright/test` installation and connects to the reporter server configured in `playwright.config.ts`. No manual URL configuration is needed under normal circumstances.

Environment variables:
- `REPORTER_SERVER_URL` — Override reporter server URL
- `REPORTER_API_KEY` — API key for reporter authentication
- `PLAYWRIGHT_CLI_SESSION` — Default session name

## Workspace Setup

Initialize the workspace directory for Playwright daemon sessions:

```bash
extended-playwright-cli install
```

This creates the `.playwright/` directory for session management.

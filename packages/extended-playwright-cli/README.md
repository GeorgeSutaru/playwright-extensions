# @playwright-extensions/extended-playwright-cli

Extended Playwright CLI that natively manages browser sessions using Playwright's internal APIs, plus extended commands for test result analysis through the reporter server.

## Installation

```bash
npm install @playwright-extensions/extended-playwright-cli
```

## Usage

```bash
# Start a browser session
extended-playwright-cli open https://example.com

# Run standard playwright commands
extended-playwright-cli snapshot
extended-playwright-cli goto https://example.com

# Race multiple locators
extended-playwright-cli race-locator "#variant-a" "#variant-b" --timeout 5000

# Analyze test results
extended-playwright-cli reporter-history tests/checkout.spec.ts:42
extended-playwright-cli reporter-trends

# Close session
extended-playwright-cli close
```

## Commands

### Built-in (from playwright-cli)

`open`, `close`, `goto`, `click`, `type`, `snapshot`, `eval`, `screenshot`, `tab-list`, `tab-new`, `tab-close`, `tab-select`, `go-back`, `go-forward`, `reload`, `list`, `close-all`, `install`, `show`

### Extended

**race-locator** — Races multiple locators and returns the first visible one.

```bash
extended-playwright-cli race-locator <selector1> [selector2 ...] [options]

Options:
  --timeout <ms>        Timeout in milliseconds
  --visibility <mode>   Visibility mode: default, visible, presence
  --session <name>      Session name (default: default)
```

**reporter-history** — Query past runs of a test from the reporter server.

```bash
extended-playwright-cli reporter-history <test-file:line>
extended-playwright-cli reporter-history "Login test"
```

**reporter-diff** — Compare snapshots between two runs by fingerprint.

```bash
extended-playwright-cli reporter-diff <fingerprint> <runA> <runB> [snapshot-type]
```

**reporter-trends** — Show pass/fail rate trends and recurring failures.

```bash
extended-playwright-cli reporter-trends [--from <date>] [--to <date>] [--file <file>] [--group-by <field>]
```

**reporter-import** — Import locally stored reports into the reporter server.

```bash
extended-playwright-cli reporter-import <local-report-directory>
```

## Configuration

The CLI automatically resolves the local `@playwright/test` installation and connects to the reporter server configured in `playwright.config.ts`. No manual URL configuration is needed.

Environment variables:
- `REPORTER_SERVER_URL` — Override reporter server URL
- `REPORTER_API_KEY` — API key for reporter authentication
- `PLAYWRIGHT_CLI_SESSION` — Default session name

## Architecture

- Resolves the local `@playwright/test` installation and spawns the daemon natively
- Implements its own `PlaywrightSession` wrapper over the NDJSON socket protocol
- Session files stored in `~/Library/Caches/ms-playwright/daemon/`
- Custom commands routed before falling through to standard playwright commands

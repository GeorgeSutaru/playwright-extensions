# @playwright-extensions/extended-playwright-cli

Extended Playwright CLI that natively manages browser sessions using playwright's internal APIs. Unlike `cli-skill`, this package starts/stops the daemon itself rather than connecting to an existing session.

## Installation

```bash
npm install @playwright-extensions/extended-playwright-cli
```

## Usage

```bash
# Start a session (same as playwright-cli open)
extended-playwright-cli open https://example.com

# Run standard playwright commands
extended-playwright-cli snapshot
extended-playwright-cli goto https://example.com

# Use extended commands
extended-playwright-cli race-locator "#variant-a" "#variant-b" --timeout 5000

# Close session
extended-playwright-cli close
```

## Commands

### Built-in (from playwright-cli)
`open`, `close`, `goto`, `click`, `type`, `snapshot`, `eval`, `screenshot`, `tab-list`, `tab-new`, `tab-close`, `tab-select`, `go-back`, `go-forward`, `reload`, `list`, `close-all`, `install`, `show`

### Extended
**race-locator** -- Races multiple locators and returns the first visible one.

```bash
extended-playwright-cli race-locator <selector1> [selector2 ...] [options]

Options:
  --timeout <ms>        Timeout in milliseconds
  --visibility <mode>   Visibility mode: default, visible, presence
  --session <name>      Session name (default: default)
```

## Architecture

- Resolves the global `@playwright/cli` installation and spawns the daemon natively
- Implements its own `PlaywrightSession` wrapper over the NDJSON socket protocol
- Session files stored in `~/Library/Caches/ms-playwright/daemon/`
- Custom commands routed before falling through to standard playwright commands

# @playwright-extensions/cli-skill

CLI skill extension that connects to an existing `playwright-cli` daemon session via Unix socket. Adds custom commands like `race-locator` on top of the standard playwright-cli.

## Installation

```bash
npm install @playwright-extensions/cli-skill
```

## Usage

```bash
# Start a playwright-cli session first
playwright-cli open https://example.com

# Use extended commands
pw-ext race-locator "#variant-a" "#variant-b" --timeout 5000

# Pass-through to playwright-cli
pw-ext snapshot
pw-ext goto https://example.com
```

## Commands

### race-locator

Races multiple locators and returns the first one that becomes visible.

```bash
pw-ext race-locator <selector1> [selector2 ...] [options]

Options:
  --timeout <ms>        Timeout in milliseconds
  --visibility <mode>   Visibility mode: default, visible, presence
  --session <name>      Session name (default: default)
```

## Architecture

- Connects to an existing playwright-cli daemon via Unix socket
- Uses the `run-code` tool to execute custom Playwright scripts
- Passes through unknown commands to `playwright-cli` via `spawnSync`

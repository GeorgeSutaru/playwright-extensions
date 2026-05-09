---
name: extended-playwright-cli
description: Connects to the extended playwright reporter to search and analyze test results, extract information from traces, snapshots, and screenshots. Helps investigate failed tests using historical data.
allowed-tools: Bash(extended-playwright-cli:*)
---

# Debugging Tests with extended-playwright-cli

The `extended-playwright-cli` provides an interface to connect directly to the extended Playwright reporter (configured automatically via the local `playwright.config.ts`). It allows AI agents and developers to investigate failed tests, extract telemetry, and access historical traces without needing to open the web dashboard manually.

## Discovering Test History

When a test fails, you can query its history across multiple runs. This helps differentiate between consistent failures and flaky tests.

```bash
extended-playwright-cli reporter-history <test-file:line>
extended-playwright-cli reporter-history <test-title>

# Example: Check history using file and line number
extended-playwright-cli reporter-history tests/checkout.spec.ts:42

# Example: Check history using the test title
extended-playwright-cli reporter-history "Login test"
```

## Analyzing Failures Using Traces / Snapshots

If you need to extract and compare the DOM state or trace snapshot states between a failing run and a baseline (successful) run, you can diff the snapshots using the action's fingerprint.

```bash
extended-playwright-cli reporter-diff <fingerprint> <baseline-run-id> <failed-run-id> [snapshot-type]

# Example: Compare the step's "after" DOM snapshot
extended-playwright-cli reporter-diff a1b2c3d4e5f60708 run-success-123 run-failed-456 after
```

## Identifying Recurrent Issues (Trends)

If multiple tests are failing across the workspace and you need to investigate if they share a common failure footprint:

```bash
extended-playwright-cli reporter-trends
```

## CLI Configuration and Pre-requisites

The CLI automatically loads `process.cwd()/playwright.config.ts` and connects to the extended `{ serverUrl: ... }` configured for `@playwright-extensions/reporter`. You don't need to specify `--url` parameters under normal circumstances. Ensure that the test suite has actually generated traces and pushed them to the reporter for full diffing capabilities.

## Other Capabilities
The `extended-playwright-cli` also supports standard playwright local debugging if a browser session is generated:
```bash
extended-playwright-cli open
extended-playwright-cli goto <url>
extended-playwright-cli tab-list
extended-playwright-cli snapshot
extended-playwright-cli close
```

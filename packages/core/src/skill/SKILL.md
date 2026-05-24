---
name: playwright-extensions-core
description: Library patterns for Playwright testing: race locator for multiple UI outcomes, element event tracking, query response extraction, and synchronous Playwright API. Use when writing Playwright tests that need to handle ambiguous UI, track element changes, extract API data, or run synchronously.
allowed-tools: Bash(npm:*), Bash(node:*)
---

# Playwright Extensions Core - Library Patterns

The `@playwright-extensions/core` package provides testing utilities for Playwright: race locator for ambiguous UI, element change tracking, network response extraction, and a synchronous Playwright wrapper.

## Installation

```bash
npm install @playwright-extensions/core
```

## Race Locator - Handle Multiple UI Outcomes

When a page can display multiple possible elements (A/B tests, conditional UI, feature flags), use `LocatorRace.race()` to handle ambiguity without brittle conditionals.

### Basic Usage

```typescript
import { LocatorRace } from '@playwright-extensions/core';

const winner = await LocatorRace.race([
  page.locator('#variant-a'),
  page.locator('#variant-b'),
]);
await winner.click();
```

### With Options

```typescript
const winner = await LocatorRace.race(
  [page.locator('#a'), page.locator('#b')],
  {
    timeout: 5000,
    pollInterval: 100,
    visibilityMode: 'default',
  }
);
```

### Visibility Modes

- `default` (or `visible`) — element must be visible and rendered
- `presence` — element must exist in the DOM regardless of visibility

```typescript
// Only visible elements win
const winner = await LocatorRace.race(
  [page.locator('#a'), page.locator('#b')],
  { visibilityMode: 'default' }
);

// Any DOM element wins
const winner = await LocatorRace.race(
  [page.locator('#a'), page.locator('#b')],
  { visibilityMode: 'presence' }
);
```

### Strict Mode

Throws if multiple locators are visible simultaneously:

```typescript
const winner = await LocatorRace.race([
  page.locator('#first'),
  page.locator('#second'),
]);
// Throws: "Strict mode violation: multiple locators found visible..."
```

## Element Events - Track DOM Changes

Track `created`, `changed`, and `deleted` events for specific element locators using a browser-side `MutationObserver`.

```typescript
import { test, expect } from '@playwright-extensions/core';

test.use({ watchElements: true });

test('element change tracking', async ({ page }) => {
  const watcher = await page.watchElement('my-list', page.locator('#list li'));

  await page.click('#add-item-btn');

  const changedData = await watcher.waitForEvent('changed').first();
  expect(changedData.type).toBe('changed');
  console.log(changedData.changes[0].oldValue);

  watcher.unwatch();
});
```

## Query Response - Extract API Data

Extract data from network responses without waiting for UI integration.

```typescript
import { test, expect } from '@playwright-extensions/core';

test('extract data from API response', async ({ page }) => {
  const name = await page.queryResponse(
    /api\/user/,
    '$.data.user.name',
    'json'
  ).first();

  const productLabel = page.locator(
    /\/api\/product/,
    '<Name>(.*)<\/Name>',
    'regex'
  );

  await expect(productLabel).toBeVisible();
});
```

## Sync Wrapper - Synchronous Playwright API

Call Playwright methods without `await` using a worker thread architecture. All void methods return `this` for method chaining.

```typescript
import { launchSyncBrowser } from '@playwright-extensions/core';

const browser = launchSyncBrowser('chromium', { headless: true });
const page = browser.newContext().newPage();

// No await needed
const value = page.locator('#input').fill('hello').inputValue();
const checked = page.locator('#cb').check().isChecked();
const text = page.setContent('<h1>Hello</h1>').locator('h1').textContent();

browser.close();
```

### Method Chaining

```typescript
// Fill and read in one expression
const value = page.locator('#i').fill('one').clear().fill('two').inputValue();

// Multi-step interaction
const count = page.locator('#btn').click().click().textContent();

// Check and verify
const checked = page.locator('#cb').check().uncheck().isChecked();
```

### Key Methods

**Page:** `goto`, `locator`, `getByRole`, `getByText`, `getByLabel`, `getByTestId`, `click`, `fill`, `check`, `uncheck`, `setContent`, `evaluate`, `screenshot`, `content`, `title`, `url`, `waitForTimeout`

**Locator:** `click`, `fill`, `type`, `check`, `uncheck`, `clear`, `press`, `hover`, `focus`, `textContent`, `innerText`, `innerHTML`, `inputValue`, `getAttribute`, `isVisible`, `isHidden`, `isChecked`, `isDisabled`, `count`, `first`, `last`, `nth`, `filter`, `and`, `or`

### Limitations

- Navigation methods (`goto`, `reload`) return Response objects, not `this`
- `locator()` chaining searches within element scope, not the page
- Functions passed as arguments are serialized as source strings

## Reference Guides

- [Multiple Outcomes](references/multiple-outcomes.md) — A/B tests, feature flags, conditional UI patterns
- [Error Handling](references/error-handling.md) — Strict mode violations, timeouts, graceful degradation
- [Dynamic Content](references/dynamic-content.md) — Loading states, lazy content, transitions, pagination
- [Visibility Modes](references/visibility-modes.md) — Default, visible, presence mode comparison

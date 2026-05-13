# Playwright Extensions

A collection of useful Playwright extensions for testing and automation.

## Installation

```bash
npm install @playwright-extensions/core
```

## Usage

```typescript
import { LocatorRace } from '@playwright-extensions/core';
```

## Extensions

### Element Events
Track `created`, `changed`, and `deleted` events for specific element locators efficiently using a native browser-side `MutationObserver` mapped securely via internal Playwright engine references.

This avoids performance heavy network round-trips for multiple status checks, and safely tracks old and new string changes directly in a buffered array.

*Warning: You must enable this via your test configuration explicitly setting `watchElements: true`.*

```typescript
import { test, expect } from '@playwright-extensions/core';

// Enable the Watcher Plugin
test.use({ watchElements: true });

test('element change tracking', async ({ page }) => {
  const listLocator = page.locator('#item-list li');
  
  // 1. Hook the watcher in the background
  const watcher = await page.watchElement('my-list-items', listLocator);

  // 2. Take UI Actions securely without racing the framework
  await page.click('#modify-item-btn'); 

  // 3. Resolve exact element interactions using `.first()`, `.last()`, or `.nth()`
  // Note: Unindexed calls natively enforce strict mode!
  const changedData = await watcher.waitForEvent('changed').first();
  
  expect(changedData.type).toBe('changed');
  console.log(changedData.changes[0].oldValue); // "New Item"
  
  watcher.unwatch();
});
```

### Query Response & API Locators
Extract variable data natively from the hidden backbone network requests triggered by page loads, without waiting on standard heavy UI integrations. Supports parsing architectures out of the box via `json`, `xml`, or `regex` mechanisms.

```typescript
import { test, expect } from '@playwright-extensions/core';

test('verify data in network and ui', async ({ page }) => {
  // Query JSONPath from any intercepted background fetch
  const name = await page.queryResponse(
    /api\/user/, 
    '$.data.user.name', 
    'json'
  ).first();

  // Create standard Playwright locators that resolve dynamically 
  // via payload extractions matching a Regex pattern over an endpoint!
  const productLabel = page.locator(
    /\/api\/product/, 
    '<Name>(.*)</Name>', 
    'regex'
  );

  await expect(productLabel).toBeVisible();
});
```

### `LocatorRace.race()` - Race Multiple Locators

Polls locator visibility in a loop until the first element becomes visible. Enforces strict mode: if multiple locators are visible in the same check, it throws.

#### Basic Usage

```typescript
import { LocatorRace } from '@playwright-extensions/core';

const winner = await LocatorRace.race([
  page.locator('#a'),
  page.locator('#b'),
]);

await winner.click();
```

#### Strict Mode

Throws if multiple locators are visible simultaneously:

```typescript
const winner = await LocatorRace.race([
  page.locator('#first'),
  page.locator('#second'),
]);
// Throws: "Strict mode violation: multiple locators found visible..."
```

#### Options

```typescript
const winner = await LocatorRace.race(
  [page.locator('#a'), page.locator('#b')],
  {
    timeout: 5000,        // Max wait time (default: 0 = no timeout)
    pollInterval: 100,    // Check interval in ms (default: 100)
  }
);
```

### `page.raceLocator()` - Race via Page Fixture

A page fixture extension that delegates to `LocatorRace.race()`. Use the fixture from `@playwright-extensions/core` to get `page.raceLocator()`:

```typescript
import { test, expect } from '@playwright-extensions/core';

test('race locators', async ({ page }) => {
  const winner = await page.raceLocator([
    page.locator('#a'),
    page.locator('#b'),
  ]);
  await winner.click();
});
```

Options work the same way:

```typescript
const winner = await page.raceLocator(
  [page.locator('#a'), page.locator('#b')],
  { timeout: 5000, pollInterval: 100 }
);
```

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
